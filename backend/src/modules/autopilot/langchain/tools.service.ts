import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamicStructuredTool, DynamicTool } from '@langchain/core/tools';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { z } from 'zod';
import { ChatService } from '../../chat/chat.service';
import { FilesService } from '../../files/files.service';
import { CalendarService } from '../../calendar/calendar.service';
import { EventStatus } from '../../calendar/dto/create-event.dto';
import { DatabaseService } from '../../database/database.service';
import { AiProviderService } from '../../ai-provider/ai-provider.service';
import { NotesService } from '../../notes/notes.service';
import { EmailService } from '../../integration-framework/email/email.service';
import { VideoCallsService } from '../../video-calls/video-calls.service';
import { ProjectsService } from '../../projects/projects.service';
import { AutoPilotCapability } from '../dto/autopilot.dto';
// New service imports for expanded tools
import { BudgetService } from '../../budget/budget.service';
import { ApprovalsService } from '../../approvals/approvals.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { TemplatesService } from '../../templates/templates.service';
import { DocumentsService } from '../../documents/documents.service';
import { WhiteboardsService } from '../../whiteboards/whiteboards.service';
import { WorkflowsService } from '../../workflows/services/workflows.service';
import { AIWorkflowGeneratorService } from '../../workflows/services/ai-workflow-generator.service';
import { WorkflowTriggerType, WorkflowStepType } from '../../workflows/dto/workflow.dto';
import { ScheduledActionsService } from '../scheduled-actions.service';
import { SettingsService } from '../../settings/settings.service';

interface AttachedImage {
  name: string;
  base64: string;
  mimeType: string;
}

interface ReferencedItem {
  id: string;
  type: 'note' | 'task' | 'event' | 'project' | 'file';
  title: string;
  description?: string;
}

interface ToolContext {
  userId: string;
  workspaceId: string;
  sessionId: string;
  executeActions: boolean;
  attachedImages?: AttachedImage[];
  referencedItems?: ReferencedItem[];
}

@Injectable()
export class AgentToolsService {
  private readonly logger = new Logger(AgentToolsService.name);
  private context: ToolContext;
  private visionModel: ChatOpenAI;

