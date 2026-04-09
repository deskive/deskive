import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsArray,
  ValidateNested,
  IsObject,
  IsNumber,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================
// ENUMS
// ============================================

export enum WorkflowTriggerType {
  ENTITY_CHANGE = 'entity_change',
  SCHEDULE = 'schedule',
  WEBHOOK = 'webhook',
  MANUAL = 'manual',
}

export enum EntityType {
  TASK = 'task',
  NOTE = 'note',
  EVENT = 'event',
  FILE = 'file',
  PROJECT = 'project',
  MESSAGE = 'message',
  APPROVAL = 'approval',
}

export enum EntityEventType {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
  STATUS_CHANGED = 'status_changed',
  ASSIGNED = 'assigned',
  COMPLETED = 'completed',
  DUE_DATE_CHANGED = 'due_date_changed',
  PRIORITY_CHANGED = 'priority_changed',
  COMMENTED = 'commented',
  SHARED = 'shared',
  STARTED = 'started',
  ENDED = 'ended',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum WorkflowStepType {
  ACTION = 'action',
  CONDITION = 'condition',
  DELAY = 'delay',
  LOOP = 'loop',
  PARALLEL = 'parallel',
  SET_VARIABLE = 'set_variable',
  STOP = 'stop',
}

export enum WorkflowActionType {
  // Task actions
  CREATE_TASK = 'create_task',
  UPDATE_TASK = 'update_task',
  DELETE_TASK = 'delete_task',
  COMPLETE_TASK = 'complete_task',
  ASSIGN_TASK = 'assign_task',
  SET_DUE_DATE = 'set_due_date',
  SET_PRIORITY = 'set_priority',
  ADD_SUBTASK = 'add_subtask',
  MOVE_TASK = 'move_task',
  DUPLICATE_TASK = 'duplicate_task',

  // Note actions
  CREATE_NOTE = 'create_note',
  UPDATE_NOTE = 'update_note',
  SHARE_NOTE = 'share_note',
  APPEND_TO_NOTE = 'append_to_note',

  // Event actions
  CREATE_EVENT = 'create_event',
  UPDATE_EVENT = 'update_event',
  SEND_INVITE = 'send_invite',
  ADD_ATTENDEE = 'add_attendee',

  // Communication actions
  SEND_MESSAGE = 'send_message',
  SEND_EMAIL = 'send_email',
  SEND_NOTIFICATION = 'send_notification',
  POST_COMMENT = 'post_comment',

  // Video call actions
  CREATE_VIDEO_MEETING = 'create_video_meeting',
  SCHEDULE_VIDEO_MEETING = 'schedule_video_meeting',
  INVITE_TO_MEETING = 'invite_to_meeting',

  // AI actions
  AI_GENERATE = 'ai_generate',
  AI_SUMMARIZE = 'ai_summarize',
  AI_TRANSLATE = 'ai_translate',
  AI_ANALYZE = 'ai_analyze',
  AI_AUTOPILOT = 'ai_autopilot',

  // Integration actions
  CALL_WEBHOOK = 'call_webhook',
  CALL_API = 'call_api',

  // Project actions
  CREATE_PROJECT = 'create_project',
  ADD_PROJECT_MEMBER = 'add_project_member',
  UPDATE_PROJECT_STATUS = 'update_project_status',

  // File actions
  CREATE_FOLDER = 'create_folder',
  MOVE_FILE = 'move_file',
  GENERATE_DOCUMENT = 'generate_document',

  // Approval actions
  CREATE_APPROVAL = 'create_approval',
  APPROVE = 'approve',
  REJECT = 'reject',
}

export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  GREATER_OR_EQUAL = 'greater_or_equal',
  LESS_OR_EQUAL = 'less_or_equal',
  IS_EMPTY = 'is_empty',
  IS_NOT_EMPTY = 'is_not_empty',
  IN_LIST = 'in_list',
  NOT_IN_LIST = 'not_in_list',
  MATCHES_REGEX = 'matches_regex',
  IS_TRUE = 'is_true',
  IS_FALSE = 'is_false',
}

export enum ConditionGroupOperator {
  AND = 'AND',
  OR = 'OR',
}

export enum WorkflowExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum DelayUnit {
  MINUTES = 'minutes',
  HOURS = 'hours',
  DAYS = 'days',
}

// ============================================
// CONDITION DTOs
// ============================================

export class ConditionDto {
  @ApiProperty({ description: 'Field to evaluate (e.g., task.status, task.priority)' })
  @IsString()
  field: string;

  @ApiProperty({ enum: ConditionOperator })
  @IsEnum(ConditionOperator)
  operator: ConditionOperator;

  @ApiPropertyOptional({ description: 'Value to compare against (can use {{variables}})' })
  @IsOptional()
  value?: any;
}

export class ConditionGroupDto {
  @ApiProperty({ enum: ConditionGroupOperator })
  @IsEnum(ConditionGroupOperator)
  operator: ConditionGroupOperator;

  @ApiProperty({ type: [Object], description: 'Array of conditions or nested condition groups' })
  @IsArray()
  conditions: (ConditionDto | ConditionGroupDto)[];
}

