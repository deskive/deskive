import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateScheduledNotificationDto,
  UpdateScheduledNotificationDto,
  QueryScheduledNotificationsDto,
  ScheduledNotificationResponseDto,
  PaginatedScheduledNotificationsDto,
  SchedulerStatsDto,
  ScheduleStatus,
} from './dto';

@Injectable()
export class NotificationSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationSchedulerService.name);
  private isProcessing = false;
  private lastRunAt: Date | null = null;
  private processedCount = 0;

  constructor(
    private readonly db: DatabaseService,
    private readonly notificationsService: NotificationsService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  async onModuleInit() {
    this.logger.log('Notification Scheduler Service initialized');
    // Run initial check for any pending notifications that should have been sent
    await this.processOverdueNotifications();
  }

  onModuleDestroy() {
    this.logger.log('Notification Scheduler Service shutting down');
  }

  // =============================================
  // CRON JOBS
  // =============================================

  /**
   * Main cron job - runs every minute to check for scheduled notifications
   * This is the primary scheduler that sends notifications at their scheduled time
   */
  @Cron(CronExpression.EVERY_MINUTE, {
    name: 'process-scheduled-notifications',
    timeZone: 'UTC',
  })
  async handleScheduledNotifications() {
    if (this.isProcessing) {
      this.logger.debug('Previous job still running, skipping...');
      return;
    }

    try {
      this.isProcessing = true;
      this.lastRunAt = new Date();

      const now = new Date();
      this.logger.debug(`[Scheduler] Checking for scheduled notifications at ${now.toISOString()}`);

      // Find all pending scheduled notifications that are due
      const pendingNotifications = await this.getPendingScheduledNotifications(now);

      if (pendingNotifications.length === 0) {
        this.logger.debug('[Scheduler] No pending notifications to process');
        return;
      }

      this.logger.log(`[Scheduler] Processing ${pendingNotifications.length} scheduled notification(s)`);

      for (const notification of pendingNotifications) {
        await this.processScheduledNotification(notification);
        this.processedCount++;
      }

      this.logger.log(`[Scheduler] Completed processing ${pendingNotifications.length} notification(s)`);
    } catch (error) {
      this.logger.error(`[Scheduler] Error processing scheduled notifications: ${error.message}`, error.stack);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Cleanup cron job - runs every hour to clean up old sent/cancelled notifications
   * Removes notifications older than 30 days to prevent database bloat
   */
  @Cron(CronExpression.EVERY_HOUR, {
    name: 'cleanup-old-notifications',
    timeZone: 'UTC',
  })
  async handleCleanupOldNotifications() {
    try {
      this.logger.log('[Cleanup] Starting cleanup of old scheduled notifications');

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Find old sent/cancelled notifications
      const oldNotifications = await this.db.findMany('notifications', {
        is_scheduled: true,
        schedule_status: ['sent', 'cancelled'],
      });

      const notifications = Array.isArray(oldNotifications.data)
        ? oldNotifications.data
        : Array.isArray(oldNotifications)
        ? oldNotifications
        : [];

      const toDelete = notifications.filter(
        (n) => new Date(n.sent_at || n.updated_at) < thirtyDaysAgo
      );

      if (toDelete.length === 0) {
        this.logger.debug('[Cleanup] No old notifications to clean up');
        return;
      }

      this.logger.log(`[Cleanup] Found ${toDelete.length} old notifications to clean up`);

      // Bulk delete using IDs
      const idsToDelete = toDelete.map((n) => n.id);
      try {
        await this.db.deleteMany('notifications', {
          id: idsToDelete,
        });
        this.logger.log(`[Cleanup] Cleaned up ${toDelete.length} old scheduled notifications`);
      } catch (error) {
        this.logger.error(`[Cleanup] Bulk delete failed: ${error.message}`, error.stack);
      }
    } catch (error) {
      this.logger.error(`[Cleanup] Error during cleanup: ${error.message}`, error.stack);
    }
  }

  /**
   * Retry cron job - runs every 5 minutes to retry failed notifications
   * Attempts to resend notifications that failed with remaining retries
   */
  @Cron(CronExpression.EVERY_5_MINUTES, {
    name: 'retry-failed-notifications',
    timeZone: 'UTC',
  })
  async handleRetryFailedNotifications() {
    try {
      this.logger.debug('[Retry] Checking for failed notifications to retry');

      const failedNotifications = await this.getFailedNotificationsForRetry();

      if (failedNotifications.length === 0) {
        this.logger.debug('[Retry] No failed notifications to retry');
        return;
      }

      this.logger.log(`[Retry] Retrying ${failedNotifications.length} failed notification(s)`);

      for (const notification of failedNotifications) {
        await this.retryFailedNotification(notification);
      }
    } catch (error) {
      this.logger.error(`[Retry] Error retrying failed notifications: ${error.message}`, error.stack);
    }
  }

  /**
   * Daily digest cron job - runs at 9 AM UTC every day
   * Can be used to send daily notification digests
   */
  @Cron('0 9 * * *', {
    name: 'daily-notification-digest',
    timeZone: 'UTC',
  })
  async handleDailyDigest() {
    try {
      this.logger.log('[Digest] Starting daily notification digest processing');
      // This can be expanded to send digest emails/notifications
      // For now, just log stats
      const stats = await this.getSchedulerStats();
      this.logger.log(`[Digest] Daily stats - Pending: ${stats.pending}, Sent: ${stats.sent}, Failed: ${stats.failed}`);
    } catch (error) {
      this.logger.error(`[Digest] Error processing daily digest: ${error.message}`, error.stack);
    }
  }

  // =============================================
  // CORE PROCESSING METHODS
  // =============================================

  /**
   * Get all pending scheduled notifications that are due to be sent
   */
  private async getPendingScheduledNotifications(now: Date): Promise<any[]> {
    try {
      const result = await this.db.findMany('notifications', {
        is_scheduled: true,
        is_sent: false,
        schedule_status: ScheduleStatus.PENDING,
      });

      const notifications = Array.isArray(result.data)
        ? result.data
        : Array.isArray(result)
        ? result
        : [];

      // Filter notifications that are due (scheduled_at <= now)
      // Also ensure notification was created at least 30 seconds ago to prevent
      // immediately sending newly created scheduled notifications
      const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);

      return notifications.filter((n) => {
        if (!n.scheduled_at) return false;
        const scheduledAt = new Date(n.scheduled_at);
        const createdAt = new Date(n.created_at);

        // Skip if notification was just created (within last 30 seconds)
        // This prevents race conditions where a notification is picked up immediately after creation
        if (createdAt > thirtySecondsAgo) {
          this.logger.debug(`[Scheduler] Skipping recently created notification ${n.id} - created ${createdAt.toISOString()}`);
          return false;
        }

        return scheduledAt <= now;
      });
    } catch (error) {
      this.logger.error(`Error fetching pending notifications: ${error.message}`);
      return [];
    }
  }

  /**
   * Process a single scheduled notification - send it and update status
   */
  private async processScheduledNotification(notification: any): Promise<void> {
    const notificationId = notification.id;

    try {
      this.logger.log(`[Process] Sending scheduled notification ${notificationId} to user ${notification.user_id}`);

      // Send the actual notification
      await this.notificationsService.sendNotification({
        user_id: notification.user_id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data || {},
        action_url: notification.action_url,
        priority: notification.priority || 'normal',
        send_push: true,
        send_email: notification.data?.send_email || false,
      });

      // Mark as sent
      await this.db.update('notifications', notificationId, {
        is_sent: true,
        sent_at: new Date().toISOString(),
        schedule_status: ScheduleStatus.SENT,
        updated_at: new Date().toISOString(),
      });

      this.logger.log(`[Process] Successfully sent notification ${notificationId}`);
    } catch (error) {
      this.logger.error(`[Process] Failed to send notification ${notificationId}: ${error.message}`);

      // Update failure status
      const retryCount = (notification.retry_count || 0) + 1;
      const maxRetries = notification.max_retries || 3;

      await this.db.update('notifications', notificationId, {
        retry_count: retryCount,
        last_retry_at: new Date().toISOString(),
        failure_reason: error.message,
        schedule_status: retryCount >= maxRetries ? ScheduleStatus.FAILED : ScheduleStatus.PENDING,
        updated_at: new Date().toISOString(),
      });
    }
  }

  /**
   * Get failed notifications that are eligible for retry
   */
  private async getFailedNotificationsForRetry(): Promise<any[]> {
    try {
      const result = await this.db.findMany('notifications', {
        is_scheduled: true,
        is_sent: false,
        schedule_status: ScheduleStatus.PENDING,
      });

      const notifications = Array.isArray(result.data)
        ? result.data
        : Array.isArray(result)
        ? result
        : [];

      // Filter notifications with failed attempts but retries remaining
      return notifications.filter((n) => {
        if (!n.failure_reason) return false;
        const retryCount = n.retry_count || 0;
        const maxRetries = n.max_retries || 3;
        return retryCount < maxRetries;
      });
    } catch (error) {
      this.logger.error(`Error fetching failed notifications: ${error.message}`);
      return [];
    }
  }

  /**
   * Retry a failed notification
   */
  private async retryFailedNotification(notification: any): Promise<void> {
    this.logger.log(`[Retry] Retrying notification ${notification.id} (attempt ${(notification.retry_count || 0) + 1})`);
    await this.processScheduledNotification(notification);
  }

  /**
   * Process any overdue notifications on startup
   */
  private async processOverdueNotifications(): Promise<void> {
    try {
      const now = new Date();
      const overdueNotifications = await this.getPendingScheduledNotifications(now);

      if (overdueNotifications.length > 0) {
        this.logger.warn(`[Startup] Found ${overdueNotifications.length} overdue notification(s), processing...`);
        for (const notification of overdueNotifications) {
          await this.processScheduledNotification(notification);
        }
      }
    } catch (error) {
      this.logger.error(`[Startup] Error processing overdue notifications: ${error.message}`);
    }
  }

  // =============================================
  // PUBLIC API METHODS
  // =============================================

  /**
   * Schedule a new notification
   */
  async scheduleNotification(dto: CreateScheduledNotificationDto): Promise<ScheduledNotificationResponseDto> {
    try {
      const now = new Date().toISOString();
      const targetUsers = dto.user_ids || [dto.user_id];
      const results: ScheduledNotificationResponseDto[] = [];

      for (const userId of targetUsers) {
        const notification = await this.db.insert('notifications', {
          user_id: userId,
          workspace_id: dto.workspace_id || null,
          type: dto.type,
          title: dto.title,
          message: dto.message || null,
          data: {
            ...dto.data,
            send_push: dto.send_push !== false,
            send_email: dto.send_email || false,
          },
          action_url: dto.action_url || null,
          priority: dto.priority || 'normal',
          category: dto.category || null,
          entity_type: dto.entity_type || null,
          entity_id: dto.entity_id || null,
          actor_id: dto.actor_id || null,
          is_read: false,
          is_archived: false,
          // Scheduled notification fields
          scheduled_at: dto.scheduled_at,
          is_scheduled: true,
          is_sent: false,
          schedule_status: ScheduleStatus.PENDING,
          retry_count: 0,
          max_retries: dto.max_retries || 3,
          created_at: now,
          updated_at: now,
        });

        results.push(this.formatScheduledNotification(notification));
        this.logger.log(`Scheduled notification ${notification.id} for user ${userId} at ${dto.scheduled_at}`);
      }

      // Return single result if only one user, otherwise return first
      return results[0];
    } catch (error) {
      this.logger.error(`Failed to schedule notification: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update a scheduled notification
   */
  async updateScheduledNotification(
    notificationId: string,
    userId: string,
    dto: UpdateScheduledNotificationDto,
  ): Promise<ScheduledNotificationResponseDto> {
    try {
      // Verify notification exists and belongs to user
      const notification = await this.db.findOne('notifications', {
        id: notificationId,
        user_id: userId,
        is_scheduled: true,
      });

      if (!notification) {
        throw new Error('Scheduled notification not found');
      }

      if (notification.is_sent) {
        throw new Error('Cannot update a notification that has already been sent');
      }

      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (dto.scheduled_at) {
        updateData.scheduled_at = dto.scheduled_at;
      }
      if (dto.title) {
        updateData.title = dto.title;
      }
      if (dto.message !== undefined) {
        updateData.message = dto.message;
      }
      if (dto.data) {
        updateData.data = { ...notification.data, ...dto.data };
      }
      if (dto.priority) {
        updateData.priority = dto.priority;
      }
      if (dto.cancel) {
        updateData.schedule_status = ScheduleStatus.CANCELLED;
      }

      const updated = await this.db.update('notifications', notificationId, updateData);
      this.logger.log(`Updated scheduled notification ${notificationId}`);

      return this.formatScheduledNotification(updated);
    } catch (error) {
      this.logger.error(`Failed to update scheduled notification: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelScheduledNotification(notificationId: string, userId: string): Promise<void> {
    await this.updateScheduledNotification(notificationId, userId, { cancel: true });
    this.logger.log(`Cancelled scheduled notification ${notificationId}`);
  }

  /**
   * Get scheduled notifications for a user
   */
  async getScheduledNotifications(
    userId: string,
    query: QueryScheduledNotificationsDto,
  ): Promise<PaginatedScheduledNotificationsDto> {
    try {
      const { page = 1, limit = 20, sort_by = 'scheduled_at', sort_order = 'asc', ...filters } = query;
      const offset = (page - 1) * limit;

      // Build query conditions
      const conditions: any = {
        user_id: userId,
        is_scheduled: true,
      };

      if (filters.status) {
        conditions.schedule_status = filters.status;
      }
      if (filters.type) {
        conditions.type = filters.type;
      }
      if (filters.workspace_id) {
        conditions.workspace_id = filters.workspace_id;
      }

      const result = await this.db.findMany('notifications', conditions);
      let notifications = Array.isArray(result.data)
        ? result.data
        : Array.isArray(result)
        ? result
        : [];

      // Manual date filtering
      if (filters.scheduled_after) {
        const afterDate = new Date(filters.scheduled_after);
        notifications = notifications.filter((n) => new Date(n.scheduled_at) >= afterDate);
      }
      if (filters.scheduled_before) {
        const beforeDate = new Date(filters.scheduled_before);
        notifications = notifications.filter((n) => new Date(n.scheduled_at) <= beforeDate);
      }

      // Sort
      notifications.sort((a, b) => {
        const aVal = a[sort_by];
        const bVal = b[sort_by];
        if (sort_order === 'desc') {
          return aVal > bVal ? -1 : 1;
        }
        return aVal > bVal ? 1 : -1;
      });

      const total = notifications.length;
      const pendingCount = notifications.filter((n) => n.schedule_status === ScheduleStatus.PENDING).length;

      // Apply pagination
      notifications = notifications.slice(offset, offset + limit);

      return {
        data: notifications.map(this.formatScheduledNotification),
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
        pending_count: pendingCount,
      };
    } catch (error) {
      this.logger.error(`Failed to get scheduled notifications: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get scheduler statistics
   */
  async getSchedulerStats(): Promise<SchedulerStatsDto> {
    try {
      const allScheduled = await this.db.findMany('notifications', {
        is_scheduled: true,
      });

      const notifications = Array.isArray(allScheduled.data)
        ? allScheduled.data
        : Array.isArray(allScheduled)
        ? allScheduled
        : [];

      const pending = notifications.filter((n) => n.schedule_status === ScheduleStatus.PENDING);
      const sent = notifications.filter((n) => n.schedule_status === ScheduleStatus.SENT);
      const failed = notifications.filter((n) => n.schedule_status === ScheduleStatus.FAILED);
      const cancelled = notifications.filter((n) => n.schedule_status === ScheduleStatus.CANCELLED);

      // Find next scheduled notification
      const nextScheduled = pending
        .filter((n) => new Date(n.scheduled_at) > new Date())
        .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];

      return {
        pending: pending.length,
        sent: sent.length,
        failed: failed.length,
        cancelled: cancelled.length,
        total: notifications.length,
        next_scheduled_at: nextScheduled?.scheduled_at,
        last_run_at: this.lastRunAt?.toISOString(),
        is_running: this.isProcessing,
      };
    } catch (error) {
      this.logger.error(`Failed to get scheduler stats: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Manually trigger processing (for admin/testing)
   */
  async triggerProcessing(): Promise<{ processed: number }> {
    if (this.isProcessing) {
      return { processed: 0 };
    }

    const countBefore = this.processedCount;
    await this.handleScheduledNotifications();
    const processed = this.processedCount - countBefore;

    return { processed };
  }

  // =============================================
  // HELPER METHODS
  // =============================================

  private formatScheduledNotification(notification: any): ScheduledNotificationResponseDto {
    return {
      id: notification.id,
      user_id: notification.user_id,
      workspace_id: notification.workspace_id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      action_url: notification.action_url,
      priority: notification.priority || 'normal',
      scheduled_at: notification.scheduled_at,
      is_scheduled: notification.is_scheduled,
      is_sent: notification.is_sent,
      sent_at: notification.sent_at,
      schedule_status: notification.schedule_status || ScheduleStatus.PENDING,
      retry_count: notification.retry_count || 0,
      max_retries: notification.max_retries || 3,
      failure_reason: notification.failure_reason,
      created_at: notification.created_at,
      updated_at: notification.updated_at,
    };
  }
}
