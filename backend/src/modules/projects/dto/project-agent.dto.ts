import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProjectAgentRequestDto {
  @ApiProperty({
    description: 'Natural language prompt for the project assistant',
    example: 'Create a new project called Marketing Campaign with high priority',
  })
  @IsString()
  @IsNotEmpty()
  prompt: string;
}

export class ProjectAgentResponseDto {
  @ApiProperty({ description: 'Whether the operation was successful' })
  success: boolean;

  @ApiProperty({
    description: 'The action that was performed',
    enum: ['create', 'update', 'delete', 'unknown'],
  })
  action: 'create' | 'update' | 'delete' | 'unknown';

  @ApiProperty({ description: 'Human-readable message about the result' })
  message: string;

  @ApiProperty({ description: 'Additional data from the operation', required: false })
  data?: any;

  @ApiProperty({ description: 'Error code if operation failed', required: false })
  error?: string;
}

// ==================== TASK AGENT DTOs ====================

export class TaskAgentRequestDto {
  @ApiProperty({
    description: 'Natural language prompt for the task assistant',
    example: 'Create a task called Fix login bug with high priority and assign to John',
  })
  @IsString()
  @IsNotEmpty()
  prompt: string;
}

export class TaskAgentResponseDto {
  @ApiProperty({ description: 'Whether the operation was successful' })
  success: boolean;

  @ApiProperty({
    description: 'The action that was performed',
    enum: [
      'create',
      'update',
      'delete',
      'move',
      'batch_create',
      'batch_update',
      'batch_delete',
      'list',
      'unknown',
    ],
  })
  action:
    | 'create'
    | 'update'
    | 'delete'
    | 'move'
    | 'batch_create'
    | 'batch_update'
    | 'batch_delete'
    | 'list'
    | 'unknown';

  @ApiProperty({ description: 'Human-readable message about the result' })
  message: string;

  @ApiProperty({ description: 'Additional data from the operation', required: false })
  data?: any;

  @ApiProperty({ description: 'Error code if operation failed', required: false })
  error?: string;
}

// ==================== UNIFIED AGENT DTOs ====================

export class UnifiedAgentRequestDto {
  @ApiProperty({
    description: 'Natural language prompt for the AI assistant',
    example: 'Create a task called Fix login bug in Marketing Project',
  })
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @ApiPropertyOptional({
    description: 'Optional project ID if user is within a project context',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsOptional()
  projectId?: string;
}

export class UnifiedAgentResponseDto {
  @ApiProperty({ description: 'Whether the operation was successful' })
  success: boolean;

  @ApiProperty({
    description: 'Which agent handled the request',
    enum: ['project', 'task', 'router'],
  })
  agentUsed: 'project' | 'task' | 'router';

  @ApiProperty({
    description: 'The action that was performed',
  })
  action: string;

  @ApiProperty({ description: 'Human-readable message about the result' })
  message: string;

  @ApiProperty({ description: 'Additional data from the operation', required: false })
  data?: any;

  @ApiProperty({ description: 'Error code if operation failed', required: false })
  error?: string;
}
