import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EmailService } from '../integration-framework/email/email.service';

export interface ScheduledAction {
  id: string;
  workspaceId: string;
  userId: string;
  actionType: string;
  actionConfig: Record<string, any>;
  scheduledAt: string;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';
  executedAt?: string;
  result?: any;
  description?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class ScheduledActionsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ScheduledActionsService.name);
  private schedulerInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_MS = 30000; // Check every 30 seconds

  constructor(
    private readonly db: DatabaseService,
    private readonly emailService: EmailService,
  ) {}

  onModuleInit() {
    this.startScheduler();
  }

  onModuleDestroy() {
    this.stopScheduler();
  }

  private startScheduler() {
    this.logger.log('[ScheduledActions] Starting scheduler with 30s interval...');
    this.schedulerInterval = setInterval(() => {
      this.processPendingActions().catch((err) => {
        this.logger.error(`[ScheduledActions] Error processing actions: ${err.message}`);
      });
    }, this.CHECK_INTERVAL_MS);

    // Also run immediately on startup (with small delay to ensure DB is ready)
    setTimeout(() => {
      this.logger.log('[ScheduledActions] Running initial check...');
      this.processPendingActions().catch((err) => {
        this.logger.error(`[ScheduledActions] Error on initial run: ${err.message}`);
      });
    }, 5000); // 5 second delay to ensure database is ready
  }

  /**
   * Manually trigger processing of pending actions (for debugging)
   */
  async triggerProcessing(): Promise<{ processed: number }> {
    this.logger.log('[ScheduledActions] Manual trigger requested');
    const countBefore = await this.getPendingCount();
    await this.processPendingActions();
    const countAfter = await this.getPendingCount();
    return { processed: countBefore - countAfter };
  }

  /**
   * Get count of pending actions
   */
  private async getPendingCount(): Promise<number> {
    try {
      const result = await this.db
        .table('scheduled_actions')
        .select('id')
        .where('status', '=', 'pending')
        .execute();
      return result?.data?.length || 0;
    } catch {
      return 0;
    }
  }

  private stopScheduler() {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
      this.logger.log('[ScheduledActions] Scheduler stopped');
    }
  }

  /**
   * Schedule a one-time action for future execution
   */
  async scheduleAction(
    workspaceId: string,
    userId: string,
    actionType: string,
    actionConfig: Record<string, any>,
    scheduledAt: Date,
    description?: string,
  ): Promise<ScheduledAction> {
    this.logger.log(`[ScheduledActions] Scheduling ${actionType} for ${scheduledAt.toISOString()}`);
    this.logger.log(`[ScheduledActions] WorkspaceId: ${workspaceId}, UserId: ${userId}`);
    this.logger.log(`[ScheduledActions] ActionConfig: ${JSON.stringify(actionConfig)}`);

    const insertData = {
      workspace_id: workspaceId,
      user_id: userId,
      action_type: actionType,
      action_config: actionConfig,
      scheduled_at: scheduledAt.toISOString(),
      status: 'pending',
      description: description || `Scheduled ${actionType}`,
    };

    this.logger.log(`[ScheduledActions] Insert data: ${JSON.stringify(insertData)}`);

    try {
      // db.insert already extracts data[0] or the object itself
      const insertedData = await this.db.insert('scheduled_actions', insertData);

      this.logger.log(`[ScheduledActions] Insert result type: ${typeof insertedData}`);
      this.logger.log(`[ScheduledActions] Insert result: ${JSON.stringify(insertedData)}`);

      if (!insertedData || !insertedData.id) {
        this.logger.error(
          `[ScheduledActions] Insert returned invalid data: ${JSON.stringify(insertedData)}`,
        );
        throw new Error(
          'Failed to create scheduled action - invalid response from database. The scheduled_actions table may not exist. Run migrations.',
        );
      }

      const transformedAction = this.transformAction(insertedData);
      this.logger.log(
        `[ScheduledActions] Transformed action: ${JSON.stringify(transformedAction)}`,
      );

      return transformedAction;
    } catch (error) {
      this.logger.error(`[ScheduledActions] Failed to schedule action: ${error.message}`);
      this.logger.error(`[ScheduledActions] Error stack: ${error.stack}`);
      // Provide more helpful error message
      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        throw new Error(
          'The scheduled_actions table does not exist. Please run database migrations.',
        );
      }
      throw error;
    }
  }

  /**
   * Get scheduled actions for a user in a workspace (pending + recently executed)
   * @param workspaceId - The workspace ID
   * @param userId - The user ID (optional, if not provided returns all workspace actions)
   * @param includeRecent - If true, also include actions executed in the last 7 days
   */
  async getPendingActions(
    workspaceId: string,
    userId?: string,
    includeRecent: boolean = true,
  ): Promise<ScheduledAction[]> {
    this.logger.log(
      `[ScheduledActions] Getting actions for workspace: ${workspaceId}, userId: ${userId || 'ALL'}, includeRecent: ${includeRecent}`,
    );

    try {
      // Build query for pending actions
      let pendingQuery = this.db
        .table('scheduled_actions')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('status', '=', 'pending');

      if (userId) {
        pendingQuery = pendingQuery.where('user_id', '=', userId);
      }

      const pendingResult = await pendingQuery.execute();

      const pendingActions = (pendingResult?.data || []).map(this.transformAction);
      this.logger.log(`[ScheduledActions] Found ${pendingActions.length} pending actions`);

      if (!includeRecent) {
        return pendingActions;
      }

      // Get recently executed/completed/failed actions (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      let recentQuery = this.db
        .table('scheduled_actions')
        .select('*')
        .where('workspace_id', '=', workspaceId);

      if (userId) {
        recentQuery = recentQuery.where('user_id', '=', userId);
      }

      const recentResult = await recentQuery.execute();

      this.logger.log(
        `[ScheduledActions] Total actions in DB for user/workspace: ${recentResult?.data?.length || 0}`,
      );

      // Filter for non-pending actions that were updated in the last 7 days
      const recentActions = (recentResult?.data || [])
        .filter((action: any) => {
          if (action.status === 'pending') return false; // Already included in pending
          const updatedAt = new Date(action.updated_at);
          const isRecent = updatedAt >= sevenDaysAgo;
          return isRecent;
        })
        .map(this.transformAction);

      this.logger.log(
        `[ScheduledActions] Found ${recentActions.length} recent (non-pending) actions`,
      );

      // Combine and sort by scheduled_at descending
      const allActions = [...pendingActions, ...recentActions];
      allActions.sort(
        (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
      );

      this.logger.log(`[ScheduledActions] Total actions: ${allActions.length}`);
      return allActions;
    } catch (error) {
      this.logger.error(`[ScheduledActions] Error getting actions: ${error.message}`);
      // If table doesn't exist, return empty array
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        this.logger.warn('[ScheduledActions] Table may not exist. Run migrations.');
        return [];
      }
      throw error;
    }
  }

  /**
   * Get ALL scheduled actions (for debugging)
   */
  async getAllActions(workspaceId?: string): Promise<ScheduledAction[]> {
    this.logger.log(
      `[ScheduledActions] Getting ALL actions${workspaceId ? ` for workspace: ${workspaceId}` : ''}`,
    );

    try {
      let query = this.db.table('scheduled_actions').select('*');

      if (workspaceId) {
        query = query.where('workspace_id', '=', workspaceId);
      }

      const result = await query.execute();

      this.logger.log(`[ScheduledActions] Total actions found: ${result?.data?.length || 0}`);
      if (result?.data?.length > 0) {
        this.logger.log(`[ScheduledActions] First action: ${JSON.stringify(result.data[0])}`);
      }

      return (result?.data || []).map(this.transformAction);
    } catch (error) {
      this.logger.error(`[ScheduledActions] Error getting all actions: ${error.message}`);
      return [];
    }
  }

  /**
   * Cancel a scheduled action
   */
  async cancelAction(actionId: string, userId: string): Promise<boolean> {
    const result = await this.db
      .table('scheduled_actions')
      .select('*')
      .where('id', '=', actionId)
      .execute();

    if (!result.data?.[0]) {
      return false;
    }

    const action = result.data[0];
    if (action.user_id !== userId) {
      return false; // Can only cancel own actions
    }

    if (action.status !== 'pending') {
      return false; // Can only cancel pending actions
    }

    await this.db.update('scheduled_actions', actionId, {
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    });

    this.logger.log(`[ScheduledActions] Action ${actionId} cancelled`);
    return true;
  }

  /**
   * Process all pending actions that are due
   */
  private async processPendingActions(): Promise<void> {
    try {
      const now = new Date();
      this.logger.log(`[ScheduledActions] ========== CHECKING FOR DUE ACTIONS ==========`);
      this.logger.log(`[ScheduledActions] Current time: ${now.toISOString()}`);

      // Find all pending actions that are due
      const result = await this.db
        .table('scheduled_actions')
        .select('*')
        .where('status', '=', 'pending')
        .execute();

      const allPending = result?.data || [];
      this.logger.log(`[ScheduledActions] Found ${allPending.length} pending action(s) total`);

      if (allPending.length > 0) {
        // Log details of each pending action
        allPending.forEach((action: any, index: number) => {
          this.logger.log(
            `[ScheduledActions] Action ${index + 1}: id=${action.id}, scheduled_at=${action.scheduled_at}, type=${action.action_type}, retry_count=${action.retry_count}`,
          );
        });
      }

      const dueActions = allPending.filter((action: any) => {
        const scheduledAt = new Date(action.scheduled_at);
        const isDue = scheduledAt <= now;
        this.logger.log(
          `[ScheduledActions] Action ${action.id}: scheduled=${scheduledAt.toISOString()}, now=${now.toISOString()}, isDue=${isDue}`,
        );
        return isDue;
      });

      this.logger.log(`[ScheduledActions] ${dueActions.length} action(s) are due for execution`);

      if (dueActions.length > 0) {
        for (const action of dueActions) {
          await this.executeAction(action);
        }
      }
      this.logger.log(`[ScheduledActions] ========== CHECK COMPLETE ==========`);
    } catch (error) {
      // Table might not exist yet - this is OK, just log and continue
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        this.logger.warn(
          '[ScheduledActions] Table scheduled_actions may not exist yet. Run migrations.',
        );
      } else {
        this.logger.error(`[ScheduledActions] Error processing pending actions: ${error.message}`);
        this.logger.error(`[ScheduledActions] Stack: ${error.stack}`);
      }
    }
  }

  /**
   * Execute a single scheduled action
   */
  private async executeAction(action: any): Promise<void> {
    const actionId = action.id;
    this.logger.log(`[ScheduledActions] >>>>>> EXECUTING ACTION ${actionId} <<<<<<`);
    this.logger.log(`[ScheduledActions] Action type: ${action.action_type}`);
    this.logger.log(`[ScheduledActions] Action config: ${JSON.stringify(action.action_config)}`);

    // Mark as executing
    await this.db.update('scheduled_actions', actionId, {
      status: 'executing',
      updated_at: new Date().toISOString(),
    });

    try {
      let result: any;

      switch (action.action_type) {
        case 'send_email':
          result = await this.executeSendEmail(action);
          break;
        case 'send_notification':
          result = await this.executeSendNotification(action);
          break;
        // Add more action types as needed
        default:
          throw new Error(`Unknown action type: ${action.action_type}`);
      }

      // Mark as completed
      await this.db.update('scheduled_actions', actionId, {
        status: 'completed',
        executed_at: new Date().toISOString(),
        result: result,
        updated_at: new Date().toISOString(),
      });

      this.logger.log(`[ScheduledActions] Action ${actionId} completed successfully`);
    } catch (error) {
      const retryCount = (action.retry_count || 0) + 1;
      const maxRetries = action.max_retries || 3;

      if (retryCount < maxRetries) {
        // Schedule for retry
        await this.db.update('scheduled_actions', actionId, {
          status: 'pending',
          retry_count: retryCount,
          result: { error: error.message, retryCount },
          updated_at: new Date().toISOString(),
        });
        this.logger.warn(
          `[ScheduledActions] Action ${actionId} failed, will retry (${retryCount}/${maxRetries})`,
        );
      } else {
        // Max retries reached, mark as failed
        await this.db.update('scheduled_actions', actionId, {
          status: 'failed',
          executed_at: new Date().toISOString(),
          result: { error: error.message, retryCount },
          updated_at: new Date().toISOString(),
        });
        this.logger.error(
          `[ScheduledActions] Action ${actionId} failed permanently: ${error.message}`,
        );
      }
    }
  }

  /**
   * Execute send_email action
   */
  private async executeSendEmail(action: any): Promise<any> {
    const config = action.action_config;
    this.logger.log(`[ScheduledActions] Email action config: ${JSON.stringify(config)}`);

    const { to, subject, body, cc, bcc } = config;

    // Validate required fields
    if (!to) {
      throw new Error('Email "to" field is missing from action config');
    }

    // Ensure 'to' is an array
    const toArray = Array.isArray(to) ? to : [to];

    if (toArray.length === 0) {
      throw new Error('Email "to" field is empty');
    }

    if (!subject) {
      throw new Error('Email "subject" field is missing');
    }

    if (!body) {
      throw new Error('Email "body" field is missing');
    }

    this.logger.log(`[ScheduledActions] Sending scheduled email to: ${toArray.join(', ')}`);
    this.logger.log(`[ScheduledActions] Subject: ${subject}`);
    this.logger.log(
      `[ScheduledActions] User ID: ${action.user_id}, Workspace ID: ${action.workspace_id}`,
    );

    try {
      const result = await this.emailService.sendEmail(action.user_id, action.workspace_id, {
        to: toArray,
        subject,
        body,
        cc: cc || [],
        bcc: bcc || [],
        isHtml: true,
      } as any);

      this.logger.log(`[ScheduledActions] Email sent successfully: ${JSON.stringify(result)}`);
      return result;
    } catch (emailError) {
      this.logger.error(`[ScheduledActions] Email service error: ${emailError.message}`);
      throw emailError;
    }
  }

  /**
   * Execute send_notification action
   */
  private async executeSendNotification(action: any): Promise<any> {
    const config = action.action_config;
    // TODO: Implement notification sending
    this.logger.log(`[ScheduledActions] Would send notification: ${JSON.stringify(config)}`);
    return { success: true, message: 'Notification sent (stub)' };
  }

  /**
   * Transform database row to ScheduledAction
   */
  private transformAction = (row: any): ScheduledAction => ({
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    actionType: row.action_type,
    actionConfig: row.action_config,
    scheduledAt: row.scheduled_at,
    status: row.status,
    executedAt: row.executed_at,
    result: row.result,
    description: row.description,
    retryCount: row.retry_count || 0,
    maxRetries: row.max_retries || 3,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}
