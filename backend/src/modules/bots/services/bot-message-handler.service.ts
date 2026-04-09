import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { EventBotAssignmentsService } from '../../calendar/event-bot-assignments.service';
import { BotIntentClassifierService } from './bot-intent-classifier.service';
import { ConversationMemoryService } from '../../conversation-memory/conversation-memory.service';
import { AutoPilotService } from '../../autopilot/autopilot.service';
import { ChatGateway } from '../../chat/gateways/chat.gateway';
import { ChatService } from '../../chat/chat.service';
import { AppGateway } from '../../../common/gateways/app.gateway';
import * as chrono from 'chrono-node';

export interface BotCommand {
  command: string;
  response: string;
}

@Injectable()
export class BotMessageHandlerService {
  private readonly logger = new Logger(BotMessageHandlerService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly eventBotAssignmentsService: EventBotAssignmentsService,
    private readonly intentClassifier: BotIntentClassifierService,
    private readonly conversationMemory: ConversationMemoryService,
    private readonly autopilotService: AutoPilotService,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
    @Inject(forwardRef(() => AppGateway))
    private readonly appGateway: AppGateway,
  ) {}

  /**
   * Process incoming message and check if any bot should respond
   */
  async processMessage(
    workspaceId: string,
    conversationId: string,
    messageId: string,
    userId: string,
    content: string,
  ): Promise<void> {
    try {
      this.logger.log(`[BotMessageHandler] Processing message ${messageId} from user ${userId} in conversation ${conversationId}`);

      // Get conversation details
      const conversation = await this.db.findOne('conversations', {
        id: conversationId,
        workspace_id: workspaceId,
      });

      if (!conversation) {
        this.logger.warn(`[BotMessageHandler] Conversation ${conversationId} not found`);
        return;
      }

      // Parse participants (handle both JSON string and array)
      const participants = typeof conversation.participants === 'string'
        ? JSON.parse(conversation.participants)
        : conversation.participants || [];

      this.logger.debug(`[BotMessageHandler] Conversation participants: ${JSON.stringify(participants)}`);

      // Find if any bot is in this conversation
      const botParticipant = await this.findBotInConversation(participants);

      if (!botParticipant) {
        this.logger.debug(`[BotMessageHandler] No bot found in conversation ${conversationId}`);
        return;
      }

      // Don't respond to bot's own messages
      // userId might be "bot:{botId}" format or just the bot ID
      const userBotId = userId.startsWith('bot:') ? userId.substring(4) : userId;
      if (userBotId === botParticipant.id) {
        this.logger.debug(`[BotMessageHandler] Skipping bot's own message`);
        return;
      }

      this.logger.log(`[BotMessageHandler] Bot "${botParticipant.name}" (${botParticipant.display_name}) will process message from user ${userId}`);

      // Process the message based on bot type
      if (botParticipant.name === 'calendar-event-bot') {
        await this.handleCalendarBotMessage(
          workspaceId,
          conversationId,
          userId,
          content,
          botParticipant.id,
        );
      } else {
        this.logger.warn(`[BotMessageHandler] Unknown bot type: ${botParticipant.name}`);
      }
    } catch (error) {
      this.logger.error(`[BotMessageHandler] Error processing bot message: ${error.message}`, error.stack);
    }
  }

  /**
   * Find if any bot is a participant in the conversation
   */
  private async findBotInConversation(participants: string[]): Promise<any> {
    this.logger.debug(`[BotMessageHandler] Checking ${participants.length} participants for bots`);

    for (const participantId of participants) {
      this.logger.debug(`[BotMessageHandler] Checking if participant ${participantId} is a bot`);

      // Bot participants are prefixed with "bot:" in conversation participants
      // We need to strip this prefix to query the bots table
      const botId = participantId.startsWith('bot:')
        ? participantId.substring(4)
        : participantId;

      this.logger.debug(`[BotMessageHandler] Extracted bot ID: ${botId}`);

      const bot = await this.db.findOne('bots', {
        id: botId,
        status: 'active',
      });

      if (bot) {
        this.logger.log(`[BotMessageHandler] Found bot: ${bot.name} (${bot.display_name})`);
        return bot;
      }
    }

    this.logger.debug(`[BotMessageHandler] No active bot found among participants`);
    return null;
  }

  /**
   * Handle messages for Calendar Event Bot
   *
   * This method implements MEMORY-AWARE bot responses using Qdrant vector database:
   *
   * 1. **Storage**: Every user message and bot response is stored as embeddings in Qdrant
   * 2. **Context Retrieval**: Uses semantic search to find relevant past conversations
   * 3. **Preference Detection**: Analyzes history to understand user patterns:
   *    - Frequently asked queries (events, tasks, projects)
   *    - Time preferences (today, tomorrow, upcoming)
   *    - Focus areas (event-focused vs project-focused users)
   * 4. **Personalization**: Tailors responses based on detected preferences:
   *    - Greeting messages suggest commonly used features
   *    - Responses adapt to user's typical workflow
   *
   * Example: If user frequently asks "What's today?", the bot will:
   * - Detect "prefers_time_specific_queries" preference
   * - Prioritize time-based suggestions in greetings
   * - Remember context from previous conversations
   *
   * This makes the bot "learn" user preferences over time without explicit configuration.
   */
  private async handleCalendarBotMessage(
    workspaceId: string,
    conversationId: string,
    userId: string,
    content: string,
    botId: string,
  ): Promise<void> {
    this.logger.log(`[CalendarBot] Handling message: "${content}"`);

    // 1. Store user message in vector memory for future context
    await this.conversationMemory.storeMessage({
      role: 'user',
      content: content,
      workspace_id: workspaceId,
      user_id: userId,
      entity_type: 'chat_message',
      metadata: {
        bot_id: botId,
        conversation_id: conversationId,
      },
    });

    // 2. Retrieve relevant conversation history for context (includes assignment details from vector DB)
    const relevantHistory = await this.conversationMemory.searchRelevantHistory(
      content,
      workspaceId,
      userId,
      10, // Get top 10 relevant messages (includes assignment context stored during assignment)
    );

    // Extract assignment context from vector DB
    const assignmentContext = relevantHistory.filter(msg =>
      msg.action === 'event_assigned' || msg.action === 'project_assigned'
    );
    if (assignmentContext.length > 0) {
      this.logger.log(`[CalendarBot] Found ${assignmentContext.length} assignment contexts in vector DB`);
      assignmentContext.forEach(ctx => {
        this.logger.debug(`[CalendarBot] Assignment: ${ctx.metadata?.event_title || ctx.metadata?.project_name}`);
      });
    }

    // Check if bot recently asked for clarification
    const recentClarification = relevantHistory.find(msg =>
      msg.action === 'low_confidence' && msg.metadata?.awaiting_clarification === true
    );

    if (recentClarification) {
      this.logger.log(`[CalendarBot] User is responding to clarification request about: "${recentClarification.metadata.original_message}"`);
      // Append context to help classifier understand
      content = `${content} (user previously said: "${recentClarification.metadata.original_message}")`;
    }

    // Check what events and projects this bot is assigned to (database IDs)
    const assignedContext = await this.getBotAssignedContext(workspaceId, userId, botId);
    this.logger.debug(`[CalendarBot] Bot context - Events: ${assignedContext.eventIds.length}, Projects: ${assignedContext.projectIds.length}`);

    // 3. Use conversation history to detect user preferences and patterns
    const userPreferences = this.extractUserPreferences(relevantHistory);
    if (userPreferences.length > 0) {
      this.logger.log(`[CalendarBot] Detected user preferences: ${userPreferences.join(', ')}`);
    }

    // Use LangChain intent classifier for better understanding
    const intent = await this.intentClassifier.classifyIntent(content);
    this.logger.log(`[CalendarBot] Intent: ${intent.intent}, Confidence: ${intent.confidence}`);

    let responseText = '';

    // ========================================
    // LOW CONFIDENCE = ASK FOR CLARIFICATION
    // ========================================
    if (intent.confidence < 0.7) {
      this.logger.warn(`[CalendarBot] Low confidence (${intent.confidence}), asking for clarification`);

      // Generate smart clarifying question based on the ambiguous message
      responseText = await this.generateClarifyingQuestion(content, intent, assignmentContext);

      // Store this interaction for learning
      await this.conversationMemory.storeMessage({
        role: 'assistant',
        content: responseText,
        workspace_id: workspaceId,
        user_id: userId,
        entity_type: 'clarification_request',
        action: 'low_confidence',
        metadata: {
          bot_id: botId,
          conversation_id: conversationId,
          original_message: content,
          best_guess_intent: intent.intent,
          confidence: intent.confidence,
          awaiting_clarification: true,
        },
      });

      await this.sendBotMessage(workspaceId, conversationId, botId, responseText);
      return;
    }

    // Route to appropriate handler based on classified intent
    switch (intent.intent) {
      // ========== GENERAL ==========
      case 'greeting':
        responseText = this.getGreetingResponse(userPreferences);
        break;
      case 'general_chat':
        responseText = this.getGeneralChatResponse(content);
        break;
      case 'help':
        responseText = this.getHelpMessage();
        break;
      case 'clear_memory':
        responseText = await this.clearBotMemory(workspaceId, userId, botId);
        break;

      // ========== BOT ASSIGNMENTS ==========
      case 'show_assignments':
        responseText = await this.getMyAssignments(workspaceId, userId, botId, assignmentContext);
        break;
      case 'show_bot_projects':
        responseText = await this.getBotProjects(workspaceId, userId, botId, assignmentContext);
        break;
      case 'show_bot_events':
        responseText = await this.getBotEvents(workspaceId, userId, botId, assignmentContext);
        break;

      // ========== PROJECT INTENTS ==========
      case 'show_projects':
        responseText = await this.getMyProjects(workspaceId, userId, assignedContext.projectIds);
        break;
      case 'show_project_details':
        responseText = await this.getProjectDetails(workspaceId, userId, intent.entities.projectName || content, assignedContext.projectIds);
        break;
      case 'show_project_members':
        responseText = await this.getProjectMembers(workspaceId, userId, intent.entities.projectName || content, assignedContext.projectIds);
        break;
      case 'show_project_tasks':
        responseText = await this.getProjectTasks(workspaceId, userId, intent.entities.projectName || content, assignedContext.projectIds);
        break;
      case 'create_project':
        responseText = await this.createProject(workspaceId, userId, intent.entities);
        break;
      case 'update_project':
        responseText = await this.updateProject(workspaceId, userId, intent.entities);
        break;
      case 'delete_project':
        responseText = await this.deleteProject(workspaceId, userId, intent.entities);
        break;
      case 'search_projects':
        responseText = await this.searchProjects(workspaceId, userId, content, assignedContext.projectIds);
        break;
      case 'add_project_member':
        responseText = await this.addProjectMember(workspaceId, userId, intent.entities);
        break;
      case 'remove_project_member':
        responseText = await this.removeProjectMember(workspaceId, userId, intent.entities);
        break;
      case 'update_project_status':
        responseText = await this.updateProjectStatus(workspaceId, userId, intent.entities);
        break;
      case 'duplicate_project':
        responseText = await this.duplicateProject(workspaceId, userId, intent.entities);
        break;

      // ========== TASK INTENTS ==========
      case 'show_tasks':
      case 'show_my_tasks':
        responseText = await this.getMyTasks(workspaceId, userId, assignedContext.projectIds);
        break;
      case 'show_task_details':
        responseText = await this.getTaskDetails(workspaceId, userId, intent.entities.taskName || content, assignedContext.projectIds);
        break;
      case 'show_completed_tasks':
        responseText = await this.getCompletedTasks(workspaceId, userId, assignedContext.projectIds);
        break;
      case 'show_overdue_tasks':
        responseText = await this.getOverdueTasks(workspaceId, userId, assignedContext.projectIds);
        break;
      case 'show_tasks_by_priority':
        responseText = await this.getTasksByPriority(workspaceId, userId, intent.entities.priority, assignedContext.projectIds);
        break;
      case 'show_tasks_by_status':
        responseText = await this.getTasksByStatus(workspaceId, userId, intent.entities.status, assignedContext.projectIds);
        break;
      case 'show_tasks_due_today':
        responseText = await this.getTasksDueToday(workspaceId, userId, assignedContext.projectIds);
        break;
      case 'show_tasks_due_this_week':
        responseText = await this.getTasksDueThisWeek(workspaceId, userId, assignedContext.projectIds);
        break;
      case 'show_subtasks':
        responseText = await this.getSubtasks(workspaceId, userId, intent.entities.taskName, assignedContext.projectIds);
        break;
      case 'create_task':
        responseText = await this.createTask(workspaceId, userId, intent.entities);
        break;
      case 'create_subtask':
        responseText = await this.createSubtask(workspaceId, userId, intent.entities);
        break;
      case 'update_task':
        responseText = await this.updateTask(workspaceId, userId, content, assignedContext.projectIds);
        break;
      case 'update_task_status':
      case 'complete_task':
        responseText = await this.updateTaskStatus(workspaceId, userId, content, assignedContext.projectIds);
        break;
      case 'update_task_assignee':
      case 'assign_task':
        responseText = await this.assignTask(workspaceId, userId, intent.entities);
        break;
      case 'unassign_task':
        responseText = await this.unassignTask(workspaceId, userId, intent.entities);
        break;
      case 'update_task_description':
        responseText = await this.updateTaskDescription(workspaceId, userId, intent.entities);
        break;
      case 'set_task_priority':
        responseText = await this.setTaskPriority(workspaceId, userId, intent.entities);
        break;
      case 'set_task_due_date':
        responseText = await this.setTaskDueDate(workspaceId, userId, intent.entities);
        break;
      case 'delete_task':
        responseText = await this.deleteTask(workspaceId, userId, intent.entities);
        break;
      case 'reopen_task':
        responseText = await this.reopenTask(workspaceId, userId, intent.entities);
        break;
      case 'add_task_comment':
        responseText = await this.addTaskComment(workspaceId, userId, intent.entities);
        break;
      case 'search_tasks':
        responseText = await this.searchTasks(workspaceId, userId, content, assignedContext.projectIds);
        break;

      // ========== EVENT INTENTS ==========
      case 'show_events':
      case 'show_upcoming_events':
        responseText = await this.getUpcomingEvents(workspaceId, userId, assignedContext.eventIds);
        break;
      case 'show_today_events':
        responseText = await this.getTodayEvents(workspaceId, userId, assignedContext.eventIds);
        break;
      case 'show_tomorrow_events':
        responseText = await this.getTomorrowEvents(workspaceId, userId, assignedContext.eventIds);
        break;
      case 'show_week_events':
        responseText = await this.getWeekEvents(workspaceId, userId, assignedContext.eventIds);
        break;
      case 'show_month_events':
        responseText = await this.getMonthEvents(workspaceId, userId, assignedContext.eventIds);
        break;
      case 'show_past_events':
        responseText = await this.getPastEvents(workspaceId, userId, assignedContext.eventIds);
        break;
      case 'show_event_details':
        responseText = await this.getEventDetails(workspaceId, userId, intent.entities.eventName || content, assignedContext.eventIds);
        break;
      case 'show_event_participants':
        responseText = await this.getEventParticipants(workspaceId, userId, intent.entities.eventName || content, assignedContext.eventIds);
        break;
      case 'create_event':
        responseText = await this.createEvent(workspaceId, userId, intent.entities);
        break;
      case 'update_event':
        responseText = await this.updateEventDetails(workspaceId, userId, content, assignedContext.eventIds);
        break;
      case 'update_event_time':
      case 'reschedule_event':
        responseText = await this.rescheduleEvent(workspaceId, userId, intent.entities);
        break;
      case 'update_event_location':
        responseText = await this.updateEventLocation(workspaceId, userId, intent.entities);
        break;
      case 'cancel_event':
      case 'delete_event':
        responseText = await this.cancelEvent(workspaceId, userId, intent.entities);
        break;
      case 'add_event_participant':
        responseText = await this.addEventParticipant(workspaceId, userId, intent.entities);
        break;
      case 'remove_event_participant':
        responseText = await this.removeEventParticipant(workspaceId, userId, intent.entities);
        break;
      case 'search_events':
        responseText = await this.searchEvents(workspaceId, userId, content, assignedContext.eventIds);
        break;
      case 'duplicate_event':
        responseText = await this.duplicateEvent(workspaceId, userId, intent.entities);
        break;

      // ========== MESSAGING & COMMUNICATION ==========
      case 'send_message_to_assignee':
        responseText = await this.sendMessageToAssignee(workspaceId, userId, botId, content, intent.entities);
        break;
      case 'send_message_to_participant':
        responseText = await this.sendMessageToParticipant(workspaceId, userId, botId, content, intent.entities);
        break;
      case 'send_message_to_member':
        responseText = await this.sendMessageToMember(workspaceId, userId, botId, content, intent.entities);
        break;
      case 'send_message_to_user':
        responseText = await this.sendMessageToUser(workspaceId, userId, botId, content, intent.entities);
        break;
      case 'message_project_team':
        responseText = await this.messageProjectTeam(workspaceId, userId, botId, content, intent.entities);
        break;
      case 'message_event_participants':
        responseText = await this.messageEventParticipants(workspaceId, userId, botId, content, intent.entities);
        break;

      // ========== FALLBACK ==========
      case 'unknown':
      default:
        responseText = "I'm not quite sure what you're asking, but I'm here to help! 🤖\n\n" +
          "I can assist you with:\n\n" +
          "**Projects** 📁\n" +
          "• \"Show my projects\"\n" +
          "• \"Create project called X\"\n" +
          "• \"Who's in [project name]?\"\n\n" +
          "**Tasks** ✅\n" +
          "• \"Show my tasks\"\n" +
          "• \"What's due today?\"\n" +
          "• \"Create task called X\"\n" +
          "• \"Mark [task] as complete\"\n\n" +
          "**Events** 📅\n" +
          "• \"What's today?\"\n" +
          "• \"Show this week's events\"\n" +
          "• \"Create meeting tomorrow at 2pm\"\n\n" +
          "**Messaging** 💬\n" +
          "• \"Message the assignee of [task]\"\n" +
          "• \"Send [person] a message\"\n" +
          "• \"Tell the team about [something]\"\n\n" +
          "Type **'help'** to see all my capabilities! 💡";
        break;
    }


    // 4. Send bot response
    this.logger.log(`[CalendarBot] Response text length: ${responseText.length} characters`);
    this.logger.debug(`[CalendarBot] Response preview: ${responseText.substring(0, 100)}...`);
    await this.sendBotMessage(workspaceId, conversationId, botId, responseText);

    // 5. Store bot response in vector memory for future context
    // Extract event titles if this was a show_events response
    const metadata: any = {
      bot_id: botId,
      conversation_id: conversationId,
      confidence: intent.confidence,
      entities: intent.entities,
    };

    if (intent.intent === 'show_events' || intent.intent === 'show_today_events' || intent.intent === 'show_tomorrow_events') {
      // Extract event titles from response (format: "1. **Event Title**")
      const titleMatches = responseText.match(/\d+\.\s+\*\*(.+?)\*\*/g);
      if (titleMatches) {
        const eventTitles = titleMatches.map(match => {
          const titleMatch = match.match(/\*\*(.+?)\*\*/);
          return titleMatch ? titleMatch[1] : '';
        }).filter(Boolean);

        metadata.event_titles = eventTitles;
        this.logger.log(`[CalendarBot] Extracted ${eventTitles.length} event titles for context: ${eventTitles.join(', ')}`);
      }
    }

    if (intent.intent === 'show_tasks' || intent.intent === 'show_project_tasks') {
      // Extract task titles from response (format: "1. **Task Title**")
      const titleMatches = responseText.match(/\d+\.\s+\*\*(.+?)\*\*/g);
      if (titleMatches) {
        const taskTitles = titleMatches.map(match => {
          const titleMatch = match.match(/\*\*(.+?)\*\*/);
          return titleMatch ? titleMatch[1] : '';
        }).filter(Boolean);

        metadata.task_titles = taskTitles;
        this.logger.log(`[CalendarBot] Extracted ${taskTitles.length} task titles for context: ${taskTitles.join(', ')}`);
      }
    }

    if (intent.intent === 'show_bot_projects' || intent.intent === 'show_projects') {
      this.logger.log(`[CalendarBot] Intent is ${intent.intent}, extracting project names from response (length: ${responseText.length})`);

      // Extract project names from response (same approach as events)
      // For show_projects: "1. **Project Name**"
      // For show_bot_projects: "**Project Name**" (first bold text after separator)

      // Try numbered format first (show_projects)
      let projectMatches = responseText.match(/\d+\.\s+\*\*(.+?)\*\*/g);

      if (projectMatches) {
        const projectNames = projectMatches.map(match => {
          const nameMatch = match.match(/\*\*(.+?)\*\*/);
          return nameMatch ? nameMatch[1] : '';
        }).filter(Boolean);

        metadata.project_names = projectNames;
        this.logger.log(`[CalendarBot] Extracted ${projectNames.length} project names for context: ${projectNames.join(', ')}`);
      } else {
        this.logger.log(`[CalendarBot] Numbered format didn't match, trying separator format`);

        // Fallback: show_bot_projects format - extract first **text** after each separator line
        const separatorPattern = /━{10,}\n\*\*(.+?)\*\*/g;
        const matches = [...responseText.matchAll(separatorPattern)];

        this.logger.log(`[CalendarBot] Separator pattern found ${matches.length} matches`);

        if (matches.length > 0) {
          const projectNames = matches.map(match => match[1].trim()).filter(Boolean);
          metadata.project_names = projectNames;
          this.logger.log(`[CalendarBot] Extracted ${projectNames.length} project names (separator format) for context: ${projectNames.join(', ')}`);
        } else {
          this.logger.warn(`[CalendarBot] Could not extract project names from response. First 200 chars: ${responseText.substring(0, 200)}`);
        }
      }
    }

    await this.conversationMemory.storeMessage({
      role: 'assistant',
      content: responseText,
      workspace_id: workspaceId,
      user_id: userId,
      entity_type: 'bot_response',
      action: intent.intent,
      metadata,
    });
  }

