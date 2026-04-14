import { IsOptional, IsEnum, IsDateString, IsString, IsNumber, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EventType, EventPriority } from './create-event.dto';

export class EventsQueryDto {
  @ApiPropertyOptional({
    enum: EventType,
    description: 'Filter by event type',
    isArray: true,
  })
  @IsOptional()
  @IsEnum(EventType, { each: true })
  eventTypes?: EventType[];

  @ApiPropertyOptional({
    enum: EventPriority,
    description: 'Filter by event priority',
    isArray: true,
  })
  @IsOptional()
  @IsEnum(EventPriority, { each: true })
  priorities?: EventPriority[];

  @ApiPropertyOptional({
    description: 'Start date for event filtering (ISO string)',
    example: '2023-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for event filtering (ISO string)',
    example: '2023-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by entity ID',
    example: 'task-123',
  })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({
    description: 'Filter by entity type',
    example: 'task',
  })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({
    description: 'Filter by user ID',
    example: 'user-456',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Search query for event title and description',
    example: 'task created',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by tags',
    example: ['urgent', 'backend'],
    isArray: true,
  })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Include only unread events',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  unreadOnly?: boolean = false;

  @ApiPropertyOptional({
    description: 'Number of events to return',
    default: 50,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  limit?: number = 50;

  @ApiPropertyOptional({
    description: 'Offset for pagination',
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  offset?: number = 0;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class ActivityFeedQueryDto {
  @ApiPropertyOptional({
    description: 'Number of activities to return',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Offset for pagination',
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  offset?: number = 0;

  @ApiPropertyOptional({
    description: 'Filter by activity types',
    example: ['task_created', 'project_updated'],
    isArray: true,
  })
  @IsOptional()
  @IsEnum(EventType, { each: true })
  activityTypes?: EventType[];

  @ApiPropertyOptional({
    description: 'Include activities from specific users',
    example: ['user-123', 'user-456'],
    isArray: true,
  })
  @IsOptional()
  userIds?: string[];

  @ApiPropertyOptional({
    description: 'Start date for activity filtering (ISO string)',
    example: '2023-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for activity filtering (ISO string)',
    example: '2023-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
