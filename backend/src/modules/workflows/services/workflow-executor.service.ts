import { Injectable, Logger, Optional, Inject, forwardRef } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DatabaseService } from '../../database/database.service';
import { EmailService } from '../../integration-framework/email/email.service';
import { VideoCallsService } from '../../video-calls/video-calls.service';
import { ConditionEvaluatorService } from './condition-evaluator.service';
import {
  SharedExecutionLoggerService,
  AutomationType,
  ExecutionStatus,
} from '../../automation-core';
import {
  WorkflowStepType,
  WorkflowActionType,
  WorkflowExecutionStatus,
  DelayUnit,
} from '../dto/workflow.dto';

interface WorkflowTriggerEvent {
  workflowId: string;
  triggerSource: string;
  triggerData: Record<string, any>;
  triggeredBy: string;
}

interface WorkflowStep {
  id: string;
  workflowId: string;
  stepOrder: number;
  stepType: WorkflowStepType;
  stepName?: string;
  stepConfig: Record<string, any>;
  parentStepId?: string;
  branchPath?: string;
  isActive: boolean;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: WorkflowExecutionStatus;
  context: Record<string, any>;
  currentStepId?: string;
  stepsCompleted: number;
  stepsTotal: number;
}

@Injectable()
export class WorkflowExecutorService {
  private readonly logger = new Logger(WorkflowExecutorService.name);
  private readonly MAX_ITERATIONS = 100; // Prevent infinite loops

  constructor(
    private readonly db: DatabaseService,
    private readonly conditionEvaluator: ConditionEvaluatorService,
    @Optional() private readonly sharedExecutionLogger?: SharedExecutionLoggerService,
    @Optional()
    @Inject(forwardRef(() => EmailService))
    private readonly emailService?: EmailService,
    @Optional()
    @Inject(forwardRef(() => VideoCallsService))
    private readonly videoCallsService?: VideoCallsService,
  ) {}

  /**
   * Listen for workflow trigger events
   */
  @OnEvent('workflow.trigger')
  async handleWorkflowTrigger(event: WorkflowTriggerEvent): Promise<void> {
    this.logger.log(`[WorkflowExecutor] Received trigger for workflow ${event.workflowId}`);

    try {
      // Check if workflow is active
      const workflow = await this.getWorkflow(event.workflowId);
      if (!workflow || !workflow.is_active) {
        this.logger.log(`[WorkflowExecutor] Workflow ${event.workflowId} is not active, skipping`);
        return;
      }

      // Execute the workflow
      await this.executeWorkflow(
        event.workflowId,
        event.triggerData,
        event.triggeredBy,
        event.triggerSource,
      );
    } catch (error) {
      this.logger.error(`[WorkflowExecutor] Error handling trigger: ${error.message}`);
    }
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    workflowId: string,
    triggerData: Record<string, any>,
    triggeredBy: string,
    triggerSource: string,
    initialContext?: Record<string, any>,
  ): Promise<string> {
    this.logger.log(`[WorkflowExecutor] Starting execution of workflow ${workflowId}`);

    // Get workflow steps
    const steps = await this.getWorkflowSteps(workflowId);
    if (steps.length === 0) {
      this.logger.warn(`[WorkflowExecutor] Workflow ${workflowId} has no steps`);
      return '';
    }

    // Create execution record
    const execution = await this.createExecution(workflowId, {
      triggeredBy,
      triggerSource,
      triggerData,
      stepsTotal: steps.length,
      context: {
        ...initialContext,
        trigger: triggerData,
      },
    });

    // Start execution in background
    this.runExecution(execution.id, steps).catch((error) => {
      this.logger.error(`[WorkflowExecutor] Execution ${execution.id} failed: ${error.message}`);
    });

    return execution.id;
  }

