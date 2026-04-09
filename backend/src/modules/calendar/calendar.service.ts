import { Injectable, NotFoundException, BadRequestException, ConflictException, InternalServerErrorException, Logger, Inject, forwardRef, Optional } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AiProviderService } from '../ai-provider/ai-provider.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto';
import { NotificationSchedulerService } from '../scheduler/notification-scheduler.service';
import { EventBotReminderService } from './event-bot-reminder.service';
import { EntityEventIntegrationService } from '../workflows/entity-event-integration.service';
import { CreateEventDto, UpdateEventDto, CreateMeetingRoomDto, CreateEventCategoryDto, UpdateEventCategoryDto, AISchedulingRequestDto, AISchedulingResponseDto, TimeSlotSuggestion, SmartAISchedulingRequestDto, SmartAISchedulingResponseDto, ParsedSchedulingInfo, SmartTimeSlotSuggestion, CalendarDashboardStatsDto } from './dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    private readonly db: DatabaseService,
    private notificationsService: NotificationsService,
    private notificationSchedulerService: NotificationSchedulerService,
    @Inject(forwardRef(() => EventBotReminderService))
    private eventBotReminderService: EventBotReminderService,
    @Optional() @Inject(forwardRef(() => EntityEventIntegrationService))
    private entityEventIntegration?: EntityEventIntegrationService,
  ) { }

  // ============================================
  // EVENT OPERATIONS
  // ============================================

  async createEvent(workspaceId: string, createEventDto: CreateEventDto, userId: string, files?: Express.Multer.File[]) {
    // Validate that start time is not in the past
    const now = new Date();
    const startTime = new Date(createEventDto.start_time);

    // For all-day events, compare only the date (not time)
    if (createEventDto.all_day) {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const eventDateStart = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate());
      if (eventDateStart.getTime() < todayStart.getTime()) {
        throw new BadRequestException('Cannot create an event in the past. Please select a future date.');
      }
    } else {
      // For timed events, allow a small buffer (1 minute) to account for request processing time
      const bufferMs = 60 * 1000;
      if (startTime.getTime() < now.getTime() - bufferMs) {
        throw new BadRequestException('Cannot create an event in the past. Please select a future date and time.');
      }
    }

    // Validate date range
    if (new Date(createEventDto.start_time) >= new Date(createEventDto.end_time)) {
      throw new BadRequestException('End time must be after start time');
    }

    // Check room availability if room is specified
    if (createEventDto.room_id) {
      try {
        await this.checkRoomAvailability(createEventDto.room_id, createEventDto.start_time, createEventDto.end_time);
      } catch (error) {
        console.log('Room availability check failed:', {
          room_id: createEventDto.room_id,
          start_time: createEventDto.start_time,
          end_time: createEventDto.end_time,
          error: error.message
        });
        throw error;
      }
    }

    // Handle file uploads if any
    let uploadedFileIds: string[] = [];
    if (files && files.length > 0) {
      uploadedFileIds = await this.uploadEventFiles(files, workspaceId, userId);
    }

    // Build attachments object (without drive_attachment - that's a separate column now)
    const attachments = {
      file_attachment: [
        ...(createEventDto.attachments?.file_attachment || []),
        ...uploadedFileIds
      ],
      note_attachment: createEventDto.attachments?.note_attachment || [],
      event_attachment: createEventDto.attachments?.event_attachment || []
    };

    // Drive attachments are stored in a separate column
    const driveAttachment = createEventDto.attachments?.drive_attachment || [];

    // Get current user's email to add as default attendee
    let currentUserEmail: string | null = null;
    try {
      const currentUser = await this.db.getUserById(userId);
      if (currentUser && currentUser.email) {
        currentUserEmail = currentUser.email;
      }
    } catch (error) {
      console.warn(`Failed to fetch current user email for userId ${userId}:`, error.message);
    }

    // Build attendees list with current user as default attendee (organizer)
    let attendeesList = createEventDto.attendees || [];
    if (currentUserEmail && !attendeesList.includes(currentUserEmail)) {
      attendeesList = [currentUserEmail, ...attendeesList];
    }

    const eventData = {
      workspace_id: workspaceId,
      title: createEventDto.title,
      description: createEventDto.description,
      start_time: createEventDto.start_time,
      end_time: createEventDto.end_time,
      all_day: createEventDto.all_day || false,
      location: createEventDto.location,
      organizer_id: userId,
      category_id: createEventDto.category_id,
      room_id: createEventDto.room_id,
      attendees: attendeesList,
      attachments: attachments,
      drive_attachment: driveAttachment,
      description_file_ids: createEventDto.description_file_ids || [],
      meeting_url: createEventDto.meeting_url,
      visibility: createEventDto.visibility || 'private',
      priority: createEventDto.priority || 'normal',
      status: createEventDto.status || 'confirmed',
      is_recurring: createEventDto.is_recurring || false,
      recurrence_rule: createEventDto.recurrence_rule,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Debug logging
    console.log('Creating event with data:', {
      category_id: eventData.category_id,
      room_id: eventData.room_id,
      priority: eventData.priority,
      status: eventData.status
    });

    const event = await this.db.insert('calendar_events', eventData);

    // Add attendees to event_attendees table for detailed tracking
    if (createEventDto.attendees && createEventDto.attendees.length > 0) {
      await this.addEventAttendees(event.id, createEventDto.attendees);
    }

    // Add reminders and schedule notifications for attendees
    if (createEventDto.reminders && createEventDto.reminders.length > 0) {
      await this.addEventReminders(
        event.id,
        createEventDto.reminders,
        {
          eventTitle: createEventDto.title,
          startTime: createEventDto.start_time,
          endTime: createEventDto.end_time,
          organizerId: userId,
          attendeeEmails: createEventDto.attendees || [],
          workspaceId: workspaceId,
        }
      );
    }

    // Book the room if specified
    if (createEventDto.room_id) {
      await this.bookRoom(createEventDto.room_id, event.id, createEventDto.start_time, createEventDto.end_time, userId);
    }

    // Send notifications to attendees (exclude the organizer)
    if (createEventDto.attendees && createEventDto.attendees.length > 0) {
      const eventDate = new Date(createEventDto.start_time).toISOString();
      const eventTime = new Date(createEventDto.start_time).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      const eventDateFormatted = new Date(createEventDto.start_time).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      for (const attendeeEmail of createEventDto.attendees) {
        // Skip sending notification to the organizer
        try {
          const attendeeUser = await this.db.searchUsers(attendeeEmail, { limit: 100 });
          if (attendeeUser && attendeeUser.users && attendeeUser.users.length > 0) {
            // Find the exact email match from the search results
            const attendee = attendeeUser.users.find(u => u.email === attendeeEmail);
            if (attendee && attendee.id !== userId) {
              await this.notificationsService.sendNotification({
                user_id: attendee.id,
                type: NotificationType.CALENDAR,
                title: 'New Calendar Event',
                message: `You've been invited to "${createEventDto.title}" on ${eventDateFormatted} at ${eventTime}`,
                action_url: `/workspaces/${workspaceId}/calendar?date=${eventDate}&eventId=${event.id}`,
                priority: 'normal' as any,
                send_push: true, // Enable FCM push notification for mobile users
                data: {
                  category: 'calendar',
                  entity_type: 'event',
                  entity_id: event.id,
                  actor_id: userId,
                  workspace_id: workspaceId,
                  event_title: createEventDto.title,
                  event_start_time: createEventDto.start_time,
                  event_end_time: createEventDto.end_time,
                }
              });
            }
          }
        } catch (error) {
          console.error(`Failed to send event notification to attendee ${attendeeEmail}:`, error);
        }
      }
    }

    // For recurring events, we store the recurrence rule in the master event
    // Occurrences will be generated dynamically when fetching events
    // This is more efficient and professional than creating multiple database records

    // Emit event created event for workflow automation
    if (this.entityEventIntegration) {
      try {
        this.entityEventIntegration.emitEventCreated(workspaceId, event, userId);
      } catch (error) {
        console.error('[CalendarService] Failed to emit event created event:', error);
      }
    }

    return event;
  }

  async getEvents(workspaceId: string, startDate?: string, endDate?: string, userId?: string, filters?: any) {
    // Using workaround pattern for complex queries
    const allEventsResult = await this.db.find('calendar_events', {});
    const allEventsData = Array.isArray(allEventsResult.data) ? allEventsResult.data : [];

    let events = allEventsData.filter(e => e.workspace_id === workspaceId);

    // Filter by date range
    if (startDate) {
      events = events.filter(e => new Date(e.end_time) >= new Date(startDate));
    }
    if (endDate) {
      events = events.filter(e => new Date(e.start_time) <= new Date(endDate));
    }

    // Apply search and filters
    events = this.applyFilters(events, filters);

    // Filter by user (only events they're invited to or organizing)
    if (userId) {
      // Get current user's email
      let userEmail: string | null = null;
      try {
        const userResult = await this.db.getUserById(userId);
        if (userResult && userResult.email) {
          userEmail = userResult.email;
        }
      } catch (error) {
        console.warn(`Failed to fetch user email for userId ${userId}:`, error.message);
      }

      // Filter events: organizer OR attendee (by email in attendees array)
      events = events.filter(e => {
        const isOrganizer = e.organizer_id === userId;
        const isAttendeeByEmail = userEmail && Array.isArray(e.attendees) && e.attendees.includes(userEmail);

        return isOrganizer || isAttendeeByEmail;
      });
    }

    // Sort by start time
    events.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    // Generate occurrences for recurring events within the date range
    const eventsWithOccurrences = [];
    for (const event of events) {
      if (event.is_recurring && event.recurrence_rule && startDate && endDate) {
        // Add the master event and generate occurrences
        const occurrences = this.generateOccurrencesForDateRange(
          event,
          new Date(startDate),
          new Date(endDate)
        );
        eventsWithOccurrences.push(...occurrences);
      } else {
        // Non-recurring event, add as-is
        eventsWithOccurrences.push(event);
      }
    }

    // Enrich events with additional data
    const enrichedEvents = await Promise.all(
      eventsWithOccurrences.map(async (event) => {
        // Fetch detailed attendees from event_attendees table
        let attendees = [];
        if (event.is_occurrence && event.parent_event_id) {
          // For virtual occurrences, fetch attendees from parent event
          attendees = await this.getEventAttendees(event.parent_event_id);
        } else {
          // For regular events, fetch attendees
          attendees = await this.getEventAttendees(event.id);
        }

        // For recurring event occurrences, use the parent event's reminders
        let reminders = [];
        if (event.is_occurrence && event.parent_event_id) {
          // Don't fetch reminders for virtual occurrences
          // They inherit reminders from the parent event
          reminders = [];
        } else {
          // For regular events, fetch reminders
          reminders = await this.getEventReminders(event.id);
        }

        // Enrich attachments with full details
        const enrichedAttachments = await this.enrichAttachments(event.attachments, workspaceId);

        // Merge drive_attachment back into attachments for frontend compatibility
        const mergedAttachments = {
          ...enrichedAttachments,
          drive_attachment: event.drive_attachment || []
        };

        return {
          ...event,
          attendees: attendees,
          reminders: reminders,
          attachments: mergedAttachments
        };
      })
    );

    return enrichedEvents;
  }

  private applyFilters(events: any[], filters?: any) {
    if (!filters) return events;

    let filteredEvents = events;

    // Search filter - search in title, description
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredEvents = filteredEvents.filter(event =>
        event.title?.toLowerCase().includes(searchTerm) ||
        event.description?.toLowerCase().includes(searchTerm)
      );
    }

    // Category filter
    if (filters.categories && filters.categories.length > 0) {
      filteredEvents = filteredEvents.filter(event =>
        filters.categories.includes(event.category_id)
      );
    }

    // Priority filter
    if (filters.priorities && filters.priorities.length > 0) {
      filteredEvents = filteredEvents.filter(event =>
        filters.priorities.includes(event.priority)
      );
    }

    // Status filter
    if (filters.statuses && filters.statuses.length > 0) {
      filteredEvents = filteredEvents.filter(event =>
        filters.statuses.includes(event.status)
      );
    }

    // Tags filter (assuming tags are stored as array in JSONB)
    if (filters.tags && filters.tags.length > 0) {
      filteredEvents = filteredEvents.filter(event => {
        const eventTags = event.tags || [];
        return filters.tags.some(tag => eventTags.includes(tag));
      });
    }

    // Attendees filter
    if (filters.attendees && filters.attendees.length > 0) {
      filteredEvents = filteredEvents.filter(event => {
        const eventAttendees = event.attendees || [];
        return filters.attendees.some(email =>
          eventAttendees.some(attendee =>
            typeof attendee === 'string' ? attendee === email : attendee.email === email
          )
        );
      });
    }

    // Visibility filters
    if (filters.showDeclined === false) {
      filteredEvents = filteredEvents.filter(event => event.status !== 'declined');
    }

    if (filters.showCancelled === false) {
      filteredEvents = filteredEvents.filter(event => event.status !== 'cancelled');
    }

    if (filters.showPrivate === false) {
      filteredEvents = filteredEvents.filter(event => event.visibility !== 'private');
    }

    return filteredEvents;
  }

  /**
   * Enrich attachments with their full details (titles, names, URLs)
   */
  private async enrichAttachments(attachments: any, workspaceId: string): Promise<any> {
    if (!attachments) {
      return {
        file_attachment: [],
        note_attachment: [],
        event_attachment: []
      };
    }

    const enriched: any = {
      file_attachment: [],
      note_attachment: [],
      event_attachment: []
    };

    // Enrich file attachments
    if (attachments.file_attachment && Array.isArray(attachments.file_attachment)) {
      for (const fileId of attachments.file_attachment) {
        try {
          const fileQuery = await this.db.table('files')
            .select('id, name, mime_type, size, url')
            .where('id', '=', fileId)
            .limit(1)
            .execute();

          const fileData = Array.isArray(fileQuery.data) ? fileQuery.data[0] : null;
          if (fileData) {
            enriched.file_attachment.push({
              id: fileData.id,
              name: fileData.name || 'Unknown file',
              type: fileData.mime_type,
              size: fileData.size,
              url: fileData.url
            });
          } else {
            console.warn(`[CalendarService] File attachment not found: ${fileId}`);
            enriched.file_attachment.push({ id: fileId, name: 'Unknown file' });
          }
        } catch (error) {
          console.warn(`[CalendarService] Could not fetch file attachment ${fileId}:`, error.message);
          enriched.file_attachment.push({ id: fileId, name: 'Unknown file' });
        }
      }
    }

    // Enrich note attachments (linked notes)
    if (attachments.note_attachment && Array.isArray(attachments.note_attachment)) {
      for (const linkedNoteId of attachments.note_attachment) {
        try {
          const noteQuery = await this.db.table('notes')
            .select('id, title, icon, updated_at')
            .where('id', '=', linkedNoteId)
            .where('workspace_id', '=', workspaceId)
            .where('deleted_at', 'is', null)
            .limit(1)
            .execute();

          const noteData = Array.isArray(noteQuery.data) ? noteQuery.data[0] : null;
          if (noteData) {
            enriched.note_attachment.push({
              id: noteData.id,
              title: noteData.title || 'Untitled Note',
              icon: noteData.icon || '📝',
              updated_at: noteData.updated_at
            });
          } else {
            console.warn(`[CalendarService] Note attachment not found: ${linkedNoteId}`);
            enriched.note_attachment.push({ id: linkedNoteId, title: 'Unknown note', icon: '📝' });
          }
        } catch (error) {
          console.warn(`[CalendarService] Could not fetch note attachment ${linkedNoteId}:`, error.message);
          enriched.note_attachment.push({ id: linkedNoteId, title: 'Unknown note', icon: '📝' });
        }
      }
    }

    // Enrich event attachments (linked calendar events)
    if (attachments.event_attachment && Array.isArray(attachments.event_attachment)) {
      for (const eventId of attachments.event_attachment) {
        try {
          const eventQuery = await this.db.table('calendar_events')
            .select('id, title, start_time, end_time, location')
            .where('id', '=', eventId)
            .where('workspace_id', '=', workspaceId)
            .limit(1)
            .execute();

          const eventData = Array.isArray(eventQuery.data) ? eventQuery.data[0] : null;
          if (eventData) {
            enriched.event_attachment.push({
              id: eventData.id,
              title: eventData.title || 'Untitled Event',
              start_time: eventData.start_time,
              end_time: eventData.end_time,
              location: eventData.location
            });
          } else {
            console.warn(`[CalendarService] Event attachment not found: ${eventId}`);
            enriched.event_attachment.push({ id: eventId, title: 'Unknown event' });
          }
        } catch (error) {
          console.warn(`[CalendarService] Could not fetch event attachment ${eventId}:`, error.message);
          enriched.event_attachment.push({ id: eventId, title: 'Unknown event' });
        }
      }
    }

    return enriched;
  }

  async searchEvents(workspaceId: string, query: string, startDate?: string, endDate?: string, filters?: any, userId?: string) {
    // Using workaround pattern for complex queries
    const allEventsResult = await this.db.find('calendar_events', {});
    const allEventsData = Array.isArray(allEventsResult.data) ? allEventsResult.data : [];
    let events = allEventsData.filter(e => e.workspace_id === workspaceId);

    // Filter by user (only events they're invited to or organizing)
    if (userId) {
      // Get current user's email
      let userEmail: string | null = null;
      try {
        const userResult = await this.db.getUserById(userId);
        if (userResult && userResult.email) {
          userEmail = userResult.email;
        }
      } catch (error) {
        console.warn(`Failed to fetch user email for userId ${userId}:`, error.message);
      }

      // Filter events: organizer OR attendee (by email in attendees array)
      events = events.filter(e => {
        const isOrganizer = e.organizer_id === userId;
        const isAttendeeByEmail = userEmail && Array.isArray(e.attendees) && e.attendees.includes(userEmail);

        return isOrganizer || isAttendeeByEmail;
      });
    }

    // Apply search query
    const searchTerm = query.toLowerCase();
    events = events.filter(event =>
      event.title?.toLowerCase().includes(searchTerm) ||
      event.description?.toLowerCase().includes(searchTerm) ||
      event.location?.toLowerCase().includes(searchTerm)
    );

    // Apply additional filters
    events = this.applyFilters(events, filters);

    // Filter by date range if provided
    if (startDate) {
      events = events.filter(e => new Date(e.end_time) >= new Date(startDate));
    }
    if (endDate) {
      events = events.filter(e => new Date(e.start_time) <= new Date(endDate));
    }

    // Sort by relevance (events with title matches first, then description matches)
    events.sort((a, b) => {
      const aTitleMatch = a.title?.toLowerCase().includes(searchTerm) ? 1 : 0;
      const bTitleMatch = b.title?.toLowerCase().includes(searchTerm) ? 1 : 0;

      if (aTitleMatch !== bTitleMatch) {
        return bTitleMatch - aTitleMatch; // Title matches first
      }

      // Then sort by date
      return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
    });

    // Enrich with additional data (simplified for search results)
    const enrichedEvents = await Promise.all(
      events.map(async (event) => {
        // Merge drive_attachment back into attachments for frontend compatibility
        const mergedAttachments = {
          ...(event.attachments || { file_attachment: [], note_attachment: [], event_attachment: [] }),
          drive_attachment: event.drive_attachment || []
        };

        return {
          ...event,
          attendees: await this.getEventAttendees(event.id),
          reminders: await this.getEventReminders(event.id),
          attachments: mergedAttachments
        };
      })
    );

    return enrichedEvents;
  }

  async getEvent(eventId: string, workspaceId: string, userId: string) {
    const eventQueryResult = await this.db.find('calendar_events', {
      id: eventId,
      workspace_id: workspaceId
    });

    const eventData = Array.isArray(eventQueryResult.data) ? eventQueryResult.data : [];
    if (eventData.length === 0) {
      throw new NotFoundException('Event not found');
    }

    const event = eventData[0];

    // Check if user has access to this event
    if (event.visibility === 'private' &&
      event.organizer_id !== userId &&
      !event.attendees.includes(userId)) {
      throw new NotFoundException('Event not found');
    }

    // Get additional event data
    const attendees = await this.getEventAttendees(eventId);
    const reminders = await this.getEventReminders(eventId);

    // Merge drive_attachment back into attachments for frontend compatibility
    const mergedAttachments = {
      ...(event.attachments || { file_attachment: [], note_attachment: [], event_attachment: [] }),
      drive_attachment: event.drive_attachment || []
    };

    return {
      ...event,
      attendees,
      reminders,
      attachments: mergedAttachments
    };
  }

  async updateEvent(eventId: string, workspaceId: string, updateEventDto: UpdateEventDto, userId: string, files?: Express.Multer.File[]) {
    const event = await this.getEventWithAccess(eventId, workspaceId, userId);

    // Extract master event ID for database operations
    const masterEventId = this.extractMasterEventId(eventId);

    // Check if user is the organizer
    if (event.organizer_id !== userId) {
      throw new BadRequestException('Only the event organizer can edit the event');
    }

    // Validate that start time is not in the past (when updating start_time)
    if (updateEventDto.start_time) {
      const now = new Date();
      const startTime = new Date(updateEventDto.start_time);

      // Allow a small buffer (1 minute) to account for request processing time
      const bufferMs = 60 * 1000;
      if (startTime.getTime() < now.getTime() - bufferMs) {
        throw new BadRequestException('Cannot update event to a past date and time. Please select a future date and time.');
      }
    }

    // Validate date range if both dates are provided
    if (updateEventDto.start_time && updateEventDto.end_time) {
      if (new Date(updateEventDto.start_time) >= new Date(updateEventDto.end_time)) {
        throw new BadRequestException('End time must be after start time');
      }
    }

    // Handle file uploads if any
    let uploadedFileIds: string[] = [];
    if (files && files.length > 0) {
      uploadedFileIds = await this.uploadEventFiles(files, workspaceId, userId);
    }

    // Remove fields that are not columns in calendar_events table
    const { reminders, attendees, attachments: inputAttachments, ...eventUpdateData } = updateEventDto;

    // Handle attachments - combine existing with new uploads (without drive_attachment - that's a separate column)
    let updatedAttachments = inputAttachments;
    let updatedDriveAttachment = inputAttachments?.drive_attachment;
    if (uploadedFileIds.length > 0 || inputAttachments) {
      // Get existing attachments from event
      const existingAttachments = event.attachments || { file_attachment: [], note_attachment: [], event_attachment: [] };
      const existingDriveAttachment = event.drive_attachment || [];
      updatedAttachments = {
        file_attachment: [
          ...(inputAttachments?.file_attachment || existingAttachments.file_attachment || []),
          ...uploadedFileIds
        ],
        note_attachment: inputAttachments?.note_attachment || existingAttachments.note_attachment || [],
        event_attachment: inputAttachments?.event_attachment || existingAttachments.event_attachment || []
      };
      updatedDriveAttachment = inputAttachments?.drive_attachment !== undefined
        ? inputAttachments.drive_attachment
        : existingDriveAttachment;
    }

    const updateData = {
      ...eventUpdateData,
      // Include attendees in JSONB column for backward compatibility
      attendees: attendees !== undefined ? attendees : undefined,
      // Update attachments if we have changes (without drive_attachment)
      attachments: updatedAttachments !== undefined ? updatedAttachments : undefined,
      // Drive attachment is a separate column
      drive_attachment: updatedDriveAttachment !== undefined ? updatedDriveAttachment : undefined,
      last_modified_by: userId,
      updated_at: new Date().toISOString()
    };

    // Debug logging
    console.log('Updating event with data:', {
      originalEventId: eventId,
      masterEventId: masterEventId,
      category_id: updateData.category_id,
      room_id: updateData.room_id,
      priority: updateData.priority,
      status: updateData.status
    });

    // Detect changes before updating
    const changes: string[] = [];
    if (updateEventDto.title && updateEventDto.title !== event.title) {
      changes.push('title');
    }
    if (updateEventDto.description !== undefined && updateEventDto.description !== event.description) {
      changes.push('description');
    }
    if (updateEventDto.start_time && updateEventDto.start_time !== event.start_time) {
      changes.push('time');
    }
    if (updateEventDto.end_time && updateEventDto.end_time !== event.end_time) {
      changes.push('time');
    }
    if (updateEventDto.location && updateEventDto.location !== event.location) {
      changes.push('location');
    }
    if (updateEventDto.category_id && updateEventDto.category_id !== event.category_id) {
      changes.push('category');
    }
    if (updateEventDto.priority && updateEventDto.priority !== event.priority) {
      changes.push('priority');
    }
    if (updateEventDto.status && updateEventDto.status !== event.status) {
      changes.push('status');
    }

    // Use master event ID for database operation
    const updatedEvent = await this.db.update('calendar_events', masterEventId, updateData);

    // Get all attendees for notifications
    const existingAttendees = await this.getEventAttendees(masterEventId);
    const existingEmails = existingAttendees.map(a => a.email);
    let newAttendees: string[] = [];
    let removedAttendees: string[] = [];
    let allCurrentAttendees: string[] = existingEmails;

    // Update attendees in event_attendees table if provided (use master event ID)
    if (attendees !== undefined) {
      // Identify new and removed attendees
      newAttendees = attendees.filter(email => !existingEmails.includes(email));
      removedAttendees = existingEmails.filter(email => !attendees.includes(email));
      allCurrentAttendees = attendees;

      await this.updateEventAttendees(masterEventId, attendees);

      if (newAttendees.length > 0 || removedAttendees.length > 0) {
        changes.push('attendees');
      }
    }

    // Send notifications to attendees based on changes
    if (changes.length > 0) {
      const eventTitle = updateEventDto.title || event.title;
      const eventStartTime = updateEventDto.start_time || event.start_time;
      const eventDate = new Date(eventStartTime).toISOString();
      const eventDateFormatted = new Date(eventStartTime).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      const eventTime = new Date(eventStartTime).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      // Generate notification message based on changes
      let notificationTitle = 'Event Updated';
      let notificationMessage = '';

      if (newAttendees.length > 0 && changes.length === 1 && changes[0] === 'attendees') {
        // Only attendees added, use specific message
        notificationTitle = 'Added to Calendar Event';
        notificationMessage = `You've been added to "${eventTitle}" on ${eventDateFormatted} at ${eventTime}`;
      } else if (changes.includes('title')) {
        notificationTitle = 'Event Title Changed';
        notificationMessage = `The title of the event has been changed to "${eventTitle}" on ${eventDateFormatted} at ${eventTime}`;
      } else if (changes.includes('time')) {
        notificationTitle = 'Event Time Changed';
        const oldStartTime = new Date(event.start_time).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }) + ' at ' + new Date(event.start_time).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        notificationMessage = `"${eventTitle}" has been rescheduled from ${oldStartTime} to ${eventDateFormatted} at ${eventTime}`;
      } else if (changes.includes('location')) {
        notificationTitle = 'Event Location Changed';
        notificationMessage = `The location of "${eventTitle}" has been changed to "${updateEventDto.location}" (${eventDateFormatted} at ${eventTime})`;
      } else if (changes.includes('category')) {
        notificationTitle = 'Event Category Changed';
        notificationMessage = `The category of "${eventTitle}" has been updated (${eventDateFormatted} at ${eventTime})`;
      } else if (changes.includes('description')) {
        notificationTitle = 'Event Details Updated';
        notificationMessage = `The details of "${eventTitle}" have been updated (${eventDateFormatted} at ${eventTime})`;
      } else if (changes.includes('priority')) {
        notificationTitle = 'Event Priority Changed';
        notificationMessage = `The priority of "${eventTitle}" has been changed to ${updateEventDto.priority} (${eventDateFormatted} at ${eventTime})`;
      } else if (changes.includes('status')) {
        notificationTitle = 'Event Status Changed';
        notificationMessage = `The status of "${eventTitle}" has been changed to ${updateEventDto.status} (${eventDateFormatted} at ${eventTime})`;
      } else {
        // Multiple changes
        notificationTitle = 'Event Updated';
        const changesText = changes.join(', ').replace(/,([^,]*)$/, ' and$1');
        notificationMessage = `"${eventTitle}" has been updated (${changesText} changed) - ${eventDateFormatted} at ${eventTime}`;
      }

      // Send notifications to newly added attendees
      for (const attendeeEmail of newAttendees) {
        try {
          const attendeeUser = await this.db.searchUsers(attendeeEmail, { limit: 100 });
          if (attendeeUser && attendeeUser.users && attendeeUser.users.length > 0) {
            const attendee = attendeeUser.users.find(u => u.email === attendeeEmail);
            if (attendee && attendee.id !== userId) {
              await this.notificationsService.sendNotification({
                user_id: attendee.id,
                type: NotificationType.CALENDAR,
                title: newAttendees.length > 0 && changes.length === 1 && changes[0] === 'attendees'
                  ? 'Added to Calendar Event'
                  : notificationTitle,
                message: newAttendees.length > 0 && changes.length === 1 && changes[0] === 'attendees'
                  ? `You've been added to "${eventTitle}" on ${eventDateFormatted} at ${eventTime}`
                  : notificationMessage,
                action_url: `/workspaces/${workspaceId}/calendar?date=${eventDate}&eventId=${masterEventId}`,
                priority: 'normal' as any,
                send_push: true, // Enable FCM push notification for mobile users
                data: {
                  category: 'calendar',
                  entity_type: 'event',
                  entity_id: masterEventId,
                  actor_id: userId,
                  workspace_id: workspaceId,
                  event_title: eventTitle,
                  event_start_time: eventStartTime,
                  changes: changes,
                }
              });
            }
          }
        } catch (error) {
          console.error(`Failed to send event update notification to attendee ${attendeeEmail}:`, error);
        }
      }

      // Send notifications to removed attendees
      for (const attendeeEmail of removedAttendees) {
        try {
          const attendeeUser = await this.db.searchUsers(attendeeEmail, { limit: 100 });
          if (attendeeUser && attendeeUser.users && attendeeUser.users.length > 0) {
            const attendee = attendeeUser.users.find(u => u.email === attendeeEmail);
            if (attendee && attendee.id !== userId) {
              await this.notificationsService.sendNotification({
                user_id: attendee.id,
                type: NotificationType.CALENDAR,
                title: 'Removed from Calendar Event',
                message: `You've been removed from "${eventTitle}" (was scheduled for ${eventDateFormatted} at ${eventTime})`,
                action_url: `/workspaces/${workspaceId}/calendar?date=${eventDate}`,
                priority: 'normal' as any,
                send_push: true, // Enable FCM push notification for mobile users
                data: {
                  category: 'calendar',
                  entity_type: 'event',
                  entity_id: masterEventId,
                  actor_id: userId,
                  workspace_id: workspaceId,
                  event_title: eventTitle,
                  event_start_time: eventStartTime,
                  removed: true,
                }
              });
            }
          }
        } catch (error) {
          console.error(`Failed to send event removal notification to attendee ${attendeeEmail}:`, error);
        }
      }

      // Send notifications to existing attendees (excluding newly added/removed and the organizer)
      const existingUnchangedAttendees = allCurrentAttendees.filter(
        email => !newAttendees.includes(email) && !removedAttendees.includes(email)
      );

      for (const attendeeEmail of existingUnchangedAttendees) {
        try {
          const attendeeUser = await this.db.searchUsers(attendeeEmail, { limit: 100 });
          if (attendeeUser && attendeeUser.users && attendeeUser.users.length > 0) {
            const attendee = attendeeUser.users.find(u => u.email === attendeeEmail);
            if (attendee && attendee.id !== userId) {
              await this.notificationsService.sendNotification({
                user_id: attendee.id,
                type: NotificationType.CALENDAR,
                title: notificationTitle,
                message: notificationMessage,
                action_url: `/workspaces/${workspaceId}/calendar?date=${eventDate}&eventId=${masterEventId}`,
                priority: 'normal' as any,
                send_push: true, // Enable FCM push notification for mobile users
                data: {
                  category: 'calendar',
                  entity_type: 'event',
                  entity_id: masterEventId,
                  actor_id: userId,
                  workspace_id: workspaceId,
                  event_title: eventTitle,
                  event_start_time: eventStartTime,
                  changes: changes,
                }
              });
            }
          }
        } catch (error) {
          console.error(`Failed to send event update notification to attendee ${attendeeEmail}:`, error);
        }
      }
    }

    // Update reminders if provided (use master event ID)
    if (updateEventDto.reminders !== undefined) {
      // Get the final event details (use updated values if provided, otherwise use original)
      const finalStartTime = updateEventDto.start_time || event.start_time;
      const finalEndTime = updateEventDto.end_time || event.end_time;
      const finalTitle = updateEventDto.title || event.title;
      const finalAttendees = attendees !== undefined ? attendees : (event.attendees || []);

      await this.updateEventReminders(
        masterEventId,
        updateEventDto.reminders,
        {
          eventTitle: finalTitle,
          startTime: finalStartTime,
          endTime: finalEndTime,
          organizerId: userId,
          attendeeEmails: finalAttendees,
          workspaceId: workspaceId,
        }
      );
    }

    // Send bot notifications for event updates
    if (changes.length > 0) {
      try {
        if (changes.includes('time')) {
          await this.eventBotReminderService.sendEventUpdateNotification(
            masterEventId,
            'time_changed',
            event.start_time,
            updateEventDto.start_time || event.start_time,
          );
        } else if (changes.includes('location')) {
          await this.eventBotReminderService.sendEventUpdateNotification(
            masterEventId,
            'location_changed',
            event.location,
            updateEventDto.location,
          );
        } else if (changes.includes('status') && updateEventDto.status === 'cancelled') {
          await this.eventBotReminderService.sendEventUpdateNotification(
            masterEventId,
            'cancelled',
          );
        } else if (changes.length > 0) {
          await this.eventBotReminderService.sendEventUpdateNotification(
            masterEventId,
            'details_changed',
          );
        }
      } catch (error) {
        this.logger.error(`Failed to send bot notification for event update: ${error.message}`);
      }
    }

    // Emit event updated event for workflow automation
    if (this.entityEventIntegration) {
      try {
        this.entityEventIntegration.emitEventUpdated(workspaceId, updatedEvent, event, userId);
      } catch (error) {
        console.error('[CalendarService] Failed to emit event updated event:', error);
      }
    }

    return updatedEvent;
  }

  async deleteEvent(eventId: string, workspaceId: string, userId: string) {
    const event = await this.getEventWithAccess(eventId, workspaceId, userId);

    // Extract master event ID for database operations
    const masterEventId = this.extractMasterEventId(eventId);

    // Check if user is the organizer
    if (event.organizer_id !== userId) {
      throw new BadRequestException('Only the event organizer can delete the event');
    }

    // Get attendees before deletion to send notifications
    const attendees = await this.getEventAttendees(masterEventId);
    console.log('deletion attendes',attendees)
    // Send deletion notifications to all attendees (except the organizer)
    if (attendees && attendees.length > 0) {
      const eventTime = new Date(event.start_time).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      const eventDateFormatted = new Date(event.start_time).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      for (const attendee of attendees) {
        if (attendee.user_id && attendee.user_id !== userId) {
          try {
            await this.notificationsService.sendNotification({
              user_id: attendee.user_id,
              type: NotificationType.CALENDAR,
              title: 'Calendar Event Cancelled',
              message: `The event "${event.title}" scheduled for ${eventDateFormatted} at ${eventTime} has been cancelled`,
              action_url: `/workspaces/${workspaceId}/calendar`,
              priority: 'normal' as any,
              data: {
                category: 'calendar',
                entity_type: 'event',
                entity_id: masterEventId,
                actor_id: userId,
                workspace_id: workspaceId,
                event_title: event.title,
                event_start_time: event.start_time,
                action: 'deleted'
              }
            });
          } catch (error) {
            console.error(`Failed to send event deletion notification to user ${attendee.user_id}:`, error);
          }
        }
      }
    }

    // Cancel room booking if exists (use master event ID)
    if (event.room_id) {
      await this.cancelRoomBooking(event.room_id, masterEventId);
    }

    // Cancel any scheduled reminder notifications for this event
    await this.cancelScheduledEventReminders(masterEventId);

    // Delete associated data (use master event ID)
    await this.deleteEventReminders(masterEventId);
    await this.deleteEventAttendees(masterEventId);

    // Delete the event (use master event ID)
    const result = await this.db.delete('calendar_events', masterEventId);

    // Emit event deleted event for workflow automation
    if (this.entityEventIntegration) {
      try {
        this.entityEventIntegration.emitEventDeleted(workspaceId, masterEventId, event, userId);
      } catch (error) {
        console.error('[CalendarService] Failed to emit event deleted event:', error);
      }
    }

    return result;
  }

  // ============================================
  // MEETING ROOM OPERATIONS
  // ============================================

  async createMeetingRoom(workspaceId: string, createMeetingRoomDto: CreateMeetingRoomDto, userId: string) {
    // Check if room code already exists
    if (createMeetingRoomDto.room_code) {
      const existingRoomResult = await this.db.find('meeting_rooms', {
        workspace_id: workspaceId,
        room_code: createMeetingRoomDto.room_code,
        is_active: true
      });

      const existingRoomData = Array.isArray(existingRoomResult.data) ? existingRoomResult.data : [];
      if (existingRoomData.length > 0) {
        throw new ConflictException('Room code already exists');
      }
    }

    const roomData = {
      workspace_id: workspaceId,
      ...createMeetingRoomDto,
      room_code: createMeetingRoomDto.room_code || `ROOM-${Date.now()}`,
      status: 'available',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return await this.db.insert('meeting_rooms', roomData);
  }

  async getMeetingRooms(workspaceId: string, available_only = false, capacity?: number) {
    const roomsQuery = await this.db.find('meeting_rooms', {
      workspace_id: workspaceId,
      is_active: true
    }, { orderBy: 'name', order: 'asc' });

    let rooms = Array.isArray(roomsQuery.data) ? roomsQuery.data : [];

    // Filter by availability
    if (available_only) {
      rooms = rooms.filter(room => room.status === 'available');
    }

    // Filter by minimum capacity
    if (capacity) {
      rooms = rooms.filter(room => room.capacity >= capacity);
    }

    return rooms;
  }

  async getMeetingRoom(roomId: string, workspaceId: string) {
    const roomQueryResult = await this.db.find('meeting_rooms', {
      id: roomId,
      workspace_id: workspaceId,
      is_active: true
    });

    const roomData = Array.isArray(roomQueryResult.data) ? roomQueryResult.data : [];
    if (roomData.length === 0) {
      throw new NotFoundException('Meeting room not found');
    }

    const room = roomData[0];

    // Get current and upcoming bookings
    const bookings = await this.getRoomBookings(roomId);

    return {
      ...room,
      bookings
    };
  }

  async updateMeetingRoom(roomId: string, workspaceId: string, updateData: Partial<CreateMeetingRoomDto>, userId: string) {
    const room = await this.getMeetingRoom(roomId, workspaceId);

    const updatedData = {
      ...updateData,
      updated_at: new Date().toISOString()
    };

    return await this.db.update('meeting_rooms', roomId, updatedData);
  }

  async deleteMeetingRoom(roomId: string, workspaceId: string, userId: string) {
    const room = await this.getMeetingRoom(roomId, workspaceId);

    // Check for active bookings
    const allBookingsResult = await this.db.find('room_bookings', {
      room_id: roomId,
      status: 'confirmed'
    });

    const allBookingsData = Array.isArray(allBookingsResult.data) ? allBookingsResult.data : [];

    // Filter for future bookings
    const now = new Date().toISOString();
    const activeBookingsData = allBookingsData.filter(booking =>
      booking.start_time >= now
    );

    if (activeBookingsData.length > 0) {
      throw new BadRequestException('Cannot delete room with active bookings');
    }

    // Soft delete the room
    return await this.db.update('meeting_rooms', roomId, {
      is_active: false,
      updated_at: new Date().toISOString()
    });
  }

  // ============================================
  // ROOM BOOKING OPERATIONS
  // ============================================

  async bookRoom(roomId: string, eventId: string, startTime: string, endTime: string, userId: string) {
    const bookingData = {
      room_id: roomId,
      event_id: eventId,
      booked_by: userId,
      start_time: startTime,
      end_time: endTime,
      status: 'confirmed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return await this.db.insert('room_bookings', bookingData);
  }

  async cancelRoomBooking(roomId: string, eventId: string) {
    const bookingQueryResult = await this.db.find('room_bookings', {
      room_id: roomId,
      event_id: eventId
    });

    const bookingData = Array.isArray(bookingQueryResult.data) ? bookingQueryResult.data : [];
    if (bookingData.length > 0) {
      const booking = bookingData[0];
      await this.db.update('room_bookings', booking.id, {
        status: 'cancelled',
        updated_at: new Date().toISOString()
      });
    }
  }

  async getRoomBookings(roomId: string, startDate?: string, endDate?: string) {
    // Using workaround pattern
    const allBookingsResult = await this.db.find('room_bookings', {});
    const allBookingsData = Array.isArray(allBookingsResult.data) ? allBookingsResult.data : [];
    let bookings = allBookingsData.filter(b =>
      b.room_id === roomId &&
      b.status !== 'cancelled'
    );

    // Filter by date range
    if (startDate) {
      bookings = bookings.filter(b => new Date(b.end_time) >= new Date(startDate));
    }
    if (endDate) {
      bookings = bookings.filter(b => new Date(b.start_time) <= new Date(endDate));
    }

    // Sort by start time
    bookings.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    return bookings;
  }

  async checkRoomAvailability(roomId: string, startTime: string, endTime: string, excludeEventId?: string) {
    const conflictingBookingsResult = await this.db.find('room_bookings', {
      room_id: roomId,
      status: 'confirmed'
    });

    const conflictingBookingsData = Array.isArray(conflictingBookingsResult.data) ? conflictingBookingsResult.data : [];

    console.log('Checking room availability:', {
      roomId,
      requestedStart: startTime,
      requestedEnd: endTime,
      existingBookings: conflictingBookingsData.length
    });

    const conflicts = conflictingBookingsData.filter(booking => {
      if (excludeEventId && booking.event_id === excludeEventId) {
        return false; // Skip current event when updating
      }

      const bookingStart = new Date(booking.start_time);
      const bookingEnd = new Date(booking.end_time);
      const requestStart = new Date(startTime);
      const requestEnd = new Date(endTime);

      // Check for time overlap
      const hasConflict = (requestStart < bookingEnd && requestEnd > bookingStart);

      if (hasConflict) {
        console.log('Conflict found:', {
          existingBooking: {
            event_id: booking.event_id,
            start: booking.start_time,
            end: booking.end_time
          },
          requested: {
            start: startTime,
            end: endTime
          }
        });
      }

      return hasConflict;
    });

    if (conflicts.length > 0) {
      throw new ConflictException('Meeting room is not available during the requested time');
    }

    return true;
  }

  // ============================================
  // EVENT ATTENDEES
  // ============================================

  private async addEventAttendees(eventId: string, attendeeEmails: string[]) {
    const attendeePromises = attendeeEmails.map(async (email) => {
      let userId = null;
      let userName = null;

      try {
        // Try to find user by email using search
        const searchResult = await this.db.searchUsers(email, { limit: 100 });
        if (searchResult && searchResult.users && searchResult.users.length > 0) {
          // Find the exact email match from the search results
          const user = searchResult.users.find(u => u.email === email);
          if (user) {
            userId = user.id;
            userName = (user as any).fullName || user.name;
          }
        }
      } catch (error) {
        console.warn(`Failed to find user by email ${email}:`, error.message);
        // Continue with null user_id if user search fails
      }

      return this.db.insert('event_attendees', {
        event_id: eventId,
        user_id: userId, // Will be null if user not found
        email: email, // Always store the provided email
        name: userName, // Will be null if user not found
        status: 'pending',
        created_at: new Date().toISOString()
      });
    });

    await Promise.all(attendeePromises);
  }

  private async getEventAttendees(eventId: string) {
    const attendeesQueryResult = await this.db.find('event_attendees', {
      event_id: eventId
    });

    const attendeesData = Array.isArray(attendeesQueryResult.data) ? attendeesQueryResult.data : [];

    // Enrich attendees with user names if missing
    const enrichedAttendees = await Promise.all(
      attendeesData.map(async (attendee) => {
        // If name is already set, return as-is
        if (attendee.name) {
          return attendee;
        }

        // Try to fetch user name from user_id
        if (attendee.user_id) {
          try {
            const userResult = await this.db.getUserById(attendee.user_id);
            if (userResult) {
              return {
                ...attendee,
                name: (userResult as any).fullName || (userResult as any).full_name || userResult.name || userResult.email
              };
            }
          } catch (error) {
            console.warn(`Failed to fetch user name for attendee ${attendee.user_id}:`, error.message);
          }
        }

        // Fallback to email if no name found
        return {
          ...attendee,
          name: attendee.email || attendee.user_id
        };
      })
    );

    return enrichedAttendees;
  }

  private async updateEventAttendees(eventId: string, attendeeEmails: string[]) {
    // Remove existing attendees
    await this.deleteEventAttendees(eventId);

    // Add new attendees
    if (attendeeEmails.length > 0) {
      await this.addEventAttendees(eventId, attendeeEmails);
    }
  }

  private async deleteEventAttendees(eventId: string) {
    const attendeesQueryResult = await this.db.find('event_attendees', {
      event_id: eventId
    });

    const attendeesData = Array.isArray(attendeesQueryResult.data) ? attendeesQueryResult.data : [];
    const deletePromises = attendeesData.map(attendee =>
      this.db.delete('event_attendees', attendee.id)
    );

    await Promise.all(deletePromises);
  }

  // ============================================
  // EVENT REMINDERS
  // ============================================

  private async addEventReminders(
    eventId: string,
    reminderMinutes: number[],
    eventDetails?: {
      eventTitle: string;
      startTime: string;
      endTime: string;
      organizerId: string;
      attendeeEmails: string[];
      workspaceId: string;
    }
  ) {
    // Normalize and validate reminderMinutes to ensure all values are integers
    const validReminderMinutes = reminderMinutes
      .map(minutes => {
        // Handle various input types
        if (typeof minutes === 'number') {
          return Math.floor(minutes);
        }
        if (typeof minutes === 'string') {
          const parsed = parseInt(minutes, 10);
          return isNaN(parsed) ? null : parsed;
        }
        // If it's an object or other type, try to extract a numeric value
        if (minutes && typeof minutes === 'object') {
          // Try common property names
          const val = (minutes as any).value ?? (minutes as any).minutes ?? (minutes as any).time;
          if (typeof val === 'number') return Math.floor(val);
          if (typeof val === 'string') {
            const parsed = parseInt(val, 10);
            return isNaN(parsed) ? null : parsed;
          }
        }
        return null;
      })
      .filter((m): m is number => m !== null && m >= 0);

    // Insert reminders into event_reminders table
    const reminderPromises = validReminderMinutes.map(minutes =>
      this.db.insert('event_reminders', {
        event_id: eventId,
        reminder_time: minutes,
        notification_type: 'email',
        created_at: new Date().toISOString()
      })
    );

    await Promise.all(reminderPromises);

    // Schedule notifications for all attendees if event details are provided
    if (eventDetails && validReminderMinutes.length > 0) {
      await this.scheduleEventReminderNotifications(eventId, validReminderMinutes, eventDetails);
    }
  }

  /**
   * Schedule reminder notifications for all event attendees and the organizer
   * Creates pending notifications in the notifications table that will be sent by the cron job
   */
  private async scheduleEventReminderNotifications(
    eventId: string,
    reminderMinutes: number[],
    eventDetails: {
      eventTitle: string;
      startTime: string;
      endTime: string;
      organizerId: string;
      attendeeEmails: string[];
      workspaceId: string;
    }
  ) {
    const { eventTitle, startTime, endTime, organizerId, attendeeEmails, workspaceId } = eventDetails;
    const eventStartTime = new Date(startTime);

    // Collect all user IDs to notify (organizer + attendees)
    const userIdsToNotify: string[] = [organizerId];

    // Resolve attendee emails to user IDs
    for (const attendeeEmail of attendeeEmails) {
      try {
        const searchResult = await this.db.searchUsers(attendeeEmail, { limit: 100 });
        if (searchResult && searchResult.users && searchResult.users.length > 0) {
          const attendee = searchResult.users.find(u => u.email === attendeeEmail);
          if (attendee && attendee.id !== organizerId) {
            userIdsToNotify.push(attendee.id);
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to resolve attendee email ${attendeeEmail} to user ID: ${error.message}`);
      }
    }

    // Remove duplicates
    const uniqueUserIds = [...new Set(userIdsToNotify)];

    this.logger.log(`[Calendar Reminders] Scheduling ${reminderMinutes.length} reminder(s) for ${uniqueUserIds.length} user(s) for event "${eventTitle}"`);

    // Format event time for display
    const eventTimeFormatted = eventStartTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    const eventDateFormatted = eventStartTime.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    // Schedule notifications for each reminder time and each user
    for (const minutes of reminderMinutes) {
      // Calculate the scheduled_at time (event start time - reminder minutes)
      const scheduledAt = new Date(eventStartTime.getTime() - (minutes * 60 * 1000));
      const now = new Date();

      // Add minimum 1 minute buffer to prevent immediate notifications
      const minimumScheduleTime = new Date(now.getTime() + 60 * 1000);

      // Skip if the scheduled time is in the past or too close to now
      if (scheduledAt <= minimumScheduleTime) {
        this.logger.warn(`[Calendar Reminders] Skipping ${minutes}-minute reminder for event "${eventTitle}" - scheduled time (${scheduledAt.toISOString()}) is in the past or too close to now (${now.toISOString()}). Event starts at: ${eventStartTime.toISOString()}`);
        continue;
      }

      // Create reminder message based on minutes
      const reminderText = this.formatReminderText(minutes);

      for (const userId of uniqueUserIds) {
        try {
          await this.notificationSchedulerService.scheduleNotification({
            user_id: userId,
            workspace_id: workspaceId,
            type: NotificationType.REMINDER,
            title: `Reminder: ${eventTitle}`,
            message: `Your event "${eventTitle}" starts ${reminderText} (${eventDateFormatted} at ${eventTimeFormatted})`,
            action_url: `/workspaces/${workspaceId}/calendar?date=${startTime}&eventId=${eventId}`,
            priority: 'normal',
            category: 'calendar',
            entity_type: 'event',
            entity_id: eventId,
            actor_id: organizerId,
            scheduled_at: scheduledAt.toISOString(),
            send_push: true,
            send_email: false,
            data: {
              event_id: eventId,
              event_title: eventTitle,
              event_start_time: startTime,
              event_end_time: endTime,
              reminder_minutes: minutes,
              workspace_id: workspaceId,
            },
          });

          this.logger.debug(`[Calendar Reminders] Scheduled ${minutes}-minute reminder for user ${userId} at ${scheduledAt.toISOString()}`);
        } catch (error) {
          this.logger.error(`[Calendar Reminders] Failed to schedule reminder for user ${userId}: ${error.message}`);
        }
      }
    }

    this.logger.log(`[Calendar Reminders] Successfully scheduled reminders for event "${eventTitle}"`);
  }

  /**
   * Format reminder time into human-readable text
   */
  private formatReminderText(minutes: number): string {
    if (minutes < 60) {
      return `in ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (remainingMinutes === 0) {
        return `in ${hours} hour${hours !== 1 ? 's' : ''}`;
      }
      return `in ${hours} hour${hours !== 1 ? 's' : ''} and ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
    } else {
      const days = Math.floor(minutes / 1440);
      const remainingHours = Math.floor((minutes % 1440) / 60);
      if (remainingHours === 0) {
        return `in ${days} day${days !== 1 ? 's' : ''}`;
      }
      return `in ${days} day${days !== 1 ? 's' : ''} and ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`;
    }
  }

  private async getEventReminders(eventId: string) {
    const remindersQueryResult = await this.db.find('event_reminders', {
      event_id: eventId
    });

    return Array.isArray(remindersQueryResult.data) ? remindersQueryResult.data : [];
  }

  private async updateEventReminders(
    eventId: string,
    reminderMinutes: number[],
    eventDetails?: {
      eventTitle: string;
      startTime: string;
      endTime: string;
      organizerId: string;
      attendeeEmails: string[];
      workspaceId: string;
    }
  ) {
    // Remove existing reminders from event_reminders table
    await this.deleteEventReminders(eventId);

    // Cancel existing scheduled reminder notifications for this event
    await this.cancelScheduledEventReminders(eventId);

    // Add new reminders
    if (reminderMinutes.length > 0) {
      await this.addEventReminders(eventId, reminderMinutes, eventDetails);
    }
  }

  /**
   * Cancel all scheduled reminder notifications for an event
   * This is used when reminders are updated or when the event is deleted
   */
  private async cancelScheduledEventReminders(eventId: string) {
    try {
      // Find all pending scheduled notifications for this event
      const result = await this.db.find('notifications', {
        entity_type: 'event',
        entity_id: eventId,
        is_scheduled: true,
        is_sent: false,
      });

      const notifications = Array.isArray(result.data) ? result.data : [];

      if (notifications.length === 0) {
        this.logger.debug(`[Calendar Reminders] No scheduled notifications to cancel for event ${eventId}`);
        return;
      }

      this.logger.log(`[Calendar Reminders] Cancelling ${notifications.length} scheduled reminder(s) for event ${eventId}`);

      // Update all notifications to cancelled status
      for (const notification of notifications) {
        await this.db.update('notifications', notification.id, {
          schedule_status: 'cancelled',
          updated_at: new Date().toISOString(),
        });
      }

      this.logger.log(`[Calendar Reminders] Successfully cancelled ${notifications.length} scheduled reminder(s)`);
    } catch (error) {
      this.logger.error(`[Calendar Reminders] Failed to cancel scheduled reminders for event ${eventId}: ${error.message}`);
    }
  }

  private async deleteEventReminders(eventId: string) {
    const remindersQueryResult = await this.db.find('event_reminders', {
      event_id: eventId
    });

    const remindersData = Array.isArray(remindersQueryResult.data) ? remindersQueryResult.data : [];
    const deletePromises = remindersData.map(reminder =>
      this.db.delete('event_reminders', reminder.id)
    );

    await Promise.all(deletePromises);
  }

  // ============================================
  // RECURRING EVENTS
  // ============================================

  private generateOccurrencesForDateRange(masterEvent: any, startDate: Date, endDate: Date): any[] {
    const occurrences = [];
    const rule = masterEvent.recurrence_rule;

    if (!rule || !rule.frequency) return [masterEvent];

    const interval = rule.interval || 1;
    const eventStartTime = new Date(masterEvent.start_time);
    const eventEndTime = new Date(masterEvent.end_time);
    const duration = eventEndTime.getTime() - eventStartTime.getTime();

    // Start from the master event date
    let currentDate = new Date(eventStartTime);
    let occurrenceCount = 0;
    const maxOccurrences = 100; // Safety limit to prevent infinite loops

    // If recurrence has an end date, use it (support both 'until' and 'endDate' field names)
    const ruleEndDate = rule.until || rule.endDate;
    const recurrenceEndDate = ruleEndDate ? new Date(ruleEndDate) : endDate;
    const effectiveEndDate = recurrenceEndDate < endDate ? recurrenceEndDate : endDate;

    while (currentDate <= effectiveEndDate && occurrenceCount < maxOccurrences) {
      // Check if this occurrence falls within our query range
      if (currentDate >= startDate && currentDate <= endDate) {
        // Create a virtual occurrence (not stored in DB)
        const occurrence = {
          ...masterEvent,
          id: `${masterEvent.id}_occurrence_${occurrenceCount}`,
          start_time: new Date(currentDate).toISOString(),
          end_time: new Date(currentDate.getTime() + duration).toISOString(),
          parent_event_id: masterEvent.id,
          is_occurrence: true
        };
        occurrences.push(occurrence);
      }

      // Calculate next occurrence date
      switch (rule.frequency) {
        case 'daily':
          currentDate.setDate(currentDate.getDate() + interval);
          break;
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + (7 * interval));
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + interval);
          break;
        case 'yearly':
          currentDate.setFullYear(currentDate.getFullYear() + interval);
          break;
      }

      occurrenceCount++;
    }

    return occurrences;
  }

  private async generateRecurringEvents(parentEvent: any, recurrenceRule: any) {
    // Simple recurring event generation logic
    // In a real implementation, you'd use a library like rrule for complex recurrence patterns

    const occurrences = recurrenceRule.occurrences || 10; // Default to 10 occurrences
    const frequency = recurrenceRule.frequency;
    const interval = recurrenceRule.interval || 1;

    const startDate = new Date(parentEvent.start_time);
    const endDate = new Date(parentEvent.end_time);
    const duration = endDate.getTime() - startDate.getTime();

    const recurringEvents = [];

    for (let i = 1; i < occurrences; i++) {
      let nextStart: Date;

      switch (frequency) {
        case 'daily':
          nextStart = new Date(startDate.getTime() + (i * interval * 24 * 60 * 60 * 1000));
          break;
        case 'weekly':
          nextStart = new Date(startDate.getTime() + (i * interval * 7 * 24 * 60 * 60 * 1000));
          break;
        case 'monthly':
          nextStart = new Date(startDate);
          nextStart.setMonth(startDate.getMonth() + (i * interval));
          break;
        case 'yearly':
          nextStart = new Date(startDate);
          nextStart.setFullYear(startDate.getFullYear() + (i * interval));
          break;
        default:
          continue;
      }

      const nextEnd = new Date(nextStart.getTime() + duration);

      // Check if we've exceeded the end date (support both 'until' and 'endDate')
      const ruleEndDate = recurrenceRule.until || recurrenceRule.endDate;
      if (ruleEndDate && nextStart > new Date(ruleEndDate)) {
        break;
      }

      const recurringEventData = {
        ...parentEvent,
        id: undefined, // Let the database generate a new ID
        start_time: nextStart.toISOString(),
        end_time: nextEnd.toISOString(),
        parent_event_id: parentEvent.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const recurringEvent = await this.db.insert('calendar_events', recurringEventData);
      recurringEvents.push(recurringEvent);

      // Copy attendees and reminders for each recurring event
      if (parentEvent.attendees && parentEvent.attendees.length > 0) {
        await this.addEventAttendees(recurringEvent.id, parentEvent.attendees);
      }
    }

    return recurringEvents;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private async getEventWithAccess(eventId: string, workspaceId: string, userId: string) {
    // Extract master event ID if this is an occurrence ID
    const masterEventId = this.extractMasterEventId(eventId);

    const eventQueryResult = await this.db.find('calendar_events', {
      id: masterEventId,
      workspace_id: workspaceId
    });

    const eventData = Array.isArray(eventQueryResult.data) ? eventQueryResult.data : [];
    if (eventData.length === 0) {
      throw new NotFoundException('Event not found');
    }

    const event = eventData[0];

    // Check if user has permission to modify this event
    if (event.organizer_id !== userId) {
      throw new BadRequestException('Only the event organizer can modify this event');
    }

    return event;
  }

  private extractMasterEventId(eventId: string): string {
    // Handle occurrence IDs like "uuid_occurrence_1"
    if (eventId.includes('_occurrence_')) {
      return eventId.split('_occurrence_')[0];
    }
    return eventId;
  }

  async respondToEvent(eventId: string, userId: string, response: 'accepted' | 'declined' | 'tentative') {
    // Extract master event ID for database operations
    const masterEventId = this.extractMasterEventId(eventId);

    // Find the attendee record (use master event ID)
    const attendeeQueryResult = await this.db.find('event_attendees', {
      event_id: masterEventId,
      user_id: userId
    });

    const attendeeData = Array.isArray(attendeeQueryResult.data) ? attendeeQueryResult.data : [];
    if (attendeeData.length === 0) {
      throw new NotFoundException('You are not invited to this event');
    }

    const attendee = attendeeData[0];

    // Update the response
    return await this.db.update('event_attendees', attendee.id, {
      status: response,
      response_at: new Date().toISOString()
    });
  }

  // ============================================
  // EVENT CATEGORY OPERATIONS
  // ============================================

  async createEventCategory(workspaceId: string, createEventCategoryDto: CreateEventCategoryDto, userId: string) {
    // Check if category name already exists in workspace
    const existingCategoryResult = await this.db.table('event_categories')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .where('name', '=', createEventCategoryDto.name)
      .execute();

    const existingCategories = existingCategoryResult.data || [];
    if (existingCategories.length > 0) {
      throw new ConflictException('Category with this name already exists in the workspace');
    }

    const categoryData = {
      workspace_id: workspaceId,
      name: createEventCategoryDto.name,
      description: createEventCategoryDto.description,
      color: createEventCategoryDto.color,
      icon: createEventCategoryDto.icon,
      description_file_ids: createEventCategoryDto.description_file_ids || [],
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return await this.db.insert('event_categories', categoryData);
  }

  async getEventCategories(workspaceId: string) {
    const categoriesResult = await this.db.table('event_categories')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .execute();

    return categoriesResult.data || [];
  }

  async getEventCategory(categoryId: string, workspaceId: string) {
    const categoryResult = await this.db.table('event_categories')
      .select('*')
      .where('id', '=', categoryId)
      .where('workspace_id', '=', workspaceId)
      .execute();

    const categories = categoryResult.data || [];
    if (categories.length === 0) {
      throw new NotFoundException('Category not found');
    }

    return categories[0];
  }

  async updateEventCategory(categoryId: string, workspaceId: string, updateEventCategoryDto: UpdateEventCategoryDto, userId: string) {
    // Check if category exists
    const category = await this.getEventCategory(categoryId, workspaceId);

    // If changing name, check for duplicates
    if (updateEventCategoryDto.name && updateEventCategoryDto.name !== category.name) {
      const duplicateResult = await this.db.table('event_categories')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('name', '=', updateEventCategoryDto.name)
        .where('id', '!=', categoryId)
        .execute();

      const duplicates = duplicateResult.data || [];
      if (duplicates.length > 0) {
        throw new ConflictException('Category with this name already exists in the workspace');
      }
    }

    const updateData = {
      ...updateEventCategoryDto,
      updated_at: new Date().toISOString()
    };

    return await this.db.update('event_categories', categoryId, updateData);
  }

  async deleteEventCategory(categoryId: string, workspaceId: string, userId: string) {
    // Check if category exists and belongs to workspace
    const categoryResult = await this.db.table('event_categories')
      .select('*')
      .where('id', '=', categoryId)
      .where('workspace_id', '=', workspaceId)
      .execute();

    if (!categoryResult.data || categoryResult.data.length === 0) {
      throw new NotFoundException('Category not found');
    }

    // TODO: Check if category is in use by any events
    // Note: Skipping this check temporarily because category_id column
    // doesn't exist in calendar_events table due to migration issues

    // For now, we'll just delete the category
    // In production, you'd want to fix the migration to add the category_id column

    await this.db.delete('event_categories', categoryId);

    return { message: 'Category deleted successfully' };
  }

  // ============================================
  // FILE UPLOAD HELPER METHODS
  // ============================================

  /**
   * Upload multiple files for calendar events to storage service
   * @param files Array of uploaded files
   * @param workspaceId Workspace ID for organizing files
   * @param userId User ID who is uploading
   * @returns Array of file URLs
   */
  private async uploadEventFiles(files: Express.Multer.File[], workspaceId: string, userId: string): Promise<string[]> {
    const uploadPromises = files.map(async (file) => {
      try {
        // Generate unique file name with workspace and timestamp
        const timestamp = Date.now();
        const fileName = `${workspaceId}/${userId}/${timestamp}-${file.originalname}`;

        // Upload file to storage service using calendar-events bucket
        const uploadResult = await /* TODO: use StorageService */ this.db.uploadFile(
          'calendar-events', // This is the virtual bucket name for calendar attachments
          file.buffer,
          fileName,
          {
            contentType: file.mimetype,
            metadata: {
              workspaceId,
              userId,
              originalName: file.originalname,
              uploadType: 'calendar-event-attachment',
              uploadedAt: new Date().toISOString(),
            },
          }
        );

        console.log('Calendar event file uploaded successfully:', {
          originalName: file.originalname,
          fileName,
          url: uploadResult.url
        });

        return uploadResult.url;
      } catch (error) {
        console.error('Failed to upload calendar event file:', {
          fileName: file.originalname,
          error: error.message
        });
        throw new BadRequestException(`Failed to upload file: ${file.originalname}`);
      }
    });

    return Promise.all(uploadPromises);
  }

  // ============================================
  // AI SCHEDULING ASSISTANT
  // ============================================

  async getAISchedulingSuggestions(
    workspaceId: string,
    requestDto: AISchedulingRequestDto,
    userId: string,
  ): Promise<AISchedulingResponseDto> {
    try {
      // Set default lookAheadDays if not provided
      const lookAheadDays = requestDto.lookAheadDays || 7;
      const includeWeekends = requestDto.includeWeekends || false;

      // Calculate date range for analysis
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + lookAheadDays);

      // Get user's existing events in the time window
      const existingEvents = await this.getEvents(
        workspaceId,
        startDate.toISOString(),
        endDate.toISOString(),
        userId,
        {}
      );

      // Get available meeting rooms
      const availableRooms = await this.getMeetingRooms(workspaceId, true);

      // Generate business hours time slots
      const timeSlots = this.generateTimeSlots(
        startDate,
        endDate,
        requestDto.duration,
        includeWeekends,
        requestDto.timePreference
      );

      // Filter out conflicting time slots
      const availableSlots = this.filterAvailableSlots(
        timeSlots,
        existingEvents || [],
        requestDto.attendees || []
      );

      // Prepare AI context for analysis
      const aiContext = this.prepareAIContext(
        requestDto,
        existingEvents || [],
        availableRooms || [],
        availableSlots
      );

      // Call AI service for intelligent suggestions
      const aiResponse = await this.aiProvider.generateText(
        aiContext,
        {
          saveToDatabase: false
        }
      );

      // Parse AI response and generate structured suggestions
      const suggestions = this.parseAIResponse(
        aiResponse.text,
        availableSlots,
        availableRooms || []
      );

      return {
        success: true,
        summary: `Looking for a ${requestDto.duration}-minute ${requestDto.title.toLowerCase()} for ${(requestDto.attendees?.length || 0) + 1} attendees`,
        suggestions,
        insights: this.generateInsights(existingEvents || [], availableSlots, requestDto),
        constraints: this.identifyConstraints(existingEvents || [], availableSlots),
        alternatives: this.generateAlternatives(requestDto, availableSlots)
      };

    } catch (error) {
      console.error('AI Scheduling Assistant error:', error);
      throw new InternalServerErrorException('Failed to generate AI scheduling suggestions');
    }
  }

  private generateTimeSlots(
    startDate: Date,
    endDate: Date,
    duration: number,
    includeWeekends: boolean,
    timePreference?: string
  ): Array<{ startTime: Date; endTime: Date }> {
    const slots: Array<{ startTime: Date; endTime: Date }> = [];
    const current = new Date(startDate);

    // Business hours configuration
    const businessStart = timePreference === 'morning' ? 9 : timePreference === 'afternoon' ? 13 : 9;
    const businessEnd = timePreference === 'morning' ? 12 : timePreference === 'afternoon' ? 17 : 17;

    while (current <= endDate) {
      const dayOfWeek = current.getDay();

      // Skip weekends if not included
      if (!includeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
        current.setDate(current.getDate() + 1);
        continue;
      }

      // Generate slots for business hours
      for (let hour = businessStart; hour < businessEnd; hour++) {
        const slotStart = new Date(current);
        slotStart.setHours(hour, 0, 0, 0);

        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + duration);

        // Only add if slot ends before business hours end
        if (slotEnd.getHours() <= businessEnd) {
          slots.push({
            startTime: new Date(slotStart),
            endTime: new Date(slotEnd)
          });
        }
      }

      current.setDate(current.getDate() + 1);
    }

    return slots;
  }

  private filterAvailableSlots(
    timeSlots: Array<{ startTime: Date; endTime: Date }>,
    existingEvents: any[],
    attendees: string[]
  ): Array<{ startTime: Date; endTime: Date }> {
    return timeSlots.filter(slot => {
      // Check for conflicts with existing events
      return !existingEvents.some(event => {
        const eventStart = new Date(event.start_time);
        const eventEnd = new Date(event.end_time);

        // Check if slot overlaps with existing event
        return (slot.startTime < eventEnd && slot.endTime > eventStart);
      });
    });
  }

  private prepareAIContext(
    requestDto: AISchedulingRequestDto,
    existingEvents: any[],
    availableRooms: any[],
    availableSlots: Array<{ startTime: Date; endTime: Date }>
  ): string {
    const context = `
As an AI scheduling assistant, analyze the following information and provide intelligent scheduling recommendations:

EVENT REQUEST:
- Title: ${requestDto.title}
- Description: ${requestDto.description || 'No description provided'}
- Duration: ${requestDto.duration} minutes
- Priority: ${requestDto.priority}
- Attendees: ${requestDto.attendees?.length || 0} people
- Time Preference: ${requestDto.timePreference || 'flexible'}
- Location: ${requestDto.location || 'flexible'}

EXISTING EVENTS THIS WEEK:
${existingEvents.map(event =>
      `- ${event.title}: ${new Date(event.start_time).toLocaleDateString()} ${new Date(event.start_time).toLocaleTimeString()} - ${new Date(event.end_time).toLocaleTimeString()}`
    ).join('\n') || 'No existing events'}

AVAILABLE MEETING ROOMS:
${availableRooms.map(room =>
      `- ${room.name} (${room.capacity} people, ${room.room_type}): ${room.equipment?.join(', ') || 'basic setup'}`
    ).join('\n') || 'No meeting rooms available'}

AVAILABLE TIME SLOTS:
${availableSlots.slice(0, 10).map(slot =>
      `- ${slot.startTime.toLocaleDateString()} ${slot.startTime.toLocaleTimeString()} - ${slot.endTime.toLocaleTimeString()}`
    ).join('\n')}

Please provide scheduling recommendations in the following JSON format:
{
  "topRecommendations": [
    {
      "startTime": "ISO_DATE_STRING",
      "endTime": "ISO_DATE_STRING", 
      "confidence": 85,
      "reason": "Clear explanation why this time is optimal",
      "considerations": ["Any potential issues or notes"]
    }
  ],
  "insights": ["Key insights about scheduling patterns", "Attendee preferences", "Room availability"],
  "alternatives": ["Alternative suggestions if primary times don't work"]
}

Focus on providing 3-5 high-quality recommendations with confidence scores based on:
1. Time preference alignment
2. Existing calendar gaps
3. Room availability and suitability
4. Priority level consideration
5. Attendee convenience
`;

    return context;
  }

  private parseAIResponse(
    aiResponse: string,
    availableSlots: Array<{ startTime: Date; endTime: Date }>,
    availableRooms: any[]
  ): TimeSlotSuggestion[] {
    try {
      // Try to extract JSON from AI response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      let aiData;

      if (jsonMatch) {
        aiData = JSON.parse(jsonMatch[0]);
      }

      const suggestions: TimeSlotSuggestion[] = [];

      // If AI provided structured recommendations, use them
      if (aiData?.topRecommendations) {
        aiData.topRecommendations.forEach((rec: any, index: number) => {
          if (index < 5) { // Limit to top 5
            suggestions.push({
              startTime: rec.startTime,
              endTime: rec.endTime,
              confidence: rec.confidence || 70,
              reason: rec.reason || 'AI recommended time slot',
              considerations: rec.considerations || [],
              availableRooms: availableRooms.slice(0, 3).map(room => ({
                id: room.id,
                name: room.name,
                capacity: room.capacity,
                equipment: room.equipment || []
              }))
            });
          }
        });
      }

      // Fallback: If AI parsing fails, create suggestions from available slots
      if (suggestions.length === 0) {
        availableSlots.slice(0, 5).forEach((slot, index) => {
          suggestions.push({
            startTime: slot.startTime.toISOString(),
            endTime: slot.endTime.toISOString(),
            confidence: 80 - (index * 5), // Decreasing confidence
            reason: `Available time slot with no conflicts`,
            considerations: index === 0 ? [] : [`${index + 1} other options available`],
            availableRooms: availableRooms.slice(0, 2).map(room => ({
              id: room.id,
              name: room.name,
              capacity: room.capacity,
              equipment: room.equipment || []
            }))
          });
        });
      }

      return suggestions;

    } catch (error) {
      console.error('Error parsing AI response:', error);

      // Fallback to basic suggestions
      return availableSlots.slice(0, 3).map((slot, index) => ({
        startTime: slot.startTime.toISOString(),
        endTime: slot.endTime.toISOString(),
        confidence: 75,
        reason: 'Available time slot based on calendar analysis',
        considerations: [],
        availableRooms: availableRooms.slice(0, 2).map(room => ({
          id: room.id,
          name: room.name,
          capacity: room.capacity,
          equipment: room.equipment || []
        }))
      }));
    }
  }

  private generateInsights(
    existingEvents: any[],
    availableSlots: Array<{ startTime: Date; endTime: Date }>,
    requestDto: AISchedulingRequestDto
  ): string[] {
    const insights: string[] = [];

    // Analyze calendar density
    if (existingEvents.length > 5) {
      insights.push('Calendar appears busy - consider shorter meetings or off-peak hours');
    } else if (existingEvents.length === 0) {
      insights.push('Calendar is relatively free - flexibility in scheduling');
    }

    // Time preference insights
    if (requestDto.timePreference === 'morning') {
      insights.push('Morning slots typically have better attendance and energy levels');
    }

    // Meeting duration insights
    if (requestDto.duration > 120) {
      insights.push('Consider breaking longer meetings into shorter sessions');
    }

    // Priority-based insights
    if (requestDto.priority === 'urgent' || requestDto.priority === 'high') {
      insights.push('High priority event - recommend earliest available slot');
    }

    return insights;
  }

  private identifyConstraints(
    existingEvents: any[],
    availableSlots: Array<{ startTime: Date; endTime: Date }>
  ): string[] {
    const constraints: string[] = [];

    if (availableSlots.length < 3) {
      constraints.push('Limited availability - consider extending date range');
    }

    // Check for clustering of events
    const eventsByDay = existingEvents.reduce((acc, event) => {
      const day = new Date(event.start_time).toDateString();
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {});

    const busyDays = Object.entries(eventsByDay).filter(([_, count]) => Number(count) > 3);
    if (busyDays.length > 0) {
      constraints.push(`Heavy meeting days: ${busyDays.map(([day]) => day).join(', ')}`);
    }

    return constraints;
  }

  private generateAlternatives(
    requestDto: AISchedulingRequestDto,
    availableSlots: Array<{ startTime: Date; endTime: Date }>
  ): string[] {
    const alternatives: string[] = [];

    if (requestDto.duration > 60) {
      alternatives.push(`Consider shortening to ${requestDto.duration - 30} minutes for more availability`);
    }

    if (availableSlots.length < 5) {
      alternatives.push('Extend search to next week for more options');
    }

    if (requestDto.timePreference) {
      alternatives.push('Consider flexible timing for better availability');
    }

    return alternatives;
  }

  // ============================================
  // SMART AI SCHEDULING ASSISTANT
  // ============================================

  async getSmartAISchedulingSuggestions(
    workspaceId: string,
    requestDto: SmartAISchedulingRequestDto,
    userId: string,
  ): Promise<SmartAISchedulingResponseDto> {
    try {
      // Set default values
      const maxLookAheadDays = requestDto.maxLookAheadDays || 14;
      const includeWeekends = requestDto.includeWeekends || false;
      const timezone = requestDto.timezone || 'UTC';

      // Calculate date range for analysis
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + maxLookAheadDays);

      // Get user's existing events for broader context
      const existingEvents = await this.getEvents(
        workspaceId,
        startDate.toISOString(),
        endDate.toISOString(),
        userId,
        {}
      );

      // Get available meeting rooms
      const availableRooms = await this.getMeetingRooms(workspaceId, true);

      // Get workspace members for attendee validation
      const workspaceMembers = await this.getWorkspaceMembers(workspaceId);

      // Phase 1: Parse and extract information from the prompt
      const extractedInfo = await this.parseSchedulingPrompt(
        requestDto.prompt,
        requestDto.context,
        requestDto.additionalNotes,
        workspaceMembers,
        timezone
      );

      // Phase 2: Generate time slots based on extracted information
      const intelligentTimeSlots = await this.generateIntelligentTimeSlots(
        startDate,
        endDate,
        extractedInfo,
        includeWeekends,
        timezone
      );

      // Phase 3: Filter and rank suggestions
      const smartSuggestions = await this.generateSmartSuggestions(
        intelligentTimeSlots,
        extractedInfo,
        existingEvents || [],
        availableRooms || [],
        requestDto.prompt
      );

      // Phase 4: Generate insights and recommendations
      const insights = await this.generateSmartInsights(
        requestDto.prompt,
        extractedInfo,
        smartSuggestions,
        existingEvents || []
      );

      return {
        success: true,
        interpretation: await this.generateInterpretation(requestDto.prompt, extractedInfo),
        extractedInfo,
        suggestions: smartSuggestions,
        insights: insights.insights,
        missingInfo: insights.missingInfo,
        clarifyingQuestions: insights.clarifyingQuestions,
        alternatives: insights.alternatives,
        followUpSuggestions: insights.followUpSuggestions
      };

    } catch (error) {
      console.error('Smart AI Scheduling Assistant error:', error);
      throw new InternalServerErrorException('Failed to generate smart AI scheduling suggestions');
    }
  }

  private async parseSchedulingPrompt(
    prompt: string,
    context?: string,
    additionalNotes?: string,
    workspaceMembers?: any[],
    timezone?: string
  ): Promise<ParsedSchedulingInfo> {
    // Create AI prompt for intelligent parsing
    const parsePrompt = `
As an expert scheduling assistant, analyze this natural language request and extract structured information:

USER REQUEST: "${prompt}"
CONTEXT: ${context || 'Not specified'}
ADDITIONAL NOTES: ${additionalNotes || 'None'}
TIMEZONE: ${timezone}

WORKSPACE MEMBERS: ${workspaceMembers?.map(m => `${m.name || m.email} (${m.email})`).join(', ') || 'None available'}

Extract and infer the following information. Use intelligent reasoning to fill gaps:

RETURN A JSON OBJECT WITH THIS EXACT STRUCTURE:
{
  "title": "Clear, professional meeting title",
  "description": "Detailed description of what the meeting is about",
  "estimatedDuration": 60,
  "priority": "low|normal|high|urgent",
  "attendees": ["email1@domain.com", "email2@domain.com"],
  "preferredLocation": "Room preference or 'flexible'",
  "timePreferences": ["morning", "next week", "avoid Fridays"],
  "requirements": ["projector", "video equipment"],
  "constraints": ["all attendees must be present", "avoid lunch hours"],
  "confidence": 85
}

INTELLIGENCE RULES:
1. If duration not specified, infer from meeting type (standup=15min, team meeting=60min, workshop=120min)
2. Extract names/emails and match to workspace members when possible
3. Infer priority from urgency words (urgent, ASAP, important, etc.)
4. Guess location needs from meeting type (presentation=projector, video call=video equipment)
5. Extract time clues (next week, morning, avoid Friday, etc.)
6. Set confidence based on how much info is explicitly vs inferred

BE SMART: Fill in reasonable defaults and make intelligent assumptions.
`;

    try {
      const aiResponse = await this.aiProvider.generateText(parsePrompt, {
        saveToDatabase: false
      });

      // Parse AI response
      const jsonMatch = aiResponse.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          title: parsed.title || 'Meeting',
          description: parsed.description || 'Meeting description',
          estimatedDuration: parsed.estimatedDuration || 60,
          priority: parsed.priority || 'normal',
          attendees: parsed.attendees || [],
          preferredLocation: parsed.preferredLocation || 'flexible',
          timePreferences: parsed.timePreferences || [],
          requirements: parsed.requirements || [],
          constraints: parsed.constraints || [],
          confidence: parsed.confidence || 70
        };
      }
    } catch (error) {
      console.error('Error parsing scheduling prompt:', error);
    }

    // Fallback: Basic extraction
    return this.basicPromptParsing(prompt, workspaceMembers);
  }

  private basicPromptParsing(prompt: string, workspaceMembers?: any[]): ParsedSchedulingInfo {
    const lowerPrompt = prompt.toLowerCase();

    // Basic title extraction
    let title = 'Meeting';
    if (lowerPrompt.includes('standup')) title = 'Standup Meeting';
    else if (lowerPrompt.includes('review')) title = 'Review Meeting';
    else if (lowerPrompt.includes('planning')) title = 'Planning Session';
    else if (lowerPrompt.includes('workshop')) title = 'Workshop';

    // Basic duration inference
    let duration = 60;
    if (lowerPrompt.includes('standup') || lowerPrompt.includes('quick')) duration = 15;
    else if (lowerPrompt.includes('workshop') || lowerPrompt.includes('training')) duration = 120;
    else if (lowerPrompt.includes('brief')) duration = 30;

    // Basic priority inference
    let priority = 'normal';
    if (lowerPrompt.includes('urgent') || lowerPrompt.includes('asap')) priority = 'urgent';
    else if (lowerPrompt.includes('important') || lowerPrompt.includes('critical')) priority = 'high';

    // Extract potential attendees
    const attendees: string[] = [];
    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
    const emails = prompt.match(emailRegex) || [];
    attendees.push(...emails);

    // Extract names and try to match with workspace members
    const names: string[] = prompt.match(/\b[A-Z][a-z]+\b/g) || [];
    if (workspaceMembers) {
      names.forEach((name: string) => {
        const member = workspaceMembers.find(m =>
          m.name?.toLowerCase().includes(name.toLowerCase()) ||
          m.email?.toLowerCase().includes(name.toLowerCase())
        );
        if (member && !attendees.includes(member.email)) {
          attendees.push(member.email);
        }
      });
    }

    return {
      title,
      description: prompt,
      estimatedDuration: duration,
      priority,
      attendees,
      preferredLocation: 'flexible',
      timePreferences: [],
      requirements: [],
      constraints: [],
      confidence: 60
    };
  }

  private async generateIntelligentTimeSlots(
    startDate: Date,
    endDate: Date,
    extractedInfo: ParsedSchedulingInfo,
    includeWeekends: boolean,
    timezone: string
  ): Promise<Array<{ startTime: Date; endTime: Date; score: number }>> {
    const slots: Array<{ startTime: Date; endTime: Date; score: number }> = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const dayOfWeek = current.getDay();

      // Skip weekends if not included
      if (!includeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
        current.setDate(current.getDate() + 1);
        continue;
      }

      // Generate slots based on time preferences
      const hourRanges = this.getPreferredHours(extractedInfo.timePreferences);

      for (const hourRange of hourRanges) {
        for (let hour = hourRange.start; hour < hourRange.end; hour++) {
          const slotStart = new Date(current);
          slotStart.setHours(hour, 0, 0, 0);

          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotEnd.getMinutes() + extractedInfo.estimatedDuration);

          // Calculate score based on preferences
          const score = this.calculateTimeSlotScore(slotStart, extractedInfo, dayOfWeek);

          if (slotEnd.getHours() <= hourRange.end) {
            slots.push({
              startTime: new Date(slotStart),
              endTime: new Date(slotEnd),
              score
            });
          }
        }
      }

      current.setDate(current.getDate() + 1);
    }

    // Sort by score (highest first)
    return slots.sort((a, b) => b.score - a.score).slice(0, 20);
  }

  private getPreferredHours(timePreferences: string[]): Array<{ start: number, end: number, weight: number }> {
    const ranges = [];

    if (timePreferences.some(p => p.includes('morning'))) {
      ranges.push({ start: 9, end: 12, weight: 1.0 });
    }
    if (timePreferences.some(p => p.includes('afternoon'))) {
      ranges.push({ start: 13, end: 17, weight: 1.0 });
    }
    if (timePreferences.some(p => p.includes('evening'))) {
      ranges.push({ start: 17, end: 19, weight: 0.8 });
    }

    // Default business hours if no preference
    if (ranges.length === 0) {
      ranges.push({ start: 9, end: 17, weight: 1.0 });
    }

    return ranges;
  }

  private calculateTimeSlotScore(slotStart: Date, extractedInfo: ParsedSchedulingInfo, dayOfWeek: number): number {
    let score = 100;

    // Time of day preferences
    const hour = slotStart.getHours();
    if (hour >= 9 && hour <= 11) score += 20; // Morning boost
    if (hour >= 14 && hour <= 16) score += 15; // Afternoon boost
    if (hour < 8 || hour > 18) score -= 30; // Penalize early/late

    // Day of week preferences
    if (dayOfWeek >= 2 && dayOfWeek <= 4) score += 15; // Tue-Thu boost
    if (dayOfWeek === 1) score += 10; // Monday boost
    if (dayOfWeek === 5) score -= 10; // Friday penalty

    // Priority adjustments
    if (extractedInfo.priority === 'urgent') score += 25;
    else if (extractedInfo.priority === 'high') score += 15;

    // Constraint penalties
    if (extractedInfo.constraints.some(c => c.includes('Friday') || c.includes('friday')) && dayOfWeek === 5) {
      score -= 50;
    }

    return Math.max(0, Math.min(100, score));
  }

  private async generateSmartSuggestions(
    timeSlots: Array<{ startTime: Date; endTime: Date; score: number }>,
    extractedInfo: ParsedSchedulingInfo,
    existingEvents: any[],
    availableRooms: any[],
    originalPrompt: string
  ): Promise<SmartTimeSlotSuggestion[]> {
    const suggestions: SmartTimeSlotSuggestion[] = [];

    // Filter out conflicting time slots
    const availableSlots = timeSlots.filter(slot => {
      return !existingEvents.some(event => {
        const eventStart = new Date(event.start_time);
        const eventEnd = new Date(event.end_time);
        return (slot.startTime < eventEnd && slot.endTime > eventStart);
      });
    });

    // Take top 5 slots
    const topSlots = availableSlots.slice(0, 5);

    for (const slot of topSlots) {
      // Find best room for this slot
      const roomRecommendation = this.findBestRoom(extractedInfo, availableRooms);

      suggestions.push({
        startTime: slot.startTime.toISOString(),
        endTime: slot.endTime.toISOString(),
        confidence: slot.score,
        reasoning: await this.generateSlotReasoning(slot, extractedInfo, originalPrompt),
        promptMatchScore: this.calculatePromptMatchScore(slot, extractedInfo, originalPrompt),
        considerations: this.generateConsiderations(slot, extractedInfo, existingEvents),
        recommendedRoom: roomRecommendation.best,
        alternativeRooms: roomRecommendation.alternatives
      });
    }

    return suggestions;
  }

  private findBestRoom(extractedInfo: ParsedSchedulingInfo, availableRooms: any[]) {
    if (!availableRooms.length) {
      return { best: undefined, alternatives: [] };
    }

    // Score rooms based on requirements
    const scoredRooms = availableRooms.map(room => {
      let score = 50;

      // Capacity match
      const neededCapacity = extractedInfo.attendees.length + 1;
      if (room.capacity >= neededCapacity) score += 20;
      if (room.capacity >= neededCapacity * 1.5) score += 10; // Extra space bonus

      // Equipment match
      const requiredEquipment = extractedInfo.requirements;
      requiredEquipment.forEach(req => {
        if (room.equipment?.some((eq: string) => eq.toLowerCase().includes(req.toLowerCase()))) {
          score += 15;
        }
      });

      // Room type preference
      if (extractedInfo.preferredLocation.includes('conference') && room.room_type === 'conference') score += 15;
      if (extractedInfo.preferredLocation.includes('meeting') && room.room_type === 'meeting') score += 15;

      return { ...room, score };
    });

    scoredRooms.sort((a, b) => b.score - a.score);

    const best = scoredRooms[0];
    const alternatives = scoredRooms.slice(1, 4);

    return {
      best: best ? {
        id: best.id,
        name: best.name,
        capacity: best.capacity,
        equipment: best.equipment || [],
        whyRecommended: `Best match for ${extractedInfo.attendees.length + 1} attendees with required equipment`
      } : undefined,
      alternatives: alternatives.map(room => ({
        id: room.id,
        name: room.name,
        capacity: room.capacity,
        equipment: room.equipment || [],
        note: `Alternative option${room.capacity < (extractedInfo.attendees.length + 1) ? ' (tight fit)' : ''}`
      }))
    };
  }

  private async generateSlotReasoning(
    slot: { startTime: Date; endTime: Date; score: number },
    extractedInfo: ParsedSchedulingInfo,
    originalPrompt: string
  ): Promise<string> {
    const reasons = [];

    // Time-based reasoning
    const hour = slot.startTime.getHours();
    if (hour >= 9 && hour <= 11) reasons.push('optimal morning time slot');
    else if (hour >= 14 && hour <= 16) reasons.push('productive afternoon time');

    // Day-based reasoning
    const dayName = slot.startTime.toLocaleDateString('en-US', { weekday: 'long' });
    if (['Tuesday', 'Wednesday', 'Thursday'].includes(dayName)) {
      reasons.push(`${dayName} is typically a high-productivity day`);
    }

    // Duration reasoning
    if (extractedInfo.estimatedDuration <= 30) reasons.push('short duration allows for flexible scheduling');
    else if (extractedInfo.estimatedDuration >= 90) reasons.push('adequate time allocated for comprehensive discussion');

    // Priority reasoning
    if (extractedInfo.priority === 'urgent') reasons.push('prioritized for urgent requirement');

    return `Recommended: ${reasons.join(', ')}`;
  }

  private calculatePromptMatchScore(
    slot: { startTime: Date; endTime: Date; score: number },
    extractedInfo: ParsedSchedulingInfo,
    originalPrompt: string
  ): number {
    let score = 70; // Base score

    // Time preference matching
    const hour = slot.startTime.getHours();
    if (originalPrompt.toLowerCase().includes('morning') && hour <= 12) score += 20;
    if (originalPrompt.toLowerCase().includes('afternoon') && hour >= 13) score += 20;

    // Duration matching
    if (extractedInfo.confidence > 80) score += 15;

    // Day preference matching
    const dayName = slot.startTime.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    if (originalPrompt.toLowerCase().includes(dayName)) score += 25;

    return Math.min(100, score);
  }

  private generateConsiderations(
    slot: { startTime: Date; endTime: Date; score: number },
    extractedInfo: ParsedSchedulingInfo,
    existingEvents: any[]
  ): string[] {
    const considerations = [];

    // Check for nearby events
    const bufferTime = 30 * 60 * 1000; // 30 minutes in ms
    const nearbyEvents = existingEvents.filter(event => {
      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.end_time);
      return (
        Math.abs(eventStart.getTime() - slot.endTime.getTime()) < bufferTime ||
        Math.abs(eventEnd.getTime() - slot.startTime.getTime()) < bufferTime
      );
    });

    if (nearbyEvents.length > 0) {
      considerations.push(`Nearby events: ${nearbyEvents.map(e => e.title).join(', ')}`);
    }

    // Time-based considerations
    const hour = slot.startTime.getHours();
    if (hour === 12) considerations.push('Lunch time - may affect attendance');
    if (hour >= 17) considerations.push('End of day - consider attendee availability');
    if (slot.startTime.getDay() === 5) considerations.push('Friday scheduling - confirm attendee preferences');

    // Attendee considerations
    if (extractedInfo.attendees.length > 5) {
      considerations.push('Large group - ensure room capacity and send early invites');
    }

    return considerations;
  }

  private async generateSmartInsights(
    originalPrompt: string,
    extractedInfo: ParsedSchedulingInfo,
    suggestions: SmartTimeSlotSuggestion[],
    existingEvents: any[]
  ) {
    const insights = [];
    const missingInfo = [];
    const clarifyingQuestions = [];
    const alternatives = [];
    const followUpSuggestions = [];

    // Generate insights
    if (suggestions.length > 0) {
      insights.push(`Found ${suggestions.length} optimal time slots based on your requirements`);
    }

    if (extractedInfo.priority === 'urgent') {
      insights.push('Urgent priority detected - earliest available slots prioritized');
    }

    if (existingEvents.length > 10) {
      insights.push('Busy calendar detected - consider shorter meetings or off-peak hours');
    }

    // Missing information detection
    if (extractedInfo.attendees.length === 0) {
      missingInfo.push('No specific attendees mentioned - suggestions are based on general availability');
    }

    if (!extractedInfo.timePreferences.length) {
      missingInfo.push('No time preferences specified - using standard business hours');
    }

    // Clarifying questions
    if (extractedInfo.confidence < 70) {
      clarifyingQuestions.push('Could you provide more specific details about the meeting purpose?');
    }

    if (extractedInfo.attendees.length === 0) {
      clarifyingQuestions.push('Who would you like to invite to this meeting?');
    }

    // Alternatives
    if (extractedInfo.estimatedDuration > 60) {
      alternatives.push('Consider breaking into shorter focused sessions');
    }

    alternatives.push('Virtual meeting option available if physical space is limited');

    // Follow-up suggestions
    if (originalPrompt.toLowerCase().includes('project')) {
      followUpSuggestions.push('Would you like me to schedule regular project check-ins?');
    }

    followUpSuggestions.push('Should I prepare a meeting agenda template?');

    return {
      insights,
      missingInfo,
      clarifyingQuestions,
      alternatives,
      followUpSuggestions
    };
  }

  private async generateInterpretation(prompt: string, extractedInfo: ParsedSchedulingInfo): Promise<string> {
    const parts = [];

    parts.push(`I understand you want to schedule "${extractedInfo.title}"`);

    if (extractedInfo.estimatedDuration) {
      parts.push(`for ${extractedInfo.estimatedDuration} minutes`);
    }

    if (extractedInfo.attendees.length > 0) {
      parts.push(`with ${extractedInfo.attendees.length} attendees`);
    }

    if (extractedInfo.timePreferences.length > 0) {
      parts.push(`preferably ${extractedInfo.timePreferences.join(' and ')}`);
    }

    if (extractedInfo.requirements.length > 0) {
      parts.push(`requiring ${extractedInfo.requirements.join(' and ')}`);
    }

    return parts.join(' ') + '.';
  }

  private async getWorkspaceMembers(workspaceId: string): Promise<any[]> {
    try {
      const membersQuery = await this.db.find('workspace_members', {
        workspace_id: workspaceId,
        is_active: true
      });
      return Array.isArray(membersQuery.data) ? membersQuery.data : [];
    } catch (error) {
      console.error('Error fetching workspace members:', error);
      return [];
    }
  }

  // ============================================
  // CALENDAR DASHBOARD STATISTICS
  // ============================================

  async getCalendarDashboardStats(
    workspaceId: string,
    userId: string,
    startDate?: string,
    endDate?: string,
    period: string = 'week'
  ): Promise<CalendarDashboardStatsDto> {
    try {
      // Set default date range based on period
      const dateRange = this.calculateDateRange(period, startDate, endDate);

      // Get events for the specified period
      const events = await this.getEvents(
        workspaceId,
        dateRange.startDate,
        dateRange.endDate,
        userId,
        {}
      );

      // Get event categories for categorization
      const categories = await this.getEventCategories(workspaceId);

      // Calculate all statistics
      const overview = this.calculateOverviewStats(events, dateRange, period);
      const weeklyActivity = this.calculateWeeklyActivity(events, dateRange);
      const hourlyDistribution = this.calculateHourlyDistribution(events);
      const categoryStats = this.calculateCategoryStats(events, categories);
      const priorityStats = this.calculatePriorityStats(events);
      const categoryBreakdown = this.calculateCategoryBreakdown(events, categories);
      const insights = await this.generateCalendarInsights(events, dateRange);

      return {
        overview,
        weeklyActivity,
        hourlyDistribution,
        categoryStats,
        priorityStats,
        categoryBreakdown,
        insights,
        dateRange: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
        generatedAt: new Date().toISOString(),
      };

    } catch (error) {
      console.error('Error generating calendar dashboard stats:', error);
      throw new InternalServerErrorException('Failed to generate calendar dashboard statistics');
    }
  }

  private calculateDateRange(period: string, startDate?: string, endDate?: string) {
    const now = new Date();
    let start: Date;
    let end: Date;

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      switch (period) {
        case 'today':
          start = new Date(now);
          start.setHours(0, 0, 0, 0);
          end = new Date(now);
          end.setHours(23, 59, 59, 999);
          break;
        case 'week':
          start = new Date(now);
          start.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
          start.setHours(0, 0, 0, 0);
          end = new Date(start);
          end.setDate(start.getDate() + 6); // End of week (Saturday)
          end.setHours(23, 59, 59, 999);
          break;
        case 'month':
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          end.setHours(23, 59, 59, 999);
          break;
        case 'last3months':
          start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
          end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          end.setHours(23, 59, 59, 999);
          break;
        case 'year':
          start = new Date(now.getFullYear(), 0, 1);
          end = new Date(now.getFullYear(), 11, 31);
          end.setHours(23, 59, 59, 999);
          break;
        default:
          // Default to current week
          start = new Date(now);
          start.setDate(now.getDate() - now.getDay());
          start.setHours(0, 0, 0, 0);
          end = new Date(start);
          end.setDate(start.getDate() + 6);
          end.setHours(23, 59, 59, 999);
      }
    }

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  }

  private calculateOverviewStats(events: any[], dateRange: any, period: string) {
    const totalEvents = events.length;
    let totalEventTime = 0;

    // Calculate total event time in hours
    events.forEach(event => {
      const start = new Date(event.start_time);
      const end = new Date(event.end_time);
      const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60); // Convert to hours
      totalEventTime += duration;
    });

    // Calculate total available time (work days only)
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    const workDays = this.getWorkDaysBetween(startDate, endDate);
    const totalWorkHours = workDays * 8; // Assuming 8-hour work days
    const unscheduledTime = Math.max(0, totalWorkHours - totalEventTime);
    const timeUtilization = totalWorkHours > 0 ? Math.round((totalEventTime / totalWorkHours) * 100) : 0;

    // Generate period descriptions
    const periodDescription = this.getPeriodDescription(period);
    const timeRangeDescription = `Across ${workDays} work day${workDays !== 1 ? 's' : ''}`;

    // TODO: Calculate comparison with previous period
    const utilizationComparison = '+100% vs yesterday'; // Placeholder

    return {
      totalEvents,
      totalEventTime: Math.round(totalEventTime * 10) / 10, // Round to 1 decimal
      timeUtilization,
      unscheduledTime: Math.round(unscheduledTime),
      period: periodDescription,
      timeRange: timeRangeDescription,
      utilizationComparison,
      availabilityNote: unscheduledTime > 20 ? 'Available for deep work' : 'Schedule is quite busy',
    };
  }

  private getWorkDaysBetween(startDate: Date, endDate: Date): number {
    let workDays = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
        workDays++;
      }
      current.setDate(current.getDate() + 1);
    }

    return workDays;
  }

  private getPeriodDescription(period: string): string {
    switch (period) {
      case 'today': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'last3months': return 'Last 3 Months';
      case 'year': return 'This Year';
      default: return 'This Week';
    }
  }

  private calculateWeeklyActivity(events: any[], dateRange: any) {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyData = dayNames.map(day => ({ day, events: 0, hours: 0 }));

    events.forEach(event => {
      const eventDate = new Date(event.start_time);
      const dayIndex = eventDate.getDay();
      const start = new Date(event.start_time);
      const end = new Date(event.end_time);
      const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60); // Hours

      weeklyData[dayIndex].events++;
      weeklyData[dayIndex].hours += duration;
    });

    // Round hours to 1 decimal place
    weeklyData.forEach(day => {
      day.hours = Math.round(day.hours * 10) / 10;
    });

    return weeklyData;
  }

  private calculateHourlyDistribution(events: any[]) {
    const hourlyData: { [key: number]: number } = {};

    // Initialize all hours with 0
    for (let i = 0; i < 24; i++) {
      hourlyData[i] = 0;
    }

    events.forEach(event => {
      const eventDate = new Date(event.start_time);
      const hour = eventDate.getHours();
      hourlyData[hour]++;
    });

    const totalEvents = events.length;

    return Object.entries(hourlyData).map(([hour, count]) => ({
      hour: parseInt(hour),
      eventCount: count,
      percentage: totalEvents > 0 ? Math.round((count / totalEvents) * 100 * 10) / 10 : 0,
    }));
  }

  private calculateCategoryStats(events: any[], categories: any[]) {
    const categoryMap = new Map();
    const defaultColors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
    let colorIndex = 0;

    // Create category mapping
    categories.forEach(cat => {
      categoryMap.set(cat.id, {
        name: cat.name,
        color: cat.color || defaultColors[colorIndex % defaultColors.length],
        totalTime: 0,
        eventCount: 0,
      });
      colorIndex++;
    });

    // Add default categories for events without categories
    if (!categoryMap.has('work')) {
      categoryMap.set('work', {
        name: 'Work',
        color: '#3B82F6',
        totalTime: 0,
        eventCount: 0,
      });
    }

    events.forEach(event => {
      const start = new Date(event.start_time);
      const end = new Date(event.end_time);
      const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60); // Hours

      let categoryKey = event.category_id || 'work'; // Default to work if no category

      // If category doesn't exist, create it
      if (!categoryMap.has(categoryKey)) {
        categoryMap.set(categoryKey, {
          name: 'Uncategorized',
          color: defaultColors[categoryMap.size % defaultColors.length],
          totalTime: 0,
          eventCount: 0,
        });
      }

      const category = categoryMap.get(categoryKey);
      category.totalTime += duration;
      category.eventCount++;
    });

    const totalTime = Array.from(categoryMap.values()).reduce((sum, cat) => sum + cat.totalTime, 0);

    return Array.from(categoryMap.values())
      .filter(cat => cat.eventCount > 0)
      .map(cat => ({
        name: cat.name,
        totalTime: Math.round(cat.totalTime * 10) / 10,
        eventCount: cat.eventCount,
        percentage: totalTime > 0 ? Math.round((cat.totalTime / totalTime) * 100) : 0,
        color: cat.color,
      }));
  }

  private calculatePriorityStats(events: any[]) {
    const priorities = ['low', 'normal', 'high', 'urgent'];
    const colors = ['#6B7280', '#3B82F6', '#F59E0B', '#EF4444'];
    const priorityMap = new Map();

    priorities.forEach((priority, index) => {
      priorityMap.set(priority, {
        priority: priority.charAt(0).toUpperCase() + priority.slice(1),
        eventCount: 0,
        totalTime: 0,
        color: colors[index],
      });
    });

    events.forEach(event => {
      const start = new Date(event.start_time);
      const end = new Date(event.end_time);
      const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

      const priority = event.priority || 'normal';
      if (priorityMap.has(priority)) {
        const priorityData = priorityMap.get(priority);
        priorityData.eventCount++;
        priorityData.totalTime += duration;
      }
    });

    const totalEvents = events.length;

    return Array.from(priorityMap.values()).map(priority => ({
      ...priority,
      totalTime: Math.round(priority.totalTime * 10) / 10,
      percentage: totalEvents > 0 ? Math.round((priority.eventCount / totalEvents) * 100) : 0,
    }));
  }

  private calculateCategoryBreakdown(events: any[], categories: any[]) {
    const categoryStats = this.calculateCategoryStats(events, categories);

    return categoryStats.map(stat => ({
      category: stat.name,
      timeSpent: this.formatDuration(stat.totalTime),
      eventCount: stat.eventCount,
      color: stat.color,
    }));
  }

  private formatDuration(hours: number): string {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);

    if (wholeHours === 0) {
      return `${minutes}m`;
    } else if (minutes === 0) {
      return `${wholeHours}h`;
    } else {
      return `${wholeHours}h ${minutes}m`;
    }
  }

  private async generateCalendarInsights(events: any[], dateRange: any) {
    // Calculate basic analytics first
    const hourlyDistribution = this.calculateHourlyDistribution(events);
    const peakHourData = hourlyDistribution.reduce((peak, current) =>
      current.eventCount > peak.eventCount ? current : peak
    );
    const peakHour = `${peakHourData.hour}:00 - Most events scheduled`;

    const weeklyActivity = this.calculateWeeklyActivity(events, dateRange);
    const busiestDayData = weeklyActivity.reduce((busiest, current) =>
      current.events > busiest.events ? current : busiest
    );
    const totalWeeklyEvents = weeklyActivity.reduce((sum, day) => sum + day.events, 0);
    const busiestDayPercentage = totalWeeklyEvents > 0 ?
      Math.round((busiestDayData.events / totalWeeklyEvents) * 100) : 0;
    const busiestDay = `${busiestDayData.day} - ${busiestDayPercentage}% of weekly events`;

    const durations = events.map(event => {
      const start = new Date(event.start_time);
      const end = new Date(event.end_time);
      return Math.round((end.getTime() - start.getTime()) / (1000 * 60)); // Minutes
    });

    const durationCounts = durations.reduce((acc, duration) => {
      acc[duration] = (acc[duration] || 0) + 1;
      return acc;
    }, {});

    const mostCommonDurationEntry = Object.entries(durationCounts).reduce((max, [duration, count]) =>
      count > max[1] ? [duration, count] : max, ['60', 0]
    );

    const commonDurationPercentage = events.length > 0 ?
      Math.round((Number(mostCommonDurationEntry[1]) / events.length) * 100) : 0;
    const commonDuration = `${mostCommonDurationEntry[0]} minutes - ${commonDurationPercentage}% of events`;

    const afternoonEvents = events.filter(event => {
      const hour = new Date(event.start_time).getHours();
      return hour >= 12;
    });
    const afternoonPercentage = events.length > 0 ?
      Math.round((afternoonEvents.length / events.length) * 100) : 0;

    let meetingPattern;
    if (afternoonPercentage > 60) {
      meetingPattern = 'Most meetings are scheduled in the afternoon';
    } else if (afternoonPercentage < 40) {
      meetingPattern = 'Most meetings are scheduled in the morning';
    } else {
      meetingPattern = 'Meetings are evenly distributed throughout the day';
    }

    // AI-Enhanced Insights
    let aiInsights = [];
    let productivityTip = 'Good balance of meetings and free time for productivity';

    try {
      // Prepare calendar data for AI analysis
      const calendarSummary = this.prepareCalendarDataForAI(events, dateRange);

      // Generate AI insights using database AI
      const aiAnalysisPrompt = `
        As a productivity and calendar management expert, analyze this calendar data and provide 3-5 actionable insights:

        ${calendarSummary}

        Please provide:
        1. Key patterns you notice in the schedule
        2. Productivity optimization suggestions
        3. Meeting efficiency recommendations
        4. Work-life balance observations
        5. Time management tips

        Format as a JSON array of insight objects with 'type' (pattern|suggestion|recommendation|observation|tip) and 'message' fields.
        Keep insights concise and actionable (max 100 characters per message).
      `;

      const aiResponse = await this.aiProvider.generateText(aiAnalysisPrompt, {
        maxTokens: 500,
        temperature: 0.7,
      });

      // Parse AI response - handle both string and object responses
      let responseText = '';
      if (typeof aiResponse === 'string') {
        responseText = aiResponse;
      } else if (aiResponse && typeof aiResponse === 'object') {
        responseText = aiResponse.text || aiResponse.data?.text || '';
      }

      if (responseText) {
        try {
          // Remove markdown code blocks if present (```json ... ```)
          let cleanedResponse = responseText.trim();
          if (cleanedResponse.startsWith('```')) {
            cleanedResponse = cleanedResponse.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
          }

          const parsedInsights = JSON.parse(cleanedResponse);
          if (Array.isArray(parsedInsights)) {
            aiInsights = parsedInsights.slice(0, 5); // Limit to 5 insights
          }
        } catch (parseError) {
          console.log('Failed to parse AI insights JSON, using raw response');
          // Fallback: treat response as a single insight
          aiInsights = [{
            type: 'suggestion',
            message: responseText.substring(0, 100) + (responseText.length > 100 ? '...' : '')
          }];
        }
      }

      // Generate a specific productivity tip using AI
      const productivityPrompt = `
        Based on this calendar analysis, provide ONE specific productivity tip (max 80 characters):
        - Total events: ${events.length}
        - Peak hour: ${peakHourData.hour}:00
        - Busiest day: ${busiestDayData.day}
        - Common duration: ${mostCommonDurationEntry[0]} minutes
        - Afternoon meetings: ${afternoonPercentage}%
        
        Focus on the most impactful single recommendation.
      `;

      const productivityResponse = await this.aiProvider.generateText(productivityPrompt, {
        maxTokens: 50,
        temperature: 0.8,
      });

      // Handle both string and object responses for productivity tip
      let tipText = '';
      if (typeof productivityResponse === 'string') {
        tipText = productivityResponse;
      } else if (productivityResponse && typeof productivityResponse === 'object') {
        tipText = productivityResponse.text || productivityResponse.data?.text || '';
      }

      if (tipText) {
        productivityTip = tipText.trim().substring(0, 100);
      }

    } catch (aiError) {
      console.error('AI insights generation failed:', aiError);
      // Fallback to rule-based insights
      aiInsights = this.generateFallbackInsights(events, afternoonPercentage);

      const morningEvents = events.filter(event => {
        const hour = new Date(event.start_time).getHours();
        return hour >= 6 && hour < 12;
      });

      if (morningEvents.length < events.length * 0.3) {
        productivityTip = 'Consider blocking more time for deep work in the morning';
      } else if (events.length > 15) {
        productivityTip = 'Your calendar is quite busy - consider consolidating similar meetings';
      } else if (events.length < 5) {
        productivityTip = 'You have good availability - great for focused work sessions';
      }
    }

    return {
      peakHour,
      busiestDay,
      commonDuration,
      meetingPattern,
      productivityTip,
      aiInsights,
      aiPowered: true,
    };
  }

  private prepareCalendarDataForAI(events: any[], dateRange: any): string {
    const summary = [];
    summary.push(`Calendar Analysis Period: ${dateRange.startDate} to ${dateRange.endDate}`);
    summary.push(`Total Events: ${events.length}`);

    if (events.length === 0) {
      summary.push('No events in this period - great for focused work!');
      return summary.join('\n');
    }

    // Event types and categories
    const categories = events.reduce((acc, event) => {
      const category = event.category_name || 'Uncategorized';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    const priorities = events.reduce((acc, event) => {
      const priority = event.priority || 'normal';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {});

    summary.push(`Event Categories: ${Object.entries(categories).map(([cat, count]) => `${cat}: ${count}`).join(', ')}`);
    summary.push(`Event Priorities: ${Object.entries(priorities).map(([pri, count]) => `${pri}: ${count}`).join(', ')}`);

    // Time distribution
    const morningEvents = events.filter(e => new Date(e.start_time).getHours() < 12).length;
    const afternoonEvents = events.filter(e => new Date(e.start_time).getHours() >= 12).length;
    summary.push(`Time Distribution: Morning: ${morningEvents}, Afternoon: ${afternoonEvents}`);

    // Meeting durations
    const avgDuration = events.reduce((sum, event) => {
      const start = new Date(event.start_time);
      const end = new Date(event.end_time);
      return sum + (end.getTime() - start.getTime()) / (1000 * 60);
    }, 0) / events.length;
    summary.push(`Average Meeting Duration: ${Math.round(avgDuration)} minutes`);

    return summary.join('\n');
  }

  private generateFallbackInsights(events: any[], afternoonPercentage: number) {
    const insights = [];

    if (events.length === 0) {
      insights.push({ type: 'observation', message: 'No meetings scheduled - perfect for deep work!' });
      return insights;
    }

    if (afternoonPercentage > 70) {
      insights.push({ type: 'pattern', message: 'Heavy afternoon schedule detected' });
      insights.push({ type: 'suggestion', message: 'Reserve mornings for focused tasks' });
    }

    if (events.length > 10) {
      insights.push({ type: 'recommendation', message: 'Consider consolidating similar meetings' });
    }

    const longMeetings = events.filter(event => {
      const start = new Date(event.start_time);
      const end = new Date(event.end_time);
      return (end.getTime() - start.getTime()) / (1000 * 60) > 60;
    }).length;

    if (longMeetings > events.length * 0.5) {
      insights.push({ type: 'tip', message: 'Many long meetings - try 25-50 min slots instead' });
    }

    if (insights.length === 0) {
      insights.push({ type: 'observation', message: 'Well-balanced calendar structure' });
    }

    return insights;
  }
}