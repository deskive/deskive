import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { AgentToolsService } from './tools.service';
import { AgentMemoryService } from './memory.service';
import { SuperAgentMemoryService, MemoryType, ContextType } from '../../super-agent-memory';
import { ExecutedAction } from '../dto/autopilot.dto';

export interface AgentExecutionResult {
  output: string;
  actions: ExecutedAction[];
  reasoning?: string;
}

export interface AgentContext {
  userId: string;
  workspaceId: string;
  sessionId: string;
  executeActions: boolean;
  [key: string]: any;
}

@Injectable()
export class LangChainAgentService implements OnModuleInit {
  private readonly logger = new Logger(LangChainAgentService.name);
  private openai: ChatOpenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly toolsService: AgentToolsService,
    private readonly memoryService: AgentMemoryService,
    private readonly superAgentMemoryService: SuperAgentMemoryService,
  ) {
    // Initialize OpenAI client
    this.openai = new ChatOpenAI({
      openAIApiKey: this.configService.get<string>('OPENAI_API_KEY'),
      modelName: this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o-mini',
      temperature: 0.7,
    });
  }

  async onModuleInit() {
    await this.initializeAgent();
  }

  /**
   * Initialize the agent
   */
  private async initializeAgent() {
    this.logger.log('[AutoPilot] Initializing agent with OpenAI...');
    const tools = this.toolsService.getAllTools();
    this.logger.log(`[AutoPilot] Agent initialized with ${tools.length} tools`);
  }

  /**
   * Execute a command with the agent
   * Supports multi-step tool execution for complex tasks
   */
  async execute(
    command: string,
    context: AgentContext,
    userLanguage: string = 'en',
  ): Promise<AgentExecutionResult> {
    this.logger.log(`[AutoPilot] Executing: "${command.substring(0, 100)}..."`);

    // Set context in tools service for this execution
    this.toolsService.setContext(context);

    // Get tools for function calling
    const tools = this.toolsService.getAllTools();

    // Build the prompt with system message and tools description
    const systemPrompt = this.getSystemPrompt(userLanguage);
    const toolsDescription = this.buildToolsDescription(tools);
    const chatHistory = await this.memoryService.getConversationSummary(context.sessionId);
    const userInput = this.buildAgentInput(command, context);

    // Retrieve relevant memories for context enrichment
    let memoryContext = '';
    try {
      const relevantMemories = await this.superAgentMemoryService.getRelevantMemories(
        command,
        context.workspaceId,
        context.userId,
        5, // Limit to 5 most relevant memories
      );
      memoryContext = relevantMemories.contextString;
      if (memoryContext) {
        this.logger.log(
          `[AutoPilot] Retrieved ${relevantMemories.memories.length} memories, ${relevantMemories.preferences.length} preferences`,
        );
      }
    } catch (memError) {
      this.logger.warn(`[AutoPilot] Failed to retrieve memories: ${memError.message}`);
    }

    const actions: ExecutedAction[] = [];
    let output = '';
    const toolResults: string[] = [];
    const MAX_ITERATIONS = 10; // Allow complex multi-step workflows

    try {
      let iteration = 0;
      let continueExecution = true;

      while (continueExecution && iteration < MAX_ITERATIONS) {
        iteration++;
        this.logger.log(`[AutoPilot] Iteration ${iteration}/${MAX_ITERATIONS}`);

        // Build context from previous tool results
        const previousToolContext =
          toolResults.length > 0
            ? `\n\nPrevious tool results in this conversation:\n${toolResults.map((r, i) => `${i + 1}. ${r}`).join('\n')}`
            : '';

        // Build the decision prompt with memory context
        const decisionPrompt = `${systemPrompt}

Available Tools:
${toolsDescription}

${chatHistory ? `Previous conversation:\n${chatHistory}\n\n` : ''}${memoryContext ? `${memoryContext}\n\n` : ''}User Request: ${userInput}${previousToolContext}

TASK: Analyze what the user wants and decide the NEXT ACTION.

${
  toolResults.length > 0
    ? `
STATUS: You have already executed ${toolResults.length} tool(s). Review the results above.
QUESTION: Is the user's request FULLY completed? If not, what's the next tool to call?
`
    : `
STATUS: This is the first step. Analyze what tools you need to complete the request.
`
}

RESPOND WITH ONLY ONE OF THESE JSON FORMATS:

Option 1 - Need to use a tool:
{
  "use_tool": true,
  "tool_name": "exact_tool_name",
  "tool_input": { "param": "value" },
  "explanation": "Why this tool is needed"
}

Option 2 - Request is complete, provide final response:
{
  "use_tool": false,
  "response": "Your detailed response to the user"
}

DECISION RULES:
1. If user wants to CREATE something → use the create tool
2. If user mentions "tomorrow/today/next week" → FIRST get_current_date_time, THEN create
3. If previous tool gave you needed data → use it in the next tool call
4. Only respond with use_tool=false when the ENTIRE request is fulfilled
5. For ANALYSIS/DOCUMENT requests: Include the FULL analysis in your response, don't summarize it further. Show all key points, findings, and details from the analysis tool result.
6. Extract IDs, dates, names from previous results to use in next tool
7. IMPORTANT - For FUTURE/SCHEDULED actions like "send email at 9:50 AM", "do X in 30 minutes", "remind me at 5 PM":
   → Use schedule_action tool to schedule ONE-TIME future actions
   → NEVER loop or repeatedly call the action tool until a certain time
   → NEVER send multiple copies of the same action

EMAIL RULES - CRITICAL:
8. NEVER send multiple emails for a single request - call send_email exactly ONCE
9. When user says "send the same email/mail to X" or "resend to X":
   → Look at the previous email you sent in this conversation
   → Use the EXACT same subject, body, and attachments
   → Only change the recipient to the new address
   → Call send_email exactly ONCE
10. If the first email attempt failed due to typo, just send ONE corrected email

COMMON PATTERNS:
- Schedule meeting: get_current_date_time → create_calendar_event
- Create task with date: get_current_date_time → create_task (with due_date)
- Assign task to person: list_workspace_members → create_task (with assignee_id)
- Send notification: list_channels → send_channel_message
- DELAYED ACTION (e.g., "send email at 9:50 AM"): get_current_date_time → schedule_action (CONVERT local time to UTC!)
- REMINDER (e.g., "remind me in 30 minutes"): get_current_date_time → schedule_action (calculate future time)
- EMAIL A NOTE: create_note → send_email (use includeNoteIds for inline OR attachNoteIds for file attachment)
- EMAIL A FILE: search_files/list_recent_files → send_email with attachFileIds: [fileId]
- EMAIL WITH ATTACHMENTS: send_email with attachNoteIds/attachProjectIds/attachFileIds for file attachments
- RESEND EMAIL (e.g., "send same mail to X"): Use SAME subject/body/attachments from previous email, just change recipient. Call send_email ONCE only!

CRITICAL TIMEZONE HANDLING:
- get_current_date_time returns the user's timezone (e.g., Asia/Dhaka = UTC+6)
- When user says "10:20 AM", this is LOCAL time, NOT UTC
- You MUST convert: For UTC+6, 10:20 AM local = 04:20 UTC
- scheduledTime parameter MUST be in UTC (e.g., "2024-01-21T04:20:00Z")`;

        this.logger.log('[AutoPilot] Calling OpenAI for decision...');

        let decisionText: string;
        try {
          const response = await this.openai.invoke(decisionPrompt);
          decisionText =
            typeof response.content === 'string'
              ? response.content
              : JSON.stringify(response.content);
          this.logger.log('[AutoPilot] OpenAI response received');
        } catch (aiError) {
          this.logger.error(`[AutoPilot] OpenAI call failed: ${aiError.message}`);
          throw new Error(`AI service error: ${aiError.message}`);
        }
        this.logger.debug(`[AutoPilot] Decision: ${decisionText.substring(0, 300)}...`);

        // Parse the AI's decision
        const decision = this.parseAIDecision(decisionText);

        if (decision.use_tool && decision.tool_name) {
          // Find and execute the tool
          const tool = tools.find((t) => t.name === decision.tool_name);

          if (tool) {
            this.logger.log(`[AutoPilot] Calling tool: ${decision.tool_name}`);

            // Map AI parameter names to expected schema names
            const mappedInput = this.mapToolInput(decision.tool_name, decision.tool_input || {});
            this.logger.debug(`[AutoPilot] Original input: ${JSON.stringify(decision.tool_input)}`);
            this.logger.debug(`[AutoPilot] Mapped input: ${JSON.stringify(mappedInput)}`);

            try {
              const toolResult = await tool.invoke(mappedInput);
              const isSuccess = !toolResult?.includes('"success":false');

              actions.push({
                tool: decision.tool_name,
                input: mappedInput,
                output: toolResult,
                success: isSuccess,
              });

              // Add to tool results context for next iteration
              toolResults.push(`Tool "${decision.tool_name}" result: ${toolResult}`);

              this.logger.log(
                `[AutoPilot] Tool ${decision.tool_name} executed successfully: ${isSuccess}`,
              );

              // Continue to next iteration to see if more tools are needed
              continueExecution = true;
            } catch (toolError) {
              this.logger.error(`[AutoPilot] Tool execution failed: ${toolError.message}`);
              actions.push({
                tool: decision.tool_name,
                input: mappedInput,
                output: null,
                success: false,
                error: toolError.message,
              });
              toolResults.push(`Tool "${decision.tool_name}" failed: ${toolError.message}`);

              // Continue to let AI decide how to handle the error
              continueExecution = true;
            }
          } else {
            this.logger.warn(`[AutoPilot] Tool not found: ${decision.tool_name}`);
            toolResults.push(`Tool "${decision.tool_name}" not found`);
            continueExecution = true;
          }
        } else {
          // No more tools needed, AI provided final response
          output = decision.response || decisionText;
          continueExecution = false;
          this.logger.log('[AutoPilot] Final response received, ending execution');
        }
      }

      // If we hit max iterations without a final response, generate one
      if (!output && actions.length > 0) {
        this.logger.log('[AutoPilot] Max iterations reached, generating final summary...');
        const summaryPrompt = `${systemPrompt}

User's original request: ${userInput}

Actions performed:
${actions.map((a, i) => `${i + 1}. ${a.tool}: ${a.success ? 'Success' : 'Failed'} - ${a.output || a.error}`).join('\n')}

Please provide a friendly, concise summary of what was done for the user.`;

        try {
          const summaryResponse = await this.openai.invoke(summaryPrompt);
          output =
            typeof summaryResponse.content === 'string'
              ? summaryResponse.content
              : JSON.stringify(summaryResponse.content);
        } catch (summaryError) {
          output = `I completed ${actions.length} action(s): ${actions.map((a) => `${a.tool} (${a.success ? 'success' : 'failed'})`).join(', ')}`;
        }
      }

      // Store episodic memory for significant interactions
      if (actions.length > 0 && actions.some((a) => a.success)) {
        this.storeExecutionMemory(command, actions, output, context).catch((err) => {
          this.logger.warn(`[AutoPilot] Failed to store execution memory: ${err.message}`);
        });
      }

      return {
        output:
          output || "I processed your request but couldn't generate a response. Please try again.",
        actions,
        reasoning:
          actions.length > 0
            ? `Used ${actions.length} tool(s): ${actions.map((a) => a.tool).join(', ')}`
            : undefined,
      };
    } catch (error) {
      this.logger.error(`[AutoPilot] Execution error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Store execution as episodic memory
   */
  private async storeExecutionMemory(
    command: string,
    actions: ExecutedAction[],
    output: string,
    context: AgentContext,
  ): Promise<void> {
    try {
      const successfulActions = actions.filter((a) => a.success);
      if (successfulActions.length === 0) return;

      // Calculate importance based on action types
      const importance = this.calculateMemoryImportance(successfulActions);

      // Extract tags from action types
      const tags = this.extractMemoryTags(successfulActions);

      // Build memory content
      const content = this.buildMemoryContent(command, successfulActions, output);

      // Determine context type from actions
      const contextType = this.determineContextType(successfulActions);

      await this.superAgentMemoryService.storeEpisodicMemory({
        workspaceId: context.workspaceId,
        userId: context.userId,
        content,
        importance,
        tags,
        contextType,
        metadata: {
          toolsUsed: successfulActions.map((a) => a.tool),
          sessionId: context.sessionId,
        },
      });

      // Learn preferences from user actions
      await this.learnPreferencesFromActions(successfulActions, context);

      this.logger.log(`[AutoPilot] Stored episodic memory with importance ${importance}`);
    } catch (error) {
      this.logger.error(`[AutoPilot] Failed to store memory: ${error.message}`);
    }
  }

  /**
   * Calculate importance score based on action types
   */
  private calculateMemoryImportance(actions: ExecutedAction[]): number {
    const highImportanceActions = [
      'create_project',
      'create_calendar_event',
      'create_video_meeting',
      'send_email',
    ];
    const mediumImportanceActions = [
      'create_task',
      'create_note',
      'update_task_status',
      'send_channel_message',
    ];

    let maxImportance = 5;
    for (const action of actions) {
      if (highImportanceActions.includes(action.tool)) {
        maxImportance = Math.max(maxImportance, 8);
      } else if (mediumImportanceActions.includes(action.tool)) {
        maxImportance = Math.max(maxImportance, 6);
      }
    }

    return maxImportance;
  }

  /**
   * Extract tags from actions
   */
  private extractMemoryTags(actions: ExecutedAction[]): string[] {
    const tags = new Set<string>();

    for (const action of actions) {
      // Extract action category
      if (action.tool.includes('task')) tags.add('task');
      if (action.tool.includes('calendar') || action.tool.includes('event')) tags.add('calendar');
      if (action.tool.includes('note')) tags.add('note');
      if (action.tool.includes('project')) tags.add('project');
      if (action.tool.includes('message') || action.tool.includes('channel')) tags.add('chat');
      if (action.tool.includes('email')) tags.add('email');
      if (action.tool.includes('video') || action.tool.includes('meeting')) tags.add('meeting');
      if (action.tool.includes('file')) tags.add('file');

      // Extract operation type
      if (action.tool.includes('create')) tags.add('created');
      if (action.tool.includes('update')) tags.add('updated');
      if (action.tool.includes('send')) tags.add('sent');
    }

    return Array.from(tags);
  }

  /**
   * Build memory content from execution
   */
  private buildMemoryContent(command: string, actions: ExecutedAction[], output: string): string {
    const actionSummary = actions
      .map((a) => {
        // Extract key info from output
        try {
          const parsed = JSON.parse(a.output || '{}');
          if (parsed.name) return `${a.tool}: "${parsed.name}"`;
          if (parsed.title) return `${a.tool}: "${parsed.title}"`;
          return a.tool;
        } catch {
          return a.tool;
        }
      })
      .join(', ');

    return `User request: "${command.substring(0, 200)}". Actions: ${actionSummary}. Result: ${output.substring(0, 200)}`;
  }

  /**
   * Determine context type from actions
   */
  private determineContextType(actions: ExecutedAction[]): ContextType | undefined {
    for (const action of actions) {
      if (action.tool.includes('task')) return ContextType.TASK;
      if (action.tool.includes('calendar') || action.tool.includes('event'))
        return ContextType.CALENDAR;
      if (action.tool.includes('note')) return ContextType.NOTE;
      if (action.tool.includes('project')) return ContextType.PROJECT;
      if (action.tool.includes('video') || action.tool.includes('meeting'))
        return ContextType.MEETING;
      if (action.tool.includes('message') || action.tool.includes('channel'))
        return ContextType.CHAT;
      if (action.tool.includes('email')) return ContextType.EMAIL;
      if (action.tool.includes('file')) return ContextType.FILE;
    }
    return undefined;
  }

  /**
   * Learn preferences from user actions
   */
  private async learnPreferencesFromActions(
    actions: ExecutedAction[],
    context: AgentContext,
  ): Promise<void> {
    for (const action of actions) {
      try {
        const input = action.input || {};

        // Learn from task creation
        if (action.tool === 'create_task' && action.success) {
          if (input.priority) {
            await this.superAgentMemoryService.learnFromAction(
              context.workspaceId,
              context.userId,
              'create_task',
              { priority: input.priority },
            );
          }
        }

        // Learn from calendar event creation
        if (action.tool === 'create_calendar_event' && action.success) {
          // Extract time preference
          const startTime = input.startTime || input.start_time;
          if (startTime) {
            const hour = new Date(startTime).getHours();
            await this.superAgentMemoryService.learnFromAction(
              context.workspaceId,
              context.userId,
              'schedule_meeting',
              { time: `${hour}:00` },
            );
          }
        }
      } catch (error) {
        // Silent fail - preference learning is not critical
      }
    }
  }

  /**
   * Execute a command with streaming response
   * Streams status updates and the final response text
   */
  async executeStream(
    command: string,
    context: AgentContext,
    onStream: (event: { type: string; data: any }) => void,
    userLanguage: string = 'en',
  ): Promise<AgentExecutionResult> {
    this.logger.log(
      `[AutoPilot] Executing with streaming: "${command.substring(0, 100)}..." [Language: ${userLanguage}]`,
    );

    // Set context in tools service for this execution
    this.toolsService.setContext(context);

    // Get tools for function calling
    const tools = this.toolsService.getAllTools();

    // Build the prompt with system message and tools description
    const systemPrompt = this.getSystemPrompt(userLanguage);
    const toolsDescription = this.buildToolsDescription(tools);
    const chatHistory = await this.memoryService.getConversationSummary(context.sessionId);
    const userInput = this.buildAgentInput(command, context);

    // Retrieve relevant memories for context enrichment
    let memoryContext = '';
    try {
      const relevantMemories = await this.superAgentMemoryService.getRelevantMemories(
        command,
        context.workspaceId,
        context.userId,
        5,
      );
      memoryContext = relevantMemories.contextString;
      if (memoryContext) {
        this.logger.log(
          `[AutoPilot] Stream: Retrieved ${relevantMemories.memories.length} memories`,
        );
      }
    } catch (memError) {
      this.logger.warn(`[AutoPilot] Stream: Failed to retrieve memories: ${memError.message}`);
    }

    const actions: ExecutedAction[] = [];
    let output = '';
    const toolResults: string[] = [];
    const MAX_ITERATIONS = 10;

    try {
      let iteration = 0;
      let continueExecution = true;

      while (continueExecution && iteration < MAX_ITERATIONS) {
        iteration++;
        this.logger.log(`[AutoPilot] Stream iteration ${iteration}/${MAX_ITERATIONS}`);

        // Build context from previous tool results
        const previousToolContext =
          toolResults.length > 0
            ? `\n\nPrevious tool results in this conversation:\n${toolResults.map((r, i) => `${i + 1}. ${r}`).join('\n')}`
            : '';

        // Build the decision prompt with memory context
        const decisionPrompt = `${systemPrompt}

Available Tools:
${toolsDescription}

${chatHistory ? `Previous conversation:\n${chatHistory}\n\n` : ''}${memoryContext ? `${memoryContext}\n\n` : ''}User Request: ${userInput}${previousToolContext}

TASK: Analyze what the user wants and decide the NEXT ACTION.

${
  toolResults.length > 0
    ? `
STATUS: You have already executed ${toolResults.length} tool(s). Review the results above.
QUESTION: Is the user's request FULLY completed? If not, what's the next tool to call?
`
    : `
STATUS: This is the first step. Analyze what tools you need to complete the request.
`
}

RESPOND WITH ONLY ONE OF THESE JSON FORMATS:

Option 1 - Need to use a tool:
{
  "use_tool": true,
  "tool_name": "exact_tool_name",
  "tool_input": { "param": "value" },
  "explanation": "Why this tool is needed"
}

Option 2 - Request is complete, provide final response:
{
  "use_tool": false,
  "response": "Your detailed response to the user"
}

DECISION RULES:
1. If user wants to CREATE something → use the create tool
2. If user mentions "tomorrow/today/next week" → FIRST get_current_date_time, THEN create
3. If previous tool gave you needed data → use it in the next tool call
4. Only respond with use_tool=false when the ENTIRE request is fulfilled
5. For ANALYSIS/DOCUMENT requests: Include the FULL analysis in your response, don't summarize it further. Show all key points, findings, and details from the analysis tool result.
6. Extract IDs, dates, names from previous results to use in next tool
7. IMPORTANT - For FUTURE/SCHEDULED actions like "send email at 9:50 AM", "do X in 30 minutes", "remind me at 5 PM":
   → Use schedule_action tool to schedule ONE-TIME future actions
   → NEVER loop or repeatedly call the action tool until a certain time
   → NEVER send multiple copies of the same action

EMAIL RULES - CRITICAL:
8. NEVER send multiple emails for a single request - call send_email exactly ONCE
9. When user says "send the same email/mail to X" or "resend to X":
   → Look at the previous email you sent in this conversation
   → Use the EXACT same subject, body, and attachments
   → Only change the recipient to the new address
   → Call send_email exactly ONCE
10. If the first email attempt failed due to typo, just send ONE corrected email

COMMON PATTERNS:
- Schedule meeting: get_current_date_time → create_calendar_event
- Create task with date: get_current_date_time → create_task (with due_date)
- Assign task to person: list_workspace_members → create_task (with assignee_id)
- Send notification: list_channels → send_channel_message
- DELAYED ACTION (e.g., "send email at 9:50 AM"): get_current_date_time → schedule_action (CONVERT local time to UTC!)
- REMINDER (e.g., "remind me in 30 minutes"): get_current_date_time → schedule_action (calculate future time)
- EMAIL A NOTE: create_note → send_email (use includeNoteIds for inline OR attachNoteIds for file attachment)
- EMAIL A FILE: search_files/list_recent_files → send_email with attachFileIds: [fileId]
- EMAIL WITH ATTACHMENTS: send_email with attachNoteIds/attachProjectIds/attachFileIds for file attachments
- RESEND EMAIL (e.g., "send same mail to X"): Use SAME subject/body/attachments from previous email, just change recipient. Call send_email ONCE only!

CRITICAL TIMEZONE HANDLING:
- get_current_date_time returns the user's timezone (e.g., Asia/Dhaka = UTC+6)
- When user says "10:20 AM", this is LOCAL time, NOT UTC
- You MUST convert: For UTC+6, 10:20 AM local = 04:20 UTC
- scheduledTime parameter MUST be in UTC (e.g., "2024-01-21T04:20:00Z")`;

        // Stream status: thinking
        const analyzingMessage = this.getAnalyzingMessage(userLanguage);
        onStream({ type: 'status', data: { status: 'thinking', message: analyzingMessage } });

        let decisionText: string;
        try {
          const response = await this.openai.invoke(decisionPrompt);
          decisionText =
            typeof response.content === 'string'
              ? response.content
              : JSON.stringify(response.content);
        } catch (aiError) {
          this.logger.error(`[AutoPilot] OpenAI call failed: ${aiError.message}`);
          throw new Error(`AI service error: ${aiError.message}`);
        }

        // Parse the AI's decision
        const decision = this.parseAIDecision(decisionText);

        if (decision.use_tool && decision.tool_name) {
          // Find and execute the tool
          const tool = tools.find((t) => t.name === decision.tool_name);

          if (tool) {
            // Stream status: executing tool
            onStream({
              type: 'status',
              data: {
                status: 'executing',
                message: `${this.getToolDisplayName(decision.tool_name, userLanguage)}...`,
                tool: decision.tool_name,
              },
            });

            const mappedInput = this.mapToolInput(decision.tool_name, decision.tool_input || {});

            try {
              const toolResult = await tool.invoke(mappedInput);
              const isSuccess = !toolResult?.includes('"success":false');

              actions.push({
                tool: decision.tool_name,
                input: mappedInput,
                output: toolResult,
                success: isSuccess,
              });

              toolResults.push(`Tool "${decision.tool_name}" result: ${toolResult}`);

              // Stream action completed
              onStream({
                type: 'action',
                data: {
                  tool: decision.tool_name,
                  success: isSuccess,
                  message: `${this.getToolDisplayName(decision.tool_name, userLanguage)} ${this.getStatusText('completed', userLanguage)}`,
                },
              });

              continueExecution = true;
            } catch (toolError) {
              this.logger.error(`[AutoPilot] Tool execution failed: ${toolError.message}`);
              actions.push({
                tool: decision.tool_name,
                input: mappedInput,
                output: null,
                success: false,
                error: toolError.message,
              });
              toolResults.push(`Tool "${decision.tool_name}" failed: ${toolError.message}`);

              onStream({
                type: 'action',
                data: {
                  tool: decision.tool_name,
                  success: false,
                  message: `${this.getToolDisplayName(decision.tool_name, userLanguage)} ${this.getStatusText('failed', userLanguage)}`,
                  error: toolError.message,
                },
              });

              continueExecution = true;
            }
          } else {
            toolResults.push(`Tool "${decision.tool_name}" not found`);
            continueExecution = true;
          }
        } else {
          // No more tools needed - stream the final response
          output = decision.response || decisionText;
          continueExecution = false;

          // Stream the response text
          onStream({
            type: 'text',
            data: { content: output },
          });
        }
      }

      // If we executed tools but didn't get a final response, generate one
      if (actions.length > 0 && !output) {
        onStream({
          type: 'status',
          data: { status: 'summarizing', message: 'Preparing summary...' },
        });

        const summaryPrompt = `${systemPrompt}

User's original request: ${userInput}

Actions performed:
${actions.map((a, i) => `${i + 1}. ${a.tool}: ${a.success ? 'Success' : 'Failed'} - ${a.output || a.error}`).join('\n')}

Please provide a friendly, concise summary of what was done for the user.`;

        try {
          // Stream the summary response
          const streamingOpenai = new ChatOpenAI({
            openAIApiKey: this.configService.get<string>('OPENAI_API_KEY'),
            modelName: this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o-mini',
            temperature: 0.7,
            streaming: true,
          });

          let fullResponse = '';
          const stream = await streamingOpenai.stream(summaryPrompt);

          for await (const chunk of stream) {
            const content = typeof chunk.content === 'string' ? chunk.content : '';
            if (content) {
              fullResponse += content;
              onStream({
                type: 'text_delta',
                data: { content },
              });
            }
          }

          output = fullResponse;
        } catch (summaryError) {
          output = `I completed ${actions.length} action(s): ${actions.map((a) => `${a.tool} (${a.success ? 'success' : 'failed'})`).join(', ')}`;
          onStream({
            type: 'text',
            data: { content: output },
          });
        }
      }

      // Store episodic memory for significant interactions
      if (actions.length > 0 && actions.some((a) => a.success)) {
        this.storeExecutionMemory(command, actions, output, context).catch((err) => {
          this.logger.warn(`[AutoPilot] Stream: Failed to store execution memory: ${err.message}`);
        });
      }

      return {
        output:
          output || "I processed your request but couldn't generate a response. Please try again.",
        actions,
        reasoning:
          actions.length > 0
            ? `Used ${actions.length} tool(s): ${actions.map((a) => a.tool).join(', ')}`
            : undefined,
      };
    } catch (error) {
      this.logger.error(`[AutoPilot] Stream execution error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get human-readable tool name for display
   */
  private getToolDisplayName(toolName: string, language: string = 'en'): string {
    const translations: Record<string, Record<string, string>> = {
      en: {
        create_task: 'Creating task',
        list_tasks: 'Fetching tasks',
        update_task: 'Updating task',
        create_calendar_event: 'Creating event',
        list_calendar_events: 'Fetching events',
        create_note: 'Creating note',
        update_note: 'Updating note',
        search_notes: 'Searching notes',
        send_channel_message: 'Sending message',
        send_direct_message: 'Sending message',
        list_channels: 'Fetching channels',
        list_workspace_members: 'Fetching members',
        get_current_date_time: 'Getting current time',
        list_projects: 'Fetching projects',
        create_project: 'Creating project',
        get_daily_summary: 'Generating daily summary',
        get_focus_recommendations: 'Analyzing focus recommendations',
        get_overdue_tasks: 'Fetching overdue tasks',
        get_upcoming_events: 'Fetching upcoming events',
      },
      ja: {
        create_task: 'タスクを作成中',
        list_tasks: 'タスクを取得中',
        update_task: 'タスクを更新中',
        create_calendar_event: 'イベントを作成中',
        list_calendar_events: 'イベントを取得中',
        create_note: 'ノートを作成中',
        update_note: 'ノートを更新中',
        search_notes: 'ノートを検索中',
        send_channel_message: 'メッセージを送信中',
        send_direct_message: 'メッセージを送信中',
        list_channels: 'チャンネルを取得中',
        list_workspace_members: 'メンバーを取得中',
        get_current_date_time: '現在時刻を取得中',
        list_projects: 'プロジェクトを取得中',
        create_project: 'プロジェクトを作成中',
        get_daily_summary: '今日のサマリーを生成中',
        get_focus_recommendations: '集中すべきことを分析中',
        get_overdue_tasks: '期限切れのタスクを取得中',
        get_upcoming_events: '今後のイベントを取得中',
      },
    };

    const languageTranslations = translations[language] || translations['en'];
    return languageTranslations[toolName] || toolName.replace(/_/g, ' ');
  }

  /**
   * Get status text in the specified language
   */
  private getStatusText(status: 'completed' | 'failed', language: string = 'en'): string {
    const translations: Record<string, Record<string, string>> = {
      en: {
        completed: 'completed',
        failed: 'failed',
      },
      ja: {
        completed: '完了',
        failed: '失敗',
      },
    };

    const languageTranslations = translations[language] || translations['en'];
    return languageTranslations[status] || status;
  }

  /**
   * Get language-specific instructions for the AI
   */
  private getLanguageInstructions(language: string): string {
    const instructions: Record<string, string> = {
      en: 'IMPORTANT: Respond to the user in English.',
      ja: 'IMPORTANT: ユーザーには必ず日本語で応答してください。すべての回答、説明、メッセージは日本語で記述する必要があります。',
      es: 'IMPORTANTE: Responde al usuario en español.',
      fr: "IMPORTANT: Répondez à l'utilisateur en français.",
      de: 'WICHTIG: Antworten Sie dem Benutzer auf Deutsch.',
      zh: '重要提示：请用中文回复用户。',
      ko: '중요: 사용자에게 한국어로 응답하세요.',
      ar: 'مهم: الرد على المستخدم بالعربية.',
      pt: 'IMPORTANTE: Responda ao usuário em português.',
      ru: 'ВАЖНО: Отвечайте пользователю на русском языке.',
    };

    return instructions[language] || instructions['en'];
  }

  /**
   * Get analyzing message in the specified language
   */
  private getAnalyzingMessage(language: string = 'en'): string {
    const translations: Record<string, string> = {
      en: 'Analyzing your request...',
      ja: 'リクエストを分析中...',
      es: 'Analizando su solicitud...',
      fr: 'Analyse de votre demande...',
      de: 'Ihre Anfrage wird analysiert...',
      zh: '正在分析您的请求...',
      ko: '요청을 분석하는 중...',
      ar: 'تحليل طلبك...',
      pt: 'Analisando sua solicitação...',
      ru: 'Анализ вашего запроса...',
    };

    return translations[language] || translations['en'];
  }

  /**
   * Map AI parameter names to expected schema names
   * This handles common variations the AI might use
   */
  private mapToolInput(toolName: string, input: Record<string, any>): Record<string, any> {
    const mapped: Record<string, any> = { ...input };

    // Define parameter mappings for each tool
    const parameterMappings: Record<string, Record<string, string>> = {
      create_task: {
        task_name: 'title',
        name: 'title',
        task_title: 'title',
        taskName: 'title',
        taskTitle: 'title',
        task_description: 'description',
        taskDescription: 'description',
        project: 'projectId',
        project_id: 'projectId',
        due: 'dueDate',
        due_date: 'dueDate',
        assignee: 'assigneeId',
        assignee_id: 'assigneeId',
        // Attachment mappings
        note_attachments: 'noteAttachments',
        notes: 'noteAttachments',
        note_ids: 'noteAttachments',
        noteIds: 'noteAttachments',
        attached_notes: 'noteAttachments',
        attachedNotes: 'noteAttachments',
        file_attachments: 'fileAttachments',
        files: 'fileAttachments',
        file_ids: 'fileAttachments',
        fileIds: 'fileAttachments',
        attached_files: 'fileAttachments',
        attachedFiles: 'fileAttachments',
        event_attachments: 'eventAttachments',
        events: 'eventAttachments',
        event_ids: 'eventAttachments',
        eventIds: 'eventAttachments',
        attached_events: 'eventAttachments',
        attachedEvents: 'eventAttachments',
      },
      create_calendar_event: {
        event_title: 'title',
        eventTitle: 'title',
        name: 'title',
        event_name: 'title',
        eventName: 'title',
        start: 'startTime',
        start_time: 'startTime',
        end: 'endTime',
        end_time: 'endTime',
        event_description: 'description',
        eventDescription: 'description',
        // Attachment mappings
        note_attachments: 'noteAttachments',
        notes: 'noteAttachments',
        note_ids: 'noteAttachments',
        noteIds: 'noteAttachments',
        attached_notes: 'noteAttachments',
        attachedNotes: 'noteAttachments',
        file_attachments: 'fileAttachments',
        files: 'fileAttachments',
        file_ids: 'fileAttachments',
        fileIds: 'fileAttachments',
        attached_files: 'fileAttachments',
        attachedFiles: 'fileAttachments',
        event_attachments: 'eventAttachments',
        events: 'eventAttachments',
        event_ids: 'eventAttachments',
        eventIds: 'eventAttachments',
        attached_events: 'eventAttachments',
        attachedEvents: 'eventAttachments',
      },
      list_calendar_events: {
        start: 'startDate',
        start_date: 'startDate',
        end: 'endDate',
        end_date: 'endDate',
        from: 'startDate',
        to: 'endDate',
      },
      send_channel_message: {
        channel: 'channelId',
        channel_id: 'channelId',
        message: 'content',
        text: 'content',
        message_content: 'content',
        messageContent: 'content',
      },
      search_messages: {
        search: 'query',
        searchQuery: 'query',
        search_query: 'query',
        text: 'query',
        keyword: 'query',
        channel: 'channelId',
        channel_id: 'channelId',
      },
      search_files: {
        search: 'query',
        searchQuery: 'query',
        search_query: 'query',
        name: 'query',
        filename: 'query',
        file_name: 'query',
        type: 'fileType',
        file_type: 'fileType',
      },
      update_task_status: {
        task: 'taskId',
        task_id: 'taskId',
        id: 'taskId',
        new_status: 'status',
        newStatus: 'status',
      },
      list_tasks: {
        project: 'projectId',
        project_id: 'projectId',
        assignee: 'assigneeId',
        assignee_id: 'assigneeId',
      },
      list_projects: {
        filter: 'status',
        project_status: 'status',
        projectStatus: 'status',
      },
      create_note: {
        note_title: 'title',
        noteTitle: 'title',
        name: 'title',
        note_content: 'content',
        noteContent: 'content',
        text: 'content',
        body: 'content',
        parent: 'parentId',
        parent_id: 'parentId',
        folder: 'parentId',
        folder_id: 'parentId',
        folderId: 'parentId',
      },
      create_project: {
        project_name: 'name',
        projectName: 'name',
        title: 'name',
        project_description: 'description',
        projectDescription: 'description',
      },
      create_video_meeting: {
        meeting_title: 'title',
        meetingTitle: 'title',
        name: 'title',
        meeting_description: 'description',
        meetingDescription: 'description',
        start: 'scheduledStartTime',
        start_time: 'scheduledStartTime',
        startTime: 'scheduledStartTime',
        scheduled_start: 'scheduledStartTime',
        scheduledStart: 'scheduledStartTime',
        end: 'scheduledEndTime',
        end_time: 'scheduledEndTime',
        endTime: 'scheduledEndTime',
        scheduled_end: 'scheduledEndTime',
        scheduledEnd: 'scheduledEndTime',
        participants: 'participantIds',
        participant_ids: 'participantIds',
        attendees: 'participantIds',
        attendee_ids: 'participantIds',
        type: 'callType',
        call_type: 'callType',
        meeting_type: 'callType',
        meetingType: 'callType',
      },
      send_direct_message: {
        recipient: 'recipientId',
        recipient_id: 'recipientId',
        user: 'recipientId',
        user_id: 'recipientId',
        userId: 'recipientId',
        to: 'recipientId',
        message: 'content',
        text: 'content',
        message_content: 'content',
        messageContent: 'content',
      },
      send_email: {
        recipients: 'to',
        to_addresses: 'to',
        toAddresses: 'to',
        email_subject: 'subject',
        emailSubject: 'subject',
        email_body: 'body',
        emailBody: 'body',
        content: 'body',
        message: 'body',
        cc_recipients: 'cc',
        ccRecipients: 'cc',
        bcc_recipients: 'bcc',
        bccRecipients: 'bcc',
      },
    };

    const mappings = parameterMappings[toolName];
    if (!mappings) {
      return mapped;
    }

    // Apply mappings
    for (const [fromKey, toKey] of Object.entries(mappings)) {
      if (mapped[fromKey] !== undefined && mapped[toKey] === undefined) {
        mapped[toKey] = mapped[fromKey];
        delete mapped[fromKey];
      }
    }

    return mapped;
  }

  /**
   * Parse AI decision from response
   */
  private parseAIDecision(text: string): any {
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        let jsonStr = jsonMatch[0];

        // Remove JavaScript-style comments that AI sometimes adds
        // Remove single-line comments: // ...
        jsonStr = jsonStr.replace(/\/\/[^\n\r]*/g, '');
        // Remove multi-line comments: /* ... */
        jsonStr = jsonStr.replace(/\/\*[\s\S]*?\*\//g, '');
        // Clean up any trailing commas before } or ]
        jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');

        const parsed = JSON.parse(jsonStr);

        // Validate the parsed response has required fields
        if (parsed.use_tool === true) {
          if (!parsed.tool_name) {
            this.logger.warn('[AutoPilot] AI returned use_tool=true but no tool_name');
            return {
              use_tool: false,
              response:
                parsed.explanation ||
                'I understood your request but encountered an issue. Please try again.',
            };
          }
        }

        return parsed;
      }
    } catch (e) {
      this.logger.warn(`[AutoPilot] Failed to parse AI decision as JSON: ${e.message}`);
    }

    // If parsing fails, treat it as a direct response
    // Clean up any JSON-like formatting for better display
    let cleanText = text
      .replace(/^\s*```json?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .replace(/^\s*\{[\s\S]*\}\s*$/, '') // Remove JSON blocks
      .trim();

    // If the cleaned text is empty, provide a default response
    if (!cleanText) {
      cleanText = 'I processed your request. How can I help you further?';
    }

    return {
      use_tool: false,
      response: cleanText,
    };
  }

  /**
   * Build tools description for the prompt with clear examples
   */
  private buildToolsDescription(tools: any[]): string {
    // Add example inputs for common tools to guide the AI
    const toolExamples: Record<string, string> = {
      create_task:
        '{"title": "Review report", "description": "Review Q4 report", "priority": "high", "dueDate": "2026-01-15", "noteAttachments": ["note-uuid-from-create_note"]}',
      create_calendar_event:
        '{"title": "Team Meeting", "startTime": "2026-01-03T14:00:00", "endTime": "2026-01-03T15:00:00", "description": "Weekly sync", "noteAttachments": ["note-uuid"]}',
      list_calendar_events: '{"startDate": "2026-01-01", "endDate": "2026-01-07"}',
      send_channel_message: '{"channelId": "channel-uuid", "content": "Hello team!"}',
      search_messages: '{"query": "budget report"}',
      search_files: '{"query": "proposal.pdf"}',
      update_task_status: '{"taskId": "task-uuid", "status": "done"}',
      list_tasks: '{"status": "todo"}',
      list_projects: '{"status": "active"}',
      get_current_date_time: '{}',
      list_channels: '{}',
      list_workspace_members: '{}',
      list_recent_files: '{"limit": 10}',
      create_note: '{"title": "Meeting Notes", "content": "Discussion about Q1 goals..."}',
      create_project: '{"name": "Q1 Marketing", "description": "Q1 marketing initiatives"}',
      create_video_meeting:
        '{"title": "Team Sync", "scheduledStartTime": "2026-01-06T10:00:00", "scheduledEndTime": "2026-01-06T11:00:00"}',
      send_direct_message:
        '{"recipientId": "user-uuid", "content": "Hi, can we discuss the project?"}',
      send_email:
        '{"to": ["recipient@example.com"], "subject": "Meeting Follow-up", "body": "Thank you for attending..."}',
      list_emails: '{"labelId": "INBOX", "limit": 10}',
      list_notes: '{"limit": 20}',
      search_notes: '{"query": "meeting notes"}',
      list_video_meetings: '{"status": "scheduled"}',
      list_conversations: '{}',
    };

    return tools
      .map((tool) => {
        const params = tool.schema ? this.describeSchema(tool.schema) : 'No parameters';
        const example = toolExamples[tool.name] || '{}';
        return `- ${tool.name}: ${tool.description}
  Parameters: ${params}
  Example: ${example}`;
      })
      .join('\n\n');
  }

  /**
   * Describe Zod schema as readable text with clear parameter names
   */
  private describeSchema(schema: any): string {
    if (!schema) {
      return '{}';
    }

    try {
      // Try to get shape from Zod schema - different access patterns
      let shape: Record<string, any> | null = null;

      // Method 1: Direct shape property (Zod v3+)
      if (schema.shape) {
        shape = typeof schema.shape === 'function' ? schema.shape : schema.shape;
      }
      // Method 2: Via _def.shape()
      else if (schema._def?.shape) {
        shape = typeof schema._def.shape === 'function' ? schema._def.shape() : schema._def.shape;
      }
      // Method 3: Via _def.typeName check
      else if (schema._def?.typeName === 'ZodObject') {
        const shapeFn = schema._def.shape;
        shape = typeof shapeFn === 'function' ? shapeFn() : shapeFn;
      }

      if (!shape || typeof shape !== 'object') {
        this.logger.debug(`[AutoPilot] Could not extract shape from schema`);
        return '{}';
      }

      const props: string[] = [];

      for (const [key, value] of Object.entries(shape)) {
        if (!value) continue;

        const zodField = value as any;
        let isOptional = false;
        let description = '';
        let typeHint = 'any';

        // Try to get description from the field
        if (zodField.description) {
          description = zodField.description;
        } else if (zodField._def?.description) {
          description = zodField._def.description;
        }

        // Check if optional
        if (zodField._def?.typeName === 'ZodOptional' || zodField.isOptional?.()) {
          isOptional = true;
          // Get inner type description if available
          if (zodField._def?.innerType?._def?.description) {
            description = zodField._def.innerType._def.description;
          }
        }

        // Get type hint
        typeHint = this.getTypeHint(zodField._def || zodField);

        const optionalStr = isOptional ? 'optional' : 'required';
        props.push(`"${key}" (${optionalStr}, ${typeHint}): ${description || 'No description'}`);
      }

      return props.length > 0 ? `{ ${props.join(', ')} }` : '{}';
    } catch (error) {
      this.logger.warn(`[AutoPilot] Failed to describe schema: ${error.message}`);
      return '{}';
    }
  }

  /**
   * Get type hint from Zod definition
   */
  private getTypeHint(def: any): string {
    if (!def?.typeName) return 'any';

    switch (def.typeName) {
      case 'ZodString':
        return 'string';
      case 'ZodNumber':
        return 'number';
      case 'ZodBoolean':
        return 'boolean';
      case 'ZodArray':
        return 'array';
      case 'ZodEnum':
        const values = def.values?.join(' | ') || '';
        return values ? `enum: ${values}` : 'enum';
      default:
        return 'any';
    }
  }

  /**
   * Build the input string with context
   */
  private buildAgentInput(command: string, context: AgentContext): string {
    const contextInfo = [];

    if (context.workspaceId) {
      contextInfo.push(`Workspace ID: ${context.workspaceId}`);
    }
    if (context.currentView) {
      contextInfo.push(`Current view: ${context.currentView}`);
    }
    if (context.selectedProjectId) {
      contextInfo.push(`Selected project: ${context.selectedProjectId}`);
    }
    if (!context.executeActions) {
      contextInfo.push(
        'MODE: Preview only - DO NOT execute actions, just describe what would be done',
      );
    }

    // Add info about attached images
    if (context.attachedImages && context.attachedImages.length > 0) {
      const imageNames = context.attachedImages.map((img: any) => img.name).join(', ');
      contextInfo.push(
        `ATTACHED IMAGES: ${context.attachedImages.length} image(s) - ${imageNames}`,
      );
      contextInfo.push(
        'IMPORTANT: To analyze these images, call the analyze_image tool with ONLY the "question" parameter (e.g., {"question": "What is in this image?"}). DO NOT provide imageUrl or imageBase64 - they are automatically loaded from context.',
      );
    }

    if (contextInfo.length > 0) {
      return `Context:\n${contextInfo.join('\n')}\n\nUser command: ${command}`;
    }

    return command;
  }

  /**
   * Get the system prompt for the agent
   */
  private getSystemPrompt(userLanguage: string = 'en'): string {
    const languageInstructions = this.getLanguageInstructions(userLanguage);
    return `You are AutoPilot, an advanced AI assistant for Deskive - a comprehensive workspace management platform.

${languageInstructions}

You are MORE POWERFUL than simple AI assistants. You can:
1. Execute MULTIPLE actions in sequence to complete complex requests
2. Use output from one tool as input for the next tool (CRITICAL for attachments)
3. Work across ALL modules: Calendar, Tasks, Chat, Files, Notes, Email, Video Calls, and Projects

YOUR CAPABILITIES:
📅 CALENDAR: Create meetings, schedule events with attachments, check availability
📋 TASKS: Create tasks with attachments, assign to team members, update status
📝 NOTES: Create notes, search notes, attach notes to events/tasks
📧 EMAIL: Send emails, list emails, get email details (requires Gmail connection)
🎥 VIDEO CALLS: Create video meetings, list scheduled calls
📁 FILES: Search files, list recent documents, attach files to events/tasks
📂 PROJECTS: Create projects, list projects
👥 WORKSPACE: List members, view projects, get team information
💬 CHAT: Send messages to channels, send direct messages, search conversations

TOOL CHAINING & ATTACHMENTS (CRITICAL):
When a user wants to create something and attach it to another item, you MUST:
1. FIRST create the item (note, task, file, etc.)
2. EXTRACT the ID from the result (noteId, taskId, eventId, etc.)
3. THEN create the target item with the attachment ID

ATTACHMENT EXAMPLES:
1. "Create a note about the meeting and schedule the meeting with the note attached"
   → create_note (returns noteId: "abc123")
   → create_calendar_event with noteAttachments: ["abc123"]

2. "Make a task list note and create a task with that note attached"
   → create_note (returns noteId: "xyz789")
   → create_task with noteAttachments: ["xyz789"]

3. "Create a project, add a task to it, and schedule a meeting for the project"
   → create_project (returns projectId: "proj123")
   → create_task with projectId: "proj123" (returns taskId: "task456")
   → create_calendar_event (optionally link them)

ATTACHMENT PARAMETERS:
- create_calendar_event accepts: noteAttachments (array of note IDs), fileAttachments (array of file IDs), eventAttachments (array of event IDs)
- create_task accepts: noteAttachments (array of note IDs), fileAttachments (array of file IDs), eventAttachments (array of event IDs)

EXECUTION STRATEGY:
- For date/time requests: FIRST call get_current_date_time, THEN use the result for scheduling
- For attachments: FIRST create the item to attach, THEN extract its ID from the result, THEN create the target with attachment
- For task creation: Create the task, then optionally assign it or set due dates
- For complex requests: Break down into steps and execute each tool in sequence
- ALWAYS extract IDs from previous tool results to use in subsequent calls

DOCUMENT/IMAGE ANALYSIS (CRITICAL):
- When user attaches a document (PDF, TXT, MD) or image and asks about it, present the FULL analysis
- Do NOT summarize or shorten analysis results - show ALL key points, findings, and details
- If user asks to "analyze", "read", "what does it say", "summarize" → show the complete analysis content
- For images: describe everything visible including text, objects, colors, layout

REFERENCED ITEMS (CRITICAL):
When the user's message contains "[Referenced Items - Use get_referenced_item tool to fetch details]" followed by items like:
- Task: "Task Title" (ID: 5d3a7e8f-1234-5678-90ab-cdef12345678)
- Note: "Note Title" (ID: abc123-def456-...)
- Event: "Event Title" (ID: ...)
- Project: "Project Title" (ID: ...)

You MUST:
1. EXTRACT the EXACT ID from the message (the UUID after "ID:")
2. Use that EXACT ID when calling get_referenced_item or update_referenced_item
3. NEVER use placeholder strings like "task-uuid", "item-id", or made-up IDs
4. The ID is a real UUID like "5d3a7e8f-1234-5678-90ab-cdef12345678"

EXAMPLE:
User message contains: "- Task: \"Review Report\" (ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890)"
When user says "update this task status to done":
→ Call update_referenced_item with itemType: "task", itemId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", updates: {status: "done"}

EXAMPLES OF MULTI-STEP EXECUTION:
1. "Schedule a team meeting tomorrow and notify the general channel"
   → get_current_date_time → create_calendar_event → send_channel_message

2. "Create a task for reviewing the report and assign it to John"
   → list_workspace_members (to find John's ID) → create_task (with assignee)

3. "Create a meeting note and schedule a meeting with the note attached"
   → create_note (get noteId from result) → get_current_date_time → create_calendar_event (with noteAttachments: [noteId])

4. "Create a project called Q1 Planning and add a task to review goals"
   → create_project (get projectId) → create_task (with projectId)

GUIDELINES:
1. ALWAYS complete the user's full request - don't stop halfway
2. Chain multiple tools when needed to fulfill complex requests
3. Use tool results to make informed decisions for next steps
4. Be proactive - if a request implies multiple actions, execute them all
5. EXTRACT IDs from tool results and use them in subsequent tool calls
6. Confirm ALL actions taken in your final response
7. If something fails, try alternatives or explain what went wrong

You are the user's productivity powerhouse - automate everything possible!`;
  }

  /**
   * Reload the agent (useful for hot-reloading tools)
   */
  async reload() {
    this.logger.log('[AutoPilot] Reloading agent...');
    await this.initializeAgent();
  }
}