  /**
   * Run the workflow execution
   */
  private async runExecution(executionId: string, steps: WorkflowStep[]): Promise<void> {
    const startTime = Date.now();

    try {
      // Update status to running
      await this.updateExecution(executionId, {
        status: WorkflowExecutionStatus.RUNNING,
        started_at: new Date().toISOString(),
      });

      // Get execution context
      const execution = await this.getExecution(executionId);
      let context = execution.context;
      context = this.conditionEvaluator.addHelperFunctions(context);

      // Sort steps by order
      const sortedSteps = [...steps].sort((a, b) => a.stepOrder - b.stepOrder);

      // Execute steps
      let stepIndex = 0;
      let iterations = 0;

      while (stepIndex < sortedSteps.length && iterations < this.MAX_ITERATIONS) {
        iterations++;
        const step = sortedSteps[stepIndex];

        // Skip inactive steps
        if (!step.isActive) {
          stepIndex++;
          continue;
        }

        // Update current step
        await this.updateExecution(executionId, { current_step_id: step.id });

        // Execute the step
        const result = await this.executeStep(executionId, step, context);

        // Update context with step output
        context = {
          ...context,
          [`step_${step.stepOrder}`]: result.output,
          lastStepOutput: result.output,
        };

        // Update steps completed
        await this.updateExecution(executionId, {
          steps_completed: stepIndex + 1,
          context,
        });

        // Handle step result
        if (result.nextStepIndex !== undefined) {
          // Jump to specific step (for conditions, loops)
          stepIndex = result.nextStepIndex;
        } else if (result.stop) {
          // Stop execution
          break;
        } else {
          // Continue to next step
          stepIndex++;
        }

        // Handle delays
        if (result.delayMs && result.delayMs > 0) {
          await this.delay(result.delayMs);
        }
      }

      // Mark as completed
      const executionTime = Date.now() - startTime;
      await this.updateExecution(executionId, {
        status: WorkflowExecutionStatus.COMPLETED,
        completed_at: new Date().toISOString(),
        execution_time_ms: executionTime,
        context,
      });

      // Update workflow stats
      await this.updateWorkflowStats(execution.workflowId, 'success');

      this.logger.log(
        `[WorkflowExecutor] Execution ${executionId} completed in ${executionTime}ms`,
      );
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const execution = await this.getExecution(executionId);

      await this.updateExecution(executionId, {
        status: WorkflowExecutionStatus.FAILED,
        error_message: error.message,
        completed_at: new Date().toISOString(),
        execution_time_ms: executionTime,
      });

      await this.updateWorkflowStats(execution.workflowId, 'failure');

      this.logger.error(`[WorkflowExecutor] Execution ${executionId} failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute a single step
   */
  private async executeStep(
    executionId: string,
    step: WorkflowStep,
    context: Record<string, any>,
  ): Promise<{ output: any; nextStepIndex?: number; stop?: boolean; delayMs?: number }> {
    const startTime = Date.now();

    // Create step execution record
    const stepExecution = await this.createStepExecution(executionId, step.id, {
      input_data: { context: Object.keys(context), config: step.stepConfig },
    });

    try {
      // Update step status to running
      await this.updateStepExecution(stepExecution.id, {
        status: 'running',
        started_at: new Date().toISOString(),
      });

      let result: { output: any; nextStepIndex?: number; stop?: boolean; delayMs?: number };

      // Execute based on step type
      switch (step.stepType) {
        case WorkflowStepType.ACTION:
          result = await this.executeActionStep(step, context);
          break;

        case WorkflowStepType.CONDITION:
          result = await this.executeConditionStep(step, context);
          break;

        case WorkflowStepType.DELAY:
          result = await this.executeDelayStep(step, context);
          break;

        case WorkflowStepType.SET_VARIABLE:
          result = await this.executeSetVariableStep(step, context);
          break;

        case WorkflowStepType.STOP:
          result = { output: { stopped: true }, stop: true };
          break;

        default:
          throw new Error(`Unknown step type: ${step.stepType}`);
      }

      // Update step execution as completed
      const executionTime = Date.now() - startTime;
      await this.updateStepExecution(stepExecution.id, {
        status: 'completed',
        output_data: result.output,
        condition_result:
          step.stepType === WorkflowStepType.CONDITION ? result.output?.result : null,
        completed_at: new Date().toISOString(),
        execution_time_ms: executionTime,
      });

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      await this.updateStepExecution(stepExecution.id, {
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString(),
        execution_time_ms: executionTime,
      });

      throw error;
    }
  }

  /**
   * Execute an action step
   */
  private async executeActionStep(
    step: WorkflowStep,
    context: Record<string, any>,
  ): Promise<{ output: any }> {
    const config = step.stepConfig as { action: WorkflowActionType; params: Record<string, any> };
    const action = config.action;
    const params = this.conditionEvaluator.interpolateObject(config.params, context);

    this.logger.log(`[WorkflowExecutor] Executing action: ${action}`);

    // Execute action based on type
    // Note: These would integrate with your existing services
    switch (action) {
      case WorkflowActionType.CREATE_TASK:
        return { output: await this.actionCreateTask(params, context) };

      case WorkflowActionType.UPDATE_TASK:
        return { output: await this.actionUpdateTask(params, context) };

      case WorkflowActionType.COMPLETE_TASK:
        return { output: await this.actionCompleteTask(params, context) };

      case WorkflowActionType.SEND_NOTIFICATION:
        return { output: await this.actionSendNotification(params, context) };

      case WorkflowActionType.SEND_EMAIL:
        return { output: await this.actionSendEmail(params, context) };

      case WorkflowActionType.SEND_MESSAGE:
        return { output: await this.actionSendMessage(params, context) };

      case WorkflowActionType.CREATE_NOTE:
        return { output: await this.actionCreateNote(params, context) };

      case WorkflowActionType.CREATE_EVENT:
        return { output: await this.actionCreateEvent(params, context) };

      case WorkflowActionType.CALL_WEBHOOK:
        return { output: await this.actionCallWebhook(params, context) };

      case WorkflowActionType.AI_AUTOPILOT:
        return { output: await this.actionAIAutopilot(params, context) };

      case WorkflowActionType.CREATE_VIDEO_MEETING:
      case WorkflowActionType.SCHEDULE_VIDEO_MEETING:
        return { output: await this.actionCreateVideoMeeting(params, context) };

      case WorkflowActionType.INVITE_TO_MEETING:
        return { output: await this.actionInviteToMeeting(params, context) };

      default:
        this.logger.warn(`[WorkflowExecutor] Action ${action} not implemented yet`);
        return { output: { action, params, status: 'not_implemented' } };
    }
  }

  /**
   * Execute a condition step
   */
  private async executeConditionStep(
    step: WorkflowStep,
    context: Record<string, any>,
  ): Promise<{ output: any; nextStepIndex?: number }> {
    const config = step.stepConfig as {
      condition: any;
      trueBranch?: string;
      falseBranch?: string;
    };

    const result = this.conditionEvaluator.evaluate(config.condition, context);

    this.logger.log(`[WorkflowExecutor] Condition evaluated to: ${result}`);

    return {
      output: { result, condition: config.condition },
      // Note: In a more complex implementation, we'd need to handle branching
      // by finding the step with the matching branchPath
    };
  }

  /**
   * Execute a delay step
   */
  private async executeDelayStep(
    step: WorkflowStep,
    context: Record<string, any>,
  ): Promise<{ output: any; delayMs: number }> {
    const config = step.stepConfig as { duration: number; unit: DelayUnit };

    let delayMs = config.duration;
    switch (config.unit) {
      case DelayUnit.HOURS:
        delayMs *= 60;
        break;
      case DelayUnit.DAYS:
        delayMs *= 60 * 24;
        break;
    }
    delayMs *= 60 * 1000; // Convert to milliseconds

    this.logger.log(`[WorkflowExecutor] Delaying for ${config.duration} ${config.unit}`);

    return {
      output: { duration: config.duration, unit: config.unit, delayMs },
      delayMs,
    };
  }

  /**
   * Execute a set_variable step
   */
  private async executeSetVariableStep(
    step: WorkflowStep,
    context: Record<string, any>,
  ): Promise<{ output: any }> {
    const config = step.stepConfig as { variableName: string; value: any };

    const resolvedValue = this.conditionEvaluator.interpolateObject(config.value, context);

    this.logger.log(`[WorkflowExecutor] Setting variable ${config.variableName}`);

    return {
      output: {
        variableName: config.variableName,
        value: resolvedValue,
        // This will be merged into context
        [config.variableName]: resolvedValue,
      },
    };
  }

  // ============================================
  // ACTION IMPLEMENTATIONS
  // ============================================

  private async actionCreateTask(
    params: Record<string, any>,
    context: Record<string, any>,
  ): Promise<any> {
    const taskData = {
      title: params.title,
      description: params.description,
      project_id: params.projectId || context.trigger?.entity?.project_id,
      assignee_id: params.assigneeId,
      due_date: params.dueDate,
      priority: params.priority || 'medium',
      status: params.status || 'todo',
      created_by: context.trigger?.triggeredBy || 'system',
    };

    const result = await this.db.insert('tasks', taskData);
    return { taskId: result.data?.id, ...result.data };
  }

  private async actionUpdateTask(
    params: Record<string, any>,
    context: Record<string, any>,
  ): Promise<any> {
    const taskId = params.taskId || context.trigger?.entity?.id;
    if (!taskId) throw new Error('Task ID required for update');

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (params.title) updateData.title = params.title;
    if (params.description) updateData.description = params.description;
    if (params.status) updateData.status = params.status;
    if (params.priority) updateData.priority = params.priority;
    if (params.assigneeId) updateData.assignee_id = params.assigneeId;
    if (params.dueDate) updateData.due_date = params.dueDate;

    await this.db.update('tasks', taskId, updateData);
    return { taskId, updated: true };
  }

  private async actionCompleteTask(
    params: Record<string, any>,
    context: Record<string, any>,
  ): Promise<any> {
    const taskId = params.taskId || context.trigger?.entity?.id;
    if (!taskId) throw new Error('Task ID required');

    await this.db.update('tasks', taskId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return { taskId, completed: true };
  }

  private async actionSendNotification(
    params: Record<string, any>,
    context: Record<string, any>,
  ): Promise<any> {
    const notificationData = {
      user_id: params.userId || context.trigger?.entity?.assignee_id,
      workspace_id: params.workspaceId || context.trigger?.workspaceId,
      title: params.title,
      message: params.message,
      type: params.type || 'workflow',
      is_read: false,
      created_at: new Date().toISOString(),
    };

    const result = await this.db.insert('notifications', notificationData);
    return { notificationId: result.data?.id, sent: true };
  }

  private async actionSendEmail(
    params: Record<string, any>,
    context: Record<string, any>,
  ): Promise<any> {
    this.logger.log(`[WorkflowExecutor] Email action: to=${params.to}, subject=${params.subject}`);

    if (!this.emailService) {
      this.logger.warn('[WorkflowExecutor] EmailService not available');
      return { emailSent: false, error: 'Email service not configured' };
    }

    try {
      const userId = params.userId || context.trigger?.triggeredBy;
      const workspaceId = params.workspaceId || context.trigger?.workspaceId;

      const result = await this.emailService.sendEmail(userId, workspaceId, {
        to: Array.isArray(params.to) ? params.to : [params.to],
        subject: params.subject,
        body: params.body || params.content,
        cc: params.cc,
        bcc: params.bcc,
        isHtml: params.isHtml !== false,
      });

      return { emailSent: true, result, to: params.to, subject: params.subject };
    } catch (error) {
      this.logger.error(`[WorkflowExecutor] Email failed: ${error.message}`);
      return { emailSent: false, error: error.message };
    }
  }

  private async actionSendMessage(
    params: Record<string, any>,
    context: Record<string, any>,
  ): Promise<any> {
    const messageData = {
      channel_id: params.channelId,
      conversation_id: params.conversationId,
      sender_id: params.senderId || 'system',
      content: params.content,
      message_type: 'text',
      created_at: new Date().toISOString(),
    };

    if (messageData.channel_id || messageData.conversation_id) {
      const result = await this.db.insert('messages', messageData);
      return { messageId: result.data?.id, sent: true };
    }

    return { sent: false, error: 'No channel or conversation specified' };
  }

  private async actionCreateNote(
    params: Record<string, any>,
    context: Record<string, any>,
  ): Promise<any> {
    const noteData = {
      title: params.title,
      content: params.content || '',
      workspace_id: params.workspaceId || context.trigger?.workspaceId,
      created_by: context.trigger?.triggeredBy || 'system',
      is_pinned: params.isPinned || false,
      created_at: new Date().toISOString(),
    };

    const result = await this.db.insert('notes', noteData);
    return { noteId: result.data?.id, ...result.data };
  }

  private async actionCreateEvent(
    params: Record<string, any>,
    context: Record<string, any>,
  ): Promise<any> {
    const eventData = {
      title: params.title,
      description: params.description,
      start_time: params.startTime,
      end_time: params.endTime,
      workspace_id: params.workspaceId || context.trigger?.workspaceId,
      created_by: context.trigger?.triggeredBy || 'system',
      created_at: new Date().toISOString(),
    };

    const result = await this.db.insert('calendar_events', eventData);
    return { eventId: result.data?.id, ...result.data };
  }

  private async actionCallWebhook(
    params: Record<string, any>,
    context: Record<string, any>,
  ): Promise<any> {
    const { url, method = 'POST', headers = {}, body } = params;

    // Security: Block internal URLs
    if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('0.0.0.0')) {
      throw new Error('Internal URLs are not allowed');
    }

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const responseData = await response.json().catch(() => ({}));

      return {
        status: response.status,
        statusText: response.statusText,
        data: responseData,
      };
    } catch (error) {
      return { error: error.message, url };
    }
  }

  private async actionAIAutopilot(
    params: Record<string, any>,
    context: Record<string, any>,
  ): Promise<any> {
    // This would integrate with your Autopilot service
    this.logger.log(`[WorkflowExecutor] AI Autopilot action: ${params.command}`);
    return { command: params.command, status: 'queued' };
  }

  private async actionCreateVideoMeeting(
    params: Record<string, any>,
    context: Record<string, any>,
  ): Promise<any> {
    this.logger.log(`[WorkflowExecutor] Create video meeting: ${params.title}`);

    if (!this.videoCallsService) {
      this.logger.warn('[WorkflowExecutor] VideoCallsService not available');
      return { created: false, error: 'Video call service not configured' };
    }

    try {
      const userId = params.userId || context.trigger?.triggeredBy;
      const workspaceId = params.workspaceId || context.trigger?.workspaceId;

      const call = await this.videoCallsService.createCall(workspaceId, userId, {
        title: params.title,
        description: params.description,
        scheduled_start_time: params.scheduledStartTime || params.startTime,
        scheduled_end_time: params.scheduledEndTime || params.endTime,
        participant_ids: params.participantIds || [],
        call_type: params.callType || 'video',
        is_group_call: (params.participantIds?.length || 0) > 1,
      });

      return {
        created: true,
        meetingId: call.id,
        title: call.title,
        joinUrl: call.livekit_room?.joinUrl,
        status: call.status,
      };
    } catch (error) {
      this.logger.error(`[WorkflowExecutor] Video meeting creation failed: ${error.message}`);
      return { created: false, error: error.message };
    }
  }

  private async actionInviteToMeeting(
    params: Record<string, any>,
    context: Record<string, any>,
  ): Promise<any> {
    this.logger.log(`[WorkflowExecutor] Invite to meeting: ${params.callId}`);

    if (!this.videoCallsService) {
      this.logger.warn('[WorkflowExecutor] VideoCallsService not available');
      return { invited: false, error: 'Video call service not configured' };
    }

    try {
      const userId = params.userId || context.trigger?.triggeredBy;

      const userIds = params.userIds || params.user_ids || [];
      await this.videoCallsService.inviteParticipants(params.callId, userId, {
        user_ids: userIds,
      });

      const inviteCount = userIds.length;
      return { invited: true, inviteCount };
    } catch (error) {
      this.logger.error(`[WorkflowExecutor] Meeting invite failed: ${error.message}`);
      return { invited: false, error: error.message };
    }
  }

  // ============================================
  // DATABASE HELPERS
  // ============================================

  private async getWorkflow(workflowId: string): Promise<any> {
    const result = await this.db
      .table('workflows')
      .select('*')
      .where('id', '=', workflowId)
      .execute();
    return result.data?.[0];
  }

  private async getWorkflowSteps(workflowId: string): Promise<WorkflowStep[]> {
    const result = await this.db
      .table('workflow_steps')
      .select('*')
      .where('workflow_id', '=', workflowId)
      .execute();

    return (result.data || []).map((row: any) => ({
      id: row.id,
      workflowId: row.workflow_id,
      stepOrder: row.step_order,
      stepType: row.step_type,
      stepName: row.step_name,
      stepConfig: row.step_config,
      parentStepId: row.parent_step_id,
      branchPath: row.branch_path,
      isActive: row.is_active,
    }));
  }

  private async createExecution(workflowId: string, data: Record<string, any>): Promise<any> {
    const executionData = {
      workflow_id: workflowId,
      triggered_by: data.triggeredBy,
      trigger_source: data.triggerSource,
      trigger_data: data.triggerData,
      status: WorkflowExecutionStatus.PENDING,
      context: data.context || {},
      steps_total: data.stepsTotal,
      steps_completed: 0,
      created_at: new Date().toISOString(),
    };

    const result = await this.db.insert('workflow_executions', executionData);
    return result.data;
  }

  private async getExecution(executionId: string): Promise<WorkflowExecution> {
    const result = await this.db
      .table('workflow_executions')
      .select('*')
      .where('id', '=', executionId)
      .execute();

    const row = result.data?.[0];
    return {
      id: row.id,
      workflowId: row.workflow_id,
      status: row.status,
      context: row.context,
      currentStepId: row.current_step_id,
      stepsCompleted: row.steps_completed,
      stepsTotal: row.steps_total,
    };
  }

  private async updateExecution(executionId: string, data: Record<string, any>): Promise<void> {
    await this.db.update('workflow_executions', executionId, data);
  }

  private async createStepExecution(
    executionId: string,
    stepId: string,
    data: Record<string, any>,
  ): Promise<any> {
    const stepExecutionData = {
      execution_id: executionId,
      step_id: stepId,
      status: 'pending',
      input_data: data.input_data || {},
      output_data: {},
      retry_count: 0,
      created_at: new Date().toISOString(),
    };

    const result = await this.db.insert('workflow_step_executions', stepExecutionData);
    return result.data;
  }

  private async updateStepExecution(
    stepExecutionId: string,
    data: Record<string, any>,
  ): Promise<void> {
    await this.db.update('workflow_step_executions', stepExecutionId, data);
  }

  private async updateWorkflowStats(
    workflowId: string,
    result: 'success' | 'failure',
  ): Promise<void> {
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow) return;

    const updateData: Record<string, any> = {
      run_count: (workflow.run_count || 0) + 1,
      last_run_at: new Date().toISOString(),
      last_run_status: result,
    };

    if (result === 'success') {
      updateData.success_count = (workflow.success_count || 0) + 1;
    } else {
      updateData.failure_count = (workflow.failure_count || 0) + 1;
    }

    await this.db.update('workflows', workflowId, updateData);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
