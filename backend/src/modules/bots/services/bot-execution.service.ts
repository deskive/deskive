import { Injectable, Logger, Optional } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { BotsService, Bot } from './bots.service';
import { BotTriggersService, BotTrigger } from './bot-triggers.service';
import { BotActionsService, BotAction } from './bot-actions.service';
import { BotInstallationsService, BotInstallation } from './bot-installations.service';
import { TriggerEvaluatorService, TriggerEvaluationContext, TriggerMatch } from './trigger-evaluator.service';
import { ActionExecutorService, ActionExecutionResult, ActionExecutionContext } from './action-executor.service';
import { BotVariablesService } from './bot-variables.service';
import { FailurePolicy } from '../dto/create-action.dto';
import { SharedExecutionLoggerService, AutomationType } from '../../automation-core';

export interface BotExecutionInput {
  messageId: string;
  messageContent: string;
  messageContentHtml?: string;
  channelId?: string;
  conversationId?: string;
  workspaceId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  mentions?: string[];
  isThread?: boolean;
}

export interface BotExecutionLog {
  id: string;
  botId: string;
  triggerId?: string;
  actionId?: string;
  installationId?: string;
  channelId?: string;
  conversationId?: string;
  messageId?: string;
  triggeredByUser?: string;
  triggerType?: string;
  triggerData: Record<string, any>;
  actionType?: string;
  actionInput: Record<string, any>;
  actionOutput: Record<string, any>;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  errorMessage?: string;
  executionTimeMs?: number;
  createdAt: string;
}

@Injectable()
export class BotExecutionService {
  private readonly logger = new Logger(BotExecutionService.name);

  // Rate limiting: track executions per bot per minute
  private executionCounts: Map<string, { count: number; resetAt: number }> = new Map();

  // Recursion prevention
  private executionDepth: Map<string, number> = new Map();
  private readonly maxExecutionDepth = 3;

  constructor(
    private readonly db: DatabaseService,
    private readonly botsService: BotsService,
    private readonly triggersService: BotTriggersService,
    private readonly actionsService: BotActionsService,
    private readonly installationsService: BotInstallationsService,
    private readonly triggerEvaluator: TriggerEvaluatorService,
    private readonly actionExecutor: ActionExecutorService,
    private readonly variablesService: BotVariablesService,
    @Optional() private readonly sharedExecutionLogger?: SharedExecutionLoggerService,
  ) {}

  /**
   * Main entry point: evaluate triggers and execute actions for a message
   */
  async evaluateAndExecute(input: BotExecutionInput): Promise<void> {
    const executionKey = `${input.channelId || input.conversationId}:${input.messageId}`;

    // Check recursion depth
    const currentDepth = this.executionDepth.get(executionKey) || 0;
    if (currentDepth >= this.maxExecutionDepth) {
      this.logger.warn(`[BotExecution] Max execution depth reached for ${executionKey}`);
      return;
    }

    this.executionDepth.set(executionKey, currentDepth + 1);

    try {
      console.log(`\n========== BOT EXECUTION DEBUG ==========`);
      console.log(`[BotExecution] 🔍 Processing message: "${input.messageContent}"`);
      console.log(`[BotExecution] 📍 Location: channelId=${input.channelId}, conversationId=${input.conversationId}`);
      console.log(`[BotExecution] 🏢 Workspace: ${input.workspaceId}`);
      console.log(`[BotExecution] 👤 User: ${input.userId}`);

      // Get active bots for this location
      const bots = await this.botsService.getActiveBotsForLocation(
        input.workspaceId,
        input.channelId,
        input.conversationId,
      );

      if (bots.length === 0) {
        console.log(`[BotExecution] ❌ No active bots found for this location`);
        console.log(`[BotExecution] 💡 Check: 1) Bot status='active', 2) Bot installed in channel with is_active=true`);
        console.log(`==========================================\n`);
        return;
      }

      console.log(`[BotExecution] ✅ Found ${bots.length} active bot(s): ${bots.map(b => `${b.name} (${b.status})`).join(', ')}`);

      // Process each bot
      for (const bot of bots) {
        await this.processBot(bot, input);
      }
      console.log(`==========================================\n`);
    } catch (error) {
      console.log(`[BotExecution] ❌ ERROR: ${error.message}`);
      console.log(`==========================================\n`);
      this.logger.error(`[BotExecution] Error: ${error.message}`, error.stack);
    } finally {
      // Clean up recursion tracking after a delay
      setTimeout(() => {
        this.executionDepth.delete(executionKey);
      }, 5000);
    }
  }

