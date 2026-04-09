import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import CronExpressionParser from 'cron-parser';

/**
 * Job type - identifies source
 */
export enum ScheduledJobType {
  BOT = 'bot',
  WORKFLOW = 'workflow',
}

/**
 * Scheduled job interface
 */
export interface ScheduledJob {
  id: string;
  jobType: ScheduledJobType;
  automationId: string; // bot_id or workflow_id
  triggerId?: string;
  workspaceId: string;
  cronExpression: string;
  timezone?: string;
  isActive: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * Job execution callback
 */
export type JobExecutionCallback = (job: ScheduledJob) => Promise<void>;

/**
 * Shared Scheduled Job Service
 *
 * Provides unified scheduled job management for both Bots and Workflows.
 * Handles cron parsing, next run calculation, and job execution tracking.
 */
@Injectable()
export class SharedScheduledJobService {
  private readonly logger = new Logger(SharedScheduledJobService.name);
  private callbacks: Map<ScheduledJobType, JobExecutionCallback> = new Map();

  constructor(private readonly db: DatabaseService) {}

  /**
   * Register a callback for job execution
   */
  registerCallback(jobType: ScheduledJobType, callback: JobExecutionCallback): void {
    this.callbacks.set(jobType, callback);
    this.logger.log(`[ScheduledJob] Registered callback for ${jobType}`);
  }

