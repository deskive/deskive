import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';
import { ChatService } from '../chat/chat.service';

@Injectable()
export class EventBotReminderService implements OnModuleInit {
  private readonly logger = new Logger(EventBotReminderService.name);
  private isProcessing = false;

  constructor(
    private readonly db: DatabaseService,
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
  ) {}

  async onModuleInit() {
    this.logger.log('Event Bot Reminder Service initialized');
  }

  /**
   * Cron job that runs every minute to check for upcoming events with bot assignments
   * and sends reminders if the event is approaching
   */
  @Cron(CronExpression.EVERY_MINUTE, {
    name: 'process-event-bot-reminders',
    timeZone: 'UTC',
  })
  async processEventBotReminders() {
    if (this.isProcessing) {
      this.logger.debug('Previous job still running, skipping...');
      return;
    }

    try {
      this.isProcessing = true;
      const now = new Date();

      // Get events that are happening in the next 2 hours
      const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

      // Get upcoming calendar events
      const eventsResult = await this.db
        .table('calendar_events')
        .select('*')
        .where('start_time', '>', now.toISOString())
        .where('start_time', '<=', twoHoursLater.toISOString())
        .where('status', '!=', 'cancelled')
        .execute();

      const events = Array.isArray(eventsResult) ? eventsResult : eventsResult.data || [];

      if (events.length === 0) {
        return;
      }

      // Get bot assignments for these events
      const eventIds = events.map((e) => e.id);
      const assignmentsResult = await this.db
        .table('event_bot_assignments')
        .select('*')
        .where('is_active', '=', true)
        .execute();

      const allAssignments = Array.isArray(assignmentsResult)
        ? assignmentsResult
        : assignmentsResult.data || [];
      const assignments = allAssignments.filter((a) => eventIds.includes(a.event_id));

      if (assignments.length === 0) {
        return;
      }

      // Get bot details
      const botIds = [...new Set(assignments.map((a) => a.bot_id))];
      const botsResult = await this.db.table('bots').select('*').execute();

      const allBots = Array.isArray(botsResult) ? botsResult : botsResult.data || [];
      const bots = allBots.filter((b) => botIds.includes(b.id));
      const botMap = new Map(bots.map((b) => [b.id, b]));

      // Merge data
      const upcomingEvents = events
        .map((event) => {
          const assignment = assignments.find((a) => a.event_id === event.id);
          if (!assignment) return null;

          const bot: any = botMap.get(assignment.bot_id);
          if (!bot) return null;

          return {
            ...event,
            bot_id: assignment.bot_id,
            bot_owner_id: assignment.user_id,
            bot_settings: assignment.settings,
            bot_name: bot.name,
            bot_display_name: bot.display_name,
          };
        })
        .filter((e) => e !== null);

      this.logger.debug(`Found ${upcomingEvents.length} upcoming events with bot assignments`);

      for (const event of upcomingEvents) {
        await this.processEventReminders(event, now);
      }
    } catch (error) {
      this.logger.error(`Error processing event bot reminders: ${error.message}`, error.stack);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process reminders for a single event
   */
  private async processEventReminders(event: any, now: Date) {
    try {
      const startTime = new Date(event.start_time);
      const minutesUntilEvent = Math.floor((startTime.getTime() - now.getTime()) / (1000 * 60));

      // Get reminder settings from event or bot settings
      const reminders = event.reminders || [];
      const botSettings = event.bot_settings || {};
      const reminderIntervals = botSettings.reminder_intervals || [15, 60]; // Default: 15 min and 1 hour

      // Merge reminders from event and bot settings
      const allReminders = [...new Set([...reminders, ...reminderIntervals])];

      for (const reminderMinutes of allReminders) {
        // Check if we should send this reminder now (within a 2-minute window)
        const shouldSendNow =
          minutesUntilEvent <= reminderMinutes && minutesUntilEvent >= reminderMinutes - 2;

        if (shouldSendNow) {
          // Check if reminder was already sent
          const alreadySent = await this.hasReminderBeenSent(
            event.id,
            event.bot_id,
            reminderMinutes,
          );

          if (!alreadySent) {
            await this.sendBotReminder(event, reminderMinutes);
            await this.markReminderAsSent(event.id, event.bot_id, reminderMinutes);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error processing reminders for event ${event.id}: ${error.message}`);
    }
  }

  /**
   * Find or create a DM conversation between bot and user
   */
  private async getOrCreateBotConversation(
    workspaceId: string,
    botId: string,
    userId: string,
  ): Promise<string> {
    const botUserId = `bot:${botId}`;
    const participants = [botUserId, userId].sort();

    // Try to find existing conversation
    const conversationsResult = await this.db
      .table('conversations')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .execute();

    const conversations = Array.isArray(conversationsResult)
      ? conversationsResult
      : conversationsResult.data || [];

    for (const conv of conversations) {
      let convParticipants: string[];
      try {
        convParticipants =
          typeof conv.participants === 'string' ? JSON.parse(conv.participants) : conv.participants;
      } catch {
        continue;
      }

      const sortedConvParticipants = [...convParticipants].sort();
      if (JSON.stringify(sortedConvParticipants) === JSON.stringify(participants)) {
        return conv.id;
      }
    }

    // Create new conversation
    const conversation = await this.db.insert('conversations', {
      workspace_id: workspaceId,
      created_by: userId,
      participants: JSON.stringify(participants),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Add conversation members
    for (const participantId of participants) {
      await this.db.insert('conversation_members', {
        conversation_id: conversation.id,
        user_id: participantId,
        joined_at: new Date().toISOString(),
      });
    }

    return conversation.id;
  }

  /**
   * Send a reminder message via the bot
   */
  private async sendBotReminder(event: any, minutesBeforeEvent: number) {
    try {
      const botId = event.bot_id;
      const startTime = new Date(event.start_time);
      const endTime = new Date(event.end_time);

      // Format time
      const timeString = startTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      const dateString = startTime.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });

      // Build reminder message
      let message = '';
      if (minutesBeforeEvent < 60) {
        message = `🔔 Reminder: "${event.title}" is starting in ${minutesBeforeEvent} minutes!\n\n`;
      } else {
        const hours = Math.floor(minutesBeforeEvent / 60);
        message = `🔔 Reminder: "${event.title}" is starting in ${hours} ${hours === 1 ? 'hour' : 'hours'}!\n\n`;
      }

      message += `📅 **When:** ${dateString} at ${timeString}\n`;
      if (event.location) {
        message += `📍 **Location:** ${event.location}\n`;
      }
      if (event.description) {
        message += `📝 **Description:** ${event.description}\n`;
      }

      // Get attendees
      const attendees = event.attendees || [];
      if (attendees.length > 0) {
        message += `👥 **Attendees:** ${attendees.join(', ')}\n`;
      }

      message += `\nNeed to make changes? Just mention me and tell me what to update!`;

      // Get or create DM conversation
      const conversationId = await this.getOrCreateBotConversation(
        event.workspace_id,
        botId,
        event.bot_owner_id,
      );

      // Send reminder to the bot owner via DM
      await this.chatService.sendBotDirectMessage({
        content: message,
        userId: event.bot_owner_id,
        workspaceId: event.workspace_id,
        conversationId: conversationId,
        metadata: {
          botId: botId,
          botName: event.bot_name,
          botDisplayName: event.bot_display_name,
        },
      });

      this.logger.log(
        `Sent ${minutesBeforeEvent}-minute reminder for event "${event.title}" (${event.id})`,
      );
    } catch (error) {
      this.logger.error(`Error sending bot reminder for event ${event.id}: ${error.message}`);
    }
  }

  /**
   * Check if a reminder has already been sent
   */
  private async hasReminderBeenSent(
    eventId: string,
    botId: string,
    reminderMinutes: number,
  ): Promise<boolean> {
    try {
      const result = await this.db
        .table('event_reminders')
        .select('*')
        .where('event_id', '=', eventId)
        .where('reminder_time', '=', reminderMinutes)
        .where('is_sent', '=', true)
        .execute();

      const reminders = Array.isArray(result) ? result : result.data || [];
      return reminders.length > 0;
    } catch (error) {
      // If there's an error checking, assume not sent to avoid missing reminders
      return false;
    }
  }

  /**
   * Mark a reminder as sent
   */
  private async markReminderAsSent(eventId: string, botId: string, reminderMinutes: number) {
    try {
      // Try to find existing reminder entry
      const existingResult = await this.db
        .table('event_reminders')
        .select('*')
        .where('event_id', '=', eventId)
        .where('reminder_time', '=', reminderMinutes)
        .execute();

      const existingReminders = Array.isArray(existingResult)
        ? existingResult
        : existingResult.data || [];

      if (existingReminders.length > 0) {
        // Update existing
        await this.db
          .table('event_reminders')
          .where('id', '=', existingReminders[0].id)
          .update({
            is_sent: true,
            sent_at: new Date().toISOString(),
          })
          .execute();
      } else {
        // Create new reminder record
        await this.db
          .table('event_reminders')
          .insert({
            event_id: eventId,
            reminder_time: reminderMinutes,
            is_sent: true,
            sent_at: new Date().toISOString(),
            scheduled_for: new Date().toISOString(), // Already sent
            created_at: new Date().toISOString(),
          })
          .execute();
      }
    } catch (error) {
      this.logger.error(`Error marking reminder as sent: ${error.message}`);
    }
  }

  /**
   * Send an event update notification via bot
   */
  async sendEventUpdateNotification(
    eventId: string,
    updateType: 'time_changed' | 'location_changed' | 'cancelled' | 'details_changed',
    oldValue?: any,
    newValue?: any,
  ) {
    try {
      // Get event
      const eventResult = await this.db
        .table('calendar_events')
        .select('*')
        .where('id', '=', eventId)
        .execute();

      const events = Array.isArray(eventResult) ? eventResult : eventResult.data || [];
      if (events.length === 0) {
        return; // Event not found
      }

      const event = events[0];

      // Get bot assignment
      const assignmentResult = await this.db
        .table('event_bot_assignments')
        .select('*')
        .where('event_id', '=', eventId)
        .where('is_active', '=', true)
        .execute();

      const assignments = Array.isArray(assignmentResult)
        ? assignmentResult
        : assignmentResult.data || [];
      if (assignments.length === 0) {
        return; // No bot assigned to this event
      }

      const assignment = assignments[0];

      // Get bot details
      const botResult = await this.db
        .table('bots')
        .select('*')
        .where('id', '=', assignment.bot_id)
        .execute();

      const bots = Array.isArray(botResult) ? botResult : botResult.data || [];
      if (bots.length === 0) {
        return; // Bot not found
      }

      const bot = bots[0];
      const botSettings = assignment.settings || {};

      // Check if bot should send update notifications
      if (botSettings.notify_on_updates === false) {
        return;
      }

      // Build update message
      let message = '';
      switch (updateType) {
        case 'time_changed':
          message = `⏰ **Event Time Changed**\n\n`;
          message += `Event: "${event.title}"\n`;
          message += `Old time: ${new Date(oldValue).toLocaleString()}\n`;
          message += `New time: ${new Date(newValue).toLocaleString()}\n`;
          break;
        case 'location_changed':
          message = `📍 **Event Location Changed**\n\n`;
          message += `Event: "${event.title}"\n`;
          message += `Old location: ${oldValue || 'Not specified'}\n`;
          message += `New location: ${newValue || 'Not specified'}\n`;
          break;
        case 'cancelled':
          message = `❌ **Event Cancelled**\n\n`;
          message += `The event "${event.title}" has been cancelled.\n`;
          break;
        case 'details_changed':
          message = `✏️ **Event Details Updated**\n\n`;
          message += `The event "${event.title}" has been updated.\n`;
          break;
      }

      // Get or create DM conversation
      const conversationId = await this.getOrCreateBotConversation(
        event.workspace_id,
        assignment.bot_id,
        assignment.user_id,
      );

      // Send update to bot owner via DM
      await this.chatService.sendBotDirectMessage({
        content: message,
        userId: assignment.user_id,
        workspaceId: event.workspace_id,
        conversationId: conversationId,
        metadata: {
          botId: assignment.bot_id,
          botName: bot.name,
          botDisplayName: bot.display_name,
        },
      });

      this.logger.log(`Sent ${updateType} notification for event "${event.title}" (${eventId})`);
    } catch (error) {
      this.logger.error(`Error sending event update notification: ${error.message}`);
    }
  }
}
