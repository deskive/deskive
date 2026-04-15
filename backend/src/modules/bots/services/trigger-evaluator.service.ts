import { Injectable, Logger, Optional } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { BotTrigger } from './bot-triggers.service';
import { TriggerType, KeywordMatchType } from '../dto/create-trigger.dto';
import { SharedConditionEvaluatorService } from '../../automation-core';

export interface TriggerEvaluationContext {
  messageContent: string;
  userId: string;
  channelId?: string;
  conversationId?: string;
  mentions?: string[]; // User IDs mentioned in message
  isThread?: boolean;
  botId?: string; // Bot ID for mention detection
  botName?: string; // Bot name for mention detection
}

export interface TriggerMatch {
  trigger: BotTrigger;
  matched: boolean;
  captureGroups?: string[];
  reason?: string;
}

@Injectable()
export class TriggerEvaluatorService {
  private readonly logger = new Logger(TriggerEvaluatorService.name);

  constructor(
    private readonly db: DatabaseService,
    @Optional() private readonly sharedConditionEvaluator?: SharedConditionEvaluatorService,
  ) {}

  /**
   * Evaluate a trigger against a message context
   */
  evaluate(trigger: BotTrigger, context: TriggerEvaluationContext): TriggerMatch {
    try {
      // First check conditions
      if (!this.checkConditions(trigger, context)) {
        return { trigger, matched: false, reason: 'Conditions not met' };
      }

      // Evaluate based on trigger type
      switch (trigger.triggerType) {
        case TriggerType.KEYWORD:
          return this.evaluateKeyword(trigger, context);
        case TriggerType.REGEX:
          return this.evaluateRegex(trigger, context);
        case TriggerType.MENTION:
          return this.evaluateMention(trigger, context);
        case TriggerType.ANY_MESSAGE:
          return this.evaluateAnyMessage(trigger, context);
        case TriggerType.SCHEDULE:
          // Schedule triggers don't evaluate on messages
          return { trigger, matched: false, reason: 'Schedule trigger' };
        case TriggerType.WEBHOOK:
          // Webhook triggers don't evaluate on messages
          return { trigger, matched: false, reason: 'Webhook trigger' };
        default:
          return { trigger, matched: false, reason: 'Unknown trigger type' };
      }
    } catch (error) {
      this.logger.error(
        `[TriggerEvaluator] Error evaluating trigger ${trigger.id}: ${error.message}`,
      );
      return { trigger, matched: false, reason: `Error: ${error.message}` };
    }
  }

  /**
   * Evaluate keyword trigger
   */
  private evaluateKeyword(trigger: BotTrigger, context: TriggerEvaluationContext): TriggerMatch {
    const config = trigger.triggerConfig as {
      matchType: KeywordMatchType;
      keywords: string[];
      caseSensitive?: boolean;
    };

    const content = config.caseSensitive
      ? context.messageContent
      : context.messageContent.toLowerCase();
    const keywords = config.caseSensitive
      ? config.keywords
      : config.keywords.map((k) => k.toLowerCase());

    for (const keyword of keywords) {
      let matched = false;

      switch (config.matchType) {
        case KeywordMatchType.EXACT:
          matched = content === keyword;
          break;
        case KeywordMatchType.CONTAINS:
          matched = content.includes(keyword);
          break;
        case KeywordMatchType.STARTS_WITH:
          matched = content.startsWith(keyword);
          break;
        case KeywordMatchType.ENDS_WITH:
          matched = content.endsWith(keyword);
          break;
      }

      if (matched) {
        return {
          trigger,
          matched: true,
          captureGroups: [context.messageContent, keyword],
        };
      }
    }

    return { trigger, matched: false, reason: 'No keyword match' };
  }

  /**
   * Evaluate regex trigger
   */
  private evaluateRegex(trigger: BotTrigger, context: TriggerEvaluationContext): TriggerMatch {
    const config = trigger.triggerConfig as {
      pattern: string;
      flags?: string;
    };

    try {
      const regex = new RegExp(config.pattern, config.flags || '');
      const match = context.messageContent.match(regex);

      if (match) {
        return {
          trigger,
          matched: true,
          captureGroups: Array.from(match),
        };
      }

      return { trigger, matched: false, reason: 'No regex match' };
    } catch (error) {
      this.logger.warn(`[TriggerEvaluator] Invalid regex pattern: ${config.pattern}`);
      return { trigger, matched: false, reason: `Invalid regex: ${error.message}` };
    }
  }

  /**
   * Evaluate mention trigger
   */
  private evaluateMention(trigger: BotTrigger, context: TriggerEvaluationContext): TriggerMatch {
    const config = trigger.triggerConfig as {
      requireAtMention?: boolean;
    };

    if (!context.botName) {
      this.logger.warn('[TriggerEvaluator] Bot name not provided for mention trigger evaluation');
      return { trigger, matched: false, reason: 'Bot name not configured' };
    }

    // Check if bot is mentioned by name (case-insensitive)
    // Supports patterns like: @BotName, @botname, bot-name, botname
    const botNameLower = context.botName.toLowerCase();
    const messageLower = context.messageContent.toLowerCase();

    // Pattern 1: @BotName at start or after whitespace
    const atMentionPattern = new RegExp(
      `(?:^|\\s)@${botNameLower.replace(/[^a-z0-9]/g, '')}(?:\\s|$)`,
      'i',
    );
    const hasAtMention = atMentionPattern.test(messageLower);

    // Pattern 2: Bot name anywhere in message (less strict)
    const nameMentionPattern = new RegExp(`\\b${botNameLower.replace(/[^a-z0-9]/g, '')}\\b`, 'i');
    const hasNameMention = nameMentionPattern.test(messageLower.replace(/[^a-z0-9\s]/g, ''));

    // If mentions array is provided (user IDs), check if bot ID is mentioned
    const hasBotIdMention =
      context.mentions && context.botId && context.mentions.includes(context.botId);

    const isMentioned =
      hasAtMention || hasBotIdMention || (!config.requireAtMention && hasNameMention);

    if (!isMentioned) {
      return { trigger, matched: false, reason: 'Bot not mentioned' };
    }

    // Extract command text after mention
    let commandText = context.messageContent;

    // Remove bot mention from the beginning to get the actual command
    if (hasAtMention) {
      commandText = context.messageContent.replace(atMentionPattern, '').trim();
    } else if (hasNameMention) {
      commandText = context.messageContent.replace(nameMentionPattern, '').trim();
    }

    this.logger.log(
      `[TriggerEvaluator] Bot ${context.botName} mentioned. Command: "${commandText}"`,
    );

    return {
      trigger,
      matched: true,
      captureGroups: [context.messageContent, commandText], // [0] = full message, [1] = command without mention
    };
  }

