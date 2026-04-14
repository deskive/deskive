import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ProjectType {
  KANBAN = 'kanban',
  SCRUM = 'scrum',
  BUG_TRACKING = 'bug_tracking',
  FEATURE = 'feature',
  RESEARCH = 'research',
}

export enum ProjectStatus {
  ACTIVE = 'active',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

export enum ProjectPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export class ProjectAttachmentsDto {
  @ApiProperty({
    description: 'Array of note attachment UUIDs',
    example: ['550e8400-e29b-41d4-a716-446655440000'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  note_attachment?: string[];

  @ApiProperty({
    description: 'Array of file attachment UUIDs',
    example: ['660e8400-e29b-41d4-a716-446655440001'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  file_attachment?: string[];

  @ApiProperty({
    description: 'Array of event attachment UUIDs',
    example: ['770e8400-e29b-41d4-a716-446655440002'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  event_attachment?: string[];
}

export class KanbanStageDto {
  @ApiProperty({ description: 'Stage ID', example: 'todo' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Stage name', example: 'To Do' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Display order', example: 1 })
  @IsNumber()
  order: number;

  @ApiProperty({ description: 'Stage color', example: '#3B82F6' })
  @IsString()
  color: string;
}

export class CreateProjectDto {
  @ApiProperty({ description: 'Project name', example: 'Website Redesign' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Project description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Project type',
    enum: ProjectType,
    example: ProjectType.KANBAN,
    required: false,
  })
  @IsOptional()
  @IsEnum(ProjectType)
  type?: ProjectType = ProjectType.KANBAN;

  @ApiProperty({
    description: 'Project status',
    enum: ProjectStatus,
    example: ProjectStatus.ACTIVE,
    required: false,
  })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus = ProjectStatus.ACTIVE;

  @ApiProperty({
    description: 'Project priority',
    enum: ProjectPriority,
    required: false,
  })
  @IsOptional()
  @IsEnum(ProjectPriority)
  priority?: ProjectPriority;

  @ApiProperty({ description: 'Project owner ID', required: false })
  @IsOptional()
  @IsString()
  owner_id?: string;

  @ApiProperty({ description: 'Project lead ID', required: false })
  @IsOptional()
  @IsString()
  lead_id?: string;

  @ApiProperty({ description: 'Start date (ISO string)', required: false })
  @IsOptional()
  @IsString()
  start_date?: string;

  @ApiProperty({ description: 'End date (ISO string)', required: false })
  @IsOptional()
  @IsString()
  end_date?: string;

  @ApiProperty({ description: 'Estimated hours', required: false })
  @IsOptional()
  @IsNumber()
  estimated_hours?: number;

  @ApiProperty({ description: 'Budget amount', required: false })
  @IsOptional()
  @IsNumber()
  budget?: number;

  @ApiProperty({ description: 'Is template project', required: false })
  @IsOptional()
  @IsBoolean()
  is_template?: boolean = false;

  @ApiProperty({
    description: 'Kanban board stages',
    type: [KanbanStageDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KanbanStageDto)
  kanban_stages?: KanbanStageDto[];

  @ApiProperty({
    description: 'Project attachments (notes, files, events)',
    type: ProjectAttachmentsDto,
    required: false,
    example: {
      note_attachment: ['550e8400-e29b-41d4-a716-446655440000'],
      file_attachment: ['660e8400-e29b-41d4-a716-446655440001'],
      event_attachment: ['770e8400-e29b-41d4-a716-446655440002'],
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProjectAttachmentsDto)
  attachments?: ProjectAttachmentsDto;

  @ApiProperty({
    description: 'Collaborative data including default assignees and team members',
    required: false,
    example: {
      default_assignee_ids: [
        '550e8400-e29b-41d4-a716-446655440000',
        '660e8400-e29b-41d4-a716-446655440001',
      ],
    },
  })
  @IsOptional()
  collaborative_data?: Record<string, any>;
}
