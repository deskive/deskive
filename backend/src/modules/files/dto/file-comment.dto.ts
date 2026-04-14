import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsObject,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateFileCommentDto {
  @ApiProperty({
    description: 'Comment content',
    example: 'Great work on this document!',
    required: true,
    minLength: 1,
    maxLength: 5000,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;

  @ApiProperty({
    description: 'Parent comment ID for replies (optional)',
    example: 'comment-uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  parent_id?: string;

  @ApiProperty({
    description: 'Additional metadata (mentions, attachments, etc.)',
    example: { mentions: ['user-uuid-1'], position: { x: 100, y: 200 } },
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateFileCommentDto {
  @ApiProperty({
    description: 'Updated comment content',
    example: 'Updated comment text',
    required: true,
    minLength: 1,
    maxLength: 5000,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;

  @ApiProperty({
    description: 'Additional metadata',
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class ResolveCommentDto {
  @ApiProperty({
    description: 'Whether to resolve or unresolve the comment',
    example: true,
  })
  @IsBoolean()
  is_resolved: boolean;
}

export class FileCommentResponseDto {
  @ApiProperty({ description: 'Comment ID' })
  id: string;

  @ApiProperty({ description: 'File ID' })
  fileId: string;

  @ApiProperty({ description: 'Comment author user ID' })
  userId: string;

  @ApiProperty({ description: 'Comment content' })
  content: string;

  @ApiProperty({ description: 'Parent comment ID for replies', nullable: true })
  parentId: string | null;

  @ApiProperty({ description: 'Whether comment is resolved' })
  isResolved: boolean;

  @ApiProperty({ description: 'User who resolved the comment', nullable: true })
  resolvedBy: string | null;

  @ApiProperty({ description: 'Timestamp when resolved', nullable: true })
  resolvedAt: string | null;

  @ApiProperty({ description: 'Whether comment was edited' })
  isEdited: boolean;

  @ApiProperty({ description: 'Timestamp when edited', nullable: true })
  editedAt: string | null;

  @ApiProperty({ description: 'Additional metadata' })
  metadata: Record<string, any>;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt: string;

  @ApiProperty({ description: 'Author information', required: false })
  author?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };

  @ApiProperty({ description: 'Reply comments', type: [FileCommentResponseDto], required: false })
  replies?: FileCommentResponseDto[];
}