  /**
   * Create or update a scheduled job
   */
  async upsertJob(
    jobType: ScheduledJobType,
    automationId: string,
    workspaceId: string,
    cronExpression: string,
    options: {
      triggerId?: string;
      timezone?: string;
      metadata?: Record<string, any>;
    } = {},
  ): Promise<string> {
    const tableName = this.getTableName(jobType);
    const idColumn = this.getAutomationIdColumn(jobType);
    const nextRunAt = this.calculateNextRun(cronExpression, options.timezone);

    try {
      // Check if job already exists
      const existing = await this.db.table(tableName)
        .select('id')
        .where(idColumn, '=', automationId)
        .where('workspace_id', '=', workspaceId)
        .execute();

      if (existing.data?.[0]) {
        // Update existing
        await this.db.update(tableName, existing.data[0].id, {
          cron_expression: cronExpression,
          timezone: options.timezone || 'UTC',
          next_run_at: nextRunAt.toISOString(),
          is_active: true,
          metadata: options.metadata ? JSON.stringify(options.metadata) : null,
        });
        return existing.data[0].id;
      }

      // Create new
      const result = await this.db.insert(tableName, {
        [idColumn]: automationId,
        trigger_id: options.triggerId,
        workspace_id: workspaceId,
        cron_expression: cronExpression,
        timezone: options.timezone || 'UTC',
        next_run_at: nextRunAt.toISOString(),
        is_active: true,
        metadata: options.metadata ? JSON.stringify(options.metadata) : null,
      });

      this.logger.log(`[ScheduledJob] Created ${jobType} job for ${automationId}`);
      return result?.id;
    } catch (error) {
      this.logger.error(`[ScheduledJob] Failed to upsert job: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a scheduled job
   */
  async deleteJob(
    jobType: ScheduledJobType,
    automationId: string,
    workspaceId: string,
  ): Promise<void> {
    const tableName = this.getTableName(jobType);
    const idColumn = this.getAutomationIdColumn(jobType);

    try {
      const jobs = await this.db.table(tableName)
        .select('id')
        .where(idColumn, '=', automationId)
        .where('workspace_id', '=', workspaceId)
        .execute();

      for (const job of jobs.data || []) {
        await this.db.delete(tableName, job.id);
      }

      this.logger.log(`[ScheduledJob] Deleted ${jobType} jobs for ${automationId}`);
    } catch (error) {
      this.logger.error(`[ScheduledJob] Failed to delete job: ${error.message}`);
    }
  }

  /**
   * Pause a scheduled job
   */
  async pauseJob(jobType: ScheduledJobType, jobId: string): Promise<void> {
    const tableName = this.getTableName(jobType);

    try {
      await this.db.update(tableName, jobId, { is_active: false });
      this.logger.log(`[ScheduledJob] Paused ${jobType} job: ${jobId}`);
    } catch (error) {
      this.logger.error(`[ScheduledJob] Failed to pause job: ${error.message}`);
    }
  }

  /**
   * Resume a scheduled job
   */
  async resumeJob(jobType: ScheduledJobType, jobId: string): Promise<void> {
    const tableName = this.getTableName(jobType);

    try {
      const job = await this.db.findOne(tableName, jobId);
      if (job) {
        const nextRunAt = this.calculateNextRun(job.cron_expression, job.timezone);
        await this.db.update(tableName, jobId, {
          is_active: true,
          next_run_at: nextRunAt.toISOString(),
        });
        this.logger.log(`[ScheduledJob] Resumed ${jobType} job: ${jobId}`);
      }
    } catch (error) {
      this.logger.error(`[ScheduledJob] Failed to resume job: ${error.message}`);
    }
  }

  /**
   * Get due jobs for execution
   */
  async getDueJobs(jobType: ScheduledJobType): Promise<ScheduledJob[]> {
    const tableName = this.getTableName(jobType);
    const now = new Date().toISOString();

    try {
      const result = await this.db.table(tableName)
        .select('*')
        .where('is_active', '=', true)
        .where('next_run_at', '<=', now)
        .execute();

      return (result.data || []).map((row: any) => this.mapToJob(jobType, row));
    } catch (error) {
      this.logger.error(`[ScheduledJob] Failed to get due jobs: ${error.message}`);
      return [];
    }
  }

  /**
   * Mark job as executed and calculate next run
   */
  async markExecuted(jobType: ScheduledJobType, jobId: string): Promise<void> {
    const tableName = this.getTableName(jobType);
    const now = new Date();

    try {
      const job = await this.db.findOne(tableName, jobId);
      if (job) {
        const nextRunAt = this.calculateNextRun(job.cron_expression, job.timezone);
        await this.db.update(tableName, jobId, {
          last_run_at: now.toISOString(),
          next_run_at: nextRunAt.toISOString(),
        });
      }
    } catch (error) {
      this.logger.error(`[ScheduledJob] Failed to mark executed: ${error.message}`);
    }
  }

  /**
   * Process due jobs (called by cron)
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processDueJobs(): Promise<void> {
    for (const jobType of [ScheduledJobType.BOT, ScheduledJobType.WORKFLOW]) {
      const callback = this.callbacks.get(jobType);
      if (!callback) continue;

      const dueJobs = await this.getDueJobs(jobType);

      for (const job of dueJobs) {
        try {
          this.logger.log(`[ScheduledJob] Executing ${jobType} job: ${job.id}`);
          await callback(job);
          await this.markExecuted(jobType, job.id);
        } catch (error) {
          this.logger.error(`[ScheduledJob] Job ${job.id} failed: ${error.message}`);
          // Still mark as executed to prevent repeated failures
          await this.markExecuted(jobType, job.id);
        }
      }
    }
  }

  /**
   * Calculate next run time from cron expression
   * Uses cron-parser library for accurate parsing
   */
  calculateNextRun(cronExpression: string, timezone?: string): Date {
    try {
      const expression = CronExpressionParser.parse(cronExpression, {
        tz: timezone || 'UTC',
      });
      return expression.next().toDate();
    } catch (error) {
      this.logger.warn(`[ScheduledJob] Invalid cron: ${cronExpression}, defaulting to +1 hour`);
      const fallback = new Date();
      fallback.setHours(fallback.getHours() + 1);
      return fallback;
    }
  }

  /**
   * Validate a cron expression
   * Uses cron-parser library for accurate validation
   */
  isValidCron(cronExpression: string): boolean {
    try {
      CronExpressionParser.parse(cronExpression);
      return true;
    } catch {
      return false;
    }
  }

  // Helper methods

  private getTableName(jobType: ScheduledJobType): string {
    return jobType === ScheduledJobType.BOT
      ? 'bot_scheduled_jobs'
      : 'workflow_scheduled_jobs';
  }

  private getAutomationIdColumn(jobType: ScheduledJobType): string {
    return jobType === ScheduledJobType.BOT ? 'bot_id' : 'workflow_id';
  }

  private mapToJob(jobType: ScheduledJobType, row: any): ScheduledJob {
    return {
      id: row.id,
      jobType,
      automationId: jobType === ScheduledJobType.BOT ? row.bot_id : row.workflow_id,
      triggerId: row.trigger_id,
      workspaceId: row.workspace_id,
      cronExpression: row.cron_expression,
      timezone: row.timezone,
      isActive: row.is_active,
      lastRunAt: row.last_run_at ? new Date(row.last_run_at) : undefined,
      nextRunAt: row.next_run_at ? new Date(row.next_run_at) : undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }
}
