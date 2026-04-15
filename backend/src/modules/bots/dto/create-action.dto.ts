import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsObject,
  IsInt,
  IsUUID,
  Min,
  Max,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ActionType {
  SEND_MESSAGE = 'send_message',
  SEND_AI_MESSAGE = 'send_ai_message',
  AI_AUTOPILOT = 'ai_autopilot',
  CREATE_TASK = 'create_task',
  CREATE_EVENT = 'create_event',
  CALL_WEBHOOK = 'call_webhook',
  SEND_EMAIL = 'send_email',
}

export enum FailurePolicy {
  CONTINUE = 'continue',
  STOP = 'stop',
  RETRY = 'retry',
}

// Action Config DTOs
export class SendMessageConfigDto {
  @ApiProperty({
    description: 'Message content (supports {{variables}})',
    example: 'Hello {{user.name}}!',
  })
  @IsString()
  @MinLength(1)
  content: string;

  @ApiPropertyOptional({ description: 'HTML content for rich messages' })
  @IsOptional()
  @IsString()
  contentHtml?: string;

  @ApiPropertyOptional({ description: 'Reply to the triggering message', default: true })
  @IsOptional()
  @IsBoolean()
  replyToTrigger?: boolean;

  @ApiPropertyOptional({ description: 'Mention the triggering user', default: false })
  @IsOptional()
  @IsBoolean()
  mentionUser?: boolean;
}

