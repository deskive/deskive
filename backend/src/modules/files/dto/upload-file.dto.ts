import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID } from 'class-validator';

export class UploadFileDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'File to upload',
    required: true
  })
  file: any;

  @ApiProperty({
    description: 'Workspace ID',
    example: 'uuid-here',
    required: true
  })
  @IsUUID()
  workspace_id: string;

  @ApiProperty({
    description: 'Parent folder ID',
    example: 'uuid-here',
    required: false
  })
  @IsOptional()
  @IsUUID()
  parent_folder_id?: string;

  @ApiProperty({
    description: 'File description',
    example: 'Important project document',
    required: false
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'File tags (comma-separated or JSON array)',
    example: 'important,project,draft',
    required: false,
    type: String
  })
  @IsOptional()
  tags?: string | string[];

  @ApiProperty({
    description: 'Whether file should be publicly accessible',
    example: false,
    required: false
  })
  @IsOptional()
  is_public?: boolean;
}