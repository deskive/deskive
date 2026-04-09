import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { z } from 'zod';

export interface IntentResult {
  intent: string;
  entities: {
    projectName?: string;
    taskName?: string;
    eventName?: string;
    status?: string;
    priority?: string;
    field?: string;
    value?: string;
    assignee?: string;
    dueDate?: string;
    description?: string;
    location?: string;
    time?: string;
    date?: string;
    participant?: string;
    memberName?: string;
    comment?: string;
    duration?: string;
    timeframe?: string; // today, tomorrow, this week, this month
    messageContent?: string;
    recipientName?: string;
    [key: string]: any;
  };
  confidence: number;
}

@Injectable()
export class BotIntentClassifierService {
  private readonly logger = new Logger(BotIntentClassifierService.name);
  private openai: ChatOpenAI;
  private parser: StructuredOutputParser<any>;

  constructor(private readonly configService: ConfigService) {
    // Initialize OpenAI
    this.openai = new ChatOpenAI({
      openAIApiKey: this.configService.get<string>('OPENAI_API_KEY'),
      modelName: 'gpt-4o-mini',
      temperature: 0,
    });

    // Define output schema
    const schema = z.object({
      intent: z.enum([
        // General
        'greeting',
        'help',
        'general_chat',
        'clear_memory',
        'unknown',

        // Bot assignments
        'show_assignments',
        'show_bot_projects',
        'show_bot_events',

        // Project intents
        'show_projects',
        'show_project_details',
        'show_project_members',
        'show_project_tasks',
        'create_project',
        'update_project',
        'delete_project',
        'search_projects',
        'add_project_member',
        'remove_project_member',
        'update_project_status',
        'duplicate_project',

        // Task intents
        'show_tasks',
        'show_my_tasks',
        'show_task_details',
        'show_completed_tasks',
        'show_overdue_tasks',
        'show_tasks_by_priority',
        'show_tasks_by_status',
        'show_tasks_due_today',
        'show_tasks_due_this_week',
        'show_subtasks',
        'create_task',
        'create_subtask',
        'update_task',
        'update_task_status',
        'update_task_assignee',
        'update_task_description',
        'set_task_priority',
        'set_task_due_date',
        'delete_task',
        'assign_task',
        'unassign_task',
        'complete_task',
        'reopen_task',
        'add_task_comment',
        'search_tasks',

        // Event intents
        'show_events',
        'show_today_events',
        'show_tomorrow_events',
        'show_week_events',
        'show_month_events',
        'show_upcoming_events',
        'show_past_events',
        'show_event_details',
        'show_event_participants',
        'create_event',
        'update_event',
        'update_event_time',
        'update_event_location',
        'cancel_event',
        'reschedule_event',
        'delete_event',
        'add_event_participant',
        'remove_event_participant',
        'search_events',
        'duplicate_event',

        // Messaging & Communication intents
        'send_message_to_assignee',
        'send_message_to_participant',
        'send_message_to_member',
        'send_message_to_user',
        'message_project_team',
        'message_event_participants',
      ]).describe('The user\'s intent'),
      entities: z.object({
        projectName: z.string().optional().describe('Name of the project mentioned'),
        taskName: z.string().optional().describe('Name of the task mentioned'),
        eventName: z.string().optional().describe('Name of the event mentioned'),
        status: z.string().optional().describe('New status (todo, in_progress, review, testing, done, complete)'),
        priority: z.string().optional().describe('Priority level (highest, high, medium, low, lowest)'),
        field: z.string().optional().describe('Field to update (title, priority, due date, location, time)'),
        value: z.string().optional().describe('New value for the field'),
        assignee: z.string().optional().describe('Person to assign to (name or email)'),
        dueDate: z.string().optional().describe('Due date (today, tomorrow, next week, specific date)'),
        description: z.string().optional().describe('Description or details'),
        location: z.string().optional().describe('Location for event'),
        time: z.string().optional().describe('Time (2pm, 14:00, etc)'),
        date: z.string().optional().describe('Date (today, tomorrow, next monday, 2024-01-15)'),
        participant: z.string().optional().describe('Event participant name or email'),
        memberName: z.string().optional().describe('Project member name'),
        comment: z.string().optional().describe('Comment text to add'),
        duration: z.string().optional().describe('Duration (30min, 1 hour, 2 hours)'),
        timeframe: z.string().optional().describe('Timeframe (today, tomorrow, this week, this month, past)'),
        messageContent: z.string().optional().describe('Message content to send to user(s)'),
        recipientName: z.string().optional().describe('Recipient name or email for direct messages'),
      }).describe('Extracted entities from the message'),
      confidence: z.number().min(0).max(1).describe('Confidence score 0-1'),
    });

    this.parser = StructuredOutputParser.fromZodSchema(schema);
  }

