import { Injectable, Logger, Inject, forwardRef, Optional } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { AiProviderService } from '../../ai-provider/ai-provider.service';
import { BotAction } from './bot-actions.service';
import { BotVariablesService, VariableContext } from './bot-variables.service';
import { ActionType, FailurePolicy } from '../dto/create-action.dto';
import { ChatService } from '../../chat/chat.service';
import { ProjectsService } from '../../projects/projects.service';
import { CalendarService } from '../../calendar/calendar.service';
import { AutoPilotService } from '../../autopilot/autopilot.service';
import { SharedConditionEvaluatorService } from '../../automation-core';
import axios from 'axios';

export interface ActionExecutionResult {
  actionId: string;
  actionType: ActionType;
  success: boolean;
  output?: any;
  error?: string;
  executionTimeMs: number;
}

export interface ActionExecutionContext extends VariableContext {
  workspaceId: string;
  channelId?: string;
  conversationId?: string;
  messageId?: string;
  userId: string;
}

@Injectable()
export class ActionExecutorService {
  private readonly logger = new Logger(ActionExecutorService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly variablesService: BotVariablesService,
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
    private readonly projectsService: ProjectsService,
    private readonly calendarService: CalendarService,
    @Inject(forwardRef(() => AutoPilotService))
    private readonly autoPilotService: AutoPilotService,
    @Optional() private readonly sharedConditionEvaluator?: SharedConditionEvaluatorService,
  ) {}

  // Legacy alias for the AI provider - delegates to db.getAI() until a real
  // AIProviderService is wired in.
  private get aiProvider(): any {
    return this.db.getAI();
  }

  /**
   * Execute a single action
   */
  async execute(
    action: BotAction,
    context: ActionExecutionContext,
  ): Promise<ActionExecutionResult> {
    const startTime = Date.now();

    try {
      this.logger.log(`[ActionExecutor] Executing action ${action.id} (${action.actionType})`);

      let output: any;

      switch (action.actionType) {
        case ActionType.SEND_MESSAGE:
          output = await this.executeSendMessage(action, context);
          break;
        case ActionType.SEND_AI_MESSAGE:
          output = await this.executeSendAiMessage(action, context);
          break;
        case ActionType.AI_AUTOPILOT:
          output = await this.executeAutopilotAction(action, context);
          break;
        case ActionType.CREATE_TASK:
          output = await this.executeCreateTask(action, context);
          break;
        case ActionType.CREATE_EVENT:
          output = await this.executeCreateEvent(action, context);
          break;
        case ActionType.CALL_WEBHOOK:
          output = await this.executeCallWebhook(action, context);
          break;
        case ActionType.SEND_EMAIL:
          output = await this.executeSendEmail(action, context);
          break;
        default:
          throw new Error(`Unknown action type: ${action.actionType}`);
      }

      const executionTimeMs = Date.now() - startTime;
      this.logger.log(`[ActionExecutor] Action ${action.id} completed in ${executionTimeMs}ms`);

      return {
        actionId: action.id,
        actionType: action.actionType,
        success: true,
        output,
        executionTimeMs,
      };
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      this.logger.error(`[ActionExecutor] Action ${action.id} failed: ${error.message}`);

      return {
        actionId: action.id,
        actionType: action.actionType,
        success: false,
        error: error.message,
        executionTimeMs,
      };
    }
  }

  /**
   * Execute send_message action
   */
  private async executeSendMessage(
    action: BotAction,
    context: ActionExecutionContext,
  ): Promise<any> {
    const config = action.actionConfig as {
      content: string;
      contentHtml?: string;
      replyToTrigger?: boolean;
      mentionUser?: boolean;
    };

    let content = this.variablesService.interpolate(config.content, context);
    const contentHtml = config.contentHtml
      ? this.variablesService.interpolate(config.contentHtml, context)
      : undefined;

    // Add mention if configured
    if (config.mentionUser && context.user?.name) {
      content = `@${context.user.name} ${content}`;
    }

    // Send message via chat service
    const messageData = {
      content,
      contentHtml,
      userId: 'bot', // Bot user ID
      workspaceId: context.workspaceId,
      channelId: context.channelId,
      conversationId: context.conversationId,
      replyToId: config.replyToTrigger ? context.messageId : undefined,
      metadata: {
        isBot: true,
        botId: context.bot?.id,
        botName: context.bot?.name,
      },
    };

    if (context.channelId) {
      return this.chatService.sendBotMessage(messageData);
    } else if (context.conversationId) {
      return this.chatService.sendBotDirectMessage(messageData);
    }

    throw new Error('No channel or conversation context');
  }