  /**
   * Evaluate any_message trigger
   */
  private evaluateAnyMessage(trigger: BotTrigger, context: TriggerEvaluationContext): TriggerMatch {
    const config = trigger.triggerConfig as {
      includeThreads?: boolean;
      fromUsers?: string[];
    };

    // Skip thread messages if not configured
    if (context.isThread && !config.includeThreads) {
      return { trigger, matched: false, reason: 'Thread message excluded' };
    }

    // Check user filter
    if (config.fromUsers && config.fromUsers.length > 0) {
      if (!config.fromUsers.includes(context.userId)) {
        return { trigger, matched: false, reason: 'User not in allowed list' };
      }
    }

    return {
      trigger,
      matched: true,
      captureGroups: [context.messageContent],
    };
  }

  /**
   * Check trigger conditions
   */
  private checkConditions(trigger: BotTrigger, context: TriggerEvaluationContext): boolean {
    const conditions = trigger.conditions;
    if (!conditions || Object.keys(conditions).length === 0) {
      return true;
    }

    // Check allowed users
    if (conditions.allowedUsers && conditions.allowedUsers.length > 0) {
      if (!conditions.allowedUsers.includes(context.userId)) {
        return false;
      }
    }

    // Check excluded users
    if (conditions.excludedUsers && conditions.excludedUsers.length > 0) {
      if (conditions.excludedUsers.includes(context.userId)) {
        return false;
      }
    }

    // Check active hours
    if (conditions.activeHours && conditions.activeHours.length === 2) {
      const currentHour = new Date().getHours();
      const [startHour, endHour] = conditions.activeHours;
      if (currentHour < startHour || currentHour >= endHour) {
        return false;
      }
    }

    // Check active days
    if (conditions.activeDays && conditions.activeDays.length > 0) {
      const currentDay = new Date().getDay();
      if (!conditions.activeDays.includes(currentDay)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if a user is in cooldown for a trigger
   */
  async isInCooldown(
    triggerId: string,
    userId: string,
    channelId?: string,
    conversationId?: string,
  ): Promise<boolean> {
    let query = this.db
      .table('bot_user_cooldowns')
      .select('*')
      .where('trigger_id', '=', triggerId)
      .where('user_id', '=', userId);

    if (channelId) {
      query = query.where('channel_id', '=', channelId);
    } else if (conversationId) {
      query = query.where('conversation_id', '=', conversationId);
    }

    const result = await query.execute();
    const cooldown = result.data?.[0];

    if (!cooldown) return false;

    const cooldownUntil = new Date(cooldown.cooldown_until);
    return cooldownUntil > new Date();
  }

  /**
   * Set cooldown for a user on a trigger
   */
  async setCooldown(
    triggerId: string,
    userId: string,
    cooldownSeconds: number,
    channelId?: string,
    conversationId?: string,
  ): Promise<void> {
    if (cooldownSeconds <= 0) return;

    const cooldownUntil = new Date(Date.now() + cooldownSeconds * 1000);

    // Check if cooldown record exists
    let query = this.db
      .table('bot_user_cooldowns')
      .select('id')
      .where('trigger_id', '=', triggerId)
      .where('user_id', '=', userId);

    if (channelId) {
      query = query.where('channel_id', '=', channelId);
    } else if (conversationId) {
      query = query.where('conversation_id', '=', conversationId);
    }

    const existing = await query.execute();

    if (existing.data?.[0]) {
      // Update existing
      await this.db.update('bot_user_cooldowns', existing.data[0].id, {
        last_triggered_at: new Date().toISOString(),
        cooldown_until: cooldownUntil.toISOString(),
      });
    } else {
      // Create new
      await this.db.insert('bot_user_cooldowns', {
        trigger_id: triggerId,
        user_id: userId,
        channel_id: channelId || null,
        conversation_id: conversationId || null,
        last_triggered_at: new Date().toISOString(),
        cooldown_until: cooldownUntil.toISOString(),
      });
    }
  }

  /**
   * Clean up expired cooldowns
   */
  async cleanupExpiredCooldowns(): Promise<number> {
    const now = new Date().toISOString();
    const expired = await this.db
      .table('bot_user_cooldowns')
      .select('id')
      .where('cooldown_until', '<', now)
      .execute();

    let count = 0;
    for (const record of expired.data || []) {
      await this.db.delete('bot_user_cooldowns', record.id);
      count++;
    }

    if (count > 0) {
      this.logger.log(`[TriggerEvaluator] Cleaned up ${count} expired cooldowns`);
    }

    return count;
  }
}
