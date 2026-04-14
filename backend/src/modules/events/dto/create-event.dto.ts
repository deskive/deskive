import { IsNotEmpty, IsString, IsOptional, IsEnum, IsJSON, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum EventType {
  TASK_CREATED = 'task_created',
  TASK_UPDATED = 'task_updated',
  TASK_COMPLETED = 'task_completed',
  TASK_DELETED = 'task_deleted',
  PROJECT_CREATED = 'project_created',
  PROJECT_UPDATED = 'project_updated',
  PROJECT_COMPLETED = 'project_completed',
  PROJECT_DELETED = 'project_deleted',
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left',
  MESSAGE_SENT = 'message_sent',
  FILE_UPLOADED = 'file_uploaded',
  FILE_DELETED = 'file_deleted',
  MEETING_SCHEDULED = 'meeting_scheduled',
  MEETING_STARTED = 'meeting_started',
  MEETING_ENDED = 'meeting_ended',
  NOTE_CREATED = 'note_created',
  NOTE_UPDATED = 'note_updated',
  NOTE_DELETED = 'note_deleted',
  INTEGRATION_CONNECTED = 'integration_connected',
  INTEGRATION_DISCONNECTED = 'integration_disconnected',
  WORKSPACE_UPDATED = 'workspace_updated',
  SYSTEM_ALERT = 'system_alert',
  CUSTOM = 'custom',
}

export enum EventPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export class CreateActivityEventDto {
  @ApiProperty({
    enum: EventType,
    description: 'Type of the event',
    example: EventType.TASK_CREATED,
  })
  @IsNotEmpty()
  @IsEnum(EventType)
  eventType: EventType;

  @ApiProperty({
    description: 'Title of the event',
    example: 'New task created: Implement user authentication',
  })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the event',
    example: 'A new task has been created in the Authentication project',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: EventPriority,
    description: 'Priority level of the event',
    default: EventPriority.NORMAL,
  })
  @IsOptional()
  @IsEnum(EventPriority)
  priority?: EventPriority = EventPriority.NORMAL;

  @ApiPropertyOptional({
    description: 'JSON metadata associated with the event',
    example: { taskId: '123', projectId: '456', assigneeId: '789' },
  })
  @IsOptional()
  @IsJSON()
  metadata?: string;

  @ApiPropertyOptional({
    description: 'ID of the related entity',
    example: 'task-123',
  })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({
    description: 'Type of the related entity',
    example: 'task',
  })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({
    description: 'Tags associated with the event',
    example: ['urgent', 'backend', 'authentication'],
    isArray: true,
  })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Expiry time for the event (ISO string)',
    example: '2023-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
