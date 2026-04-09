import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  IsObject,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';

/**
 * Memory types for Super Agent
 */
export enum MemoryType {
  EPISODIC = 'episodic',
  PREFERENCE = 'preference',
  LONG_TERM = 'long_term',
  DECISION = 'decision',
}

/**
 * Context types for memories
 */
export enum ContextType {
  TASK = 'task',
  CHAT = 'chat',
  NOTE = 'note',
  MEETING = 'meeting',
  PROJECT = 'project',
  FILE = 'file',
  EMAIL = 'email',
  CALENDAR = 'calendar',
}

/**
 * DTO for storing a new memory
 */
export class StoreMemoryDto {
  @ApiProperty({ description: 'Workspace ID' })
  @IsUUID()
  workspaceId: string;

  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiPropertyOptional({ description: 'Agent ID if from specific agent' })
  @IsOptional()
  @IsString()
  agentId?: string;

  @ApiProperty({ enum: MemoryType, description: 'Type of memory' })
  @IsEnum(MemoryType)
  memoryType: MemoryType;

  @ApiProperty({ description: 'Memory content' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Summary of the memory' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({ enum: ContextType, description: 'Context type' })
  @IsOptional()
  @IsEnum(ContextType)
  contextType?: ContextType;

  @ApiPropertyOptional({ description: 'Context entity ID' })
  @IsOptional()
  @IsUUID()
  contextId?: string;

  @ApiPropertyOptional({ description: 'Importance score 1-10', default: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  importance?: number;

  @ApiPropertyOptional({ description: 'Tags for categorization', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Expiration date for temporary memories' })
  @IsOptional()
  @IsString()
  expiresAt?: string;
}

/**
 * DTO for storing episodic memory (simplified)
 */
export class StoreEpisodicMemoryDto {
  @ApiProperty({ description: 'Workspace ID' })
  @IsUUID()
  workspaceId: string;

  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Memory content describing what happened' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Importance score 1-10', default: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  importance?: number;

  @ApiPropertyOptional({ description: 'Tags for categorization', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ enum: ContextType, description: 'Context type' })
  @IsOptional()
  @IsEnum(ContextType)
  contextType?: ContextType;

  @ApiPropertyOptional({ description: 'Context entity ID' })
  @IsOptional()
  @IsUUID()
  contextId?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO for storing/updating user preferences
 */
export class StorePreferenceDto {
  @ApiProperty({ description: 'Workspace ID' })
  @IsUUID()
  workspaceId: string;

  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Preference key (e.g., task_priority, meeting_time)' })
  @IsString()
  preferenceKey: string;

  @ApiProperty({ description: 'Preference value' })
  @IsObject()
  preferenceValue: any;

  @ApiPropertyOptional({ description: 'Confidence score 0-1', default: 0.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;

  @ApiPropertyOptional({ description: 'Memory IDs this was learned from', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  learnedFrom?: string[];
}

/**
 * DTO for searching memories
 */
export class SearchMemoriesDto {
  @ApiProperty({ description: 'Search query' })
  @IsString()
  query: string;

  @ApiProperty({ description: 'Workspace ID' })
  @IsUUID()
  workspaceId: string;

  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiPropertyOptional({ description: 'Filter by memory type', enum: MemoryType })
  @IsOptional()
  @IsEnum(MemoryType)
  memoryType?: MemoryType;

  @ApiPropertyOptional({ description: 'Filter by context type', enum: ContextType })
  @IsOptional()
  @IsEnum(ContextType)
  contextType?: ContextType;

  @ApiPropertyOptional({ description: 'Minimum importance score' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  minImportance?: number;

  @ApiPropertyOptional({ description: 'Maximum results', default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Filter by tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Include inactive memories', default: false })
  @IsOptional()
  @IsBoolean()
  includeInactive?: boolean;
}

/**
 * Memory search result
 */
export class MemorySearchResultDto {
  @ApiProperty({ description: 'Memory ID' })
  id: string;

  @ApiProperty({ description: 'Similarity score' })
  score: number;

  @ApiProperty({ enum: MemoryType })
  memoryType: MemoryType;

  @ApiProperty({ description: 'Memory content' })
  content: string;

  @ApiPropertyOptional({ description: 'Memory summary' })
  summary?: string;

  @ApiPropertyOptional({ enum: ContextType })
  contextType?: ContextType;

  @ApiPropertyOptional({ description: 'Context ID' })
  contextId?: string;

  @ApiProperty({ description: 'Importance score' })
  importance: number;

  @ApiProperty({ description: 'Tags', type: [String] })
  tags: string[];

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: Date;

  @ApiPropertyOptional({ description: 'Last accessed timestamp' })
  lastAccessedAt?: Date;
}

/**
 * User preference result
 */
export class UserPreferenceDto {
  @ApiProperty({ description: 'Preference key' })
  preferenceKey: string;

  @ApiProperty({ description: 'Preference value' })
  preferenceValue: any;

  @ApiProperty({ description: 'Confidence score 0-1' })
  confidence: number;

  @ApiProperty({ description: 'Last updated' })
  updatedAt: Date;
}

/**
 * Combined memory context result
 */
export class MemoryContextDto {
  @ApiProperty({ description: 'Relevant memories', type: [MemorySearchResultDto] })
  memories: MemorySearchResultDto[];

  @ApiProperty({ description: 'User preferences', type: [UserPreferenceDto] })
  preferences: UserPreferenceDto[];

  @ApiProperty({ description: 'Formatted context string for AI prompt' })
  contextString: string;
}

/**
 * Memory update DTO
 */
export class UpdateMemoryImportanceDto {
  @ApiProperty({ description: 'Memory ID' })
  @IsUUID()
  memoryId: string;

  @ApiProperty({ description: 'Importance delta (-10 to +10)' })
  @IsNumber()
  @Min(-10)
  @Max(10)
  delta: number;
}
