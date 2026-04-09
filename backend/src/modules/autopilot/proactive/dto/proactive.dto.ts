import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsBoolean, IsOptional, IsEnum, IsArray, IsDateString } from 'class-validator';

export enum BriefingType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  DEADLINE_ALERT = 'deadline_alert',
}

export enum AlertType {
  DEADLINE_24H = 'deadline_24h',
  DEADLINE_3D = 'deadline_3d',
  OVERDUE = 'overdue',
  HIGH_PRIORITY = 'high_priority',
}

export enum EntityType {
  TASK = 'task',
  EVENT = 'event',
}

export class BriefingContentDto {
  @ApiProperty({ description: 'Summary text of the briefing' })
  summary: string;

  @ApiProperty({ description: 'List of overdue tasks', type: [Object] })
  overdueTasks: any[];

  @ApiProperty({ description: 'Tasks due today', type: [Object] })
  todayTasks: any[];

  @ApiProperty({ description: 'Events for today', type: [Object] })
  todayEvents: any[];

  @ApiProperty({ description: 'High priority items', type: [Object] })
  highPriorityItems: any[];

  @ApiProperty({ description: 'AI-generated insights', type: [String] })
  insights: string[];
}

export class CreateBriefingDto {
  @ApiProperty({ description: 'Workspace ID' })
  @IsUUID()
  workspaceId: string;

  @ApiProperty({ enum: BriefingType, description: 'Type of briefing' })
  @IsEnum(BriefingType)
  briefingType: BriefingType;

  @ApiProperty({ type: BriefingContentDto, description: 'Briefing content' })
  content: BriefingContentDto;

  @ApiProperty({ required: false, description: 'Expiration date' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class BriefingResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  workspaceId: string;

  @ApiProperty({ enum: BriefingType })
  briefingType: BriefingType;

  @ApiProperty({ type: BriefingContentDto })
  content: BriefingContentDto;

  @ApiProperty()
  generatedAt: string;

  @ApiProperty()
  isRead: boolean;

  @ApiProperty({ required: false })
  readAt?: string;

  @ApiProperty({ required: false })
  expiresAt?: string;
}

export class CreateAlertDto {
  @ApiProperty({ description: 'Workspace ID' })
  @IsUUID()
  workspaceId: string;

  @ApiProperty({ enum: AlertType, description: 'Type of alert' })
  @IsEnum(AlertType)
  alertType: AlertType;

  @ApiProperty({ enum: EntityType, description: 'Entity type' })
  @IsEnum(EntityType)
  entityType: EntityType;

  @ApiProperty({ description: 'Entity ID' })
  @IsUUID()
  entityId: string;

  @ApiProperty({ description: 'Alert message' })
  @IsString()
  message: string;
}

export class AlertResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  workspaceId: string;

  @ApiProperty({ enum: AlertType })
  alertType: AlertType;

  @ApiProperty({ enum: EntityType })
  entityType: EntityType;

  @ApiProperty()
  entityId: string;

  @ApiProperty()
  message: string;

  @ApiProperty()
  isSent: boolean;

  @ApiProperty()
  isDismissed: boolean;

  @ApiProperty()
  createdAt: string;
}

export class SuggestionsCacheDto {
  @ApiProperty({ description: 'Array of suggestions' })
  @IsArray()
  suggestions: any[];

  @ApiProperty({ description: 'Expiration timestamp' })
  @IsDateString()
  expiresAt: string;
}

export class MarkBriefingReadDto {
  @ApiProperty({ description: 'Briefing ID' })
  @IsUUID()
  briefingId: string;
}

export class DismissAlertDto {
  @ApiProperty({ description: 'Alert ID' })
  @IsUUID()
  alertId: string;
}