  /**
   * Get the events and projects this bot is assigned to
   */
  private async getBotAssignedContext(
    workspaceId: string,
    userId: string,
    botId: string,
  ): Promise<{ eventIds: string[]; projectIds: string[] }> {
    try {
      // Get assigned events
      const eventAssignments = await this.db
        .table('event_bot_assignments')
        .select('event_id')
        .where('workspace_id', '=', workspaceId)
        .where('bot_id', '=', botId)
        .where('user_id', '=', userId)
        .where('is_active', '=', true)
        .execute();

      const eventData = Array.isArray(eventAssignments)
        ? eventAssignments
        : (eventAssignments.data || []);
      const eventIds = eventData.map(a => a.event_id);

      // Get assigned projects
      const projectAssignments = await this.db
        .table('project_bot_assignments')
        .select('project_id')
        .where('workspace_id', '=', workspaceId)
        .where('bot_id', '=', botId)
        .where('user_id', '=', userId)
        .where('is_active', '=', true)
        .execute();

      const projectData = Array.isArray(projectAssignments)
        ? projectAssignments
        : (projectAssignments.data || []);
      const projectIds = projectData.map(a => a.project_id);

      return { eventIds, projectIds };
    } catch (error) {
      this.logger.error(`Error fetching bot assigned context: ${error.message}`);
      return { eventIds: [], projectIds: [] };
    }
  }

