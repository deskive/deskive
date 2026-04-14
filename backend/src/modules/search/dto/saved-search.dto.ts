import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  IsEnum,
  Allow,
} from 'class-validator';

export enum SearchType {
  ALL = 'all',
  MESSAGES = 'messages',
  FILES = 'files',
  FOLDERS = 'folders',
  PROJECTS = 'projects',
  NOTES = 'notes',
  CALENDAR = 'calendar',
  VIDEOS = 'videos',
}

export enum SearchMode {
  FULL_TEXT = 'full-text',
  SEMANTIC = 'semantic',
  HYBRID = 'hybrid',
}

/**
 * DTO for creating a saved search
 */
export class CreateSavedSearchDto {
  @ApiProperty({
    description: 'User-defined name for the saved search',
    example: 'My Important Files',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'The search query', example: 'quarterly report' })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiProperty({
    description: 'Search type',
    enum: SearchType,
    example: SearchType.ALL,
  })
  @IsEnum(SearchType)
  @IsNotEmpty()
  type: SearchType;

  @ApiProperty({
    description: 'Search mode',
    enum: SearchMode,
    example: SearchMode.HYBRID,
  })
  @IsEnum(SearchMode)
  @IsNotEmpty()
  mode: SearchMode;

  @ApiProperty({
    description: 'Search filters (JSON object)',
    example: { dateRange: { from: '2025-01-01' }, authors: ['user-123'] },
    required: false,
    additionalProperties: true,
  })
  @IsOptional()
  filters?: Record<string, any>;

  @ApiProperty({
    description: 'User tags for organization',
    example: ['work', 'important'],
    required: false,
  })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiProperty({
    description: 'Enable notifications for new matching results',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isNotificationEnabled?: boolean;

  @ApiProperty({
    description: 'Snapshot of current search results to save',
    example: [],
    required: false,
  })
  @Allow()
  resultsSnapshot?: any[];
}

/**
 * DTO for updating a saved search
 */
export class UpdateSavedSearchDto {
  @ApiProperty({ description: 'User-defined name for the saved search', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'The search query', required: false })
  @IsString()
  @IsOptional()
  query?: string;

  @ApiProperty({
    description: 'Search type',
    enum: SearchType,
    required: false,
  })
  @IsEnum(SearchType)
  @IsOptional()
  type?: SearchType;

  @ApiProperty({
    description: 'Search mode',
    enum: SearchMode,
    required: false,
  })
  @IsEnum(SearchMode)
  @IsOptional()
  mode?: SearchMode;

  @ApiProperty({
    description: 'Search filters (JSON object)',
    required: false,
    additionalProperties: true,
  })
  @IsOptional()
  filters?: Record<string, any>;

  @ApiProperty({
    description: 'User tags for organization',
    required: false,
  })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiProperty({
    description: 'Enable notifications for new matching results',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isNotificationEnabled?: boolean;
}

/**
 * DTO for sharing a saved search
 */
export class ShareSavedSearchDto {
  @ApiProperty({
    description: 'Array of user IDs to share with',
    example: ['user-123', 'user-456'],
  })
  @IsArray()
  @IsNotEmpty()
  userIds: string[];
}

/**
 * Response DTO for saved search
 */
export class SavedSearchResponseDto {
  @ApiProperty({ description: 'Saved search ID' })
  id: string;

  @ApiProperty({ description: 'Workspace ID' })
  workspace_id: string;

  @ApiProperty({ description: 'User ID who created the search' })
  user_id: string;

  @ApiProperty({ description: 'Name of the saved search' })
  name: string;

  @ApiProperty({ description: 'Search query' })
  query: string;

  @ApiProperty({ description: 'Search type', enum: SearchType })
  type: SearchType;

  @ApiProperty({ description: 'Search mode', enum: SearchMode })
  mode: SearchMode;

  @ApiProperty({ description: 'Search filters' })
  filters: Record<string, any>;

  @ApiProperty({ description: 'User tags' })
  tags: string[];

  @ApiProperty({ description: 'Saved search results snapshot' })
  results_snapshot: any[];

  @ApiProperty({ description: 'Number of results when saved' })
  result_count: number;

  @ApiProperty({ description: 'Notification enabled status' })
  is_notification_enabled: boolean;

  @ApiProperty({ description: 'User IDs this search is shared with' })
  shared_with: string[];

  @ApiProperty({ description: 'Creation timestamp' })
  created_at: string;

  @ApiProperty({ description: 'Last update timestamp' })
  updated_at: string;
}
