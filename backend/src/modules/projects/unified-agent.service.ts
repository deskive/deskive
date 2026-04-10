import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AiProviderService } from '../ai-provider/ai-provider.service';
import { ProjectsService } from './projects.service';
import { ProjectAgentService, ProjectAgentResponse } from './project-agent.service';
import { TaskAgentService, TaskAgentResponse } from './task-agent.service';
import {
  ConversationMemoryService,
  ConversationSearchResult,
} from '../conversation-memory/conversation-memory.service';

export interface UnifiedAgentRequest {
  prompt: string;
  workspaceId: string;
  projectId?: string; // Optional - if provided, we're in project context
}

export interface UnifiedAgentResponse {
  success: boolean;
  agentUsed: 'project' | 'task' | 'router';
  action: string;
  message: string;
  data?: any;
  error?: string;
}

interface RoutingDecision {
  agent: 'project' | 'task';
  projectId?: string; // For task agent, we need to know which project
  projectName?: string; // Name mentioned in prompt for project resolution
  confidence: number;
  reasoning: string;
}

@Injectable()
export class UnifiedAgentService {
  private readonly logger = new Logger(UnifiedAgentService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly projectsService: ProjectsService,
    private readonly projectAgentService: ProjectAgentService,
    private readonly taskAgentService: TaskAgentService,
    private readonly conversationMemoryService: ConversationMemoryService,
  ) {}

  // Legacy alias for the AI provider - delegates to db.getAI() until a real
  // AIProviderService is wired in.
  private get aiProvider(): any {
    return this.db.getAI();
  }

  /**
   * Main entry point for the Unified AI Agent
   * Intelligently routes to either Project Agent or Task Agent based on user intent
   */
  async processCommand(
    request: UnifiedAgentRequest,
    userId: string,
  ): Promise<UnifiedAgentResponse> {
    const { prompt, workspaceId, projectId } = request;

    this.logger.log(
      `[UnifiedAgent] Processing command: "${prompt}" for workspace: ${workspaceId}, projectContext: ${projectId || 'none'}`,
    );

    try {
      // Step 1: Determine which agent should handle this request
      const routingDecision = await this.routeRequest(prompt, workspaceId, projectId, userId);

      this.logger.log(
        `[UnifiedAgent] Routing decision: ${routingDecision.agent} agent (confidence: ${routingDecision.confidence}%) - ${routingDecision.reasoning}`,
      );

      // Step 2: Execute with the appropriate agent
      if (routingDecision.agent === 'project') {
        const response = await this.projectAgentService.processCommand(
          { prompt, workspaceId },
          userId,
        );
        return this.wrapResponse('project', response);
      } else {
        // Task agent needs a projectId
        let targetProjectId = projectId || routingDecision.projectId;

        // If we still don't have a project ID, try to resolve from project name
        if (!targetProjectId && routingDecision.projectName) {
          targetProjectId = await this.resolveProjectByName(
            routingDecision.projectName,
            workspaceId,
            userId,
          );
        }

        if (!targetProjectId) {
          return {
            success: false,
            agentUsed: 'router',
            action: 'route_failed',
            message: 'I detected you want to work with tasks, but I couldn\'t determine which project. Please specify a project name or navigate to a project first.',
            error: 'PROJECT_CONTEXT_REQUIRED',
          };
        }

        const response = await this.taskAgentService.processCommand(
          { prompt, workspaceId, projectId: targetProjectId },
          userId,
        );
        return this.wrapResponse('task', response);
      }
    } catch (error) {
      this.logger.error(`[UnifiedAgent] Error processing command:`, error);
      return {
        success: false,
        agentUsed: 'router',
        action: 'error',
        message: 'An unexpected error occurred while processing your request.',
        error: (error as Error).message,
      };
    }
  }