  /**
   * Process a single bot for a message
   */
  private async processBot(bot: Bot, input: BotExecutionInput): Promise<void> {
    console.log(`\n[BotExecution] 🤖 Processing bot: ${bot.name} (${bot.id})`);

    // Check rate limit
    if (!this.checkRateLimit(bot.id, bot.settings?.rateLimit || 60)) {
      console.log(`[BotExecution] ⏱️ Rate limit exceeded for bot ${bot.id}`);
      return;
    }

    // Get active triggers for this bot
    const triggers = await this.triggersService.getActiveTriggers(bot.id);
    if (triggers.length === 0) {
      console.log(`[BotExecution] ⚠️ No active triggers found for bot ${bot.name}`);
      console.log(`[BotExecution] 💡 Create triggers with is_active=true in the bot builder`);
      return;
    }

    console.log(`[BotExecution] 📋 Found ${triggers.length} active trigger(s): ${triggers.map(t => `${t.name} (${t.triggerType})`).join(', ')}`);

    // Build evaluation context
    const evalContext: TriggerEvaluationContext = {
      messageContent: input.messageContent,
      userId: input.userId,
      channelId: input.channelId,
      conversationId: input.conversationId,
      mentions: input.mentions,
      isThread: input.isThread,
      botId: bot.id,
      botName: bot.name,
    };

    // Evaluate triggers (sorted by priority)
    let anyMatched = false;
    for (const trigger of triggers) {
      console.log(`[BotExecution] 🔎 Evaluating trigger: ${trigger.name} (${trigger.triggerType})`);
      console.log(`[BotExecution]    Config: ${JSON.stringify(trigger.triggerConfig)}`);

      const match = this.triggerEvaluator.evaluate(trigger, evalContext);

      if (match.matched) {
        anyMatched = true;
        console.log(`[BotExecution] ✅ TRIGGER MATCHED: ${trigger.name}`);
        console.log(`[BotExecution]    Capture groups: ${JSON.stringify(match.captureGroups)}`);

        // Check cooldown
        const inCooldown = await this.triggerEvaluator.isInCooldown(
          trigger.id,
          input.userId,
          input.channelId,
          input.conversationId,
        );

        if (inCooldown) {
          console.log(`[BotExecution] ⏳ User ${input.userId} is in cooldown for trigger ${trigger.id}`);
          continue;
        }

        // Execute actions for this trigger
        await this.executeActionsForTrigger(bot, trigger, match, input);

        // Set cooldown
        if (trigger.cooldownSeconds > 0) {
          await this.triggerEvaluator.setCooldown(
            trigger.id,
            input.userId,
            trigger.cooldownSeconds,
            input.channelId,
            input.conversationId,
          );
        }

        // Only process first matching trigger per bot (can be configured)
        break;
      } else {
        console.log(`[BotExecution] ❌ Trigger not matched: ${trigger.name} - Reason: ${match.reason || 'No match'}`);
      }
    }

    if (!anyMatched) {
      console.log(`[BotExecution] ⚠️ No triggers matched for bot ${bot.name}`);
    }
  }

