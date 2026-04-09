import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsBoolean, IsObject } from 'class-validator';

/**
 * Request to execute an AutoPilot command
 */
export class ExecuteCommandDto {
  @ApiProperty({
    description: 'Natural language command to execute',
    example: 'Schedule a meeting with John tomorrow at 2pm about the marketing project'
  })
  @IsString()
  command: string;

  @ApiProperty({
    description: 'Workspace ID for context',
    example: 'workspace-uuid'
  })
  @IsString()
  workspaceId: string;

  @ApiProperty({
    description: 'Optional session ID for conversation continuity',
    required: false
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiProperty({
    description: 'Additional context for the command',
    required: false,
    example: { currentView: 'calendar', selectedProjectId: 'project-uuid' }
  })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;

  @ApiProperty({
    description: 'Whether to execute actions or just preview them',
    default: true
  })
  @IsOptional()
  @IsBoolean()
  executeActions?: boolean;
}

/**
 * Single action executed by AutoPilot
 */
export class ExecutedAction {
  @ApiProperty({ description: 'Tool/action name', example: 'create_calendar_event' })
  tool: string;

  @ApiProperty({ description: 'Input provided to the tool' })
  input: Record<string, any>;

  @ApiProperty({ description: 'Output from the tool' })
  output: any;

  @ApiProperty({ description: 'Whether the action succeeded' })
  success: boolean;

  @ApiProperty({ description: 'Error message if failed', required: false })
  error?: string;
}

/**
 * Response from AutoPilot command execution
 */
export class AutoPilotResponseDto {
  @ApiProperty({ description: 'Whether the command was processed successfully' })
  success: boolean;

  @ApiProperty({ description: 'Session ID for conversation continuity' })
  sessionId: string;

  @ApiProperty({ description: 'Natural language response from AutoPilot' })
  message: string;

  @ApiProperty({ description: 'List of actions executed', type: [ExecutedAction] })
  actions: ExecutedAction[];

  @ApiProperty({ description: 'Suggested follow-up actions', type: [String], required: false })
  suggestions?: string[];

  @ApiProperty({ description: 'Agent thinking/reasoning process', required: false })
  reasoning?: string;

  @ApiProperty({ description: 'Error message if failed', required: false })
  error?: string;
}

/**
 * Get conversation history request
 */
export class GetHistoryDto {
  @ApiProperty({ description: 'Session ID to get history for' })
  @IsString()
  sessionId: string;

  @ApiProperty({ description: 'Maximum number of messages to return', required: false })
  @IsOptional()
  limit?: number;
}

/**
 * Conversation message in history
 */
export class ConversationMessage {
  @ApiProperty({ description: 'Message role', enum: ['user', 'assistant', 'system'] })
  role: 'user' | 'assistant' | 'system';

  @ApiProperty({ description: 'Message content' })
  content: string;

  @ApiProperty({ description: 'Timestamp' })
  timestamp: string;

  @ApiProperty({ description: 'Actions executed (for assistant messages)', required: false })
  actions?: ExecutedAction[];
}

/**
 * Feedback on AutoPilot action
 */
export class ActionFeedbackDto {
  @ApiProperty({ description: 'Session ID' })
  @IsString()
  sessionId: string;

  @ApiProperty({ description: 'Action ID to provide feedback on' })
  @IsString()
  actionId: string;

  @ApiProperty({ description: 'Whether the action was helpful' })
  @IsBoolean()
  helpful: boolean;

  @ApiProperty({ description: 'Optional feedback message', required: false })
  @IsOptional()
  @IsString()
  feedback?: string;
}

/**
 * Available tools/capabilities
 */
export class AutoPilotCapability {
  @ApiProperty({ description: 'Tool name' })
  name: string;

  @ApiProperty({ description: 'Tool description' })
  description: string;

  @ApiProperty({ description: 'Example commands', type: [String] })
  examples: string[];

  @ApiProperty({ description: 'Tool category' })
  category: string;
}

/**
 * Smart suggestion for quick actions
 */
export class SmartSuggestionDto {
  @ApiProperty({ description: 'Unique identifier for the suggestion' })
  id: string;

  @ApiProperty({ description: 'Display text for the suggestion' })
  text: string;

  @ApiProperty({ description: 'Command to execute when tapped' })
  command: string;

  @ApiProperty({ description: 'Icon identifier', example: 'warning' })
  icon: string;

  @ApiProperty({ description: 'Priority for sorting (lower = higher priority)' })
  priority: number;

  @ApiProperty({ description: 'Whether this is a contextual (smart) suggestion' })
  isContextual: boolean;

  @ApiProperty({ description: 'Optional category for grouping', required: false })
  category?: string;
}

/**
 * Response for smart suggestions endpoint
 */
export class SmartSuggestionsResponseDto {
  @ApiProperty({ description: 'List of smart suggestions', type: [SmartSuggestionDto] })
  suggestions: SmartSuggestionDto[];

  @ApiProperty({ description: 'Timestamp when suggestions were generated' })
  generatedAt: string;
}
