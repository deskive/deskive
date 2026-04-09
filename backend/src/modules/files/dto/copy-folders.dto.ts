import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayMinSize, IsString, IsOptional } from 'class-validator';

export class CopyFoldersDto {
  @ApiProperty({
    description: 'Array of folder IDs to copy',
    example: ['folder-uuid-1', 'folder-uuid-2', 'folder-uuid-3'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one folder ID is required' })
  @IsString({ each: true })
  folder_ids: string[];

  @ApiProperty({
    description: 'Target parent folder ID where folders will be copied (null for root)',
    example: 'folder-uuid-parent',
    required: false,
  })
  @IsOptional()
  @IsString()
  target_parent_id?: string | null;
}
