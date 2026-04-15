import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AiProviderService } from '../ai-provider/ai-provider.service';
import {
  ConversationMemoryService,
  ConversationSearchResult,
} from '../conversation-memory/conversation-memory.service';

// Import all agent services
import { UnifiedAgentService, UnifiedAgentResponse } from '../projects/unified-agent.service';
import { NotesAgentService, NoteAgentResponse } from '../notes/notes-agent.service';
import { CalendarAgentService, CalendarAgentResponse } from '../calendar/calendar-agent.service';
import { FilesAgentService, FileAgentResponse } from '../files/files-agent.service';

export type AgentType = 'projects' | 'tasks' | 'notes' | 'calendar' | 'files' | 'chat' | 'unknown';

export interface RouterAgentRequest {
  prompt: string;
  workspaceId: string;
  currentView?: string; // Optional hint about the current UI view
  projectId?: string; // Optional project context for task operations
}

export interface RouterAgentResponse {
  success: boolean;
  agentUsed: AgentType;
  action: string;
  message: string;
  data?: any;
  error?: string;
  routingConfidence?: number;
}

interface RoutingDecision {
  agent: AgentType;
  confidence: number;
  reasoning: string;
  projectName?: string; // For task operations that mention a project by name
}

@Injectable()
export class AIRouterService {
  private readonly logger = new Logger(AIRouterService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly conversationMemoryService: ConversationMemoryService,
    private readonly unifiedAgentService: UnifiedAgentService,
    private readonly notesAgentService: NotesAgentService,
    private readonly calendarAgentService: CalendarAgentService,
    private readonly filesAgentService: FilesAgentService,
  ) {}

  // Legacy alias for the AI provider - delegates to db.getAI() until a real
  // AIProviderService is wired in.
  private get aiProvider(): any {
    return this.db.getAI();
  }

  /**
   * Main entry point for the AI Router
   * Uses AI to intelligently determine which agent should handle the request
   */
  async processCommand(request: RouterAgentRequest, userId: string): Promise<RouterAgentResponse> {
    const { prompt, workspaceId, currentView, projectId } = request;

    this.logger.log(
      `[AIRouter] Processing command: "${prompt}" for workspace: ${workspaceId}, view: ${currentView || 'unknown'}`,
    );

    try {
      // Step 1: Get conversation history for better context
      const conversationHistory = await this.getRelevantHistory(prompt, workspaceId, userId);

      // Step 2: Use AI to determine which agent should handle this
      const routingDecision = await this.routeWithAI(
        prompt,
        workspaceId,
        userId,
        currentView,
        conversationHistory,
      );

      this.logger.log(
        `[AIRouter] Routing decision: ${routingDecision.agent} (confidence: ${routingDecision.confidence}%) - ${routingDecision.reasoning}`,
      );

      // Step 3: Execute with the appropriate agent
      const response = await this.executeWithAgent(
        routingDecision,
        prompt,
        workspaceId,
        userId,
        projectId,
      );

      return {
        ...response,
        routingConfidence: routingDecision.confidence,
      };
    } catch (error) {
      this.logger.error(`[AIRouter] Error processing command:`, error);
      return {
        success: false,
        agentUsed: 'unknown',
        action: 'error',
        message: 'An unexpected error occurred while processing your request. Please try again.',
        error: (error as Error).message,
      };
    }
  }