  /**
   * Get upcoming events for user (filtered by assigned events if provided)
   */
  private async getUpcomingEvents(
    workspaceId: string,
    userId: string,
    assignedEventIds?: string[]
  ): Promise<string> {
    try {
      const now = new Date();
      const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      this.logger.debug(`[CalendarBot] Searching events for user ${userId} in workspace ${workspaceId}`);
      this.logger.debug(`[CalendarBot] Date range: ${now.toISOString()} to ${oneWeekLater.toISOString()}`);

      // Query for events where user is either user_id OR organizer_id
      // Since query builder doesn't support OR, we make two queries and merge
      const result1 = await this.db
        .table('calendar_events')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('user_id', '=', userId)
        .where('start_time', '>=', now.toISOString())
        .where('start_time', '<=', oneWeekLater.toISOString())
        .orderBy('start_time', 'ASC')
        .execute();

      const result2 = await this.db
        .table('calendar_events')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('organizer_id', '=', userId)
        .where('start_time', '>=', now.toISOString())
        .where('start_time', '<=', oneWeekLater.toISOString())
        .orderBy('start_time', 'ASC')
        .execute();

      const events1 = Array.isArray(result1) ? result1 : (result1.data || []);
      const events2 = Array.isArray(result2) ? result2 : (result2.data || []);

      // Merge and deduplicate by id
      const eventMap = new Map();
      [...events1, ...events2].forEach(event => eventMap.set(event.id, event));
      let events = Array.from(eventMap.values()).sort((a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );

      // Filter by assigned events if bot is assigned to specific events
      if (assignedEventIds && assignedEventIds.length > 0) {
        events = events.filter(event => assignedEventIds.includes(event.id));
        this.logger.debug(`[CalendarBot] Filtered to ${events.length} assigned events`);
      }

      events = events.slice(0, 10);

      this.logger.debug(`[CalendarBot] Found ${events.length} upcoming events`);

      if (events.length === 0) {
        // Also check if user has ANY events to provide better feedback
        const allResult1 = await this.db
          .table('calendar_events')
          .select('*')
          .where('workspace_id', '=', workspaceId)
          .where('user_id', '=', userId)
          .orderBy('start_time', 'DESC')
          .limit(5)
          .execute();

        const allResult2 = await this.db
          .table('calendar_events')
          .select('*')
          .where('workspace_id', '=', workspaceId)
          .where('organizer_id', '=', userId)
          .orderBy('start_time', 'DESC')
          .limit(5)
          .execute();

        const allEvents1 = Array.isArray(allResult1) ? allResult1 : (allResult1.data || []);
        const allEvents2 = Array.isArray(allResult2) ? allResult2 : (allResult2.data || []);

        const allEventMap = new Map();
        [...allEvents1, ...allEvents2].forEach(event => allEventMap.set(event.id, event));
        const allEvents = Array.from(allEventMap.values()).sort((a, b) =>
          new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
        ).slice(0, 5);

        this.logger.debug(`[CalendarBot] User has ${allEvents.length} total events`);

        if (allEvents.length === 0) {
          return "You don't have any calendar events yet. Create your first event to get started!";
        } else {
          // Show their most recent events instead
          let response = "You don't have any upcoming events in the next 7 days, but here are your most recent events:\n\n";
          allEvents.forEach((event: any, index: number) => {
            const startTime = new Date(event.start_time);
            const dateStr = startTime.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            });
            const timeStr = startTime.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            });
            response += `${index + 1}. **${event.title}**\n   📍 ${dateStr} at ${timeStr}\n`;
            if (event.location) {
              response += `   📌 ${event.location}\n`;
            }
            response += '\n';
          });
          return response.trim();
        }
      }

      let response = `📅 Your upcoming events (next 7 days):\n\n`;
      events.forEach((event: any, index: number) => {
        const startTime = new Date(event.start_time);
        const dateStr = startTime.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });
        const timeStr = startTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        });

        response += `${index + 1}. **${event.title}**\n   📍 ${dateStr} at ${timeStr}\n`;
        if (event.location) {
          response += `   📌 ${event.location}\n`;
        }
        response += '\n';
      });

      return response.trim();
    } catch (error) {
      this.logger.error(`Error fetching upcoming events: ${error.message}`);
      return "Sorry, I couldn't fetch your upcoming events. Please try again.";
    }
  }

  /**
   * Get today's events
   */
  private async getTodayEvents(
    workspaceId: string,
    userId: string,
    assignedEventIds?: string[]
  ): Promise<string> {
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
      );

      const result1 = await this.db
        .table('calendar_events')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('user_id', '=', userId)
        .where('start_time', '>=', startOfDay.toISOString())
        .where('start_time', '<=', endOfDay.toISOString())
        .orderBy('start_time', 'ASC')
        .execute();

      const result2 = await this.db
        .table('calendar_events')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('organizer_id', '=', userId)
        .where('start_time', '>=', startOfDay.toISOString())
        .where('start_time', '<=', endOfDay.toISOString())
        .orderBy('start_time', 'ASC')
        .execute();

      const events1 = Array.isArray(result1) ? result1 : (result1.data || []);
      const events2 = Array.isArray(result2) ? result2 : (result2.data || []);

      const eventMap = new Map();
      [...events1, ...events2].forEach(event => eventMap.set(event.id, event));
      let events = Array.from(eventMap.values()).sort((a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );

      // Filter by assigned events if bot is assigned to specific events
      if (assignedEventIds && assignedEventIds.length > 0) {
        events = events.filter(event => assignedEventIds.includes(event.id));
      }

      if (events.length === 0) {
        return assignedEventIds && assignedEventIds.length > 0
          ? "I don't have any events assigned to me for today."
          : "You don't have any events scheduled for today. 🎉";
      }

      let response = `📅 Today's Schedule (${startOfDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}):\n\n`;

      events.forEach((event: any, index: number) => {
        const startTime = new Date(event.start_time);
        const timeStr = startTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        });

        response += `${index + 1}. **${event.title}**\n   🕐 ${timeStr}\n`;
        if (event.location) {
          response += `   📌 ${event.location}\n`;
        }
        response += '\n';
      });

      return response.trim();
    } catch (error) {
      this.logger.error(`Error fetching today's events: ${error.message}`);
      return "Sorry, I couldn't fetch today's events. Please try again.";
    }
  }

  /**
   * Get tomorrow's events
   */
  private async getTomorrowEvents(
    workspaceId: string,
    userId: string,
    assignedEventIds?: string[]
  ): Promise<string> {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const startOfDay = new Date(
        tomorrow.getFullYear(),
        tomorrow.getMonth(),
        tomorrow.getDate(),
      );
      const endOfDay = new Date(
        tomorrow.getFullYear(),
        tomorrow.getMonth(),
        tomorrow.getDate(),
        23,
        59,
        59,
      );

      const result1 = await this.db
        .table('calendar_events')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('user_id', '=', userId)
        .where('start_time', '>=', startOfDay.toISOString())
        .where('start_time', '<=', endOfDay.toISOString())
        .orderBy('start_time', 'ASC')
        .execute();

      const result2 = await this.db
        .table('calendar_events')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('organizer_id', '=', userId)
        .where('start_time', '>=', startOfDay.toISOString())
        .where('start_time', '<=', endOfDay.toISOString())
        .orderBy('start_time', 'ASC')
        .execute();

      const events1 = Array.isArray(result1) ? result1 : (result1.data || []);
      const events2 = Array.isArray(result2) ? result2 : (result2.data || []);

      const eventMap = new Map();
      [...events1, ...events2].forEach(event => eventMap.set(event.id, event));
      let events = Array.from(eventMap.values()).sort((a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );

      // Filter by assigned events if bot is assigned to specific events
      if (assignedEventIds && assignedEventIds.length > 0) {
        events = events.filter(event => assignedEventIds.includes(event.id));
      }

      if (events.length === 0) {
        return assignedEventIds && assignedEventIds.length > 0
          ? "I don't have any events assigned to me for tomorrow."
          : "You don't have any events scheduled for tomorrow.";
      }

      let response = `📅 Tomorrow's Schedule (${startOfDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}):\n\n`;

      events.forEach((event: any, index: number) => {
        const startTime = new Date(event.start_time);
        const timeStr = startTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        });

        response += `${index + 1}. **${event.title}**\n   🕐 ${timeStr}\n`;
        if (event.location) {
          response += `   📌 ${event.location}\n`;
        }
        response += '\n';
      });

      return response.trim();
    } catch (error) {
      this.logger.error(`Error fetching tomorrow's events: ${error.message}`);
      return "Sorry, I couldn't fetch tomorrow's events. Please try again.";
    }
  }

  /**
   * Get all assignments (events and projects) for this bot
   * Uses vector DB context for rich assignment details
   */
  private async getMyAssignments(
    workspaceId: string,
    userId: string,
    botId: string,
    assignmentContext: any[] = [],
  ): Promise<string> {
    try {
      // Get assigned events
      const eventAssignments = await this.eventBotAssignmentsService.getAssignmentsByBot(
        workspaceId,
        botId,
      );

      // Get assigned projects
      const projectAssignments = await this.db
        .table('project_bot_assignments')
        .select('project_id')
        .where('workspace_id', '=', workspaceId)
        .where('bot_id', '=', botId)
        .where('user_id', '=', userId)
        .where('is_active', '=', true)
        .execute();

      const projectData = Array.isArray(projectAssignments)
        ? projectAssignments
        : (projectAssignments.data || []);
      const projectIds = projectData.map(a => a.project_id);

      // Check if bot has any assignments
      if (eventAssignments.length === 0 && projectIds.length === 0) {
        return "I'm not assigned to any events or projects yet. You can assign me from:\n\n📅 Calendar events - to manage reminders and updates\n📋 Projects - to help with tasks and project management";
      }

      let response = `🤖 **My Assignments:**\n\n`;

      // Use vector DB context for rich details if available
      const eventContextMap = new Map();
      const projectContextMap = new Map();

      assignmentContext.forEach(ctx => {
        if (ctx.action === 'event_assigned' && ctx.metadata?.event_id) {
          eventContextMap.set(ctx.metadata.event_id, {
            title: ctx.metadata.event_title,
            start: ctx.metadata.event_start,
            location: ctx.metadata.event_location,
          });
        }
        if (ctx.action === 'project_assigned' && ctx.metadata?.project_id) {
          projectContextMap.set(ctx.metadata.project_id, {
            name: ctx.metadata.project_name,
            description: ctx.metadata.project_description,
          });
        }
      });

      // Show assigned projects
      if (projectIds.length > 0) {
        response += `📋 **Projects (${projectIds.length}):**\n`;

        const projectsResult = await this.db
          .table('projects')
          .select('*')
          .where('workspace_id', '=', workspaceId)
          .execute();

        const allProjects = Array.isArray(projectsResult) ? projectsResult : (projectsResult.data || []);
        const assignedProjects = allProjects.filter(p => projectIds.includes(p.id));

        for (const project of assignedProjects) {
          response += `\n• **${project.name}**\n`;
          if (project.description) {
            const desc = project.description.substring(0, 60);
            response += `  ${desc}${project.description.length > 60 ? '...' : ''}\n`;
          }

          // Get task count for this project
          const tasksResult = await this.db
            .table('tasks')
            .select('*')
            .where('project_id', '=', project.id)
            .execute();

          const tasks = Array.isArray(tasksResult) ? tasksResult : (tasksResult.data || []);
          const pending = tasks.filter(t => t.status !== 'done' && t.status !== 'completed').length;
          const total = tasks.length;

          response += `  📊 Tasks: ${pending} pending / ${total} total\n`;
          response += `  💡 I can help you: view tasks, update status, check members\n`;
        }
        response += '\n';
      }

      // Show assigned events (use vector DB context when available for faster responses)
      if (eventAssignments.length > 0) {
        response += `📅 **Calendar Events (${eventAssignments.length}):**\n`;

        for (const assignment of eventAssignments) {
          const eventId = assignment.event_id;
          const vectorContext = eventContextMap.get(eventId);

          if (vectorContext) {
            // Use rich context from vector DB (faster, includes description)
            const startTime = new Date(vectorContext.start);
            const dateStr = startTime.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            });
            const timeStr = startTime.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            });

            response += `\n• **${vectorContext.title}**\n`;
            response += `  📍 ${dateStr} at ${timeStr}\n`;
            if (vectorContext.location) {
              response += `  📌 ${vectorContext.location}\n`;
            }
            response += `  🎯 I have full context about this event and can answer questions without you specifying the name!\n`;
          } else {
            // Fallback to database query if not in vector DB
            const event = await this.db.findOne('calendar_events', { id: eventId });
            if (event) {
              const startTime = new Date(event.start_time);
              const dateStr = startTime.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              });
              const timeStr = startTime.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              });

              response += `\n• **${event.title}**\n`;
              response += `  📍 ${dateStr} at ${timeStr}\n`;
              if (event.location) {
                response += `  📌 ${event.location}\n`;
              }
              response += `  🔔 I'll send you reminders for this event\n`;
            }
          }
        }
      }

      return response.trim();
    } catch (error) {
      this.logger.error(`Error fetching bot assignments: ${error.message}`);
      return "Sorry, I couldn't fetch my assignments. Please try again.";
    }
  }

  /**
   * Get ONLY projects the bot is assigned to
   */
  private async getBotProjects(
    workspaceId: string,
    userId: string,
    botId: string,
    assignmentContext: any[] = [],
  ): Promise<string> {
    try {
      // Get assigned projects
      const projectAssignments = await this.db
        .table('project_bot_assignments')
        .select('project_id')
        .where('workspace_id', '=', workspaceId)
        .where('bot_id', '=', botId)
        .where('user_id', '=', userId)
        .where('is_active', '=', true)
        .execute();

      const projectData = Array.isArray(projectAssignments)
        ? projectAssignments
        : (projectAssignments.data || []);
      const projectIds = projectData.map(a => a.project_id);

      // Check if bot has any project assignments
      if (projectIds.length === 0) {
        return "I'm not assigned to any projects yet. You can assign me to projects to help with task management and project updates! 📋";
      }

      let response = `📋 **My Assigned Projects (${projectIds.length}):**\n\n`;

      // Get project details
      const projectsResult = await this.db
        .table('projects')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .execute();

      const allProjects = Array.isArray(projectsResult) ? projectsResult : (projectsResult.data || []);
      const assignedProjects = allProjects.filter(p => projectIds.includes(p.id));

      for (const project of assignedProjects) {
        response += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        response += `**${project.name}**\n\n`;

        if (project.description) {
          response += `📝 ${project.description}\n\n`;
        }

        // Get tasks for this project
        const tasksResult = await this.db
          .table('tasks')
          .select('*')
          .where('project_id', '=', project.id)
          .execute();

        const tasks = Array.isArray(tasksResult) ? tasksResult : (tasksResult.data || []);
        const total = tasks.length;
        const completed = tasks.filter(t => t.status === 'done' || t.status === 'completed').length;
        const pending = total - completed;

        // Calculate progress percentage
        const progressPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        // Progress bar visualization
        const progressBarLength = 20;
        const filledBlocks = Math.round((progressPercentage / 100) * progressBarLength);
        const emptyBlocks = progressBarLength - filledBlocks;
        const progressBar = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);

        response += `📊 **Progress:** ${progressPercentage}%\n`;
        response += `${progressBar}\n\n`;
        response += `✅ Completed: ${completed} | ⏳ Pending: ${pending} | 📋 Total: ${total}\n\n`;

        // Get project lead/owner
        const projectLead = project.created_by || project.owner_id || project.user_id;
        if (projectLead) {
          // Try to get user info from auth service
          try {
            const leadUser = await this.db.getUserById(projectLead);
            if (leadUser) {
              response += `👤 **Project Lead:** ${leadUser.name || leadUser.email || 'Unknown'}\n\n`;
            }
          } catch (error) {
            this.logger.warn(`Could not fetch project lead info: ${error.message}`);
          }
        }

        // Get all unique assignees from tasks
        const assigneeSet = new Set<string>();
        tasks.forEach(task => {
          if (task.assignees) {
            const assignees = typeof task.assignees === 'string'
              ? JSON.parse(task.assignees)
              : task.assignees;

            if (Array.isArray(assignees)) {
              assignees.forEach((assignee: any) => {
                const assigneeId = typeof assignee === 'object' ? assignee.id : assignee;
                if (assigneeId) assigneeSet.add(assigneeId);
              });
            }
          }
        });

        // Fetch assignee details
        if (assigneeSet.size > 0) {
          response += `👥 **Team Members (${assigneeSet.size}):**\n`;
          const assigneeIds = Array.from(assigneeSet);

          // Fetch user details for each assignee
          const assigneeNames: string[] = [];
          for (const assigneeId of assigneeIds.slice(0, 10)) { // Limit to first 10
            try {
              const user = await this.db.getUserById(assigneeId);
              if (user) {
                assigneeNames.push(user.name || user.email || 'Unknown');
              }
            } catch (error) {
              this.logger.warn(`Could not fetch assignee info: ${error.message}`);
            }
          }

          if (assigneeNames.length > 0) {
            assigneeNames.forEach(name => {
              response += `   • ${name}\n`;
            });
            if (assigneeSet.size > 10) {
              response += `   ... and ${assigneeSet.size - 10} more\n`;
            }
          } else {
            response += `   No team members assigned yet\n`;
          }
          response += '\n';
        }

        // Dates
        if (project.start_date) {
          const startDate = new Date(project.start_date);
          response += `📅 **Start Date:** ${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}\n`;
        }
        if (project.end_date) {
          const endDate = new Date(project.end_date);
          response += `🏁 **Due Date:** ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}\n`;
        }

        response += `\n💡 **I can help you with:**\n`;
        response += `   • View all tasks\n`;
        response += `   • Update task status\n`;
        response += `   • Check team members\n`;
        response += `   • Track project progress\n\n`;
      }

      return response.trim();
    } catch (error) {
      this.logger.error(`Error fetching bot projects: ${error.message}`);
      return "Sorry, I couldn't fetch my assigned projects. Please try again.";
    }
  }

  /**
   * Get ONLY events the bot is assigned to
   */
  private async getBotEvents(
    workspaceId: string,
    userId: string,
    botId: string,
    assignmentContext: any[] = [],
  ): Promise<string> {
    try {
      // Get assigned events
      const eventAssignments = await this.eventBotAssignmentsService.getAssignmentsByBot(
        workspaceId,
        botId,
      );

      // Check if bot has any event assignments
      if (eventAssignments.length === 0) {
        return "I'm not assigned to any calendar events yet. You can assign me to events to help with reminders and updates! 📅";
      }

      let response = `📅 **My Assigned Events (${eventAssignments.length}):**\n\n`;

      // Use vector DB context when available
      const eventContextMap = new Map();
      assignmentContext.forEach(ctx => {
        if (ctx.action === 'event_assigned' && ctx.metadata?.event_id) {
          eventContextMap.set(ctx.metadata.event_id, {
            title: ctx.metadata.event_title,
            start: ctx.metadata.event_start,
            location: ctx.metadata.event_location,
          });
        }
      });

      for (const assignment of eventAssignments) {
        const eventId = assignment.event_id;
        const vectorContext = eventContextMap.get(eventId);

        if (vectorContext) {
          // Use rich context from vector DB (faster)
          const startTime = new Date(vectorContext.start);
          const dateStr = startTime.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          });
          const timeStr = startTime.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          });

          response += `• **${vectorContext.title}**\n`;
          response += `  📍 ${dateStr} at ${timeStr}\n`;
          if (vectorContext.location) {
            response += `  📌 ${vectorContext.location}\n`;
          }
          response += `  🎯 I can answer questions about this event without you specifying the name!\n\n`;
        } else {
          // Fallback to database query
          const event = await this.db.findOne('calendar_events', { id: eventId });
          if (event) {
            const startTime = new Date(event.start_time);
            const dateStr = startTime.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            });
            const timeStr = startTime.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            });

            response += `• **${event.title}**\n`;
            response += `  📍 ${dateStr} at ${timeStr}\n`;
            if (event.location) {
              response += `  📌 ${event.location}\n`;
            }
            response += `  🔔 I'll send you reminders for this event\n\n`;
          }
        }
      }

      return response.trim();
    } catch (error) {
      this.logger.error(`Error fetching bot events: ${error.message}`);
      return "Sorry, I couldn't fetch my assigned events. Please try again.";
    }
  }

  /**
   * Get event participants/attendees
   */
  private async getEventParticipants(
    workspaceId: string,
    userId: string,
    content: string,
    assignedEventIds?: string[]
  ): Promise<string> {
    try {
      // Try to extract event title from the message
      // Patterns: "show participants for [event]", "who is attending [event]", "attendees for [event]"
      let eventTitle = '';

      const patterns = [
        /(?:participants|attendees)\s+(?:for|of)\s+(.+)/i,
        /who(?:'s| is)\s+attending\s+(.+)/i,
        /show\s+(?:participants|attendees)\s+(.+)/i,
      ];

      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match) {
          eventTitle = match[1].trim();
          break;
        }
      }

      if (!eventTitle) {
        // Smart fallback: If bot is assigned to only ONE event, show that automatically
        if (assignedEventIds && assignedEventIds.length === 1) {
          const singleEventId = assignedEventIds[0];
          const singleEvent = await this.db.findOne('calendar_events', { id: singleEventId });

          if (singleEvent) {
            this.logger.log(`[CalendarBot] Auto-showing participants for bot's only assigned event: ${singleEvent.title}`);
            const attendees = singleEvent.attendees || [];

            const startTime = new Date(singleEvent.start_time);
            const dateStr = startTime.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            });
            const timeStr = startTime.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            });

            let response = `👥 **Participants for "${singleEvent.title}"**\n\n`;
            response += `📅 ${dateStr} at ${timeStr}\n`;
            if (singleEvent.location) {
              response += `📍 ${singleEvent.location}\n`;
            }
            response += `\n`;

            if (attendees.length === 0) {
              response += `No participants have been added to this event yet.`;
            } else {
              response += `**Attendees (${attendees.length}):**\n`;
              attendees.forEach((attendee: string, index: number) => {
                response += `${index + 1}. ${attendee}\n`;
              });
            }

            return response.trim();
          }
        }

        // If bot has multiple assignments or none, ask for clarification
        return `To view event participants, please specify the event name. For example:\n• "Show participants for Team Meeting"\n• "Who is attending Project Review?"\n• "Attendees for Daily Standup"`;
      }

      // Search for the event by title
      const searchResult1 = await this.db
        .table('calendar_events')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('user_id', '=', userId)
        .orderBy('start_time', 'ASC')
        .limit(10)
        .execute();

      const searchResult2 = await this.db
        .table('calendar_events')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('organizer_id', '=', userId)
        .orderBy('start_time', 'ASC')
        .limit(10)
        .execute();

      const searchEvents1 = Array.isArray(searchResult1) ? searchResult1 : (searchResult1.data || []);
      const searchEvents2 = Array.isArray(searchResult2) ? searchResult2 : (searchResult2.data || []);

      // Merge, deduplicate, and filter by title
      const searchMap = new Map();
      [...searchEvents1, ...searchEvents2].forEach(event => searchMap.set(event.id, event));
      let events = Array.from(searchMap.values());

      // Filter by assigned events if bot is assigned to specific events
      if (assignedEventIds && assignedEventIds.length > 0) {
        events = events.filter(event => assignedEventIds.includes(event.id));
      }

      events = events
        .filter(event => event.title.toLowerCase().includes(eventTitle.toLowerCase()))
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
        .slice(0, 5);

      if (events.length === 0) {
        return `I couldn't find any event matching "${eventTitle}". Try listing your events first with "show my events".`;
      }

      // If multiple events found, show them
      if (events.length > 1) {
        let response = `I found ${events.length} events matching "${eventTitle}":\n\n`;
        events.forEach((event: any, index: number) => {
          const startTime = new Date(event.start_time);
          const dateStr = startTime.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          });
          response += `${index + 1}. **${event.title}** - ${dateStr}\n`;
        });
        response += `\nPlease be more specific about which event you mean.`;
        return response;
      }

      // Show participants for the found event
      const event = events[0];
      const startTime = new Date(event.start_time);
      const dateStr = startTime.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
      const timeStr = startTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });

      let response = `👥 **Participants for "${event.title}"**\n\n`;
      response += `📅 ${dateStr} at ${timeStr}\n`;
      if (event.location) {
        response += `📍 ${event.location}\n`;
      }
      response += `\n`;

      const attendees = event.attendees || [];
      if (attendees.length === 0) {
        response += `No participants have been added to this event yet.`;
      } else {
        response += `**Attendees (${attendees.length}):**\n`;
        attendees.forEach((attendee: string, index: number) => {
          response += `${index + 1}. ${attendee}\n`;
        });
      }

      return response.trim();
    } catch (error) {
      this.logger.error(`Error fetching event participants: ${error.message}`);
      return "Sorry, I couldn't fetch the event participants. Please try again.";
    }
  }

  /**
   * Update event details - Smart context-aware parsing using OpenAI
   */
  private async updateEventDetails(
    workspaceId: string,
    userId: string,
    content: string,
    assignedEventIds?: string[]
  ): Promise<string> {
    try {
      // 1. Get recent conversation context to find events user just viewed
      // Use chronological order (not semantic search) to get the most recent messages
      const recentHistory = await this.conversationMemory.getRecentHistory(
        workspaceId,
        userId,
        10, // Get last 10 messages
      );

      this.logger.debug(`[UpdateEvent] Recent history (${recentHistory.length} messages):`);
      recentHistory.forEach((msg, idx) => {
        this.logger.debug(`  ${idx + 1}. action=${msg.action}, has_event_titles=${!!msg.metadata?.event_titles}`);
      });

      // Extract events from recent "show_events" responses
      const recentEvents: Array<{ title: string; id?: string }> = [];
      for (const msg of recentHistory) {
        // Check for all event-showing actions
        const isEventAction = msg.action === 'show_events' ||
                             msg.action === 'show_today_events' ||
                             msg.action === 'show_tomorrow_events';

        if (isEventAction && msg.metadata?.event_titles) {
          const titles = msg.metadata.event_titles;
          if (Array.isArray(titles)) {
            titles.forEach((title: string) => recentEvents.push({ title }));
          }
        }
      }

      this.logger.log(`[UpdateEvent] Found ${recentEvents.length} events in recent context`);
      if (recentEvents.length > 0) {
        this.logger.log(`[UpdateEvent] Recent events: ${recentEvents.map(e => e.title).join(', ')}`);
      }

      // 2. Use OpenAI to parse the update command naturally
      const parseResult = await this.parseUpdateCommand(content, recentEvents);

      if (!parseResult.success) {
        return parseResult.errorMessage || `To update an event, try:\n• "Change time to jan 15, 3pm"\n• "Update location to Conference Room A"\n• "Change title to New Meeting"\n\nI'll use context from our conversation to figure out which event you mean! 💡`;
      }

      let eventTitle = parseResult.eventTitle || '';
      const field = parseResult.field || '';
      const newValue = parseResult.value || '';

      // Search for the event
      const updateResult1 = await this.db
        .table('calendar_events')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('user_id', '=', userId)
        .orderBy('start_time', 'ASC')
        .limit(10)
        .execute();

      const updateResult2 = await this.db
        .table('calendar_events')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('organizer_id', '=', userId)
        .orderBy('start_time', 'ASC')
        .limit(10)
        .execute();

      const updateEvents1 = Array.isArray(updateResult1) ? updateResult1 : (updateResult1.data || []);
      const updateEvents2 = Array.isArray(updateResult2) ? updateResult2 : (updateResult2.data || []);

      // Merge, deduplicate, and filter by title
      const updateMap = new Map();
      [...updateEvents1, ...updateEvents2].forEach(event => updateMap.set(event.id, event));
      let events = Array.from(updateMap.values());

      // Filter by assigned events if bot is assigned to specific events
      if (assignedEventIds && assignedEventIds.length > 0) {
        events = events.filter(event => assignedEventIds.includes(event.id));
      }

      events = events
        .filter(event => event.title.toLowerCase().includes(eventTitle.toLowerCase()))
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
        .slice(0, 5);

      if (events.length === 0) {
        return `I couldn't find any event matching "${eventTitle}". Try listing your events first with "show my events".`;
      }

      if (events.length > 1) {
        let response = `I found ${events.length} events matching "${eventTitle}":\n\n`;
        events.forEach((event: any, index: number) => {
          const startTime = new Date(event.start_time);
          const dateStr = startTime.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          });
          response += `${index + 1}. **${event.title}** - ${dateStr}\n`;
        });
        response += `\nPlease be more specific about which event you mean.`;
        return response;
      }

      const event = events[0];
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      // Map field names to database columns
      switch (field) {
        case 'title':
        case 'name':
          updateData.title = newValue;
          break;
        case 'location':
          updateData.location = newValue;
          break;
        case 'time':
          // Use chrono-node for natural language date parsing
          // Supports: "jan 15, 3pm", "January 15, 2026 at 3:00 PM", "tomorrow at 3pm", etc.
          try {
            const parsedDate = chrono.parseDate(newValue);

            if (parsedDate && !isNaN(parsedDate.getTime())) {
              updateData.start_time = parsedDate.toISOString();

              // Preserve event duration if possible
              if (event.end_time && event.start_time) {
                const duration = new Date(event.end_time).getTime() - new Date(event.start_time).getTime();
                updateData.end_time = new Date(parsedDate.getTime() + duration).toISOString();
              }

              this.logger.log(`[UpdateEvent] Parsed "${newValue}" to ${parsedDate.toISOString()}`);
            } else {
              return `I couldn't understand the time format "${newValue}". Please try formats like:\n• "January 15, 3pm"\n• "jan 15 at 3:00 PM"\n• "tomorrow at 3pm"\n• "next week 2pm"`;
            }
          } catch (error) {
            this.logger.error(`[UpdateEvent] Failed to parse time: ${error.message}`);
            return `I couldn't parse the time "${newValue}". Please try a different format like "jan 15, 3pm" or "tomorrow at 3pm".`;
          }
          break;
        case 'description':
        case 'notes':
          updateData.description = newValue;
          break;
        default:
          return `I can only update: title, location, time, or description. You tried to update: ${field}`;
      }

      // Update the event
      await this.db
        .table('calendar_events')
        .where('id', '=', event.id)
        .update(updateData)
        .execute();

      let response = `✅ **Event Updated Successfully!**\n\n`;
      response += `**${event.title}**\n`;
      response += `Updated ${field} to: **${newValue}**\n\n`;
      response += `Your event has been updated. You can view it with "show my events".`;

      return response;
    } catch (error) {
      this.logger.error(`Error updating event: ${error.message}`);
      return "Sorry, I couldn't update the event. Please try again or check the format of your request.";
    }
  }

  /**
   * Parse update command using OpenAI for natural language understanding
   * Supports context-aware parsing like "change time to jan 15" without event name
   */
  private async parseUpdateCommand(
    userMessage: string,
    recentEvents: Array<{ title: string; id?: string }>,
  ): Promise<{
    success: boolean;
    eventTitle?: string;
    field?: string;
    value?: string;
    errorMessage?: string;
  }> {
    try {
      const recentEventsList = recentEvents.length > 0
        ? recentEvents.map(e => `"${e.title}"`).join(', ')
        : 'None';

      const prompt = `You are helping parse an event update command. The user recently viewed these events: ${recentEventsList}

User message: "${userMessage}"

Extract:
1. event_name: Which event to update (if not specified but only ONE event in recent context, use that event name)
2. field: What to update (title, location, time, description)
3. value: New value

Rules:
- If user says "change time to X" and there's ONLY ONE event in recent context, use that event name
- If multiple events in context and no event specified, return error
- Field must be one of: title, location, time, description
- Be flexible with field names (e.g., "name" = title, "notes" = description)

Return JSON ONLY:
{
  "success": true/false,
  "event_name": "event title",
  "field": "time/location/title/description",
  "value": "new value",
  "error": "error message if failed"
}`;

      const response = await this.intentClassifier['openai'].invoke(prompt);
      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.error('[ParseUpdate] No JSON in response');
        return { success: false, errorMessage: 'Could not parse your update command.' };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.success) {
        return {
          success: false,
          errorMessage: parsed.error || 'Could not understand the update command.',
        };
      }

      return {
        success: true,
        eventTitle: parsed.event_name,
        field: parsed.field?.toLowerCase(),
        value: parsed.value,
      };
    } catch (error) {
      this.logger.error(`[ParseUpdate] Error: ${error.message}`);
      return {
        success: false,
        errorMessage: 'Failed to parse update command. Try being more specific.',
      };
    }
  }

  /**
   * Parse task status command using OpenAI for natural language understanding
   * Supports context-aware parsing like "mark as done" without task name
   */
  private async parseTaskStatusCommand(
    userMessage: string,
    recentTasks: Array<{ title: string; id?: string }>,
  ): Promise<{
    success: boolean;
    taskTitle?: string;
    status?: string;
    errorMessage?: string;
  }> {
    try {
      const recentTasksList = recentTasks.length > 0
        ? recentTasks.map(t => `"${t.title}"`).join(', ')
        : 'None';

      const prompt = `You are helping parse a task status update command. The user recently viewed these tasks: ${recentTasksList}

User message: "${userMessage}"

Extract:
1. task_name: Which task to update (if not specified but only ONE task in recent context, use that task name)
2. status: New status (done, in progress, pending, complete, completed, etc.)

Rules:
- If user says "mark as done" and there's ONLY ONE task in recent context, use that task name
- If multiple tasks in context and no task specified, return error
- Status values: done, in progress, pending, todo (normalize variations like "complete" → "done")
- Be flexible: "complete task" = done, "mark done" = done, "in progress" = in progress

Return JSON ONLY:
{
  "success": true/false,
  "task_name": "task title",
  "status": "done/in progress/pending/todo",
  "error": "error message if failed"
}`;

      const response = await this.intentClassifier['openai'].invoke(prompt);
      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.error('[ParseTaskStatus] No JSON in response');
        return { success: false, errorMessage: 'Could not parse your status update command.' };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.success) {
        return {
          success: false,
          errorMessage: parsed.error || 'Could not understand the status update command.',
        };
      }

      return {
        success: true,
        taskTitle: parsed.task_name,
        status: parsed.status?.toLowerCase(),
      };
    } catch (error) {
      this.logger.error(`[ParseTaskStatus] Error: ${error.message}`);
      return {
        success: false,
        errorMessage: 'Failed to parse status update command. Try being more specific.',
      };
    }
  }

  /**
   * Parse task update command using OpenAI for natural language understanding
   * Supports context-aware parsing like "change priority to high" without task name
   */
  private async parseTaskUpdateCommand(
    userMessage: string,
    recentTasks: Array<{ title: string; id?: string }>,
  ): Promise<{
    success: boolean;
    taskTitle?: string;
    field?: string;
    value?: string;
    errorMessage?: string;
  }> {
    try {
      const recentTasksList = recentTasks.length > 0
        ? recentTasks.map(t => `"${t.title}"`).join(', ')
        : 'None';

      const prompt = `You are helping parse a task update command. The user recently viewed these tasks: ${recentTasksList}

User message: "${userMessage}"

Extract:
1. task_name: Which task to update (if not specified but only ONE task in recent context, use that task name)
2. field: What to update (title, priority, due_date, description)
3. value: New value

Rules:
- If user says "change priority to high" and there's ONLY ONE task in recent context, use that task name
- If multiple tasks in context and no task specified, return error
- Field must be one of: title, priority, due_date, description
- Be flexible with field names (e.g., "due date" = due_date, "name" = title)

Return JSON ONLY:
{
  "success": true/false,
  "task_name": "task title",
  "field": "title/priority/due_date/description",
  "value": "new value",
  "error": "error message if failed"
}`;

      const response = await this.intentClassifier['openai'].invoke(prompt);
      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.error('[ParseTaskUpdate] No JSON in response');
        return { success: false, errorMessage: 'Could not parse your update command.' };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.success) {
        return {
          success: false,
          errorMessage: parsed.error || 'Could not understand the update command.',
        };
      }

      return {
        success: true,
        taskTitle: parsed.task_name,
        field: parsed.field?.toLowerCase().replace(' ', '_'),
        value: parsed.value,
      };
    } catch (error) {
      this.logger.error(`[ParseTaskUpdate] Error: ${error.message}`);
      return {
        success: false,
        errorMessage: 'Failed to parse update command. Try being more specific.',
      };
    }
  }

  /**
   * Parse project tasks command with context awareness
   * Understands: "show tasks in this project", "tasks of Mobile App Design", "show 5 tasks"
   */
  private async parseProjectTasksCommand(
    userMessage: string,
    recentProjects: Array<{ name: string }>,
  ): Promise<{
    success: boolean;
    projectName?: string;
    limit?: number;
    errorMessage?: string;
  }> {
    try {
      const recentProjectsList = recentProjects.length > 0
        ? recentProjects.map(p => `"${p.name}"`).join(', ')
        : 'None';

      const prompt = `You are helping parse a request to view project tasks. The user recently viewed these projects: ${recentProjectsList}

User message: "${userMessage}"

Extract:
1. project_name: Which project's tasks to show (if not specified but only ONE project in recent context, use that project name)
2. limit: How many tasks to show (look for numbers like "first 5", "show 10", etc.)

Rules:
- If user says "tasks in this project" or "show tasks" and there's ONLY ONE project in recent context, use that project name
- If user says "tasks in [project name]", extract the project name
- If multiple projects in context and no project specified, return error
- For limit: extract number if specified, otherwise omit the field entirely (do NOT use null or undefined)

Return JSON ONLY (omit fields that are not present):
{
  "success": true,
  "project_name": "project name",
  "limit": 5
}

OR if error:
{
  "success": false,
  "error": "error message"
}`;

      const response = await this.intentClassifier['openai'].invoke(prompt);
      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        return {
          success: false,
          errorMessage: 'Failed to parse the project tasks request.',
        };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.success || parsed.error) {
        return {
          success: false,
          errorMessage: parsed.error || 'Could not understand which project you mean.',
        };
      }

      return {
        success: true,
        projectName: parsed.project_name,
        limit: parsed.limit,
      };
    } catch (error) {
      this.logger.error(`[ParseProjectTasks] Error: ${error.message}`);
      return {
        success: false,
        errorMessage: 'Failed to parse project tasks command. Try being more specific.',
      };
    }
  }

  /**
   * Get greeting response (personalized based on user preferences)
   */
  private getGreetingResponse(preferences: string[] = []): string {
    const greetings = [
      "Hello! 👋 I'm your Productivity Assistant. How can I help you today?",
      "Hi there! 😊 I'm here to help manage your events and projects. What do you need?",
      "Hey! 🤖 Ready to help with your calendar and tasks. What can I do for you?",
      "Hello! ✨ I'm your assistant for events and projects. Ask me anything!",
    ];

    let greeting = greetings[Math.floor(Math.random() * greetings.length)];

    // Personalize suggestions based on user preferences
    let suggestions = "\n\nTry asking:\n";

    if (preferences.includes('event_focused')) {
      suggestions += "• \"Show my events\" (your favorite!)\n• \"What's today?\"\n• \"Tomorrow's schedule\"";
    } else if (preferences.includes('project_focused')) {
      suggestions += "• \"My tasks\" (you ask this often!)\n• \"Show my projects\"\n• \"Tasks in [project name]\"";
    } else if (preferences.includes('prefers_time_specific_queries')) {
      suggestions += "• \"What's today?\" (as usual!)\n• \"Tomorrow's events\"\n• \"Show my schedule\"";
    } else {
      // Default suggestions
      suggestions += "• \"Show my events\"\n• \"What's today?\"\n• \"My tasks\"";
    }

    suggestions += "\n• Type 'help' for all commands";

    return greeting + suggestions;
  }

  /**
   * Get general chat response
   */
  private getGeneralChatResponse(message: string): string {
    const lowerMessage = message.toLowerCase();

    // Handle common questions
    if (lowerMessage.includes('how are you') || lowerMessage.includes('how do you do')) {
      return "I'm doing great! Thanks for asking. 😊 I'm here to help you stay organized. What would you like to know about your schedule or projects?";
    }

    if (lowerMessage.includes('your name') || lowerMessage.includes('who are you')) {
      return "I'm your Productivity Assistant! 🤖 I help you manage calendar events and projects. I can show you your schedule, tasks, and help you stay organized. What would you like to do?";
    }

    if (lowerMessage.includes('what can you do') || lowerMessage.includes('capabilities')) {
      return this.getHelpMessage();
    }

    if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
      return "You're welcome! 😊 Let me know if you need anything else!";
    }

    // Default response for general chat
    return "I appreciate the chat! 😊 While I'm best at helping with productivity tasks, feel free to ask me about:\n\n• Your calendar events\n• Your projects and tasks\n• Updating schedules\n\nWhat would you like to do?";
  }

  /**
   * Clear bot's conversation memory
   */
  private async clearBotMemory(workspaceId: string, userId: string, botId: string): Promise<string> {
    try {
      this.logger.log(`[BotHandler] Clearing conversation memory for user ${userId} in workspace ${workspaceId}`);

      // Delete all conversation history for this user in this workspace
      const success = await this.conversationMemory.deleteUserHistory(workspaceId, userId);

      if (success) {
        return "✅ **Memory Cleared!**\n\nI've cleared my conversation history with you. I've forgotten all previous context about projects, tasks, and events we discussed.\n\n💡 **What this means:**\n• I won't reference old/deleted projects anymore\n• You can start fresh with new assignments\n• I'll need context for new questions\n\n🔄 **Ready for a fresh start!** What would you like to work on?";
      } else {
        return "I tried to clear my memory, but something went wrong. Please try again or contact support if the issue persists.";
      }
    } catch (error) {
      this.logger.error(`[BotHandler] Error clearing memory: ${error.message}`);
      return "Sorry, I encountered an error while trying to clear my memory. Please try again later.";
    }
  }

  /**
   * Get help message with available commands
   */
  private getHelpMessage(): string {
    return `📚 **Productivity Assistant - Enhanced Natural Language Understanding!**

I understand natural conversation! Here's everything I can help you with:

**📁 PROJECT MANAGEMENT:**
• "Show my projects" / "List all projects"
• "Create project called [name]"
• "Show details of [project name]"
• "Who's in [project]?" / "Project members"
• "Delete [project]" / "Duplicate [project]"
• "Add [person] to [project]"
• "Search for projects about [topic]"

**✅ TASK MANAGEMENT:**
**View Tasks:**
• "Show my tasks" / "What am I working on?"
• "What's due today?" / "Tasks due this week"
• "Show completed tasks" / "Overdue tasks"
• "Show high priority tasks" / "Urgent tasks"
• "Tasks in [project name]"
• "Show subtasks of [task]"

**Manage Tasks:**
• "Create task called [name]"
• "Mark [task] as complete" / "Finish [task]"
• "Assign [task] to [person]"
• "Set [task] priority to high"
• "Set [task] due date to [date]"
• "Add comment to [task]"
• "Delete [task]" / "Reopen [task]"

**📅 CALENDAR & EVENTS:**
**View Events:**
• "Show my events" / "What's on my calendar?"
• "What's today?" / "Tomorrow's schedule"
• "Show this week" / "This month's events"
• "Show past events" / "Event history"
• "Who's attending [event]?"

**Manage Events:**
• "Create meeting tomorrow at 2pm"
• "Schedule [event name] for [date/time]"
• "Reschedule [event] to Friday"
• "Change [event] location to [place]"
• "Cancel [event]" / "Delete [event]"
• "Add [person] to [event]"
• "Search for meetings about [topic]"

**🤖 BOT CAPABILITIES:**
• "What are you managing?" (shows all assignments)
• "Which projects are you assigned to?"
• "What events are you handling?"
• I only access projects/events you assign me to!

**💡 NATURAL LANGUAGE EXAMPLES:**
Instead of rigid commands, talk naturally:
• "anything due soon?" → shows tasks due this week
• "what's up?" → shows today's tasks/events
• "who's working on mobile app?" → project members
• "make login task high priority" → updates priority
• "move standup to 10am" → reschedules event

**💬 MESSAGING & COMMUNICATION:**
**Chained Operations (Multi-step):**
• "Send a message to the assignee of [task]"
• "Message the person working on [project]"
• "Tell the team in [project] about [something]"
• "Send [person] a reminder about [event]"
• "Message all participants of [event]"
• "DM [person's name]" / "Message [email]"

**Examples:**
• "message the assignee of Login API to review it"
• "tell everyone in Mobile App project about the deadline"
• "send Sarah a message about tomorrow's meeting"
• "notify all Team Meeting participants about the change"

**🔄 MEMORY MANAGEMENT:**
• "Clear your memory" / "Forget everything"
• "Reset context" / "Start fresh"
• Useful after deleting projects or changing assignments

**🎯 PRO TIPS:**
✨ Be conversational - I understand context!
✨ I extract details like dates, names, priorities automatically
✨ Low confidence? I'll ask for clarification
✨ Assign me to projects/events for full access
✨ Clear my memory if I reference old/deleted items

Ask me anything about projects, tasks, or events! 🚀`;
  }

  /**
   * Send a message from the bot to a conversation
   */
  private async sendBotMessage(
    workspaceId: string,
    conversationId: string,
    botId: string,
    content: string,
  ): Promise<void> {
    try {
      // Create message in database
      // Use "bot:{botId}" format to match how bot participants are stored
      const messageData = {
        conversation_id: conversationId,
        user_id: `bot:${botId}`, // Bot is the sender - use prefixed format
        content: content,
        content_html: this.convertMarkdownToHtml(content),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = await this.db
        .table('messages')
        .insert(messageData)
        .returning('*')
        .execute();

      const message = Array.isArray(result.data) ? result.data[0] : result.data;

      this.logger.log(`Bot sent message to conversation ${conversationId}`);

      // Emit WebSocket events for real-time delivery (using AppGateway like person-to-person messages)
      if (this.appGateway && message) {
        const messagePayload = {
          ...message,
          user: {
            id: `bot:${botId}`,
            isBot: true,
          },
        };

        // 1. Emit to conversation room using AppGateway (same as person-to-person)
        this.appGateway.emitToRoom(`conversation:${conversationId}`, 'message:new', {
          message: messagePayload,
          conversation_id: conversationId,
        });
        this.logger.debug(`[BotHandler] Emitted message:new to conversation room ${conversationId}`);

        // 2. Get conversation participants to emit workspace notifications
        try {
          const membersResult = await this.db.findMany('conversation_members', {
            conversation_id: conversationId
          });
          const members = Array.isArray(membersResult.data) ? membersResult.data : [];
          const participantIds = members.map(m => m.user_id).filter(id => !id.startsWith('bot:'));

          // Emit to each participant's workspace+user room (same as person-to-person)
          if (participantIds.length > 0) {
            this.appGateway.emitToWorkspaceUsers(workspaceId, participantIds, 'message:new:workspace', {
              message: messagePayload,
              conversation_id: conversationId,
              type: 'conversation',
            });
            this.logger.debug(`[BotHandler] Emitted workspace notifications to ${participantIds.length} participants`);
          }
        } catch (error) {
          this.logger.error(`Failed to emit workspace notifications: ${error.message}`);
        }

        // 3. Update conversation list
        this.chatGateway.notifyWorkspace(workspaceId, 'conversation:updated', {
          conversationId: conversationId,
          lastMessage: message,
          lastMessageAt: message.created_at,
        });
      }
    } catch (error) {
      this.logger.error(`Error sending bot message: ${error.message}`, error.stack);
    }
  }

  // ========================================
  // PROJECT MANAGEMENT BOT METHODS
  // ========================================

  /**
   * Get user's projects
   */
  private async getMyProjects(
    workspaceId: string,
    userId: string,
    assignedProjectIds?: string[]
  ): Promise<string> {
    try {
      // Get projects where user is owner or member
      const ownedResult = await this.db
        .table('projects')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('owner_id', '=', userId)
        .where('status', '=', 'active')
        .orderBy('created_at', 'DESC')
        .limit(10)
        .execute();

      const memberResult = await this.db
        .table('project_members')
        .select('*')
        .where('user_id', '=', userId)
        .where('is_active', '=', true)
        .execute();

      const memberProjects = Array.isArray(memberResult) ? memberResult : (memberResult.data || []);
      const memberProjectIds = memberProjects.map(m => m.project_id);

      let allProjects = Array.isArray(ownedResult) ? ownedResult : (ownedResult.data || []);

      if (memberProjectIds.length > 0) {
        const memberProjectsResult = await this.db
          .table('projects')
          .select('*')
          .where('workspace_id', '=', workspaceId)
          .where('status', '=', 'active')
          .orderBy('created_at', 'DESC')
          .limit(20)
          .execute();

        const memberProjs = Array.isArray(memberProjectsResult) ? memberProjectsResult : (memberProjectsResult.data || []);
        const filtered = memberProjs.filter(p => memberProjectIds.includes(p.id));

        const projectMap = new Map();
        [...allProjects, ...filtered].forEach(p => projectMap.set(p.id, p));
        allProjects = Array.from(projectMap.values());
      }

      // Filter by assigned projects if bot is assigned to specific projects
      if (assignedProjectIds && assignedProjectIds.length > 0) {
        allProjects = allProjects.filter(p => assignedProjectIds.includes(p.id));
      }

      if (allProjects.length === 0) {
        return assignedProjectIds && assignedProjectIds.length > 0
          ? "I don't have any projects assigned to me."
          : "You don't have any active projects yet. Create your first project to get started!";
      }

      let response = `📋 **Your Active Projects (${allProjects.length}):**\n\n`;
      allProjects.slice(0, 10).forEach((project: any, index: number) => {
        response += `${index + 1}. **${project.name}**\n`;
        if (project.description) {
          const desc = project.description.substring(0, 60);
          response += `   ${desc}${project.description.length > 60 ? '...' : ''}\n`;
        }
        response += `   Status: ${project.status} | Type: ${project.type}\n\n`;
      });

      return response.trim();
    } catch (error) {
      this.logger.error(`Error fetching projects: ${error.message}`);
      return "Sorry, I couldn't fetch your projects. Please try again.";
    }
  }

  /**
   * Get tasks assigned to user
   */
  private async getMyTasks(
    workspaceId: string,
    userId: string,
    assignedProjectIds?: string[]
  ): Promise<string> {
    try {
      const result = await this.db
        .table('tasks')
        .select('*')
        .orderBy('due_date', 'ASC')
        .limit(50)
        .execute();

      const allTasks = Array.isArray(result) ? result : (result.data || []);

      // Filter tasks assigned to this user
      const myTasks = allTasks.filter((task: any) => {
        const assignedTo = task.assigned_to || [];
        return assignedTo.includes(userId);
      });

      // Filter by workspace through projects
      const projectIds = myTasks.map(t => t.project_id);
      if (projectIds.length === 0) {
        return "You don't have any tasks assigned to you.";
      }

      const projectsResult = await this.db
        .table('projects')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .execute();

      const projects = Array.isArray(projectsResult) ? projectsResult : (projectsResult.data || []);
      const validProjectIds = new Set(projects.map(p => p.id));

      let workspaceTasks = myTasks.filter(t => validProjectIds.has(t.project_id));

      // Filter by assigned projects if bot is assigned to specific projects
      if (assignedProjectIds && assignedProjectIds.length > 0) {
        workspaceTasks = workspaceTasks.filter(t => assignedProjectIds.includes(t.project_id));
      }

      if (workspaceTasks.length === 0) {
        return assignedProjectIds && assignedProjectIds.length > 0
          ? "I don't have any tasks in the assigned projects."
          : "You don't have any tasks assigned to you in this workspace.";
      }

      let response = `✅ **Your Tasks (${workspaceTasks.length}):**\n\n`;

      const pending = workspaceTasks.filter(t => t.status !== 'done' && t.status !== 'completed');
      const completed = workspaceTasks.filter(t => t.status === 'done' || t.status === 'completed');

      if (pending.length > 0) {
        response += `**Pending (${pending.length}):**\n`;
        pending.slice(0, 10).forEach((task: any, index: number) => {
          response += `${index + 1}. **${task.title}**\n`;
          response += `   Status: ${task.status} | Priority: ${task.priority}\n`;
          if (task.due_date) {
            const dueDate = new Date(task.due_date);
            response += `   Due: ${dueDate.toLocaleDateString()}\n`;
          }
          response += '\n';
        });
      }

      if (completed.length > 0) {
        response += `\n**Completed (${completed.length}):**\n`;
        completed.slice(0, 5).forEach((task: any, index: number) => {
          response += `${index + 1}. ~~${task.title}~~\n`;
        });
      }

      return response.trim();
    } catch (error) {
      this.logger.error(`Error fetching tasks: ${error.message}`);
      return "Sorry, I couldn't fetch your tasks. Please try again.";
    }
  }

  /**
   * Get tasks in a specific project
   */
  private async getProjectTasks(
    workspaceId: string,
    userId: string,
    content: string,
    assignedProjectIds?: string[]
  ): Promise<string> {
    try {
      // 1. Get recent conversation context to find projects user just viewed
      const recentHistory = await this.conversationMemory.getRecentHistory(
        workspaceId,
        userId,
        10, // Get last 10 messages
      );

      // Extract projects from recent "show_bot_projects" or "show_projects" responses
      const recentProjects: Array<{ name: string }> = [];
      for (const msg of recentHistory) {
        this.logger.debug(`[Bot] Checking message with action: ${msg.action}, has metadata: ${!!msg.metadata}, has project_names: ${!!msg.metadata?.project_names}`);

        const isProjectAction = msg.action === 'show_bot_projects' || msg.action === 'show_projects';
        if (isProjectAction && msg.metadata?.project_names) {
          const names = msg.metadata.project_names;
          if (Array.isArray(names)) {
            names.forEach((name: string) => recentProjects.push({ name }));
          }
        }
      }

      this.logger.log(`[Bot] Found ${recentProjects.length} projects in recent context: ${recentProjects.map(p => p.name).join(', ')}`);

      // 2. Use OpenAI to parse the request with context
      const parseResult = await this.parseProjectTasksCommand(content, recentProjects);

      if (!parseResult.success) {
        return parseResult.errorMessage || `Please specify the project name. For example: "tasks in Mobile App Design"`;
      }

      const projectName = parseResult.projectName;
      const limit = parseResult.limit;

      this.logger.log(`[Bot] Looking for tasks in project: "${projectName}", limit: ${limit || 'all'}`);

      // Find the project
      const projectResult = await this.db
        .table('projects')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('status', '=', 'active')
        .execute();

      let projects = Array.isArray(projectResult) ? projectResult : (projectResult.data || []);

      // Filter by assigned projects if bot is assigned to specific projects
      if (assignedProjectIds && assignedProjectIds.length > 0) {
        projects = projects.filter(p => assignedProjectIds.includes(p.id));
      }

      const project = projects.find(p => p.name.toLowerCase().includes(projectName.toLowerCase()));

      if (!project) {
        return assignedProjectIds && assignedProjectIds.length > 0
          ? `I couldn't find a project matching "${projectName}" in my assigned projects.`
          : `I couldn't find a project matching "${projectName}". Try "show my projects" to see all projects.`;
      }

      // Get tasks for this project
      const tasksResult = await this.db
        .table('tasks')
        .select('*')
        .where('project_id', '=', project.id)
        .orderBy('created_at', 'DESC')
        .execute();

      const tasks = Array.isArray(tasksResult) ? tasksResult : (tasksResult.data || []);

      if (tasks.length === 0) {
        return `Project "${project.name}" has no tasks yet.`;
      }

      // If user specified a limit, show only that many tasks
      if (limit) {
        const limitedTasks = tasks.slice(0, limit);
        let response = `📋 **First ${limit} tasks in "${project.name}":**\n\n`;

        limitedTasks.forEach((task: any, index: number) => {
          response += `${index + 1}. **${task.title}**\n`;
          response += `   Status: ${task.status} | Priority: ${task.priority}`;
          if (task.due_date) {
            response += ` | Due: ${new Date(task.due_date).toLocaleDateString()}`;
          }
          response += '\n\n';
        });

        if (tasks.length > limit) {
          response += `_Showing ${limit} of ${tasks.length} total tasks_`;
        }

        return response.trim();
      }

      // Otherwise show all tasks grouped by status
      let response = `📋 **Tasks in "${project.name}" (${tasks.length}):**\n\n`;

      const byStatus: any = {};
      tasks.forEach((task: any) => {
        if (!byStatus[task.status]) byStatus[task.status] = [];
        byStatus[task.status].push(task);
      });

      Object.keys(byStatus).forEach(status => {
        const statusTasks = byStatus[status];
        response += `**${status.toUpperCase()} (${statusTasks.length}):**\n`;
        statusTasks.slice(0, 5).forEach((task: any, index: number) => {
          response += `${index + 1}. ${task.title}\n`;
          response += `   Priority: ${task.priority}`;
          if (task.due_date) {
            response += ` | Due: ${new Date(task.due_date).toLocaleDateString()}`;
          }
          response += '\n';
        });
        response += '\n';
      });

      return response.trim();
    } catch (error) {
      this.logger.error(`Error fetching project tasks: ${error.message}`);
      return "Sorry, I couldn't fetch the project tasks. Please try again.";
    }
  }

  /**
   * Get detailed information about a specific task
   * Shows: title, status, priority, assignees, progress, due date, description
   */
  private async getTaskDetails(
    workspaceId: string,
    userId: string,
    content: string,
    assignedProjectIds?: string[]
  ): Promise<string> {
    try {
      // 1. Get recent conversation context to find tasks user just viewed
      const recentHistory = await this.conversationMemory.getRecentHistory(
        workspaceId,
        userId,
        10,
      );

      // Extract tasks from recent "show_tasks" or "show_project_tasks" responses
      const recentTasks: Array<{ title: string }> = [];
      for (const msg of recentHistory) {
        const isTaskAction = msg.action === 'show_tasks' || msg.action === 'show_project_tasks';
        if (isTaskAction && msg.metadata?.task_titles) {
          const titles = msg.metadata.task_titles;
          if (Array.isArray(titles)) {
            titles.forEach((title: string) => recentTasks.push({ title }));
          }
        }
      }

      this.logger.log(`[Bot] Found ${recentTasks.length} tasks in recent context for details query`);

      // 2. Use OpenAI to parse which task they want details for
      const parseResult = await this.parseTaskDetailsCommand(content, recentTasks);

      if (!parseResult.success) {
        return parseResult.errorMessage || `Please specify the task name. For example: "show details of Design Homepage"`;
      }

      const taskName = parseResult.taskName;

      this.logger.log(`[Bot] Looking for task details: "${taskName}"`);

      // 3. Find the task
      const tasksResult = await this.db
        .table('tasks')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .execute();

      let allTasks = Array.isArray(tasksResult) ? tasksResult : (tasksResult.data || []);

      // Filter by assigned projects if bot has project scope
      if (assignedProjectIds && assignedProjectIds.length > 0) {
        allTasks = allTasks.filter(t => assignedProjectIds.includes(t.project_id));
      }

      const task = allTasks.find(t => t.title.toLowerCase().includes(taskName.toLowerCase()));

      if (!task) {
        return `I couldn't find a task matching "${taskName}".`;
      }

      // 4. Get project info
      const project = await this.db.findOne('projects', { id: task.project_id });

      // 5. Build detailed response
      let response = `📋 **Task Details:**\n\n`;
      response += `**${task.title}**\n`;
      if (project) {
        response += `📁 Project: ${project.name}\n`;
      }
      response += `\n`;

      // Status
      response += `📊 **Status:** ${task.status}\n`;

      // Priority
      const priorityEmoji = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
      response += `${priorityEmoji} **Priority:** ${task.priority || 'normal'}\n\n`;

      // Progress percentage (based on status and kanban stages)
      let progressPercentage = 0;
      if (project?.kanban_stages) {
        const stages = project.kanban_stages.sort((a: any, b: any) => a.order - b.order);
        const currentStageIndex = stages.findIndex((s: any) => s.id === task.status);
        if (currentStageIndex !== -1) {
          progressPercentage = Math.round(((currentStageIndex + 1) / stages.length) * 100);
        }
      } else {
        // Fallback: basic calculation
        const statusProgress: any = {
          'todo': 0,
          'in_progress': 50,
          'review': 75,
          'testing': 85,
          'done': 100,
          'completed': 100,
        };
        progressPercentage = statusProgress[task.status.toLowerCase()] || 0;
      }

      // Progress bar
      const progressBarLength = 20;
      const filledBlocks = Math.round((progressPercentage / 100) * progressBarLength);
      const emptyBlocks = progressBarLength - filledBlocks;
      const progressBar = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);

      response += `**Progress:** ${progressPercentage}%\n`;
      response += `${progressBar}\n\n`;

      // Assignees
      if (task.assignees) {
        const assignees = typeof task.assignees === 'string'
          ? JSON.parse(task.assignees)
          : task.assignees;

        if (Array.isArray(assignees) && assignees.length > 0) {
          response += `👥 **Assigned to (${assignees.length}):**\n`;

          for (const assignee of assignees.slice(0, 10)) {
            const assigneeId = typeof assignee === 'object' ? assignee.id : assignee;
            try {
              const user = await this.db.getUserById(assigneeId);
              if (user) {
                response += `   • ${user.name || user.email || 'Unknown'}\n`;
              }
            } catch (error) {
              this.logger.warn(`Could not fetch assignee: ${error.message}`);
              response += `   • User ${assigneeId.substring(0, 8)}...\n`;
            }
          }

          if (assignees.length > 10) {
            response += `   ... and ${assignees.length - 10} more\n`;
          }
          response += '\n';
        } else {
          response += `👤 **Assigned to:** No one yet\n\n`;
        }
      } else {
        response += `👤 **Assigned to:** No one yet\n\n`;
      }

      // Due date
      if (task.due_date) {
        const dueDate = new Date(task.due_date);
        const today = new Date();
        const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        response += `📅 **Due Date:** ${dueDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })}`;

        if (daysUntil < 0) {
          response += ` ⚠️ (${Math.abs(daysUntil)} days overdue)`;
        } else if (daysUntil === 0) {
          response += ` 🔥 (Due today!)`;
        } else if (daysUntil <= 3) {
          response += ` ⚡ (${daysUntil} days left)`;
        }
        response += '\n\n';
      }

      // Description
      if (task.description) {
        response += `📝 **Description:**\n${task.description}\n\n`;
      }

      // Created info
      if (task.created_at) {
        const created = new Date(task.created_at);
        response += `🕒 Created: ${created.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}\n`;
      }

      return response.trim();
    } catch (error) {
      this.logger.error(`Error fetching task details: ${error.message}`);
      return "Sorry, I couldn't fetch the task details. Please try again.";
    }
  }

  /**
   * Parse task details command with context awareness
   */
  private async parseTaskDetailsCommand(
    userMessage: string,
    recentTasks: Array<{ title: string }>,
  ): Promise<{
    success: boolean;
    taskName?: string;
    errorMessage?: string;
  }> {
    try {
      const recentTasksList = recentTasks.length > 0
        ? recentTasks.map(t => `"${t.title}"`).join(', ')
        : 'None';

      const prompt = `You are helping parse a request to view task details. The user recently viewed these tasks: ${recentTasksList}

User message: "${userMessage}"

Extract:
1. task_name: Which task's details to show (if not specified but only ONE task in recent context, use that task name)

Rules:
- If user says "show details of this task" or "task details" and there's ONLY ONE task in recent context, use that task name
- If user says "details of [task name]", extract the task name
- If multiple tasks in context and no task specified, return error

Return JSON ONLY (omit fields that are not present):
{
  "success": true,
  "task_name": "task name"
}

OR if error:
{
  "success": false,
  "error": "error message"
}`;

      const response = await this.intentClassifier['openai'].invoke(prompt);
      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        return {
          success: false,
          errorMessage: 'Failed to parse the task details request.',
        };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.success || parsed.error) {
        return {
          success: false,
          errorMessage: parsed.error || 'Could not understand which task you mean.',
        };
      }

      return {
        success: true,
        taskName: parsed.task_name,
      };
    } catch (error) {
      this.logger.error(`[ParseTaskDetails] Error: ${error.message}`);
      return {
        success: false,
        errorMessage: 'Failed to parse task details command. Try being more specific.',
      };
    }
  }

  /**
   * Update task status
   */
  private async updateTaskStatus(
    workspaceId: string,
    userId: string,
    content: string,
    assignedProjectIds?: string[]
  ): Promise<string> {
    try {
      // Get recent conversation context to find tasks user just viewed
      const recentHistory = await this.conversationMemory.getRecentHistory(
        workspaceId,
        userId,
        10,
      );

      // Extract tasks from recent "show_tasks" responses
      const recentTasks: Array<{ title: string; id?: string }> = [];
      for (const msg of recentHistory) {
        const isTaskAction = msg.action === 'show_tasks' || msg.action === 'show_project_tasks';
        if (isTaskAction && msg.metadata?.task_titles) {
          const titles = msg.metadata.task_titles;
          if (Array.isArray(titles)) {
            titles.forEach((title: string) => recentTasks.push({ title }));
          }
        }
      }

      this.logger.log(`[UpdateTaskStatus] Found ${recentTasks.length} tasks in recent context`);

      // Use OpenAI to parse the status update command
      const parseResult = await this.parseTaskStatusCommand(content, recentTasks);

      if (!parseResult.success) {
        return parseResult.errorMessage || `To update task status, try:\n• "Mark task as done"\n• "Set task status to in progress"\n• "Complete task"\n\nI'll use context from our conversation to figure out which task you mean!`;
      }

      const taskTitle = parseResult.taskTitle || '';
      const newStatus = parseResult.status || 'done';

      // Find the task
      const tasksResult = await this.db
        .table('tasks')
        .select('*')
        .orderBy('created_at', 'DESC')
        .limit(50)
        .execute();

      let allTasks = Array.isArray(tasksResult) ? tasksResult : (tasksResult.data || []);

      // Filter by assigned projects if bot is assigned to specific projects
      if (assignedProjectIds && assignedProjectIds.length > 0) {
        allTasks = allTasks.filter((t: any) => assignedProjectIds.includes(t.project_id));
      }

      const task = allTasks.find((t: any) => t.title.toLowerCase().includes(taskTitle.toLowerCase()));

      if (!task) {
        return assignedProjectIds && assignedProjectIds.length > 0
          ? `I couldn't find a task matching "${taskTitle}" in my assigned projects.`
          : `I couldn't find a task matching "${taskTitle}". Try "show my tasks" to see all your tasks.`;
      }

      // Update the task
      const updateData: any = {
        status: newStatus === 'complete' || newStatus === 'completed' ? 'done' : newStatus,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      };

      if (newStatus === 'done' || newStatus === 'complete' || newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
        updateData.completed_by = userId;
      }

      await this.db
        .table('tasks')
        .where('id', '=', task.id)
        .update(updateData)
        .execute();

      return `✅ **Task Updated!**\n\n"${task.title}" is now marked as **${updateData.status}**`;
    } catch (error) {
      this.logger.error(`Error updating task status: ${error.message}`);
      return "Sorry, I couldn't update the task. Please try again.";
    }
  }

  /**
   * Update task details
   */
  private async updateTask(
    workspaceId: string,
    userId: string,
    content: string,
    assignedProjectIds?: string[]
  ): Promise<string> {
    try {
      // Get recent conversation context to find tasks user just viewed
      const recentHistory = await this.conversationMemory.getRecentHistory(
        workspaceId,
        userId,
        10,
      );

      // Extract tasks from recent "show_tasks" responses
      const recentTasks: Array<{ title: string; id?: string }> = [];
      for (const msg of recentHistory) {
        const isTaskAction = msg.action === 'show_tasks' || msg.action === 'show_project_tasks';
        if (isTaskAction && msg.metadata?.task_titles) {
          const titles = msg.metadata.task_titles;
          if (Array.isArray(titles)) {
            titles.forEach((title: string) => recentTasks.push({ title }));
          }
        }
      }

      this.logger.log(`[UpdateTask] Found ${recentTasks.length} tasks in recent context`);

      // Use OpenAI to parse the update command
      const parseResult = await this.parseTaskUpdateCommand(content, recentTasks);

      if (!parseResult.success) {
        return parseResult.errorMessage || `To update a task, try:\n• "Change priority to high"\n• "Update title to new name"\n• "Set due date to tomorrow"\n\nI'll use context from our conversation to figure out which task you mean!`;
      }

      const taskTitle = parseResult.taskTitle || '';
      const field = parseResult.field || '';
      const newValue = parseResult.value || '';

      // Find the task
      const tasksResult = await this.db
        .table('tasks')
        .select('*')
        .orderBy('created_at', 'DESC')
        .limit(50)
        .execute();

      let allTasks = Array.isArray(tasksResult) ? tasksResult : (tasksResult.data || []);

      // Filter by assigned projects if bot is assigned to specific projects
      if (assignedProjectIds && assignedProjectIds.length > 0) {
        allTasks = allTasks.filter((t: any) => assignedProjectIds.includes(t.project_id));
      }

      const task = allTasks.find((t: any) => t.title.toLowerCase().includes(taskTitle.toLowerCase()));

      if (!task) {
        return assignedProjectIds && assignedProjectIds.length > 0
          ? `I couldn't find a task matching "${taskTitle}" in my assigned projects.`
          : `I couldn't find a task matching "${taskTitle}".`;
      }

      const updateData: any = {
        updated_at: new Date().toISOString(),
        updated_by: userId,
      };

      if (field === 'title') {
        updateData.title = newValue;
      } else if (field === 'priority') {
        updateData.priority = newValue.toLowerCase();
      } else if (field.includes('due')) {
        updateData.due_date = new Date(newValue).toISOString();
      }

      await this.db
        .table('tasks')
        .where('id', '=', task.id)
        .update(updateData)
        .execute();

      return `✅ **Task Updated!**\n\n"${task.title}"\n${field} updated to: **${newValue}**`;
    } catch (error) {
      this.logger.error(`Error updating task: ${error.message}`);
      return "Sorry, I couldn't update the task. Please try again.";
    }
  }

  /**
   * Get project members
   */
  private async getProjectMembers(
    workspaceId: string,
    userId: string,
    content: string,
    assignedProjectIds?: string[]
  ): Promise<string> {
    try {
      // 1. Get recent conversation context to find projects user just viewed
      const recentHistory = await this.conversationMemory.getRecentHistory(
        workspaceId,
        userId,
        10, // Get last 10 messages
      );

      // Extract projects from recent "show_bot_projects" or "show_projects" responses
      const recentProjects: Array<{ name: string }> = [];
      for (const msg of recentHistory) {
        const isProjectAction = msg.action === 'show_bot_projects' || msg.action === 'show_projects';
        if (isProjectAction && msg.metadata?.project_names) {
          const names = msg.metadata.project_names;
          if (Array.isArray(names)) {
            names.forEach((name: string) => recentProjects.push({ name }));
          }
        }
      }

      this.logger.log(`[Bot] Found ${recentProjects.length} projects in recent context for members query`);

      // 2. Use OpenAI to parse the request with context (reusing same parser)
      const parseResult = await this.parseProjectTasksCommand(content, recentProjects);

      if (!parseResult.success) {
        return parseResult.errorMessage || `Please specify the project name. For example: "members of Mobile App Design"`;
      }

      const projectName = parseResult.projectName;

      this.logger.log(`[Bot] Looking for project members: "${projectName}"`);

      const projectResult = await this.db
        .table('projects')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .execute();

      let projects = Array.isArray(projectResult) ? projectResult : (projectResult.data || []);

      // Filter by assigned projects if bot is assigned to specific projects
      if (assignedProjectIds && assignedProjectIds.length > 0) {
        projects = projects.filter(p => assignedProjectIds.includes(p.id));
      }

      const project = projects.find(p => p.name.toLowerCase().includes(projectName.toLowerCase()));

      if (!project) {
        return assignedProjectIds && assignedProjectIds.length > 0
          ? `I couldn't find a project matching "${projectName}" in my assigned projects.`
          : `I couldn't find a project matching "${projectName}".`;
      }

      const membersResult = await this.db
        .table('project_members')
        .select('*')
        .where('project_id', '=', project.id)
        .where('is_active', '=', true)
        .execute();

      const members = Array.isArray(membersResult) ? membersResult : (membersResult.data || []);

      if (members.length === 0) {
        return `Project "${project.name}" has no members yet.`;
      }

      let response = `👥 **Members of "${project.name}" (${members.length}):**\n\n`;

      // Fetch user details for each member
      for (let index = 0; index < members.length; index++) {
        const member = members[index];
        try {
          const user = await this.db.getUserById(member.user_id);
          if (user) {
            const displayName = user.name || user.username || user.email || 'Unknown User';
            response += `${index + 1}. **${displayName}** (${member.role})`;
            if (user.email && user.name) {
              response += ` - ${user.email}`;
            }
            response += '\n';
          } else {
            response += `${index + 1}. User ${member.user_id.substring(0, 8)}... (${member.role})\n`;
          }
        } catch (error) {
          this.logger.warn(`Could not fetch member details for ${member.user_id}: ${error.message}`);
          response += `${index + 1}. User ${member.user_id.substring(0, 8)}... (${member.role})\n`;
        }
      }

      return response.trim();
    } catch (error) {
      this.logger.error(`Error fetching project members: ${error.message}`);
      return "Sorry, I couldn't fetch the project members. Please try again.";
    }
  }

  /**
   * Generate smart clarifying question when confidence is low
   * Uses OpenAI to create contextual questions
   */
  private async generateClarifyingQuestion(
    originalMessage: string,
    intent: any,
    assignmentContext: any[],
  ): Promise<string> {
    try {
      // Build context about bot's assignments
      const assignments = assignmentContext
        .map(ctx => {
          if (ctx.action === 'event_assigned') {
            return `- Event: "${ctx.metadata?.event_title}"`;
          }
          if (ctx.action === 'project_assigned') {
            return `- Project: "${ctx.metadata?.project_name}"`;
          }
          return '';
        })
        .filter(Boolean)
        .join('\n');

      const contextInfo = assignments.length > 0
        ? `\nI'm currently managing:\n${assignments}`
        : `\nI'm not assigned to any events or projects yet.`;

      // Provide options based on best guess
      const suggestions = this.getSuggestionsForIntent(intent.intent);

      return `I'm not quite sure what you mean by "${originalMessage}". 🤔

${contextInfo}

Could you clarify? Here are some things I can help with:
${suggestions}

Please rephrase your request or choose one of the options above! 💡`;
    } catch (error) {
      this.logger.error(`Failed to generate clarifying question: ${error.message}`);
      // Fallback to simple clarification
      return `I'm not quite sure what you mean. Could you rephrase that? I can help with:
• Showing my assignments
• Displaying events and schedules
• Managing tasks and projects
• Showing participants and members

What would you like to do?`;
    }
  }

  /**
   * Get relevant suggestions based on best-guess intent
   */
  private getSuggestionsForIntent(intent: string): string {
    const suggestionMap: Record<string, string> = {
      show_events: `• "Show my events" - See your upcoming calendar events
• "What's today?" - View today's schedule
• "What's tomorrow?" - View tomorrow's schedule`,
      show_assignments: `• "What are you assigned to?" - See events/projects I'm managing
• "Show your assignments" - View my current scope`,
      show_project_tasks: `• "Tasks in [project name]" - See tasks for a specific project
• "Show my tasks" - View all your tasks`,
      show_event_participants: `• "Show participants" - See who's attending (if I manage 1 event)
• "Show participants for [event name]" - See attendees for a specific event`,
      show_projects: `• "Show my projects" - See all your projects
• "Project members of [name]" - See who's in a project`,
      unknown: `• "Show my events" - View calendar
• "What are you assigned to?" - See my scope
• "Show my tasks" - View tasks
• "Help" - See all commands`,
    };

    return suggestionMap[intent] || suggestionMap.unknown;
  }

  /**
   * Extract user preferences from conversation history
   * Analyzes patterns to understand user preferences for personalization
   */
  private extractUserPreferences(history: any[]): string[] {
    const preferences: string[] = [];

    if (history.length === 0) return preferences;

    // Analyze frequently asked intents
    const intentCounts: Record<string, number> = {};
    for (const msg of history) {
      if (msg.metadata?.intent) {
        intentCounts[msg.metadata.intent] = (intentCounts[msg.metadata.intent] || 0) + 1;
      }
    }

    // Detect most common request type
    const sortedIntents = Object.entries(intentCounts).sort((a, b) => b[1] - a[1]);
    if (sortedIntents.length > 0) {
      const [topIntent, count] = sortedIntents[0];
      if (count >= 3) {
        preferences.push(`frequently_asks_${topIntent}`);
      }
    }

    // Detect time-based patterns
    const timeSensitiveIntents = history.filter(
      (msg) => msg.action === 'show_today_events' || msg.action === 'show_tomorrow_events'
    );
    if (timeSensitiveIntents.length >= 2) {
      preferences.push('prefers_time_specific_queries');
    }

    // Detect project-focused user
    const projectRequests = history.filter(
      (msg) => msg.action?.includes('project') || msg.action?.includes('task')
    );
    if (projectRequests.length >= 3) {
      preferences.push('project_focused');
    }

    // Detect event-focused user
    const eventRequests = history.filter(
      (msg) => msg.action?.includes('event') || msg.action === 'show_events'
    );
    if (eventRequests.length >= 3) {
      preferences.push('event_focused');
    }

    return preferences;
  }

  /**
   * Simple markdown to HTML converter
   */
  private convertMarkdownToHtml(markdown: string): string {
    let html = markdown;

    // Convert **bold**
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Convert *italic*
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Convert line breaks
    html = html.replace(/\n/g, '<br>');

    // Wrap in paragraph
    html = `<p>${html}</p>`;

    return html;
  }

  // ========================================
  // SIMPLE VIEW/LIST HANDLERS
  // ========================================

  /**
   * Get completed tasks
   */
  private async getCompletedTasks(workspaceId: string, userId: string, projectIds: string[]): Promise<string> {
    try {
      const query: any = {
        workspace_id: workspaceId,
        status: 'done',
      };

      if (projectIds && projectIds.length > 0) {
        query.project_id = projectIds;
      }

      const result = await this.db.table('tasks')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('status', '=', 'done')
        .orderBy('completed_at', 'DESC')
        .limit(20)
        .execute();

      const tasks = Array.isArray(result.data) ? result.data : [];

      if (tasks.length === 0) {
        return "You don't have any completed tasks yet. Keep up the good work! ✅";
      }

      let response = `✅ **Completed Tasks** (${tasks.length})\n\n`;
      tasks.forEach((task, index) => {
        response += `${index + 1}. **${task.title}**\n`;
        if (task.completed_at) {
          const completedDate = new Date(task.completed_at).toLocaleDateString();
          response += `   Completed: ${completedDate}\n`;
        }
        response += `\n`;
      });

      return response;
    } catch (error) {
      this.logger.error('[BotHandler] Error getting completed tasks:', error);
      return "Sorry, I couldn't retrieve your completed tasks. Please try again.";
    }
  }

  /**
   * Get overdue tasks
   */
  private async getOverdueTasks(workspaceId: string, userId: string, projectIds: string[]): Promise<string> {
    try {
      const now = new Date().toISOString();

      const result = await this.db.table('tasks')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('status', '!=', 'done')
        .where('due_date', '<', now)
        .orderBy('due_date', 'ASC')
        .execute();

      const tasks = Array.isArray(result.data) ? result.data : [];

      if (tasks.length === 0) {
        return "Great news! You have no overdue tasks. 🎉";
      }

      let response = `⚠️ **Overdue Tasks** (${tasks.length})\n\n`;
      tasks.forEach((task, index) => {
        response += `${index + 1}. **${task.title}**\n`;
        if (task.due_date) {
          const dueDate = new Date(task.due_date);
          const daysOverdue = Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
          response += `   Due: ${dueDate.toLocaleDateString()} (${daysOverdue} days ago)\n`;
        }
        if (task.priority) {
          response += `   Priority: ${task.priority.toUpperCase()}\n`;
        }
        response += `\n`;
      });

      return response;
    } catch (error) {
      this.logger.error('[BotHandler] Error getting overdue tasks:', error);
      return "Sorry, I couldn't retrieve your overdue tasks. Please try again.";
    }
  }

  /**
   * Get tasks by priority
   */
  private async getTasksByPriority(workspaceId: string, userId: string, priority: string | undefined, projectIds: string[]): Promise<string> {
    try {
      const targetPriority = priority?.toLowerCase() || 'high';

      const result = await this.db.table('tasks')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('priority', '=', targetPriority)
        .where('status', '!=', 'done')
        .orderBy('due_date', 'ASC')
        .execute();

      const tasks = Array.isArray(result.data) ? result.data : [];

      if (tasks.length === 0) {
        return `No ${targetPriority} priority tasks found.`;
      }

      const priorityEmoji = targetPriority === 'highest' || targetPriority === 'high' ? '🔴' :
                            targetPriority === 'medium' ? '🟡' : '🟢';

      let response = `${priorityEmoji} **${targetPriority.toUpperCase()} Priority Tasks** (${tasks.length})\n\n`;
      tasks.forEach((task, index) => {
        response += `${index + 1}. **${task.title}**\n`;
        if (task.status) response += `   Status: ${task.status}\n`;
        if (task.due_date) {
          response += `   Due: ${new Date(task.due_date).toLocaleDateString()}\n`;
        }
        response += `\n`;
      });

      return response;
    } catch (error) {
      this.logger.error('[BotHandler] Error getting tasks by priority:', error);
      return "Sorry, I couldn't retrieve tasks by priority. Please try again.";
    }
  }

  /**
   * Get tasks by status
   */
  private async getTasksByStatus(workspaceId: string, userId: string, status: string | undefined, projectIds: string[]): Promise<string> {
    try {
      const targetStatus = status?.toLowerCase() || 'in_progress';

      const result = await this.db.table('tasks')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('status', '=', targetStatus)
        .orderBy('created_at', 'DESC')
        .execute();

      const tasks = Array.isArray(result.data) ? result.data : [];

      if (tasks.length === 0) {
        return `No tasks with status "${targetStatus}" found.`;
      }

      let response = `📋 **${targetStatus.replace('_', ' ').toUpperCase()} Tasks** (${tasks.length})\n\n`;
      tasks.forEach((task, index) => {
        response += `${index + 1}. **${task.title}**\n`;
        if (task.priority) response += `   Priority: ${task.priority}\n`;
        if (task.due_date) {
          response += `   Due: ${new Date(task.due_date).toLocaleDateString()}\n`;
        }
        response += `\n`;
      });

      return response;
    } catch (error) {
      this.logger.error('[BotHandler] Error getting tasks by status:', error);
      return "Sorry, I couldn't retrieve tasks by status. Please try again.";
    }
  }

  /**
   * Get tasks due today
   */
  private async getTasksDueToday(workspaceId: string, userId: string, projectIds: string[]): Promise<string> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const result = await this.db.table('tasks')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('status', '!=', 'done')
        .where('due_date', '>=', today.toISOString())
        .where('due_date', '<', tomorrow.toISOString())
        .orderBy('priority', 'DESC')
        .execute();

      const tasks = Array.isArray(result.data) ? result.data : [];

      if (tasks.length === 0) {
        return "You have no tasks due today! 🎉";
      }

      let response = `📅 **Tasks Due Today** (${tasks.length})\n\n`;
      tasks.forEach((task, index) => {
        response += `${index + 1}. **${task.title}**\n`;
        response += `   Status: ${task.status || 'todo'}\n`;
        if (task.priority) response += `   Priority: ${task.priority}\n`;
        response += `\n`;
      });

      return response;
    } catch (error) {
      this.logger.error('[BotHandler] Error getting tasks due today:', error);
      return "Sorry, I couldn't retrieve today's tasks. Please try again.";
    }
  }

  /**
   * Get tasks due this week
   */
  private async getTasksDueThisWeek(workspaceId: string, userId: string, projectIds: string[]): Promise<string> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const result = await this.db.table('tasks')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('status', '!=', 'done')
        .where('due_date', '>=', today.toISOString())
        .where('due_date', '<', weekEnd.toISOString())
        .orderBy('due_date', 'ASC')
        .execute();

      const tasks = Array.isArray(result.data) ? result.data : [];

      if (tasks.length === 0) {
        return "You have no tasks due this week! 🎯";
      }

      let response = `📆 **Tasks Due This Week** (${tasks.length})\n\n`;
      tasks.forEach((task, index) => {
        response += `${index + 1}. **${task.title}**\n`;
        if (task.due_date) {
          response += `   Due: ${new Date(task.due_date).toLocaleDateString()}\n`;
        }
        response += `   Status: ${task.status || 'todo'}\n`;
        if (task.priority) response += `   Priority: ${task.priority}\n`;
        response += `\n`;
      });

      return response;
    } catch (error) {
      this.logger.error('[BotHandler] Error getting tasks due this week:', error);
      return "Sorry, I couldn't retrieve this week's tasks. Please try again.";
    }
  }

  /**
   * Get subtasks
   */
  private async getSubtasks(workspaceId: string, userId: string, taskName: string | undefined, projectIds: string[]): Promise<string> {
    try {
      if (!taskName) {
        return "Which task would you like to see subtasks for?";
      }

      // Find parent task
      const parentResult = await this.db.table('tasks')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('title', 'LIKE', `%${taskName}%`)
        .limit(1)
        .execute();

      const parentTasks = Array.isArray(parentResult.data) ? parentResult.data : [];
      if (parentTasks.length === 0) {
        return `Task "${taskName}" not found.`;
      }

      const parentTask = parentTasks[0];

      // Get subtasks
      const result = await this.db.table('tasks')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('parent_task_id', '=', parentTask.id)
        .orderBy('created_at', 'ASC')
        .execute();

      const subtasks = Array.isArray(result.data) ? result.data : [];

      if (subtasks.length === 0) {
        return `No subtasks found for "${parentTask.title}".`;
      }

      let response = `📝 **Subtasks of "${parentTask.title}"** (${subtasks.length})\n\n`;
      subtasks.forEach((task, index) => {
        const statusEmoji = task.status === 'done' ? '✅' : '⬜';
        response += `${statusEmoji} ${index + 1}. **${task.title}**\n`;
        response += `   Status: ${task.status || 'todo'}\n`;
        if (task.priority) response += `   Priority: ${task.priority}\n`;
        response += `\n`;
      });

      return response;
    } catch (error) {
      this.logger.error('[BotHandler] Error getting subtasks:', error);
      return "Sorry, I couldn't retrieve subtasks. Please try again.";
    }
  }

  /**
   * Get week events
   */
  private async getWeekEvents(workspaceId: string, userId: string, eventIds: string[]): Promise<string> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const result = await this.db.table('events')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('start_time', '>=', today.toISOString())
        .where('start_time', '<', weekEnd.toISOString())
        .orderBy('start_time', 'ASC')
        .execute();

      const events = Array.isArray(result.data) ? result.data : [];

      if (events.length === 0) {
        return "You have no events scheduled this week! 📅";
      }

      let response = `📆 **This Week's Events** (${events.length})\n\n`;
      events.forEach((event, index) => {
        const startTime = new Date(event.start_time);
        response += `${index + 1}. **${event.title}**\n`;
        response += `   ${startTime.toLocaleDateString()} at ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n`;
        if (event.location) response += `   Location: ${event.location}\n`;
        response += `\n`;
      });

      return response;
    } catch (error) {
      this.logger.error('[BotHandler] Error getting week events:', error);
      return "Sorry, I couldn't retrieve this week's events. Please try again.";
    }
  }

  /**
   * Get month events
   */
  private async getMonthEvents(workspaceId: string, userId: string, eventIds: string[]): Promise<string> {
    try {
      const today = new Date();
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const result = await this.db.table('events')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('start_time', '>=', monthStart.toISOString())
        .where('start_time', '<=', monthEnd.toISOString())
        .orderBy('start_time', 'ASC')
        .execute();

      const events = Array.isArray(result.data) ? result.data : [];

      if (events.length === 0) {
        return "You have no events scheduled this month! 📅";
      }

      let response = `📆 **This Month's Events** (${events.length})\n\n`;
      events.forEach((event, index) => {
        const startTime = new Date(event.start_time);
        response += `${index + 1}. **${event.title}**\n`;
        response += `   ${startTime.toLocaleDateString()} at ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n`;
        if (event.location) response += `   Location: ${event.location}\n`;
        response += `\n`;
      });

      return response;
    } catch (error) {
      this.logger.error('[BotHandler] Error getting month events:', error);
      return "Sorry, I couldn't retrieve this month's events. Please try again.";
    }
  }

  /**
   * Get past events
   */
  private async getPastEvents(workspaceId: string, userId: string, eventIds: string[]): Promise<string> {
    try {
      const now = new Date().toISOString();

      const result = await this.db.table('events')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('end_time', '<', now)
        .orderBy('start_time', 'DESC')
        .limit(20)
        .execute();

      const events = Array.isArray(result.data) ? result.data : [];

      if (events.length === 0) {
        return "No past events found.";
      }

      let response = `📜 **Past Events** (showing recent ${events.length})\n\n`;
      events.forEach((event, index) => {
        const startTime = new Date(event.start_time);
        response += `${index + 1}. **${event.title}**\n`;
        response += `   ${startTime.toLocaleDateString()} at ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n`;
        if (event.location) response += `   Location: ${event.location}\n`;
        response += `\n`;
      });

      return response;
    } catch (error) {
      this.logger.error('[BotHandler] Error getting past events:', error);
      return "Sorry, I couldn't retrieve past events. Please try again.";
    }
  }

  /**
   * Get event details
   */
  private async getEventDetails(workspaceId: string, userId: string, eventName: string, eventIds: string[]): Promise<string> {
    try {
      if (!eventName) {
        return "Which event would you like details for?";
      }

      const result = await this.db.table('events')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('title', 'LIKE', `%${eventName}%`)
        .limit(1)
        .execute();

      const events = Array.isArray(result.data) ? result.data : [];
      if (events.length === 0) {
        return `Event "${eventName}" not found.`;
      }

      const event = events[0];
      const startTime = new Date(event.start_time);
      const endTime = event.end_time ? new Date(event.end_time) : null;

      let response = `📅 **Event Details: ${event.title}**\n\n`;
      response += `🕐 **When:** ${startTime.toLocaleDateString()} at ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      if (endTime) {
        response += ` - ${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
      response += `\n`;

      if (event.location) response += `📍 **Location:** ${event.location}\n`;
      if (event.description) response += `📝 **Description:** ${event.description}\n`;
      if (event.meeting_url) response += `🔗 **Meeting Link:** ${event.meeting_url}\n`;

      // Get participants if available
      if (event.participants && Array.isArray(event.participants)) {
        response += `\n👥 **Participants:** ${event.participants.length}\n`;
      }

      return response;
    } catch (error) {
      this.logger.error('[BotHandler] Error getting event details:', error);
      return "Sorry, I couldn't retrieve event details. Please try again.";
    }
  }

  /**
   * Get project details
   */
  private async getProjectDetails(workspaceId: string, userId: string, projectName: string, projectIds: string[]): Promise<string> {
    try {
      if (!projectName) {
        return "Which project would you like details for?";
      }

      const result = await this.db.table('projects')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('name', 'LIKE', `%${projectName}%`)
        .limit(1)
        .execute();

      const projects = Array.isArray(result.data) ? result.data : [];
      if (projects.length === 0) {
        return `Project "${projectName}" not found.`;
      }

      const project = projects[0];

      // Get task count
      const taskResult = await this.db.table('tasks')
        .select('*')
        .where('project_id', '=', project.id)
        .execute();
      const taskCount = Array.isArray(taskResult.data) ? taskResult.data.length : 0;

      let response = `📁 **Project Details: ${project.name}**\n\n`;
      if (project.description) response += `📝 **Description:** ${project.description}\n\n`;
      response += `📊 **Status:** ${project.status || 'Active'}\n`;
      response += `✅ **Tasks:** ${taskCount}\n`;
      if (project.created_at) {
        response += `📅 **Created:** ${new Date(project.created_at).toLocaleDateString()}\n`;
      }

      return response;
    } catch (error) {
      this.logger.error('[BotHandler] Error getting project details:', error);
      return "Sorry, I couldn't retrieve project details. Please try again.";
    }
  }

  /**
   * Search projects
   */
  private async searchProjects(workspaceId: string, userId: string, query: string, projectIds: string[]): Promise<string> {
    try {
      const result = await this.db.table('projects')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('name', 'LIKE', `%${query}%`)
        .execute();

      const projects = Array.isArray(result.data) ? result.data : [];

      if (projects.length === 0) {
        return `No projects found matching "${query}".`;
      }

      let response = `🔍 **Search Results: "${query}"** (${projects.length} projects)\n\n`;
      projects.forEach((project, index) => {
        response += `${index + 1}. **${project.name}**\n`;
        if (project.description) response += `   ${project.description.substring(0, 100)}...\n`;
        response += `   Status: ${project.status || 'Active'}\n\n`;
      });

      return response;
    } catch (error) {
      this.logger.error('[BotHandler] Error searching projects:', error);
      return "Sorry, I couldn't search projects. Please try again.";
    }
  }

  /**
   * Search tasks
   */
  private async searchTasks(workspaceId: string, userId: string, query: string, projectIds: string[]): Promise<string> {
    try {
      const result = await this.db.table('tasks')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('title', 'LIKE', `%${query}%`)
        .execute();

      const tasks = Array.isArray(result.data) ? result.data : [];

      if (tasks.length === 0) {
        return `No tasks found matching "${query}".`;
      }

      let response = `🔍 **Search Results: "${query}"** (${tasks.length} tasks)\n\n`;
      tasks.forEach((task, index) => {
        response += `${index + 1}. **${task.title}**\n`;
        response += `   Status: ${task.status || 'todo'}`;
        if (task.priority) response += ` | Priority: ${task.priority}`;
        if (task.due_date) response += ` | Due: ${new Date(task.due_date).toLocaleDateString()}`;
        response += `\n\n`;
      });

      return response;
    } catch (error) {
      this.logger.error('[BotHandler] Error searching tasks:', error);
      return "Sorry, I couldn't search tasks. Please try again.";
    }
  }

  /**
   * Search events
   */
  private async searchEvents(workspaceId: string, userId: string, query: string, eventIds: string[]): Promise<string> {
    try {
      const result = await this.db.table('events')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('title', 'LIKE', `%${query}%`)
        .execute();

      const events = Array.isArray(result.data) ? result.data : [];

      if (events.length === 0) {
        return `No events found matching "${query}".`;
      }

      let response = `🔍 **Search Results: "${query}"** (${events.length} events)\n\n`;
      events.forEach((event, index) => {
        const startTime = new Date(event.start_time);
        response += `${index + 1}. **${event.title}**\n`;
        response += `   ${startTime.toLocaleDateString()} at ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n`;
        if (event.location) response += `   Location: ${event.location}\n`;
        response += `\n`;
      });

      return response;
    } catch (error) {
      this.logger.error('[BotHandler] Error searching events:', error);
      return "Sorry, I couldn't search events. Please try again.";
    }
  }

  // ========================================
  // COMPLEX OPERATIONS - ROUTE TO AUTOPILOT
  // ========================================

  /**
   * Route complex operations to Autopilot for natural language processing
   */
  private async routeToAutopilot(workspaceId: string, userId: string, command: string): Promise<string> {
    try {
      this.logger.log(`[BotHandler] Routing to Autopilot: "${command.substring(0, 50)}..."`);

      const result = await this.autopilotService.executeCommand(
        {
          command,
          workspaceId,
          sessionId: `bot-${workspaceId}-${userId}`,
          executeActions: true,
        },
        userId,
      );

      // Return the autopilot response
      return result.message || "I've processed your request.";
    } catch (error) {
      this.logger.error('[BotHandler] Autopilot routing error:', error);
      return "I had trouble processing that request. Please try rephrasing or use the 'help' command.";
    }
  }

  private async createProject(workspaceId: string, userId: string, entities: any): Promise<string> {
    const projectName = entities.projectName || entities.description;
    if (!projectName) {
      return "What would you like to name the project?";
    }
    return this.routeToAutopilot(workspaceId, userId, `Create a project called "${projectName}"`);
  }

  private async updateProject(workspaceId: string, userId: string, entities: any): Promise<string> {
    return this.routeToAutopilot(workspaceId, userId, `Update project ${entities.projectName || ''} with ${entities.value || ''}`);
  }

  private async deleteProject(workspaceId: string, userId: string, entities: any): Promise<string> {
    return this.routeToAutopilot(workspaceId, userId, `Delete project ${entities.projectName || ''}`);
  }

  private async addProjectMember(workspaceId: string, userId: string, entities: any): Promise<string> {
    return this.routeToAutopilot(workspaceId, userId, `Add ${entities.memberName || ''} to project ${entities.projectName || ''}`);
  }

  private async removeProjectMember(workspaceId: string, userId: string, entities: any): Promise<string> {
    return this.routeToAutopilot(workspaceId, userId, `Remove ${entities.memberName || ''} from project ${entities.projectName || ''}`);
  }

  private async updateProjectStatus(workspaceId: string, userId: string, entities: any): Promise<string> {
    return this.routeToAutopilot(workspaceId, userId, `Update project ${entities.projectName || ''} status to ${entities.status || ''}`);
  }

  private async duplicateProject(workspaceId: string, userId: string, entities: any): Promise<string> {
    return this.routeToAutopilot(workspaceId, userId, `Duplicate project ${entities.projectName || ''}`);
  }

  private async createTask(workspaceId: string, userId: string, entities: any): Promise<string> {
    const taskName = entities.taskName || entities.description;
    if (!taskName) {
      return "What would you like to call the task?";
    }
    let command = `Create a task called "${taskName}"`;
    if (entities.projectName) command += ` in project ${entities.projectName}`;
    if (entities.dueDate) command += ` due ${entities.dueDate}`;
    if (entities.priority) command += ` with ${entities.priority} priority`;
    return this.routeToAutopilot(workspaceId, userId, command);
  }

  private async createSubtask(workspaceId: string, userId: string, entities: any): Promise<string> {
    return this.routeToAutopilot(workspaceId, userId, `Create subtask "${entities.taskName || ''}" under ${entities.value || 'parent task'}`);
  }

  private async assignTask(workspaceId: string, userId: string, entities: any): Promise<string> {
    return this.routeToAutopilot(workspaceId, userId, `Assign task ${entities.taskName || ''} to ${entities.assignee || ''}`);
  }

  private async unassignTask(workspaceId: string, userId: string, entities: any): Promise<string> {
    return this.routeToAutopilot(workspaceId, userId, `Unassign task ${entities.taskName || ''}`);
  }

  private async updateTaskDescription(workspaceId: string, userId: string, entities: any): Promise<string> {
    return this.routeToAutopilot(workspaceId, userId, `Update task ${entities.taskName || ''} description to ${entities.description || ''}`);
  }

  private async setTaskPriority(workspaceId: string, userId: string, entities: any): Promise<string> {
    return this.routeToAutopilot(workspaceId, userId, `Set task ${entities.taskName || ''} priority to ${entities.priority || ''}`);
  }

  private async setTaskDueDate(workspaceId: string, userId: string, entities: any): Promise<string> {
    return this.routeToAutopilot(workspaceId, userId, `Set task ${entities.taskName || ''} due date to ${entities.dueDate || ''}`);
  }

  private async deleteTask(workspaceId: string, userId: string, entities: any): Promise<string> {
    return this.routeToAutopilot(workspaceId, userId, `Delete task ${entities.taskName || ''}`);
  }

  private async reopenTask(workspaceId: string, userId: string, entities: any): Promise<string> {
    return this.routeToAutopilot(workspaceId, userId, `Reopen task ${entities.taskName || ''}`);
  }

  private async addTaskComment(workspaceId: string, userId: string, entities: any): Promise<string> {
    return this.routeToAutopilot(workspaceId, userId, `Add comment to task ${entities.taskName || ''}: ${entities.comment || ''}`);
  }

  private async createEvent(workspaceId: string, userId: string, entities: any): Promise<string> {
    const eventName = entities.eventName || entities.description;
    if (!eventName) {
      return "What would you like to call the event?";
    }
    let command = `Create event "${eventName}"`;
    if (entities.date) command += ` on ${entities.date}`;
    if (entities.time) command += ` at ${entities.time}`;
    if (entities.location) command += ` at ${entities.location}`;
    if (entities.duration) command += ` for ${entities.duration}`;
    return this.routeToAutopilot(workspaceId, userId, command);
  }

  private async rescheduleEvent(workspaceId: string, userId: string, entities: any): Promise<string> {
    let command = `Reschedule event ${entities.eventName || ''}`;
    if (entities.date) command += ` to ${entities.date}`;
    if (entities.time) command += ` at ${entities.time}`;
    return this.routeToAutopilot(workspaceId, userId, command);
  }

  private async updateEventLocation(workspaceId: string, userId: string, entities: any): Promise<string> {
    return this.routeToAutopilot(workspaceId, userId, `Update event ${entities.eventName || ''} location to ${entities.location || ''}`);
  }

  private async cancelEvent(workspaceId: string, userId: string, entities: any): Promise<string> {
    return this.routeToAutopilot(workspaceId, userId, `Cancel event ${entities.eventName || ''}`);
  }

  private async addEventParticipant(workspaceId: string, userId: string, entities: any): Promise<string> {
    return this.routeToAutopilot(workspaceId, userId, `Add ${entities.participant || ''} to event ${entities.eventName || ''}`);
  }

  private async removeEventParticipant(workspaceId: string, userId: string, entities: any): Promise<string> {
    return this.routeToAutopilot(workspaceId, userId, `Remove ${entities.participant || ''} from event ${entities.eventName || ''}`);
  }

  private async duplicateEvent(workspaceId: string, userId: string, entities: any): Promise<string> {
    return this.routeToAutopilot(workspaceId, userId, `Duplicate event ${entities.eventName || ''}`);
  }

  // ========================================
  // MESSAGING & COMMUNICATION METHODS
  // ========================================

  /**
   * Get or create a DM conversation between bot and target user
   */
  private async getOrCreateBotDMConversation(
    workspaceId: string,
    botId: string,
    targetUserId: string
  ): Promise<any> {
    try {
      const botUserId = `bot:${botId}`;

      // First, check if a conversation already exists between bot and target user
      const existingConversationsResult = await this.db
        .table('conversations')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .execute();

      const existingConversations = Array.isArray(existingConversationsResult)
        ? existingConversationsResult
        : (existingConversationsResult.data || []);

      this.logger.debug(`[BotDM] Found ${existingConversations.length} conversations in workspace`);

      // Check each conversation to see if it's a DM between bot and target user
      const expectedParticipants = [botUserId, targetUserId].sort();

      for (const conv of existingConversations) {
        const participants = typeof conv.participants === 'string'
          ? JSON.parse(conv.participants)
          : (conv.participants || []);

        const sortedParticipants = [...participants].sort();

        // If participants match exactly, use this conversation
        if (JSON.stringify(sortedParticipants) === JSON.stringify(expectedParticipants)) {
          this.logger.debug(`[BotDM] Found existing conversation ${conv.id} between bot and user`);
          return conv;
        }
      }

      // No existing conversation found, create a new one
      this.logger.debug(`[BotDM] No existing conversation found, creating new one`);
      const conversation = await this.chatService.createConversation(
        workspaceId,
        { participants: [targetUserId] }, // Other participant
        botUserId // Bot is the creator
      );

      this.logger.debug(`[BotDM] Created new conversation ${conversation.id}`);
      return conversation;
    } catch (error) {
      this.logger.error(`Failed to get/create bot DM conversation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send a direct message from bot to a user
   */
  private async sendBotDirectMessage(
    workspaceId: string,
    botId: string,
    targetUserId: string,
    messageContent: string
  ): Promise<{ success: boolean; conversationId?: string; error?: string }> {
    try {
      const botUserId = `bot:${botId}`;

      // Get or create DM conversation between bot and target user
      const conversation = await this.getOrCreateBotDMConversation(workspaceId, botId, targetUserId);

      if (!conversation || !conversation.id) {
        return { success: false, error: 'Failed to create conversation' };
      }

      // Send message as bot in that conversation
      const message = await this.chatService.sendMessage(
        {
          conversation_id: conversation.id,
          content: messageContent,
          content_html: this.convertMarkdownToHtml(messageContent),
        },
        botUserId // Bot is the sender
      );

      // Note: chatService.sendMessage already emits WebSocket events via AppGateway
      // But we emit additional events here to ensure bot messages are delivered
      if (this.appGateway && message) {
        const messagePayload = {
          ...message,
          user: {
            id: botUserId,
            isBot: true,
          },
        };

        // 1. Emit to conversation room using AppGateway (same as person-to-person)
        this.appGateway.emitToRoom(`conversation:${conversation.id}`, 'message:new', {
          message: messagePayload,
          conversation_id: conversation.id,
        });
        this.logger.debug(`[BotHandler] Emitted message:new to conversation room ${conversation.id}`);

        // 2. Get conversation participants to emit workspace notifications
        try {
          const participants = conversation.participants || [];
          const participantIds = participants.filter(id => !id.startsWith('bot:'));

          // Emit to each participant's workspace+user room (same as person-to-person)
          if (participantIds.length > 0) {
            this.appGateway.emitToWorkspaceUsers(workspaceId, participantIds, 'message:new:workspace', {
              message: messagePayload,
              conversation_id: conversation.id,
              type: 'conversation',
            });
            this.logger.debug(`[BotHandler] Emitted workspace notifications to ${participantIds.length} participants`);
          }
        } catch (error) {
          this.logger.error(`Failed to emit workspace notifications: ${error.message}`);
        }

        // 3. Emit conversation update event so the conversation list refreshes
        this.chatGateway.notifyWorkspace(workspaceId, 'conversation:updated', {
          conversationId: conversation.id,
          lastMessage: message,
          lastMessageAt: message.created_at,
        });
        this.logger.debug(`[BotHandler] Emitted conversation:updated to refresh conversation list`);
      }

      return { success: true, conversationId: conversation.id };
    } catch (error) {
      this.logger.error(`Failed to send bot direct message: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send message to task or project assignee (chained operation)
   */
  private async sendMessageToAssignee(workspaceId: string, userId: string, botId: string, originalMessage: string, entities: any): Promise<string> {
    const entityName = entities.taskName || entities.projectName;
    const entityType = entities.taskName ? 'task' : 'project';
    let messageContent = entities.messageContent || entities.comment || '';

    if (!entityName) {
      return "Which task or project's assignee would you like to message?";
    }

    // Extract message content if not provided
    if (!messageContent) {
      const patterns = [
        /to\s+(?:review|check|look at|see)\s+(?:it|this|that)/i,
        /about\s+(.+)/i,
        /that\s+(.+)/i,
        /:\s+(.+)/i,
      ];

      for (const pattern of patterns) {
        const match = originalMessage.match(pattern);
        if (match && match[1]) {
          messageContent = match[1].trim();
          break;
        }
      }

      if (!messageContent) {
        messageContent = `Please check the ${entityType} "${entityName}".`;
      }
    }

    try {
      let assigneeIds: string[] = [];

      if (entityType === 'task') {
        // Find task and get assignees
        const tasksResult = await this.db
          .table('tasks')
          .select('*')
          .limit(50)
          .execute();

        const tasks = Array.isArray(tasksResult) ? tasksResult : (tasksResult.data || []);
        const task = tasks.find((t: any) => t.title?.toLowerCase().includes(entityName.toLowerCase()));

        if (!task) {
          return `I couldn't find a task named "${entityName}". Please check the task name and try again.`;
        }

        const assignees = task.assigned_to || [];
        assigneeIds = Array.isArray(assignees) ? assignees : [];

        if (assigneeIds.length === 0) {
          return `The task "${task.title}" doesn't have any assignees yet.`;
        }
      } else {
        // Find project and get owner/assignees
        const projectsResult = await this.db
          .table('projects')
          .select('*')
          .where('workspace_id', '=', workspaceId)
          .execute();

        const projects = Array.isArray(projectsResult) ? projectsResult : (projectsResult.data || []);
        const project = projects.find((p: any) => p.name?.toLowerCase().includes(entityName.toLowerCase()));

        if (!project) {
          return `I couldn't find a project named "${entityName}". Please check the project name and try again.`;
        }

        // For projects, use the owner as the assignee
        if (project.owner_id || project.created_by || project.user_id) {
          assigneeIds = [project.owner_id || project.created_by || project.user_id];
        } else {
          return `The project "${project.name}" doesn't have an owner assigned.`;
        }
      }

      // Send DMs to all assignees
      let successCount = 0;
      const errors: string[] = [];

      for (const assigneeId of assigneeIds) {
        const result = await this.sendBotDirectMessage(workspaceId, botId, assigneeId, messageContent);
        if (result.success) {
          successCount++;
        } else {
          errors.push(result.error || 'Unknown error');
        }
      }

      if (successCount === assigneeIds.length) {
        const recipientText = assigneeIds.length === 1 ? 'the assignee' : `${assigneeIds.length} assignees`;
        return `✅ **Message sent!**\n\nI've sent a direct message to ${recipientText} of ${entityType} "${entityName}":\n\n"${messageContent}"\n\nThey can check their DMs to see it.`;
      } else if (successCount > 0) {
        return `⚠️ **Partially sent**\n\nI sent the message to ${successCount} out of ${assigneeIds.length} assignees. Some messages failed to send.`;
      } else {
        return `❌ Failed to send the message. Errors: ${errors.join(', ')}`;
      }
    } catch (error) {
      this.logger.error(`Error sending message to assignee: ${error.message}`);
      return `Sorry, I encountered an error while trying to send the message. Please try again.`;
    }
  }

  /**
   * Send message to event participant (chained operation)
   */
  private async sendMessageToParticipant(workspaceId: string, userId: string, botId: string, originalMessage: string, entities: any): Promise<string> {
    const eventName = entities.eventName;
    const participantName = entities.participant || entities.recipientName;
    const messageContent = entities.messageContent || entities.comment || '';

    if (!eventName) {
      return "Which event's participants would you like to message?";
    }

    let command = `Find `;
    if (participantName) {
      command += `participant ${participantName} of event "${eventName}" and send them a message`;
    } else {
      command += `participants of event "${eventName}" and send them a message`;
    }

    if (messageContent) {
      command += `: "${messageContent}"`;
    } else {
      command = originalMessage;
    }

    return this.routeToAutopilot(workspaceId, userId, command);
  }

  /**
   * Send message to project member (chained operation)
   */
  private async sendMessageToMember(workspaceId: string, userId: string, botId: string, originalMessage: string, entities: any): Promise<string> {
    const projectName = entities.projectName;
    const memberName = entities.memberName || entities.recipientName;
    const messageContent = entities.messageContent || entities.comment || '';

    if (!projectName) {
      return "Which project's members would you like to message?";
    }

    let command = `Find `;
    if (memberName) {
      command += `member ${memberName} in project "${projectName}" and send them a message`;
    } else {
      command += `members of project "${projectName}" and send them a message`;
    }

    if (messageContent) {
      command += `: "${messageContent}"`;
    } else {
      command = originalMessage;
    }

    return this.routeToAutopilot(workspaceId, userId, command);
  }

  /**
   * Send direct message to specific user by name/email
   */
  private async sendMessageToUser(workspaceId: string, userId: string, botId: string, originalMessage: string, entities: any): Promise<string> {
    const recipientName = entities.recipientName || entities.assignee || entities.memberName;
    let messageContent = entities.messageContent || entities.comment || '';

    if (!recipientName) {
      return "Who would you like to send a message to?";
    }

    // If no explicit message content, extract it from the original message
    if (!messageContent) {
      // Try to extract message after "send X a message about/that/:"
      const patterns = [
        /send.*?message\s+(?:about|that|saying|:)\s+(.+)/i,
        /tell.*?(?:about|that|:)\s+(.+)/i,
        /message.*?(?:about|that|:)\s+(.+)/i,
      ];

      for (const pattern of patterns) {
        const match = originalMessage.match(pattern);
        if (match && match[1]) {
          messageContent = match[1].trim();
          break;
        }
      }

      if (!messageContent) {
        messageContent = "You have a message from the productivity assistant.";
      }
    }

    try {
      // Find user in workspace by name or email
      const workspaceMembersResult = await this.db
        .table('workspace_members')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .execute();

      const members = Array.isArray(workspaceMembersResult) ? workspaceMembersResult : (workspaceMembersResult.data || []);

      let targetUserId: string | null = null;

      // Try to find user by name or email
      for (const member of members) {
        try {
          const user = await this.db.getUserById(member.user_id);
          if (user) {
            const nameMatch = user.name?.toLowerCase().includes(recipientName.toLowerCase());
            const emailMatch = user.email?.toLowerCase().includes(recipientName.toLowerCase());
            const usernameMatch = user.username?.toLowerCase().includes(recipientName.toLowerCase());

            if (nameMatch || emailMatch || usernameMatch) {
              targetUserId = member.user_id;
              break;
            }
          }
        } catch (error) {
          this.logger.warn(`Failed to fetch user ${member.user_id}: ${error.message}`);
        }
      }

      if (!targetUserId) {
        return `I couldn't find a user named "${recipientName}" in this workspace. Please check the name and try again.`;
      }

      // Send DM as bot
      const result = await this.sendBotDirectMessage(workspaceId, botId, targetUserId, messageContent);

      if (result.success) {
        return `✅ **Message sent!**\n\nI've sent a direct message to ${recipientName}:\n\n"${messageContent}"\n\nThey can check their DMs to see it.`;
      } else {
        return `Sorry, I couldn't send the message to ${recipientName}. Error: ${result.error}`;
      }
    } catch (error) {
      this.logger.error(`Error sending message to user: ${error.message}`);
      return `Sorry, I encountered an error while trying to send the message. Please try again.`;
    }
  }

  /**
   * Send message to all project team members
   */
  private async messageProjectTeam(workspaceId: string, userId: string, botId: string, originalMessage: string, entities: any): Promise<string> {
    const projectName = entities.projectName;
    const messageContent = entities.messageContent || entities.comment || '';

    if (!projectName) {
      return "Which project team would you like to message?";
    }

    let command = `Send a message to all members of project "${projectName}"`;
    if (messageContent) {
      command += `: "${messageContent}"`;
    } else {
      command = originalMessage;
    }

    return this.routeToAutopilot(workspaceId, userId, command);
  }

  /**
   * Send message to all event participants
   */
  private async messageEventParticipants(workspaceId: string, userId: string, botId: string, originalMessage: string, entities: any): Promise<string> {
    const eventName = entities.eventName;
    const messageContent = entities.messageContent || entities.comment || '';

    if (!eventName) {
      return "Which event's participants would you like to message?";
    }

    let command = `Send a message to all participants of event "${eventName}"`;
    if (messageContent) {
      command += `: "${messageContent}"`;
    } else {
      command = originalMessage;
    }

    return this.routeToAutopilot(workspaceId, userId, command);
  }
}
