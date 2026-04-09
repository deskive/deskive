import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

/**
 * Execution status enum - shared between bots and workflows
 */
export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMED_OUT = 'timed_out',
}

/**
 * Automation type - identifies source of execution
 */
export enum AutomationType {
  BOT = 'bot',
  WORKFLOW = 'workflow',
}

/**
 * Execution log entry interface
 */
export interface ExecutionLogEntry {
  id?: string;
  automationType: AutomationType;
  automationId: string; // bot_id or workflow_id
  workspaceId: string;
  triggerId?: string;
  triggerType?: string;
  status: ExecutionStatus;
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  input?: Record<string, any>;
  output?: any;
  error?: string;
  stepLogs?: StepLogEntry[];
  metadata?: Record<string, any>;
}

/**
 * Step-level log entry
 */
export interface StepLogEntry {
  stepId?: string;
  stepName?: string;
  actionType?: string;
  status: ExecutionStatus;
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  input?: Record<string, any>;
  output?: any;
  error?: string;
}

/**
 * Shared Execution Logger Service
 *
 * Provides unified execution logging for both Bots and Workflows.
 * Uses respective tables but provides a common interface.
 */
@Injectable()
export class SharedExecutionLoggerService {
  private readonly logger = new Logger(SharedExecutionLoggerService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Start a new execution log
   */
  async startExecution(
    automationType: AutomationType,
    automationId: string,
    workspaceId: string,
    options: {
      triggerId?: string;
      triggerType?: string;
      input?: Record<string, any>;
      metadata?: Record<string, any>;
    } = {},
  ): Promise<string> {
    const tableName = this.getTableName(automationType);
    const now = new Date().toISOString();

    try {
      const result = await this.db.insert(tableName, {
        [this.getAutomationIdColumn(automationType)]: automationId,
        workspace_id: workspaceId,
        trigger_id: options.triggerId,
        trigger_type: options.triggerType,
        status: ExecutionStatus.RUNNING,
        started_at: now,
        input_data: options.input ? JSON.stringify(options.input) : null,
        metadata: options.metadata ? JSON.stringify(options.metadata) : null,
      });

      const executionId = result?.id;
      this.logger.log(`[ExecutionLogger] Started ${automationType} execution: ${executionId}`);
      return executionId;
    } catch (error) {
      this.logger.error(`[ExecutionLogger] Failed to start execution: ${error.message}`);
      throw error;
    }
  }

  /**
   * Complete an execution (success)
   */
  async completeExecution(
    automationType: AutomationType,
    executionId: string,
    output?: any,
  ): Promise<void> {
    const tableName = this.getTableName(automationType);
    const now = new Date();

    try {
      // Get start time for duration calculation
      const execution = await this.db.findOne(tableName, executionId);
      const startedAt = execution?.started_at ? new Date(execution.started_at) : now;
      const durationMs = now.getTime() - startedAt.getTime();

      await this.db.update(tableName, executionId, {
        status: ExecutionStatus.COMPLETED,
        completed_at: now.toISOString(),
        duration_ms: durationMs,
        output_data: output ? JSON.stringify(output) : null,
      });

      this.logger.log(`[ExecutionLogger] Completed ${automationType} execution: ${executionId} (${durationMs}ms)`);
    } catch (error) {
      this.logger.error(`[ExecutionLogger] Failed to complete execution: ${error.message}`);
    }
  }

  /**
   * Fail an execution
   */
  async failExecution(
    automationType: AutomationType,
    executionId: string,
    error: string,
    output?: any,
  ): Promise<void> {
    const tableName = this.getTableName(automationType);
    const now = new Date();

    try {
      const execution = await this.db.findOne(tableName, executionId);
      const startedAt = execution?.started_at ? new Date(execution.started_at) : now;
      const durationMs = now.getTime() - startedAt.getTime();

      await this.db.update(tableName, executionId, {
        status: ExecutionStatus.FAILED,
        completed_at: now.toISOString(),
        duration_ms: durationMs,
        error_message: error,
        output_data: output ? JSON.stringify(output) : null,
      });

      this.logger.error(`[ExecutionLogger] Failed ${automationType} execution: ${executionId} - ${error}`);
    } catch (err) {
      this.logger.error(`[ExecutionLogger] Failed to log failure: ${err.message}`);
    }
  }

  /**
   * Log a step execution (for workflows)
   */
  async logStep(
    executionId: string,
    step: StepLogEntry,
  ): Promise<string | undefined> {
    try {
      const result = await this.db.insert('workflow_step_executions', {
        execution_id: executionId,
        step_id: step.stepId,
        step_name: step.stepName,
        action_type: step.actionType,
        status: step.status,
        started_at: step.startedAt.toISOString(),
        completed_at: step.completedAt?.toISOString(),
        duration_ms: step.durationMs,
        input_data: step.input ? JSON.stringify(step.input) : null,
        output_data: step.output ? JSON.stringify(step.output) : null,
        error_message: step.error,
      });

      return result?.id;
    } catch (error) {
      this.logger.error(`[ExecutionLogger] Failed to log step: ${error.message}`);
      return undefined;
    }
  }

  /**
   * Update step execution
   */
  async updateStep(
    stepExecutionId: string,
    updates: Partial<StepLogEntry>,
  ): Promise<void> {
    try {
      const updateData: Record<string, any> = {};

      if (updates.status) updateData.status = updates.status;
      if (updates.completedAt) updateData.completed_at = updates.completedAt.toISOString();
      if (updates.durationMs !== undefined) updateData.duration_ms = updates.durationMs;
      if (updates.output) updateData.output_data = JSON.stringify(updates.output);
      if (updates.error) updateData.error_message = updates.error;

      await this.db.update('workflow_step_executions', stepExecutionId, updateData);
    } catch (error) {
      this.logger.error(`[ExecutionLogger] Failed to update step: ${error.message}`);
    }
  }

  /**
   * Get execution history for an automation
   */
  async getExecutionHistory(
    automationType: AutomationType,
    automationId: string,
    options: {
      limit?: number;
      offset?: number;
      status?: ExecutionStatus;
    } = {},
  ): Promise<ExecutionLogEntry[]> {
    const tableName = this.getTableName(automationType);
    const idColumn = this.getAutomationIdColumn(automationType);

    try {
      let query = this.db.table(tableName)
        .select('*')
        .where(idColumn, '=', automationId)
        .orderBy('started_at', 'DESC')
        .limit(options.limit || 50)
        .offset(options.offset || 0);

      if (options.status) {
        query = query.where('status', '=', options.status);
      }

      const result = await query.execute();

      return (result.data || []).map((row: any) => this.mapToExecutionLog(automationType, row));
    } catch (error) {
      this.logger.error(`[ExecutionLogger] Failed to get history: ${error.message}`);
      return [];
    }
  }

  /**
   * Get execution statistics
   */
  async getExecutionStats(
    automationType: AutomationType,
    automationId: string,
    days: number = 30,
  ): Promise<{
    total: number;
    completed: number;
    failed: number;
    avgDurationMs: number;
  }> {
    const tableName = this.getTableName(automationType);
    const idColumn = this.getAutomationIdColumn(automationType);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    try {
      const result = await this.db.table(tableName)
        .select('status', 'duration_ms')
        .where(idColumn, '=', automationId)
        .where('started_at', '>=', since)
        .execute();

      const executions = result.data || [];
      const total = executions.length;
      const completed = executions.filter((e: any) => e.status === ExecutionStatus.COMPLETED).length;
      const failed = executions.filter((e: any) => e.status === ExecutionStatus.FAILED).length;
      const durations = executions
        .filter((e: any) => e.duration_ms)
        .map((e: any) => e.duration_ms);
      const avgDurationMs = durations.length > 0
        ? durations.reduce((a: number, b: number) => a + b, 0) / durations.length
        : 0;

      return { total, completed, failed, avgDurationMs };
    } catch (error) {
      this.logger.error(`[ExecutionLogger] Failed to get stats: ${error.message}`);
      return { total: 0, completed: 0, failed: 0, avgDurationMs: 0 };
    }
  }

  /**
   * Clean up old execution logs
   */
  async cleanupOldLogs(
    automationType: AutomationType,
    retentionDays: number = 30,
  ): Promise<number> {
    const tableName = this.getTableName(automationType);
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

    try {
      const old = await this.db.table(tableName)
        .select('id')
        .where('started_at', '<', cutoff)
        .execute();

      let count = 0;
      for (const record of old.data || []) {
        await this.db.delete(tableName, record.id);
        count++;
      }

      if (count > 0) {
        this.logger.log(`[ExecutionLogger] Cleaned up ${count} old ${automationType} logs`);
      }

      return count;
    } catch (error) {
      this.logger.error(`[ExecutionLogger] Failed to cleanup: ${error.message}`);
      return 0;
    }
  }

  // Helper methods

  private getTableName(automationType: AutomationType): string {
    return automationType === AutomationType.BOT
      ? 'bot_execution_logs'
      : 'workflow_executions';
  }

  private getAutomationIdColumn(automationType: AutomationType): string {
    return automationType === AutomationType.BOT ? 'bot_id' : 'workflow_id';
  }

  private mapToExecutionLog(automationType: AutomationType, row: any): ExecutionLogEntry {
    return {
      id: row.id,
      automationType,
      automationId: automationType === AutomationType.BOT ? row.bot_id : row.workflow_id,
      workspaceId: row.workspace_id,
      triggerId: row.trigger_id,
      triggerType: row.trigger_type,
      status: row.status as ExecutionStatus,
      startedAt: new Date(row.started_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      durationMs: row.duration_ms,
      input: row.input_data ? JSON.parse(row.input_data) : undefined,
      output: row.output_data ? JSON.parse(row.output_data) : undefined,
      error: row.error_message,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }
}
