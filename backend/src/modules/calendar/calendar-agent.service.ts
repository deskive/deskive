import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AiProviderService } from '../ai-provider/ai-provider.service';
import { CalendarService } from './calendar.service';
import {
  ConversationMemoryService,
  ConversationSearchResult,
} from '../conversation-memory/conversation-memory.service';
import { CreateEventDto, EventPriority, EventStatus, EventVisibility } from './dto/create-event.dto';

// Workspace member interface for user lookup
interface WorkspaceMember {
  user_id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  role: string;
}

export interface CalendarAgentRequest {
  prompt: string;
  workspaceId: string;
  timezone?: string; // User's timezone from frontend (e.g., 'Asia/Tokyo', 'America/New_York')
}

export interface CalendarAgentResponse {
  success: boolean;
  action:
    | 'create'
    | 'update'
    | 'delete'
    | 'batch_create'
    | 'batch_update'
    | 'batch_delete'
    | 'search'
    | 'unknown';
  message: string;
  data?: any;
  error?: string;
}

// Event details for create/update operations
interface EventDetails {
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  all_day?: boolean;
  location?: string;
  attendees?: string[];
  meeting_url?: string;
  visibility?: 'private' | 'public' | 'internal';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  status?: 'confirmed' | 'tentative' | 'cancelled';
  is_recurring?: boolean;
  recurrence_rule?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval?: number;
    daysOfWeek?: string[];
    endDate?: string;
    occurrences?: number;
  };
  reminders?: number[];
}

// Batch operation support
interface BatchCreateItem {
  details: EventDetails;
}

interface BatchUpdateItem {
  eventId: string;
  eventTitle: string;
  updates: Partial<EventDetails>;
}

interface BatchDeleteItem {
  eventId: string;
  eventTitle: string;
}

interface ParsedIntent {
  action:
    | 'create'
    | 'update'
    | 'delete'
    | 'batch_create'
    | 'batch_update'
    | 'batch_delete'
    | 'search'
    | 'unknown';

  // Single operation fields
  eventTitle?: string;
  eventId?: string;
  details?: EventDetails;
  searchQuery?: string;

  // Batch operation fields
  batch_create?: BatchCreateItem[];
  batch_update?: BatchUpdateItem[];
  batch_delete?: BatchDeleteItem[];
}

@Injectable()
export class CalendarAgentService {
  private readonly logger = new Logger(CalendarAgentService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly calendarService: CalendarService,
    private readonly conversationMemoryService: ConversationMemoryService,
  ) {}

