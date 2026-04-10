import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PDFParse } = require('pdf-parse');
import { LangChainAgentService } from './langchain/agent.service';
import { AgentMemoryService } from './langchain/memory.service';
import { AgentToolsService } from './langchain/tools.service';
import { DatabaseService } from '../database/database.service';
import { AiProviderService } from '../ai-provider/ai-provider.service';
import {
  ExecuteCommandDto,
  AutoPilotResponseDto,
  ExecutedAction,
  ConversationMessage,
  ActionFeedbackDto,
  AutoPilotCapability,
  SmartSuggestionDto,
  SmartSuggestionsResponseDto,
} from './dto/autopilot.dto';

@Injectable()
export class AutoPilotService {
  private readonly logger = new Logger(AutoPilotService.name);

  constructor(
    private readonly agentService: LangChainAgentService,
    private readonly memoryService: AgentMemoryService,
    private readonly toolsService: AgentToolsService,
    private readonly db: DatabaseService,
  ) {}

  // Legacy alias for the AI provider - delegates to db.getAI() until a real
  // AIProviderService is wired in.
  private get aiProvider(): any {
    return this.db.getAI();
  }

  /**
   * Check if the command is a help request
   */
  private isHelpCommand(command: string): boolean {
    const normalizedCommand = command.trim().toLowerCase();
    return normalizedCommand === 'help' ||
           normalizedCommand === '/help' ||
           normalizedCommand === '?' ||
           normalizedCommand === 'what can you do' ||
           normalizedCommand === 'what can you do?' ||
           normalizedCommand.startsWith('help me');
  }

  /**
   * Generate the help message with all capabilities
   */
  private generateHelpMessage(language: string = 'en'): string {
    const capabilities = this.getCapabilities();

    // Group capabilities by category for a cleaner layout
    const categoryEmojis: Record<string, string> = {
      calendar: '📅',
      tasks: '✅',
      chat: '💬',
      files: '📂',
      notes: '📝',
      email: '📧',
      video: '🎥',
      projects: '📊',
      workspace: '🏢',
      summary: '📈',
    };

    const translations = this.getHelpMessageTranslations(language);

    let helpMessage = `**Auto Pilot** - ${translations.subtitle}\n\n`;
    helpMessage += `${translations.intro}\n\n`;

    for (const capability of capabilities) {
      const emoji = categoryEmojis[capability.category] || '🔧';
      helpMessage += `${emoji} **${capability.name}**\n`;
      helpMessage += `${capability.description}\n`;
      // Show only first 2 examples for brevity
      const exampleCount = Math.min(2, capability.examples.length);
      for (let i = 0; i < exampleCount; i++) {
        helpMessage += `• *"${capability.examples[i]}"*\n`;
      }
      helpMessage += '\n';
    }

    helpMessage += `---\n\n`;
    helpMessage += `**${translations.tipsTitle}**\n`;
    helpMessage += `• ${translations.tip1}\n`;
    helpMessage += `• ${translations.tip2}\n`;
    helpMessage += `• ${translations.tip3}\n`;
    helpMessage += `• ${translations.tip4}\n\n`;
    helpMessage += translations.getStarted;

    return helpMessage;
  }

  /**
   * Get help message translations
   */
  private getHelpMessageTranslations(language: string): {
    subtitle: string;
    intro: string;
    tipsTitle: string;
    tip1: string;
    tip2: string;
    tip3: string;
    tip4: string;
    getStarted: string;
  } {
    const translations: Record<string, any> = {
      en: {
        subtitle: 'Your AI Workspace Assistant',
        intro: "Here's what I can help you with:",
        tipsTitle: 'Tips:',
        tip1: 'Be specific in your requests for best results',
        tip2: 'Attach files (PDF, images, text) for analysis',
        tip3: 'Use the link button to reference tasks, notes, or events',
        tip4: 'I remember our conversation for follow-ups',
        getStarted: 'Type anything to get started!',
      },
      ja: {
        subtitle: 'あなたのAIワークスペースアシスタント',
        intro: '以下のことをお手伝いできます：',
        tipsTitle: 'ヒント：',
        tip1: '最良の結果を得るには、具体的にリクエストしてください',
        tip2: '分析のためにファイル（PDF、画像、テキスト）を添付できます',
        tip3: 'リンクボタンを使用してタスク、ノート、イベントを参照できます',
        tip4: 'フォローアップのために会話を記憶しています',
        getStarted: '何でも入力して始めましょう！',
      },
    };

    return translations[language] || translations['en'];
  }

