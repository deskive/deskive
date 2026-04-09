import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber, IsUUID, IsArray, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export enum TaskType {
  TASK = 'task',
  STORY = 'story',
  BUG = 'bug',
  EPIC = 'epic',
  SUBTASK = 'subtask'
}

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  TESTING = 'testing',
  DONE = 'done'
}

export enum TaskPriority {
  LOWEST = 'lowest',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  HIGHEST = 'highest'
}

// Per-task custom field structure (each task has its own field definitions and values)
export class TaskCustomFieldOptionDto {
  @ApiProperty({ description: 'Option ID', example: 'opt_123' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Option label', example: 'High Priority' })
  @IsString()
  label: string;

  @ApiPropertyOptional({ description: 'Option color', example: '#FF0000' })
  @IsOptional()
  @IsString()
  color?: string;
}

export class TaskCustomFieldDto {
  @ApiProperty({ description: 'Field ID', example: 'field_123_abc' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Field name', example: 'Priority Level' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Field type',
    example: 'select',
    enum: ['text', 'number', 'date', 'select', 'multi_select', 'checkbox', 'url', 'email', 'phone', 'person']
  })
  @IsString()
  fieldType: string;

  @ApiProperty({ description: 'Field value (type depends on fieldType)', example: 'opt_1' })
  @IsOptional()
  value?: any;

  @ApiPropertyOptional({
    description: 'Options for select/multi_select fields',
    type: [TaskCustomFieldOptionDto]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskCustomFieldOptionDto)
  options?: TaskCustomFieldOptionDto[];
}

export class TaskAttachmentsDto {
  @ApiProperty({
    description: 'Array of note attachment UUIDs',
    example: ['550e8400-e29b-41d4-a716-446655440000'],
    type: [String],
    required: false
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  note_attachment?: string[];

  @ApiProperty({
    description: 'Array of file attachment UUIDs',
    example: ['660e8400-e29b-41d4-a716-446655440001'],
    type: [String],
    required: false
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  file_attachment?: string[];

  @ApiProperty({
    description: 'Array of event attachment UUIDs',
    example: ['770e8400-e29b-41d4-a716-446655440002'],
    type: [String],
    required: false
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  event_attachment?: string[];
}

export class CreateTaskDto {
  @ApiProperty({ description: 'Task title', example: 'Implement user authentication' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Task description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ 
    description: 'Task type',
    enum: TaskType,
    example: TaskType.TASK,
    required: false
  })
  @IsOptional()
  @IsEnum(TaskType)
  task_type?: TaskType = TaskType.TASK;

  @ApiProperty({
    description: 'Task status (can be any custom kanban stage ID from the project)',
    example: 'todo',
    required: false
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ 
    description: 'Task priority',
    enum: TaskPriority,
    example: TaskPriority.MEDIUM,
    required: false
  })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority = TaskPriority.MEDIUM;

  @ApiProperty({ description: 'Sprint ID', required: false })
  @IsOptional()
  @IsUUID()
  sprint_id?: string;

  @ApiProperty({ description: 'Parent task ID for subtasks', required: false })
  @IsOptional()
  @IsUUID()
  parent_task_id?: string;

  @ApiProperty({ description: 'Assigned to user IDs (array)', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assigned_to?: string[];

  @ApiProperty({ description: 'Assignee team member ID', required: false })
  @IsOptional()
  @IsUUID()
  assignee_team_member_id?: string;

  @ApiProperty({ description: 'Reporter team member ID', required: false })
  @IsOptional()
  @IsUUID()
  reporter_team_member_id?: string;

  @ApiProperty({ description: 'Due date (ISO string)', required: false })
  @IsOptional()
  @IsString()
  due_date?: string;

  @ApiProperty({ description: 'Estimated hours', required: false })
  @IsOptional()
  @IsNumber()
  estimated_hours?: number;

  @ApiProperty({ description: 'Story points', required: false })
  @IsOptional()
  @IsNumber()
  story_points?: number;

  @ApiProperty({ description: 'Task labels/tags', type: [String], required: false })
  @IsOptional()
  @IsArray()
  labels?: string[];

  @ApiProperty({
    description: 'Task attachments (notes, files, events)',
    type: TaskAttachmentsDto,
    required: false,
    example: {
      note_attachment: ['550e8400-e29b-41d4-a716-446655440000'],
      file_attachment: ['660e8400-e29b-41d4-a716-446655440001'],
      event_attachment: ['770e8400-e29b-41d4-a716-446655440002']
    }
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => TaskAttachmentsDto)
  attachments?: TaskAttachmentsDto;

  @ApiPropertyOptional({
    description: 'Per-task custom fields (array of field definitions with values)',
    type: [TaskCustomFieldDto],
    example: [
      {
        id: 'field_123_abc',
        name: 'Priority Level',
        fieldType: 'select',
        value: 'opt_1',
        options: [
          { id: 'opt_1', label: 'High', color: '#FF0000' },
          { id: 'opt_2', label: 'Low', color: '#00FF00' }
        ]
      }
    ]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskCustomFieldDto)
  custom_fields?: TaskCustomFieldDto[];
}