  /**
   * Execute actions for a matched trigger
   */
  private async executeActionsForTrigger(
    bot: Bot,
    trigger: BotTrigger,
    match: TriggerMatch,
    input: BotExecutionInput,
  ): Promise<void> {
    console.log(`\n[BotExecution] 🎯 Executing actions for trigger: ${trigger.name}`);

    // Get actions for this trigger
    const actions = await this.actionsService.getActionsForTrigger(bot.id, trigger.id);
    if (actions.length === 0) {
      console.log(`[BotExecution] ⚠️ No actions configured for trigger ${trigger.name}`);
      console.log(`[BotExecution] 💡 Create actions and link them to this trigger (or make them global)`);
      return;
    }

    console.log(`[BotExecution] 📝 Found ${actions.length} action(s): ${actions.map(a => `${a.name} (${a.actionType})`).join(', ')}`);

    // Build execution context
    const execContext: ActionExecutionContext = this.variablesService.buildContext({
      userId: input.userId,
      userName: input.userName,
      userEmail: input.userEmail,
      messageId: input.messageId,
      messageContent: input.messageContent,
      messageContentHtml: input.messageContentHtml,
      channelId: input.channelId,
      conversationId: input.conversationId,
      workspaceId: input.workspaceId,
      botId: bot.id,
      botName: bot.name,
      botDisplayName: bot.displayName,
      captureGroups: match.captureGroups,
    }) as ActionExecutionContext;

    execContext.workspaceId = input.workspaceId;
    execContext.channelId = input.channelId;
    execContext.conversationId = input.conversationId;
    execContext.messageId = input.messageId;
    execContext.userId = input.userId;

    // Get installation for logging
    const installations = input.channelId
      ? await this.installationsService.getInstallationsForChannel(input.channelId)
      : await this.installationsService.getInstallationsForConversation(input.conversationId!);
    const installation = installations.find(i => i.botId === bot.id);

    // Execute actions in order
    for (const action of actions) {
      console.log(`\n[BotExecution] 🚀 Executing action: ${action.name} (${action.actionType})`);
      console.log(`[BotExecution]    Config: ${JSON.stringify(action.actionConfig)}`);

      // Create execution log
      const logId = await this.createExecutionLog({
        botId: bot.id,
        triggerId: trigger.id,
        actionId: action.id,
        installationId: installation?.id,
        channelId: input.channelId,
        conversationId: input.conversationId,
        messageId: input.messageId,
        triggeredByUser: input.userId,
        triggerType: trigger.triggerType,
        triggerData: { captureGroups: match.captureGroups },
        actionType: action.actionType,
        actionInput: action.actionConfig,
        status: 'running',
      });

      // Execute action
      const result = await this.actionExecutor.execute(action, execContext);

      if (result.success) {
        console.log(`[BotExecution] ✅ Action completed successfully in ${result.executionTimeMs}ms`);
        console.log(`[BotExecution]    Output: ${JSON.stringify(result.output)?.substring(0, 200)}`);
      } else {
        console.log(`[BotExecution] ❌ Action FAILED: ${result.error}`);
      }

      // Update log
      await this.updateExecutionLog(logId, {
        status: result.success ? 'success' : 'failed',
        actionOutput: result.output || {},
        errorMessage: result.error,
        executionTimeMs: result.executionTimeMs,
      });

      // Handle failure policy
      if (!result.success) {
        if (action.failurePolicy === FailurePolicy.STOP) {
          this.logger.warn(`[BotExecution] Action ${action.id} failed with STOP policy, halting execution`);
          break;
        } else if (action.failurePolicy === FailurePolicy.RETRY) {
          // Simple retry once
          const retryResult = await this.actionExecutor.execute(action, execContext);
          if (!retryResult.success) {
            this.logger.warn(`[BotExecution] Action ${action.id} failed after retry`);
          }
        }
        // CONTINUE policy: just move to next action
      }

      // Apply response delay if configured
      const responseDelay = bot.settings?.responseDelay || 0;
      if (responseDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, responseDelay));
      }
    }
  }

  /**
   * Check rate limit for a bot
   */
  private checkRateLimit(botId: string, maxPerMinute: number): boolean {
    const now = Date.now();
    const record = this.executionCounts.get(botId);

    if (!record || record.resetAt < now) {
      // Reset or create new record
      this.executionCounts.set(botId, { count: 1, resetAt: now + 60000 });
      return true;
    }

    if (record.count >= maxPerMinute) {
      return false;
    }

    record.count++;
    return true;
  }

  /**
   * Create execution log entry
   */
  private async createExecutionLog(data: Partial<BotExecutionLog>): Promise<string> {
    const result = await this.db.insert('bot_execution_logs', {
      bot_id: data.botId,
      trigger_id: data.triggerId,
      action_id: data.actionId,
      installation_id: data.installationId,
      channel_id: data.channelId,
      conversation_id: data.conversationId,
      message_id: data.messageId,
      triggered_by_user: data.triggeredByUser,
      trigger_type: data.triggerType,
      trigger_data: data.triggerData || {},
      action_type: data.actionType,
      action_input: data.actionInput || {},
      action_output: data.actionOutput || {},
      status: data.status || 'pending',
      error_message: data.errorMessage,
      execution_time_ms: data.executionTimeMs,
    });

    return result.id;
  }

  /**
   * Update execution log entry
   */
  private async updateExecutionLog(logId: string, data: Partial<BotExecutionLog>): Promise<void> {
    const updateData: Record<string, any> = {};

    if (data.status !== undefined) updateData.status = data.status;
    if (data.actionOutput !== undefined) updateData.action_output = data.actionOutput;
    if (data.errorMessage !== undefined) updateData.error_message = data.errorMessage;
    if (data.executionTimeMs !== undefined) updateData.execution_time_ms = data.executionTimeMs;

    await this.db.update('bot_execution_logs', logId, updateData);
  }

  /**
   * Get execution logs for a bot
   */
  async getLogs(
    botId: string,
    options?: {
      triggerId?: string;
      actionId?: string;
      status?: string;
      channelId?: string;
      conversationId?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<BotExecutionLog[]> {
    let query = this.db.table('bot_execution_logs')
      .select('*')
      .where('bot_id', '=', botId);

    if (options?.triggerId) {
      query = query.where('trigger_id', '=', options.triggerId);
    }
    if (options?.actionId) {
      query = query.where('action_id', '=', options.actionId);
    }
    if (options?.status) {
      query = query.where('status', '=', options.status);
    }
    if (options?.channelId) {
      query = query.where('channel_id', '=', options.channelId);
    }
    if (options?.conversationId) {
      query = query.where('conversation_id', '=', options.conversationId);
    }

    const result = await query.execute();

    return (result.data || [])
      .map((log: any) => this.transformToLog(log))
      .sort((a: BotExecutionLog, b: BotExecutionLog) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(options?.offset || 0, (options?.offset || 0) + (options?.limit || 50));
  }

  /**
   * Transform database record to BotExecutionLog interface
   */
  private transformToLog(record: any): BotExecutionLog {
    return {
      id: record.id,
      botId: record.bot_id,
      triggerId: record.trigger_id,
      actionId: record.action_id,
      installationId: record.installation_id,
      channelId: record.channel_id,
      conversationId: record.conversation_id,
      messageId: record.message_id,
      triggeredByUser: record.triggered_by_user,
      triggerType: record.trigger_type,
      triggerData: record.trigger_data || {},
      actionType: record.action_type,
      actionInput: record.action_input || {},
      actionOutput: record.action_output || {},
      status: record.status,
      errorMessage: record.error_message,
      executionTimeMs: record.execution_time_ms,
      createdAt: record.created_at,
    };
  }
}