  /**
   * Execute a natural language command
   */
  async executeCommand(
    dto: ExecuteCommandDto,
    userId: string,
    userLanguage: string = 'en',
  ): Promise<AutoPilotResponseDto> {
    const sessionId = dto.sessionId || uuidv4();
    const executeActions = dto.executeActions !== false;

    this.logger.log(`[AutoPilot] Processing command: "${dto.command.substring(0, 50)}..." [Language: ${userLanguage}]`);
    this.logger.log(`[AutoPilot] Session: ${sessionId}, User: ${userId}, Execute: ${executeActions}`);

    // Handle help command specially
    if (this.isHelpCommand(dto.command)) {
      const helpMessage = this.generateHelpMessage(userLanguage);

      // Save to memory
      await this.memoryService.addMessage(
        sessionId,
        { role: 'user', content: dto.command, timestamp: new Date().toISOString() },
        { workspaceId: dto.workspaceId, userId },
      );
      await this.memoryService.addMessage(sessionId, {
        role: 'assistant',
        content: helpMessage,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        sessionId,
        message: helpMessage,
        actions: [],
      };
    }

    try {
      // Save user message to memory (pass context for new session creation)
      await this.memoryService.addMessage(
        sessionId,
        {
          role: 'user',
          content: dto.command,
          timestamp: new Date().toISOString(),
        },
        { workspaceId: dto.workspaceId, userId },
      );

      // Store any new referenced items from this message
      const currentReferencedItems = dto.context?.referencedItems || [];
      if (currentReferencedItems.length > 0) {
        await this.memoryService.addReferencedItems(sessionId, currentReferencedItems);
        this.logger.log(`[AutoPilot] Stored ${currentReferencedItems.length} referenced items in session`);
      }

      // Get all referenced items from the session (including previously referenced items)
      const allReferencedItems = await this.memoryService.getReferencedItems(sessionId);

      // Build context for the agent with merged referenced items
      const context = {
        userId,
        workspaceId: dto.workspaceId,
        sessionId,
        executeActions,
        ...dto.context,
        referencedItems: allReferencedItems, // Use all session references
      };

      // Execute the agent
      const result = await this.agentService.execute(dto.command, context);

      // Build response
      const response: AutoPilotResponseDto = {
        success: true,
        sessionId,
        message: result.output,
        actions: result.actions || [],
        suggestions: this.generateSuggestions(dto.command, result.actions),
        reasoning: result.reasoning,
      };

      // Save assistant response to memory
      await this.memoryService.addMessage(sessionId, {
        role: 'assistant',
        content: result.output,
        timestamp: new Date().toISOString(),
        actions: result.actions,
      });

      this.logger.log(`[AutoPilot] Command completed. Actions: ${result.actions?.length || 0}`);
      return response;

    } catch (error) {
      this.logger.error(`[AutoPilot] Error: ${error.message}`, error.stack);

      // Check if it's an AI service error
      const isAIError = error.message?.includes('AI service error') ||
                        error.message?.includes('AI text generation failed') ||
                        error.message?.includes('Invalid token');

      return {
        success: false,
        sessionId,
        message: isAIError
          ? 'I encountered an issue with the AI service. Please try again in a moment.'
          : 'I encountered an error while processing your request. Please try again.',
        actions: [],
        error: error.message,
      };
    }
  }

  /**
   * Execute a natural language command with streaming response
   */
  async executeCommandStream(
    dto: ExecuteCommandDto,
    userId: string,
    onStream: (event: { type: string; data: any }) => void,
    userLanguage: string = 'en',
  ): Promise<AutoPilotResponseDto> {
    const sessionId = dto.sessionId || uuidv4();
    const executeActions = dto.executeActions !== false;

    this.logger.log(`[AutoPilot] Processing command (streaming): "${dto.command.substring(0, 50)}..." [Language: ${userLanguage}]`);

    // Handle help command specially (no need for AI)
    if (this.isHelpCommand(dto.command)) {
      const helpMessage = this.generateHelpMessage(userLanguage);

      // Save to memory
      await this.memoryService.addMessage(
        sessionId,
        { role: 'user', content: dto.command, timestamp: new Date().toISOString() },
        { workspaceId: dto.workspaceId, userId },
      );
      await this.memoryService.addMessage(sessionId, {
        role: 'assistant',
        content: helpMessage,
        timestamp: new Date().toISOString(),
      });

      // Stream the help message
      onStream({ type: 'text', data: { content: helpMessage } });
      onStream({ type: 'complete', data: { success: true, sessionId, message: helpMessage, actions: [] } });

      return {
        success: true,
        sessionId,
        message: helpMessage,
        actions: [],
      };
    }

    try {
      // Send initial status
      const processingMessage = this.getProcessingMessage(userLanguage);
      onStream({ type: 'status', data: { status: 'thinking', message: processingMessage } });

      // Save user message to memory (pass context for new session creation)
      await this.memoryService.addMessage(
        sessionId,
        {
          role: 'user',
          content: dto.command,
          timestamp: new Date().toISOString(),
        },
        { workspaceId: dto.workspaceId, userId },
      );

      // Store any new referenced items from this message
      const currentReferencedItems = dto.context?.referencedItems || [];
      if (currentReferencedItems.length > 0) {
        await this.memoryService.addReferencedItems(sessionId, currentReferencedItems);
        this.logger.log(`[AutoPilot] Stored ${currentReferencedItems.length} referenced items in session`);
      }

      // Get all referenced items from the session (including previously referenced items)
      const allReferencedItems = await this.memoryService.getReferencedItems(sessionId);
      this.logger.log(`[AutoPilot] Session has ${allReferencedItems.length} total referenced items`);

      // Build context for the agent with merged referenced items
      const context = {
        userId,
        workspaceId: dto.workspaceId,
        sessionId,
        executeActions,
        ...dto.context,
        referencedItems: allReferencedItems, // Use all session references
      };

      // Execute the agent with streaming
      const result = await this.agentService.executeStream(dto.command, context, onStream, userLanguage);

      // Build response
      const response: AutoPilotResponseDto = {
        success: true,
        sessionId,
        message: result.output,
        actions: result.actions || [],
        suggestions: this.generateSuggestions(dto.command, result.actions),
        reasoning: result.reasoning,
      };

      // Save assistant response to memory
      await this.memoryService.addMessage(sessionId, {
        role: 'assistant',
        content: result.output,
        timestamp: new Date().toISOString(),
        actions: result.actions,
      });

      return response;

    } catch (error) {
      this.logger.error(`[AutoPilot] Stream error: ${error.message}`, error.stack);

      return {
        success: false,
        sessionId,
        message: 'I encountered an error while processing your request. Please try again.',
        actions: [],
        error: error.message,
      };
    }
  }

  /**
   * Get conversation history for a session
   */
  async getHistory(
    sessionId: string,
    userId: string,
    limit?: number,
  ): Promise<ConversationMessage[]> {
    return this.memoryService.getHistory(sessionId, limit);
  }

  /**
   * Save feedback on an action
   */
  async saveFeedback(
    dto: ActionFeedbackDto,
    userId: string,
  ): Promise<{ success: boolean }> {
    this.logger.log(`[AutoPilot] Feedback received: ${dto.helpful ? 'helpful' : 'not helpful'}`);
    // TODO: Store feedback for improving the agent
    return { success: true };
  }

  /**
   * Get all AutoPilot capabilities
   */
  getCapabilities(): AutoPilotCapability[] {
    return this.toolsService.getCapabilities();
  }

  /**
   * Create a new conversation session
   */
  async createSession(
    workspaceId: string,
    userId: string,
  ): Promise<{ sessionId: string }> {
    const sessionId = uuidv4();
    await this.memoryService.initializeSession(sessionId, {
      workspaceId,
      userId,
      createdAt: new Date().toISOString(),
    });
    return { sessionId };
  }

  /**
   * Get or create a session for a user
   * This resumes an existing session or creates a new one if none exists
   */
  async getOrCreateSession(
    workspaceId: string,
    userId: string,
  ): Promise<{ sessionId: string; isNew: boolean }> {
    const sessionId = await this.memoryService.getOrCreateSession(workspaceId, userId);
    const history = await this.memoryService.getHistory(sessionId, 1);
    const isNew = history.length === 0;
    return { sessionId, isNew };
  }

  /**
   * Clear session memory
   */
  async clearSession(
    sessionId: string,
    userId: string,
  ): Promise<{ success: boolean }> {
    await this.memoryService.clearSession(sessionId);
    return { success: true };
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(
    workspaceId: string,
    userId: string,
    limit?: number,
  ): Promise<{
    id: string;
    sessionId: string;
    title: string;
    messageCount: number;
    createdAt: string;
    updatedAt: string;
  }[]> {
    return this.memoryService.getUserSessions(workspaceId, userId, limit);
  }

  /**
   * Delete a session
   */
  async deleteSession(
    sessionId: string,
    userId: string,
  ): Promise<{ success: boolean }> {
    await this.memoryService.deleteSession(sessionId);
    return { success: true };
  }

  /**
   * Generate follow-up suggestions based on the command and actions
   */
  private generateSuggestions(command: string, actions: ExecutedAction[]): string[] {
    const suggestions: string[] = [];

    // Add contextual suggestions based on actions taken
    for (const action of actions || []) {
      if (action.tool === 'create_calendar_event') {
        suggestions.push('Add more attendees to this meeting');
        suggestions.push('Set a reminder for this event');
      } else if (action.tool === 'create_task') {
        suggestions.push('Set a due date for this task');
        suggestions.push('Assign this task to someone');
      } else if (action.tool === 'send_message') {
        suggestions.push('Schedule a follow-up message');
      }
    }

    // Limit to 3 suggestions
    return suggestions.slice(0, 3);
  }

  /**
   * Extract text from PDF buffer
   */
  async extractPdfText(pdfBuffer: Buffer): Promise<{ text: string; numPages: number; info: any }> {
    this.logger.log('[AutoPilot] Extracting text from PDF...');
    try {
      // Convert Buffer to Uint8Array as required by pdf-parse v2
      const uint8Array = new Uint8Array(pdfBuffer);
      const parser = new PDFParse(uint8Array);
      await parser.load();
      const text = await parser.getText();
      const info = await parser.getInfo();
      const numPages = info?.numPages || 0;

      this.logger.log(`[AutoPilot] PDF extraction complete: ${numPages} pages`);
      parser.destroy(); // Clean up resources

      return {
        text,
        numPages,
        info,
      };
    } catch (error) {
      this.logger.error(`[AutoPilot] PDF extraction failed: ${error.message}`);
      throw new Error(`Failed to extract PDF text: ${error.message}`);
    }
  }

  /**
   * Test AI connection - simple test to verify database AI is working
   */
  async testAIConnection(): Promise<{ success: boolean; message: string }> {
    this.logger.log('[AutoPilot] Testing AI connection...');
    try {
      const response = await this.aiProvider.generateText('Say hello in one word.', {
        saveToDatabase: false,
      });

      if (response) {
        const text = typeof response === 'string' ? response :
                     response?.text || response?.content || JSON.stringify(response);
        this.logger.log(`[AutoPilot] AI test successful: ${text.substring(0, 50)}`);
        return { success: true, message: `AI is working. Response: ${text.substring(0, 100)}` };
      } else {
        return { success: false, message: 'AI returned empty response' };
      }
    } catch (error) {
      this.logger.error(`[AutoPilot] AI test failed: ${error.message}`);
      return { success: false, message: `AI test failed: ${error.message}` };
    }
  }

  /**
   * Get smart contextual suggestions for the user
   * These are based on the user's current data (overdue tasks, upcoming events, etc.)
   */
  async getSmartSuggestions(
    userId: string,
    workspaceId: string,
  ): Promise<SmartSuggestionsResponseDto> {
    this.logger.log(`[AutoPilot] Getting smart suggestions for user: ${userId}, workspace: ${workspaceId}`);
    const suggestions: SmartSuggestionDto[] = [];
    const now = new Date();

    try {
      // 1. Check for overdue tasks
      // Tasks are linked to projects, projects are linked to workspaces
      const overdueTasksResult = await this.db.table('tasks')
        .select('tasks.id', 'tasks.title', 'tasks.due_date', 'projects.workspace_id')
        .leftJoin('projects', 'tasks.project_id', '=', 'projects.id')
        .where('projects.workspace_id', '=', workspaceId)
        .where('tasks.due_date', '<', now.toISOString())
        .where('tasks.status', '!=', 'completed')
        .where('tasks.status', '!=', 'done')
        .execute();

      // Ensure we have an array
      const overdueTasksArray = Array.isArray(overdueTasksResult) ? overdueTasksResult : [];

      // Filter tasks assigned to the current user
      const overdueTasks = overdueTasksArray.filter((task: any) => {
        if (!task.assigned_to) return task.created_by === userId;
        try {
          const assignees = typeof task.assigned_to === 'string'
            ? JSON.parse(task.assigned_to)
            : task.assigned_to;
          return Array.isArray(assignees) && assignees.includes(userId);
        } catch {
          return task.created_by === userId;
        }
      });

      if (overdueTasks.length > 0) {
        suggestions.push({
          id: 'overdue-tasks',
          text: `You have ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}`,
          command: 'Show my overdue tasks',
          icon: 'warning',
          priority: 1,
          isContextual: true,
          category: 'tasks',
        });
      }

      // 2. Check for upcoming events (next 2 hours)
      const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const upcomingEventsResult = await this.db.table('calendar_events')
        .select('id', 'title', 'start_time')
        .where('workspace_id', '=', workspaceId)
        .where('start_time', '>=', now.toISOString())
        .where('start_time', '<=', twoHoursLater.toISOString())
        .where('status', '!=', 'cancelled')
        .execute();

      // Ensure we have an array
      const upcomingEvents: any[] = Array.isArray(upcomingEventsResult) ? upcomingEventsResult : [];
      if (upcomingEvents.length > 0) {
        const nextEvent = upcomingEvents[0];
        const eventTime = new Date(nextEvent.start_time);
        const minutesUntil = Math.round((eventTime.getTime() - now.getTime()) / 60000);

        suggestions.push({
          id: 'upcoming-event',
          text: minutesUntil <= 0
            ? `"${nextEvent.title}" is starting now`
            : `"${nextEvent.title}" in ${minutesUntil} min`,
          command: `What's on my calendar today?`,
          icon: 'event',
          priority: 2,
          isContextual: true,
          category: 'calendar',
        });
      }

      // 3. Check for pending approvals (where user is an approver)
      const pendingApprovalsResult = await this.db.table('approval_request_approvers')
        .select('approval_request_approvers.id', 'approval_requests.title')
        .leftJoin('approval_requests', 'approval_request_approvers.request_id', '=', 'approval_requests.id')
        .where('approval_requests.workspace_id', '=', workspaceId)
        .where('approval_request_approvers.approver_id', '=', userId)
        .where('approval_request_approvers.status', '=', 'pending')
        .execute();

      // Ensure we have an array
      const pendingApprovals: any[] = Array.isArray(pendingApprovalsResult) ? pendingApprovalsResult : [];
      if (pendingApprovals.length > 0) {
        suggestions.push({
          id: 'pending-approvals',
          text: `${pendingApprovals.length} pending approval${pendingApprovals.length > 1 ? 's' : ''} waiting`,
          command: 'Show my pending approvals',
          icon: 'approval',
          priority: 3,
          isContextual: true,
          category: 'approvals',
        });
      }

      // 4. Check for tasks due today
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      const tasksDueTodayResult = await this.db.table('tasks')
        .select('tasks.id', 'projects.workspace_id')
        .leftJoin('projects', 'tasks.project_id', '=', 'projects.id')
        .where('projects.workspace_id', '=', workspaceId)
        .where('tasks.due_date', '>=', startOfDay.toISOString())
        .where('tasks.due_date', '<=', endOfDay.toISOString())
        .where('tasks.status', '!=', 'completed')
        .where('tasks.status', '!=', 'done')
        .execute();

      // Ensure we have an array
      const tasksDueToday: any[] = Array.isArray(tasksDueTodayResult) ? tasksDueTodayResult : [];
      if (tasksDueToday.length > 0 && !suggestions.find(s => s.id === 'overdue-tasks')) {
        suggestions.push({
          id: 'tasks-due-today',
          text: `${tasksDueToday.length} task${tasksDueToday.length > 1 ? 's' : ''} due today`,
          command: 'Show tasks due today',
          icon: 'task',
          priority: 4,
          isContextual: true,
          category: 'tasks',
        });
      }

      // 5. Time-based suggestions
      const hour = now.getHours();

      // Morning briefing (6 AM - 10 AM)
      if (hour >= 6 && hour < 10) {
        suggestions.push({
          id: 'morning-briefing',
          text: 'Start your day with a briefing',
          command: 'Give me my daily summary',
          icon: 'sun',
          priority: 5,
          isContextual: true,
          category: 'insights',
        });
      }

      // End of day review (4 PM - 7 PM)
      if (hour >= 16 && hour < 19) {
        suggestions.push({
          id: 'evening-summary',
          text: 'Review your day',
          command: 'What did I accomplish today?',
          icon: 'evening',
          priority: 5,
          isContextual: true,
          category: 'insights',
        });
      }

      // Weekly summary on Friday afternoon
      if (now.getDay() === 5 && hour >= 14 && hour < 18) {
        suggestions.push({
          id: 'weekly-summary',
          text: 'Get your weekly summary',
          command: 'Give me my weekly summary',
          icon: 'week',
          priority: 6,
          isContextual: true,
          category: 'insights',
        });
      }

      // Sort by priority
      suggestions.sort((a, b) => a.priority - b.priority);

      this.logger.log(`[AutoPilot] Generated ${suggestions.length} smart suggestions`);
      return {
        suggestions,
        generatedAt: now.toISOString(),
      };

    } catch (error) {
      this.logger.error(`[AutoPilot] Error getting smart suggestions: ${error.message}`, error.stack);
      // Return empty suggestions on error instead of throwing
      return {
        suggestions: [],
        generatedAt: now.toISOString(),
      };
    }
  }

  /**
   * Get processing message in the specified language
   */
  private getProcessingMessage(language: string = 'en'): string {
    const translations: Record<string, string> = {
      en: 'Processing your request...',
      ja: 'リクエストを処理中...',
      es: 'Procesando su solicitud...',
      fr: 'Traitement de votre demande...',
      de: 'Ihre Anfrage wird bearbeitet...',
      zh: '正在处理您的请求...',
      ko: '요청을 처리하는 중...',
    };

    return translations[language] || translations['en'];
  }
}
