import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsUUID,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsObject,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Schedule Status Enum
export enum ScheduleStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

// Create Scheduled Notification DTO
export class CreateScheduledNotificationDto {
  @ApiProperty({ description: 'User ID to send notification to' })
  @IsString()
  user_id: string;

  @ApiPropertyOptional({ description: 'Array of User IDs for bulk scheduling' })
  @IsOptional()
  @IsString({ each: true })
  user_ids?: string[];

  @ApiPropertyOptional({ description: 'Workspace ID' })
  @IsOptional()
  @IsUUID()
  workspace_id?: string;

  @ApiProperty({ description: 'Notification type' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Notification title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Notification message' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ description: 'Additional data payload' })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Action URL when notification is clicked' })
  @IsOptional()
  @IsString()
  action_url?: string;

  @ApiPropertyOptional({ description: 'Priority level', enum: ['low', 'normal', 'high', 'urgent'] })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({ description: 'Category of notification' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Entity type (project, task, event, etc.)' })
  @IsOptional()
  @IsString()
  entity_type?: string;

  @ApiPropertyOptional({ description: 'Entity ID' })
  @IsOptional()
  @IsUUID()
  entity_id?: string;

  @ApiPropertyOptional({ description: 'Actor user ID who triggered the notification' })
  @IsOptional()
  @IsString()
  actor_id?: string;

  @ApiProperty({ description: 'When to send the notification (ISO 8601 format)' })
  @IsDateString()
  scheduled_at: string;

  @ApiPropertyOptional({ description: 'Send push notification', default: true })
  @IsOptional()
  @IsBoolean()
  send_push?: boolean;

  @ApiPropertyOptional({ description: 'Send email notification', default: false })
  @IsOptional()
  @IsBoolean()
  send_email?: boolean;

  @ApiPropertyOptional({ description: 'Maximum retry attempts', default: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  max_retries?: number;
}

// Update Scheduled Notification DTO
export class UpdateScheduledNotificationDto {
  @ApiPropertyOptional({ description: 'New scheduled time (ISO 8601 format)' })
  @IsOptional()
  @IsDateString()
  scheduled_at?: string;

  @ApiPropertyOptional({ description: 'Updated title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Updated message' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ description: 'Updated data payload' })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Updated priority' })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({ description: 'Cancel the scheduled notification' })
  @IsOptional()
  @IsBoolean()
  cancel?: boolean;
}

// Query Scheduled Notifications DTO
export class QueryScheduledNotificationsDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Filter by schedule status', enum: ScheduleStatus })
  @IsOptional()
  @IsEnum(ScheduleStatus)
  status?: ScheduleStatus;

  @ApiPropertyOptional({ description: 'Filter by notification type' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'Filter by workspace ID' })
  @IsOptional()
  @IsUUID()
  workspace_id?: string;

  @ApiPropertyOptional({ description: 'Filter notifications scheduled after this date' })
  @IsOptional()
  @IsDateString()
  scheduled_after?: string;

  @ApiPropertyOptional({ description: 'Filter notifications scheduled before this date' })
  @IsOptional()
  @IsDateString()
  scheduled_before?: string;

  @ApiPropertyOptional({ description: 'Sort by field', default: 'scheduled_at' })
  @IsOptional()
  @IsString()
  sort_by?: string;

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'], default: 'asc' })
  @IsOptional()
  @IsString()
  sort_order?: 'asc' | 'desc';
}

// Response DTOs
export class ScheduledNotificationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  user_id: string;

  @ApiPropertyOptional()
  workspace_id?: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  message?: string;

  @ApiPropertyOptional()
  data?: Record<string, any>;

  @ApiPropertyOptional()
  action_url?: string;

  @ApiProperty()
  priority: string;

  @ApiProperty()
  scheduled_at: string;

  @ApiProperty()
  is_scheduled: boolean;

  @ApiProperty()
  is_sent: boolean;

  @ApiPropertyOptional()
  sent_at?: string;

  @ApiProperty({ enum: ScheduleStatus })
  schedule_status: ScheduleStatus;

  @ApiProperty()
  retry_count: number;

  @ApiProperty()
  max_retries: number;

  @ApiPropertyOptional()
  failure_reason?: string;

  @ApiProperty()
  created_at: string;

  @ApiProperty()
  updated_at: string;
}

export class PaginatedScheduledNotificationsDto {
  @ApiProperty({ type: [ScheduledNotificationResponseDto] })
  data: ScheduledNotificationResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  total_pages: number;

  @ApiProperty()
  pending_count: number;
}

export class SchedulerStatsDto {
  @ApiProperty()
  pending: number;

  @ApiProperty()
  sent: number;

  @ApiProperty()
  failed: number;

  @ApiProperty()
  cancelled: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  next_scheduled_at?: string;

  @ApiProperty()
  last_run_at?: string;

  @ApiProperty()
  is_running: boolean;
}