  /**
   * Execute send_ai_message action (using AutoPilot)
   */
  private async executeSendAiMessage(
    action: BotAction,
    context: ActionExecutionContext,
  ): Promise<any> {
    const config = action.actionConfig as {
      systemPrompt?: string;
      useAutopilot?: boolean;
      maxTokens?: number;
      includeContext?: boolean;
      contextMessageCount?: number;
    };

    // Get message context if needed
    let messageContext = '';
    if (config.includeContext && context.channelId) {
      const recentMessages = await this.chatService.getRecentMessages(
        context.channelId,
        config.contextMessageCount || 5,
      );
      messageContext = recentMessages
        .map((m: any) => `${m.user?.name || 'User'}: ${m.content}`)
        .join('\n');
    }

    // Build prompt
    const userMessage = context.message?.content || '';
    const prompt = messageContext
      ? `Context:\n${messageContext}\n\nUser message: ${userMessage}`
      : userMessage;

    // Call AI service
    const aiResponse = await this.aiProvider.generateText(prompt, {
      systemMessage: config.systemPrompt || 'You are a helpful assistant.',
      maxTokens: config.maxTokens || 500,
      saveToDatabase: false,
    });

    const responseText =
      typeof aiResponse === 'string'
        ? aiResponse
        : aiResponse?.text || aiResponse?.content || JSON.stringify(aiResponse);

    // Send the AI response as a message
    return this.executeSendMessage(
      {
        ...action,
        actionConfig: { content: responseText, replyToTrigger: true },
      },
      context,
    );
  }

  /**
   * Execute create_task action
   */
  private async executeCreateTask(
    action: BotAction,
    context: ActionExecutionContext,
  ): Promise<any> {
    const config = action.actionConfig as {
      titleTemplate: string;
      descriptionTemplate?: string;
      projectId?: string;
      useDefaultProject?: boolean;
      priority?: string;
      assignToTriggeringUser?: boolean;
      dueDateOffsetDays?: number;
    };

    const title = this.variablesService.interpolate(config.titleTemplate, context);
    const description = config.descriptionTemplate
      ? this.variablesService.interpolate(config.descriptionTemplate, context)
      : undefined;

    // Get project ID
    let projectId = config.projectId;
    if (!projectId && config.useDefaultProject !== false) {
      // Get first project in workspace
      const projects = await this.projectsService.findAll(context.workspaceId, context.userId);
      projectId = projects[0]?.id;
    }

    if (!projectId) {
      throw new Error('No project available for task creation');
    }

    // Calculate due date
    let dueDate: string | undefined;
    if (config.dueDateOffsetDays !== undefined) {
      const date = new Date();
      date.setDate(date.getDate() + config.dueDateOffsetDays);
      dueDate = date.toISOString();
    }

    // Create task DTO
    const taskDto = {
      title,
      description,
      priority: config.priority || 'medium',
      assigned_to: config.assignToTriggeringUser ? context.userId : undefined,
      due_date: dueDate,
    };

    return this.projectsService.createTask(projectId, taskDto as any, context.userId);
  }

  /**
   * Execute create_event action
   */
  private async executeCreateEvent(
    action: BotAction,
    context: ActionExecutionContext,
  ): Promise<any> {
    const config = action.actionConfig as {
      titleTemplate: string;
      descriptionTemplate?: string;
      durationMinutes?: number;
      startTimeOffsetHours?: number;
      addTriggeringUserAsAttendee?: boolean;
    };

    const title = this.variablesService.interpolate(config.titleTemplate, context);
    const description = config.descriptionTemplate
      ? this.variablesService.interpolate(config.descriptionTemplate, context)
      : undefined;

    // Calculate start time
    const startTime = new Date();
    if (config.startTimeOffsetHours) {
      startTime.setHours(startTime.getHours() + config.startTimeOffsetHours);
    }

    // Calculate end time
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + (config.durationMinutes || 30));

    // Create event DTO
    const eventDto = {
      title,
      description,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      attendees: config.addTriggeringUserAsAttendee ? [context.userId] : [],
    };

