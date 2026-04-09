import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EventBotAssignmentsService } from '../calendar/event-bot-assignments.service';

@Injectable()
export class CalendarBotContextService {
  private readonly logger = new Logger(CalendarBotContextService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly eventBotAssignmentsService: EventBotAssignmentsService,
  ) {}

  /**
   * Check if a bot ID is a calendar event bot and get context
   */
  async getCalendarBotContext(botId: string, userId: string, workspaceId: string): Promise<any> {
    try {
      // Remove "bot:" prefix if present
      const cleanBotId = botId.startsWith('bot:') ? botId.substring(4) : botId;

      // Check if this bot has any event assignments
      const assignedEvents = await this.eventBotAssignmentsService.getEventsForBot(
        workspaceId,
        cleanBotId,
      );

      if (!assignedEvents || assignedEvents.length === 0) {
        return null; // Not a calendar bot or no events assigned
      }

      // Filter events for this specific user (bot owner)
      const userEvents = assignedEvents.filter(
        (assignment) => assignment.user_id === userId,
      );

      if (userEvents.length === 0) {
        return null;
      }

      // Build context about assigned events
      const now = new Date();
      const upcomingEvents = userEvents.filter(
        (e) => new Date(e.start_time) > now && e.event_status !== 'cancelled',
      );
      const pastEvents = userEvents.filter(
        (e) => new Date(e.start_time) <= now || e.event_status === 'cancelled',
      );

      const context = {
        isCalendarBot: true,
        botId: cleanBotId,
        assignedEvents: userEvents.map((e) => ({
          eventId: e.event_id,
          title: e.event_title,
          description: e.event_description,
          startTime: e.start_time,
          endTime: e.end_time,
          location: e.location,
          status: e.event_status,
          settings: e.settings,
        })),
        upcomingEventsCount: upcomingEvents.length,
        pastEventsCount: pastEvents.length,
        contextMessage: this.buildContextMessage(upcomingEvents, pastEvents),
      };

      this.logger.log(
        `Calendar bot context for bot ${cleanBotId}: ${userEvents.length} events assigned (${upcomingEvents.length} upcoming)`,
      );

      return context;
    } catch (error) {
      this.logger.error(`Error getting calendar bot context: ${error.message}`);
      return null;
    }
  }

  /**
   * Build a context message to prepend to the agent prompt
   */
  private buildContextMessage(upcomingEvents: any[], pastEvents: any[]): string {
    let message = 'You are a calendar event assistant bot. ';

    if (upcomingEvents.length > 0) {
      message += `You are assigned to manage ${upcomingEvents.length} upcoming event(s):\n\n`;
      upcomingEvents.forEach((event, index) => {
        const startDate = new Date(event.start_time);
        const dateStr = startDate.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
        const timeStr = startDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });

        message += `${index + 1}. **${event.event_title}**\n`;
        message += `   - Event ID: ${event.event_id}\n`;
        message += `   - When: ${dateStr} at ${timeStr}\n`;
        if (event.location) {
          message += `   - Location: ${event.location}\n`;
        }
        if (event.event_description) {
          message += `   - Description: ${event.event_description}\n`;
        }
        message += '\n';
      });

      message += '\nYou can help the user:\n';
      message += '- Update event times (reschedule)\n';
      message += '- Change event locations\n';
      message += '- Manage attendees (add/remove)\n';
      message += '- Add reminders\n';
      message += '- Cancel events\n';
      message += '- Get event details\n\n';
      message += 'When the user asks to update an event, use the appropriate tools (update_event_time, update_event_location, update_event_attendees, etc.) with the event ID from above.\n\n';
    } else if (pastEvents.length > 0) {
      message += `You were assigned to ${pastEvents.length} event(s), but they have all passed or been cancelled. `;
      message += 'Ask the user if they want to schedule a new event.\n\n';
    } else {
      message += 'You are not currently assigned to any events. ';
      message += 'Ask the user if they want to schedule a new event.\n\n';
    }

    return message;
  }

  /**
   * Enrich autopilot context with calendar bot information
   */
  async enrichContextForBot(
    botId: string,
    userId: string,
    workspaceId: string,
    existingContext: any,
  ): Promise<any> {
    const calendarBotContext = await this.getCalendarBotContext(botId, userId, workspaceId);

    if (!calendarBotContext) {
      return existingContext; // Not a calendar bot, return unchanged
    }

    return {
      ...existingContext,
      calendarBot: calendarBotContext,
      systemMessage: calendarBotContext.contextMessage + (existingContext.systemMessage || ''),
    };
  }
}
