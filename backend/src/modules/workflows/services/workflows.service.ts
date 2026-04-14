import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DatabaseService } from '../../database/database.service';
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  CreateWorkflowStepDto,
  UpdateWorkflowStepDto,
  WorkflowTriggerType,
  WorkflowResponseDto,
  WorkflowStepResponseDto,
  UseTemplateDto,
  CreateTemplateFromWorkflowDto,
} from '../dto/workflow.dto';
import { camelCase, snakeCase } from 'change-case';
import CronExpressionParser from 'cron-parser';

@Injectable()
export class WorkflowsService {
  private readonly logger = new Logger(WorkflowsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ============================================
  // WORKFLOW CRUD
  // ============================================

  async createWorkflow(
    workspaceId: string,
    userId: string,
    dto: CreateWorkflowDto,
  ): Promise<WorkflowResponseDto> {
    this.logger.log(`[Workflows] Creating workflow: ${dto.name} in workspace ${workspaceId}`);

    // Validate trigger config
    await this.validateTriggerConfig(dto.triggerType, dto.triggerConfig);

    // Create workflow
    const workflowData = {
      workspace_id: workspaceId,
      created_by: userId,
      name: dto.name,
      description: dto.description || null,
      icon: dto.icon || null,
      color: dto.color || null,
      is_active: dto.isActive !== false,
      trigger_type: dto.triggerType,
      trigger_config: dto.triggerConfig,
    };

    const result = await this.db.insert('workflows', workflowData);
    const workflow = result.data;

    // Create steps if provided
    if (dto.steps && dto.steps.length > 0) {
      for (const step of dto.steps) {
        await this.createWorkflowStep(workflow.id, step);
      }
    }

    // Create entity subscription if entity_change trigger
    if (dto.triggerType === WorkflowTriggerType.ENTITY_CHANGE && dto.triggerConfig) {
      await this.createEntitySubscription(workflow.id, workspaceId, dto.triggerConfig);
    }

    // Create scheduled job if schedule trigger
    if (dto.triggerType === WorkflowTriggerType.SCHEDULE && dto.triggerConfig) {
      await this.createScheduledJob(workflow.id, dto.triggerConfig);
    }

    // Create webhook if webhook trigger
    if (dto.triggerType === WorkflowTriggerType.WEBHOOK) {
      await this.createWebhook(workflow.id, dto.triggerConfig);
    }

    return this.getWorkflow(workspaceId, workflow.id);
  }

  async getWorkflow(workspaceId: string, workflowId: string): Promise<WorkflowResponseDto> {
    const result = await this.db
      .table('workflows')
      .select('*')
      .where('id', '=', workflowId)
      .where('workspace_id', '=', workspaceId)
      .execute();

    if (!result.data?.[0]) {
      throw new NotFoundException('Workflow not found');
    }

    const workflow = this.transformWorkflow(result.data[0]);

    // Get steps
    const stepsResult = await this.db
      .table('workflow_steps')
      .select('*')
      .where('workflow_id', '=', workflowId)
      .execute();

    workflow.steps = (stepsResult.data || [])
      .map(this.transformWorkflowStep)
      .sort((a, b) => a.stepOrder - b.stepOrder);

    return workflow;
  }

  async listWorkflows(
    workspaceId: string,
    options?: {
      isActive?: boolean;
      triggerType?: WorkflowTriggerType;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ data: WorkflowResponseDto[]; total: number }> {
    let query = this.db.table('workflows').select('*').where('workspace_id', '=', workspaceId);

    if (options?.isActive !== undefined) {
      query = query.where('is_active', '=', options.isActive);
    }

    if (options?.triggerType) {
      query = query.where('trigger_type', '=', options.triggerType);
    }

    // Get total count
    const countResult = await this.db
      .table('workflows')
      .select('id')
      .where('workspace_id', '=', workspaceId)
      .execute();
    const total = countResult.data?.length || 0;

    // Apply pagination
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.offset(options.offset);
    }

    const result = await query.execute();
    const workflows = (result.data || []).map(this.transformWorkflow);

    return { data: workflows, total };
  }

  async updateWorkflow(
    workspaceId: string,
    workflowId: string,
    dto: UpdateWorkflowDto,
  ): Promise<WorkflowResponseDto> {
    this.logger.log(`[Workflows] Updating workflow ${workflowId}`);

    // Verify workflow exists
    await this.getWorkflow(workspaceId, workflowId);

    // Validate trigger config if changing
    if (dto.triggerType && dto.triggerConfig) {
      await this.validateTriggerConfig(dto.triggerType, dto.triggerConfig);
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.icon !== undefined) updateData.icon = dto.icon;
    if (dto.color !== undefined) updateData.color = dto.color;
    if (dto.isActive !== undefined) updateData.is_active = dto.isActive;
    if (dto.triggerType !== undefined) updateData.trigger_type = dto.triggerType;
    if (dto.triggerConfig !== undefined) updateData.trigger_config = dto.triggerConfig;

    await this.db.update('workflows', workflowId, updateData);

    // Update entity subscription if trigger changed
    if (dto.triggerType === WorkflowTriggerType.ENTITY_CHANGE && dto.triggerConfig) {
      await this.updateEntitySubscription(workflowId, workspaceId, dto.triggerConfig);
    }

    // Update scheduled job if schedule trigger changed
    if (dto.triggerType === WorkflowTriggerType.SCHEDULE && dto.triggerConfig) {
      await this.updateScheduledJob(workflowId, dto.triggerConfig);
    }

    return this.getWorkflow(workspaceId, workflowId);
  }

  async deleteWorkflow(workspaceId: string, workflowId: string): Promise<void> {
    this.logger.log(`[Workflows] Deleting workflow ${workflowId}`);

    // Verify workflow exists
    await this.getWorkflow(workspaceId, workflowId);

    // Delete related records
    await this.deleteWorkflowSteps(workflowId);
    await this.deleteEntitySubscriptions(workflowId);
    await this.deleteScheduledJobs(workflowId);
    await this.deleteWebhooks(workflowId);

    // Delete workflow
    await this.db.delete('workflows', workflowId);
  }

  async toggleWorkflow(workspaceId: string, workflowId: string): Promise<WorkflowResponseDto> {
    const workflow = await this.getWorkflow(workspaceId, workflowId);
    const newState = !workflow.isActive;

    await this.db.update('workflows', workflowId, {
      is_active: newState,
      updated_at: new Date().toISOString(),
    });

    // Update entity subscription active state
    await this.db
      .table('workflow_entity_subscriptions')
      .select('id')
      .where('workflow_id', '=', workflowId)
      .execute()
      .then(async (result) => {
        for (const sub of result.data || []) {
          await this.db.update('workflow_entity_subscriptions', sub.id, {
            is_active: newState,
          });
        }
      });

    // Update scheduled job active state
    await this.db
      .table('workflow_scheduled_jobs')
      .select('id')
      .where('workflow_id', '=', workflowId)
      .execute()
      .then(async (result) => {
        for (const job of result.data || []) {
          await this.db.update('workflow_scheduled_jobs', job.id, {
            is_active: newState,
          });
        }
      });

    return this.getWorkflow(workspaceId, workflowId);
  }

  /**
   * Manually trigger a workflow execution
   */
  async triggerWorkflow(
    workspaceId: string,
    workflowId: string,
    userId: string,
    triggerSource: string = 'manual',
    triggerData?: Record<string, any>,
  ): Promise<{ id: string; status: string }> {
    const workflow = await this.getWorkflow(workspaceId, workflowId);

    if (!workflow.isActive) {
      throw new BadRequestException('Workflow is not active');
    }

    // Create a placeholder execution record
    const executionData = {
      workflow_id: workflowId,
      status: 'pending',
      triggered_by: userId,
      trigger_source: triggerSource,
      trigger_data: triggerData || {},
      context: {},
      steps_completed: 0,
      steps_total: workflow.steps?.length || 0,
      started_at: new Date().toISOString(),
    };

    const result = await this.db.insert('workflow_executions', executionData);
    const executionId = result.data?.id || result.id;

    // Emit event to trigger execution
    this.eventEmitter.emit('workflow.trigger', {
      workflowId,
      triggerSource,
      triggerData: triggerData || {},
      triggeredBy: userId,
    });

    return { id: executionId, status: 'pending' };
  }

  /**
   * Get pending workflows - scheduled jobs with upcoming runs and pending executions
   */
  async getPendingWorkflows(
    workspaceId: string,
    options?: {
      limit?: number;
      offset?: number;
    },
  ): Promise<{
    data: Array<{
      workflow: WorkflowResponseDto;
      pendingType: 'scheduled' | 'execution';
      nextRunAt?: string;
      executionStatus?: string;
      executionId?: string;
    }>;
    total: number;
  }> {
    const pendingItems: Array<{
      workflow: WorkflowResponseDto;
      pendingType: 'scheduled' | 'execution';
      nextRunAt?: string;
      executionStatus?: string;
      executionId?: string;
    }> = [];

    // 1. Get scheduled jobs with upcoming runs
    const scheduledJobsResult = await this.db
      .table('workflow_scheduled_jobs')
      .select('*')
      .where('is_active', '=', true)
      .execute();

    for (const job of scheduledJobsResult.data || []) {
      // Get the workflow
      const workflowResult = await this.db
        .table('workflows')
        .select('*')
        .where('id', '=', job.workflow_id)
        .where('workspace_id', '=', workspaceId)
        .where('is_active', '=', true)
        .execute();

      if (workflowResult.data?.[0]) {
        pendingItems.push({
          workflow: this.transformWorkflow(workflowResult.data[0]),
          pendingType: 'scheduled',
          nextRunAt: job.next_run_at,
        });
      }
    }

    // 2. Get pending/running workflow executions
    const executionsResult = await this.db.table('workflow_executions').select('*').execute();

    for (const execution of executionsResult.data || []) {
      if (execution.status !== 'pending' && execution.status !== 'running') {
        continue;
      }

      // Get the workflow
      const workflowResult = await this.db
        .table('workflows')
        .select('*')
        .where('id', '=', execution.workflow_id)
        .where('workspace_id', '=', workspaceId)
        .execute();

      if (workflowResult.data?.[0]) {
        // Check if not already added as scheduled
        const existingIndex = pendingItems.findIndex(
          (item) =>
            item.workflow.id === workflowResult.data[0].id && item.pendingType === 'scheduled',
        );
        if (existingIndex === -1) {
          pendingItems.push({
            workflow: this.transformWorkflow(workflowResult.data[0]),
            pendingType: 'execution',
            executionStatus: execution.status,
            executionId: execution.id,
          });
        }
      }
    }

    // Sort by nextRunAt (scheduled first) then by executionId
    pendingItems.sort((a, b) => {
      if (a.nextRunAt && b.nextRunAt) {
        return new Date(a.nextRunAt).getTime() - new Date(b.nextRunAt).getTime();
      }
      if (a.nextRunAt) return -1;
      if (b.nextRunAt) return 1;
      return 0;
    });

    const total = pendingItems.length;

    // Apply pagination
    const offset = options?.offset || 0;
    const limit = options?.limit || 50;
    const paginatedItems = pendingItems.slice(offset, offset + limit);

    return { data: paginatedItems, total };
  }

  async duplicateWorkflow(
    workspaceId: string,
    workflowId: string,
    userId: string,
  ): Promise<WorkflowResponseDto> {
    const original = await this.getWorkflow(workspaceId, workflowId);

    const newWorkflow = await this.createWorkflow(workspaceId, userId, {
      name: `${original.name} (Copy)`,
      description: original.description,
      icon: original.icon,
      color: original.color,
      triggerType: original.triggerType as WorkflowTriggerType,
      triggerConfig: original.triggerConfig,
      steps: original.steps?.map((step, index) => ({
        stepOrder: index,
        stepType: step.stepType,
        stepName: step.stepName,
        stepConfig: step.stepConfig,
        branchPath: step.branchPath,
        positionX: step.positionX,
        positionY: step.positionY,
      })) as CreateWorkflowStepDto[],
      isActive: false, // Start as inactive
    });

    return newWorkflow;
  }

  // ============================================
  // WORKFLOW STEPS
  // ============================================

  async createWorkflowStep(
    workflowId: string,
    dto: CreateWorkflowStepDto,
  ): Promise<WorkflowStepResponseDto> {
    const stepData = {
      workflow_id: workflowId,
      step_order: dto.stepOrder,
      step_type: dto.stepType,
      step_name: dto.stepName || null,
      step_config: dto.stepConfig,
      parent_step_id: dto.parentStepId || null,
      branch_path: dto.branchPath || null,
      is_active: true,
      position_x: dto.positionX || 0,
      position_y: dto.positionY || 0,
    };

    const result = await this.db.insert('workflow_steps', stepData);
    return this.transformWorkflowStep(result.data);
  }

  async updateWorkflowStep(
    stepId: string,
    dto: UpdateWorkflowStepDto,
  ): Promise<WorkflowStepResponseDto> {
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.stepOrder !== undefined) updateData.step_order = dto.stepOrder;
    if (dto.stepType !== undefined) updateData.step_type = dto.stepType;
    if (dto.stepName !== undefined) updateData.step_name = dto.stepName;
    if (dto.stepConfig !== undefined) updateData.step_config = dto.stepConfig;
    if (dto.parentStepId !== undefined) updateData.parent_step_id = dto.parentStepId;
    if (dto.branchPath !== undefined) updateData.branch_path = dto.branchPath;
    if (dto.isActive !== undefined) updateData.is_active = dto.isActive;
    if (dto.positionX !== undefined) updateData.position_x = dto.positionX;
    if (dto.positionY !== undefined) updateData.position_y = dto.positionY;

    await this.db.update('workflow_steps', stepId, updateData);

    const result = await this.db
      .table('workflow_steps')
      .select('*')
      .where('id', '=', stepId)
      .execute();

    return this.transformWorkflowStep(result.data[0]);
  }

