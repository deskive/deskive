import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsUrl, IsNumber, IsBoolean } from 'class-validator';

export class AddFileByUrlDto {
  @ApiProperty({
    description: 'Direct URL to the file',
    example: 'https://example.com/files/document.pdf',
    required: true,
  })
  @IsUrl()
  url: string;

  @ApiProperty({
    description: 'File name',
    example: 'document.pdf',
    required: true,
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Workspace ID',
    example: 'uuid-here',
    required: true,
  })
  @IsUUID()
  workspace_id: string;

  @ApiPropertyOptional({
    description: 'Storage path where file is located',
    example: 'workspace_id/folder/document.pdf',
  })
  @IsOptional()
  @IsString()
  storage_path?: string;

  @ApiPropertyOptional({
    description: 'MIME type of the file',
    example: 'application/pdf',
  })
  @IsOptional()
  @IsString()
  mime_type?: string;

  @ApiPropertyOptional({
    description: 'File size in bytes',
    example: 1024000,
  })
  @IsOptional()
  @IsNumber()
  size?: number;

  @ApiPropertyOptional({
    description: 'Parent folder ID',
    example: 'uuid-here',
  })
  @IsOptional()
  @IsUUID()
  folder_id?: string;

  @ApiPropertyOptional({
    description: 'File description',
    example: 'Important project document',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'File tags (comma-separated or JSON array)',
    example: 'important,project,draft',
    type: String,
  })
  @IsOptional()
  tags?: string | string[];

  @ApiPropertyOptional({
    description: 'Whether file should be publicly accessible',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  is_public?: boolean;

  @ApiPropertyOptional({
    description: 'Whether this is an AI-generated file',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  is_ai_generated?: boolean;

  @ApiPropertyOptional({
    description: 'File hash for deduplication',
    example: 'sha256:abcd1234...',
  })
  @IsOptional()
  @IsString()
  file_hash?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { source: 'ai_generation', model: 'dall-e-3' },
  })
  @IsOptional()
  metadata?: any;
}
