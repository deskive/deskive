import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ConversationMemoryService } from '../conversation-memory/conversation-memory.service';
import { AssignBotToEventDto, UnassignBotFromEventDto, UpdateBotAssignmentDto } from './dto';

@Injectable()
export class EventBotAssignmentsService {
  private readonly logger = new Logger(EventBotAssignmentsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly conversationMemory: ConversationMemoryService,
  ) {}

  /**
   * Assign a bot to a calendar event
   */
  async assignBotToEvent(
    userId: string,
    workspaceId: string,
    eventId: string,
    dto: AssignBotToEventDto,
  ) {
    // Verify the event exists and user has access
    const eventResult = await this.db
      .table('calendar_events')
      .select('*')
      .where('id', '=', eventId)
      .where('workspace_id', '=', workspaceId)
      .execute();

    const events = Array.isArray(eventResult) ? eventResult : (eventResult.data || []);
    if (events.length === 0) {
      throw new NotFoundException('Event not found');
    }

    // Verify the bot exists and belongs to the workspace
    const botResult = await this.db
      .table('bots')
      .select('*')
      .where('id', '=', dto.botId)
      .where('workspace_id', '=', workspaceId)
      .execute();

    const bots = Array.isArray(botResult) ? botResult : (botResult.data || []);
    if (bots.length === 0) {
      throw new NotFoundException('Bot not found');
    }

    // Check if assignment already exists
    const existingResult = await this.db
      .table('event_bot_assignments')
      .select('*')
      .where('event_id', '=', eventId)
      .where('bot_id', '=', dto.botId)
      .execute();

    const existingAssignments = Array.isArray(existingResult) ? existingResult : (existingResult.data || []);
    if (existingAssignments.length > 0) {
      throw new BadRequestException('Bot is already assigned to this event');
    }

    // Create the assignment
    const assignment = await this.db
      .table('event_bot_assignments')
      .insert({
        event_id: eventId,
        bot_id: dto.botId,
        user_id: userId,
        workspace_id: workspaceId,
        settings: dto.settings || {},
        is_active: dto.isActive !== undefined ? dto.isActive : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .returning('*')
      .execute();

    this.logger.log(`Bot ${dto.botId} assigned to event ${eventId} by user ${userId}`);

    // ========================================
    // STORE EVENT CONTEXT IN VECTOR DB
    // ========================================
    try {
      const event = events[0];
      const bot = bots[0];

      // Build comprehensive context message
      const contextMessage = `Bot "${bot.display_name}" has been assigned to event "${event.title}".

Event Details:
- Title: ${event.title}
- Description: ${event.description || 'No description'}
- Start Time: ${new Date(event.start_time).toLocaleString()}
- End Time: ${new Date(event.end_time).toLocaleString()}
- Location: ${event.location || 'No location'}
- Organizer ID: ${event.organizer_id}
- Event ID: ${event.id}

Bot should now have full context about this event and can answer questions about it without needing the user to specify the event name.`;

      // Store in vector DB for semantic retrieval
      await this.conversationMemory.storeMessage({
        role: 'assistant',
        content: contextMessage,
        workspace_id: workspaceId,
        user_id: userId,
        entity_type: 'bot_assignment',
        action: 'event_assigned',
        metadata: {
          bot_id: dto.botId,
          bot_name: bot.display_name,
          event_id: eventId,
          event_title: event.title,
          event_start: event.start_time,
          event_location: event.location,
          assignment_id: assignment[0].id,
        },
      });

      this.logger.log(`[EventAssignment] Stored event context in vector DB for bot ${dto.botId}`);
    } catch (error) {
      this.logger.error(`[EventAssignment] Failed to store context in vector DB: ${error.message}`);
      // Don't fail the assignment if vector storage fails
    }

    return assignment[0];
  }

  /**
   * Unassign a bot from a calendar event
   */
  async unassignBotFromEvent(
    userId: string,
    workspaceId: string,
    dto: UnassignBotFromEventDto,
  ) {
    // Verify the assignment exists and user has access
    const assignmentResult = await this.db
      .table('event_bot_assignments')
      .select('*')
      .where('event_id', '=', dto.event_id)
      .where('bot_id', '=', dto.bot_id)
      .where('workspace_id', '=', workspaceId)
      .execute();

    const assignments = Array.isArray(assignmentResult) ? assignmentResult : (assignmentResult.data || []);
    if (assignments.length === 0) {
      throw new NotFoundException('Bot assignment not found');
    }

    const assignment = assignments[0];
    // Verify user has permission (must be the creator or admin)
    if (assignment.user_id !== userId) {
      // TODO: Add admin check here if needed
      throw new ForbiddenException('You do not have permission to unassign this bot');
    }

    // Delete the assignment
    await this.db
      .table('event_bot_assignments')
      .where('event_id', '=', dto.event_id)
      .where('bot_id', '=', dto.bot_id)
      .delete()
      .execute();

    this.logger.log(`Bot ${dto.bot_id} unassigned from event ${dto.event_id} by user ${userId}`);
    return { success: true };
  }

  /**
   * Update bot assignment settings
   */
  async updateBotAssignment(
    userId: string,
    workspaceId: string,
    eventId: string,
    botId: string,
    dto: UpdateBotAssignmentDto,
  ) {
    // Verify the assignment exists
    const assignmentResult = await this.db
      .table('event_bot_assignments')
      .select('*')
      .where('event_id', '=', eventId)
      .where('bot_id', '=', botId)
      .where('workspace_id', '=', workspaceId)
      .execute();

    const assignments = Array.isArray(assignmentResult) ? assignmentResult : (assignmentResult.data || []);
    if (assignments.length === 0) {
      throw new NotFoundException('Bot assignment not found');
    }

    const assignment = assignments[0];
    // Verify user has permission
    if (assignment.user_id !== userId) {
      throw new ForbiddenException('You do not have permission to update this bot assignment');
    }

    // Update the assignment
    const updatedResult = await this.db
      .table('event_bot_assignments')
      .where('event_id', '=', eventId)
      .where('bot_id', '=', botId)
      .update({
        settings: dto.settings !== undefined ? dto.settings : assignment.settings,
        is_active: dto.isActive !== undefined ? dto.isActive : assignment.is_active,
        updated_at: new Date().toISOString(),
      })
      .returning('*')
      .execute();

    const updated = Array.isArray(updatedResult) ? updatedResult : (updatedResult.data || []);
    this.logger.log(`Bot assignment updated for bot ${botId} on event ${eventId}`);
    return updated[0];
  }

  /**
   * Get all bots assigned to an event
   */
  async getBotsForEvent(workspaceId: string, eventId: string) {
    const assignmentResult = await this.db
      .table('event_bot_assignments')
      .select('*')
      .where('event_id', '=', eventId)
      .where('workspace_id', '=', workspaceId)
      .execute();

    const assignments = Array.isArray(assignmentResult) ? assignmentResult : (assignmentResult.data || []);

    // Fetch bot details for each assignment
    const enrichedAssignments = await Promise.all(
      assignments.map(async (assignment: any) => {
        const botResult = await this.db
          .table('bots')
          .select('*')
          .where('id', '=', assignment.bot_id)
          .execute();

        const bots = Array.isArray(botResult) ? botResult : (botResult.data || []);
        const bot = bots[0];

        // Convert to camelCase for frontend (per CLAUDE.md rule #2)
        return {
          id: assignment.id,
          eventId: assignment.event_id,
          botId: assignment.bot_id,
          userId: assignment.user_id,
          workspaceId: assignment.workspace_id,
          settings: assignment.settings,
          isActive: assignment.is_active,
          createdAt: assignment.created_at,
          updatedAt: assignment.updated_at,
          // Enriched bot details
          botName: bot?.name,
          botDisplayName: bot?.display_name,
          botDescription: bot?.description,
          botAvatarUrl: bot?.avatar_url,
          botStatus: bot?.status,
        };
      }),
    );

    return enrichedAssignments;
  }

  /**
   * Get all events assigned to a bot
   */
  async getEventsForBot(workspaceId: string, botId: string) {
    const assignmentResult = await this.db
      .table('event_bot_assignments')
      .select('*')
      .where('bot_id', '=', botId)
      .where('workspace_id', '=', workspaceId)
      .execute();

    const assignments = Array.isArray(assignmentResult) ? assignmentResult : (assignmentResult.data || []);

    // Fetch event details for each assignment
    const enrichedAssignments = await Promise.all(
      assignments.map(async (assignment: any) => {
        const eventResult = await this.db
          .table('calendar_events')
          .select('*')
          .where('id', '=', assignment.event_id)
          .execute();

        const events = Array.isArray(eventResult) ? eventResult : (eventResult.data || []);
        const event = events[0];

        return {
          ...assignment,
          event_title: event?.title,
          event_description: event?.description,
          start_time: event?.start_time,
          end_time: event?.end_time,
          location: event?.location,
          event_status: event?.status,
        };
      }),
    );

    // Sort by start time
    enrichedAssignments.sort((a, b) => {
      const aTime = a.start_time ? new Date(a.start_time).getTime() : 0;
      const bTime = b.start_time ? new Date(b.start_time).getTime() : 0;
      return aTime - bTime;
    });

    return enrichedAssignments;
  }

  /**
   * Get a specific bot assignment
   */
  async getAssignment(workspaceId: string, eventId: string, botId: string) {
    const assignmentResult = await this.db
      .table('event_bot_assignments')
      .select('*')
      .where('event_id', '=', eventId)
      .where('bot_id', '=', botId)
      .where('workspace_id', '=', workspaceId)
      .execute();

    const assignments = Array.isArray(assignmentResult) ? assignmentResult : (assignmentResult.data || []);
    if (assignments.length === 0) {
      throw new NotFoundException('Bot assignment not found');
    }

    return assignments[0];
  }

  /**
   * Check if a bot is assigned to an event
   */
  async isBotAssignedToEvent(eventId: string, botId: string): Promise<boolean> {
    const assignmentResult = await this.db
      .table('event_bot_assignments')
      .select('id')
      .where('event_id', '=', eventId)
      .where('bot_id', '=', botId)
      .where('is_active', '=', true)
      .execute();

    const assignments = Array.isArray(assignmentResult) ? assignmentResult : (assignmentResult.data || []);
    return assignments.length > 0;
  }

  /**
   * Get all assignments for a specific bot (simpler version without enrichment)
   */
  async getAssignmentsByBot(workspaceId: string, botId: string) {
    const assignmentResult = await this.db
      .table('event_bot_assignments')
      .select('*')
      .where('bot_id', '=', botId)
      .where('workspace_id', '=', workspaceId)
      .where('is_active', '=', true)
      .execute();

    return Array.isArray(assignmentResult) ? assignmentResult : (assignmentResult.data || []);
  }
}