  constructor(
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
    private readonly filesService: FilesService,
    @Inject(forwardRef(() => CalendarService))
    private readonly calendarService: CalendarService,
    private readonly db: DatabaseService,
    private readonly notesService: NotesService,
    private readonly emailService: EmailService,
    private readonly videoCallsService: VideoCallsService,
    @Inject(forwardRef(() => ProjectsService))
    private readonly projectsService: ProjectsService,
    // New service injections for expanded tools
    @Inject(forwardRef(() => BudgetService))
    private readonly budgetService: BudgetService,
    @Inject(forwardRef(() => ApprovalsService))
    private readonly approvalsService: ApprovalsService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => TemplatesService))
    private readonly templatesService: TemplatesService,
    @Inject(forwardRef(() => DocumentsService))
    private readonly documentsService: DocumentsService,
    @Inject(forwardRef(() => WhiteboardsService))
    private readonly whiteboardsService: WhiteboardsService,
    @Inject(forwardRef(() => WorkflowsService))
    private readonly workflowsService: WorkflowsService,
    @Inject(forwardRef(() => AIWorkflowGeneratorService))
    private readonly aiWorkflowGeneratorService: AIWorkflowGeneratorService,
    private readonly scheduledActionsService: ScheduledActionsService,
    @Inject(forwardRef(() => SettingsService))
    private readonly settingsService: SettingsService,
  ) {
    // Initialize OpenAI with vision-capable model for image analysis
    this.visionModel = new ChatOpenAI({
      openAIApiKey: this.configService.get<string>('OPENAI_API_KEY'),
      modelName: 'gpt-4o-mini', // Supports vision
      temperature: 0.3,
      maxTokens: 1000,
    });
  }

  // Legacy alias for the AI provider - delegates to db.getAI() until a real
  // AIProviderService is wired in.
  private get aiProvider(): any {
    return this.db.getAI();
  }

  /**
   * Set the context for tool execution
   */
  setContext(context: ToolContext) {
    this.context = context;
  }

  /**
   * Get all available tools
   */
  getAllTools(): (DynamicTool | DynamicStructuredTool)[] {
    return [
      ...this.getCalendarTools(),
      ...this.getTaskTools(),
      ...this.getChatTools(),
      ...this.getFileTools(),
      ...this.getWorkspaceTools(),
      ...this.getNotesTools(),
      ...this.getEmailTools(),
      ...this.getVideoCallTools(),
      ...this.getProjectTools(),
      ...this.getDirectMessageTools(),
      ...this.getSummaryTools(),
      ...this.getWritingTools(),
      ...this.getAnalysisTools(),
      ...this.getReferenceTools(),
      ...this.getBatchTools(),
      // New tool categories
      ...this.getBudgetTools(),
      ...this.getApprovalTools(),
      ...this.getNotificationTools(),
      ...this.getTemplateTools(),
      ...this.getDocumentTools(),
      ...this.getWhiteboardTools(),
      ...this.getWorkflowTools(),
      ...this.getSchedulingTools(),
    ];
  }

  /**
   * Get tool capabilities for documentation
   */
  getCapabilities(): AutoPilotCapability[] {
    return [
      {
        name: 'Calendar Management',
        description: 'Create, update, and manage calendar events and meetings',
        category: 'calendar',
        examples: [
          'Schedule a meeting with John tomorrow at 2pm',
          'What meetings do I have this week?',
          'Cancel my 3pm meeting today',
        ],
      },
      {
        name: 'Task Management',
        description: 'Create, update, and manage tasks and projects',
        category: 'tasks',
        examples: [
          'Create a task to review the Q4 report',
          'Mark the "Update documentation" task as complete',
          'List all my overdue tasks',
        ],
      },
      {
        name: 'Chat & Messaging',
        description: 'Send messages to channels and direct messages to team members',
        category: 'chat',
        examples: [
          'Send a message to the #general channel',
          'Send a direct message to John saying "Hello"',
          'Search for messages about the budget',
        ],
      },
      {
        name: 'File Management',
        description: 'Search, organize, and manage files',
        category: 'files',
        examples: [
          'Find all PDF files related to contracts',
          'List recently uploaded files',
          'Search for documents mentioning "proposal"',
        ],
      },
      {
        name: 'Notes',
        description: 'Create, search, and manage notes',
        category: 'notes',
        examples: [
          'Create a note titled "Meeting Notes" with today\'s discussion',
          'Find my notes about the project',
          'List all my recent notes',
        ],
      },
      {
        name: 'Email',
        description: 'Send, fetch, and manage emails through connected Gmail account',
        category: 'email',
        examples: [
          'Send an email to john@example.com about the meeting',
          'Show me my recent emails',
          'Find emails about the contract',
        ],
      },
      {
        name: 'Video Calls',
        description: 'Schedule and manage video meetings',
        category: 'video',
        examples: [
          'Schedule a video call with the team tomorrow at 3pm',
          'Create an instant video meeting',
          'List my scheduled video calls',
        ],
      },
      {
        name: 'Project Management',
        description: 'Create and manage projects in the workspace',
        category: 'projects',
        examples: [
          'Create a new project called "Q1 Marketing"',
          'List all active projects',
          'Show project details',
        ],
      },
      {
        name: 'Workspace Info',
        description: 'Get information about workspace, members, and projects',
        category: 'workspace',
        examples: [
          'Who are the members of this workspace?',
          'List all active projects',
          'Show workspace statistics',
        ],
      },
      {
        name: 'Smart Summary & Insights',
        description: 'Get summaries and insights about your daily, weekly activities, upcoming events, and overdue tasks',
        category: 'summary',
        examples: [
          'Give me a daily summary',
          'What do I have coming up today?',
          'Show me overdue tasks',
          'Summarize my week',
          'What should I focus on today?',
        ],
      },
      {
        name: 'AI Writing Assistant',
        description: 'Help with writing emails, meeting notes, documents, proposals, improving text, and translating content',
        category: 'writing',
        examples: [
          'Draft a reply to this email',
          'Write meeting notes for our standup',
          'Help me write a project proposal',
          'Improve this text to be more professional',
          'Summarize this document',
          'Translate this to Spanish',
          'Translate this email to Bengali',
        ],
      },
      {
        name: 'Document & Image Analysis',
        description: 'Analyze documents and images, extract key information, summarize content, and answer questions',
        category: 'analysis',
        examples: [
          'Summarize this document',
          'Extract key points from this text',
          'What action items are in this document?',
          'Analyze the sentiment of this text',
          'Describe this image',
          'Extract text from this image',
        ],
      },
      {
        name: 'Batch Operations',
        description: 'Efficiently create, update, or delete multiple items at once. Great for bulk task creation, mass updates, or organizing files.',
        category: 'batch',
        examples: [
          'Create 5 tasks for the sprint planning',
          'Mark all tasks in the backlog as done',
          'Delete all completed tasks from last month',
          'Move all files to the archive folder',
          'Create events for all team meetings this week',
        ],
      },
      {
        name: 'Budget & Expenses',
        description: 'Create and manage budgets, track expenses, and get spending summaries',
        category: 'budget',
        examples: [
          'Create a budget for the Q1 marketing project',
          'Add an expense of $500 for office supplies',
          'Show me the budget summary',
          'List all expenses for this month',
        ],
      },
      {
        name: 'Approvals',
        description: 'Create, manage, and respond to approval requests',
        category: 'approvals',
        examples: [
          'Create an approval request for vacation',
          'Show my pending approvals',
          'Approve the expense request',
          'What approval requests need my attention?',
        ],
      },
      {
        name: 'Notifications',
        description: 'Send and manage notifications',
        category: 'notifications',
        examples: [
          'Send a notification to the team about the meeting',
          'Show my notifications',
          'Mark all notifications as read',
        ],
      },
      {
        name: 'Templates',
        description: 'Use templates to quickly create projects',
        category: 'templates',
        examples: [
          'List available templates',
          'Create a project from the Marketing template',
          'Show me template categories',
        ],
      },
      {
        name: 'Documents & Signatures',
        description: 'Create documents and manage e-signatures',
        category: 'documents',
        examples: [
          'Create a new contract document',
          'Send the document for signature',
          'List my documents',
        ],
      },
      {
        name: 'Whiteboards',
        description: 'Create and manage whiteboards for collaboration',
        category: 'whiteboards',
        examples: [
          'Create a whiteboard for brainstorming',
          'List all whiteboards',
        ],
      },
      {
        name: 'Workflow Automation',
        description: 'Create and manage automated workflows that trigger actions based on events',
        category: 'workflows',
        examples: [
          'Create a workflow that sends a reminder when a task is overdue',
          'Set up an automation to notify me when a new note is created',
          'List all my active workflows',
          'Create a workflow that creates a task when a calendar event starts',
        ],
      },
    ];
  }

  // ============================================
  // CALENDAR TOOLS
  // ============================================

  private getCalendarTools(): DynamicStructuredTool[] {
    return [
      new DynamicStructuredTool({
        name: 'create_calendar_event',
        description: 'Create a new calendar event or meeting. Use this when the user wants to schedule something. Can attach notes, files, or other events using their IDs from previous tool results.',
        schema: z.object({
          title: z.string().describe('Title of the event'),
          description: z.string().optional().describe('Event description'),
          startTime: z.string().describe('Start time in ISO format (e.g., 2024-01-15T14:00:00)'),
          endTime: z.string().describe('End time in ISO format'),
          attendees: z.array(z.string()).optional().describe('List of attendee email addresses'),
          location: z.string().optional().describe('Event location'),
          noteAttachments: z.array(z.string()).optional().describe('Array of note IDs to attach to this event (from create_note results)'),
          fileAttachments: z.array(z.string()).optional().describe('Array of file IDs to attach to this event'),
          eventAttachments: z.array(z.string()).optional().describe('Array of other event IDs to link to this event'),
        }),
        func: async ({ title, description, startTime, endTime, attendees, location, noteAttachments, fileAttachments, eventAttachments }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would create calendar event',
              details: { title, startTime, endTime, attendees, noteAttachments, fileAttachments },
            });
          }

          try {
            const createEventDto = {
              title,
              description,
              start_time: startTime,
              end_time: endTime,
              attendees: attendees || [],
              location,
              attachments: {
                note_attachment: noteAttachments || [],
                file_attachment: fileAttachments || [],
                event_attachment: eventAttachments || [],
              },
            };
            const event = await this.calendarService.createEvent(
              this.context.workspaceId,
              createEventDto as any,
              this.context.userId,
            );
            return JSON.stringify({
              success: true,
              event,
              eventId: event.id,
              message: `Event "${title}" created successfully${noteAttachments?.length ? ` with ${noteAttachments.length} note(s) attached` : ''}`,
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'list_calendar_events',
        description: 'List calendar events for a date range. Use this to check schedule or find meetings.',
        schema: z.object({
          startDate: z.string().describe('Start date in ISO format'),
          endDate: z.string().describe('End date in ISO format'),
        }),
        func: async ({ startDate, endDate }) => {
          try {
            const events = await this.calendarService.getEvents(
              this.context.workspaceId,
              startDate,
              endDate,
              this.context.userId,
            );
            return JSON.stringify({ success: true, events });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'get_event_details',
        description: 'Get detailed information about a specific calendar event by ID.',
        schema: z.object({
          eventId: z.string().describe('The ID of the event to retrieve'),
        }),
        func: async ({ eventId }) => {
          try {
            const event = await this.calendarService.getEvent(eventId, this.context.workspaceId, this.context.userId);
            return JSON.stringify({ success: true, event });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'update_event_time',
        description: 'Update the start and end time of a calendar event. Use when user wants to reschedule.',
        schema: z.object({
          eventId: z.string().describe('The ID of the event to update'),
          startTime: z.string().describe('New start time in ISO format (e.g., 2024-01-15T14:00:00)'),
          endTime: z.string().describe('New end time in ISO format'),
        }),
        func: async ({ eventId, startTime, endTime }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would update event time',
              details: { eventId, startTime, endTime },
            });
          }

          try {
            const updated = await this.calendarService.updateEvent(
              this.context.workspaceId,
              eventId,
              { start_time: startTime, end_time: endTime },
              this.context.userId,
            );
            return JSON.stringify({
              success: true,
              event: updated,
              message: `Event time updated to ${startTime} - ${endTime}`,
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'update_event_location',
        description: 'Update the location of a calendar event.',
        schema: z.object({
          eventId: z.string().describe('The ID of the event to update'),
          location: z.string().describe('New location'),
        }),
        func: async ({ eventId, location }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would update event location',
              details: { eventId, location },
            });
          }

          try {
            const updated = await this.calendarService.updateEvent(
              this.context.workspaceId,
              eventId,
              { location },
              this.context.userId,
            );
            return JSON.stringify({
              success: true,
              event: updated,
              message: `Event location updated to "${location}"`,
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'update_event_attendees',
        description: 'Update the attendees list of a calendar event. Replaces the entire attendee list.',
        schema: z.object({
          eventId: z.string().describe('The ID of the event to update'),
          attendees: z.array(z.string()).describe('Complete list of attendee email addresses'),
        }),
        func: async ({ eventId, attendees }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would update event attendees',
              details: { eventId, attendees },
            });
          }

          try {
            const updated = await this.calendarService.updateEvent(
              this.context.workspaceId,
              eventId,
              { attendees },
              this.context.userId,
            );
            return JSON.stringify({
              success: true,
              event: updated,
              message: `Event attendees updated (${attendees.length} attendees)`,
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'add_event_reminder',
        description: 'Add a reminder to a calendar event. Reminder time is in minutes before the event.',
        schema: z.object({
          eventId: z.string().describe('The ID of the event'),
          reminderMinutes: z.number().describe('Minutes before event to send reminder (e.g., 15, 30, 60)'),
        }),
        func: async ({ eventId, reminderMinutes }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would add event reminder',
              details: { eventId, reminderMinutes },
            });
          }

          try {
            // Get current event
            const event = await this.calendarService.getEvent(eventId, this.context.workspaceId, this.context.userId);

            // Add reminder to reminders array
            const currentReminders = event.reminders || [];
            if (!currentReminders.includes(reminderMinutes)) {
              currentReminders.push(reminderMinutes);
            }

            const updated = await this.calendarService.updateEvent(
              eventId,
              this.context.workspaceId,
              { reminders: currentReminders },
              this.context.userId,
            );

            return JSON.stringify({
              success: true,
              event: updated,
              message: `Reminder added: ${reminderMinutes} minutes before event`,
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'cancel_event',
        description: 'Cancel a calendar event. This sets the event status to cancelled.',
        schema: z.object({
          eventId: z.string().describe('The ID of the event to cancel'),
          reason: z.string().optional().describe('Optional reason for cancellation'),
        }),
        func: async ({ eventId, reason }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would cancel event',
              details: { eventId, reason },
            });
          }

          try {
            const updated = await this.calendarService.updateEvent(
              eventId,
              this.context.workspaceId,
              { status: EventStatus.CANCELLED },
              this.context.userId,
            );

            return JSON.stringify({
              success: true,
              event: updated,
              message: `Event cancelled${reason ? `: ${reason}` : ''}`,
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'delete_event',
        description: 'Permanently delete a calendar event. Use this when the user wants to completely remove an event (not just cancel it).',
        schema: z.object({
          eventId: z.string().describe('The ID of the event to delete'),
        }),
        func: async ({ eventId }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would delete event',
              details: { eventId },
            });
          }

          try {
            await this.db.table('calendar_events')
              .update({
                is_deleted: true,
                deleted_at: new Date().toISOString(),
                deleted_by: this.context.userId,
                updated_at: new Date().toISOString(),
              })
              .where('id', '=', eventId)
              .where('workspace_id', '=', this.context.workspaceId)
              .execute();

            return JSON.stringify({
              success: true,
              message: 'Event deleted successfully',
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'respond_to_event',
        description: 'Respond to a calendar event invitation (accept, decline, or maybe).',
        schema: z.object({
          eventId: z.string().describe('The ID of the event to respond to'),
          response: z.enum(['accepted', 'declined', 'tentative']).describe('Your response: accepted, declined, or tentative (maybe)'),
        }),
        func: async ({ eventId, response }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would respond to event',
              details: { eventId, response },
            });
          }

          try {
            // Update attendee status in the event
            const eventResult = await this.db.table('calendar_events')
              .select('*')
              .where('id', '=', eventId)
              .where('workspace_id', '=', this.context.workspaceId)
              .execute();

            const events: any[] = Array.isArray(eventResult) ? eventResult : (eventResult.data || []);
            if (events.length === 0) {
              return JSON.stringify({ success: false, error: 'Event not found' });
            }

            const event = events[0];
            const attendees = event.attendees || [];

            // Find and update the current user's response
            const updatedAttendees = attendees.map((attendee: any) => {
              if (attendee.user_id === this.context.userId || attendee.email === this.context.userId) {
                return { ...attendee, response_status: response };
              }
              return attendee;
            });

            await this.db.table('calendar_events')
              .update({
                attendees: updatedAttendees,
                updated_at: new Date().toISOString(),
              })
              .where('id', '=', eventId)
              .execute();

            return JSON.stringify({
              success: true,
              message: `Responded to event: ${response}`,
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'update_calendar_event',
        description: 'Update a calendar event. Can update title, description, time, location, or attendees.',
        schema: z.object({
          eventId: z.string().describe('The ID of the event to update'),
          title: z.string().optional().describe('New event title'),
          description: z.string().optional().describe('New event description'),
          startTime: z.string().optional().describe('New start time in ISO format'),
          endTime: z.string().optional().describe('New end time in ISO format'),
          location: z.string().optional().describe('New event location'),
        }),
        func: async ({ eventId, title, description, startTime, endTime, location }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would update event',
              details: { eventId, title, description, startTime, endTime, location },
            });
          }

          try {
            const updates: any = { updated_at: new Date().toISOString() };
            if (title !== undefined) updates.title = title;
            if (description !== undefined) updates.description = description;
            if (startTime !== undefined) updates.start_time = startTime;
            if (endTime !== undefined) updates.end_time = endTime;
            if (location !== undefined) updates.location = location;

            const updated = await this.calendarService.updateEvent(
              this.context.workspaceId,
              eventId,
              updates,
              this.context.userId,
            );

            return JSON.stringify({
              success: true,
              event: updated,
              message: 'Event updated successfully',
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),
    ];
  }

  // ============================================
  // TASK TOOLS
  // ============================================

  private getTaskTools(): DynamicStructuredTool[] {
    return [
      new DynamicStructuredTool({
        name: 'create_task',
        description: 'Create a new task in a project. Use this when the user wants to add a to-do item. If no projectId is provided, the task will be created in the default project. Can attach notes, files, or events using their IDs from previous tool results.',
        schema: z.object({
          title: z.string().describe('Task title'),
          description: z.string().optional().describe('Task description'),
          projectId: z.string().optional().describe('Project ID to add task to (will use default if not provided)'),
          priority: z.enum(['low', 'medium', 'high']).optional().describe('Task priority: low, medium, or high'),
          dueDate: z.string().optional().describe('Due date in ISO format'),
          assigneeId: z.string().optional().describe('User ID to assign task to'),
          noteAttachments: z.array(z.string()).optional().describe('Array of note IDs to attach to this task (from create_note results)'),
          fileAttachments: z.array(z.string()).optional().describe('Array of file IDs to attach to this task'),
          eventAttachments: z.array(z.string()).optional().describe('Array of event IDs to attach to this task (from create_calendar_event results)'),
        }),
        func: async ({ title, description, projectId, priority, dueDate, assigneeId, noteAttachments, fileAttachments, eventAttachments }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would create task',
              details: { title, priority, dueDate, noteAttachments, fileAttachments },
            });
          }

          try {
            // If no projectId provided, get the first project in the workspace
            let targetProjectId = projectId;
            if (!targetProjectId) {
              const projectsResult = await this.db.table('projects')
                .select('id')
                .where('workspace_id', '=', this.context.workspaceId)
                .limit(1)
                .execute();

              const projects: any[] = Array.isArray(projectsResult) ? projectsResult : (projectsResult.data || []);
              if (projects.length > 0) {
                targetProjectId = projects[0].id;
              } else {
                return JSON.stringify({ success: false, error: 'No projects found in workspace. Please create a project first.' });
              }
            }

            // Use database to create task in tasks table
            const task = await this.db.insert('tasks', {
              title,
              description,
              project_id: targetProjectId,
              created_by: this.context.userId,
              assigned_to: assigneeId ? [assigneeId] : [],
              priority: priority || 'medium',
              due_date: dueDate,
              status: 'todo',
              task_type: 'task',
              labels: [],
              attachments: {
                note_attachment: noteAttachments || [],
                file_attachment: fileAttachments || [],
                event_attachment: eventAttachments || [],
              },
              collaborative_data: {},
              custom_fields: [],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
            return JSON.stringify({
              success: true,
              task,
              taskId: task.id,
              message: `Task "${title}" created successfully${noteAttachments?.length ? ` with ${noteAttachments.length} note(s) attached` : ''}`,
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'list_tasks',
        description: 'List tasks, optionally filtered by project or status. Status can be any kanban stage ID.',
        schema: z.object({
          projectId: z.string().optional().describe('Filter by project ID'),
          status: z.string().optional().describe('Filter by status (any kanban stage ID)'),
          assigneeId: z.string().optional().describe('Filter by assignee'),
        }),
        func: async ({ projectId, status, assigneeId }) => {
          try {
            // First get projects in this workspace to filter tasks
            const projectsResult = await this.db.table('projects')
              .select('id')
              .where('workspace_id', '=', this.context.workspaceId)
              .execute();

            const projectIds = (projectsResult.data || []).map((p: any) => p.id);

            if (projectIds.length === 0) {
              return JSON.stringify({ success: true, tasks: [], message: 'No projects found in workspace' });
            }

            let query = this.db.table('tasks')
              .select('*');

            if (projectId) {
              query = query.where('project_id', '=', projectId);
            }
            if (status) query = query.where('status', '=', status);

            const result = await query.limit(50).execute();

            // Filter tasks to only those in workspace projects
            const tasks = (result.data || []).filter((t: any) => projectIds.includes(t.project_id));

            return JSON.stringify({ success: true, tasks, count: tasks.length });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'update_task_status',
        description: 'Update the status of a task. Status can be any kanban stage ID from the project (e.g., "todo", "in_progress", "done", "review", or custom stage IDs).',
        schema: z.object({
          taskId: z.string().describe('Task ID to update'),
          status: z.string().describe('New status - can be any kanban stage ID (e.g., "todo", "in_progress", "done", "review", or custom stage ID)'),
        }),
        func: async ({ taskId, status }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would update task status',
              details: { taskId, status },
            });
          }

          try {
            await this.db.table('tasks')
              .update({ status, updated_at: new Date().toISOString() })
              .where('id', '=', taskId)
              .execute();
            return JSON.stringify({ success: true, message: `Task status updated to ${status}` });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'update_task',
        description: 'Update task properties like title, description, priority, or due date. Use this for comprehensive task updates.',
        schema: z.object({
          taskId: z.string().describe('Task ID to update'),
          title: z.string().optional().describe('New task title'),
          description: z.string().optional().describe('New task description'),
          priority: z.enum(['low', 'medium', 'high']).optional().describe('New task priority'),
          dueDate: z.string().optional().describe('New due date in ISO format'),
          labels: z.array(z.string()).optional().describe('Array of label strings'),
        }),
        func: async ({ taskId, title, description, priority, dueDate, labels }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would update task',
              details: { taskId, title, description, priority, dueDate, labels },
            });
          }

          try {
            const updates: Record<string, any> = { updated_at: new Date().toISOString() };
            if (title !== undefined) updates.title = title;
            if (description !== undefined) updates.description = description;
            if (priority !== undefined) updates.priority = priority;
            if (dueDate !== undefined) updates.due_date = dueDate;
            if (labels !== undefined) updates.labels = labels;

            await this.db.table('tasks')
              .update(updates)
              .where('id', '=', taskId)
              .execute();

            return JSON.stringify({
              success: true,
              message: `Task updated successfully`,
              updatedFields: Object.keys(updates).filter(k => k !== 'updated_at'),
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'delete_task',
        description: 'Delete a task. This performs a soft delete, marking the task as deleted.',
        schema: z.object({
          taskId: z.string().describe('Task ID to delete'),
        }),
        func: async ({ taskId }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would delete task',
              details: { taskId },
            });
          }

          try {
            await this.db.table('tasks')
              .update({
                is_deleted: true,
                deleted_at: new Date().toISOString(),
                deleted_by: this.context.userId,
                updated_at: new Date().toISOString(),
              })
              .where('id', '=', taskId)
              .execute();

            return JSON.stringify({
              success: true,
              message: 'Task deleted successfully',
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'assign_task',
        description: 'Assign a task to one or more users. Replaces the current assignee list.',
        schema: z.object({
          taskId: z.string().describe('Task ID to assign'),
          assigneeIds: z.array(z.string()).describe('Array of user IDs to assign the task to'),
        }),
        func: async ({ taskId, assigneeIds }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would assign task',
              details: { taskId, assigneeIds },
            });
          }

          try {
            await this.db.table('tasks')
              .update({
                assigned_to: assigneeIds,
                updated_at: new Date().toISOString(),
              })
              .where('id', '=', taskId)
              .execute();

            return JSON.stringify({
              success: true,
              message: `Task assigned to ${assigneeIds.length} user(s)`,
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'move_task',
        description: 'Move a task to a different project.',
        schema: z.object({
          taskId: z.string().describe('Task ID to move'),
          targetProjectId: z.string().describe('Target project ID to move the task to'),
        }),
        func: async ({ taskId, targetProjectId }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would move task',
              details: { taskId, targetProjectId },
            });
          }

          try {
            // Verify target project exists in workspace
            const projectResult = await this.db.table('projects')
              .select('id', 'name')
              .where('id', '=', targetProjectId)
              .where('workspace_id', '=', this.context.workspaceId)
              .execute();

            const projects: any[] = Array.isArray(projectResult) ? projectResult : (projectResult.data || []);
            if (projects.length === 0) {
              return JSON.stringify({ success: false, error: 'Target project not found in workspace' });
            }

            await this.db.table('tasks')
              .update({
                project_id: targetProjectId,
                updated_at: new Date().toISOString(),
              })
              .where('id', '=', taskId)
              .execute();

            return JSON.stringify({
              success: true,
              message: `Task moved to project "${projects[0].name}"`,
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'add_task_comment',
        description: 'Add a comment to a task.',
        schema: z.object({
          taskId: z.string().describe('Task ID to comment on'),
          content: z.string().describe('Comment content'),
        }),
        func: async ({ taskId, content }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would add task comment',
              details: { taskId, contentPreview: content.substring(0, 50) + '...' },
            });
          }

          try {
            const comment = await this.db.insert('task_comments', {
              task_id: taskId,
              user_id: this.context.userId,
              content,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

            return JSON.stringify({
              success: true,
              commentId: comment.id,
              message: 'Comment added successfully',
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),
    ];
  }

  // ============================================
  // CHAT TOOLS
  // ============================================

  private getChatTools(): DynamicStructuredTool[] {
    return [
      new DynamicStructuredTool({
        name: 'send_channel_message',
        description: 'Send a message to a channel. Use this when the user wants to post in a channel.',
        schema: z.object({
          channelId: z.string().describe('Channel ID to send message to'),
          content: z.string().describe('Message content'),
        }),
        func: async ({ channelId, content }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would send message to channel',
              details: { channelId, content: content.substring(0, 50) + '...' },
            });
          }

          try {
            this.logger.log(`[AutoPilot] Sending message to channel: ${channelId}, content length: ${content.length}`);
            const message = await this.chatService.sendMessage(
              { content, channel_id: channelId } as any,
              this.context.userId,
            );
            this.logger.log(`[AutoPilot] Channel message sent successfully: ${message.id}`);
            return JSON.stringify({ success: true, message, messageId: message.id });
          } catch (error) {
            this.logger.error(`[AutoPilot] Channel message error: ${error.message}`, error.stack);
            return JSON.stringify({ success: false, error: `Failed to send channel message: ${error.message}` });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'list_messages',
        description: 'List messages from a channel or conversation. Use this to get message IDs before editing or deleting messages. Returns messages with their IDs, content, and sender info.',
        schema: z.object({
          channelId: z.string().optional().describe('Channel ID to list messages from'),
          conversationId: z.string().optional().describe('Conversation ID (DM) to list messages from'),
          limit: z.number().optional().default(20).describe('Number of messages to return (default 20)'),
        }),
        func: async ({ channelId, conversationId, limit = 20 }) => {
          try {
            if (!channelId && !conversationId) {
              return JSON.stringify({
                success: false,
                error: 'Please provide either channelId or conversationId. Use list_channels or list_conversations first to get valid IDs.',
              });
            }

            let messages: any[] = [];
            if (channelId) {
              messages = await this.chatService.getChannelMessages(
                channelId,
                this.context.userId,
                limit,
                0,
              );
            } else if (conversationId) {
              messages = await this.chatService.getConversationMessages(
                conversationId,
                this.context.userId,
                limit,
                0,
              );
            }

            // Return simplified message data with IDs prominently displayed
            const simplifiedMessages = messages.map((msg: any) => ({
              id: msg.id, // This is the UUID needed for edit/delete
              content: msg.content?.substring(0, 100) + (msg.content?.length > 100 ? '...' : ''),
              senderName: msg.sender?.name || 'Unknown',
              senderId: msg.sender?.id || msg.user_id,
              createdAt: msg.createdAt || msg.created_at,
              isEdited: msg.isEdited || msg.is_edited || false,
            }));

            return JSON.stringify({
              success: true,
              messages: simplifiedMessages,
              count: simplifiedMessages.length,
              hint: 'Use the "id" field from these results for edit_message or delete_message operations.',
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'search_messages',
        description: 'Search for messages containing specific text.',
        schema: z.object({
          query: z.string().describe('Search query'),
          channelId: z.string().optional().describe('Limit search to specific channel'),
        }),
        func: async ({ query, channelId }) => {
          try {
            // Search messages using database query
            let queryBuilder = this.db.table('messages')
              .select('*')
              .where('content', 'ILIKE', `%${query}%`);

            if (channelId) {
              queryBuilder = queryBuilder.where('channel_id', '=', channelId);
            }

            const result = await queryBuilder.limit(50).execute();
            return JSON.stringify({ success: true, results: result.data || [] });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'list_channels',
        description: 'List all channels in the workspace.',
        schema: z.object({}),
        func: async () => {
          try {
            const channels = await this.chatService.getChannels(
              this.context.workspaceId,
              this.context.userId,
            );
            return JSON.stringify({ success: true, channels });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'edit_message',
        description: 'Edit a message you previously sent. Only the author can edit their own messages. IMPORTANT: You must first use list_messages to get valid message IDs before editing.',
        schema: z.object({
          messageId: z.string().describe('Message ID (UUID format) to edit - get this from list_messages first'),
          content: z.string().describe('New message content'),
        }),
        func: async ({ messageId, content }) => {
          // UUID validation
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!messageId || !uuidRegex.test(messageId)) {
            return JSON.stringify({
              success: false,
              error: 'Invalid message ID format. Please use list_messages first to get valid message IDs, then use the exact UUID from the results.',
            });
          }

          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would edit message',
              details: { messageId, newContent: content.substring(0, 50) + '...' },
            });
          }

          try {
            const updatedMessage = await this.chatService.updateMessage(
              messageId,
              { content },
              this.context.userId,
            );
            return JSON.stringify({ success: true, message: updatedMessage });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'delete_message',
        description: 'Delete a message you previously sent. Only the author can delete their own messages. IMPORTANT: You must first use list_messages to get valid message IDs before deleting.',
        schema: z.object({
          messageId: z.string().describe('Message ID (UUID format) to delete - get this from list_messages first'),
        }),
        func: async ({ messageId }) => {
          // UUID validation
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!messageId || !uuidRegex.test(messageId)) {
            return JSON.stringify({
              success: false,
              error: 'Invalid message ID format. Please use list_messages first to get valid message IDs, then use the exact UUID from the results.',
            });
          }

          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would delete message',
              details: { messageId },
            });
          }

          try {
            await this.chatService.deleteMessage(messageId, this.context.userId);
            return JSON.stringify({ success: true, message: 'Message deleted successfully' });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),
    ];
  }

  // ============================================
  // FILE TOOLS
  // ============================================

  private getFileTools(): DynamicStructuredTool[] {
    return [
      new DynamicStructuredTool({
        name: 'search_files',
        description: 'Search for files by name or content. Returns file IDs that can be used with send_email attachFileIds parameter to attach files to emails.',
        schema: z.object({
          query: z.string().describe('Search query'),
          fileType: z.string().optional().describe('Filter by file type (e.g., pdf, doc, image)'),
        }),
        func: async ({ query, fileType }) => {
          try {
            const filters = fileType ? { mime_type: fileType } : undefined;
            const files = await this.filesService.searchFiles(
              this.context.workspaceId,
              query,
              filters,
              1,
              50,
              this.context.userId,
            );
            return JSON.stringify({ success: true, files });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'list_recent_files',
        description: 'List recently uploaded or modified files. Returns file IDs that can be used with send_email attachFileIds parameter to attach files to emails.',
        schema: z.object({
          limit: z.number().optional().describe('Number of files to return (default 10)'),
        }),
        func: async ({ limit = 10 }) => {
          try {
            const files = await this.filesService.getFiles(
              this.context.workspaceId,
              undefined, // folderId
              1, // page
              limit,
              false, // isDeleted
              this.context.userId,
            );
            return JSON.stringify({ success: true, files });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'delete_file',
        description: 'Delete a file. This performs a soft delete, the file can be restored later.',
        schema: z.object({
          fileId: z.string().describe('File ID to delete'),
        }),
        func: async ({ fileId }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would delete file',
              details: { fileId },
            });
          }

          try {
            await this.filesService.deleteFile(
              fileId,
              this.context.workspaceId,
              this.context.userId,
            );

            return JSON.stringify({
              success: true,
              message: 'File deleted successfully',
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'move_file',
        description: 'Move a file to a different folder.',
        schema: z.object({
          fileId: z.string().describe('File ID to move'),
          targetFolderId: z.string().optional().describe('Target folder ID (null or omit for root folder)'),
        }),
        func: async ({ fileId, targetFolderId }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would move file',
              details: { fileId, targetFolderId },
            });
          }

          try {
            await this.filesService.moveFile(
              fileId,
              this.context.workspaceId,
              { target_folder_id: targetFolderId || null } as any,
              this.context.userId,
            );

            return JSON.stringify({
              success: true,
              message: `File moved successfully${targetFolderId ? '' : ' to root folder'}`,
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'create_folder',
        description: 'Create a new folder for organizing files.',
        schema: z.object({
          name: z.string().describe('Folder name'),
          parentFolderId: z.string().optional().describe('Parent folder ID (null or omit for root folder)'),
        }),
        func: async ({ name, parentFolderId }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would create folder',
              details: { name, parentFolderId },
            });
          }

          try {
            const folder = await this.filesService.createFolder(
              this.context.workspaceId,
              {
                name,
                parent_id: parentFolderId || null,
              } as any,
              this.context.userId,
            );

            return JSON.stringify({
              success: true,
              folderId: folder.id,
              folder,
              message: `Folder "${name}" created successfully`,
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'rename_file',
        description: 'Rename a file.',
        schema: z.object({
          fileId: z.string().describe('File ID to rename'),
          newName: z.string().describe('New file name'),
        }),
        func: async ({ fileId, newName }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would rename file',
              details: { fileId, newName },
            });
          }

          try {
            await this.filesService.updateFile(
              fileId,
              this.context.workspaceId,
              { name: newName } as any,
              this.context.userId,
            );

            return JSON.stringify({
              success: true,
              message: `File renamed to "${newName}"`,
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'list_folders',
        description: 'List folders in the workspace or within a specific parent folder.',
        schema: z.object({
          parentFolderId: z.string().optional().describe('Parent folder ID to list folders from (omit for root)'),
        }),
        func: async ({ parentFolderId }) => {
          try {
            const folders = await this.filesService.getFolders(
              this.context.workspaceId,
              parentFolderId,
              false,  // isDeleted
              this.context.userId,
            );
            return JSON.stringify({ success: true, folders, count: folders.length });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),
    ];
  }

  // ============================================
  // WORKSPACE TOOLS
  // ============================================

  private getWorkspaceTools(): DynamicStructuredTool[] {
    return [
      new DynamicStructuredTool({
        name: 'list_workspace_members',
        description: 'List all members of the current workspace.',
        schema: z.object({}),
        func: async () => {
          try {
            const result = await this.db.table('workspace_members')
              .select('*')
              .where('workspace_id', '=', this.context.workspaceId)
              .where('is_active', '=', true)
              .execute();

            const members = result.data || [];

            // Get user details for each member
            const membersWithDetails = await Promise.all(
              members.map(async (member: any) => {
                try {
                  const user = await this.db.getUserById(member.user_id);
                  return {
                    ...member,
                    email: user?.email,
                    name: user?.name,
                  };
                } catch {
                  return member;
                }
              })
            );

            return JSON.stringify({ success: true, members: membersWithDetails });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'list_projects',
        description: 'List all projects in the workspace.',
        schema: z.object({
          status: z.enum(['active', 'archived', 'all']).optional().describe('Filter by project status'),
        }),
        func: async ({ status = 'active' }) => {
          try {
            let query = this.db.table('projects')
              .select('*')
              .where('workspace_id', '=', this.context.workspaceId);

            if (status !== 'all') {
              query = query.where('status', '=', status);
            }

            const result = await query.execute();
            return JSON.stringify({ success: true, projects: result.data || [] });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'get_current_date_time',
        description: `Get the current date and time with the user's timezone. Use this to understand "today", "tomorrow", etc.

IMPORTANT: This returns the user's timezone. When scheduling actions at a specific time (e.g., "at 10:20 AM"), you MUST:
1. Use the userTimezone returned here
2. Create the ISO datetime with proper timezone conversion
3. For example, if userTimezone is "Asia/Dhaka" (UTC+6) and user says "10:20 AM":
   - 10:20 AM in Asia/Dhaka = 10:20 - 6 hours = 04:20 UTC
   - So scheduledTime should be "YYYY-MM-DDT04:20:00Z"`,
        schema: z.object({}),
        func: async () => {
          const now = new Date();

          // Get user's timezone from settings
          let userTimezone = 'UTC';
          let timezoneOffsetMinutes = 0;
          try {
            const settings = await this.settingsService.getNotificationSettings(this.context.userId);
            userTimezone = settings?.timezone || 'UTC';

            // Calculate timezone offset
            const formatter = new Intl.DateTimeFormat('en-US', {
              timeZone: userTimezone,
              timeZoneName: 'shortOffset',
            });
            const parts = formatter.formatToParts(now);
            const offsetPart = parts.find(p => p.type === 'timeZoneName');
            if (offsetPart) {
              // Parse offset like "GMT+6" or "GMT-5:30"
              const match = offsetPart.value.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
              if (match) {
                const sign = match[1] === '+' ? 1 : -1;
                const hours = parseInt(match[2], 10);
                const minutes = parseInt(match[3] || '0', 10);
                timezoneOffsetMinutes = sign * (hours * 60 + minutes);
              }
            }
          } catch (e) {
            this.logger.warn(`Could not get user timezone: ${e.message}`);
          }

          // Get local time in user's timezone
          const localTimeStr = now.toLocaleString('en-US', { timeZone: userTimezone });
          const localDateStr = now.toLocaleDateString('en-US', {
            timeZone: userTimezone,
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
          const localTimeOnlyStr = now.toLocaleTimeString('en-US', {
            timeZone: userTimezone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          });

          return JSON.stringify({
            success: true,
            utcDateTime: now.toISOString(),
            userTimezone,
            timezoneOffsetMinutes,
            timezoneOffsetHours: timezoneOffsetMinutes / 60,
            localDateTime: localTimeStr,
            localDate: localDateStr,
            localTime: localTimeOnlyStr,
            dayOfWeek: now.toLocaleDateString('en-US', { timeZone: userTimezone, weekday: 'long' }),
            note: `User is in ${userTimezone} (UTC${timezoneOffsetMinutes >= 0 ? '+' : ''}${timezoneOffsetMinutes / 60}). When user says a time like "10:20 AM", convert to UTC by subtracting ${timezoneOffsetMinutes / 60} hours.`,
          });
        },
      }),
    ];
  }

  // ============================================
  // NOTES TOOLS
  // ============================================

  private getNotesTools(): DynamicStructuredTool[] {
    return [
      new DynamicStructuredTool({
        name: 'create_note',
        description: `Create a new note. Use this when the user wants to save text, ideas, or meeting notes. Returns the noteId which can be used to attach this note to events, tasks, or emails.

EMAILING A NOTE - Two options:
1. INLINE (content in email body): Use send_email with includeNoteIds: [noteId]
2. AS ATTACHMENT (HTML file): Use send_email with attachNoteIds: [noteId]
3. BOTH: Use both includeNoteIds AND attachNoteIds in send_email`,
        schema: z.object({
          title: z.string().describe('Note title'),
          content: z.string().describe('Note content (can be plain text or markdown)'),
          parentId: z.string().optional().describe('Parent folder ID if organizing in folders'),
        }),
        func: async ({ title, content, parentId }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would create note',
              details: { title, contentPreview: content.substring(0, 100) + '...' },
            });
          }

          try {
            const note = await this.notesService.createNote(
              this.context.workspaceId,
              {
                title,
                content,
                parent_id: parentId,
              } as any,
              this.context.userId,
            );
            return JSON.stringify({
              success: true,
              noteId: note.id,
              note,
              message: `Note "${title}" created successfully. Use noteId "${note.id}" to attach this note to events or tasks.`,
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'list_notes',
        description: 'List notes in the workspace.',
        schema: z.object({
          parentId: z.string().optional().describe('Parent folder ID to list notes from'),
          limit: z.number().optional().describe('Number of notes to return (default 20)'),
        }),
        func: async ({ parentId, limit = 20 }) => {
          try {
            const notes = await this.notesService.getNotes(
              this.context.workspaceId,
              parentId,
              this.context.userId,
              false, // isDeleted
              false, // isArchived
            );
            const limitedNotes = notes.slice(0, limit);
            return JSON.stringify({ success: true, notes: limitedNotes, count: limitedNotes.length });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'search_notes',
        description: 'Search for notes by title or content.',
        schema: z.object({
          query: z.string().describe('Search query'),
        }),
        func: async ({ query }) => {
          try {
            const notes = await this.notesService.searchNotes(
              this.context.workspaceId,
              query,
              this.context.userId,
            );
            return JSON.stringify({ success: true, notes, count: notes.length });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'update_note',
        description: 'Update an existing note. Can update title, content, or both.',
        schema: z.object({
          noteId: z.string().describe('Note ID to update'),
          title: z.string().optional().describe('New note title'),
          content: z.string().optional().describe('New note content'),
        }),
        func: async ({ noteId, title, content }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would update note',
              details: { noteId, title, contentPreview: content?.substring(0, 50) },
            });
          }

          try {
            const updates: any = {};
            if (title !== undefined) updates.title = title;
            if (content !== undefined) updates.content = content;

            const note = await this.notesService.updateNote(
              noteId,
              this.context.workspaceId,
              updates,
              this.context.userId,
            );

            return JSON.stringify({
              success: true,
              note,
              message: 'Note updated successfully',
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'delete_note',
        description: 'Delete a note. This performs a soft delete, the note can be restored later.',
        schema: z.object({
          noteId: z.string().describe('Note ID to delete'),
        }),
        func: async ({ noteId }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would delete note',
              details: { noteId },
            });
          }

          try {
            await this.notesService.deleteNote(
              noteId,
              this.context.workspaceId,
              this.context.userId,
            );

            return JSON.stringify({
              success: true,
              message: 'Note deleted successfully',
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'archive_note',
        description: 'Archive a note by ID or title. Archived notes are hidden from the main list but not deleted. Use title for exact match when user specifies note by name.',
        schema: z.object({
          noteId: z.string().optional().describe('Note ID to archive (use this if you have the ID)'),
          title: z.string().optional().describe('Exact note title to archive (use this when user specifies note by name)'),
        }),
        func: async ({ noteId, title }) => {
          try {
            let targetNoteId = noteId;
            let noteTitle = title;

            // If title is provided but not noteId, find the note by exact title match
            if (!targetNoteId && title) {
              const result = await this.db.table('notes')
                .select('id', 'title')
                .where('title', '=', title)
                .where('workspace_id', '=', this.context.workspaceId)
                .where('is_deleted', '=', false)
                .execute();

              const notes = Array.isArray(result) ? result : [];
              if (notes.length === 0) {
                // Try case-insensitive search
                const allNotesResult = await this.db.table('notes')
                  .select('id', 'title')
                  .where('workspace_id', '=', this.context.workspaceId)
                  .where('is_deleted', '=', false)
                  .execute();

                const allNotes = Array.isArray(allNotesResult) ? allNotesResult : [];
                const matchingNote = allNotes.find((n: any) =>
                  n.title.toLowerCase() === title.toLowerCase()
                );

                if (!matchingNote) {
                  return JSON.stringify({
                    success: false,
                    error: `No note found with title "${title}". Please check the title and try again.`,
                  });
                }
                targetNoteId = matchingNote.id;
                noteTitle = matchingNote.title;
              } else {
                targetNoteId = notes[0].id;
                noteTitle = notes[0].title;
              }
            }

            if (!targetNoteId) {
              return JSON.stringify({
                success: false,
                error: 'Either noteId or title must be provided',
              });
            }

            if (!this.context.executeActions) {
              return JSON.stringify({
                preview: true,
                action: 'Would archive note',
                details: { noteId: targetNoteId, title: noteTitle },
              });
            }

            await this.db.table('notes')
              .update({
                archived_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .where('id', '=', targetNoteId)
              .where('workspace_id', '=', this.context.workspaceId)
              .execute();

            return JSON.stringify({
              success: true,
              message: `Note "${noteTitle || targetNoteId}" archived successfully`,
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'restore_note',
        description: 'Restore a deleted or archived note by ID or title.',
        schema: z.object({
          noteId: z.string().optional().describe('Note ID to restore (use this if you have the ID)'),
          title: z.string().optional().describe('Exact note title to restore (use this when user specifies note by name)'),
        }),
        func: async ({ noteId, title }) => {
          try {
            let targetNoteId = noteId;
            let noteTitle = title;

            // If title is provided but not noteId, find the note by title (including deleted/archived)
            if (!targetNoteId && title) {
              const result = await this.db.table('notes')
                .select('id', 'title')
                .where('title', '=', title)
                .where('workspace_id', '=', this.context.workspaceId)
                .execute();

              const notes = Array.isArray(result) ? result : [];
              if (notes.length === 0) {
                // Try case-insensitive search
                const allNotesResult = await this.db.table('notes')
                  .select('id', 'title')
                  .where('workspace_id', '=', this.context.workspaceId)
                  .execute();

                const allNotes = Array.isArray(allNotesResult) ? allNotesResult : [];
                const matchingNote = allNotes.find((n: any) =>
                  n.title.toLowerCase() === title.toLowerCase()
                );

                if (!matchingNote) {
                  return JSON.stringify({
                    success: false,
                    error: `No note found with title "${title}". Please check the title and try again.`,
                  });
                }
                targetNoteId = matchingNote.id;
                noteTitle = matchingNote.title;
              } else {
                targetNoteId = notes[0].id;
                noteTitle = notes[0].title;
              }
            }

            if (!targetNoteId) {
              return JSON.stringify({
                success: false,
                error: 'Either noteId or title must be provided',
              });
            }

            if (!this.context.executeActions) {
              return JSON.stringify({
                preview: true,
                action: 'Would restore note',
                details: { noteId: targetNoteId, title: noteTitle },
              });
            }

            await this.db.table('notes')
              .update({
                is_deleted: false,
                deleted_at: null,
                archived_at: null,
                updated_at: new Date().toISOString(),
              })
              .where('id', '=', targetNoteId)
              .where('workspace_id', '=', this.context.workspaceId)
              .execute();

            return JSON.stringify({
              success: true,
              message: `Note "${noteTitle || targetNoteId}" restored successfully`,
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'duplicate_note',
        description: 'Create a copy of an existing note.',
        schema: z.object({
          noteId: z.string().describe('Note ID to duplicate'),
          newTitle: z.string().optional().describe('Title for the duplicated note (default: "Copy of [original title]")'),
        }),
        func: async ({ noteId, newTitle }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would duplicate note',
              details: { noteId, newTitle },
            });
          }

          try {
            // Get the original note
            const originalNote = await this.notesService.getNote(
              noteId,
              this.context.workspaceId,
              this.context.userId,
            );

            if (!originalNote) {
              return JSON.stringify({ success: false, error: 'Note not found' });
            }

            // Create the duplicate
            const duplicatedNote = await this.notesService.createNote(
              this.context.workspaceId,
              {
                title: newTitle || `Copy of ${originalNote.title}`,
                content: originalNote.content,
                parent_id: originalNote.parent_id,
              } as any,
              this.context.userId,
            );

            return JSON.stringify({
              success: true,
              noteId: duplicatedNote.id,
              note: duplicatedNote,
              message: `Note duplicated successfully as "${duplicatedNote.title}"`,
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),
    ];
  }

  // ============================================
  // EMAIL TOOLS
  // ============================================

  private getEmailTools(): DynamicStructuredTool[] {
    return [
      new DynamicStructuredTool({
        name: 'send_email',
        description: `Send an email through the connected Gmail account with optional attachments. Requires Gmail to be connected.

TWO WAYS TO INCLUDE CONTENT:

1. INLINE (in email body) - use these to include content directly in the email:
   - includeNoteIds: Note content appears in the email body
   - includeProjectIds: Project summary appears in the email body

2. AS ATTACHMENTS (separate files) - use these to attach files:
   - attachNoteIds: Attaches notes as .html files
   - attachProjectIds: Attaches project summaries as .txt files
   - attachFileIds: Attaches actual files from storage

Example: Create a note and email it:
- Include in body: send_email with includeNoteIds: [noteId]
- Attach as file: send_email with attachNoteIds: [noteId]
- Both: send_email with includeNoteIds: [noteId] AND attachNoteIds: [noteId]`,
        schema: z.object({
          to: z.array(z.string()).describe('List of recipient email addresses'),
          subject: z.string().describe('Email subject'),
          body: z.string().describe('Email body content (can be HTML)'),
          cc: z.array(z.string()).optional().describe('CC recipients'),
          bcc: z.array(z.string()).optional().describe('BCC recipients'),
          // Inline content (in email body)
          includeNoteIds: z.array(z.string()).optional().describe('Note IDs to include content INLINE in email body'),
          includeProjectIds: z.array(z.string()).optional().describe('Project IDs to include summary INLINE in email body'),
          // File attachments
          attachNoteIds: z.array(z.string()).optional().describe('Note IDs to ATTACH as HTML files'),
          attachProjectIds: z.array(z.string()).optional().describe('Project IDs to ATTACH as text summary files'),
          attachFileIds: z.array(z.string()).optional().describe('File IDs to ATTACH from storage'),
        }),
        func: async ({ to, subject, body, cc, bcc, includeNoteIds, includeProjectIds, attachNoteIds, attachProjectIds, attachFileIds }) => {
          const attachments: { filename: string; content: string; mimeType: string }[] = [];
          const attachmentNames: string[] = [];
          let finalBody = body;
          const inlineContentNames: string[] = [];

          // ========== INLINE CONTENT (in email body) ==========

          // Include notes inline in email body
          if (includeNoteIds && includeNoteIds.length > 0) {
            for (const noteId of includeNoteIds) {
              try {
                this.logger.log(`[AutoPilot] Fetching note ${noteId} for inline inclusion`);
                const noteResult = await this.db
                  .table('notes')
                  .select('*')
                  .where('id', '=', noteId)
                  .where('workspace_id', '=', this.context.workspaceId)
                  .execute();

                const note = noteResult?.data?.[0];
                if (note) {
                  finalBody += `\n\n<hr>\n<h3>📝 ${note.title}</h3>\n<div>${note.content || ''}</div>`;
                  inlineContentNames.push(`Note: ${note.title}`);
                  this.logger.log(`[AutoPilot] Note "${note.title}" included inline`);
                }
              } catch (err) {
                this.logger.warn(`[AutoPilot] Could not fetch note ${noteId}: ${err.message}`);
              }
            }
          }

          // Include projects inline in email body
          if (includeProjectIds && includeProjectIds.length > 0) {
            for (const projectId of includeProjectIds) {
              try {
                this.logger.log(`[AutoPilot] Fetching project ${projectId} for inline inclusion`);
                const projectResult = await this.db
                  .table('projects')
                  .select('*')
                  .where('id', '=', projectId)
                  .where('workspace_id', '=', this.context.workspaceId)
                  .execute();

                const project = projectResult?.data?.[0];
                if (project) {
                  const tasksResult = await this.db
                    .table('tasks')
                    .select('*')
                    .where('project_id', '=', projectId)
                    .execute();
                  const tasks = tasksResult?.data || [];

                  const tasksList = tasks.map((t: any) =>
                    `<li>[${t.status || 'pending'}] ${t.title}${t.due_date ? ` (Due: ${t.due_date})` : ''}</li>`
                  ).join('') || '<li>No tasks</li>';

                  finalBody += `\n\n<hr>\n<h3>📁 Project: ${project.name}</h3>
<p><strong>Description:</strong> ${project.description || 'No description'}</p>
<p><strong>Status:</strong> ${project.status || 'Active'}</p>
<p><strong>Tasks (${tasks.length}):</strong></p>
<ul>${tasksList}</ul>`;
                  inlineContentNames.push(`Project: ${project.name}`);
                  this.logger.log(`[AutoPilot] Project "${project.name}" included inline`);
                }
              } catch (err) {
                this.logger.warn(`[AutoPilot] Could not fetch project ${projectId}: ${err.message}`);
              }
            }
          }

          // ========== FILE ATTACHMENTS ==========

          // Attach notes as HTML files
          if (attachNoteIds && attachNoteIds.length > 0) {
            for (const noteId of attachNoteIds) {
              try {
                this.logger.log(`[AutoPilot] Fetching note ${noteId} for attachment`);
                const noteResult = await this.db
                  .table('notes')
                  .select('*')
                  .where('id', '=', noteId)
                  .where('workspace_id', '=', this.context.workspaceId)
                  .execute();

                const note = noteResult?.data?.[0];
                if (note) {
                  const noteHtml = `<!DOCTYPE html>
<html>
<head><title>${note.title}</title></head>
<body>
<h1>${note.title}</h1>
<div>${note.content || ''}</div>
<hr>
<p><small>Created: ${note.created_at}</small></p>
</body>
</html>`;
                  const filename = `${note.title.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
                  attachments.push({
                    filename,
                    content: Buffer.from(noteHtml).toString('base64'),
                    mimeType: 'text/html',
                  });
                  attachmentNames.push(`Note: ${note.title}`);
                  this.logger.log(`[AutoPilot] Note "${note.title}" prepared as attachment`);
                }
              } catch (err) {
                this.logger.warn(`[AutoPilot] Could not fetch note ${noteId}: ${err.message}`);
              }
            }
          }

          // Attach projects as text summaries
          if (attachProjectIds && attachProjectIds.length > 0) {
            for (const projectId of attachProjectIds) {
              try {
                this.logger.log(`[AutoPilot] Fetching project ${projectId} for attachment`);
                const projectResult = await this.db
                  .table('projects')
                  .select('*')
                  .where('id', '=', projectId)
                  .where('workspace_id', '=', this.context.workspaceId)
                  .execute();

                const project = projectResult?.data?.[0];
                if (project) {
                  // Get project tasks
                  const tasksResult = await this.db
                    .table('tasks')
                    .select('*')
                    .where('project_id', '=', projectId)
                    .execute();
                  const tasks = tasksResult?.data || [];

                  const projectSummary = `PROJECT: ${project.name}
========================================
Description: ${project.description || 'No description'}
Status: ${project.status || 'Active'}
Created: ${project.created_at}

TASKS (${tasks.length} total):
----------------------------------------
${tasks.map((t: any) => `- [${t.status || 'pending'}] ${t.title}${t.due_date ? ` (Due: ${t.due_date})` : ''}`).join('\n') || 'No tasks'}
`;
                  const filename = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_summary.txt`;
                  attachments.push({
                    filename,
                    content: Buffer.from(projectSummary).toString('base64'),
                    mimeType: 'text/plain',
                  });
                  attachmentNames.push(`Project: ${project.name}`);
                  this.logger.log(`[AutoPilot] Project "${project.name}" prepared as attachment`);
                }
              } catch (err) {
                this.logger.warn(`[AutoPilot] Could not fetch project ${projectId}: ${err.message}`);
              }
            }
          }

          // Attach files from storage
          if (attachFileIds && attachFileIds.length > 0) {
            for (const fileId of attachFileIds) {
              try {
                this.logger.log(`[AutoPilot] Fetching file ${fileId} for attachment`);
                const fileData = await this.filesService.downloadFile(
                  fileId,
                  this.context.workspaceId,
                  this.context.userId,
                );
                if (fileData) {
                  attachments.push({
                    filename: fileData.fileName,
                    content: fileData.content.toString('base64'),
                    mimeType: fileData.mimeType || 'application/octet-stream',
                  });
                  attachmentNames.push(`File: ${fileData.fileName}`);
                  this.logger.log(`[AutoPilot] File "${fileData.fileName}" prepared as attachment`);
                }
              } catch (err) {
                this.logger.warn(`[AutoPilot] Could not fetch file ${fileId}: ${err.message}`);
              }
            }
          }

          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would send email',
              details: {
                to,
                subject,
                bodyPreview: finalBody.substring(0, 100) + '...',
                inlineContent: inlineContentNames,
                attachments: attachmentNames,
              },
            });
          }

          try {
            const result = await this.emailService.sendEmail(
              this.context.userId,
              this.context.workspaceId,
              {
                to,
                subject,
                body: finalBody,
                cc,
                bcc,
                isHtml: true,
                attachments: attachments.length > 0 ? attachments : undefined,
              } as any,
            );
            this.logger.log(`[AutoPilot] Email sent successfully with ${inlineContentNames.length} inline content(s) and ${attachments.length} attachment(s)`);
            const inlineMsg = inlineContentNames.length > 0 ? ` with inline content: ${inlineContentNames.join(', ')}` : '';
            const attachmentMsg = attachments.length > 0 ? ` and ${attachments.length} attachment(s): ${attachmentNames.join(', ')}` : '';
            return JSON.stringify({ success: true, result, message: `Email sent to ${to.join(', ')}${inlineMsg}${attachmentMsg}` });
          } catch (error) {
            this.logger.error(`[AutoPilot] Email send error: ${error.message}`, error.stack);
            if (error.message?.includes('not found') || error.message?.includes('not connected') || error.message?.includes('Gmail')) {
              return JSON.stringify({ success: false, error: 'Gmail is not connected. Please connect your Gmail account first in the Email section.' });
            }
            return JSON.stringify({ success: false, error: `Failed to send email: ${error.message}` });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'list_emails',
        description: 'List recent emails from the connected Gmail account.',
        schema: z.object({
          labelId: z.string().optional().describe('Gmail label ID (e.g., INBOX, SENT, DRAFT)'),
          query: z.string().optional().describe('Search query to filter emails'),
          limit: z.number().optional().describe('Number of emails to return (default 10)'),
        }),
        func: async ({ labelId = 'INBOX', query, limit = 10 }) => {
          try {
            this.logger.log(`[AutoPilot] Listing emails - labelId: ${labelId}, query: ${query || 'none'}, limit: ${limit}`);
            const result = await this.emailService.getMessages(
              this.context.userId,
              this.context.workspaceId,
              { labelId, query, maxResults: limit },
            );
            this.logger.log(`[AutoPilot] Retrieved ${result.emails?.length || 0} emails`);
            return JSON.stringify({ success: true, emails: result.emails, count: result.emails?.length || 0 });
          } catch (error) {
            this.logger.error(`[AutoPilot] List emails error: ${error.message}`, error.stack);
            if (error.message?.includes('not found') || error.message?.includes('not connected') || error.message?.includes('Gmail')) {
              return JSON.stringify({ success: false, error: 'Gmail is not connected. Please connect your Gmail account first in the Email section.' });
            }
            return JSON.stringify({ success: false, error: `Failed to list emails: ${error.message}` });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'get_email',
        description: 'Get a specific email by its ID.',
        schema: z.object({
          messageId: z.string().describe('The email message ID'),
        }),
        func: async ({ messageId }) => {
          try {
            const email = await this.emailService.getMessage(
              this.context.userId,
              this.context.workspaceId,
              messageId,
            );
            return JSON.stringify({ success: true, email });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'delete_email',
        description: 'Delete an email (move to trash or permanently delete).',
        schema: z.object({
          messageId: z.string().describe('The email message ID to delete'),
          permanent: z.boolean().optional().describe('If true, permanently delete. Otherwise move to trash.'),
        }),
        func: async ({ messageId, permanent = false }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: permanent ? 'Would permanently delete email' : 'Would move email to trash',
              details: { messageId },
            });
          }

          try {
            await this.emailService.deleteEmail(
              this.context.userId,
              this.context.workspaceId,
              messageId,
              permanent,
            );
            return JSON.stringify({
              success: true,
              message: permanent ? 'Email permanently deleted' : 'Email moved to trash'
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'archive_email',
        description: 'Archive an email by removing it from inbox.',
        schema: z.object({
          messageId: z.string().describe('The email message ID to archive'),
        }),
        func: async ({ messageId }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would archive email',
              details: { messageId },
            });
          }

          try {
            await this.emailService.updateLabels(
              this.context.userId,
              this.context.workspaceId,
              messageId,
              [],
              ['INBOX'],
            );
            return JSON.stringify({ success: true, message: 'Email archived successfully' });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'mark_email_read',
        description: 'Mark an email as read or unread.',
        schema: z.object({
          messageId: z.string().describe('The email message ID'),
          isRead: z.boolean().describe('True to mark as read, false to mark as unread'),
        }),
        func: async ({ messageId, isRead }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: isRead ? 'Would mark email as read' : 'Would mark email as unread',
              details: { messageId },
            });
          }

          try {
            await this.emailService.markAsRead(
              this.context.userId,
              this.context.workspaceId,
              messageId,
              isRead,
            );
            return JSON.stringify({
              success: true,
              message: isRead ? 'Email marked as read' : 'Email marked as unread'
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),
    ];
  }

  // ============================================
  // VIDEO CALL TOOLS
  // ============================================

  private getVideoCallTools(): DynamicStructuredTool[] {
    return [
      new DynamicStructuredTool({
        name: 'create_video_meeting',
        description: 'Create a video call/meeting. Can be instant or scheduled.',
        schema: z.object({
          title: z.string().describe('Meeting title'),
          description: z.string().optional().describe('Meeting description'),
          scheduledStartTime: z.string().optional().describe('Scheduled start time in ISO format (omit for instant meeting)'),
          scheduledEndTime: z.string().optional().describe('Scheduled end time in ISO format'),
          participantIds: z.array(z.string()).optional().describe('User IDs to invite to the meeting'),
          callType: z.enum(['video', 'audio']).optional().describe('Type of call (default: video)'),
        }),
        func: async ({ title, description, scheduledStartTime, scheduledEndTime, participantIds, callType = 'video' }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would create video meeting',
              details: { title, scheduledStartTime, participantIds },
            });
          }

          try {
            const call = await this.videoCallsService.createCall(
              this.context.workspaceId,
              this.context.userId,
              {
                title,
                description,
                scheduled_start_time: scheduledStartTime,
                scheduled_end_time: scheduledEndTime,
                participant_ids: participantIds || [],
                call_type: callType,
                is_group_call: (participantIds?.length || 0) > 1,
              } as any,
            );
            return JSON.stringify({
              success: true,
              meetingId: call.id,
              call: {
                id: call.id,
                title: call.title,
                status: call.status,
                joinUrl: call.livekit_room?.joinUrl,
              },
              message: scheduledStartTime
                ? `Video meeting "${title}" scheduled successfully. Meeting ID: ${call.id}`
                : `Instant video meeting "${title}" created successfully. Meeting ID: ${call.id}`,
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'list_video_meetings',
        description: 'List video meetings in the workspace.',
        schema: z.object({
          status: z.enum(['scheduled', 'active', 'ended', 'all']).optional().describe('Filter by meeting status'),
        }),
        func: async ({ status }) => {
          try {
            const filters: any = {};
            if (status && status !== 'all') {
              filters.status = status;
            }
            const calls = await this.videoCallsService.getCallsByWorkspace(
              this.context.workspaceId,
              this.context.userId,
              filters,
            );
            return JSON.stringify({ success: true, meetings: calls, count: calls.length });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'end_video_meeting',
        description: 'End a video meeting. Only the host can end a meeting.',
        schema: z.object({
          callId: z.string().describe('The video call/meeting ID to end'),
        }),
        func: async ({ callId }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would end video meeting',
              details: { callId },
            });
          }

          try {
            await this.videoCallsService.endCall(callId, this.context.userId);
            return JSON.stringify({ success: true, message: 'Video meeting ended successfully' });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'invite_to_meeting',
        description: 'Invite additional participants to an ongoing or scheduled video meeting.',
        schema: z.object({
          callId: z.string().describe('The video call/meeting ID'),
          userIds: z.array(z.string()).optional().describe('User IDs to invite'),
          emails: z.array(z.string()).optional().describe('Email addresses to invite'),
        }),
        func: async ({ callId, userIds, emails }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would invite participants to meeting',
              details: { callId, userIds, emails },
            });
          }

          try {
            await this.videoCallsService.inviteParticipants(
              callId,
              this.context.userId,
              { userIds, emails } as any,
            );
            const inviteCount = (userIds?.length || 0) + (emails?.length || 0);
            return JSON.stringify({
              success: true,
              message: `Invited ${inviteCount} participant(s) to the meeting`
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),
    ];
  }

  // ============================================
  // PROJECT TOOLS
  // ============================================

  private getProjectTools(): DynamicStructuredTool[] {
    return [
      new DynamicStructuredTool({
        name: 'create_project',
        description: 'Create a new project in the workspace. Returns projectId which can be used to create tasks in this project.',
        schema: z.object({
          name: z.string().describe('Project name'),
          description: z.string().optional().describe('Project description'),
        }),
        func: async ({ name, description }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would create project',
              details: { name, description },
            });
          }

          try {
            const project = await this.projectsService.create(
              this.context.workspaceId,
              {
                name,
                description,
              } as any,
              this.context.userId,
            );
            return JSON.stringify({
              success: true,
              projectId: project.id,
              project,
              message: `Project "${name}" created successfully. Use projectId "${project.id}" when creating tasks for this project.`,
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'update_project',
        description: 'Update a project. Can update name, description, or status.',
        schema: z.object({
          projectId: z.string().describe('Project ID to update'),
          name: z.string().optional().describe('New project name'),
          description: z.string().optional().describe('New project description'),
          status: z.enum(['active', 'archived', 'completed']).optional().describe('New project status'),
        }),
        func: async ({ projectId, name, description, status }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would update project',
              details: { projectId, name, description, status },
            });
          }

          try {
            const updates: any = {};
            if (name !== undefined) updates.name = name;
            if (description !== undefined) updates.description = description;
            if (status !== undefined) updates.status = status;

            const project = await this.projectsService.update(
              projectId,
              updates,
              this.context.userId,
            );

            return JSON.stringify({
              success: true,
              project,
              message: 'Project updated successfully',
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'delete_project',
        description: 'Delete a project. This will also delete all tasks in the project.',
        schema: z.object({
          projectId: z.string().describe('Project ID to delete'),
        }),
        func: async ({ projectId }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would delete project',
              details: { projectId },
            });
          }

          try {
            await this.projectsService.remove(
              projectId,
              this.context.userId,
            );

            return JSON.stringify({
              success: true,
              message: 'Project deleted successfully',
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'get_project_details',
        description: 'Get detailed information about a project including its tasks and members.',
        schema: z.object({
          projectId: z.string().describe('Project ID to get details for'),
        }),
        func: async ({ projectId }) => {
          try {
            const project = await this.projectsService.findOne(
              projectId,
              this.context.userId,
            );

            return JSON.stringify({
              success: true,
              project,
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'add_project_member',
        description: 'Add a member to a project.',
        schema: z.object({
          projectId: z.string().describe('Project ID'),
          userId: z.string().describe('User ID to add as member'),
          role: z.enum(['member', 'admin', 'viewer']).optional().describe('Member role (default: member)'),
        }),
        func: async ({ projectId, userId, role = 'member' }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would add project member',
              details: { projectId, userId, role },
            });
          }

          try {
            await this.db.insert('project_members', {
              project_id: projectId,
              user_id: userId,
              role,
              joined_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            });

            return JSON.stringify({
              success: true,
              message: `Member added to project with role: ${role}`,
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'remove_project_member',
        description: 'Remove a member from a project.',
        schema: z.object({
          projectId: z.string().describe('Project ID'),
          userId: z.string().describe('User ID to remove'),
        }),
        func: async ({ projectId, userId }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would remove project member',
              details: { projectId, userId },
            });
          }

          try {
            await this.db.table('project_members')
              .delete()
              .where('project_id', '=', projectId)
              .where('user_id', '=', userId)
              .execute();

            return JSON.stringify({
              success: true,
              message: 'Member removed from project',
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'list_project_members',
        description: 'List all members of a project.',
        schema: z.object({
          projectId: z.string().describe('Project ID'),
        }),
        func: async ({ projectId }) => {
          try {
            const result = await this.db.table('project_members')
              .select('*')
              .where('project_id', '=', projectId)
              .execute();

            const members = result.data || [];

            // Get user details for each member
            const membersWithDetails = await Promise.all(
              members.map(async (member: any) => {
                try {
                  const user = await this.db.getUserById(member.user_id);
                  return {
                    ...member,
                    email: user?.email,
                    name: user?.name,
                  };
                } catch {
                  return member;
                }
              })
            );

            return JSON.stringify({
              success: true,
              members: membersWithDetails,
              count: membersWithDetails.length,
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),
    ];
  }

  // ============================================
  // DIRECT MESSAGE TOOLS
  // ============================================

  private getDirectMessageTools(): DynamicStructuredTool[] {
    return [
      new DynamicStructuredTool({
        name: 'send_direct_message',
        description: 'Send a direct message to a specific user. Use this when the user wants to message someone directly (not in a channel). First finds or creates a conversation with the recipient.',
        schema: z.object({
          recipientId: z.string().describe('User ID of the recipient'),
          content: z.string().describe('Message content'),
        }),
        func: async ({ recipientId, content }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would send direct message',
              details: { recipientId, contentPreview: content.substring(0, 50) + '...' },
            });
          }

          try {
            this.logger.log(`[AutoPilot] Sending direct message to recipient: ${recipientId}`);

            // First, check if there's an existing conversation with this user
            const conversations = await this.chatService.getConversations(
              this.context.workspaceId,
              this.context.userId,
            );
            this.logger.log(`[AutoPilot] Found ${conversations.length} existing conversations`);

            // Find existing DM conversation with this recipient
            // Conversations use 'participants' field which contains array of user IDs
            let conversation = conversations.find((c: any) => {
              // Parse participants if it's a string
              const participants = typeof c.participants === 'string'
                ? JSON.parse(c.participants)
                : c.participants || [];
              return participants.includes(recipientId) && participants.includes(this.context.userId);
            });

            // If no existing conversation, create one
            if (!conversation) {
              this.logger.log(`[AutoPilot] No existing conversation found, creating new one`);
              conversation = await this.chatService.createConversation(
                this.context.workspaceId,
                {
                  type: 'direct',
                  participants: [recipientId],  // Use 'participants' not 'member_ids'
                } as any,
                this.context.userId,
              );
              this.logger.log(`[AutoPilot] Created new conversation: ${conversation.id}`);
            } else {
              this.logger.log(`[AutoPilot] Using existing conversation: ${conversation.id}`);
            }

            // Then send the message to that conversation
            const message = await this.chatService.sendMessage(
              { content, conversation_id: conversation.id } as any,
              this.context.userId,
            );
            this.logger.log(`[AutoPilot] Direct message sent successfully: ${message.id}`);
            return JSON.stringify({
              success: true,
              message,
              messageId: message.id,
              conversationId: conversation.id,
            });
          } catch (error) {
            this.logger.error(`[AutoPilot] Direct message error: ${error.message}`, error.stack);
            return JSON.stringify({ success: false, error: `Failed to send direct message: ${error.message}` });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'list_conversations',
        description: 'List direct message conversations (DMs) with other users.',
        schema: z.object({}),
        func: async () => {
          try {
            const conversations = await this.chatService.getConversations(
              this.context.workspaceId,
              this.context.userId,
            );
            return JSON.stringify({ success: true, conversations });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),
    ];
  }

  // ============================================
  // SMART SUMMARY TOOLS
  // ============================================

  private getSummaryTools(): DynamicStructuredTool[] {
    return [
      new DynamicStructuredTool({
        name: 'get_daily_summary',
        description: 'Get a comprehensive summary of today\'s activities including tasks, meetings, messages, and notes. Use this when user asks about their day, daily summary, or what they have today.',
        schema: z.object({
          date: z.string().optional().describe('Date to summarize in ISO format (defaults to today)'),
        }),
        func: async ({ date }) => {
          try {
            const targetDate = date ? new Date(date) : new Date();
            const startOfDay = new Date(targetDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(targetDate);
            endOfDay.setHours(23, 59, 59, 999);

            // Get projects in workspace first
            const projectsResult = await this.db.table('projects')
              .select('id')
              .where('workspace_id', '=', this.context.workspaceId)
              .execute();
            const projectIds = (projectsResult.data || []).map((p: any) => p.id);

            // Fetch tasks
            let tasksData = { completed: [], pending: [], inProgress: [], overdue: [] };
            if (projectIds.length > 0) {
              const tasksResult = await this.db.table('tasks')
                .select('*')
                .execute();
              // Filter tasks to workspace projects in JavaScript
              const allTasks: any[] = (tasksResult.data || []).filter((t: any) => projectIds.includes(t.project_id));

              const today = new Date();
              tasksData = {
                completed: allTasks.filter((t: any) => t.status === 'done'),
                pending: allTasks.filter((t: any) => t.status === 'todo'),
                inProgress: allTasks.filter((t: any) => t.status === 'in_progress'),
                overdue: allTasks.filter((t: any) => {
                  if (!t.due_date || t.status === 'done') return false;
                  return new Date(t.due_date) < today;
                }),
              };
            }

            // Fetch calendar events for today
            let events = [];
            try {
              events = await this.calendarService.getEvents(
                this.context.workspaceId,
                startOfDay.toISOString(),
                endOfDay.toISOString(),
                this.context.userId,
              );
            } catch (e) {
              this.logger.warn(`[Summary] Failed to fetch calendar events: ${e.message}`);
            }

            // Fetch recent notes created today
            let notesCreatedToday = [];
            try {
              const notesResult = await this.db.table('notes')
                .select('*')
                .where('workspace_id', '=', this.context.workspaceId)
                .where('created_by', '=', this.context.userId)
                .execute();
              // Filter by date in JavaScript
              notesCreatedToday = (notesResult.data || []).filter((n: any) => {
                if (!n.created_at) return false;
                const createdAt = new Date(n.created_at);
                return createdAt >= startOfDay && createdAt <= endOfDay;
              });
            } catch (e) {
              this.logger.warn(`[Summary] Failed to fetch notes: ${e.message}`);
            }

            // Build summary
            const summary = {
              date: targetDate.toDateString(),
              tasks: {
                completed: tasksData.completed.length,
                pending: tasksData.pending.length,
                inProgress: tasksData.inProgress.length,
                overdue: tasksData.overdue.length,
                overdueList: tasksData.overdue.slice(0, 5).map((t: any) => ({
                  title: t.title,
                  dueDate: t.due_date,
                  priority: t.priority,
                })),
              },
              meetings: {
                total: events.length,
                list: events.slice(0, 5).map((e: any) => ({
                  title: e.title,
                  startTime: e.start_time,
                  endTime: e.end_time,
                })),
              },
              notes: {
                createdToday: notesCreatedToday.length,
              },
              highlights: [],
            };

            // Generate highlights
            const highlights: string[] = [];
            if (summary.tasks.overdue > 0) {
              highlights.push(`⚠️ You have ${summary.tasks.overdue} overdue task(s) that need attention`);
            }
            if (summary.meetings.total > 0) {
              highlights.push(`📅 You have ${summary.meetings.total} meeting(s) scheduled today`);
            }
            if (summary.tasks.inProgress > 0) {
              highlights.push(`🔄 ${summary.tasks.inProgress} task(s) are in progress`);
            }
            if (summary.tasks.pending > 0) {
              highlights.push(`📋 ${summary.tasks.pending} task(s) waiting to be started`);
            }
            if (summary.tasks.completed > 0) {
              highlights.push(`✅ ${summary.tasks.completed} task(s) completed`);
            }
            summary.highlights = highlights;

            return JSON.stringify({
              success: true,
              summary,
              message: `Daily summary for ${targetDate.toDateString()}`,
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'get_weekly_summary',
        description: 'Get a summary of the week\'s activities including task progress, completed work, and upcoming deadlines. Use this when user asks about weekly summary or week overview.',
        schema: z.object({
          weekOffset: z.number().optional().describe('Week offset from current week (0 = this week, -1 = last week)'),
        }),
        func: async ({ weekOffset = 0 }) => {
          try {
            const today = new Date();
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay() + (weekOffset * 7));
            startOfWeek.setHours(0, 0, 0, 0);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);

            // Get projects in workspace
            const projectsResult = await this.db.table('projects')
              .select('id, name')
              .where('workspace_id', '=', this.context.workspaceId)
              .execute();
            const projects = projectsResult.data || [];
            const projectIds = projects.map((p: any) => p.id);

            // Fetch all tasks
            let tasksData = { completed: [], created: [], overdue: [] };
            if (projectIds.length > 0) {
              const tasksResult = await this.db.table('tasks')
                .select('*')
                .execute();
              // Filter tasks to workspace projects in JavaScript
              const allTasks: any[] = (tasksResult.data || []).filter((t: any) => projectIds.includes(t.project_id));

              tasksData = {
                completed: allTasks.filter((t: any) =>
                  t.status === 'done' &&
                  t.updated_at &&
                  new Date(t.updated_at) >= startOfWeek &&
                  new Date(t.updated_at) <= endOfWeek
                ),
                created: allTasks.filter((t: any) =>
                  t.created_at &&
                  new Date(t.created_at) >= startOfWeek &&
                  new Date(t.created_at) <= endOfWeek
                ),
                overdue: allTasks.filter((t: any) => {
                  if (!t.due_date || t.status === 'done') return false;
                  return new Date(t.due_date) < today;
                }),
              };
            }

            // Fetch calendar events for the week
            let events = [];
            try {
              events = await this.calendarService.getEvents(
                this.context.workspaceId,
                startOfWeek.toISOString(),
                endOfWeek.toISOString(),
                this.context.userId,
              );
            } catch (e) {
              this.logger.warn(`[Summary] Failed to fetch calendar events: ${e.message}`);
            }

            // Fetch notes created this week
            let notesCreated = [];
            try {
              const notesResult = await this.db.table('notes')
                .select('*')
                .where('workspace_id', '=', this.context.workspaceId)
                .where('created_by', '=', this.context.userId)
                .execute();
              // Filter by date in JavaScript
              notesCreated = (notesResult.data || []).filter((n: any) => {
                if (!n.created_at) return false;
                const createdAt = new Date(n.created_at);
                return createdAt >= startOfWeek && createdAt <= endOfWeek;
              });
            } catch (e) {
              this.logger.warn(`[Summary] Failed to fetch notes: ${e.message}`);
            }

            const summary = {
              weekStart: startOfWeek.toDateString(),
              weekEnd: endOfWeek.toDateString(),
              tasks: {
                completed: tasksData.completed.length,
                created: tasksData.created.length,
                overdue: tasksData.overdue.length,
                completedList: tasksData.completed.slice(0, 5).map((t: any) => ({ title: t.title, priority: t.priority })),
              },
              meetings: {
                total: events.length,
                upcoming: events.filter((e: any) => new Date(e.start_time) > today).length,
              },
              notes: {
                created: notesCreated.length,
              },
              projects: {
                total: projects.length,
              },
            };

            // Calculate productivity score (simple heuristic)
            const productivityScore = Math.min(100, Math.round(
              (summary.tasks.completed * 10) +
              (summary.meetings.total * 5) +
              (summary.notes.created * 3)
            ));

            return JSON.stringify({
              success: true,
              summary,
              productivityScore,
              message: `Weekly summary: ${startOfWeek.toDateString()} - ${endOfWeek.toDateString()}`,
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'get_overdue_tasks',
        description: 'Get a list of all overdue tasks that need attention. Use this when user asks about overdue tasks, late tasks, or tasks past due date.',
        schema: z.object({}),
        func: async () => {
          try {
            const today = new Date();

            // Get projects in workspace
            const projectsResult = await this.db.table('projects')
              .select('id, name')
              .where('workspace_id', '=', this.context.workspaceId)
              .execute();
            const projects = projectsResult.data || [];
            const projectIds = projects.map((p: any) => p.id);
            const projectMap = new Map(projects.map((p: any) => [p.id, p.name]));

            if (projectIds.length === 0) {
              return JSON.stringify({ success: true, overdueTasks: [], message: 'No projects found' });
            }

            // Fetch tasks with due dates
            const tasksResult = await this.db.table('tasks')
              .select('*')
              .execute();
            // Filter tasks to workspace projects in JavaScript
            const allTasks: any[] = (tasksResult.data || []).filter((t: any) => projectIds.includes(t.project_id));

            const overdueTasks = allTasks
              .filter((t: any) => {
                if (!t.due_date || t.status === 'done') return false;
                return new Date(t.due_date) < today;
              })
              .map((t: any) => ({
                id: t.id,
                title: t.title,
                dueDate: t.due_date,
                priority: t.priority,
                status: t.status,
                projectName: projectMap.get(t.project_id) || 'Unknown',
                daysOverdue: Math.floor((today.getTime() - new Date(t.due_date).getTime()) / (1000 * 60 * 60 * 24)),
              }))
              .sort((a, b) => b.daysOverdue - a.daysOverdue);

            return JSON.stringify({
              success: true,
              overdueTasks,
              totalOverdue: overdueTasks.length,
              message: overdueTasks.length > 0
                ? `You have ${overdueTasks.length} overdue task(s)`
                : 'Great! No overdue tasks.',
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'get_upcoming_events',
        description: 'Get upcoming meetings and events for the next few days. Use this when user asks what\'s coming up, upcoming meetings, or next events.',
        schema: z.object({
          days: z.number().optional().describe('Number of days to look ahead (default: 7)'),
        }),
        func: async ({ days = 7 }) => {
          try {
            const now = new Date();
            const endDate = new Date(now);
            endDate.setDate(now.getDate() + days);

            const events = await this.calendarService.getEvents(
              this.context.workspaceId,
              now.toISOString(),
              endDate.toISOString(),
              this.context.userId,
            );

            const upcomingEvents = events.map((e: any) => ({
              id: e.id,
              title: e.title,
              startTime: e.start_time,
              endTime: e.end_time,
              location: e.location,
              attendees: e.attendees?.length || 0,
              daysUntil: Math.ceil((new Date(e.start_time).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
            })).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

            // Group by day
            const groupedByDay: Record<string, any[]> = {};
            upcomingEvents.forEach((event) => {
              const dayKey = new Date(event.startTime).toDateString();
              if (!groupedByDay[dayKey]) groupedByDay[dayKey] = [];
              groupedByDay[dayKey].push(event);
            });

            return JSON.stringify({
              success: true,
              upcomingEvents,
              totalEvents: upcomingEvents.length,
              groupedByDay,
              message: upcomingEvents.length > 0
                ? `You have ${upcomingEvents.length} event(s) in the next ${days} days`
                : `No events scheduled in the next ${days} days`,
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'get_focus_recommendations',
        description: 'Get AI-powered recommendations on what to focus on today based on priorities, deadlines, and workload. Use this when user asks what to focus on, priorities, or needs guidance on what to do.',
        schema: z.object({}),
        func: async () => {
          try {
            const today = new Date();
            const endOfDay = new Date(today);
            endOfDay.setHours(23, 59, 59, 999);
            const nextWeek = new Date(today);
            nextWeek.setDate(today.getDate() + 7);

            // Get projects
            const projectsResult = await this.db.table('projects')
              .select('id, name')
              .where('workspace_id', '=', this.context.workspaceId)
              .execute();
            const projects = projectsResult.data || [];
            const projectIds = projects.map((p: any) => p.id);
            const projectMap = new Map(projects.map((p: any) => [p.id, p.name]));

            // Get tasks
            let recommendations: any[] = [];
            let overdueTasks: any[] = [];
            let urgentTasks: any[] = [];
            let inProgressTasks: any[] = [];

            if (projectIds.length > 0) {
              const tasksResult = await this.db.table('tasks')
                .select('*')
                .execute();
              // Filter tasks to workspace projects in JavaScript and exclude completed
              const allTasks: any[] = (tasksResult.data || [])
                .filter((t: any) => projectIds.includes(t.project_id) && t.status !== 'done');

              overdueTasks = allTasks.filter((t: any) => t.due_date && new Date(t.due_date) < today);
              urgentTasks = allTasks.filter((t: any) =>
                t.due_date &&
                new Date(t.due_date) >= today &&
                new Date(t.due_date) <= nextWeek &&
                t.priority === 'high'
              );
              inProgressTasks = allTasks.filter((t: any) => t.status === 'in_progress');

              // Build prioritized recommendations
              overdueTasks.forEach((t: any) => {
                recommendations.push({
                  type: 'overdue',
                  priority: 'critical',
                  icon: '🚨',
                  title: t.title,
                  reason: `Overdue by ${Math.floor((today.getTime() - new Date(t.due_date).getTime()) / (1000 * 60 * 60 * 24))} day(s)`,
                  taskId: t.id,
                  projectName: projectMap.get(t.project_id),
                });
              });

              urgentTasks.forEach((t: any) => {
                recommendations.push({
                  type: 'urgent',
                  priority: 'high',
                  icon: '⚡',
                  title: t.title,
                  reason: `High priority, due ${new Date(t.due_date).toDateString()}`,
                  taskId: t.id,
                  projectName: projectMap.get(t.project_id),
                });
              });

              inProgressTasks.slice(0, 3).forEach((t: any) => {
                recommendations.push({
                  type: 'in_progress',
                  priority: 'medium',
                  icon: '🔄',
                  title: t.title,
                  reason: 'Continue working on this',
                  taskId: t.id,
                  projectName: projectMap.get(t.project_id),
                });
              });
            }

            // Get today's meetings
            let todayMeetings = [];
            try {
              todayMeetings = await this.calendarService.getEvents(
                this.context.workspaceId,
                today.toISOString(),
                endOfDay.toISOString(),
                this.context.userId,
              );

              todayMeetings.forEach((m: any) => {
                recommendations.push({
                  type: 'meeting',
                  priority: 'medium',
                  icon: '📅',
                  title: m.title,
                  reason: `Meeting at ${new Date(m.start_time).toLocaleTimeString()}`,
                  eventId: m.id,
                });
              });
            } catch (e) {
              this.logger.warn(`[Summary] Failed to fetch today's meetings: ${e.message}`);
            }

            // Sort recommendations by priority
            const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

            return JSON.stringify({
              success: true,
              recommendations: recommendations.slice(0, 10),
              summary: {
                overdueTasks: overdueTasks.length,
                urgentTasks: urgentTasks.length,
                inProgressTasks: inProgressTasks.length,
                todayMeetings: todayMeetings.length,
              },
              message: recommendations.length > 0
                ? `Here are ${Math.min(recommendations.length, 10)} things to focus on today`
                : 'No urgent items. Great time to tackle new tasks!',
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),
    ];
  }

  // ============================================
  // AI WRITING TOOLS
  // ============================================

  private getWritingTools(): DynamicStructuredTool[] {
    return [
      new DynamicStructuredTool({
        name: 'draft_email_reply',
        description: 'Draft a professional reply to an email. Use this when user wants help responding to an email, writing an email response, or crafting a reply.',
        schema: z.object({
          originalEmail: z.string().describe('The original email content to reply to'),
          replyIntent: z.string().describe('What the user wants to say in the reply (e.g., "accept the meeting", "decline politely", "ask for more details")'),
          tone: z.enum(['professional', 'friendly', 'formal', 'casual']).optional().describe('Tone of the reply (default: professional)'),
        }),
        func: async ({ originalEmail, replyIntent, tone = 'professional' }) => {
          try {
            const prompt = `You are a professional email writing assistant. Draft a reply to the following email.

Original Email:
${originalEmail}

User's intent for the reply: ${replyIntent}
Tone: ${tone}

Write a well-structured, ${tone} email reply. Include:
- Appropriate greeting
- Clear response addressing the original email
- Professional closing

Only output the email content, no explanations.`;

            const response = await this.aiProvider.generateText(prompt, {
              saveToDatabase: false,
            });

            const emailContent = typeof response === 'string' ? response : response.content || response.text || JSON.stringify(response);

            return JSON.stringify({
              success: true,
              draftEmail: emailContent,
              tone,
              message: `Email reply drafted with ${tone} tone`,
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'write_meeting_notes',
        description: 'Generate structured meeting notes from a description, transcript, or summary of what was discussed. Use this when user wants to create meeting notes or document a meeting.',
        schema: z.object({
          meetingInfo: z.string().describe('Description of the meeting, transcript, or key points discussed'),
          meetingTitle: z.string().optional().describe('Title of the meeting'),
          attendees: z.array(z.string()).optional().describe('List of attendees'),
          format: z.enum(['bullet', 'detailed', 'action-focused']).optional().describe('Format style for notes'),
        }),
        func: async ({ meetingInfo, meetingTitle, attendees, format = 'bullet' }) => {
          try {
            const formatInstructions = {
              bullet: 'Use bullet points for easy scanning',
              detailed: 'Write detailed paragraphs with full context',
              'action-focused': 'Focus primarily on action items and decisions made',
            };

            const prompt = `You are a professional meeting notes assistant. Create structured meeting notes from the following information.

${meetingTitle ? `Meeting Title: ${meetingTitle}` : ''}
${attendees?.length ? `Attendees: ${attendees.join(', ')}` : ''}

Meeting Discussion/Transcript:
${meetingInfo}

Create well-organized meeting notes with these sections:
1. **Summary** - Brief overview of the meeting
2. **Key Discussion Points** - Main topics covered
3. **Decisions Made** - Any decisions that were reached
4. **Action Items** - Tasks assigned with owners if mentioned
5. **Next Steps** - Follow-up items or future meetings

Format style: ${formatInstructions[format]}

Output the meeting notes in markdown format.`;

            const response = await this.aiProvider.generateText(prompt, {
              saveToDatabase: false,
            });

            const notesContent = typeof response === 'string' ? response : response.content || response.text || JSON.stringify(response);

            return JSON.stringify({
              success: true,
              meetingNotes: notesContent,
              format,
              message: 'Meeting notes generated successfully',
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'write_document',
        description: 'Help write various types of documents like proposals, reports, announcements, or any other written content. Use this when user needs help creating a document.',
        schema: z.object({
          documentType: z.enum(['proposal', 'report', 'announcement', 'memo', 'brief', 'summary', 'plan', 'other']).describe('Type of document to write'),
          topic: z.string().describe('The main topic or subject of the document'),
          keyPoints: z.array(z.string()).optional().describe('Key points to include'),
          audience: z.string().optional().describe('Target audience for the document'),
          length: z.enum(['short', 'medium', 'long']).optional().describe('Desired length of the document'),
          additionalContext: z.string().optional().describe('Any additional context or requirements'),
        }),
        func: async ({ documentType, topic, keyPoints, audience, length = 'medium', additionalContext }) => {
          try {
            const lengthGuide = {
              short: '200-400 words',
              medium: '400-800 words',
              long: '800-1500 words',
            };

            const prompt = `You are a professional document writing assistant. Create a ${documentType} about the following topic.

Topic: ${topic}
Document Type: ${documentType}
Target Audience: ${audience || 'General professional audience'}
Desired Length: ${lengthGuide[length]}

${keyPoints?.length ? `Key Points to Include:\n${keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}` : ''}

${additionalContext ? `Additional Context: ${additionalContext}` : ''}

Write a well-structured ${documentType} that is clear, professional, and appropriate for the target audience.
Use markdown formatting for headers and sections.
Include an executive summary if the document is medium or long length.`;

            const response = await this.aiProvider.generateText(prompt, {
              saveToDatabase: false,
            });

            const documentContent = typeof response === 'string' ? response : response.content || response.text || JSON.stringify(response);

            return JSON.stringify({
              success: true,
              document: documentContent,
              documentType,
              topic,
              message: `${documentType.charAt(0).toUpperCase() + documentType.slice(1)} created successfully`,
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'improve_writing',
        description: 'Improve, rewrite, or enhance existing text. Use this when user wants to make text more professional, clearer, or better written.',
        schema: z.object({
          text: z.string().describe('The text to improve'),
          improvementType: z.enum(['professional', 'concise', 'detailed', 'friendly', 'formal', 'grammar', 'clarity']).describe('Type of improvement to make'),
          preserveMeaning: z.boolean().optional().describe('Whether to strictly preserve the original meaning'),
        }),
        func: async ({ text, improvementType, preserveMeaning = true }) => {
          try {
            const improvementInstructions = {
              professional: 'Make the text more professional and business-appropriate',
              concise: 'Make the text shorter and more to the point while keeping key information',
              detailed: 'Expand the text with more details and explanations',
              friendly: 'Make the text warmer and more approachable',
              formal: 'Make the text more formal and official',
              grammar: 'Fix grammar, spelling, and punctuation errors',
              clarity: 'Improve clarity and make the text easier to understand',
            };

            const prompt = `You are a professional writing editor. Improve the following text.

Original Text:
${text}

Improvement Goal: ${improvementInstructions[improvementType]}
${preserveMeaning ? 'Important: Preserve the original meaning and key points.' : 'You may restructure significantly if it improves the text.'}

Provide the improved version of the text. Only output the improved text, no explanations.`;

            const response = await this.aiProvider.generateText(prompt, {
              saveToDatabase: false,
            });

            const improvedText = typeof response === 'string' ? response : response.content || response.text || JSON.stringify(response);

            return JSON.stringify({
              success: true,
              originalText: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
              improvedText,
              improvementType,
              message: `Text improved for ${improvementType}`,
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'summarize_content',
        description: 'Summarize text, documents, or content into a shorter version. Use this when user wants a summary of something.',
        schema: z.object({
          content: z.string().describe('The content to summarize'),
          summaryLength: z.enum(['brief', 'moderate', 'detailed']).optional().describe('How long the summary should be'),
          format: z.enum(['paragraph', 'bullets', 'key-points']).optional().describe('Format of the summary'),
        }),
        func: async ({ content, summaryLength = 'moderate', format = 'paragraph' }) => {
          try {
            const lengthGuide = {
              brief: '2-3 sentences',
              moderate: '1-2 paragraphs',
              detailed: '3-4 paragraphs with key details',
            };

            const formatGuide = {
              paragraph: 'Write in paragraph form',
              bullets: 'Use bullet points',
              'key-points': 'List the key points numbered',
            };

            const prompt = `You are a professional content summarizer. Summarize the following content.

Content to Summarize:
${content}

Summary Requirements:
- Length: ${lengthGuide[summaryLength]}
- Format: ${formatGuide[format]}

Create a clear, accurate summary that captures the main points and essential information.`;

            const response = await this.aiProvider.generateText(prompt, {
              saveToDatabase: false,
            });

            const summary = typeof response === 'string' ? response : response.content || response.text || JSON.stringify(response);

            return JSON.stringify({
              success: true,
              summary,
              originalLength: content.length,
              summaryLength: summary.length,
              compressionRatio: Math.round((1 - summary.length / content.length) * 100) + '%',
              message: `Content summarized (${summaryLength} ${format} format)`,
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'generate_ideas',
        description: 'Generate ideas, suggestions, or brainstorm options for a topic. Use this when user needs help coming up with ideas.',
        schema: z.object({
          topic: z.string().describe('The topic to generate ideas for'),
          context: z.string().optional().describe('Additional context about the situation'),
          numberOfIdeas: z.number().optional().describe('How many ideas to generate (default: 5)'),
          ideaType: z.enum(['creative', 'practical', 'innovative', 'safe', 'mixed']).optional().describe('Type of ideas to generate'),
        }),
        func: async ({ topic, context, numberOfIdeas = 5, ideaType = 'mixed' }) => {
          try {
            const typeInstructions = {
              creative: 'Focus on creative and unique ideas',
              practical: 'Focus on practical and immediately actionable ideas',
              innovative: 'Focus on innovative and forward-thinking ideas',
              safe: 'Focus on tried-and-tested, low-risk ideas',
              mixed: 'Provide a mix of different types of ideas',
            };

            const prompt = `You are a creative brainstorming assistant. Generate ${numberOfIdeas} ideas for the following topic.

Topic: ${topic}
${context ? `Context: ${context}` : ''}

Requirements:
- Generate exactly ${numberOfIdeas} ideas
- ${typeInstructions[ideaType]}
- Each idea should be unique and actionable
- Include a brief explanation for each idea

Format each idea as:
**Idea N: [Title]**
[Brief description and why it would work]`;

            const response = await this.aiProvider.generateText(prompt, {
              saveToDatabase: false,
            });

            const ideas = typeof response === 'string' ? response : response.content || response.text || JSON.stringify(response);

            return JSON.stringify({
              success: true,
              ideas,
              topic,
              ideaType,
              count: numberOfIdeas,
              message: `Generated ${numberOfIdeas} ${ideaType} ideas for "${topic}"`,
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'translate_text',
        description: 'Translate text from one language to another. Use this when user wants to translate content, messages, or documents to a different language.',
        schema: z.object({
          text: z.string().describe('The text to translate'),
          targetLanguage: z.string().describe('The language to translate to (e.g., "Spanish", "French", "Japanese", "Arabic", "Bengali", "Hindi")'),
          sourceLanguage: z.string().optional().describe('The source language (auto-detected if not specified)'),
          preserveFormatting: z.boolean().optional().describe('Whether to preserve markdown/formatting in the translation'),
          formalityLevel: z.enum(['formal', 'informal', 'neutral']).optional().describe('Level of formality for the translation'),
        }),
        func: async ({ text, targetLanguage, sourceLanguage, preserveFormatting = true, formalityLevel = 'neutral' }) => {
          try {
            const formalityInstructions = {
              formal: 'Use formal language and honorifics where appropriate',
              informal: 'Use casual, conversational language',
              neutral: 'Use standard, neutral language',
            };

            const prompt = `You are a professional translator. Translate the following text to ${targetLanguage}.

${sourceLanguage ? `Source Language: ${sourceLanguage}` : 'Source Language: Auto-detect'}
Target Language: ${targetLanguage}
Formality: ${formalityInstructions[formalityLevel]}
${preserveFormatting ? 'Preserve any markdown formatting, line breaks, and structure in the translation.' : ''}

Text to Translate:
${text}

Provide only the translated text, no explanations or notes. Ensure the translation:
- Is accurate and natural-sounding in ${targetLanguage}
- Preserves the original meaning and tone
- Uses appropriate cultural adaptations where needed`;

            const response = await this.aiProvider.generateText(prompt, {
              saveToDatabase: false,
            });

            const translatedText = typeof response === 'string' ? response : response.content || response.text || JSON.stringify(response);

            return JSON.stringify({
              success: true,
              originalText: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
              translatedText,
              sourceLanguage: sourceLanguage || 'auto-detected',
              targetLanguage,
              formalityLevel,
              characterCount: {
                original: text.length,
                translated: translatedText.length,
              },
              message: `Text translated to ${targetLanguage}`,
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),
    ];
  }

  // ============================================
  // ANALYSIS TOOLS
  // ============================================

  private getAnalysisTools(): DynamicStructuredTool[] {
    return [
      new DynamicStructuredTool({
        name: 'analyze_image',
        description: 'Analyze an attached image. IMPORTANT: When user has attached images, DO NOT provide imageUrl or imageBase64 - the images are automatically available from context. Just provide the question parameter.',
        schema: z.object({
          question: z.string().optional().describe('What to analyze or question to answer about the image. Default: describe the image'),
          analysisType: z.enum(['describe', 'extract_text', 'answer_question', 'detailed']).optional().describe('Type of analysis: describe, extract_text, answer_question, or detailed'),
        }),
        func: async ({ question = 'Describe this image in detail', analysisType = 'describe' }) => {
          try {
            this.logger.log(`[analyze_image] Starting analysis. Context has ${this.context?.attachedImages?.length || 0} attached images`);

            const analysisInstructions = {
              describe: 'Provide a detailed description of what you see in this image.',
              extract_text: 'Extract and transcribe any text visible in this image. If no text is visible, say so.',
              answer_question: `Answer this question about the image: ${question}`,
              detailed: 'Provide a comprehensive analysis including: description, any text visible, colors, objects, people, context, and any notable details.',
            };

            const systemPrompt = `${analysisInstructions[analysisType]}

User's specific request: ${question}

Provide a clear, helpful response based on the image content.`;

            // Build the message content with image
            let imageContent: any;
            let actualBase64: string | undefined;
            let actualMimeType = 'image/png';

            // ALWAYS check context for attached images first
            if (this.context?.attachedImages?.length > 0) {
              const attachedImage = this.context.attachedImages[0];
              actualBase64 = attachedImage.base64;
              actualMimeType = attachedImage.mimeType || 'image/png';
              this.logger.log(`[analyze_image] Using attached image: ${attachedImage.name}, mimeType: ${actualMimeType}`);
            }

            if (!actualBase64) {
              return JSON.stringify({
                success: false,
                error: 'No image attached. Please attach an image to analyze it.',
              });
            }

            // Use base64 image directly with OpenAI Vision
            imageContent = {
              type: 'image_url',
              image_url: {
                url: `data:${actualMimeType};base64,${actualBase64}`,
                detail: 'auto',
              },
            };

            // Call OpenAI with vision
            const message = new HumanMessage({
              content: [
                { type: 'text', text: systemPrompt },
                imageContent,
              ],
            });

            const response = await this.visionModel.invoke([message]);
            const analysisResult = typeof response.content === 'string'
              ? response.content
              : JSON.stringify(response.content);

            return JSON.stringify({
              success: true,
              analysis: analysisResult,
              analysisType,
              message: 'Image analyzed successfully',
            });
          } catch (error) {
            this.logger.error(`[analyze_image] Error: ${error.message}`);
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'analyze_document',
        description: 'Analyze a document and extract key information, summarize it, or answer questions about its content. Use when user shares document text.',
        schema: z.object({
          documentContent: z.string().describe('The text content of the document'),
          documentName: z.string().optional().describe('Name of the document'),
          analysisType: z.enum(['summarize', 'extract_key_points', 'answer_question', 'extract_action_items', 'analyze_sentiment']).optional().describe('Type of analysis. Default: summarize'),
          question: z.string().optional().describe('Specific question to answer about the document'),
        }),
        func: async ({ documentContent, documentName, analysisType = 'summarize', question }) => {
          try {
            let prompt = '';

            switch (analysisType) {
              case 'summarize':
                prompt = `Summarize the following document${documentName ? ` (${documentName})` : ''}:

${documentContent}

Provide a clear, concise summary covering the main points.`;
                break;
              case 'extract_key_points':
                prompt = `Extract the key points from this document${documentName ? ` (${documentName})` : ''}:

${documentContent}

List the most important points in bullet format.`;
                break;
              case 'answer_question':
                prompt = `Based on this document${documentName ? ` (${documentName})` : ''}:

${documentContent}

Answer this question: ${question}`;
                break;
              case 'extract_action_items':
                prompt = `Extract all action items, tasks, or to-dos from this document${documentName ? ` (${documentName})` : ''}:

${documentContent}

List each action item clearly with any mentioned deadlines or assignees.`;
                break;
              case 'analyze_sentiment':
                prompt = `Analyze the sentiment and tone of this document${documentName ? ` (${documentName})` : ''}:

${documentContent}

Describe the overall sentiment (positive/negative/neutral), tone, and any notable emotional aspects.`;
                break;
              default:
                // Fallback to summarize for any unrecognized type
                prompt = `Summarize and analyze the following document${documentName ? ` (${documentName})` : ''}:

${documentContent}

Provide a comprehensive summary covering:
1. Main topic and purpose
2. Key points and findings
3. Important details
4. Conclusions or recommendations if any`;
            }

            const response = await this.aiProvider.generateText(prompt, {
              saveToDatabase: false,
            });

            const analysis = typeof response === 'string' ? response : response?.content || response?.text || JSON.stringify(response);

            return JSON.stringify({
              success: true,
              analysis,
              analysisType,
              documentName: documentName || 'Unnamed document',
              message: `Document ${analysisType.replace('_', ' ')} completed`,
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),
    ];
  }

  // ============================================
  // REFERENCE TOOLS - Work with referenced items
  // ============================================

  private getReferenceTools(): DynamicStructuredTool[] {
    return [
      new DynamicStructuredTool({
        name: 'get_referenced_item',
        description: 'Fetch details of a referenced item (note, task, event, project, file) from the workspace. Use this when user has referenced an existing item and wants to view, summarize, edit, or work with it. If itemId is not a valid UUID, the tool will automatically find the correct ID from referenced items in context.',
        schema: z.object({
          itemType: z.enum(['note', 'task', 'event', 'project', 'file']).describe('Type of item to fetch'),
          itemId: z.string().optional().describe('ID of the item to fetch (optional - will auto-resolve from context if not valid)'),
        }),
        func: async ({ itemType, itemId }) => {
          try {
            // UUID validation regex
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            let resolvedId = itemId;

            // If itemId is not a valid UUID, try to find it from referenced items in context
            if (!itemId || !uuidRegex.test(itemId)) {
              this.logger.log(`[get_referenced_item] Invalid or missing itemId "${itemId}", looking up from context...`);
              const referencedItems = this.context.referencedItems || [];
              const matchingItem = referencedItems.find(ref => ref.type === itemType);

              if (matchingItem) {
                resolvedId = matchingItem.id;
                this.logger.log(`[get_referenced_item] Resolved ${itemType} ID from context: ${resolvedId} (title: "${matchingItem.title}")`);
              } else {
                return JSON.stringify({
                  success: false,
                  error: `No ${itemType} found in referenced items. Please reference a ${itemType} first.`,
                  availableReferences: referencedItems.map(r => ({ type: r.type, title: r.title, id: r.id })),
                });
              }
            }

            this.logger.log(`[get_referenced_item] Fetching ${itemType} with ID: ${resolvedId}`);
            let item: any = null;

            switch (itemType) {
              case 'note':
                item = await this.notesService.getNote(resolvedId, this.context.workspaceId, this.context.userId);
                if (item) {
                  return JSON.stringify({
                    success: true,
                    itemType: 'note',
                    item: {
                      id: item.id,
                      title: item.title,
                      content: item.content,
                      createdAt: item.createdAt,
                      updatedAt: item.updatedAt,
                    },
                    message: `Note "${item.title}" fetched successfully`,
                  });
                }
                break;

              case 'task':
                item = await this.projectsService.getTask(resolvedId, this.context.userId);
                if (item) {
                  return JSON.stringify({
                    success: true,
                    itemType: 'task',
                    item: {
                      id: item.id,
                      title: item.title,
                      description: item.description,
                      status: item.status,
                      priority: item.priority,
                      taskType: item.task_type,
                      dueDate: item.due_date,
                      projectId: item.project_id,
                      assignedTo: item.assigned_to,
                      labels: item.labels,
                      storyPoints: item.story_points,
                      estimatedHours: item.estimated_hours,
                      createdAt: item.created_at,
                      updatedAt: item.updated_at,
                    },
                    message: `Task "${item.title}" fetched successfully`,
                  });
                }
                break;

              case 'event':
                item = await this.calendarService.getEvent(resolvedId, this.context.workspaceId, this.context.userId);
                if (item) {
                  return JSON.stringify({
                    success: true,
                    itemType: 'event',
                    item: {
                      id: item.id,
                      title: item.title,
                      description: item.description,
                      startTime: item.startTime,
                      endTime: item.endTime,
                      location: item.location,
                      attendees: item.attendees,
                      createdAt: item.createdAt,
                    },
                    message: `Event "${item.title}" fetched successfully`,
                  });
                }
                break;

              case 'project':
                item = await this.projectsService.findOne(resolvedId, this.context.userId);
                if (item) {
                  return JSON.stringify({
                    success: true,
                    itemType: 'project',
                    item: {
                      id: item.id,
                      name: item.name,
                      description: item.description,
                      status: item.status,
                      createdAt: item.createdAt,
                    },
                    message: `Project "${item.name}" fetched successfully`,
                  });
                }
                break;

              case 'file':
                item = await this.filesService.getFile(itemId, this.context.workspaceId, this.context.userId);
                if (item) {
                  return JSON.stringify({
                    success: true,
                    itemType: 'file',
                    item: {
                      id: item.id,
                      name: item.name,
                      mimeType: item.mimeType,
                      size: item.size,
                      url: item.url,
                      createdAt: item.createdAt,
                    },
                    message: `File "${item.name}" fetched successfully`,
                  });
                }
                break;
            }

            return JSON.stringify({
              success: false,
              error: `${itemType} with ID ${itemId} not found`,
            });
          } catch (error) {
            this.logger.error(`[get_referenced_item] Error: ${error.message}`);
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'update_referenced_item',
        description: 'Update a referenced item (note, task, event, project). Use this when user wants to edit or modify an existing item they have referenced. If itemId is not a valid UUID, the tool will automatically find the correct ID from referenced items in context.',
        schema: z.object({
          itemType: z.enum(['note', 'task', 'event', 'project']).describe('Type of item to update'),
          itemId: z.string().optional().describe('ID of the item to update (optional - will auto-resolve from context if not valid)'),
          updates: z.record(z.string(), z.any()).describe('Object containing fields to update (e.g., {title: "New Title", content: "New content"})'),
        }),
        func: async ({ itemType, itemId, updates }) => {
          try {
            // UUID validation regex
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            let resolvedId = itemId;

            // If itemId is not a valid UUID, try to find it from referenced items in context
            if (!itemId || !uuidRegex.test(itemId)) {
              this.logger.log(`[update_referenced_item] Invalid or missing itemId "${itemId}", looking up from context...`);
              const referencedItems = this.context.referencedItems || [];
              const matchingItem = referencedItems.find(ref => ref.type === itemType);

              if (matchingItem) {
                resolvedId = matchingItem.id;
                this.logger.log(`[update_referenced_item] Resolved ${itemType} ID from context: ${resolvedId} (title: "${matchingItem.title}")`);
              } else {
                return JSON.stringify({
                  success: false,
                  error: `No ${itemType} found in referenced items. Please reference a ${itemType} first.`,
                  availableReferences: referencedItems.map(r => ({ type: r.type, title: r.title, id: r.id })),
                });
              }
            }

            this.logger.log(`[update_referenced_item] Updating ${itemType} ${resolvedId} with:`, updates);
            let result: any = null;

            switch (itemType) {
              case 'note':
                result = await this.notesService.updateNote(resolvedId, this.context.workspaceId, updates as any, this.context.userId);
                if (result) {
                  return JSON.stringify({
                    success: true,
                    itemType: 'note',
                    itemId: resolvedId,
                    message: `Note updated successfully`,
                    updatedFields: Object.keys(updates),
                  });
                }
                break;

              case 'task':
                // Transform field names for tasks (AI might send different field names)
                const taskUpdates: Record<string, any> = {};
                for (const [key, value] of Object.entries(updates)) {
                  // Map common field names
                  if (key === 'content' || key === 'body') {
                    taskUpdates.description = value;
                  } else if (key === 'name') {
                    taskUpdates.title = value;
                  } else if (key === 'dueDate') {
                    taskUpdates.due_date = value;
                  } else if (key === 'assignedTo') {
                    taskUpdates.assigned_to = value;
                  } else if (key === 'taskType') {
                    taskUpdates.task_type = value;
                  } else if (key === 'storyPoints') {
                    taskUpdates.story_points = value;
                  } else if (key === 'estimatedHours') {
                    taskUpdates.estimated_hours = value;
                  } else if (key === 'parentTaskId') {
                    taskUpdates.parent_task_id = value;
                  } else if (key === 'sprintId') {
                    taskUpdates.sprint_id = value;
                  } else {
                    // Pass through as-is (title, description, status, priority, labels, etc.)
                    taskUpdates[key] = value;
                  }
                }
                this.logger.log(`[update_referenced_item] Task updates transformed:`, taskUpdates);
                result = await this.projectsService.updateTask(resolvedId, taskUpdates as any, this.context.userId);
                if (result) {
                  return JSON.stringify({
                    success: true,
                    itemType: 'task',
                    itemId: resolvedId,
                    message: `Task updated successfully`,
                    updatedFields: Object.keys(taskUpdates),
                  });
                }
                break;

              case 'event':
                result = await this.calendarService.updateEvent(resolvedId, this.context.workspaceId, updates as any, this.context.userId);
                if (result) {
                  return JSON.stringify({
                    success: true,
                    itemType: 'event',
                    itemId: resolvedId,
                    message: `Event updated successfully`,
                    updatedFields: Object.keys(updates),
                  });
                }
                break;

              case 'project':
                result = await this.projectsService.update(resolvedId, updates as any, this.context.userId);
                if (result) {
                  return JSON.stringify({
                    success: true,
                    itemType: 'project',
                    itemId: resolvedId,
                    message: `Project updated successfully`,
                    updatedFields: Object.keys(updates),
                  });
                }
                break;
            }

            return JSON.stringify({
              success: false,
              error: `Failed to update ${itemType} with ID ${resolvedId}`,
            });
          } catch (error) {
            this.logger.error(`[update_referenced_item] Error: ${error.message}`);
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),
    ];
  }

  /**
   * Batch operation tools for efficient bulk operations
   */
  private getBatchTools(): DynamicStructuredTool[] {
    return [
      new DynamicStructuredTool({
        name: 'batch_create_tasks',
        description: 'Create multiple tasks at once. Use this for efficiently adding many tasks to a project in a single operation.',
        schema: z.object({
          projectId: z.string().describe('Project ID to add tasks to'),
          tasks: z.array(z.object({
            title: z.string().describe('Task title'),
            description: z.string().optional().describe('Task description'),
            status: z.enum(['backlog', 'todo', 'in_progress', 'in_review', 'done']).optional().describe('Task status'),
            priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().describe('Task priority'),
            dueDate: z.string().optional().describe('Due date (ISO format)'),
            assigneeId: z.string().optional().describe('User ID to assign the task to'),
            labels: z.array(z.string()).optional().describe('Task labels'),
          })).describe('Array of tasks to create'),
          preview: z.boolean().optional().describe('If true, show preview without creating'),
        }),
        func: async ({ projectId, tasks, preview }) => {
          try {
            if (preview) {
              return JSON.stringify({
                success: true,
                preview: true,
                message: `Ready to create ${tasks.length} tasks in project`,
                tasks: tasks.map((t, i) => ({ index: i + 1, ...t })),
              });
            }

            const createdTasks = [];
            const errors = [];

            for (let i = 0; i < tasks.length; i++) {
              const task = tasks[i];
              try {
                const newTask = await this.db.insert('tasks', {
                  title: task.title,
                  description: task.description || '',
                  status: task.status || 'backlog',
                  priority: task.priority || 'medium',
                  due_date: task.dueDate || null,
                  assigned_to: task.assigneeId || null,
                  labels: task.labels || [],
                  project_id: projectId,
                  workspace_id: this.context.workspaceId,
                  user_id: this.context.userId,
                  created_by: this.context.userId,
                });
                createdTasks.push({ index: i + 1, id: newTask.id, title: task.title });
              } catch (err) {
                errors.push({ index: i + 1, title: task.title, error: err.message });
              }
            }

            return JSON.stringify({
              success: true,
              message: `Created ${createdTasks.length} of ${tasks.length} tasks`,
              created: createdTasks,
              errors: errors.length > 0 ? errors : undefined,
            });
          } catch (error) {
            this.logger.error(`[batch_create_tasks] Error: ${error.message}`);
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'batch_update_tasks',
        description: 'Update multiple tasks at once. Use this for efficiently modifying many tasks in a single operation (e.g., changing status of all tasks).',
        schema: z.object({
          tasks: z.array(z.object({
            taskId: z.string().describe('Task ID to update'),
            updates: z.object({
              title: z.string().optional(),
              description: z.string().optional(),
              status: z.enum(['backlog', 'todo', 'in_progress', 'in_review', 'done']).optional(),
              priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
              dueDate: z.string().optional(),
              assigneeId: z.string().optional(),
              labels: z.array(z.string()).optional(),
            }).describe('Fields to update'),
          })).describe('Array of tasks with their updates'),
          preview: z.boolean().optional().describe('If true, show preview without updating'),
        }),
        func: async ({ tasks, preview }) => {
          try {
            if (preview) {
              return JSON.stringify({
                success: true,
                preview: true,
                message: `Ready to update ${tasks.length} tasks`,
                tasks: tasks,
              });
            }

            const updatedTasks = [];
            const errors = [];

            for (const task of tasks) {
              try {
                const updateData: Record<string, any> = {};
                if (task.updates.title) updateData.title = task.updates.title;
                if (task.updates.description) updateData.description = task.updates.description;
                if (task.updates.status) updateData.status = task.updates.status;
                if (task.updates.priority) updateData.priority = task.updates.priority;
                if (task.updates.dueDate) updateData.due_date = task.updates.dueDate;
                if (task.updates.assigneeId) updateData.assigned_to = task.updates.assigneeId;
                if (task.updates.labels) updateData.labels = task.updates.labels;
                updateData.updated_at = new Date().toISOString();

                await this.db.table('tasks')
                  .update(updateData)
                  .where('id', '=', task.taskId)
                  .where('workspace_id', '=', this.context.workspaceId)
                  .execute();

                updatedTasks.push({ taskId: task.taskId, updatedFields: Object.keys(task.updates) });
              } catch (err) {
                errors.push({ taskId: task.taskId, error: err.message });
              }
            }

            return JSON.stringify({
              success: true,
              message: `Updated ${updatedTasks.length} of ${tasks.length} tasks`,
              updated: updatedTasks,
              errors: errors.length > 0 ? errors : undefined,
            });
          } catch (error) {
            this.logger.error(`[batch_update_tasks] Error: ${error.message}`);
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'batch_delete_tasks',
        description: 'Delete multiple tasks at once. Use this for efficiently removing many tasks in a single operation.',
        schema: z.object({
          taskIds: z.array(z.string()).describe('Array of task IDs to delete'),
          preview: z.boolean().optional().describe('If true, show preview without deleting'),
        }),
        func: async ({ taskIds, preview }) => {
          try {
            if (preview) {
              return JSON.stringify({
                success: true,
                preview: true,
                message: `Ready to delete ${taskIds.length} tasks`,
                taskIds: taskIds,
              });
            }

            const deletedTasks = [];
            const errors = [];

            for (const taskId of taskIds) {
              try {
                await this.db.table('tasks')
                  .update({
                    is_deleted: true,
                    deleted_at: new Date().toISOString(),
                    deleted_by: this.context.userId,
                  })
                  .where('id', '=', taskId)
                  .where('workspace_id', '=', this.context.workspaceId)
                  .execute();

                deletedTasks.push(taskId);
              } catch (err) {
                errors.push({ taskId, error: err.message });
              }
            }

            return JSON.stringify({
              success: true,
              message: `Deleted ${deletedTasks.length} of ${taskIds.length} tasks`,
              deleted: deletedTasks,
              errors: errors.length > 0 ? errors : undefined,
            });
          } catch (error) {
            this.logger.error(`[batch_delete_tasks] Error: ${error.message}`);
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'batch_create_events',
        description: 'Create multiple calendar events at once. Use this for scheduling recurring meetings or multiple events efficiently.',
        schema: z.object({
          events: z.array(z.object({
            title: z.string().describe('Event title'),
            description: z.string().optional().describe('Event description'),
            startTime: z.string().describe('Start time (ISO format)'),
            endTime: z.string().describe('End time (ISO format)'),
            location: z.string().optional().describe('Event location'),
            attendees: z.array(z.string()).optional().describe('Attendee email addresses'),
            isAllDay: z.boolean().optional().describe('Is all-day event'),
          })).describe('Array of events to create'),
          preview: z.boolean().optional().describe('If true, show preview without creating'),
        }),
        func: async ({ events, preview }) => {
          try {
            if (preview) {
              return JSON.stringify({
                success: true,
                preview: true,
                message: `Ready to create ${events.length} events`,
                events: events.map((e, i) => ({ index: i + 1, ...e })),
              });
            }

            const createdEvents = [];
            const errors = [];

            for (let i = 0; i < events.length; i++) {
              const event = events[i];
              try {
                const newEvent = await this.calendarService.createEvent(
                  this.context.workspaceId,
                  {
                    title: event.title,
                    description: event.description,
                    start_time: event.startTime,
                    end_time: event.endTime,
                    location: event.location,
                    attendees: event.attendees,
                    is_all_day: event.isAllDay,
                  } as any,
                  this.context.userId
                );
                createdEvents.push({ index: i + 1, id: newEvent.id, title: event.title });
              } catch (err) {
                errors.push({ index: i + 1, title: event.title, error: err.message });
              }
            }

            return JSON.stringify({
              success: true,
              message: `Created ${createdEvents.length} of ${events.length} events`,
              created: createdEvents,
              errors: errors.length > 0 ? errors : undefined,
            });
          } catch (error) {
            this.logger.error(`[batch_create_events] Error: ${error.message}`);
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'batch_delete_notes',
        description: 'Delete multiple notes at once. Use this for efficiently removing many notes in a single operation.',
        schema: z.object({
          noteIds: z.array(z.string()).describe('Array of note IDs to delete'),
          preview: z.boolean().optional().describe('If true, show preview without deleting'),
        }),
        func: async ({ noteIds, preview }) => {
          try {
            if (preview) {
              return JSON.stringify({
                success: true,
                preview: true,
                message: `Ready to delete ${noteIds.length} notes`,
                noteIds: noteIds,
              });
            }

            const deletedNotes = [];
            const errors = [];

            for (const noteId of noteIds) {
              try {
                await this.notesService.deleteNote(noteId, this.context.workspaceId, this.context.userId);
                deletedNotes.push(noteId);
              } catch (err) {
                errors.push({ noteId, error: err.message });
              }
            }

            return JSON.stringify({
              success: true,
              message: `Deleted ${deletedNotes.length} of ${noteIds.length} notes`,
              deleted: deletedNotes,
              errors: errors.length > 0 ? errors : undefined,
            });
          } catch (error) {
            this.logger.error(`[batch_delete_notes] Error: ${error.message}`);
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'batch_move_files',
        description: 'Move multiple files to a folder at once. Use this for organizing files efficiently.',
        schema: z.object({
          fileIds: z.array(z.string()).describe('Array of file IDs to move'),
          targetFolderId: z.string().describe('Target folder ID'),
          preview: z.boolean().optional().describe('If true, show preview without moving'),
        }),
        func: async ({ fileIds, targetFolderId, preview }) => {
          try {
            if (preview) {
              return JSON.stringify({
                success: true,
                preview: true,
                message: `Ready to move ${fileIds.length} files to folder ${targetFolderId}`,
                fileIds: fileIds,
              });
            }

            const movedFiles = [];
            const errors = [];

            for (const fileId of fileIds) {
              try {
                await this.filesService.moveFile(
                  fileId,
                  this.context.workspaceId,
                  { target_folder_id: targetFolderId },
                  this.context.userId
                );
                movedFiles.push(fileId);
              } catch (err) {
                errors.push({ fileId, error: err.message });
              }
            }

            return JSON.stringify({
              success: true,
              message: `Moved ${movedFiles.length} of ${fileIds.length} files`,
              moved: movedFiles,
              errors: errors.length > 0 ? errors : undefined,
            });
          } catch (error) {
            this.logger.error(`[batch_move_files] Error: ${error.message}`);
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),
    ];
  }

  // ============================================
  // BUDGET TOOLS
  // ============================================

  private getBudgetTools(): DynamicStructuredTool[] {
    return [
      new DynamicStructuredTool({
        name: 'create_budget',
        description: 'Create a new budget for tracking expenses.',
        schema: z.object({
          name: z.string().describe('Budget name'),
          totalBudget: z.number().describe('Total budget amount'),
          projectId: z.string().optional().describe('Associate with a project'),
          description: z.string().optional().describe('Budget description'),
          currency: z.string().optional().describe('Currency code (default: USD)'),
          startDate: z.string().optional().describe('Budget start date (ISO format)'),
          endDate: z.string().optional().describe('Budget end date (ISO format)'),
        }),
        func: async ({ name, totalBudget, projectId, description, currency, startDate, endDate }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would create budget',
              details: { name, totalBudget, currency: currency || 'USD' },
            });
          }

          try {
            const budget = await this.budgetService.createBudget(
              this.context.workspaceId,
              this.context.userId,
              {
                name,
                total_budget: totalBudget,
                project_id: projectId,
                description,
                currency: currency || 'USD',
                start_date: startDate,
                end_date: endDate,
              } as any,
            );
            return JSON.stringify({ success: true, budget, message: `Budget "${name}" created successfully` });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'list_budgets',
        description: 'List all budgets in the workspace.',
        schema: z.object({
          projectId: z.string().optional().describe('Filter by project ID'),
        }),
        func: async ({ projectId }) => {
          try {
            const budgets = await this.budgetService.getBudgets(this.context.workspaceId, projectId);
            return JSON.stringify({ success: true, budgets, count: budgets.length });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'get_budget_summary',
        description: 'Get budget summary with spending statistics.',
        schema: z.object({
          budgetId: z.string().describe('Budget ID to get summary for'),
        }),
        func: async ({ budgetId }) => {
          try {
            const summary = await this.budgetService.getBudgetSummary(this.context.workspaceId, budgetId);
            return JSON.stringify({ success: true, summary });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'create_expense',
        description: 'Create a new expense entry in a budget.',
        schema: z.object({
          budgetId: z.string().describe('Budget ID to add expense to'),
          title: z.string().describe('Expense title/description'),
          amount: z.number().describe('Expense amount'),
          expenseDate: z.string().describe('Date of expense (ISO format)'),
          categoryId: z.string().optional().describe('Budget category ID'),
          taskId: z.string().optional().describe('Associated task ID'),
          description: z.string().optional().describe('Additional details'),
          vendor: z.string().optional().describe('Vendor name'),
        }),
        func: async ({ budgetId, title, amount, expenseDate, categoryId, taskId, description, vendor }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would create expense',
              details: { title, amount, budgetId },
            });
          }

          try {
            const expense = await this.budgetService.createExpense(
              this.context.workspaceId,
              this.context.userId,
              {
                budget_id: budgetId,
                title,
                amount,
                expense_date: expenseDate,
                category_id: categoryId,
                task_id: taskId,
                description,
                vendor,
              } as any,
            );
            return JSON.stringify({ success: true, expense, message: `Expense "${title}" added successfully` });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'list_expenses',
        description: 'List expenses for a budget.',
        schema: z.object({
          budgetId: z.string().describe('Budget ID to list expenses for'),
        }),
        func: async ({ budgetId }) => {
          try {
            const expenses = await this.budgetService.getExpenses(this.context.workspaceId, budgetId);
            return JSON.stringify({ success: true, expenses, count: expenses.length });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'approve_expense',
        description: 'Approve a pending expense.',
        schema: z.object({
          expenseId: z.string().describe('Expense ID to approve'),
        }),
        func: async ({ expenseId }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would approve expense',
              details: { expenseId },
            });
          }

          try {
            const expense = await this.budgetService.approveExpense(
              this.context.workspaceId,
              expenseId,
              this.context.userId,
            );
            return JSON.stringify({ success: true, expense, message: 'Expense approved successfully' });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'delete_budget',
        description: 'Delete a budget.',
        schema: z.object({
          budgetId: z.string().describe('Budget ID to delete'),
        }),
        func: async ({ budgetId }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would delete budget',
              details: { budgetId },
            });
          }

          try {
            await this.budgetService.deleteBudget(this.context.workspaceId, budgetId, this.context.userId);
            return JSON.stringify({ success: true, message: 'Budget deleted successfully' });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),
    ];
  }

  // ============================================
  // APPROVAL TOOLS
  // ============================================

  private getApprovalTools(): DynamicStructuredTool[] {
    return [
      new DynamicStructuredTool({
        name: 'create_approval_request',
        description: 'Create a new approval request.',
        schema: z.object({
          requestTypeId: z.string().describe('Type of approval request'),
          title: z.string().describe('Request title'),
          description: z.string().optional().describe('Request description'),
          priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional().describe('Request priority'),
          dueDate: z.string().optional().describe('Due date (ISO format)'),
          approverIds: z.array(z.string()).optional().describe('Specific approvers to assign'),
        }),
        func: async ({ requestTypeId, title, description, priority, dueDate, approverIds }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would create approval request',
              details: { title, requestTypeId, priority },
            });
          }

          try {
            const request = await this.approvalsService.createApprovalRequest(
              this.context.workspaceId,
              {
                requestTypeId,
                title,
                description,
                priority,
                dueDate,
                approverIds,
              } as any,
              this.context.userId,
            );
            return JSON.stringify({ success: true, request, message: `Approval request "${title}" created` });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'list_approval_requests',
        description: 'List approval requests with optional filters.',
        schema: z.object({
          status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).optional().describe('Filter by status'),
          pendingMyApproval: z.boolean().optional().describe('Show only requests pending my approval'),
          priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional().describe('Filter by priority'),
        }),
        func: async ({ status, pendingMyApproval, priority }) => {
          try {
            const result = await this.approvalsService.getApprovalRequests(
              this.context.workspaceId,
              { status, pendingMyApproval, priority } as any,
              this.context.userId,
            );
            return JSON.stringify({ success: true, requests: result.requests, total: result.total });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'approve_request',
        description: 'Approve an approval request.',
        schema: z.object({
          requestId: z.string().describe('Request ID to approve'),
          comments: z.string().optional().describe('Optional approval comments'),
        }),
        func: async ({ requestId, comments }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would approve request',
              details: { requestId },
            });
          }

          try {
            const request = await this.approvalsService.approveRequest(
              this.context.workspaceId,
              requestId,
              { comments } as any,
              this.context.userId,
            );
            return JSON.stringify({ success: true, request, message: 'Request approved successfully' });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'reject_request',
        description: 'Reject an approval request.',
        schema: z.object({
          requestId: z.string().describe('Request ID to reject'),
          reason: z.string().describe('Reason for rejection'),
        }),
        func: async ({ requestId, reason }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would reject request',
              details: { requestId, reason },
            });
          }

          try {
            const request = await this.approvalsService.rejectRequest(
              this.context.workspaceId,
              requestId,
              { reason } as any,
              this.context.userId,
            );
            return JSON.stringify({ success: true, request, message: 'Request rejected' });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'get_approval_stats',
        description: 'Get approval statistics for the workspace.',
        schema: z.object({}),
        func: async () => {
          try {
            const stats = await this.approvalsService.getStats(this.context.workspaceId, this.context.userId);
            return JSON.stringify({ success: true, stats });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'list_request_types',
        description: 'List available approval request types.',
        schema: z.object({}),
        func: async () => {
          try {
            const requestTypes = await this.approvalsService.getRequestTypes(this.context.workspaceId);
            return JSON.stringify({ success: true, requestTypes });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),
    ];
  }

  // ============================================
  // NOTIFICATION TOOLS
  // ============================================

  private getNotificationTools(): DynamicStructuredTool[] {
    return [
      new DynamicStructuredTool({
        name: 'send_notification',
        description: 'Send a notification to one or more users.',
        schema: z.object({
          userIds: z.array(z.string()).describe('User IDs to notify'),
          title: z.string().describe('Notification title'),
          message: z.string().describe('Notification message'),
          type: z.string().optional().describe('Notification type (info, warning, success, error)'),
          actionUrl: z.string().optional().describe('URL to open when notification is clicked'),
        }),
        func: async ({ userIds, title, message, type, actionUrl }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would send notification',
              details: { userIds, title },
            });
          }

          try {
            await this.notificationsService.sendNotification({
              userIds,
              title,
              message,
              type: type || 'info',
              actionUrl,
              workspaceId: this.context.workspaceId,
            } as any);
            return JSON.stringify({ success: true, message: `Notification sent to ${userIds.length} user(s)` });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'list_notifications',
        description: 'Get your notifications.',
        schema: z.object({
          limit: z.number().optional().describe('Number of notifications to return (default: 20)'),
        }),
        func: async ({ limit = 20 }) => {
          try {
            const notifications = await this.notificationsService.getNotifications(
              this.context.userId,
              { limit } as any,
            );
            return JSON.stringify({ success: true, notifications });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'mark_notifications_read',
        description: 'Mark notifications as read.',
        schema: z.object({
          notificationIds: z.array(z.string()).optional().describe('Specific notification IDs to mark as read'),
          markAll: z.boolean().optional().describe('Mark all notifications as read'),
        }),
        func: async ({ notificationIds, markAll }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: markAll ? 'Would mark all notifications as read' : 'Would mark notifications as read',
              details: { notificationIds, markAll },
            });
          }

          try {
            if (markAll) {
              await this.notificationsService.markAllAsReadBulk(this.context.userId);
              return JSON.stringify({ success: true, message: 'All notifications marked as read' });
            } else if (notificationIds && notificationIds.length > 0) {
              await this.notificationsService.bulkMarkAsRead(this.context.userId, { notificationIds } as any);
              return JSON.stringify({ success: true, message: `${notificationIds.length} notification(s) marked as read` });
            }
            return JSON.stringify({ success: false, error: 'Specify notificationIds or set markAll to true' });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'clear_notifications',
        description: 'Clear all read notifications.',
        schema: z.object({}),
        func: async () => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would clear all read notifications',
            });
          }

          try {
            await this.notificationsService.deleteAllReadNotifications(this.context.userId);
            return JSON.stringify({ success: true, message: 'All read notifications cleared' });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),
    ];
  }

  // ============================================
  // TEMPLATE TOOLS
  // ============================================

  private getTemplateTools(): DynamicStructuredTool[] {
    return [
      new DynamicStructuredTool({
        name: 'list_templates',
        description: 'List available project templates.',
        schema: z.object({
          category: z.string().optional().describe('Filter by category'),
          search: z.string().optional().describe('Search query'),
        }),
        func: async ({ category, search }) => {
          try {
            const templates = await this.templatesService.findAll(
              this.context.workspaceId,
              { category, search } as any,
            );
            return JSON.stringify({ success: true, templates });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'get_template',
        description: 'Get template details by ID or slug.',
        schema: z.object({
          templateId: z.string().describe('Template ID or slug'),
        }),
        func: async ({ templateId }) => {
          try {
            const template = await this.templatesService.findOne(this.context.workspaceId, templateId);
            return JSON.stringify({ success: true, template });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'create_project_from_template',
        description: 'Create a new project from a template.',
        schema: z.object({
          templateId: z.string().describe('Template ID or slug to use'),
          name: z.string().describe('Project name'),
          description: z.string().optional().describe('Project description'),
          startDate: z.string().optional().describe('Project start date (ISO format)'),
        }),
        func: async ({ templateId, name, description, startDate }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would create project from template',
              details: { templateId, name },
            });
          }

          try {
            const project = await this.templatesService.createProjectFromTemplate(
              this.context.workspaceId,
              {
                templateId,
                name,
                description,
                startDate,
              } as any,
              this.context.userId,
            );
            return JSON.stringify({ success: true, project, message: `Project "${name}" created from template` });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'list_template_categories',
        description: 'List template categories.',
        schema: z.object({}),
        func: async () => {
          try {
            const categories = await this.templatesService.getCategories();
            return JSON.stringify({ success: true, categories });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),
    ];
  }

  // ============================================
  // DOCUMENT TOOLS
  // ============================================

  private getDocumentTools(): DynamicStructuredTool[] {
    return [
      new DynamicStructuredTool({
        name: 'create_document',
        description: 'Create a new document.',
        schema: z.object({
          title: z.string().describe('Document title'),
          content: z.string().optional().describe('Document content'),
          templateId: z.string().optional().describe('Template ID to use'),
        }),
        func: async ({ title, content, templateId }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would create document',
              details: { title },
            });
          }

          try {
            const document = await this.documentsService.create(
              this.context.workspaceId,
              { title, content, templateId } as any,
              this.context.userId,
            );
            return JSON.stringify({ success: true, document, message: `Document "${title}" created` });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'list_documents',
        description: 'List your documents.',
        schema: z.object({
          status: z.string().optional().describe('Filter by status'),
          search: z.string().optional().describe('Search query'),
        }),
        func: async ({ status, search }) => {
          try {
            const documents = await this.documentsService.findAll(
              this.context.workspaceId,
              this.context.userId,
              { status, search } as any,
            );
            return JSON.stringify({ success: true, documents });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'get_document',
        description: 'Get document details.',
        schema: z.object({
          documentId: z.string().describe('Document ID'),
        }),
        func: async ({ documentId }) => {
          try {
            const document = await this.documentsService.findOneWithDetails(
              this.context.workspaceId,
              documentId,
              this.context.userId,
            );
            return JSON.stringify({ success: true, document });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'send_document_for_signature',
        description: 'Send a document for e-signature.',
        schema: z.object({
          documentId: z.string().describe('Document ID to send'),
          message: z.string().optional().describe('Message to include with the request'),
        }),
        func: async ({ documentId, message }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would send document for signature',
              details: { documentId },
            });
          }

          try {
            await this.documentsService.sendForSignature(
              this.context.workspaceId,
              documentId,
              { message } as any,
              this.context.userId,
            );
            return JSON.stringify({ success: true, message: 'Document sent for signature' });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'add_document_recipient',
        description: 'Add a recipient to a document.',
        schema: z.object({
          documentId: z.string().describe('Document ID'),
          email: z.string().describe('Recipient email'),
          name: z.string().describe('Recipient name'),
          role: z.enum(['signer', 'viewer']).optional().describe('Recipient role (default: signer)'),
        }),
        func: async ({ documentId, email, name, role = 'signer' }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would add recipient to document',
              details: { documentId, email, role },
            });
          }

          try {
            const recipient = await this.documentsService.addRecipient(
              this.context.workspaceId,
              documentId,
              { email, name, role } as any,
              this.context.userId,
            );
            return JSON.stringify({ success: true, recipient, message: `Recipient ${email} added` });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'delete_document',
        description: 'Delete a document.',
        schema: z.object({
          documentId: z.string().describe('Document ID to delete'),
        }),
        func: async ({ documentId }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would delete document',
              details: { documentId },
            });
          }

          try {
            await this.documentsService.delete(this.context.workspaceId, documentId, this.context.userId);
            return JSON.stringify({ success: true, message: 'Document deleted' });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),
    ];
  }

  // ============================================
  // WHITEBOARD TOOLS
  // ============================================

  private getWhiteboardTools(): DynamicStructuredTool[] {
    return [
      new DynamicStructuredTool({
        name: 'create_whiteboard',
        description: 'Create a new whiteboard.',
        schema: z.object({
          name: z.string().describe('Whiteboard name'),
          description: z.string().optional().describe('Whiteboard description'),
        }),
        func: async ({ name, description }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would create whiteboard',
              details: { name },
            });
          }

          try {
            const whiteboard = await this.whiteboardsService.createWhiteboard(
              this.context.workspaceId,
              { name, description } as any,
              this.context.userId,
            );
            return JSON.stringify({ success: true, whiteboard, message: `Whiteboard "${name}" created` });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'list_whiteboards',
        description: 'List whiteboards in the workspace.',
        schema: z.object({}),
        func: async () => {
          try {
            const whiteboards = await this.whiteboardsService.getWhiteboards(this.context.workspaceId, this.context.userId);
            return JSON.stringify({ success: true, whiteboards, count: whiteboards.length });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'delete_whiteboard',
        description: 'Delete a whiteboard.',
        schema: z.object({
          whiteboardId: z.string().describe('Whiteboard ID to delete'),
        }),
        func: async ({ whiteboardId }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would delete whiteboard',
              details: { whiteboardId },
            });
          }

          try {
            await this.whiteboardsService.deleteWhiteboard(this.context.workspaceId, whiteboardId, this.context.userId);
            return JSON.stringify({ success: true, message: 'Whiteboard deleted' });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),
    ];
  }

  // ============================================
  // WORKFLOW AUTOMATION TOOLS
  // ============================================

  private getWorkflowTools(): DynamicStructuredTool[] {
    return [
      // Create workflow from natural language
      new DynamicStructuredTool({
        name: 'create_workflow_from_description',
        description: 'Create an automated workflow from a natural language description. Use this when the user wants to automate something like "notify me when...", "send a reminder when...", "create a task when...".',
        schema: z.object({
          description: z.string().describe('Natural language description of the workflow automation (e.g., "Send me a notification when a task becomes overdue")'),
        }),
        func: async ({ description }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would create workflow',
              details: { description },
            });
          }

          try {
            // Generate workflow from description using AI
            const parseResult = await this.aiWorkflowGeneratorService.generateFromDescription(
              description,
              this.context.workspaceId,
              this.context.userId,
            );

            if (parseResult.confidence < 0.5) {
              return JSON.stringify({
                success: false,
                message: 'Could not understand the workflow request. Please be more specific.',
                suggestions: parseResult.suggestions,
              });
            }

            // Create the workflow
            const workflow = await this.workflowsService.createWorkflow(
              this.context.workspaceId,
              this.context.userId,
              {
                name: parseResult.workflow.name,
                description: parseResult.workflow.description,
                triggerType: parseResult.workflow.triggerType as WorkflowTriggerType,
                triggerConfig: parseResult.workflow.triggerConfig,
                icon: parseResult.workflow.icon,
                color: parseResult.workflow.color,
                steps: parseResult.workflow.steps.map((step) => ({
                  stepName: step.name,
                  stepType: step.stepType as WorkflowStepType,
                  stepOrder: step.order,
                  stepConfig: {
                    actionType: step.actionType,
                    actionConfig: step.actionConfig,
                    conditions: step.conditions.length > 0 ? {
                      operator: 'and',
                      conditions: step.conditions.map((c) => ({
                        field: c.field,
                        operator: c.operator,
                        value: c.value,
                      })),
                    } : undefined,
                  },
                })),
              },
            );

            return JSON.stringify({
              success: true,
              workflow: {
                id: workflow.id,
                name: workflow.name,
                description: workflow.description,
                triggerType: workflow.triggerType,
                isActive: workflow.isActive,
              },
              message: `Workflow "${workflow.name}" created and activated. It will ${parseResult.workflow.description.toLowerCase()}`,
              warnings: parseResult.warnings,
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      // List workflows
      new DynamicStructuredTool({
        name: 'list_workflows',
        description: 'List all workflows in the workspace. Can filter by active status.',
        schema: z.object({
          activeOnly: z.boolean().optional().describe('If true, only show active workflows'),
        }),
        func: async ({ activeOnly }) => {
          try {
            const result = await this.workflowsService.listWorkflows(
              this.context.workspaceId,
              { isActive: activeOnly },
            );

            const workflows = result.data.map((w) => ({
              id: w.id,
              name: w.name,
              description: w.description,
              triggerType: w.triggerType,
              isActive: w.isActive,
              createdAt: w.createdAt,
            }));

            return JSON.stringify({
              success: true,
              workflows,
              total: result.total,
              message: `Found ${result.total} workflow(s)`,
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      // Get workflow details
      new DynamicStructuredTool({
        name: 'get_workflow',
        description: 'Get details of a specific workflow including its steps and configuration.',
        schema: z.object({
          workflowId: z.string().describe('The workflow ID to get details for'),
        }),
        func: async ({ workflowId }) => {
          try {
            const workflow = await this.workflowsService.getWorkflow(
              this.context.workspaceId,
              workflowId,
            );

            return JSON.stringify({
              success: true,
              workflow: {
                id: workflow.id,
                name: workflow.name,
                description: workflow.description,
                triggerType: workflow.triggerType,
                triggerConfig: workflow.triggerConfig,
                isActive: workflow.isActive,
                steps: workflow.steps?.map((s) => ({
                  id: s.id,
                  name: s.stepName,
                  stepType: s.stepType,
                  actionType: s.stepConfig?.actionType,
                })),
              },
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      // Enable/Disable workflow
      new DynamicStructuredTool({
        name: 'toggle_workflow',
        description: 'Enable or disable a workflow. Disabled workflows will not trigger.',
        schema: z.object({
          workflowId: z.string().describe('The workflow ID to toggle'),
          enable: z.boolean().describe('True to enable, false to disable'),
        }),
        func: async ({ workflowId, enable }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: enable ? 'Would enable workflow' : 'Would disable workflow',
              details: { workflowId },
            });
          }

          try {
            const workflow = await this.workflowsService.updateWorkflow(
              this.context.workspaceId,
              workflowId,
              { isActive: enable },
            );

            return JSON.stringify({
              success: true,
              workflow: {
                id: workflow.id,
                name: workflow.name,
                isActive: workflow.isActive,
              },
              message: `Workflow "${workflow.name}" ${enable ? 'enabled' : 'disabled'}`,
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      // Delete workflow
      new DynamicStructuredTool({
        name: 'delete_workflow',
        description: 'Delete a workflow permanently.',
        schema: z.object({
          workflowId: z.string().describe('The workflow ID to delete'),
        }),
        func: async ({ workflowId }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would delete workflow',
              details: { workflowId },
            });
          }

          try {
            // Get workflow name first for the message
            const workflow = await this.workflowsService.getWorkflow(
              this.context.workspaceId,
              workflowId,
            );
            const workflowName = workflow.name;

            await this.workflowsService.deleteWorkflow(
              this.context.workspaceId,
              workflowId,
            );

            return JSON.stringify({
              success: true,
              message: `Workflow "${workflowName}" deleted`,
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      // Run workflow manually
      new DynamicStructuredTool({
        name: 'run_workflow',
        description: 'Manually trigger a workflow to run immediately.',
        schema: z.object({
          workflowId: z.string().describe('The workflow ID to run'),
        }),
        func: async ({ workflowId }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would run workflow',
              details: { workflowId },
            });
          }

          try {
            const execution = await this.workflowsService.triggerWorkflow(
              this.context.workspaceId,
              workflowId,
              this.context.userId,
              'manual',
              { triggeredBy: 'autopilot' },
            );

            return JSON.stringify({
              success: true,
              executionId: execution.id,
              status: execution.status,
              message: 'Workflow triggered successfully',
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),
    ];
  }

  // ============================================
  // SCHEDULING TOOLS - One-time future actions
  // ============================================

  private getSchedulingTools(): DynamicStructuredTool[] {
    return [
      // Schedule a one-time action for the future
      new DynamicStructuredTool({
        name: 'schedule_action',
        description: `Schedule a one-time action to be executed at a specific future time. Use this when the user wants to do something "at X time", "in X minutes", "at 9:50 AM", etc. This creates a scheduled job that will run ONCE at the specified time.

IMPORTANT: This is for ONE-TIME future actions, NOT recurring automations. For recurring tasks, use create_workflow_from_description instead.

CRITICAL - TIMEZONE HANDLING:
1. ALWAYS call get_current_date_time FIRST to get the user's timezone
2. User times like "10:20 AM" are in the user's LOCAL timezone, NOT UTC
3. You MUST convert local time to UTC for the scheduledTime parameter
4. Example: If user is in Asia/Dhaka (UTC+6) and says "10:20 AM":
   - Local time: 10:20 AM
   - UTC time: 10:20 - 6 hours = 04:20 UTC
   - scheduledTime: "2024-01-21T04:20:00Z"

Examples of when to use this:
- "Send an email at 9:50 AM"
- "Remind me in 30 minutes to call John"
- "Send a notification at 5 PM"
- "Create a task tomorrow at 10 AM"`,
        schema: z.object({
          actionType: z.enum(['send_email', 'send_notification', 'create_task', 'send_message'])
            .describe('The type of action to schedule'),
          scheduledTime: z.string()
            .describe('ISO 8601 datetime string in UTC for when to execute (e.g., "2024-01-15T09:50:00Z"). MUST be in UTC and in the future. Convert user local time to UTC.'),
          actionConfig: z.record(z.string(), z.any())
            .describe('Configuration for the action. For send_email: {to: ["email"], subject: "...", body: "..."}. For send_notification: {title: "...", message: "..."}'),
          description: z.string().optional()
            .describe('Human-readable description of what this scheduled action will do'),
        }),
        func: async ({ actionType, scheduledTime, actionConfig, description }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would schedule action',
              details: { actionType, scheduledTime, actionConfig, description },
            });
          }

          try {
            // Parse and validate the scheduled time
            const scheduledAt = new Date(scheduledTime);
            const now = new Date();

            if (isNaN(scheduledAt.getTime())) {
              return JSON.stringify({
                success: false,
                error: 'Invalid date format. Use ISO 8601 format (e.g., "2024-01-15T09:50:00Z")',
              });
            }

            if (scheduledAt <= now) {
              return JSON.stringify({
                success: false,
                error: 'Scheduled time must be in the future',
              });
            }

            // Validate action config based on action type
            if (actionType === 'send_email') {
              if (!actionConfig.to || !Array.isArray(actionConfig.to) || actionConfig.to.length === 0) {
                return JSON.stringify({
                  success: false,
                  error: 'send_email requires "to" field with recipient email addresses',
                });
              }
              if (!actionConfig.subject || !actionConfig.body) {
                return JSON.stringify({
                  success: false,
                  error: 'send_email requires "subject" and "body" fields',
                });
              }
            }

            // Create the scheduled action
            const scheduledAction = await this.scheduledActionsService.scheduleAction(
              this.context.workspaceId,
              this.context.userId,
              actionType,
              actionConfig,
              scheduledAt,
              description || `Scheduled ${actionType}`,
            );

            // Format the time nicely for the response
            const timeStr = scheduledAt.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            });
            const dateStr = scheduledAt.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            });

            return JSON.stringify({
              success: true,
              scheduledAction: {
                id: scheduledAction.id,
                actionType: scheduledAction.actionType,
                scheduledAt: scheduledAction.scheduledAt,
                status: scheduledAction.status,
                description: scheduledAction.description,
              },
              message: `Action scheduled for ${timeStr} on ${dateStr}. It will be executed automatically at that time.`,
            });
          } catch (error) {
            this.logger.error(`[ScheduleAction] Error: ${error.message}`);
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      // List scheduled actions
      new DynamicStructuredTool({
        name: 'list_scheduled_actions',
        description: 'List all pending scheduled actions for this workspace.',
        schema: z.object({}),
        func: async () => {
          try {
            const actions = await this.scheduledActionsService.getPendingActions(
              this.context.workspaceId,
            );

            if (actions.length === 0) {
              return JSON.stringify({
                success: true,
                actions: [],
                message: 'No pending scheduled actions',
              });
            }

            const formattedActions = actions.map((a) => ({
              id: a.id,
              actionType: a.actionType,
              scheduledAt: a.scheduledAt,
              description: a.description,
              status: a.status,
            }));

            return JSON.stringify({
              success: true,
              actions: formattedActions,
              total: actions.length,
              message: `Found ${actions.length} pending scheduled action(s)`,
            });
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),

      // Cancel a scheduled action
      new DynamicStructuredTool({
        name: 'cancel_scheduled_action',
        description: 'Cancel a pending scheduled action before it executes.',
        schema: z.object({
          actionId: z.string().describe('The ID of the scheduled action to cancel'),
        }),
        func: async ({ actionId }) => {
          if (!this.context.executeActions) {
            return JSON.stringify({
              preview: true,
              action: 'Would cancel scheduled action',
              details: { actionId },
            });
          }

          try {
            const cancelled = await this.scheduledActionsService.cancelAction(
              actionId,
              this.context.userId,
            );

            if (cancelled) {
              return JSON.stringify({
                success: true,
                message: 'Scheduled action cancelled successfully',
              });
            } else {
              return JSON.stringify({
                success: false,
                error: 'Could not cancel action. It may not exist, already executed, or you do not have permission.',
              });
            }
          } catch (error) {
            return JSON.stringify({ success: false, error: error.message });
          }
        },
      }),
    ];
  }
}
