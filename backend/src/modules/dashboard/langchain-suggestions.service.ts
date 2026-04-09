import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { Suggestion } from './dto/dashboard.dto';

export interface UserContextData {
  userId: string;
  workspaceId: string;
  tasks: {
    overdue: any[];
    dueSoon: any[];
    assigned: any[];
    created: any[];
  };
  meetings: {
    active: any[];
    upcoming: any[];
    missed: any[];
  };
  messages: {
    unread: any[];
    mentions: any[];
  };
  calendar: {
    conflicts: any[];
    upcoming: any[];
  };
  projects: {
    atRisk: any[];
    inactive: any[];
    memberships: any[];
  };
  team: {
    members: any[];
    inactiveMembers: any[];
  };
  userProfile: {
    name: string;
    role: string;
    recentActivity: any[];
  };
}

export interface LangChainSuggestionResult {
  suggestions: Suggestion[];
  insights: string[];
  priorityScore: number;
}

@Injectable()
export class LangChainSuggestionsService {
  private readonly logger = new Logger(LangChainSuggestionsService.name);
  private chatModel: ChatOpenAI | null = null;

  constructor(private readonly configService: ConfigService) {
    this.initializeOpenAI();
  }

  /**
   * Initialize OpenAI ChatModel via LangChain
   */
  private initializeOpenAI() {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    const model = this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o-mini';

    if (!apiKey) {
      this.logger.warn(
        '[LangChain] OPENAI_API_KEY not configured - AI suggestions will be disabled',
      );
      return;
    }

    this.chatModel = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: model,
      temperature: 0.7,
      maxTokens: 1500,
    });

    this.logger.log(`[LangChain] OpenAI initialized with model: ${model}`);
  }

  /**
   * Generate smart suggestions using LangChain with OpenAI
   */
  async generateSmartSuggestions(
    context: UserContextData,
    userLanguage: string = 'en',
  ): Promise<LangChainSuggestionResult> {
    if (!this.chatModel) {
      this.logger.warn('[LangChain] OpenAI not initialized, skipping AI suggestions');
      return {
        suggestions: [],
        insights: [],
        priorityScore: 0,
      };
    }

    this.logger.log(
      `[LangChain] Generating smart suggestions for user ${context.userId} in ${userLanguage}`,
    );

    try {
      // Build comprehensive context for AI analysis
      const contextSummary = this.buildContextSummary(context);

      // Generate AI-powered suggestions using LangChain
      const aiSuggestions = await this.analyzeAndGenerateSuggestions(
        context,
        contextSummary,
        userLanguage,
      );

      return aiSuggestions;
    } catch (error) {
      this.logger.error(
        `[LangChain] Error generating suggestions: ${error.message}`,
      );
      return {
        suggestions: [],
        insights: [],
        priorityScore: 0,
      };
    }
  }

  /**
   * Build a comprehensive summary of user context for AI analysis
   */
  private buildContextSummary(context: UserContextData): string {
    const summary: string[] = [];

    // Tasks summary
    if (context.tasks.overdue.length > 0) {
      summary.push(
        `URGENT: ${context.tasks.overdue.length} overdue task(s) need attention`,
      );
      const topOverdue = context.tasks.overdue.slice(0, 3);
      topOverdue.forEach((task) => {
        const daysOverdue = Math.ceil(
          (Date.now() - new Date(task.due_date).getTime()) / (1000 * 60 * 60 * 24),
        );
        summary.push(
          `  - "${task.title}" is ${daysOverdue} day(s) overdue (Priority: ${task.priority || 'normal'})`,
        );
      });
    }

    if (context.tasks.dueSoon.length > 0) {
      summary.push(
        `UPCOMING: ${context.tasks.dueSoon.length} task(s) due within 3 days`,
      );
    }

    // Meetings summary
    if (context.meetings.active.length > 0) {
      summary.push(
        `ACTIVE NOW: ${context.meetings.active.length} meeting(s) in progress`,
      );
      context.meetings.active.forEach((meeting) => {
        summary.push(`  - "${meeting.title}" is currently active`);
      });
    }

    if (context.meetings.upcoming.length > 0) {
      summary.push(
        `UPCOMING: ${context.meetings.upcoming.length} meeting(s) in the next 30 minutes`,
      );
    }

    // Messages summary
    if (context.messages.unread.length > 0) {
      summary.push(`UNREAD: ${context.messages.unread.length} unread message(s)`);
    }

    if (context.messages.mentions.length > 0) {
      summary.push(
        `MENTIONS: ${context.messages.mentions.length} unread mention(s) require your attention`,
      );
    }

    // Calendar summary
    if (context.calendar.conflicts.length > 0) {
      summary.push(
        `CONFLICTS: ${context.calendar.conflicts.length} scheduling conflict(s) detected`,
      );
    }

    // Projects summary
    if (context.projects.atRisk.length > 0) {
      summary.push(
        `AT RISK: ${context.projects.atRisk.length} project(s) may need intervention`,
      );
      context.projects.atRisk.forEach((project) => {
        summary.push(
          `  - "${project.name}": ${project.riskReason || 'behind schedule'}`,
        );
      });
    }

    // Team summary (for admins/owners)
    if (context.team.inactiveMembers.length > 0) {
      summary.push(
        `TEAM: ${context.team.inactiveMembers.length} member(s) have been inactive`,
      );
    }

    return summary.length > 0
      ? summary.join('\n')
      : 'No immediate items requiring attention.';
  }

  /**
   * Use LangChain with OpenAI to analyze context and generate intelligent suggestions
   */
  private async analyzeAndGenerateSuggestions(
    context: UserContextData,
    contextSummary: string,
    userLanguage: string = 'en',
  ): Promise<LangChainSuggestionResult> {
    const now = new Date();
    const timeOfDay =
      now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening';
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });

    const languageInstruction = userLanguage === 'ja'
      ? 'IMPORTANT: Respond in Japanese. All titles, descriptions, action labels, and recommendations must be in Japanese (日本語).'
      : 'Respond in English.';

    const systemPrompt = `You are an intelligent productivity assistant analyzing a user's workspace to provide actionable suggestions.

Your role is to:
1. Identify the most urgent and important items requiring attention
2. Provide personalized, context-aware recommendations
3. Help prevent problems before they occur
4. Suggest productivity improvements based on patterns

${languageInstruction}
Always respond with valid JSON only, no markdown formatting.`;

    const userPrompt = `USER CONTEXT:
- Name: ${context.userProfile.name || 'User'}
- Role: ${context.userProfile.role || 'Member'}
- Current time: ${timeOfDay} on ${dayOfWeek}

CURRENT WORKSPACE STATUS:
${contextSummary}

DETAILED DATA:
- Total assigned tasks: ${context.tasks.assigned.length}
- Overdue tasks: ${context.tasks.overdue.length}
- Tasks due soon (3 days): ${context.tasks.dueSoon.length}
- Active meetings: ${context.meetings.active.length}
- Upcoming meetings (30 min): ${context.meetings.upcoming.length}
- Unread messages: ${context.messages.unread.length}
- Unread mentions: ${context.messages.mentions.length}
- Calendar conflicts: ${context.calendar.conflicts.length}
- At-risk projects: ${context.projects.atRisk.length}
- Team members: ${context.team.members.length}
- Inactive members: ${context.team.inactiveMembers.length}

Generate personalized, actionable suggestions. Consider:
1. What's most urgent right now?
2. What can prevent problems before they occur?
3. What would improve their productivity today?
4. Any patterns or insights from their data?

RESPOND WITH ONLY VALID JSON in this exact format:
{
  "suggestions": [
    {
      "id": "unique-id",
      "type": "overdue_task|meeting|unread_message|task_balance|calendar_conflict|project_risk|team_activity|productivity_tip",
      "priority": "high|medium|low",
      "title": "Clear actionable title (max 50 chars)",
      "description": "Brief helpful description (max 150 chars)",
      "actionLabel": "Button text (max 20 chars)",
      "aiRecommendation": "Specific personalized advice (max 200 chars)"
    }
  ],
  "insights": [
    "Key insight about user's productivity pattern"
  ],
  "priorityScore": 75
}

RULES:
1. Maximum 5 suggestions, prioritized by importance
2. Be specific - reference actual task names, meeting titles when available
3. Be actionable - each suggestion should have a clear next step
4. If there's nothing urgent, suggest productivity improvements
5. Consider time of day - morning focus, afternoon meetings, evening wrap-up
6. priorityScore is 0-100 based on overall urgency level`;

    try {
      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt),
      ];

      const response = await this.chatModel.invoke(messages);
      const responseText =
        typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);

      const parsed = this.parseAIResponse(responseText);

      // Transform AI suggestions to proper format
      const suggestions: Suggestion[] = parsed.suggestions.map(
        (s: any, index: number) => ({
          id: s.id || `langchain-${Date.now()}-${index}`,
          type: this.mapSuggestionType(s.type),
          priority: s.priority || 'medium',
          title: s.title,
          description: s.description,
          actionLabel: s.actionLabel || 'View Details',
          actionUrl: this.generateActionUrl(s.type, context),
          metadata: {
            aiRecommendation: s.aiRecommendation,
            generatedBy: 'langchain-openai',
            confidence: parsed.priorityScore / 100,
          },
          createdAt: new Date().toISOString(),
        }),
      );

      this.logger.log(
        `[LangChain] Generated ${suggestions.length} AI suggestions`,
      );

      return {
        suggestions,
        insights: parsed.insights || [],
        priorityScore: parsed.priorityScore || 50,
      };
    } catch (error) {
      this.logger.error(`[LangChain] OpenAI analysis failed: ${error.message}`);
      return {
        suggestions: [],
        insights: [],
        priorityScore: 0,
      };
    }
  }

  /**
   * Parse AI response JSON
   */
  private parseAIResponse(responseText: string): any {
    try {
      // Clean markdown formatting if present
      const cleanedContent = responseText
        .trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      return JSON.parse(cleanedContent);
    } catch (error) {
      this.logger.warn(
        `[LangChain] Failed to parse AI response: ${error.message}`,
      );
      return {
        suggestions: [],
        insights: [],
        priorityScore: 0,
      };
    }
  }

  /**
   * Map AI suggestion types to our defined types
   */
  private mapSuggestionType(aiType: string): string {
    const typeMap: Record<string, string> = {
      overdue_task: 'overdue_task',
      meeting: 'meeting',
      unread_message: 'unread_message',
      task_balance: 'task_balance',
      calendar_conflict: 'calendar_conflict',
      project_risk: 'project_at_risk',
      team_activity: 'team_inactive_member',
      productivity_tip: 'analytics_insight',
      upcoming_deadline: 'upcoming_deadline',
      note_update: 'note_update',
    };

    return typeMap[aiType] || 'analytics_insight';
  }

  /**
   * Generate appropriate action URL based on suggestion type
   */
  private generateActionUrl(type: string, _context: UserContextData): string {
    switch (type) {
      case 'overdue_task':
      case 'task_balance':
      case 'upcoming_deadline':
        return '/projects';
      case 'meeting':
        return '/video-calls';
      case 'unread_message':
        return '/messages';
      case 'calendar_conflict':
        return '/calendar';
      case 'project_risk':
        return '/projects';
      case 'team_activity':
        return '/members';
      default:
        return '/dashboard';
    }
  }

  /**
   * Generate a single AI-enhanced suggestion for specific context
   * Used by the existing suggestion methods to enhance their output
   */
  async enhanceSuggestion(
    context: {
      type: 'task_balance' | 'overdue_task' | 'meeting' | 'project_risk';
      data: any;
    },
    userLanguage: string = 'en',
  ): Promise<{
    title: string;
    description: string;
    actionLabel: string;
    recommendation: string;
  } | null> {
    if (!this.chatModel) {
      return null;
    }

    try {
      const languageInstruction = userLanguage === 'ja'
        ? '\n\nIMPORTANT: Respond in Japanese. All text fields (title, description, actionLabel, recommendation) must be in Japanese (日本語).'
        : '';

      let prompt = '';

      if (context.type === 'task_balance') {
        prompt = `Generate a helpful suggestion for a task imbalance situation.

Context:
- Project: "${context.data.projectName}"
- ${context.data.overloadedName} has ${context.data.overloadedTaskCount} tasks (overloaded)
- ${context.data.underloadedName} has ${context.data.underloadedTaskCount} tasks (underloaded)
- Ideal tasks per member: ${context.data.idealTasksPerMember}${languageInstruction}

Respond with JSON only:
{"title": "max 50 chars", "description": "max 150 chars", "actionLabel": "max 20 chars", "recommendation": "specific advice max 200 chars"}`;
      } else if (context.type === 'overdue_task') {
        prompt = `Generate an urgent suggestion for an overdue task.

Context:
- Task: "${context.data.taskTitle}"
- Days overdue: ${context.data.daysOverdue}
- Project: "${context.data.projectName}"${languageInstruction}

Respond with JSON only:
{"title": "max 50 chars", "description": "max 150 chars", "actionLabel": "max 20 chars", "recommendation": "specific advice max 200 chars"}`;
      } else if (context.type === 'project_risk') {
        prompt = `Generate a suggestion for an at-risk project.

Context:
- Project: "${context.data.projectName}"
- Risk reason: ${context.data.riskReason || 'behind schedule'}
- Overdue tasks: ${context.data.overdueCount || 0}
- Completion: ${context.data.completionPercentage || 0}%${languageInstruction}

Respond with JSON only:
{"title": "max 50 chars", "description": "max 150 chars", "actionLabel": "max 20 chars", "recommendation": "specific advice max 200 chars"}`;
      } else {
        return null;
      }

      const response = await this.chatModel.invoke([new HumanMessage(prompt)]);
      const responseText =
        typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);

      const parsed = this.parseAIResponse(responseText);
      return {
        title: parsed.title || null,
        description: parsed.description || null,
        actionLabel: parsed.actionLabel || null,
        recommendation: parsed.recommendation || null,
      };
    } catch (error) {
      this.logger.error(
        `[LangChain] Failed to enhance suggestion: ${error.message}`,
      );
      return null;
    }
  }
}