// ============================================
// TRIGGER CONFIG DTOs
// ============================================

export class EntityFilterConfigDto {
  @ApiPropertyOptional({ type: [String], description: 'Filter by project IDs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  projectIds?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Filter by assignee user IDs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assigneeIds?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Filter by status values' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  statusValues?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Filter by priority values' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  priorityValues?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Only trigger when specific fields change' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fieldChanges?: string[];

  @ApiPropertyOptional({ type: ConditionGroupDto, description: 'Advanced custom conditions' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ConditionGroupDto)
  customConditions?: ConditionGroupDto;
}

export class EntityTriggerConfigDto {
  @ApiProperty({ enum: EntityType })
  @IsEnum(EntityType)
  entityType: EntityType;

  @ApiProperty({ enum: EntityEventType })
  @IsEnum(EntityEventType)
  eventType: EntityEventType;

  @ApiPropertyOptional({ type: EntityFilterConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => EntityFilterConfigDto)
  filters?: EntityFilterConfigDto;
}

export class ScheduleTriggerConfigDto {
  @ApiProperty({ description: 'Cron expression (e.g., "0 9 * * 1-5" for weekdays at 9 AM)' })
  @IsString()
  cronExpression: string;

  @ApiPropertyOptional({ description: 'Timezone (default: UTC)' })
  @IsOptional()
  @IsString()
  timezone?: string;
}

export class WebhookTriggerConfigDto {
  @ApiPropertyOptional({ description: 'Secret for signature verification' })
  @IsOptional()
  @IsString()
  secret?: string;

  @ApiPropertyOptional({ type: [String], description: 'Allowed IP addresses' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedIps?: string[];
}

// ============================================
// STEP CONFIG DTOs
// ============================================

export class ActionStepConfigDto {
  @ApiProperty({ enum: WorkflowActionType })
  @IsEnum(WorkflowActionType)
  action: WorkflowActionType;

  @ApiProperty({ description: 'Action parameters (supports {{variables}})' })
  @IsObject()
  params: Record<string, any>;
}

export class ConditionStepConfigDto {
  @ApiProperty({ type: ConditionGroupDto })
  @ValidateNested()
  @Type(() => ConditionGroupDto)
  condition: ConditionGroupDto;

  @ApiPropertyOptional({ description: 'Step ID for true branch' })
  @IsOptional()
  @IsString()
  trueBranch?: string;

  @ApiPropertyOptional({ description: 'Step ID for false branch' })
  @IsOptional()
  @IsString()
  falseBranch?: string;
}

export class DelayStepConfigDto {
  @ApiProperty({ description: 'Duration amount' })
  @IsNumber()
  @Min(1)
  @Max(43200) // Max 30 days in minutes
  duration: number;

  @ApiProperty({ enum: DelayUnit })
  @IsEnum(DelayUnit)
  unit: DelayUnit;
}

export class LoopStepConfigDto {
  @ApiProperty({ description: 'Source array to iterate (e.g., {{trigger.task.subtasks}})' })
  @IsString()
  source: string;

  @ApiProperty({ description: 'Variable name for current item' })
  @IsString()
  itemVariable: string;

  @ApiProperty({ type: [String], description: 'Step IDs to execute in loop' })
  @IsArray()
  @IsString({ each: true })
  loopSteps: string[];

  @ApiPropertyOptional({ description: 'Maximum iterations (default: 100)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  maxIterations?: number;
}

export class SetVariableStepConfigDto {
  @ApiProperty({ description: 'Variable name to set' })
  @IsString()
  variableName: string;

  @ApiProperty({ description: 'Value to set (supports {{variables}})' })
  value: any;
}

export class ParallelStepConfigDto {
  @ApiProperty({ type: 'array', items: { type: 'array', items: { type: 'string' } }, description: 'Array of step ID arrays to execute in parallel' })
  @IsArray()
  branches: string[][];

  @ApiPropertyOptional({ description: 'Wait for all branches to complete (default: true)' })
  @IsOptional()
  @IsBoolean()
  waitForAll?: boolean;
}

// ============================================
// WORKFLOW STEP DTOs
// ============================================

export class CreateWorkflowStepDto {
  @ApiProperty({ description: 'Order of execution (0-based)' })
  @IsNumber()
  @Min(0)
  stepOrder: number;

  @ApiProperty({ enum: WorkflowStepType })
  @IsEnum(WorkflowStepType)
  stepType: WorkflowStepType;

  @ApiPropertyOptional({ description: 'Human-readable step name' })
  @IsOptional()
  @IsString()
  stepName?: string;

  @ApiProperty({ description: 'Step configuration based on step type' })
  @IsObject()
  stepConfig:
    | ActionStepConfigDto
    | ConditionStepConfigDto
    | DelayStepConfigDto
    | LoopStepConfigDto
    | SetVariableStepConfigDto
    | ParallelStepConfigDto
    | Record<string, any>;

  @ApiPropertyOptional({ description: 'Parent step ID for branching' })
  @IsOptional()
  @IsUUID()
  parentStepId?: string;

  @ApiPropertyOptional({ description: 'Branch path (true/false for conditions)' })
  @IsOptional()
  @IsString()
  branchPath?: string;

  @ApiPropertyOptional({ description: 'X position for visual builder' })
  @IsOptional()
  @IsNumber()
  positionX?: number;

  @ApiPropertyOptional({ description: 'Y position for visual builder' })
  @IsOptional()
  @IsNumber()
  positionY?: number;
}

export class UpdateWorkflowStepDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  stepOrder?: number;

  @ApiPropertyOptional({ enum: WorkflowStepType })
  @IsOptional()
  @IsEnum(WorkflowStepType)
  stepType?: WorkflowStepType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stepName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  stepConfig?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parentStepId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchPath?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  positionX?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  positionY?: number;
}

// ============================================
// WORKFLOW DTOs
// ============================================

export class CreateWorkflowDto {
  @ApiProperty({ description: 'Workflow name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Workflow description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Icon name' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: 'Color hex code' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ enum: WorkflowTriggerType })
  @IsEnum(WorkflowTriggerType)
  triggerType: WorkflowTriggerType;

  @ApiProperty({ description: 'Trigger configuration based on trigger type' })
  @IsObject()
  triggerConfig: EntityTriggerConfigDto | ScheduleTriggerConfigDto | WebhookTriggerConfigDto | Record<string, any>;

  @ApiPropertyOptional({ type: [CreateWorkflowStepDto], description: 'Workflow steps' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkflowStepDto)
  steps?: CreateWorkflowStepDto[];

  @ApiPropertyOptional({ description: 'Whether workflow is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateWorkflowDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ enum: WorkflowTriggerType })
  @IsOptional()
  @IsEnum(WorkflowTriggerType)
  triggerType?: WorkflowTriggerType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  triggerConfig?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ============================================
// EXECUTION DTOs
// ============================================

export class ManualExecuteWorkflowDto {
  @ApiPropertyOptional({ description: 'Initial context/variables for execution' })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Simulated trigger data' })
  @IsOptional()
  @IsObject()
  triggerData?: Record<string, any>;
}

// ============================================
// TEMPLATE DTOs
// ============================================

export class CreateTemplateFromWorkflowDto {
  @ApiProperty({ description: 'Template name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Category' })
  @IsString()
  category: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ type: [Object], description: 'Configurable variables' })
  @IsOptional()
  @IsArray()
  variables?: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'array';
    default?: any;
    description?: string;
  }>;
}

export class UseTemplateDto {
  @ApiPropertyOptional({ description: 'Custom name for the workflow' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Variable values to customize template' })
  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;
}

// ============================================
// AI BUILDER DTOs
// ============================================

export class GenerateWorkflowDto {
  @ApiProperty({ description: 'Natural language description of the workflow' })
  @IsString()
  prompt: string;

  @ApiPropertyOptional({ description: 'Additional context about the workspace' })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}

// ============================================
// RESPONSE DTOs
// ============================================

export class WorkflowStepResponseDto {
  id: string;
  workflowId: string;
  stepOrder: number;
  stepType: WorkflowStepType;
  stepName?: string;
  stepConfig: Record<string, any>;
  parentStepId?: string;
  branchPath?: string;
  isActive: boolean;
  positionX: number;
  positionY: number;
  createdAt: string;
  updatedAt: string;
}

export class WorkflowResponseDto {
  id: string;
  workspaceId: string;
  createdBy: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  isActive: boolean;
  triggerType: WorkflowTriggerType;
  triggerConfig: Record<string, any>;
  runCount: number;
  successCount: number;
  failureCount: number;
  lastRunAt?: string;
  lastRunStatus?: string;
  createdAt: string;
  updatedAt: string;
  steps?: WorkflowStepResponseDto[];
}

export class WorkflowExecutionResponseDto {
  id: string;
  workflowId: string;
  triggeredBy?: string;
  triggerSource?: string;
  triggerData: Record<string, any>;
  status: WorkflowExecutionStatus;
  currentStepId?: string;
  context: Record<string, any>;
  errorMessage?: string;
  stepsCompleted: number;
  stepsTotal: number;
  startedAt?: string;
  completedAt?: string;
  executionTimeMs?: number;
  createdAt: string;
}

export class WorkflowStepExecutionResponseDto {
  id: string;
  executionId: string;
  stepId: string;
  status: string;
  inputData: Record<string, any>;
  outputData: Record<string, any>;
  conditionResult?: boolean;
  errorMessage?: string;
  retryCount: number;
  startedAt?: string;
  completedAt?: string;
  executionTimeMs?: number;
  createdAt: string;
}

export class AutomationTemplateResponseDto {
  id: string;
  name: string;
  description?: string;
  category: string;
  icon?: string;
  color?: string;
  templateConfig: Record<string, any>;
  variables: Array<{
    name: string;
    type: string;
    default?: any;
    description?: string;
  }>;
  isFeatured: boolean;
  isSystem: boolean;
  useCount: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}