    return this.calendarService.createEvent(context.workspaceId, eventDto as any, context.userId);
  }

  /**
   * Execute call_webhook action
   */
  private async executeCallWebhook(
    action: BotAction,
    context: ActionExecutionContext,
  ): Promise<any> {
    const config = action.actionConfig as {
      url: string;
      method?: string;
      headers?: Record<string, string>;
      bodyTemplate?: string;
      timeout?: number;
    };

    // Validate URL (block internal URLs)
    const url = new URL(config.url);
    const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
    if (blockedHosts.includes(url.hostname)) {
      throw new Error('Webhook URL cannot target internal addresses');
    }

    // Interpolate body
    let body: any;
    if (config.bodyTemplate) {
      const bodyStr = this.variablesService.interpolate(config.bodyTemplate, context);
      try {
        body = JSON.parse(bodyStr);
      } catch {
        body = bodyStr;
      }
    }

    // Make request
    const response = await axios({
      method: (config.method || 'POST').toLowerCase() as any,
      url: config.url,
      headers: config.headers || {},
      data: body,
      timeout: config.timeout || 10000,
    });

    return {
      status: response.status,
      data: response.data,
    };
  }

  /**
   * Execute send_email action
   */
  private async executeSendEmail(action: BotAction, context: ActionExecutionContext): Promise<any> {
    const config = action.actionConfig as {
      toTemplate: string;
      subjectTemplate: string;
      bodyTemplate: string;
      cc?: string[];
      replyTo?: string;
    };

    const to = this.variablesService.interpolate(config.toTemplate, context);
    const subject = this.variablesService.interpolate(config.subjectTemplate, context);
    const body = this.variablesService.interpolate(config.bodyTemplate, context);

    // Send email via database (signature: to, subject, html, text?, options?)
    return /* TODO: use EmailService */ this.db.sendEmail(to, subject, body, undefined, {
      cc: config.cc,
      replyTo: config.replyTo,
    });
  }

  /**
   * Execute AI AutoPilot action
   */
  private async executeAutopilotAction(
    action: BotAction,
    context: ActionExecutionContext,
  ): Promise<any> {
    const config = action.actionConfig as {
      systemPrompt?: string;
      includeContext?: boolean;
      contextMessageCount?: number;
      replyToTrigger?: boolean;
      allowActions?: boolean;
    };

    this.logger.log(`[ActionExecutor] Executing AutoPilot action for bot command`);

    // Get command text from capture groups (captureGroups[1] has the command without bot mention)
    const commandText = context.captureGroups?.[1] || context.message?.content || '';

    if (!commandText || commandText.trim() === '') {
      // If no command given, send help message
      const helpResponse = await this.autoPilotService.executeCommand(
        {
          command: 'help',
          workspaceId: context.workspaceId,
          executeActions: false,
        },
        context.userId,
      );

      return this.sendBotAutopilotResponse(
        helpResponse.message,
        context,
        config.replyToTrigger !== false,
      );
    }

    // Build AutoPilot context
    let messageContext = '';
    if (config.includeContext !== false && context.channelId) {
      try {
        const recentMessages = await this.chatService.getRecentMessages(
          context.channelId,
          config.contextMessageCount || 10,
        );
        messageContext = recentMessages
          .map((m: any) => `${m.user?.name || 'User'}: ${m.content}`)
          .join('\n');
      } catch (error) {
        this.logger.warn(`[ActionExecutor] Failed to fetch message context: ${error.message}`);
      }
    }

    // Prepare AutoPilot command with context
    let fullCommand = commandText;
    if (config.systemPrompt) {
      fullCommand = `${config.systemPrompt}\n\nUser request: ${commandText}`;
    }
    if (messageContext) {
      fullCommand = `Recent conversation:\n${messageContext}\n\n${fullCommand}`;
    }

    // Execute AutoPilot
    const autoPilotResponse = await this.autoPilotService.executeCommand(
      {
        command: fullCommand,
        workspaceId: context.workspaceId,
        executeActions: config.allowActions !== false,
        context: {
          channelId: context.channelId,
          conversationId: context.conversationId,
        },
      },
      context.userId,
    );

    if (!autoPilotResponse.success) {
      throw new Error(`AutoPilot execution failed: ${autoPilotResponse.error || 'Unknown error'}`);
    }

    // Send the AutoPilot response as a bot message
    return this.sendBotAutopilotResponse(
      autoPilotResponse.message,
      context,
      config.replyToTrigger !== false,
      autoPilotResponse.actions,
    );
  }

  /**
   * Send bot AutoPilot response as a message
   */
  private async sendBotAutopilotResponse(
    responseText: string,
    context: ActionExecutionContext,
    replyToTrigger: boolean,
    actions?: any[],
  ): Promise<any> {
    // Format response with actions if present
    let messageContent = responseText;
    if (actions && actions.length > 0) {
      const actionSummary = actions.map((a: any) => `✓ ${a.description || a.tool}`).join('\n');
      messageContent = `${responseText}\n\n**Actions taken:**\n${actionSummary}`;
    }

    // Send message via chat service
    const messageData = {
      content: messageContent,
      userId: 'bot',
      workspaceId: context.workspaceId,
      channelId: context.channelId,
      conversationId: context.conversationId,
      replyToId: replyToTrigger ? context.messageId : undefined,
      metadata: {
        isBot: true,
        isAutopilot: true,
        botId: context.bot?.id,
        botName: context.bot?.name,
        actions: actions || [],
      },
    };

    if (context.channelId) {
      return this.chatService.sendBotMessage(messageData);
    } else if (context.conversationId) {
      return this.chatService.sendBotDirectMessage(messageData);
    }

    throw new Error('No channel or conversation context');
  }
}
