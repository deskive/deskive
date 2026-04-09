import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayMinSize, IsString, IsOptional } from 'class-validator';

export class MoveFilesDto {
  @ApiProperty({
    description: 'Array of file IDs to move',
    example: ['file-uuid-1', 'file-uuid-2', 'file-uuid-3'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one file ID is required' })
  @IsString({ each: true })
  file_ids: string[];

  @ApiProperty({
    description: 'Target folder ID where files will be moved (null for root)',
    example: 'folder-uuid-123',
    required: false,
  })
  @IsOptional()
  @IsString()
  target_folder_id?: string | null;
}