  /**
   * Use AI to intelligently determine which agent should handle the request
   */
  private async routeWithAI(
    prompt: string,
    workspaceId: string,
    userId: string,
    currentView: string | undefined,
    conversationHistory: ConversationSearchResult[],
  ): Promise<RoutingDecision> {
    const conversationContext = this.buildContextFromHistory(conversationHistory);

    const aiPrompt = `You are an intelligent router that determines which AI agent should handle a user's command.

User command: "${prompt}"
${currentView ? `Current UI view: ${currentView}` : ''}
${conversationContext}

Available agents and their capabilities:

1. **PROJECTS Agent** - Handles project-level operations:
   - Create, update, delete, archive projects
   - List projects, search projects
   - Project settings and configuration
   - Keywords: project, projects, board, workspace organization

2. **TASKS Agent** - Handles task-level operations within projects:
   - Create, update, delete, complete tasks
   - Assign tasks, set due dates, priorities
   - Task status changes (todo, in progress, done)
   - Keywords: task, tasks, todo, bug, story, issue, assign, due date, complete

3. **NOTES Agent** - Handles note-taking operations:
   - Create, update, delete notes
   - Search notes, organize notes
   - Note content management
   - Keywords: note, notes, write, jot down, remember, memo, document (when referring to text content)

4. **CALENDAR Agent** - Handles scheduling and events:
   - Create, update, delete events/meetings
   - Schedule appointments, reminders
   - Calendar management
   - Keywords: meeting, event, schedule, appointment, calendar, remind, when, date/time discussions

5. **FILES Agent** - Handles file and folder management:
   - Create, rename, delete folders
   - Move, copy, share files
   - File organization, search files
   - Star/favorite files
   - Keywords: file, files, folder, folders, upload, download, storage, directory, document (when referring to files)

6. **CHAT Agent** - Handles general conversation:
   - General questions not related to specific modules
   - Help and guidance
   - Casual conversation

ROUTING RULES:
1. If the command clearly relates to a specific domain, route to that agent
2. If "document" or "documents" is mentioned:
   - Route to FILES if it's about organizing/creating folders for documents
   - Route to NOTES if it's about writing/creating text content
3. If the current view provides context, consider it as a hint
4. For ambiguous commands, prefer the most specific match
5. If truly uncertain, route to CHAT agent

Respond with ONLY a valid JSON object (no markdown, no explanation):
{
  "agent": "projects" | "tasks" | "notes" | "calendar" | "files" | "chat",
  "confidence": <number 0-100>,
  "reasoning": "<brief explanation>",
  "projectName": "<project name if a task operation mentions a specific project>"
}`;

    try {
      const response = await this.aiProvider.generateText(aiPrompt, {
        maxTokens: 500,
        temperature: 0.1,
      });

      // Parse AI response
      let parsedResponse: RoutingDecision;
      try {
        let cleanResponse = response.trim();
        if (cleanResponse.startsWith('```json')) {
          cleanResponse = cleanResponse.slice(7);
        }
        if (cleanResponse.startsWith('```')) {
          cleanResponse = cleanResponse.slice(3);
        }
        if (cleanResponse.endsWith('```')) {
          cleanResponse = cleanResponse.slice(0, -3);
        }
        cleanResponse = cleanResponse.trim();

        const parsed = JSON.parse(cleanResponse);

        // Validate agent type
        const validAgents: AgentType[] = [
          'projects',
          'tasks',
          'notes',
          'calendar',
          'files',
          'chat',
        ];
        if (!validAgents.includes(parsed.agent)) {
          this.logger.warn(`[AIRouter] Invalid agent from AI: ${parsed.agent}, defaulting to chat`);
          parsed.agent = 'chat';
        }

        parsedResponse = {
          agent: parsed.agent,
          confidence: Math.min(100, Math.max(0, parsed.confidence || 50)),
          reasoning: parsed.reasoning || 'No reasoning provided',
          projectName: parsed.projectName,
        };
      } catch (parseError) {
        this.logger.warn(`[AIRouter] Failed to parse AI response: ${response}`);
        // Fall back to simple pattern matching
        return this.fallbackRouting(prompt, currentView);
      }

      return parsedResponse;
    } catch (error) {
      this.logger.warn(`[AIRouter] AI routing failed, using fallback: ${(error as Error).message}`);
      return this.fallbackRouting(prompt, currentView);
    }
  }

  /**
   * Fallback pattern-based routing when AI fails
   */
  private fallbackRouting(prompt: string, currentView?: string): RoutingDecision {
    const lowerPrompt = prompt.toLowerCase();

    // Calendar patterns
    if (
      lowerPrompt.includes('meeting') ||
      lowerPrompt.includes('event') ||
      lowerPrompt.includes('schedule') ||
      lowerPrompt.includes('appointment') ||
      lowerPrompt.includes('calendar') ||
      lowerPrompt.includes('remind')
    ) {
      return { agent: 'calendar', confidence: 80, reasoning: 'Calendar keywords detected' };
    }

    // Files patterns (check before notes for "folder" and "document" disambiguation)
    if (
      lowerPrompt.includes('folder') ||
      lowerPrompt.includes('file') ||
      lowerPrompt.includes('upload') ||
      lowerPrompt.includes('download') ||
      lowerPrompt.includes('storage') ||
      lowerPrompt.includes('directory') ||
      (lowerPrompt.includes('document') &&
        (lowerPrompt.includes('folder') || lowerPrompt.includes('organize')))
    ) {
      return { agent: 'files', confidence: 80, reasoning: 'Files/folder keywords detected' };
    }

    // Notes patterns
    if (
      lowerPrompt.includes('note') ||
      lowerPrompt.includes('memo') ||
      lowerPrompt.includes('jot') ||
      lowerPrompt.includes('write down') ||
      (lowerPrompt.includes('document') && !lowerPrompt.includes('folder'))
    ) {
      return { agent: 'notes', confidence: 80, reasoning: 'Notes keywords detected' };
    }

    // Task patterns
    if (
      lowerPrompt.includes('task') ||
      lowerPrompt.includes('todo') ||
      lowerPrompt.includes('bug') ||
      lowerPrompt.includes('story') ||
      lowerPrompt.includes('issue') ||
      lowerPrompt.includes('assign') ||
      lowerPrompt.includes('due date') ||
      lowerPrompt.includes('complete')
    ) {
      return { agent: 'tasks', confidence: 75, reasoning: 'Task keywords detected' };
    }

    // Project patterns
    if (
      lowerPrompt.includes('project') ||
      lowerPrompt.includes('board') ||
      lowerPrompt.includes('workspace')
    ) {
      return { agent: 'projects', confidence: 75, reasoning: 'Project keywords detected' };
    }

    // Use current view as hint
    if (currentView) {
      const viewToAgent: Record<string, AgentType> = {
        projects: 'projects',
        notes: 'notes',
        calendar: 'calendar',
        files: 'files',
        chat: 'chat',
      };
      if (viewToAgent[currentView]) {
        return {
          agent: viewToAgent[currentView],
          confidence: 60,
          reasoning: `Using current view (${currentView}) as context`,
        };
      }
    }

    // Default to chat
    return {
      agent: 'chat',
      confidence: 50,
      reasoning: 'No specific domain detected, using general chat',
    };
  }