export class SendAiMessageConfigDto {
  @ApiPropertyOptional({
    description: 'System prompt for AI',
    example: 'You are a helpful support assistant.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  systemPrompt?: string;

  @ApiPropertyOptional({ description: 'Use Deskive AutoPilot for AI response', default: true })
  @IsOptional()
  @IsBoolean()
  useAutopilot?: boolean;

  @ApiPropertyOptional({ description: 'Max tokens for AI response', default: 500 })
  @IsOptional()
  @IsInt()
  @Min(50)
  @Max(4000)
  maxTokens?: number;

  @ApiPropertyOptional({ description: 'Include message context', default: true })
  @IsOptional()
  @IsBoolean()
  includeContext?: boolean;

  @ApiPropertyOptional({
    description: 'Number of previous messages to include as context',
    default: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  contextMessageCount?: number;
}

export class CreateTaskConfigDto {
  @ApiProperty({ description: 'Task title template', example: '{{$1}}' })
  @IsString()
  @MinLength(1)
  titleTemplate: string;

  @ApiPropertyOptional({ description: 'Task description template' })
  @IsOptional()
  @IsString()
  descriptionTemplate?: string;

  @ApiPropertyOptional({ description: 'Project ID to create task in' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Use default project if not specified', default: true })
  @IsOptional()
  @IsBoolean()
  useDefaultProject?: boolean;

  @ApiPropertyOptional({ description: 'Task priority', example: 'medium' })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({ description: 'Assign to triggering user', default: false })
  @IsOptional()
  @IsBoolean()
  assignToTriggeringUser?: boolean;

  @ApiPropertyOptional({ description: 'Due date offset in days', example: 7 })
  @IsOptional()
  @IsInt()
  @Min(0)
  dueDateOffsetDays?: number;
}

export class CreateEventConfigDto {
  @ApiProperty({ description: 'Event title template', example: 'Meeting: {{$1}}' })
  @IsString()
  @MinLength(1)
  titleTemplate: string;

  @ApiPropertyOptional({ description: 'Event description template' })
  @IsOptional()
  @IsString()
  descriptionTemplate?: string;

  @ApiPropertyOptional({ description: 'Duration in minutes', default: 30 })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  durationMinutes?: number;

  @ApiPropertyOptional({ description: 'Start time offset in hours from now', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  startTimeOffsetHours?: number;

  @ApiPropertyOptional({ description: 'Add triggering user as attendee', default: true })
  @IsOptional()
  @IsBoolean()
  addTriggeringUserAsAttendee?: boolean;
}

export class CallWebhookConfigDto {
  @ApiProperty({ description: 'Webhook URL', example: 'https://api.example.com/webhook' })
  @IsString()
  url: string;

  @ApiPropertyOptional({ description: 'HTTP method', default: 'POST' })
  @IsOptional()
  @IsEnum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
  method?: string;

  @ApiPropertyOptional({ description: 'Request headers' })
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Request body template (JSON string with {{variables}})' })
  @IsOptional()
  @IsString()
  bodyTemplate?: string;

  @ApiPropertyOptional({ description: 'Timeout in milliseconds', default: 10000 })
  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(30000)
  timeout?: number;
}

export class SendEmailConfigDto {
  @ApiProperty({ description: 'Recipient email template', example: '{{user.email}}' })
  @IsString()
  toTemplate: string;

  @ApiProperty({ description: 'Email subject template', example: 'New message from {{bot.name}}' })
  @IsString()
  subjectTemplate: string;

  @ApiProperty({ description: 'Email body template (HTML supported)' })
  @IsString()
  bodyTemplate: string;

  @ApiPropertyOptional({ description: 'CC recipients' })
  @IsOptional()
  @IsString({ each: true })
  cc?: string[];

  @ApiPropertyOptional({ description: 'Reply-to email' })
  @IsOptional()
  @IsString()
  replyTo?: string;
}

export class AiAutopilotConfigDto {
  @ApiPropertyOptional({
    description: 'Custom system prompt to guide AI behavior',
    example: 'You are a friendly team assistant. Be concise and helpful.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  systemPrompt?: string;

  @ApiPropertyOptional({ description: 'Include previous message context', default: true })
  @IsOptional()
  @IsBoolean()
  includeContext?: boolean;

  @ApiPropertyOptional({
    description: 'Number of previous messages to include as context',
    default: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  contextMessageCount?: number;

  @ApiPropertyOptional({ description: 'Reply to the triggering message', default: true })
  @IsOptional()
  @IsBoolean()
  replyToTrigger?: boolean;

  @ApiPropertyOptional({
    description: 'Allow AutoPilot to execute actions (create tasks, events, etc.)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  allowActions?: boolean;
}

export class CreateActionDto {
  @ApiProperty({ description: 'Action name', example: 'Send Welcome Message' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Trigger ID to link this action to (optional)' })
  @IsOptional()
  @IsUUID()
  triggerId?: string;

  @ApiProperty({ enum: ActionType, description: 'Type of action' })
  @IsEnum(ActionType)
  actionType: ActionType;

  @ApiProperty({ description: 'Action configuration (varies by type)' })
  @IsObject()
  actionConfig:
    | SendMessageConfigDto
    | SendAiMessageConfigDto
    | AiAutopilotConfigDto
    | CreateTaskConfigDto
    | CreateEventConfigDto
    | CallWebhookConfigDto
    | SendEmailConfigDto;

  @ApiPropertyOptional({ description: 'Execution order (lower runs first)', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  executionOrder?: number;

  @ApiPropertyOptional({ description: 'Whether action is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    enum: FailurePolicy,
    description: 'What to do if action fails',
    default: FailurePolicy.CONTINUE,
  })
  @IsOptional()
  @IsEnum(FailurePolicy)
  failurePolicy?: FailurePolicy;
}

export class UpdateActionDto {
  @ApiPropertyOptional({ description: 'Action name' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Trigger ID' })
  @IsOptional()
  @IsUUID()
  triggerId?: string;

  @ApiPropertyOptional({ enum: ActionType })
  @IsOptional()
  @IsEnum(ActionType)
  actionType?: ActionType;

  @ApiPropertyOptional({ description: 'Action configuration' })
  @IsOptional()
  @IsObject()
  actionConfig?:
    | SendMessageConfigDto
    | SendAiMessageConfigDto
    | AiAutopilotConfigDto
    | CreateTaskConfigDto
    | CreateEventConfigDto
    | CallWebhookConfigDto
    | SendEmailConfigDto;

  @ApiPropertyOptional({ description: 'Execution order' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  executionOrder?: number;

  @ApiPropertyOptional({ description: 'Whether action is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ enum: FailurePolicy })
  @IsOptional()
  @IsEnum(FailurePolicy)
  failurePolicy?: FailurePolicy;
}
