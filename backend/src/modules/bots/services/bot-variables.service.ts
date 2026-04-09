import { Injectable, Logger, Optional } from '@nestjs/common';
import { SharedConditionEvaluatorService } from '../../automation-core';

export interface VariableContext {
  // User who triggered the bot
  user?: {
    id: string;
    name?: string;
    email?: string;
    avatarUrl?: string;
  };
  // The message that triggered the bot
  message?: {
    id: string;
    content: string;
    contentHtml?: string;
  };
  // Channel context
  channel?: {
    id: string;
    name?: string;
  };
  // Conversation context (DM)
  conversation?: {
    id: string;
  };
  // Workspace context
  workspace?: {
    id: string;
    name?: string;
  };
  // Bot context
  bot?: {
    id: string;
    name: string;
    displayName: string;
  };
  // Regex capture groups
  captureGroups?: string[];
  // Custom variables
  custom?: Record<string, any>;
}

/**
 * Bot Variables Service
 *
 * Handles bot-specific variable interpolation including:
 * - Capture groups ({{$0}}, {{$1}}, etc.)
 * - Bot-specific shorthands ({{user}}, {{message}}, {{channel}}, etc.)
 * - Date/time variables ({{date}}, {{time}}, {{datetime}}, {{timestamp}})
 *
 * Delegates generic interpolation to SharedConditionEvaluatorService where possible.
 */
@Injectable()
export class BotVariablesService {
  private readonly logger = new Logger(BotVariablesService.name);

  constructor(
    @Optional() private readonly sharedEvaluator?: SharedConditionEvaluatorService,
  ) {}

  /**
   * Interpolate variables in a template string
   * Supports: {{user}}, {{user.id}}, {{message}}, {{$0}}, {{$1}}, etc.
   *
   * Uses bot-specific variable resolution for special variables,
   * then falls back to generic field path resolution.
   */
  interpolate(template: string, context: VariableContext): string {
    if (!template) return template;

    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const value = this.resolveVariable(path.trim(), context);
      return value !== undefined && value !== null ? String(value) : match;
    });
  }

  /**
   * Resolve a single variable path
   * Handles bot-specific variables first, then falls back to generic path resolution
   */
  private resolveVariable(path: string, context: VariableContext): any {
    // Handle capture groups: $0, $1, $2, etc.
    if (path.startsWith('$') && /^\$\d+$/.test(path)) {
      const index = parseInt(path.substring(1), 10);
      return context.captureGroups?.[index];
    }

    // Handle date/time variables
    if (path === 'date') {
      return new Date().toLocaleDateString();
    }
    if (path === 'time') {
      return new Date().toLocaleTimeString();
    }
    if (path === 'datetime') {
      return new Date().toLocaleString();
    }
    if (path === 'timestamp') {
      return new Date().toISOString();
    }

    // Handle user shorthand
    if (path === 'user') {
      return context.user?.name || context.user?.email || 'User';
    }
    if (path === 'user.mention') {
      return context.user?.name ? `@${context.user.name}` : 'User';
    }

    // Handle message shorthand
    if (path === 'message') {
      return context.message?.content || '';
    }

    // Handle channel shorthand
    if (path === 'channel') {
      return context.channel?.name || '';
    }

    // Handle workspace shorthand
    if (path === 'workspace') {
      return context.workspace?.name || '';
    }

    // Handle bot shorthand
    if (path === 'bot') {
      return context.bot?.displayName || context.bot?.name || 'Bot';
    }
    if (path === 'bot.name') {
      return context.bot?.name || '';
    }

    // Use shared service for generic nested paths if available
    if (this.sharedEvaluator) {
      return this.sharedEvaluator.resolveField(path, context);
    }

    // Fallback: Handle nested paths like user.id, message.id, etc.
    return this.resolveNestedPath(path, context);
  }

  /**
   * Resolve nested path (fallback when shared service not available)
   */
  private resolveNestedPath(path: string, context: Record<string, any>): any {
    const parts = path.split('.');
    let value: any = context;

    for (const part of parts) {
      if (value === undefined || value === null) {
        return undefined;
      }
      value = value[part];
    }

    return value;
  }

  /**
   * Build a variable context from message data
   */
  buildContext(data: {
    userId: string;
    userName?: string;
    userEmail?: string;
    userAvatarUrl?: string;
    messageId?: string;
    messageContent?: string;
    messageContentHtml?: string;
    channelId?: string;
    channelName?: string;
    conversationId?: string;
    workspaceId: string;
    workspaceName?: string;
    botId?: string;
    botName?: string;
    botDisplayName?: string;
    captureGroups?: string[];
    custom?: Record<string, any>;
  }): VariableContext {
    return {
      user: {
        id: data.userId,
        name: data.userName,
        email: data.userEmail,
        avatarUrl: data.userAvatarUrl,
      },
      message: data.messageId ? {
        id: data.messageId,
        content: data.messageContent || '',
        contentHtml: data.messageContentHtml,
      } : undefined,
      channel: data.channelId ? {
        id: data.channelId,
        name: data.channelName,
      } : undefined,
      conversation: data.conversationId ? {
        id: data.conversationId,
      } : undefined,
      workspace: {
        id: data.workspaceId,
        name: data.workspaceName,
      },
      bot: data.botId ? {
        id: data.botId,
        name: data.botName || '',
        displayName: data.botDisplayName || data.botName || '',
      } : undefined,
      captureGroups: data.captureGroups,
      custom: data.custom,
    };
  }

  /**
   * Interpolate all string values in an object (recursive)
   * Delegates to SharedConditionEvaluatorService if available
   */
  interpolateObject(obj: Record<string, any>, context: VariableContext): Record<string, any> {
    // Use shared service if available for consistency
    if (this.sharedEvaluator) {
      // Create a wrapper that uses our bot-specific interpolate
      return this.interpolateObjectRecursive(obj, context);
    }

    return this.interpolateObjectRecursive(obj, context);
  }

  /**
   * Recursive object interpolation using bot-specific interpolate method
   */
  private interpolateObjectRecursive(obj: Record<string, any>, context: VariableContext): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        result[key] = this.interpolate(value, context);
      } else if (Array.isArray(value)) {
        result[key] = value.map(item =>
          typeof item === 'string'
            ? this.interpolate(item, context)
            : typeof item === 'object' && item !== null
              ? this.interpolateObjectRecursive(item, context)
              : item
        );
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.interpolateObjectRecursive(value, context);
      } else {
        result[key] = value;
      }
    }

    return result;
  }
}