  /**
   * Execute the command with the appropriate agent
   */
  private async executeWithAgent(
    routingDecision: RoutingDecision,
    prompt: string,
    workspaceId: string,
    userId: string,
    projectId?: string,
  ): Promise<RouterAgentResponse> {
    const { agent, projectName } = routingDecision;

    switch (agent) {
      case 'projects':
      case 'tasks':
        // Both go through unified agent which handles the project/task routing
        const unifiedResponse = await this.unifiedAgentService.processCommand(
          { prompt, workspaceId, projectId },
          userId,
        );
        return {
          success: unifiedResponse.success,
          agentUsed: unifiedResponse.agentUsed === 'project' ? 'projects' : 'tasks',
          action: unifiedResponse.action,
          message: unifiedResponse.message,
          data: unifiedResponse.data,
          error: unifiedResponse.error,
        };

      case 'notes':
        const notesResponse = await this.notesAgentService.processCommand(
          { prompt, workspaceId },
          userId,
        );
        return {
          success: notesResponse.success,
          agentUsed: 'notes',
          action: notesResponse.action,
          message: notesResponse.message,
          data: notesResponse.data,
          error: notesResponse.error,
        };

      case 'calendar':
        const calendarResponse = await this.calendarAgentService.processCommand(
          { prompt, workspaceId },
          userId,
        );
        return {
          success: calendarResponse.success,
          agentUsed: 'calendar',
          action: calendarResponse.action,
          message: calendarResponse.message,
          data: calendarResponse.data,
          error: calendarResponse.error,
        };

      case 'files':
        const filesResponse = await this.filesAgentService.processCommand(
          { prompt, workspaceId },
          userId,
        );
        return {
          success: filesResponse.success,
          agentUsed: 'files',
          action: filesResponse.action,
          message: filesResponse.message,
          data: filesResponse.data,
          error: filesResponse.error,
        };

      case 'chat':
      default:
        // For general chat, provide a helpful response
        return this.handleGeneralChat(prompt, workspaceId, userId);
    }
  }

  /**
   * Handle general chat/help requests
   */
  private async handleGeneralChat(
    prompt: string,
    workspaceId: string,
    userId: string,
  ): Promise<RouterAgentResponse> {
    try {
      const systemPrompt = `You are a helpful AI assistant for a productivity workspace application.
The user has access to:
- Projects and Tasks management
- Notes and documentation
- Calendar and event scheduling
- Files and folder management

Provide helpful, concise responses. If the user seems to want to perform an action, guide them on how to phrase their request more specifically.`;

      const response = await this.aiProvider.generateText(`${systemPrompt}\n\nUser: ${prompt}`, {
        maxTokens: 500,
        temperature: 0.7,
      });

      return {
        success: true,
        agentUsed: 'chat',
        action: 'chat_response',
        message: response,
      };
    } catch (error) {
      return {
        success: true,
        agentUsed: 'chat',
        action: 'chat_response',
        message: `I'm here to help! You can ask me to:
• Create or manage projects and tasks
• Write and organize notes
• Schedule meetings and events
• Manage files and folders

Just describe what you'd like to do in natural language!`,
      };
    }
  }

  /**
   * Get relevant conversation history
   */
  private async getRelevantHistory(
    query: string,
    workspaceId: string,
    userId: string,
  ): Promise<ConversationSearchResult[]> {
    try {
      if (!this.conversationMemoryService.isReady()) {
        return [];
      }
      return await this.conversationMemoryService.searchRelevantHistory(
        query,
        workspaceId,
        userId,
        5,
      );
    } catch (error) {
      this.logger.warn(
        `[AIRouter] Could not fetch conversation history: ${(error as Error).message}`,
      );
      return [];
    }
  }

  /**
   * Build context string from conversation history
   */
  private buildContextFromHistory(history: ConversationSearchResult[]): string {
    if (!history || history.length === 0) {
      return '';
    }

    const contextMessages = history
      .slice(0, 5)
      .map((h) => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`)
      .join('\n');

    return `\nRecent conversation context:\n${contextMessages}\n`;
  }
}