  async deleteWorkflowStep(stepId: string): Promise<void> {
    await this.db.delete('workflow_steps', stepId);
  }

  private async deleteWorkflowSteps(workflowId: string): Promise<void> {
    const steps = await this.db
      .table('workflow_steps')
      .select('id')
      .where('workflow_id', '=', workflowId)
      .execute();

    for (const step of steps.data || []) {
      await this.db.delete('workflow_steps', step.id);
    }
  }

  // ============================================
  // ENTITY SUBSCRIPTIONS
  // ============================================

  private async createEntitySubscription(
    workflowId: string,
    workspaceId: string,
    triggerConfig: any,
  ): Promise<void> {
    const subData = {
      workflow_id: workflowId,
      workspace_id: workspaceId,
      entity_type: triggerConfig.entityType,
      event_type: triggerConfig.eventType,
      filter_config: triggerConfig.filters || {},
      is_active: true,
    };

    await this.db.insert('workflow_entity_subscriptions', subData);
  }

  private async updateEntitySubscription(
    workflowId: string,
    workspaceId: string,
    triggerConfig: any,
  ): Promise<void> {
    await this.deleteEntitySubscriptions(workflowId);
    await this.createEntitySubscription(workflowId, workspaceId, triggerConfig);
  }

  private async deleteEntitySubscriptions(workflowId: string): Promise<void> {
    const subs = await this.db
      .table('workflow_entity_subscriptions')
      .select('id')
      .where('workflow_id', '=', workflowId)
      .execute();

    for (const sub of subs.data || []) {
      await this.db.delete('workflow_entity_subscriptions', sub.id);
    }
  }