  /**
   * Use AI to determine which agent should handle the request
   */
  private async routeRequest(
    prompt: string,
    workspaceId: string,
    projectId: string | undefined,
    userId: string,
  ): Promise<RoutingDecision> {
    // Get conversation history for context
    let conversationContext = '';
    if (this.conversationMemoryService.isReady()) {
      try {
        const history = await this.conversationMemoryService.searchRelevantHistory(
          prompt,
          workspaceId,
          userId,
          5,
        );
        if (history.length > 0) {
          conversationContext = this.buildContextFromHistory(history);
        }
      } catch (error) {
        this.logger.warn('[UnifiedAgent] Could not fetch conversation history');
      }
    }

    // Get list of projects for context
    let projectsContext = '';
    try {
      const projects = await this.projectsService.findAll(workspaceId, userId, {});
      if (projects && projects.length > 0) {
        const projectList = projects.slice(0, 10).map((p: any) =>
          `- "${p.name}" (ID: ${p.id})`
        ).join('\n');
        projectsContext = `\nAVAILABLE PROJECTS:\n${projectList}\n`;
      }
    } catch (error) {
      this.logger.warn('[UnifiedAgent] Could not fetch projects list');
    }

    const systemPrompt = `You are a routing agent that determines whether a user request should be handled by:
1. PROJECT AGENT - for operations on projects (create/update/delete projects, change project settings, project properties)
2. TASK AGENT - for operations on tasks within a project (create/update/delete tasks, move tasks, assign tasks, change task status)

${conversationContext}
${projectsContext}

CURRENT CONTEXT:
- User is ${projectId ? `inside a project (ID: ${projectId})` : 'NOT inside a specific project'}

ROUTING RULES:
- If the user mentions "task", "tasks", "todo", "bug", "story", "subtask", "assign", "move task", "complete task" → TASK AGENT
- If the user mentions "project", "projects", "create project", "new project", "delete project", "update project" → PROJECT AGENT
- If user is inside a project context AND doesn't explicitly mention "project" → Default to TASK AGENT
- If user is NOT in a project context AND doesn't explicitly mention "task" → Default to PROJECT AGENT
- Keywords like "add", "create", "make", "new" with context determine the agent:
  - "add a task" or "create task in X" → TASK AGENT
  - "add a project" or "create project" → PROJECT AGENT

IMPORTANT: If the intent is TASK-related but mentions a project by name (e.g., "add a task in Marketing Project"), extract the project name.

Analyze the user prompt and respond with ONLY valid JSON:
{
  "agent": "project" | "task",
  "projectName": "extracted project name if mentioned for task operations, or null",
  "confidence": 0-100,
  "reasoning": "brief explanation"
}`;

    try {
      // Use generateText with system message for routing
      const combinedPrompt = `${systemPrompt}\n\nUser request: "${prompt}"`;
      const aiResponse = await this.aiProvider.generateText(combinedPrompt, {
        systemMessage: 'You are a routing assistant. Respond ONLY with valid JSON.',
      });

      const responseText = aiResponse?.text || '';

      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          agent: parsed.agent === 'task' ? 'task' : 'project',
          projectName: parsed.projectName || undefined,
          confidence: parsed.confidence || 80,
          reasoning: parsed.reasoning || 'AI routing decision',
        };
      }
    } catch (error) {
      this.logger.warn('[UnifiedAgent] AI routing failed, using heuristics:', error);
    }

    // Fallback: Simple keyword-based routing
    return this.heuristicRouting(prompt, projectId);
  }

  /**
   * Fallback heuristic routing based on keywords
   */
  private heuristicRouting(prompt: string, projectId?: string): RoutingDecision {
    const lowerPrompt = prompt.toLowerCase();

    // Task-related keywords
    const taskKeywords = [
      'task', 'tasks', 'todo', 'bug', 'story', 'subtask', 'epic',
      'assign', 'assignee', 'due date', 'deadline', 'move to',
      'complete', 'done', 'in progress', 'story points', 'sprint',
    ];

    // Project-related keywords
    const projectKeywords = [
      'project', 'projects', 'kanban', 'scrum', 'workspace',
      'team members', 'project settings', 'archive project',
    ];

    const hasTaskKeyword = taskKeywords.some(kw => lowerPrompt.includes(kw));
    const hasProjectKeyword = projectKeywords.some(kw => lowerPrompt.includes(kw));

    // Explicit task request
    if (hasTaskKeyword && !hasProjectKeyword) {
      // Try to extract project name from patterns like "in [project name]"
      const projectNameMatch = lowerPrompt.match(/(?:in|for|to)\s+(?:project\s+)?["']?([^"'\n,]+?)["']?\s*(?:project)?$/i);
      return {
        agent: 'task',
        projectName: projectNameMatch ? projectNameMatch[1].trim() : undefined,
        confidence: 85,
        reasoning: 'Task-related keywords detected',
      };
    }

    // Explicit project request
    if (hasProjectKeyword && !hasTaskKeyword) {
      return {
        agent: 'project',
        confidence: 85,
        reasoning: 'Project-related keywords detected',
      };
    }

    // Both or neither - use context
    if (projectId) {
      return {
        agent: 'task',
        confidence: 60,
        reasoning: 'User is in project context, defaulting to task agent',
      };
    }

    return {
      agent: 'project',
      confidence: 60,
      reasoning: 'No clear intent, defaulting to project agent',
    };
  }

  /**
   * Resolve project ID from project name
   */
  private async resolveProjectByName(
    projectName: string,
    workspaceId: string,
    userId: string,
  ): Promise<string | undefined> {
    try {
      const projects = await this.projectsService.findAll(workspaceId, userId, {});

      if (!projects || projects.length === 0) {
        return undefined;
      }

      // Try exact match first
      const exactMatch = projects.find(
        (p: any) => p.name.toLowerCase() === projectName.toLowerCase(),
      );
      if (exactMatch) {
        this.logger.log(`[UnifiedAgent] Found exact project match: ${exactMatch.name}`);
        return exactMatch.id;
      }

      // Try partial match
      const partialMatch = projects.find(
        (p: any) => p.name.toLowerCase().includes(projectName.toLowerCase()) ||
                    projectName.toLowerCase().includes(p.name.toLowerCase()),
      );
      if (partialMatch) {
        this.logger.log(`[UnifiedAgent] Found partial project match: ${partialMatch.name}`);
        return partialMatch.id;
      }

      // Try fuzzy match (first few words)
      const searchWords = projectName.toLowerCase().split(/\s+/);
      const fuzzyMatch = projects.find((p: any) => {
        const projectWords = p.name.toLowerCase().split(/\s+/);
        return searchWords.some(sw => projectWords.some((pw: string) => pw.includes(sw) || sw.includes(pw)));
      });
      if (fuzzyMatch) {
        this.logger.log(`[UnifiedAgent] Found fuzzy project match: ${fuzzyMatch.name}`);
        return fuzzyMatch.id;
      }

      return undefined;
    } catch (error) {
      this.logger.error('[UnifiedAgent] Error resolving project by name:', error);
      return undefined;
    }
  }

  /**
   * Build context string from conversation history
   */
  private buildContextFromHistory(messages: ConversationSearchResult[]): string {
    if (messages.length === 0) return '';

    const contextLines = messages.map((msg, idx) => {
      const roleLabel = msg.role === 'user' ? 'User' : 'AI';
      const projectInfo = msg.project_names?.length
        ? ` [Projects: ${msg.project_names.join(', ')}]`
        : '';
      return `${idx + 1}. ${roleLabel}: ${msg.content}${projectInfo}`;
    });

    return `\nRECENT CONVERSATION HISTORY:\n${contextLines.join('\n')}\n`;
  }

  /**
   * Wrap agent response in unified format
   */
  private wrapResponse(
    agentUsed: 'project' | 'task',
    response: ProjectAgentResponse | TaskAgentResponse,
  ): UnifiedAgentResponse {
    return {
      success: response.success,
      agentUsed,
      action: response.action,
      message: response.message,
      data: response.data,
      error: response.error,
    };
  }
}