  /**
   * Main entry point for the Calendar AI Agent
   * Receives natural language prompt and executes the appropriate action
   */
  async processCommand(
    request: CalendarAgentRequest,
    userId: string,
  ): Promise<CalendarAgentResponse> {
    const { prompt, workspaceId, timezone: requestTimezone } = request;

    this.logger.log(
      `[CalendarAgent] Processing command: "${prompt}" for workspace: ${workspaceId}`,
    );

    try {
      // Step 1: Get user's timezone (from request, user settings, or default to UTC)
      const userTimezone = await this.getUserTimezone(userId, requestTimezone);
      this.logger.log(`[CalendarAgent] Using timezone: ${userTimezone}`);

      // Step 2: Store user message in conversation memory (async, don't wait)
      this.storeUserMessage(prompt, workspaceId, userId);

      // Step 3: Search for relevant conversation history from Qdrant
      const conversationHistory = await this.getRelevantConversationHistory(
        prompt,
        workspaceId,
        userId,
      );

      this.logger.log(
        `[CalendarAgent] Found ${conversationHistory.length} relevant historical messages`,
      );

      // Step 4: Get existing events for context
      const existingEvents = await this.getExistingEvents(workspaceId, userId);

      // Step 5: Get workspace members for attendee resolution
      const workspaceMembers = await this.getWorkspaceMembers(
        workspaceId,
        userId,
      );

      // Step 6: Use AI to parse the user's intent
      const parsedIntent = await this.parseIntentWithAI(
        prompt,
        existingEvents,
        workspaceMembers,
        conversationHistory,
        userTimezone,
      );

      this.logger.log(
        `[CalendarAgent] Parsed intent: ${JSON.stringify(parsedIntent)}`,
      );

      if (parsedIntent.action === 'unknown') {
        // Store failed response in memory
        this.storeAssistantMessage(
          'I could not understand your request.',
          workspaceId,
          userId,
          'unknown',
          false,
        );

        return {
          success: false,
          action: 'unknown',
          message:
            'I could not understand your request. Please try commands like "Schedule a meeting tomorrow at 2pm" or "Create an event called Team Standup on Monday at 9am".',
          error: 'INTENT_NOT_UNDERSTOOD',
        };
      }

      // Step 6: Resolve attendee names/emails to actual emails
      if (parsedIntent.action === 'create' || parsedIntent.action === 'update') {
        if (parsedIntent.details?.attendees) {
          parsedIntent.details.attendees = this.resolveAttendeeEmails(
            parsedIntent.details.attendees,
            workspaceMembers,
          );
        }
      } else if (parsedIntent.action === 'batch_create') {
        parsedIntent.batch_create?.forEach((item) => {
          if (item.details.attendees) {
            item.details.attendees = this.resolveAttendeeEmails(
              item.details.attendees,
              workspaceMembers,
            );
          }
        });
      } else if (parsedIntent.action === 'batch_update') {
        parsedIntent.batch_update?.forEach((item) => {
          if (item.updates.attendees) {
            item.updates.attendees = this.resolveAttendeeEmails(
              item.updates.attendees,
              workspaceMembers,
            );
          }
        });
      }

      // Step 7: Execute the action
      const result = await this.executeAction(parsedIntent, workspaceId, userId);

      // Step 8: Store AI response in conversation memory
      this.storeAssistantMessage(
        result.message,
        workspaceId,
        userId,
        result.action,
        result.success,
        this.extractEventIds(result),
        this.extractEventTitles(result),
      );

      return result;
    } catch (error) {
      this.logger.error(
        `[CalendarAgent] Error processing command: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        action: 'unknown',
        message: 'An error occurred while processing your request.',
        error: error.message,
      };
    }
  }

  /**
   * Store user message in conversation memory (fire and forget)
   */
  private storeUserMessage(
    content: string,
    workspaceId: string,
    userId: string,
  ): void {
    this.conversationMemoryService
      .storeMessage({
        role: 'user',
        content,
        workspace_id: workspaceId,
        user_id: userId,
        entity_type: 'calendar',
      })
      .catch((error) => {
        this.logger.warn(
          `[CalendarAgent] Failed to store user message: ${error.message}`,
        );
      });
  }

  /**
   * Get user's timezone from request, user settings, or default to UTC
   */
  private async getUserTimezone(
    userId: string,
    requestTimezone?: string,
  ): Promise<string> {
    // Priority 1: Use timezone from request (frontend sends browser timezone)
    if (requestTimezone && this.isValidTimezone(requestTimezone)) {
      return requestTimezone;
    }

    // Priority 2: Try to get timezone from user's metadata
    try {
      const user = await this.db.getUserById(userId);
      const metadata = (user as any)?.metadata || {};
      if (metadata.timezone && this.isValidTimezone(metadata.timezone)) {
        return metadata.timezone;
      }
    } catch (error) {
      this.logger.warn(
        `[CalendarAgent] Could not fetch user timezone: ${error.message}`,
      );
    }

    // Priority 3: Try to get timezone from user_settings table
    try {
      const settingsResult = await this.db
        .table('user_settings')
        .select('timezone')
        .where('user_id', '=', userId)
        .execute();

      const settings = settingsResult.data?.[0];
      if (settings?.timezone && this.isValidTimezone(settings.timezone)) {
        return settings.timezone;
      }
    } catch (error) {
      this.logger.warn(
        `[CalendarAgent] Could not fetch user settings timezone: ${error.message}`,
      );
    }

    // Default: UTC
    return 'UTC';
  }

  /**
   * Validate if a timezone string is valid
   */
  private isValidTimezone(timezone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Store assistant message in conversation memory (fire and forget)
   */
  private storeAssistantMessage(
    content: string,
    workspaceId: string,
    userId: string,
    action: string,
    success: boolean,
    eventIds?: string[],
    eventTitles?: string[],
  ): void {
    this.conversationMemoryService
      .storeMessage({
        role: 'assistant',
        content,
        workspace_id: workspaceId,
        user_id: userId,
        action,
        success,
        project_ids: eventIds, // Reusing project_ids field for event_ids
        project_names: eventTitles, // Reusing project_names field for event_titles
        entity_type: 'calendar',
      })
      .catch((error) => {
        this.logger.warn(
          `[CalendarAgent] Failed to store assistant message: ${error.message}`,
        );
      });
  }

  /**
   * Get relevant conversation history from Qdrant
   */
  private async getRelevantConversationHistory(
    query: string,
    workspaceId: string,
    userId: string,
  ): Promise<ConversationSearchResult[]> {
    try {
      if (!this.conversationMemoryService.isReady()) {
        this.logger.warn(
          '[CalendarAgent] Conversation memory not ready, skipping history lookup',
        );
        return [];
      }

      return await this.conversationMemoryService.searchRelevantHistory(
        query,
        workspaceId,
        userId,
        10,
      );
    } catch (error) {
      this.logger.warn(
        `[CalendarAgent] Failed to get conversation history: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * Extract event IDs from operation result
   */
  private extractEventIds(result: CalendarAgentResponse): string[] {
    const ids: string[] = [];

    if (result.data?.event?.id) {
      ids.push(result.data.event.id);
    }

    if (result.data?.deletedEventId) {
      ids.push(result.data.deletedEventId);
    }

    if (result.data?.results) {
      result.data.results.forEach((r: any) => {
        if (r.event?.id) ids.push(r.event.id);
        if (r.eventId) ids.push(r.eventId);
      });
    }

    return ids;
  }

  /**
   * Extract event titles from operation result
   */
  private extractEventTitles(result: CalendarAgentResponse): string[] {
    const titles: string[] = [];

    if (result.data?.event?.title) {
      titles.push(result.data.event.title);
    }

    if (result.data?.deletedEventTitle) {
      titles.push(result.data.deletedEventTitle);
    }

    if (result.data?.results) {
      result.data.results.forEach((r: any) => {
        if (r.title) titles.push(r.title);
        if (r.event?.title) titles.push(r.event.title);
      });
    }

    return titles;
  }

  /**
   * Get existing events in the workspace for context
   */
  private async getExistingEvents(
    workspaceId: string,
    userId: string,
  ): Promise<any[]> {
    try {
      // Get events for the next 30 days for context
      const now = new Date();
      const startDate = now.toISOString();
      const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const events = await this.calendarService.getEvents(
        workspaceId,
        startDate,
        endDate,
        userId,
      );
      return events.map((e: any) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        start_time: e.start_time,
        end_time: e.end_time,
        location: e.location,
        attendees: e.attendees,
        status: e.status,
        priority: e.priority,
      }));
    } catch (error) {
      this.logger.warn(
        `[CalendarAgent] Could not fetch existing events: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * Get workspace members for attendee resolution
   */
  private async getWorkspaceMembers(
    workspaceId: string,
    _userId: string,
  ): Promise<WorkspaceMember[]> {
    try {
      const membersResult = await this.db
        .table('workspace_members')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('is_active', '=', true)
        .execute();

      const members = membersResult.data || [];
      this.logger.log(
        `[CalendarAgent] Found ${members.length} workspace members`,
      );

      const membersWithNames: WorkspaceMember[] = await Promise.all(
        members.map(async (member: any) => {
          try {
            const userProfile = await this.db.getUserById(
              member.user_id,
            );
            const metadata = (userProfile as any)?.metadata || {};

            return {
              user_id: member.user_id,
              name:
                metadata.name ||
                (userProfile as any)?.fullName ||
                (userProfile as any)?.name ||
                null,
              username:
                (userProfile as any)?.username || metadata.username || null,
              email: (userProfile as any)?.email || null,
              role: member.role,
            };
          } catch (error) {
            this.logger.warn(
              `[CalendarAgent] Could not fetch user details for ${member.user_id}: ${error.message}`,
            );
            return {
              user_id: member.user_id,
              name: null,
              username: null,
              email: null,
              role: member.role,
            };
          }
        }),
      );

      return membersWithNames;
    } catch (error) {
      this.logger.warn(
        `[CalendarAgent] Could not fetch workspace members: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * Resolve attendee names/usernames to emails
   */
  private resolveAttendeeEmails(
    attendees: string[],
    members: WorkspaceMember[],
  ): string[] {
    return attendees
      .map((attendee) => {
        // If already an email, validate it exists in members
        if (attendee.includes('@')) {
          const memberExists = members.some((m) => m.email === attendee);
          if (memberExists) {
            return attendee;
          }
          // Even if not a member, allow external emails
          return attendee;
        }

        // Try to find by name/username
        const foundEmail = this.findEmailByNameOrUsername(attendee, members);
        if (foundEmail) {
          this.logger.log(
            `[CalendarAgent] Resolved attendee "${attendee}" to email: ${foundEmail}`,
          );
          return foundEmail;
        }

        this.logger.warn(
          `[CalendarAgent] Could not resolve attendee "${attendee}" to an email`,
        );
        return null;
      })
      .filter((email): email is string => email !== null);
  }

  /**
   * Find email by name or username
   */
  private findEmailByNameOrUsername(
    searchTerm: string,
    members: WorkspaceMember[],
  ): string | null {
    const normalizedSearch = searchTerm.toLowerCase().trim();

    // Try exact match on name
    for (const member of members) {
      if (member.name?.toLowerCase() === normalizedSearch && member.email) {
        return member.email;
      }
    }

    // Try exact match on username
    for (const member of members) {
      if (member.username?.toLowerCase() === normalizedSearch && member.email) {
        return member.email;
      }
    }

    // Try partial match on name
    for (const member of members) {
      if (member.name?.toLowerCase().includes(normalizedSearch) && member.email) {
        return member.email;
      }
    }

    // Try partial match on username
    for (const member of members) {
      if (member.username?.toLowerCase().includes(normalizedSearch) && member.email) {
        return member.email;
      }
    }

    return null;
  }

  /**
   * Use database AI to parse the user's natural language intent
   */
  private async parseIntentWithAI(
    prompt: string,
    existingEvents: any[],
    workspaceMembers: WorkspaceMember[],
    conversationHistory: ConversationSearchResult[] = [],
    userTimezone: string = 'UTC',
  ): Promise<ParsedIntent> {
    const eventsList =
      existingEvents.length > 0
        ? existingEvents
            .map(
              (e) =>
                `- "${e.title}" (ID: ${e.id}, Start: ${e.start_time}, End: ${e.end_time}, Location: ${e.location || 'N/A'}, Status: ${e.status})`,
            )
            .join('\n')
        : 'No upcoming events';

    const membersList =
      workspaceMembers.length > 0
        ? workspaceMembers
            .map(
              (m) =>
                `- Name: "${m.name || 'Unknown'}", Email: "${m.email || 'N/A'}", Username: "${m.username || 'N/A'}"`,
            )
            .join('\n')
        : 'No members available';

    const conversationContext =
      this.conversationMemoryService.buildContextFromHistory(conversationHistory);

    // Get current date/time in user's timezone for context
    const now = new Date();
    const currentDateTime = now.toISOString();

    // Format current time in user's timezone for display
    let localTimeDisplay = '';
    let currentDayOfWeek = '';
    let utcOffset = '';
    try {
      localTimeDisplay = now.toLocaleString('en-US', {
        timeZone: userTimezone,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      currentDayOfWeek = now.toLocaleDateString('en-US', {
        timeZone: userTimezone,
        weekday: 'long'
      });
      // Calculate UTC offset for the timezone
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: userTimezone,
        timeZoneName: 'shortOffset'
      });
      const parts = formatter.formatToParts(now);
      const offsetPart = parts.find(p => p.type === 'timeZoneName');
      utcOffset = offsetPart?.value || '';
    } catch (e) {
      // Fallback if timezone is invalid
      localTimeDisplay = now.toLocaleString('en-US');
      currentDayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
      this.logger.warn(`[CalendarAgent] Invalid timezone "${userTimezone}", using server default`);
    }

    const aiPrompt = `You are a calendar scheduling assistant with access to conversation history. Analyze the user's command and extract their intent to create, update, delete, or search calendar events. You can handle SINGLE or BATCH operations.

IMPORTANT - USER'S TIMEZONE CONTEXT:
- User's timezone: ${userTimezone} (${utcOffset})
- Current local time for user: ${localTimeDisplay}
- Current day of week: ${currentDayOfWeek}
- Current UTC time: ${currentDateTime}

When the user says "tomorrow", "next Monday", "at 2pm", etc., interpret these times relative to their timezone (${userTimezone}).
All output times MUST be in ISO 8601 format (UTC), but calculate them correctly based on the user's local time.

For example, if user is in Asia/Tokyo (UTC+9) and says "tomorrow at 2pm":
- Calculate tomorrow's date in Tokyo time
- Convert 2pm Tokyo time to UTC (subtract 9 hours = 5am UTC)
- Output: "2024-01-16T05:00:00.000Z"

User command: "${prompt}"
${conversationContext}

Upcoming events in workspace (next 30 days):
${eventsList}

Workspace members (for adding attendees - use their EMAIL):
${membersList}

You must respond with ONLY a valid JSON object. No markdown, no code blocks, no explanation. Just the JSON:

// FOR SINGLE CREATE:
{
  "action": "create",
  "eventTitle": "event title",
  "details": {
    "title": "Event Title",
    "description": "Event description",
    "start_time": "2024-01-15T10:00:00.000Z",
    "end_time": "2024-01-15T11:00:00.000Z",
    "all_day": false,
    "location": "Conference Room A",
    "attendees": ["john@example.com", "jane@example.com"],
    "meeting_url": "https://zoom.us/...",
    "visibility": "private",
    "priority": "normal",
    "status": "confirmed",
    "is_recurring": false,
    "recurrence_rule": null,
    "reminders": [15, 60]
  }
}

// FOR SINGLE UPDATE:
{
  "action": "update",
  "eventTitle": "event name",
  "eventId": "event UUID from existing events",
  "details": { /* only fields to update */ }
}

// FOR SINGLE DELETE:
{
  "action": "delete",
  "eventTitle": "event name",
  "eventId": "event UUID from existing events"
}

// FOR BATCH CREATE:
{
  "action": "batch_create",
  "batch_create": [
    { "details": { "title": "Meeting 1", "start_time": "...", "end_time": "..." } },
    { "details": { "title": "Meeting 2", "start_time": "...", "end_time": "..." } }
  ]
}

// FOR BATCH UPDATE:
{
  "action": "batch_update",
  "batch_update": [
    { "eventId": "uuid-1", "eventTitle": "Event 1", "updates": { "priority": "high" } },
    { "eventId": "uuid-2", "eventTitle": "Event 2", "updates": { "status": "cancelled" } }
  ]
}

// FOR BATCH DELETE:
{
  "action": "batch_delete",
  "batch_delete": [
    { "eventId": "uuid-1", "eventTitle": "Event 1" },
    { "eventId": "uuid-2", "eventTitle": "Event 2" }
  ]
}

// FOR SEARCH:
{
  "action": "search",
  "searchQuery": "search terms"
}

IMPORTANT RULES:

1. DATE/TIME PARSING - CONVERT RELATIVE TO ABSOLUTE:
   - "tomorrow" -> add 1 day to current date
   - "next Monday" -> find next Monday from current date
   - "in 2 hours" -> add 2 hours to current time
   - "at 2pm" -> set time to 14:00
   - "at 9am" -> set time to 09:00
   - "for 1 hour" -> set end_time 1 hour after start_time
   - "for 30 minutes" -> set end_time 30 minutes after start_time
   - If no duration specified, default to 1 hour
   - If no time specified, default to 9:00 AM
   - ALL times must be in ISO 8601 format (e.g., "2024-01-15T10:00:00.000Z")

2. EVENT CREATION DEFAULTS:
   - title: REQUIRED - extract from user's command
   - description: "Created via AI Assistant" if not specified
   - all_day: false unless user says "all day"
   - visibility: "private" if not specified
   - priority: "normal" if not specified
   - status: "confirmed" if not specified
   - reminders: [15] (15 minutes before) if not specified

3. ATTENDEES:
   - Find people from workspace members list
   - Use their EMAIL address, NOT their name
   - If user says "with John", find John's email from members list
   - If user provides email directly, use it as-is

4. RECURRING EVENTS:
   - "every day" -> frequency: "daily", interval: 1
   - "every week" -> frequency: "weekly", interval: 1
   - "every Monday" -> frequency: "weekly", interval: 1, daysOfWeek: ["monday"]
   - "every month" -> frequency: "monthly", interval: 1
   - Set is_recurring: true for recurring events

5. FOR UPDATE OPERATIONS:
   - Find the event by name (partial match OK, case insensitive)
   - Use the event ID from the existing events list
   - Only include fields that user wants to change in "details"

6. FOR DELETE OPERATIONS:
   - Find the event by name (partial match OK, case insensitive)
   - CRITICAL: If user says "delete an event" WITHOUT specifying which, return action: "unknown"

7. COMMON PHRASES TO RECOGNIZE:
   - Create: "schedule", "create", "add", "book", "set up", "plan"
   - Update: "change", "move", "reschedule", "update", "modify"
   - Delete: "cancel", "delete", "remove"
   - Search: "find", "search", "show", "list"
   - Time: "morning" (9am), "afternoon" (2pm), "evening" (6pm)
   - Duration: "quick" (15 min), "short" (30 min), "long" (2 hours)

8. DETECT SINGLE vs BATCH:
   - Single: "schedule a meeting", "create an event"
   - Batch: "schedule 3 meetings", "create events for Monday, Tuesday, Wednesday"

9. IF TRULY AMBIGUOUS (for destructive actions):
   - Return action: "unknown" for delete without specifying which event
   - NEVER return unknown for create operations - always try to create with reasonable defaults

EXAMPLE PARSING:
- "Schedule a meeting with John tomorrow at 2pm" -> create event, find John's email, tomorrow 14:00-15:00
- "Create a team standup every Monday at 9am" -> create recurring event, weekly on Mondays, 09:00
- "Cancel the team meeting" -> find "team meeting" in events, delete it
- "Move the standup to 10am" -> find "standup" event, update start/end times`;

    try {
      const response = await this.aiProvider.generateText(aiPrompt, {
        saveToDatabase: false,
      });

      // Extract text content from response
      let responseText = '';
      if (typeof response === 'string') {
        responseText = response;
      } else if (response?.text) {
        responseText = response.text;
      } else if (response?.content) {
        responseText = response.content;
      } else if (response?.choices?.[0]?.message?.content) {
        responseText = response.choices[0].message.content;
      } else {
        responseText = JSON.stringify(response);
      }

      // Clean up the response
      let cleanedContent = responseText
        .trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      this.logger.debug(`[CalendarAgent] AI response: ${cleanedContent}`);

      const parsed = JSON.parse(cleanedContent);

      this.logger.log(`[CalendarAgent] Parsed AI response action: ${parsed.action}`);

      return {
        action: parsed.action || 'unknown',
        eventTitle: parsed.eventTitle,
        eventId: parsed.eventId,
        details: parsed.details || {},
        searchQuery: parsed.searchQuery,
        batch_create: parsed.batch_create,
        batch_update: parsed.batch_update,
        batch_delete: parsed.batch_delete,
      };
    } catch (error) {
      this.logger.error(`[CalendarAgent] AI parsing failed: ${error.message}`);
      return {
        action: 'unknown',
        details: {},
      };
    }
  }

  /**
   * Execute the parsed action
   */
  private async executeAction(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
  ): Promise<CalendarAgentResponse> {
    switch (intent.action) {
      case 'create':
        return this.createEvent(intent, workspaceId, userId);

      case 'update':
        return this.updateEvent(intent, workspaceId, userId);

      case 'delete':
        return this.deleteEvent(intent, workspaceId, userId);

      case 'search':
        return this.searchEvents(intent, workspaceId, userId);

      case 'batch_create':
        return this.batchCreateEvents(intent, workspaceId, userId);

      case 'batch_update':
        return this.batchUpdateEvents(intent, workspaceId, userId);

      case 'batch_delete':
        return this.batchDeleteEvents(intent, workspaceId, userId);

      default:
        return {
          success: false,
          action: 'unknown',
          message:
            'I could not understand what you want to do. Please try again with a clearer command.',
          error: 'UNKNOWN_ACTION',
        };
    }
  }

  /**
   * Create a new event
   */
  private async createEvent(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
  ): Promise<CalendarAgentResponse> {
    const { details } = intent;

    if (!details?.title) {
      return {
        success: false,
        action: 'create',
        message:
          'Please provide a title for the event. For example: "Schedule a meeting called Team Standup"',
        error: 'MISSING_EVENT_TITLE',
      };
    }

    if (!details?.start_time || !details?.end_time) {
      return {
        success: false,
        action: 'create',
        message:
          'Please specify when the event should be. For example: "tomorrow at 2pm for 1 hour"',
        error: 'MISSING_EVENT_TIME',
      };
    }

    try {
      const createDto: CreateEventDto = {
        title: details.title,
        description: details.description || 'Created via AI Assistant',
        start_time: details.start_time,
        end_time: details.end_time,
        all_day: details.all_day || false,
        location: details.location,
        attendees: details.attendees,
        meeting_url: details.meeting_url,
        visibility: this.mapVisibility(details.visibility),
        priority: this.mapPriority(details.priority),
        status: this.mapStatus(details.status),
        is_recurring: details.is_recurring || false,
        recurrence_rule: details.recurrence_rule as any,
        reminders: details.reminders || [15],
      };

      this.logger.log(
        `[CalendarAgent] Creating event with DTO: ${JSON.stringify(createDto)}`,
      );

      const event = await this.calendarService.createEvent(
        workspaceId,
        createDto,
        userId,
      );

      // Format the event time for display
      const startDate = new Date(details.start_time);
      const formattedDate = startDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });
      const formattedTime = startDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      return {
        success: true,
        action: 'create',
        message: `Event "${event.title}" has been scheduled for ${formattedDate} at ${formattedTime}!`,
        data: {
          event: {
            id: event.id,
            title: event.title,
            description: event.description,
            start_time: event.start_time,
            end_time: event.end_time,
            location: event.location,
            attendees: event.attendees,
            status: event.status,
            priority: event.priority,
            created_at: event.created_at,
          },
        },
      };
    } catch (error) {
      this.logger.error(`[CalendarAgent] Create event failed: ${error.message}`);
      return {
        success: false,
        action: 'create',
        message: `Failed to create event: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Update an existing event
   */
  private async updateEvent(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
  ): Promise<CalendarAgentResponse> {
    const { eventId, eventTitle, details } = intent;

    if (!eventId) {
      return {
        success: false,
        action: 'update',
        message: `Could not find event "${eventTitle || 'Unknown'}". Please make sure the event exists.`,
        error: 'EVENT_NOT_FOUND',
      };
    }

    const updateFields: any = {};

    if (details?.title) updateFields.title = details.title;
    if (details?.description) updateFields.description = details.description;
    if (details?.start_time) updateFields.start_time = details.start_time;
    if (details?.end_time) updateFields.end_time = details.end_time;
    if (details?.all_day !== undefined) updateFields.all_day = details.all_day;
    if (details?.location) updateFields.location = details.location;
    if (details?.attendees) updateFields.attendees = details.attendees;
    if (details?.meeting_url) updateFields.meeting_url = details.meeting_url;
    if (details?.visibility) updateFields.visibility = this.mapVisibility(details.visibility);
    if (details?.priority) updateFields.priority = this.mapPriority(details.priority);
    if (details?.status) updateFields.status = this.mapStatus(details.status);
    if (details?.is_recurring !== undefined) updateFields.is_recurring = details.is_recurring;
    if (details?.recurrence_rule) updateFields.recurrence_rule = details.recurrence_rule;
    if (details?.reminders) updateFields.reminders = this.normalizeReminders(details.reminders);

    if (Object.keys(updateFields).length === 0) {
      return {
        success: false,
        action: 'update',
        message:
          'Please specify what you want to update. For example: "Move the meeting to 3pm" or "Add John to the standup"',
        error: 'NO_UPDATES_SPECIFIED',
      };
    }

    try {
      const event = await this.calendarService.updateEvent(
        eventId,
        workspaceId,
        updateFields,
        userId,
      );

      const changesDescription = Object.entries(updateFields)
        .map(([key, value]) => {
          if (Array.isArray(value)) {
            return `${key}: [${value.join(', ')}]`;
          }
          return `${key}: ${value}`;
        })
        .join(', ');

      return {
        success: true,
        action: 'update',
        message: `Event "${eventTitle}" has been updated! Changes: ${changesDescription}`,
        data: {
          event,
          updatedFields: updateFields,
        },
      };
    } catch (error) {
      this.logger.error(`[CalendarAgent] Update event failed: ${error.message}`);
      return {
        success: false,
        action: 'update',
        message: `Failed to update event: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Delete an event
   */
  private async deleteEvent(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
  ): Promise<CalendarAgentResponse> {
    const { eventId, eventTitle } = intent;

    if (!eventId) {
      return {
        success: false,
        action: 'delete',
        message: `Could not find event "${eventTitle || 'Unknown'}". Please make sure the event exists and specify which event to delete.`,
        error: 'EVENT_NOT_FOUND',
      };
    }

    try {
      await this.calendarService.deleteEvent(eventId, workspaceId, userId);

      return {
        success: true,
        action: 'delete',
        message: `Event "${eventTitle}" has been cancelled and removed from the calendar.`,
        data: {
          deletedEventId: eventId,
          deletedEventTitle: eventTitle,
        },
      };
    } catch (error) {
      this.logger.error(`[CalendarAgent] Delete event failed: ${error.message}`);
      return {
        success: false,
        action: 'delete',
        message: `Failed to delete event: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Search for events
   */
  private async searchEvents(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
  ): Promise<CalendarAgentResponse> {
    const { searchQuery } = intent;

    if (!searchQuery) {
      return {
        success: false,
        action: 'search',
        message:
          'Please specify what to search for. For example: "Find meetings about marketing"',
        error: 'NO_SEARCH_QUERY',
      };
    }

    try {
      const events = await this.calendarService.searchEvents(
        workspaceId,
        searchQuery,
        undefined,
        undefined,
        undefined,
        userId,
      );

      if (events.length === 0) {
        return {
          success: true,
          action: 'search',
          message: `No events found matching "${searchQuery}".`,
          data: {
            query: searchQuery,
            results: [],
            count: 0,
          },
        };
      }

      const eventsSummary = events
        .slice(0, 5)
        .map((e: any) => {
          const date = new Date(e.start_time).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });
          const time = new Date(e.start_time).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          });
          return `- "${e.title}" on ${date} at ${time}`;
        })
        .join('\n');

      return {
        success: true,
        action: 'search',
        message: `Found ${events.length} event(s) matching "${searchQuery}":\n${eventsSummary}${events.length > 5 ? `\n... and ${events.length - 5} more` : ''}`,
        data: {
          query: searchQuery,
          results: events,
          count: events.length,
        },
      };
    } catch (error) {
      this.logger.error(`[CalendarAgent] Search events failed: ${error.message}`);
      return {
        success: false,
        action: 'search',
        message: `Failed to search events: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Batch create multiple events
   */
  private async batchCreateEvents(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
  ): Promise<CalendarAgentResponse> {
    const items = intent.batch_create || [];

    if (items.length === 0) {
      return {
        success: false,
        action: 'batch_create',
        message: 'No events specified to create.',
        error: 'NO_EVENTS_SPECIFIED',
      };
    }

    this.logger.log(`[CalendarAgent] Batch creating ${items.length} events`);

    const results: Array<{
      success: boolean;
      event?: any;
      error?: string;
      title?: string;
    }> = [];

    for (const item of items) {
      try {
        if (!item.details.title) {
          results.push({
            success: false,
            error: 'Missing event title',
            title: 'Unknown',
          });
          continue;
        }

        if (!item.details.start_time || !item.details.end_time) {
          results.push({
            success: false,
            error: 'Missing event time',
            title: item.details.title,
          });
          continue;
        }

        const createDto: CreateEventDto = {
          title: item.details.title,
          description: item.details.description || 'Created via AI Assistant',
          start_time: item.details.start_time,
          end_time: item.details.end_time,
          all_day: item.details.all_day || false,
          location: item.details.location,
          attendees: item.details.attendees,
          visibility: this.mapVisibility(item.details.visibility),
          priority: this.mapPriority(item.details.priority),
          status: this.mapStatus(item.details.status),
          reminders: item.details.reminders || [15],
        };

        const event = await this.calendarService.createEvent(
          workspaceId,
          createDto,
          userId,
        );

        results.push({
          success: true,
          event: {
            id: event.id,
            title: event.title,
          },
          title: event.title,
        });

        this.logger.log(`[CalendarAgent] Created event: ${event.title}`);
      } catch (error) {
        this.logger.error(
          `[CalendarAgent] Failed to create event ${item.details.title}: ${error.message}`,
        );
        results.push({
          success: false,
          error: error.message,
          title: item.details.title,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return {
      success: successCount > 0,
      action: 'batch_create',
      message: `Batch create completed: ${successCount} successful, ${failCount} failed.`,
      data: {
        total: items.length,
        successful: successCount,
        failed: failCount,
        results,
      },
    };
  }

  /**
   * Batch update multiple events
   */
  private async batchUpdateEvents(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
  ): Promise<CalendarAgentResponse> {
    const items = intent.batch_update || [];

    if (items.length === 0) {
      return {
        success: false,
        action: 'batch_update',
        message: 'No events specified to update.',
        error: 'NO_EVENTS_SPECIFIED',
      };
    }

    this.logger.log(`[CalendarAgent] Batch updating ${items.length} events`);

    const results: Array<{
      success: boolean;
      event?: any;
      error?: string;
      title?: string;
    }> = [];

    for (const item of items) {
      try {
        if (!item.eventId) {
          results.push({
            success: false,
            error: 'Event not found',
            title: item.eventTitle || 'Unknown',
          });
          continue;
        }

        const updateFields: any = {};
        if (item.updates.title) updateFields.title = item.updates.title;
        if (item.updates.description) updateFields.description = item.updates.description;
        if (item.updates.start_time) updateFields.start_time = item.updates.start_time;
        if (item.updates.end_time) updateFields.end_time = item.updates.end_time;
        if (item.updates.location) updateFields.location = item.updates.location;
        if (item.updates.attendees) updateFields.attendees = item.updates.attendees;
        if (item.updates.priority) updateFields.priority = this.mapPriority(item.updates.priority);
        if (item.updates.status) updateFields.status = this.mapStatus(item.updates.status);
        if (item.updates.reminders) updateFields.reminders = this.normalizeReminders(item.updates.reminders);

        if (Object.keys(updateFields).length === 0) {
          results.push({
            success: false,
            error: 'No updates specified',
            title: item.eventTitle,
          });
          continue;
        }

        const event = await this.calendarService.updateEvent(
          item.eventId,
          workspaceId,
          updateFields,
          userId,
        );

        results.push({
          success: true,
          event: {
            id: event.id,
            title: event.title,
          },
          title: event.title,
        });

        this.logger.log(`[CalendarAgent] Updated event: ${event.title}`);
      } catch (error) {
        this.logger.error(
          `[CalendarAgent] Failed to update event ${item.eventTitle}: ${error.message}`,
        );
        results.push({
          success: false,
          error: error.message,
          title: item.eventTitle,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return {
      success: successCount > 0,
      action: 'batch_update',
      message: `Batch update completed: ${successCount} successful, ${failCount} failed.`,
      data: {
        total: items.length,
        successful: successCount,
        failed: failCount,
        results,
      },
    };
  }

  /**
   * Batch delete multiple events
   */
  private async batchDeleteEvents(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
  ): Promise<CalendarAgentResponse> {
    const items = intent.batch_delete || [];

    if (items.length === 0) {
      return {
        success: false,
        action: 'batch_delete',
        message: 'No events specified to delete.',
        error: 'NO_EVENTS_SPECIFIED',
      };
    }

    this.logger.log(`[CalendarAgent] Batch deleting ${items.length} events`);

    const results: Array<{
      success: boolean;
      eventId?: string;
      error?: string;
      title?: string;
    }> = [];

    for (const item of items) {
      try {
        if (!item.eventId) {
          results.push({
            success: false,
            error: 'Event not found',
            title: item.eventTitle || 'Unknown',
          });
          continue;
        }

        await this.calendarService.deleteEvent(item.eventId, workspaceId, userId);

        results.push({
          success: true,
          eventId: item.eventId,
          title: item.eventTitle,
        });

        this.logger.log(`[CalendarAgent] Deleted event: ${item.eventTitle}`);
      } catch (error) {
        this.logger.error(
          `[CalendarAgent] Failed to delete event ${item.eventTitle}: ${error.message}`,
        );
        results.push({
          success: false,
          error: error.message,
          title: item.eventTitle,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return {
      success: successCount > 0,
      action: 'batch_delete',
      message: `Batch delete completed: ${successCount} successful, ${failCount} failed.`,
      data: {
        total: items.length,
        successful: successCount,
        failed: failCount,
        results,
      },
    };
  }

  /**
   * Map visibility string to enum
   */
  private mapVisibility(visibility?: string): EventVisibility {
    if (!visibility) return EventVisibility.PRIVATE;
    const map: Record<string, EventVisibility> = {
      private: EventVisibility.PRIVATE,
      public: EventVisibility.PUBLIC,
      internal: EventVisibility.INTERNAL,
    };
    return map[visibility.toLowerCase()] || EventVisibility.PRIVATE;
  }

  /**
   * Map priority string to enum
   */
  private mapPriority(priority?: string): EventPriority {
    if (!priority) return EventPriority.NORMAL;
    const map: Record<string, EventPriority> = {
      low: EventPriority.LOW,
      normal: EventPriority.NORMAL,
      high: EventPriority.HIGH,
      urgent: EventPriority.URGENT,
    };
    return map[priority.toLowerCase()] || EventPriority.NORMAL;
  }

  /**
   * Map status string to enum
   */
  private mapStatus(status?: string): EventStatus {
    if (!status) return EventStatus.CONFIRMED;
    const map: Record<string, EventStatus> = {
      confirmed: EventStatus.CONFIRMED,
      tentative: EventStatus.TENTATIVE,
      cancelled: EventStatus.CANCELLED,
    };
    return map[status.toLowerCase()] || EventStatus.CONFIRMED;
  }

  /**
   * Normalize reminders to ensure it's always an array of numbers
   * AI may return reminders in various formats (object, string, malformed array)
   */
  private normalizeReminders(reminders: any): number[] {
    // If already a valid array of numbers, return it
    if (Array.isArray(reminders)) {
      return reminders
        .map((r) => {
          if (typeof r === 'number') return r;
          if (typeof r === 'string') {
            const parsed = parseInt(r, 10);
            return isNaN(parsed) ? null : parsed;
          }
          return null;
        })
        .filter((r): r is number => r !== null && r >= 0);
    }

    // If it's a single number, wrap in array
    if (typeof reminders === 'number') {
      return [reminders];
    }

    // If it's a string, try to parse it
    if (typeof reminders === 'string') {
      const parsed = parseInt(reminders, 10);
      if (!isNaN(parsed)) {
        return [parsed];
      }
      // Try parsing as JSON array
      try {
        const jsonParsed = JSON.parse(reminders);
        if (Array.isArray(jsonParsed)) {
          return this.normalizeReminders(jsonParsed);
        }
      } catch {
        // Not valid JSON
      }
    }

    // Default: return default reminder of 15 minutes
    this.logger.warn(
      `[CalendarAgent] Invalid reminders format received: ${JSON.stringify(reminders)}, using default [15]`,
    );
    return [15];
  }
}
