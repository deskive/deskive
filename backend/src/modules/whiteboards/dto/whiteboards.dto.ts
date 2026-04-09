import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

// ==================== Request DTOs ====================

export class CreateWhiteboardDto {
  @ApiProperty({ description: 'Name of the whiteboard' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Description of the whiteboard' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Initial Excalidraw elements' })
  @IsOptional()
  elements?: any[];

  @ApiPropertyOptional({ description: 'Initial Excalidraw app state' })
  @IsOptional()
  appState?: Record<string, any>;
}

export class UpdateWhiteboardDto {
  @ApiPropertyOptional({ description: 'Name of the whiteboard' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Description of the whiteboard' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Excalidraw elements' })
  @IsOptional()
  elements?: any[];

  @ApiPropertyOptional({ description: 'Excalidraw app state' })
  @IsOptional()
  appState?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Excalidraw binary files' })
  @IsOptional()
  files?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Whether the whiteboard is public' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class AddCollaboratorDto {
  @ApiProperty({ description: 'User ID to add as collaborator' })
  @IsString()
  userId: string;

  @ApiPropertyOptional({ description: 'Permission level', enum: ['view', 'edit', 'admin'] })
  @IsOptional()
  @IsString()
  permission?: 'view' | 'edit' | 'admin';
}

// ==================== Response DTOs ====================

export class WhiteboardResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  workspaceId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description: string | null;

  @ApiProperty()
  elements: any[];

  @ApiPropertyOptional()
  appState: Record<string, any>;

  @ApiPropertyOptional()
  files: Record<string, any>;

  @ApiPropertyOptional()
  thumbnailUrl: string | null;

  @ApiProperty()
  isPublic: boolean;

  @ApiProperty()
  createdBy: string;

  @ApiPropertyOptional()
  createdByName?: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class WhiteboardListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  workspaceId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description: string | null;

  @ApiPropertyOptional()
  thumbnailUrl: string | null;

  @ApiProperty()
  isPublic: boolean;

  @ApiProperty()
  createdBy: string;

  @ApiPropertyOptional()
  createdByName?: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class CollaboratorResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  whiteboardId: string;

  @ApiProperty()
  userId: string;

  @ApiPropertyOptional()
  userName?: string;

  @ApiPropertyOptional()
  userAvatar?: string;

  @ApiProperty()
  permission: string;

  @ApiProperty()
  createdAt: string;
}