  // ============================================
  // SCHEDULED JOBS
  // ============================================

  private async createScheduledJob(workflowId: string, triggerConfig: any): Promise<void> {
    const nextRun = this.calculateNextRun(triggerConfig.cronExpression, triggerConfig.timezone);

    const jobData = {
      workflow_id: workflowId,
      cron_expression: triggerConfig.cronExpression,
      timezone: triggerConfig.timezone || 'UTC',
      next_run_at: nextRun.toISOString(),
      is_active: true,
    };

    await this.db.insert('workflow_scheduled_jobs', jobData);
  }

  private async updateScheduledJob(workflowId: string, triggerConfig: any): Promise<void> {
    await this.deleteScheduledJobs(workflowId);
    await this.createScheduledJob(workflowId, triggerConfig);
  }

  private async deleteScheduledJobs(workflowId: string): Promise<void> {
    const jobs = await this.db
      .table('workflow_scheduled_jobs')
      .select('id')
      .where('workflow_id', '=', workflowId)
      .execute();

    for (const job of jobs.data || []) {
      await this.db.delete('workflow_scheduled_jobs', job.id);
    }
  }

  private calculateNextRun(cronExpression: string, timezone?: string): Date {
    try {
      const expression = CronExpressionParser.parse(cronExpression, {
        tz: timezone || 'UTC',
      });
      return expression.next().toDate();
    } catch (error) {
      throw new BadRequestException(`Invalid cron expression: ${cronExpression}`);
    }
  }

