import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsObject,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

// ==================== ENUMS ====================

export enum TemplateCategory {
  SOFTWARE_DEVELOPMENT = 'software_development',
  MARKETING = 'marketing',
  HR = 'hr',
  DESIGN = 'design',
  BUSINESS = 'business',
  EVENTS = 'events',
  RESEARCH = 'research',
  PERSONAL = 'personal',
  SALES = 'sales',
  FINANCE = 'finance',
  IT_SUPPORT = 'it_support',
  EDUCATION = 'education',
  FREELANCE = 'freelance',
  OPERATIONS = 'operations',
  HEALTHCARE = 'healthcare',
  LEGAL = 'legal',
  REAL_ESTATE = 'real_estate',
  MANUFACTURING = 'manufacturing',
  NONPROFIT = 'nonprofit',
  MEDIA = 'media',
}

export enum ProjectType {
  KANBAN = 'kanban',
  SCRUM = 'scrum',
  WATERFALL = 'waterfall',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

// ==================== STRUCTURE DTOs ====================

export class TemplateSubtaskDto {
  @ApiProperty({ description: 'Subtask title', example: 'Review PR' })
  @IsString()
  title: string;
}

export class TemplateTaskDto {
  @ApiProperty({ description: 'Task title', example: 'Setup development environment' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Task description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Assignee role (owner assigns to project owner, member assigns to team)',
    example: 'owner',
    required: false,
  })
  @IsOptional()
  @IsString()
  assigneeRole?: string;

  @ApiProperty({
    description: 'Days offset from project start for due date',
    example: 3,
    required: false,
  })
  @IsOptional()
  dueOffset?: number;

  @ApiProperty({
    description: 'Task priority',
    enum: TaskPriority,
    required: false,
  })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiProperty({
    description: 'Story points for agile estimation',
    example: 3,
    required: false,
  })
  @IsOptional()
  storyPoints?: number;

  @ApiProperty({
    description: 'Task labels/tags',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  labels?: string[];

  @ApiProperty({
    description: 'Subtasks',
    type: [TemplateSubtaskDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateSubtaskDto)
  subtasks?: TemplateSubtaskDto[];
}

export class TemplateSectionDto {
  @ApiProperty({ description: 'Section name', example: 'Planning' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Section description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Tasks in this section',
    type: [TemplateTaskDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateTaskDto)
  tasks: TemplateTaskDto[];
}

export class CustomFieldDefinitionDto {
  @ApiProperty({ description: 'Field name', example: 'Sprint Number' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Field type',
    example: 'select',
  })
  @IsString()
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'checkbox';

  @ApiProperty({ description: 'Field description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Options for select/multiselect fields',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  options?: string[];

  @ApiProperty({ description: 'Default value', required: false })
  @IsOptional()
  defaultValue?: any;

  @ApiProperty({ description: 'Is field required', required: false })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}

export class TemplateStructureDto {
  @ApiProperty({
    description: 'Template sections with tasks',
    type: [TemplateSectionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateSectionDto)
  sections: TemplateSectionDto[];

  @ApiProperty({
    description: 'Custom field definitions',
    type: [CustomFieldDefinitionDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomFieldDefinitionDto)
  customFields?: CustomFieldDefinitionDto[];

  @ApiProperty({
    description: 'Template settings',
    required: false,
  })
  @IsOptional()
  @IsObject()
  settings?: {
    defaultView?: 'board' | 'list' | 'timeline';
    statuses?: string[];
  };
}

export class KanbanStageDto {
  @ApiProperty({ description: 'Stage ID', example: 'todo' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Stage name', example: 'To Do' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Display order', example: 1 })
  order: number;

  @ApiProperty({ description: 'Stage color', example: '#3B82F6' })
  @IsString()
  color: string;
}

// ==================== REQUEST/RESPONSE DTOs ====================

export class CreateTemplateDto {
  @ApiProperty({ description: 'Template name', example: 'Sprint Planning' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Template slug (URL-friendly)', example: 'sprint-planning' })
  @IsString()
  slug: string;

  @ApiProperty({ description: 'Template description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Template category',
    enum: TemplateCategory,
    example: TemplateCategory.SOFTWARE_DEVELOPMENT,
  })
  @IsEnum(TemplateCategory)
  category: TemplateCategory;

  @ApiProperty({ description: 'Icon name or emoji', required: false })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ description: 'Color for UI', required: false })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({
    description: 'Template structure with sections and tasks',
    type: TemplateStructureDto,
  })
  @ValidateNested()
  @Type(() => TemplateStructureDto)
  structure: TemplateStructureDto;

  @ApiProperty({
    description: 'Project type',
    enum: ProjectType,
    required: false,
  })
  @IsOptional()
  @IsEnum(ProjectType)
  projectType?: ProjectType;

  @ApiProperty({
    description: 'Custom kanban stages',
    type: [KanbanStageDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KanbanStageDto)
  kanbanStages?: KanbanStageDto[];

  @ApiProperty({
    description: 'Custom field definitions',
    type: [CustomFieldDefinitionDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomFieldDefinitionDto)
  customFields?: CustomFieldDefinitionDto[];

  @ApiProperty({ description: 'Additional settings', required: false })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}

export class UpdateTemplateDto {
  @ApiProperty({ description: 'Template name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Template description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Icon name or emoji', required: false })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ description: 'Color for UI', required: false })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({
    description: 'Template structure with sections and tasks',
    type: TemplateStructureDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => TemplateStructureDto)
  structure?: TemplateStructureDto;

  @ApiProperty({
    description: 'Custom kanban stages',
    type: [KanbanStageDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KanbanStageDto)
  kanbanStages?: KanbanStageDto[];

  @ApiProperty({ description: 'Is featured in gallery', required: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiProperty({ description: 'Additional settings', required: false })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}

export class CreateProjectFromTemplateDto {
  @ApiProperty({ description: 'Template ID or slug' })
  @IsString()
  templateId: string;

  @ApiProperty({ description: 'New project name', example: 'Q1 Sprint 1' })
  @IsString()
  projectName: string;

  @ApiProperty({ description: 'Project description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Project start date (ISO string)', required: false })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiProperty({ description: 'Project end date (ISO string)', required: false })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiProperty({ description: 'Project lead ID', required: false })
  @IsOptional()
  @IsString()
  leadId?: string;

  @ApiProperty({
    description: 'Default assignee IDs for tasks',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  defaultAssignees?: string[];

  @ApiProperty({
    description: 'Additional customizations',
    required: false,
  })
  @IsOptional()
  @IsObject()
  customizations?: Record<string, any>;
}

export class TemplateQueryDto {
  @ApiProperty({
    description: 'Filter by category',
    enum: TemplateCategory,
    required: false,
  })
  @IsOptional()
  @IsEnum(TemplateCategory)
  category?: TemplateCategory;

  @ApiProperty({ description: 'Show only system templates', required: false })
  @IsOptional()
  @IsBoolean()
  systemOnly?: boolean;

  @ApiProperty({ description: 'Show only featured templates', required: false })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiProperty({ description: 'Search query', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ description: 'Page number (1-based)', required: false, default: 1 })
  @IsOptional()
  page?: number;

  @ApiProperty({ description: 'Items per page', required: false, default: 20 })
  @IsOptional()
  limit?: number;
}

export class PaginatedTemplatesResponseDto {
  @ApiProperty({ description: 'List of templates' })
  data: any[];

  @ApiProperty({ description: 'Pagination metadata' })
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}