  /**
   * Classify user intent and extract entities
   */
  async classifyIntent(message: string): Promise<IntentResult> {
    try {
      const formatInstructions = this.parser.getFormatInstructions();

      const prompt = `You are an intent classifier for a productivity assistant bot. Analyze the user message and determine their intent.

AVAILABLE INTENTS:

========== GENERAL ==========
- greeting: User is greeting the bot or saying goodbye
  Examples: "hi", "hello", "hey", "good morning", "goodbye", "see you later"

- help: User needs help or command list
  Examples: "help", "what can you do?", "commands", "how do I...?", "guide me"

- general_chat: Small talk not related to work
  Examples: "how are you?", "what's your name?", "tell me about yourself", "nice to meet you"

- clear_memory: User wants to clear/reset bot's conversation memory
  Examples: "clear your memory", "forget everything", "reset your context", "clear our chat history", "start fresh", "forget about that project"

- unknown: Cannot determine intent (use only if truly ambiguous)

========== BOT ASSIGNMENTS ==========
- show_assignments: See ALL bot's assignments (projects AND events)
  Examples: "what are you managing?", "show your assignments", "what do you handle?", "show me everything you manage"

- show_bot_projects: See ONLY bot's assigned PROJECTS
  Examples: "which projects are you assigned to?", "show your projects", "what projects do you manage?"

- show_bot_events: See ONLY bot's assigned EVENTS
  Examples: "which events are you assigned to?", "show your events", "what events do you manage?"

========== PROJECT INTENTS ==========
- show_projects: List all user's projects
  Examples: "show my projects", "list projects", "what projects do I have?", "all projects"

- show_project_details: Get detailed info about specific project
  Examples: "show details of Mobile App", "info about Project Alpha", "tell me about Marketing project"

- show_project_members: See team members of a project
  Examples: "who is in Mobile App project?", "show members of Project Alpha", "team members", "who's working on this?"

- show_project_tasks: See all tasks in a specific project
  Examples: "show tasks in Mobile App", "what tasks are in Project Alpha?", "tasks for this project"

- create_project: Create a new project
  Examples: "create project", "new project called Website", "start a project named Mobile App", "make a project"

- update_project: Modify project details
  Examples: "update Mobile App project", "change project name to X", "edit Project Alpha"

- delete_project: Delete a project
  Examples: "delete Mobile App project", "remove Project Alpha", "delete this project"

- search_projects: Search for projects
  Examples: "find projects about marketing", "search for Mobile App", "look for projects"

- add_project_member: Add member to project
  Examples: "add John to Mobile App", "invite Sarah to project", "add member"

- remove_project_member: Remove member from project
  Examples: "remove John from project", "kick Sarah out", "remove member"

- update_project_status: Change project status
  Examples: "mark project as completed", "set project to in progress", "change project status"

- duplicate_project: Copy/duplicate a project
  Examples: "duplicate Mobile App project", "copy this project", "clone Project Alpha"

========== TASK INTENTS ==========
- show_tasks: List all user's tasks
  Examples: "show my tasks", "what tasks do I have?", "list tasks", "my to-dos", "what's on my plate?"

- show_my_tasks: Explicitly user's own tasks (same as show_tasks but more explicit)
  Examples: "show MY tasks", "my tasks only", "what am I working on?"

- show_task_details: Get detailed info about specific task
  Examples: "show details of Login API", "info about Design Homepage", "tell me about this task"

- show_completed_tasks: List completed tasks
  Examples: "show completed tasks", "what's done?", "finished tasks", "completed items"

- show_overdue_tasks: List overdue tasks
  Examples: "show overdue tasks", "what's late?", "overdue items", "missed deadlines"

- show_tasks_by_priority: List tasks filtered by priority
  Examples: "show high priority tasks", "urgent tasks", "low priority items", "critical tasks"

- show_tasks_by_status: List tasks filtered by status
  Examples: "show tasks in progress", "todo tasks", "tasks in review", "pending items"

- show_tasks_due_today: Tasks due today
  Examples: "what's due today?", "today's tasks", "tasks for today", "what do I need to finish today?"

- show_tasks_due_this_week: Tasks due this week
  Examples: "what's due this week?", "this week's tasks", "upcoming tasks", "what's coming up?"

- show_subtasks: Show subtasks of a task
  Examples: "show subtasks", "what are the subtasks?", "child tasks", "nested tasks"

- create_task: Create a new task
  Examples: "create task", "new task called Fix Bug", "add task to Design Homepage", "make a task"

- create_subtask: Create subtask under parent task
  Examples: "create subtask under Login API", "add subtask", "make child task"

- update_task: Modify task details (general update)
  Examples: "update Login API task", "change task description", "edit this task"

- update_task_status: Change task status
  Examples: "mark task as done", "set to in progress", "change status to complete", "finish this task"

- update_task_assignee: Change who's assigned to task
  Examples: "reassign to John", "change assignee to Sarah", "assign to me"

- update_task_description: Update task description
  Examples: "update task description", "change description to X", "edit task details"

- set_task_priority: Set or change task priority
  Examples: "set priority to high", "make this urgent", "change to low priority", "mark as critical"

- set_task_due_date: Set or change task due date
  Examples: "set due date to tomorrow", "due next Monday", "change deadline to Friday"

- delete_task: Delete a task
  Examples: "delete Login API task", "remove this task", "delete task"

- assign_task: Assign task to someone
  Examples: "assign to John", "give this to Sarah", "assign task to me"

- unassign_task: Remove assignee from task
  Examples: "unassign John", "remove assignee", "unassign this task"

- complete_task: Mark task as complete
  Examples: "complete Login API", "mark as done", "finish this task", "task completed"

- reopen_task: Reopen completed task
  Examples: "reopen Login API", "mark as incomplete", "undo completion", "reopen this"

- add_task_comment: Add comment to task
  Examples: "add comment to task", "comment 'looks good'", "add note"

- search_tasks: Search for tasks
  Examples: "find tasks about login", "search for API tasks", "look for design tasks"

========== EVENT INTENTS ==========
- show_events: List all user's upcoming events
  Examples: "show my events", "what's on my calendar?", "upcoming events", "my schedule"

- show_today_events: Events scheduled for today
  Examples: "what's today?", "today's schedule", "events for today", "what do I have today?"

- show_tomorrow_events: Events scheduled for tomorrow
  Examples: "what's tomorrow?", "tomorrow's schedule", "events for tomorrow"

- show_week_events: Events for this week
  Examples: "what's this week?", "weekly schedule", "events this week", "this week's calendar"

- show_month_events: Events for this month
  Examples: "what's this month?", "monthly schedule", "events this month", "this month's calendar"

- show_upcoming_events: Future events
  Examples: "upcoming events", "what's coming up?", "future events", "next events"

- show_past_events: Past/historical events
  Examples: "show past events", "previous meetings", "history", "what happened last week?"

- show_event_details: Get detailed info about specific event
  Examples: "show details of Team Meeting", "info about Standup", "tell me about this event"

- show_event_participants: See who's attending event
  Examples: "who's attending Team Meeting?", "show participants", "who's coming?", "attendees list"

- create_event: Create a new event
  Examples: "create event", "schedule meeting", "new event called Standup", "book meeting for 2pm"

- update_event: Modify event details (general)
  Examples: "update Team Meeting", "change event details", "edit this event"

- update_event_time: Change event time
  Examples: "move to 3pm", "reschedule to tomorrow", "change time to 2pm"

- update_event_location: Change event location
  Examples: "change location to Room 5", "move to Zoom", "update location"

- cancel_event: Cancel an event
  Examples: "cancel Team Meeting", "cancel this event", "delete meeting"

- reschedule_event: Reschedule to different time
  Examples: "reschedule Team Meeting to Friday", "move to next week", "reschedule to 3pm tomorrow"

- delete_event: Delete an event (same as cancel)
  Examples: "delete Team Meeting", "remove this event", "delete meeting"

- add_event_participant: Add attendee to event
  Examples: "add John to Team Meeting", "invite Sarah", "add participant"

- remove_event_participant: Remove attendee from event
  Examples: "remove John from meeting", "uninvite Sarah", "remove participant"

- search_events: Search for events
  Examples: "find meetings about budget", "search for standup", "look for team events"

- duplicate_event: Copy/duplicate an event
  Examples: "duplicate this event", "copy Team Meeting", "clone this meeting"

========== MESSAGING & COMMUNICATION INTENTS ==========
- send_message_to_assignee: Send message to task or project assignee (chained operation)
  Examples: "send a message to the assignee of Login API", "message the person assigned to Mobile App project", "tell the assignee of Design Homepage to review it"

- send_message_to_participant: Send message to event participant (chained operation)
  Examples: "send a message to John who's attending Team Meeting", "message the participants of Standup", "tell Sarah about the Team Meeting changes"

- send_message_to_member: Send message to project member (chained operation)
  Examples: "send a message to Jane in Mobile App project", "message the team members of Project Alpha", "tell the Mobile App team about the deadline"

- send_message_to_user: Send direct message to specific user by name/email
  Examples: "send a message to John Doe", "message john@example.com", "tell Sarah about the update", "DM Mike"

- message_project_team: Send message to all members of a project
  Examples: "message the entire Mobile App team", "send announcement to Project Alpha members", "notify everyone in Marketing project"

- message_event_participants: Send message to all event participants
  Examples: "message all attendees of Team Meeting", "notify everyone attending Standup", "send update to meeting participants"

========== IMPORTANT RULES ==========

1. PRONOUNS MATTER:
   - "you/your" = bot's items → show_bot_projects, show_bot_events
   - "I/my/me" = user's items → show_projects, show_tasks, show_events

2. SPECIFICITY MATTERS:
   - Mentions "project" specifically → project intent
   - Mentions "task" specifically → task intent
   - Mentions "event/meeting/calendar" → event intent
   - General "assignments/managing" → show_assignments

3. ENTITY EXTRACTION:
   - Extract FULL names without articles/numbers
   - "show tasks in Mobile App Design project" → projectName: "Mobile App Design"
   - "complete the Login API task" → taskName: "Login API"
   - "reschedule Team Meeting event" → eventName: "Team Meeting"
   - DO NOT include: "project", "task", "event", "the", "a", numbers

4. DATE/TIME PARSING:
   - "tomorrow" → date: "tomorrow"
   - "next Monday" → date: "next Monday"
   - "2pm" → time: "2pm", "14:00" → time: "14:00"
   - "in 2 hours" → duration: "2 hours"

5. CASUAL LANGUAGE:
   - Be lenient with phrasing
   - "what's up?" could be show_tasks or show_events depending on context
   - "anything due soon?" → show_tasks_due_this_week
   - "who's working on this?" → show_project_members or show_task_details

6. CONFIDENCE SCORING:
   - 0.9-1.0: Very clear intent, all entities present
   - 0.7-0.9: Clear intent, some entities missing
   - 0.5-0.7: Probable intent, ambiguous
   - 0.0-0.5: Unknown/unclear

User message: "${message}"

${formatInstructions}`;

      const response = await this.openai.invoke(prompt);
      const parsed = await this.parser.parse(response.content as string) as IntentResult;

      this.logger.log(`[Intent] Classified as: ${parsed.intent} (confidence: ${parsed.confidence})`);
      if (Object.keys(parsed.entities).length > 0) {
        this.logger.log(`[Intent] Entities: ${JSON.stringify(parsed.entities)}`);
      }

      return parsed as IntentResult;
    } catch (error) {
      this.logger.error(`[Intent] Classification failed: ${error.message}`);
      // Fallback to unknown intent
      return {
        intent: 'unknown',
        entities: {},
        confidence: 0,
      };
    }
  }
}