  // ============================================
  // WEBHOOKS
  // ============================================

  private async createWebhook(workflowId: string, triggerConfig: any): Promise<void> {
    const webhookKey = this.generateWebhookKey();

    const webhookData = {
      workflow_id: workflowId,
      webhook_key: webhookKey,
      secret: triggerConfig?.secret || null,
      allowed_ips: triggerConfig?.allowedIps || [],
      is_active: true,
    };

    await this.db.insert('workflow_webhooks', webhookData);
  }

  private async deleteWebhooks(workflowId: string): Promise<void> {
    const webhooks = await this.db
      .table('workflow_webhooks')
      .select('id')
      .where('workflow_id', '=', workflowId)
      .execute();

    for (const webhook of webhooks.data || []) {
      await this.db.delete('workflow_webhooks', webhook.id);
    }
  }

  private generateWebhookKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // ============================================
  // TEMPLATES
  // ============================================

  async listTemplates(options?: {
    category?: string;
    isFeatured?: boolean;
    limit?: number;
  }): Promise<any[]> {
    let query = this.db.table('automation_templates').select('*');

    if (options?.category) {
      query = query.where('category', '=', options.category);
    }

    if (options?.isFeatured !== undefined) {
      query = query.where('is_featured', '=', options.isFeatured);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const result = await query.execute();
    return (result.data || []).map(this.transformTemplate);
  }

  async getTemplate(templateId: string): Promise<any> {
    const result = await this.db
      .table('automation_templates')
      .select('*')
      .where('id', '=', templateId)
      .execute();

    if (!result.data?.[0]) {
      throw new NotFoundException('Template not found');
    }

    return this.transformTemplate(result.data[0]);
  }

  async useTemplate(
    workspaceId: string,
    userId: string,
    templateId: string,
    dto: UseTemplateDto,
  ): Promise<WorkflowResponseDto> {
    const template = await this.getTemplate(templateId);

    // Replace variables in template config
    let config = JSON.stringify(template.templateConfig);
    if (dto.variables) {
      for (const [key, value] of Object.entries(dto.variables)) {
        config = config.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
      }
    }
    const parsedConfig = JSON.parse(config);

    // Create workflow from template
    const workflow = await this.createWorkflow(workspaceId, userId, {
      name: dto.name || template.name,
      description: template.description,
      icon: template.icon,
      color: template.color,
      triggerType: parsedConfig.trigger.type,
      triggerConfig: parsedConfig.trigger.config,
      steps: parsedConfig.steps?.map((step: any, index: number) => ({
        stepOrder: index,
        stepType: step.type,
        stepName: step.name,
        stepConfig: step.config,
      })),
    });

    // Increment use count
    await this.db
      .table('automation_templates')
      .select('use_count')
      .where('id', '=', templateId)
      .execute()
      .then(async (result) => {
        const currentCount = result.data?.[0]?.use_count || 0;
        await this.db.update('automation_templates', templateId, {
          use_count: currentCount + 1,
        });
      });

    return workflow;
  }

  async createTemplateFromWorkflow(
    workspaceId: string,
    workflowId: string,
    userId: string,
    dto: CreateTemplateFromWorkflowDto,
  ): Promise<any> {
    const workflow = await this.getWorkflow(workspaceId, workflowId);

    const templateConfig = {
      trigger: {
        type: workflow.triggerType,
        config: workflow.triggerConfig,
      },
      steps: workflow.steps?.map((step) => ({
        type: step.stepType,
        name: step.stepName,
        config: step.stepConfig,
      })),
    };

    const templateData = {
      name: dto.name,
      description: dto.description || workflow.description,
      category: dto.category,
      icon: dto.icon || workflow.icon,
      color: dto.color || workflow.color,
      template_config: templateConfig,
      variables: dto.variables || [],
      is_featured: false,
      is_system: false,
      created_by: userId,
    };

    const result = await this.db.insert('automation_templates', templateData);
    return this.transformTemplate(result.data);
  }

  // ============================================
  // VALIDATION
  // ============================================

  private async validateTriggerConfig(
    triggerType: WorkflowTriggerType,
    config: any,
  ): Promise<void> {
    switch (triggerType) {
      case WorkflowTriggerType.ENTITY_CHANGE:
        if (!config.entityType || !config.eventType) {
          throw new BadRequestException('Entity trigger requires entityType and eventType');
        }
        break;

      case WorkflowTriggerType.SCHEDULE:
        if (!config.cronExpression) {
          throw new BadRequestException('Schedule trigger requires cronExpression');
        }
        // Validate cron expression
        try {
          CronExpressionParser.parse(config.cronExpression);
        } catch (error) {
          throw new BadRequestException(`Invalid cron expression: ${config.cronExpression}`);
        }
        break;

      case WorkflowTriggerType.WEBHOOK:
        // Webhook config is optional
        break;

      case WorkflowTriggerType.MANUAL:
        // No config required
        break;

      default:
        throw new BadRequestException(`Unknown trigger type: ${triggerType}`);
    }
  }

  // ============================================
  // TRANSFORMERS
  // ============================================

  private transformWorkflow = (row: any): WorkflowResponseDto => ({
    id: row.id,
    workspaceId: row.workspace_id,
    createdBy: row.created_by,
    name: row.name,
    description: row.description,
    icon: row.icon,
    color: row.color,
    isActive: row.is_active,
    triggerType: row.trigger_type,
    triggerConfig: row.trigger_config,
    runCount: row.run_count,
    successCount: row.success_count,
    failureCount: row.failure_count,
    lastRunAt: row.last_run_at,
    lastRunStatus: row.last_run_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });

  private transformWorkflowStep = (row: any): WorkflowStepResponseDto => ({
    id: row.id,
    workflowId: row.workflow_id,
    stepOrder: row.step_order,
    stepType: row.step_type,
    stepName: row.step_name,
    stepConfig: row.step_config,
    parentStepId: row.parent_step_id,
    branchPath: row.branch_path,
    isActive: row.is_active,
    positionX: row.position_x,
    positionY: row.position_y,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });

  private transformTemplate = (row: any): any => ({
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    icon: row.icon,
    color: row.color,
    templateConfig: row.template_config,
    variables: row.variables,
    isFeatured: row.is_featured,
    isSystem: row.is_system,
    useCount: row.use_count,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}
