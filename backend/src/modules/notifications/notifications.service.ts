import { Injectable, NotFoundException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { NotificationsGateway } from './notifications.gateway';
import { FirebaseService } from './firebase.service';
import {
  CreateNotificationDto,
  UpdatePreferencesDto,
  NotificationQueryDto,
  SubscribePushDto,
  UnsubscribePushDto,
  BulkActionDto,
  NotificationResponseDto,
  PaginatedNotificationsDto,
  NotificationType,
  NotificationPriority,
  RegisterFcmTokenDto,
  UnregisterFcmTokenDto,
  FcmTokenResponseDto,
} from './dto';

export interface NotificationPreferences {
  user_id: string;
  global: {
    push: boolean;
    email: boolean;
    in_app: boolean;
  };
  types: Record<string, {
    push: boolean;
    email: boolean;
    in_app: boolean;
  }>;
  quiet_hours?: {
    start?: string;
    end?: string;
    days?: string[];
    timezone?: string;
  };
  daily_limit: number;
  grouping: Record<string, any>;
  language: string;
  metadata: Record<string, any>;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  device_info: Record<string, any>;
  notification_types: string[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly db: DatabaseService,
    @Inject(forwardRef(() => NotificationsGateway))
    private readonly notificationsGateway: NotificationsGateway,
    private readonly firebaseService: FirebaseService,
  ) {}

  // =============================================
  // NOTIFICATION OPERATIONS
  // =============================================

  async sendNotification(createNotificationDto: CreateNotificationDto): Promise<NotificationResponseDto | NotificationResponseDto[]> {
    try {
      const { user_id, user_ids, send_push, send_email, push_config, email_config, force_send, ...notificationData } = createNotificationDto;

      // Determine target users
      const targetUsers = user_ids || (user_id ? [user_id] : []);

      if (targetUsers.length === 0) {
        throw new BadRequestException('Must specify at least one user_id or user_ids');
      }

      const results: NotificationResponseDto[] = [];

      for (const userId of targetUsers) {
        // Check user preferences before sending (skip if force_send is true)
        const preferences = await this.getNotificationPreferences(userId);
        const shouldCreateInApp = force_send || await this.shouldCreateInAppNotification(userId, createNotificationDto, preferences);
        const shouldSendPush = force_send || await this.shouldSendPushNotification(userId, createNotificationDto, preferences);

        if (!shouldCreateInApp) {
          this.logger.warn(`❌ In-app notification blocked by user preferences for user ${userId} - Type: ${createNotificationDto.type}, Title: "${createNotificationDto.title}"`);
          continue;
        }

        if (force_send) {
          this.logger.log(`📢 Force sending notification to user ${userId} (mention notification)`);
        }

        this.logger.log(`✅ Creating in-app notification for user ${userId} - Type: ${createNotificationDto.type}, Title: "${createNotificationDto.title}"`);

        // Always create in-app notification if inApp is enabled
        const inAppNotification = await this.createInAppNotification(userId, notificationData);
        results.push(inAppNotification);

        // Always emit WebSocket event for in-app updates (sooner toast + bell count)
        // Include push setting and sound preference so frontend can control notifications
        try {
          await this.emitRealtimeNotification(userId, {
            ...inAppNotification,
            shouldShowBrowserNotification: shouldSendPush, // Frontend will use this
            soundEnabled: preferences.metadata?.sound ?? true, // Frontend will use this for sound control
          });
        } catch (realtimeError) {
          this.logger.warn(`⚠️ Failed to emit realtime notification (Socket.IO), continuing with other channels: ${realtimeError.message}`);
        }

        if (shouldSendPush) {
          this.logger.log(`✅ Push enabled - frontend will show browser notification for user ${userId}`);
        } else {
          this.logger.debug(`⏭️ Push disabled - frontend will skip browser notification for user ${userId}`);
        }

        // Send push notification to mobile devices if enabled
        this.logger.debug(`🔍 FCM Check - shouldSendPush: ${shouldSendPush}, send_push: ${send_push}, preferences.global.push: ${preferences.global.push}`);
        if (shouldSendPush && send_push && preferences.global.push) {
          this.logger.log(`📲 Calling sendPushNotification for user ${userId}`);
          await this.sendPushNotification(userId, createNotificationDto, push_config);
        } else {
          this.logger.warn(`⏭️ Skipping push notification - Conditions not met`);
        }

        // Send email notification if enabled
        if (send_email && preferences.global.email) {
          await this.sendEmailNotification(userId, createNotificationDto, email_config);
        }
      }

      return results.length === 1 ? results[0] : results;
    } catch (error) {
      this.logger.error(`Failed to send notification: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to send notification: ${error.message}`);
    }
  }

  async getNotifications(userId: string, query: NotificationQueryDto): Promise<PaginatedNotificationsDto> {
    try {
      console.log("query to get notification",query)
      const { page = 1, limit = 20, sort_by = 'created_at', sort_order = 'desc', ...filters } = query;
      const offset = (page - 1) * limit;

      // Build conditions object for simpler querying
      // Boolean conversion is now handled by DTO @Transform decorator
      const conditions: any = {
        user_id: userId,
        is_archived: filters.is_archived !== undefined ? filters.is_archived : false,
      };

      if (filters.is_read !== undefined) {
        conditions.is_read = filters.is_read;
      }

      if (filters.type) {
        conditions.type = filters.type;
      }

      if (filters.priority) {
        conditions.priority = filters.priority;
      }

      // Use findMany for simpler query execution
      console.log('[DB] findMany notifications with conditions:', JSON.stringify(conditions, null, 2));
      const result = await this.db.findMany('notifications', conditions);
      console.log('[DB] findMany result type:', typeof result);
      console.log('[DB] findMany result.data?:', result.data ? 'exists' : 'null/undefined');
      console.log('[DB] findMany raw result:', JSON.stringify(result, null, 2).substring(0, 500));
      let notifications = Array.isArray(result.data) ? result.data : (Array.isArray(result) ? result : []);
      console.log('[DB] notifications array length:', notifications.length);

      // Filter out scheduled notifications that haven't been sent yet
      // These should only be visible after they've been processed by the scheduler
      notifications = notifications.filter(n => {
        // If it's a scheduled notification, only show it if it has been sent
        if (n.is_scheduled === true) {
          return n.is_sent === true;
        }
        // Non-scheduled notifications are always shown
        return true;
      });
      console.log('[DB] notifications after filtering scheduled:', notifications.length);

      // Manual filtering for complex conditions
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        notifications = notifications.filter(n =>
          n.title?.toLowerCase().includes(searchLower) ||
          n.message?.toLowerCase().includes(searchLower)
        );
      }

      if (filters.start_date) {
        const startDate = new Date(filters.start_date);
        notifications = notifications.filter(n => new Date(n.created_at) >= startDate);
      }

      if (filters.end_date) {
        const endDate = new Date(filters.end_date + 'T23:59:59.999Z');
        notifications = notifications.filter(n => new Date(n.created_at) <= endDate);
      }

      if (filters.has_action !== undefined) {
        notifications = filters.has_action
          ? notifications.filter(n => n.action_url)
          : notifications.filter(n => !n.action_url);
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

      // Get total before pagination
      const total = notifications.length;

      // Apply pagination
      notifications = notifications.slice(offset, offset + limit);

      // Get unread count
      const unreadCount = await this.getUnreadCount(userId);

      return {
        data: notifications.map(this.formatNotification),
        total: total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
        unread_count: unreadCount,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch notifications: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to fetch notifications: ${error.message}`);
    }
  }

  async markAsRead(userId: string, notificationId: string): Promise<NotificationResponseDto> {
    try {
      const notification = await this.db.findOne('notifications', {
        id: notificationId,
        user_id: userId,
      });

      if (!notification) {
        throw new NotFoundException('Notification not found');
      }

      const readAt = new Date().toISOString();
      const updatedNotification = await this.db.update('notifications', notificationId, {
        is_read: true,
        read_at: readAt,
      });

      // Emit real-time update for read status
      await this.notificationsGateway.emitNotificationReadToUser(userId, notificationId, true, readAt);

      return this.formatNotification(updatedNotification);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to mark notification as read: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to mark notification as read: ${error.message}`);
    }
  }

  async markAsUnread(userId: string, notificationId: string): Promise<NotificationResponseDto> {
    try {
      const notification = await this.db.findOne('notifications', {
        id: notificationId,
        user_id: userId,
      });

      if (!notification) {
        throw new NotFoundException('Notification not found');
      }

      const updatedNotification = await this.db.update('notifications', notificationId, {
        is_read: false,
        read_at: null,
      });

      return this.formatNotification(updatedNotification);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to mark notification as unread: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to mark notification as unread: ${error.message}`);
    }
  }

  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    try {
      const notification = await this.db.findOne('notifications', {
        id: notificationId,
        user_id: userId,
      });

      if (!notification) {
        throw new NotFoundException('Notification not found');
      }

      await this.db.delete('notifications', notificationId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to delete notification: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to delete notification: ${error.message}`);
    }
  }

  async bulkMarkAsRead(userId: string, bulkActionDto: BulkActionDto): Promise<{ success: number; failed: number }> {
    try {
      let success = 0;
      let failed = 0;

      for (const notificationId of bulkActionDto.notification_ids) {
        try {
          await this.markAsRead(userId, notificationId);
          success++;
        } catch (error) {
          this.logger.warn(`Failed to mark notification ${notificationId} as read: ${error.message}`);
          failed++;
        }
      }

      return { success, failed };
    } catch (error) {
      this.logger.error(`Failed to bulk mark as read: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to bulk mark as read: ${error.message}`);
    }
  }

  async deleteAllReadNotifications(userId: string): Promise<{ deleted: number }> {
    try {
      // First get the count of read notifications
      const readNotifications = await this.db.findMany('notifications', {
        user_id: userId,
        is_read: true,
      });

      const notifications = Array.isArray(readNotifications.data)
        ? readNotifications.data
        : Array.isArray(readNotifications)
        ? readNotifications
        : [];

      if (notifications.length === 0) {
        this.logger.log(`No read notifications to delete for user ${userId}`);
        return { deleted: 0 };
      }

      const count = notifications.length;

      // Use bulk delete with conditions
      await this.db.deleteMany('notifications', {
        user_id: userId,
        is_read: true,
      });

      this.logger.log(`Deleted ${count} read notifications for user ${userId}`);
      return { deleted: count };
    } catch (error) {
      this.logger.error(`Failed to delete all read notifications: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to delete all read notifications: ${error.message}`);
    }
  }

  async markAllAsReadBulk(userId: string): Promise<{ updated: number }> {
    try {
      // First get the count of unread notifications
      const unreadNotifications = await this.db.findMany('notifications', {
        user_id: userId,
        is_read: false,
      });

      const notifications = Array.isArray(unreadNotifications.data)
        ? unreadNotifications.data
        : Array.isArray(unreadNotifications)
        ? unreadNotifications
        : [];

      if (notifications.length === 0) {
        this.logger.log(`No unread notifications to mark as read for user ${userId}`);
        return { updated: 0 };
      }

      const count = notifications.length;
      const readAt = new Date().toISOString();

      // Use bulk update with conditions
      await this.db.updateMany('notifications', {
        user_id: userId,
        is_read: false,
      }, {
        is_read: true,
        read_at: readAt,
      });

      this.logger.log(`Marked ${count} notifications as read for user ${userId}`);
      return { updated: count };
    } catch (error) {
      this.logger.error(`Failed to mark all notifications as read: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to mark all notifications as read: ${error.message}`);
    }
  }

  // =============================================
  // NOTIFICATION PREFERENCES
  // =============================================

  async getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      // First, try to get settings from user_settings table
      const userSettings = await this.db.findOne('user_settings', {
        user_id: userId,
      });

      if (userSettings && userSettings.notifications) {
        // Parse and map the notification settings to our format
        const notifSettings = typeof userSettings.notifications === 'string'
          ? JSON.parse(userSettings.notifications)
          : userSettings.notifications;

        // Get user's timezone from user_settings (defaults to UTC if not set)
        const userTimezone = userSettings.timezone || 'UTC';
        this.logger.log(`[Preferences] Loading notification preferences for user ${userId} with timezone: ${userTimezone}`);

        return this.mapUserSettingsToPreferences(userId, notifSettings, userTimezone);
      }

      // Fallback to health_metrics table for backward compatibility
      const preferencesRecord = await this.db.findOne('health_metrics', {
        user_id: userId,
        metric_type: 'notification_preferences',
      });

      if (preferencesRecord) {
        return preferencesRecord.metadata as NotificationPreferences;
      }

      // Return default preferences if none found
      return this.getDefaultPreferences(userId);
    } catch (error) {
      this.logger.error(`Failed to get notification preferences: ${error.message}`, error.stack);
      return this.getDefaultPreferences(userId);
    }
  }

  private mapUserSettingsToPreferences(userId: string, notifSettings: any, userTimezone: string = 'UTC'): NotificationPreferences {
    // Map the user_settings notification structure to NotificationPreferences format
    const categories = notifSettings.categories || [];
    const generalSettings = notifSettings.generalSettings || {};

    // Build the types object from categories
    const types: Record<string, { push: boolean; email: boolean; in_app: boolean }> = {};

    categories.forEach((category: any) => {
      types[category.id] = {
        push: category.settings.push ?? true,
        email: category.settings.email ?? true,
        in_app: category.settings.inApp ?? true,
      };
    });

    // Map quiet hours if enabled - use user's timezone
    const quiet_hours = generalSettings.quietHours?.enabled ? {
      start: generalSettings.quietHours.startTime || '22:00',
      end: generalSettings.quietHours.endTime || '08:00',
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      timezone: userTimezone, // Use user's timezone instead of hardcoded UTC
    } : undefined;

    if (quiet_hours) {
      this.logger.log(`[Preferences] ✅ Quiet hours configured: ${quiet_hours.start}-${quiet_hours.end} in timezone ${quiet_hours.timezone}`);
    } else {
      this.logger.warn(`[Preferences] ❌ Quiet hours NOT configured or disabled. quietHours.enabled = ${generalSettings.quietHours?.enabled}`);
    }

    return {
      user_id: userId,
      global: {
        push: notifSettings.push ?? true,
        email: notifSettings.email ?? true,
        in_app: true, // Always allow in-app by default
      },
      types,
      quiet_hours,
      daily_limit: 1000, // High default limit
      grouping: {},
      language: 'en',
      metadata: {
        directMessages: notifSettings.directMessages ?? true,
        channelMessages: notifSettings.channelMessages ?? true,
        doNotDisturb: generalSettings.doNotDisturb ?? false,
        sound: generalSettings.sound ?? true,
        frequency: generalSettings.frequency ?? 'immediate',
      },
    };
  }

  async updateNotificationPreferences(userId: string, updatePreferencesDto: UpdatePreferencesDto): Promise<NotificationPreferences> {
    try {
      const currentPreferences = await this.getNotificationPreferences(userId);
      
      // Merge with new preferences
      const mergedTypes = { ...currentPreferences.types };
      
      // Handle type-specific preferences merge
      if (updatePreferencesDto.types) {
        Object.keys(updatePreferencesDto.types).forEach(type => {
          const typePrefs = updatePreferencesDto.types![type as keyof typeof updatePreferencesDto.types];
          if (typePrefs) {
            mergedTypes[type] = {
              push: typePrefs.push ?? mergedTypes[type]?.push ?? true,
              email: typePrefs.email ?? mergedTypes[type]?.email ?? false,
              in_app: typePrefs.in_app ?? mergedTypes[type]?.in_app ?? true,
            };
          }
        });
      }

      const updatedPreferences: NotificationPreferences = {
        ...currentPreferences,
        ...updatePreferencesDto,
        user_id: userId,
        global: {
          ...currentPreferences.global,
          ...updatePreferencesDto.global,
        },
        types: mergedTypes,
        metadata: {
          ...currentPreferences.metadata,
          ...updatePreferencesDto.metadata,
        },
      };

      // Look for existing preferences record
      const existingRecord = await this.db.findOne('health_metrics', {
        user_id: userId,
        metric_type: 'notification_preferences',
      });

      if (existingRecord) {
        await this.db.update('health_metrics', existingRecord.id, {
          metadata: updatedPreferences,
          updated_at: new Date().toISOString(),
        });
      } else {
        await this.db.insert('health_metrics', {
          user_id: userId,
          metric_type: 'notification_preferences',
          value: 1,
          unit: 'preferences',
          metadata: updatedPreferences,
        });
      }

      return updatedPreferences;
    } catch (error) {
      this.logger.error(`Failed to update notification preferences: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to update notification preferences: ${error.message}`);
    }
  }

  // =============================================
  // PUSH SUBSCRIPTION MANAGEMENT
  // =============================================

  async subscribeToPush(userId: string, subscribePushDto: SubscribePushDto): Promise<{ success: boolean; subscription_id: string }> {
    try {
      const subscriptionData: Omit<PushSubscription, 'id' | 'created_at' | 'updated_at'> = {
        user_id: userId,
        endpoint: subscribePushDto.subscription.endpoint,
        keys: subscribePushDto.subscription.keys,
        device_info: subscribePushDto.device_info || {},
        notification_types: subscribePushDto.notification_types || Object.values(NotificationType),
        enabled: subscribePushDto.enabled ?? true,
      };

      // Check if subscription already exists
      const existingSubscription = await this.db.findOne('health_metrics', {
        user_id: userId,
        metric_type: 'push_subscription',
        'metadata.endpoint': subscribePushDto.subscription.endpoint,
      });

      let subscriptionId: string;

      if (existingSubscription) {
        // Update existing subscription
        subscriptionId = existingSubscription.id;
        await this.db.update('health_metrics', subscriptionId, {
          metadata: subscriptionData,
          updated_at: new Date().toISOString(),
        });
      } else {
        // Create new subscription
        const result = await this.db.insert('health_metrics', {
          user_id: userId,
          metric_type: 'push_subscription',
          value: 1,
          unit: 'subscription',
          metadata: subscriptionData,
        });
        subscriptionId = result.id;
      }

      this.logger.log(`Push subscription created/updated for user ${userId}`);
      return { success: true, subscription_id: subscriptionId };
    } catch (error) {
      this.logger.error(`Failed to subscribe to push: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to subscribe to push: ${error.message}`);
    }
  }

  async unsubscribeFromPush(userId: string, unsubscribePushDto: UnsubscribePushDto): Promise<{ success: boolean }> {
    try {
      const subscription = await this.db.findOne('health_metrics', {
        user_id: userId,
        metric_type: 'push_subscription',
        'metadata.endpoint': unsubscribePushDto.endpoint,
      });

      if (!subscription) {
        throw new NotFoundException('Push subscription not found');
      }

      // Disable the subscription instead of deleting it
      await this.db.update('health_metrics', subscription.id, {
        metadata: {
          ...subscription.metadata,
          enabled: false,
          unsubscribed_at: new Date().toISOString(),
          unsubscribe_reason: unsubscribePushDto.reason || 'user_request',
        },
        updated_at: new Date().toISOString(),
      });

      this.logger.log(`Push subscription disabled for user ${userId}`);
      return { success: true };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to unsubscribe from push: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to unsubscribe from push: ${error.message}`);
    }
  }

  // =============================================
  // HELPER METHODS
  // =============================================

  private async createInAppNotification(userId: string, notificationData: Partial<CreateNotificationDto>): Promise<NotificationResponseDto> {
    const now = new Date().toISOString();
    const notification = await this.db.insert('notifications', {
      user_id: userId,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message || null,
      data: notificationData.data || {},
      action_url: notificationData.action_url || null,
      priority: notificationData.priority || NotificationPriority.NORMAL,
      expires_at: notificationData.expires_at || null,
      is_read: false,
      is_archived: false,
      created_at: now,
      updated_at: now,
    });

    return this.formatNotification(notification);
  }

  private async sendPushNotification(userId: string, notificationData: CreateNotificationDto, config?: Record<string, any>): Promise<void> {
    try {
      // Get user preferences for sound setting
      const preferences = await this.getNotificationPreferences(userId);
      const soundEnabled = preferences.metadata?.sound ?? true;

      // Try to send web push notification (wrap in try-catch to not block FCM)
      try {
        // Get user's active push subscriptions (for web)
        const subscriptions = await this.db.findMany('health_metrics', {
          user_id: userId,
          metric_type: 'push_subscription',
          'metadata.enabled': true,
        });

        const subscriptionsData = Array.isArray(subscriptions.data) ? subscriptions.data : (Array.isArray(subscriptions) ? subscriptions : []);

        // Send push notification to web via database (existing code - DO NOT CHANGE)
        if (subscriptionsData.length > 0) {
          const pushData = {
            title: notificationData.title,
            body: notificationData.message || '',
            data: {
              ...notificationData.data,
              action_url: notificationData.action_url,
              type: notificationData.type,
            },
            ...config,
          };

          await /* TODO: use Firebase directly */ this.db.sendPushNotification(userId, pushData.title, pushData.body, pushData.data);
          this.logger.log(`✅ Web push notification sent to user ${userId}`);
        }
      } catch (webPushError) {
        this.logger.warn(`⚠️ Web push notification failed (table may not exist), continuing with FCM: ${webPushError.message}`);
      }

      // NEW: Send FCM notification to mobile devices (Flutter app)
      await this.sendFcmToUser(userId, {
        title: notificationData.title,
        body: notificationData.message || '',
        data: {
          ...notificationData.data,
          action_url: notificationData.action_url,
          type: notificationData.type,
          sound_enabled: soundEnabled.toString(), // Include sound preference (FCM requires string values)
        },
      });

    } catch (error) {
      this.logger.error(`Failed to send push notification: ${error.message}`, error.stack);
      // Don't throw error here as it shouldn't block the main notification flow
    }
  }

  private async sendEmailNotification(userId: string, notificationData: CreateNotificationDto, config?: Record<string, any>): Promise<void> {
    try {
      // Get user email from auth system
      const user = await this.db.getUserById(userId);
      
      if (!user?.email) {
        this.logger.warn(`No email found for user ${userId}`);
        return;
      }

      const emailContent = this.buildEmailContent(notificationData, config);
      
      await /* TODO: use EmailService */ this.db.sendEmail(
        user.email,
        notificationData.title,
        emailContent.html,
        emailContent.text
      );

      this.logger.log(`Email notification sent to user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to send email notification: ${error.message}`, error.stack);
      // Don't throw error here as it shouldn't block the main notification flow
    }
  }

  private async emitRealtimeNotification(userId: string, notification: NotificationResponseDto): Promise<void> {
    try {
      // Emit via NotificationsGateway which uses Socket.IO for real-time delivery
      await this.notificationsGateway.emitNotificationToUser(userId, notification);

      this.logger.log(`Real-time notification emitted for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to emit real-time notification: ${error.message}`, error.stack);
      // Don't throw error here as it shouldn't block the main notification flow
    }
  }

  // Check if in-app notification should be created (saved to database)
  private async shouldCreateInAppNotification(
    userId: string,
    notificationData: CreateNotificationDto,
    preferences: NotificationPreferences
  ): Promise<boolean> {
    try {
      this.logger.debug(`[InApp Check] User: ${userId}, Type: ${notificationData.type}, Title: ${notificationData.title}`);

      // Check Do Not Disturb mode first
      if (preferences.metadata?.doNotDisturb) {
        if (notificationData.priority !== NotificationPriority.URGENT) {
          this.logger.warn(`❌ In-app notification blocked: Do Not Disturb is enabled for user ${userId}`);
          return false;
        }
      }

      // Check global in-app preferences
      if (!preferences.global.in_app) {
        this.logger.warn(`❌ In-app notification blocked: In-app notifications disabled globally for user ${userId}`);
        return false;
      }

      // Check type-specific in-app preferences
      const notifType = notificationData.type.toLowerCase();
      const typePrefs = preferences.types[notifType] || preferences.types[notificationData.type];

      if (typePrefs && !typePrefs.in_app) {
        this.logger.warn(`❌ In-app notification blocked: ${notificationData.type} in-app disabled for user ${userId}`);
        return false;
      }

      // Check message-specific preferences
      if (notificationData.type === NotificationType.MESSAGES) {
        const notifData = notificationData.data || {};
        const isDirectMessage = notifData.isDirect || notifData.isDirectMessage;
        const isChannelMessage = !isDirectMessage;

        const messagesPrefs = preferences.types['messages'];
        if (messagesPrefs && !messagesPrefs.in_app) {
          this.logger.warn(`❌ In-app notification blocked: messages category disabled for user ${userId}`);
          return false;
        }

        if (isDirectMessage && !preferences.metadata?.directMessages) {
          this.logger.warn(`❌ In-app notification blocked: Direct messages disabled for user ${userId}`);
          return false;
        }

        if (isChannelMessage && !preferences.metadata?.channelMessages) {
          this.logger.warn(`❌ In-app notification blocked: Channel messages disabled for user ${userId}`);
          return false;
        }
      }

      // Check quiet hours (blocks in-app notifications too)
      if (preferences.quiet_hours) {
        this.logger.log(`[InApp Check] Checking quiet hours for user ${userId}...`);
        const inQuietHours = this.isInQuietHours(preferences.quiet_hours);

        if (inQuietHours) {
          if (notificationData.priority !== NotificationPriority.URGENT) {
            this.logger.warn(`❌ In-app notification blocked: Quiet hours active for user ${userId}`);
            return false;
          } else {
            this.logger.log(`[InApp Check] Quiet hours active but notification is URGENT - allowing`);
          }
        }
      }

      // Check daily limit
      const todayCount = await this.getTodayNotificationCount(userId);
      if (todayCount >= preferences.daily_limit) {
        if (notificationData.priority !== NotificationPriority.URGENT) {
          this.logger.warn(`❌ In-app notification blocked: Daily limit reached for user ${userId}`);
          return false;
        }
      }

      this.logger.log(`✅ In-app notification allowed for user ${userId}: ${notificationData.type}`);
      return true;
    } catch (error) {
      this.logger.error(`Error checking in-app notification preferences: ${error.message}`, error.stack);
      return true; // Default to allow if there's an error
    }
  }

  // Check if push/desktop notification should be sent (real-time alerts)
  private async shouldSendPushNotification(
    userId: string,
    notificationData: CreateNotificationDto,
    preferences: NotificationPreferences
  ): Promise<boolean> {
    try {
      this.logger.debug(`[Push Check] User: ${userId}, Type: ${notificationData.type}, Title: ${notificationData.title}`);

      // Check Do Not Disturb mode first
      if (preferences.metadata?.doNotDisturb) {
        if (notificationData.priority !== NotificationPriority.URGENT) {
          this.logger.warn(`❌ Push notification blocked: Do Not Disturb is enabled for user ${userId}`);
          return false;
        }
      }

      // Check global push preferences
      if (!preferences.global.push) {
        this.logger.debug(`⏭️ Push notification skipped: Push notifications disabled globally for user ${userId}`);
        return false;
      }

      // Check type-specific push preferences
      const notifType = notificationData.type.toLowerCase();
      const typePrefs = preferences.types[notifType] || preferences.types[notificationData.type];

      if (typePrefs && !typePrefs.push) {
        this.logger.debug(`⏭️ Push notification skipped: ${notificationData.type} push disabled for user ${userId}`);
        return false;
      }

      // Check message-specific preferences
      if (notificationData.type === NotificationType.MESSAGES) {
        const notifData = notificationData.data || {};
        const isDirectMessage = notifData.isDirect || notifData.isDirectMessage;
        const isChannelMessage = !isDirectMessage;

        const messagesPrefs = preferences.types['messages'];
        if (messagesPrefs && !messagesPrefs.push) {
          this.logger.debug(`⏭️ Push notification skipped: messages push disabled for user ${userId}`);
          return false;
        }

        if (isDirectMessage && !preferences.metadata?.directMessages) {
          this.logger.debug(`⏭️ Push notification skipped: Direct messages disabled for user ${userId}`);
          return false;
        }

        if (isChannelMessage && !preferences.metadata?.channelMessages) {
          this.logger.debug(`⏭️ Push notification skipped: Channel messages disabled for user ${userId}`);
          return false;
        }
      }

      // Check quiet hours (blocks push but allows in-app)
      if (preferences.quiet_hours) {
        this.logger.log(`[Push Check] Checking quiet hours for user ${userId}...`);
        const inQuietHours = this.isInQuietHours(preferences.quiet_hours);

        if (inQuietHours) {
          if (notificationData.priority !== NotificationPriority.URGENT) {
            this.logger.warn(`⏭️ Push notification skipped: Quiet hours active for user ${userId}`);
            return false;
          } else {
            this.logger.log(`[Push Check] Quiet hours active but notification is URGENT - allowing`);
          }
        }
      } else {
        this.logger.debug(`[Push Check] No quiet hours configured for user ${userId}`);
      }

      this.logger.log(`✅ Push notification allowed for user ${userId}: ${notificationData.type}`);
      return true;
    } catch (error) {
      this.logger.error(`Error checking push notification preferences: ${error.message}`, error.stack);
      return false; // Default to not send push if there's an error
    }
  }

  private async getUnreadCount(userId: string): Promise<number> {
    try {
      const unreadNotifications = await this.db.findMany('notifications', {
        user_id: userId,
        is_read: false,
        is_archived: false,
      });
      const unreadData = Array.isArray(unreadNotifications.data) ? unreadNotifications.data : (Array.isArray(unreadNotifications) ? unreadNotifications : []);
      // Filter out scheduled notifications that haven't been sent yet
      const visibleUnread = unreadData.filter(n => {
        if (n.is_scheduled === true) {
          return n.is_sent === true;
        }
        return true;
      });
      return visibleUnread.length;
    } catch (error) {
      this.logger.error(`Failed to get unread count: ${error.message}`, error.stack);
      return 0;
    }
  }

  private async getTodayNotificationCount(userId: string): Promise<number> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Use SDK query builder for date comparison
      const query = this.db.table('notifications')
        .where('user_id', userId)
        .gte('created_at', today);
      
      const result = await query.execute();
      const notifications = result.data;
      
      return notifications.length;
    } catch (error) {
      this.logger.error(`Failed to get today's notification count: ${error.message}`, error.stack);
      return 0;
    }
  }

  private isInQuietHours(quietHours: NotificationPreferences['quiet_hours']): boolean {
    if (!quietHours) return false;

    try {
      // Get current time in user's timezone
      const userTimezone = quietHours.timezone || 'UTC';
      const now = new Date();

      // Convert to user's timezone using Intl API
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: userTimezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        weekday: 'long'
      });

      const parts = formatter.formatToParts(now);
      const hour = parts.find(p => p.type === 'hour')?.value || '00';
      const minute = parts.find(p => p.type === 'minute')?.value || '00';
      const weekday = parts.find(p => p.type === 'weekday')?.value || '';

      const currentTime = `${hour}:${minute}`; // HH:MM format in user's timezone
      const currentDay = weekday.toLowerCase();

      this.logger.log(`[Quiet Hours Check] User timezone: ${userTimezone}, Current time: ${currentTime}, Day: ${currentDay}, Quiet hours: ${quietHours.start} - ${quietHours.end}`);

      // Check if current day is in quiet hours days
      if (!quietHours.days.includes(currentDay)) {
        this.logger.debug(`[Quiet Hours Check] Not in quiet hours - today (${currentDay}) not in configured days`);
        return false;
      }

      // Time comparison in HH:MM format
      const isInRange = currentTime >= quietHours.start && currentTime <= quietHours.end;

      if (isInRange) {
        this.logger.warn(`[Quiet Hours Check] ⏰ IN QUIET HOURS - Current: ${currentTime}, Range: ${quietHours.start}-${quietHours.end}`);
      } else {
        this.logger.log(`[Quiet Hours Check] Not in quiet hours - Current: ${currentTime}, Range: ${quietHours.start}-${quietHours.end}`);
      }

      return isInRange;
    } catch (error) {
      this.logger.error(`Error checking quiet hours: ${error.message}`, error.stack);
      return false;
    }
  }

  private buildEmailContent(notificationData: CreateNotificationDto, config?: Record<string, any>): { html: string; text: string } {
    const text = `${notificationData.title}${notificationData.message ? '\n\n' + notificationData.message : ''}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${notificationData.title}</h2>
        ${notificationData.message ? `<p style="color: #666;">${notificationData.message}</p>` : ''}
        ${notificationData.action_url ? `<a href="${notificationData.action_url}" style="display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Details</a>` : ''}
      </div>
    `;

    return { html, text };
  }

  private getDefaultPreferences(userId: string): NotificationPreferences {
    const defaultChannelPrefs = {
      push: true,
      email: false,
      in_app: true,
    };

    return {
      user_id: userId,
      global: defaultChannelPrefs,
      types: Object.values(NotificationType).reduce((acc, type) => {
        acc[type] = defaultChannelPrefs;
        return acc;
      }, {} as Record<string, { push: boolean; email: boolean; in_app: boolean }>),
      daily_limit: 50,
      grouping: {
        group_similar: true,
        group_by_type: true,
        max_group_size: 5,
      },
      language: 'en',
      metadata: {},
    };
  }

  private formatNotification(notification: any): NotificationResponseDto {
    return {
      id: notification.id,
      user_id: notification.user_id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data || {},
      is_read: notification.is_read,
      is_archived: notification.is_archived,
      action_url: notification.action_url,
      priority: notification.priority,
      expires_at: notification.expires_at,
      read_at: notification.read_at,
      created_at: notification.created_at,
    };
  }

  // =============================================
  // FCM TOKEN MANAGEMENT (NEW - FOR FLUTTER APP)
  // =============================================

  /**
   * Register FCM token for mobile device (called on Flutter app login)
   */
  async registerFcmToken(userId: string, registerDto: RegisterFcmTokenDto): Promise<FcmTokenResponseDto> {
    try {
      this.logger.log(`📱 Registering FCM token for user ${userId}, platform: ${registerDto.platform}`);

      // Check if token already exists
      const existingToken = await this.db.findOne('device_tokens', {
        fcm_token: registerDto.fcm_token,
      });

      const now = new Date().toISOString();

      if (existingToken) {
        // Update existing token
        await this.db.update('device_tokens', existingToken.id, {
          user_id: userId,
          platform: registerDto.platform,
          device_name: registerDto.device_name || null,
          device_id: registerDto.device_id || null,
          app_version: registerDto.app_version || null,
          is_active: true,
          last_used_at: now,
          updated_at: now,
        });

        this.logger.log(`✅ FCM token updated for user ${userId}`);
        return {
          success: true,
          token_id: existingToken.id,
          message: 'FCM token updated successfully',
        };
      }

      // Create new token
      const newToken = await this.db.insert('device_tokens', {
        user_id: userId,
        fcm_token: registerDto.fcm_token,
        platform: registerDto.platform,
        device_name: registerDto.device_name || null,
        device_id: registerDto.device_id || null,
        app_version: registerDto.app_version || null,
        is_active: true,
        last_used_at: now,
        created_at: now,
        updated_at: now,
      });

      this.logger.log(`✅ FCM token registered for user ${userId}`);
      return {
        success: true,
        token_id: newToken.id,
        message: 'FCM token registered successfully',
      };
    } catch (error) {
      this.logger.error(`❌ Failed to register FCM token: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to register FCM token: ${error.message}`);
    }
  }

  /**
   * Unregister FCM token (called on Flutter app logout)
   */
  async unregisterFcmToken(userId: string, unregisterDto: UnregisterFcmTokenDto): Promise<FcmTokenResponseDto> {
    try {
      this.logger.log(`📱 Unregistering FCM token for user ${userId}`);

      const token = await this.db.findOne('device_tokens', {
        user_id: userId,
        fcm_token: unregisterDto.fcm_token,
      });

      if (!token) {
        this.logger.warn(`⚠️ FCM token not found for user ${userId}`);
        return {
          success: true,
          message: 'FCM token not found (already unregistered)',
        };
      }

      // Mark as inactive instead of deleting
      await this.db.update('device_tokens', token.id, {
        is_active: false,
        updated_at: new Date().toISOString(),
      });

      this.logger.log(`✅ FCM token unregistered for user ${userId}`);
      return {
        success: true,
        message: 'FCM token unregistered successfully',
      };
    } catch (error) {
      this.logger.error(`❌ Failed to unregister FCM token: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to unregister FCM token: ${error.message}`);
    }
  }

  /**
   * Send FCM notification to a user's mobile devices
   */
  private async sendFcmToUser(
    userId: string,
    notification: {
      title: string;
      body: string;
      data?: Record<string, any>;
    },
  ): Promise<void> {
    try {
      // Check if Firebase is initialized
      if (!this.firebaseService.isInitialized()) {
        this.logger.debug('⏭️ Firebase not initialized, skipping FCM notification');
        return;
      }

      // Get user's active FCM tokens
      const tokensResult = await this.db.findMany('device_tokens', {
        user_id: userId,
        is_active: true,
      });

      const tokens = Array.isArray(tokensResult.data)
        ? tokensResult.data
        : Array.isArray(tokensResult)
        ? tokensResult
        : [];

      if (tokens.length === 0) {
        this.logger.debug(`⏭️ No active FCM tokens found for user ${userId}`);
        return;
      }

      this.logger.log(`📱 Sending FCM notification to ${tokens.length} device(s) for user ${userId}`);

      // Convert data to string format (FCM requires string values)
      const stringData: Record<string, string> = {};
      if (notification.data) {
        Object.keys(notification.data).forEach((key) => {
          const value = notification.data![key];
          stringData[key] = typeof value === 'string' ? value : JSON.stringify(value);
        });
      }

      this.logger.debug(`🔍 FCM Data Payload: ${JSON.stringify(stringData, null, 2)}`);

      // Send to all tokens
      const fcmTokens = tokens.map((t) => t.fcm_token);
      const result = await this.firebaseService.sendToMultipleTokens(
        fcmTokens,
        {
          title: notification.title,
          body: notification.body,
        },
        stringData,
      );

      this.logger.log(
        `✅ FCM sent to user ${userId}: ${result.successCount} succeeded, ${result.failureCount} failed`,
      );

      // Clean up invalid tokens
      if (result.invalidTokens.length > 0) {
        this.logger.warn(`⚠️ Cleaning up ${result.invalidTokens.length} invalid FCM tokens`);
        await this.cleanupInvalidTokens(result.invalidTokens);
      }
    } catch (error) {
      this.logger.error(`❌ Failed to send FCM notification: ${error.message}`, error.stack);
      // Don't throw error here as it shouldn't block the main notification flow
    }
  }

  /**
   * Clean up invalid FCM tokens
   */
  private async cleanupInvalidTokens(invalidTokens: string[]): Promise<void> {
    try {
      for (const token of invalidTokens) {
        const tokenRecord = await this.db.findOne('device_tokens', {
          fcm_token: token,
        });

        if (tokenRecord) {
          await this.db.update('device_tokens', tokenRecord.id, {
            is_active: false,
            updated_at: new Date().toISOString(),
          });
          this.logger.log(`🗑️ Cleaned up invalid FCM token: ${tokenRecord.id}`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to cleanup invalid tokens: ${error.message}`, error.stack);
    }
  }

  // =============================================
  // CALL NOTIFICATIONS (DATA-ONLY FCM)
  // =============================================

  /**
   * Send incoming call notification using data-only FCM message
   * This allows the Flutter app to show custom full-screen call UI
   */
  async sendIncomingCallNotification(
    userIds: string[],
    callData: {
      call_id: string;
      call_type: 'audio' | 'video';
      is_group_call: boolean;
      caller_user_id: string;
      caller_name: string;
      caller_avatar?: string;
      workspace_id: string;
    },
  ): Promise<void> {
    try {
      this.logger.log(`📞 [NotificationsService] Sending incoming call notification to ${userIds.length} users`);

      // Check if Firebase is initialized
      if (!this.firebaseService.isInitialized()) {
        this.logger.debug('⏭️ Firebase not initialized, skipping call notification');
        return;
      }

      // Collect all FCM tokens for the users
      const allTokens: string[] = [];

      for (const userId of userIds) {
        const tokensResult = await this.db.findMany('device_tokens', {
          user_id: userId,
          is_active: true,
        });

        const tokens = Array.isArray(tokensResult.data)
          ? tokensResult.data
          : Array.isArray(tokensResult)
          ? tokensResult
          : [];

        allTokens.push(...tokens.map((t) => t.fcm_token));
      }

      if (allTokens.length === 0) {
        this.logger.debug(`⏭️ No active FCM tokens found for incoming call`);
        return;
      }

      this.logger.log(`📱 Sending data-only FCM to ${allTokens.length} device(s) for incoming call`);

      // Prepare data-only payload (all values must be strings)
      const dataPayload: Record<string, string> = {
        type: 'incoming_call',
        call_id: callData.call_id,
        call_type: callData.call_type,
        is_group_call: String(callData.is_group_call),
        caller_user_id: callData.caller_user_id,
        caller_name: callData.caller_name,
        caller_avatar: callData.caller_avatar || '',
        workspace_id: callData.workspace_id,
        timestamp: new Date().toISOString(),
      };

      this.logger.debug(`🔍 Call FCM Data Payload: ${JSON.stringify(dataPayload, null, 2)}`);

      // Send data-only FCM message
      const result = await this.firebaseService.sendDataOnlyToMultipleTokens(
        allTokens,
        dataPayload,
      );

      this.logger.log(
        `✅ Incoming call FCM sent: ${result.successCount} succeeded, ${result.failureCount} failed`,
      );

      // Clean up invalid tokens
      if (result.invalidTokens.length > 0) {
        this.logger.warn(`⚠️ Cleaning up ${result.invalidTokens.length} invalid FCM tokens`);
        await this.cleanupInvalidTokens(result.invalidTokens);
      }
    } catch (error) {
      this.logger.error(`❌ Failed to send incoming call notification: ${error.message}`, error.stack);
      // Don't throw error here as it shouldn't block the main flow
    }
  }
}