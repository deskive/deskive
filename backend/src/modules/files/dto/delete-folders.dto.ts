import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayMinSize, IsString } from 'class-validator';

export class DeleteFoldersDto {
  @ApiProperty({
    description: 'Array of folder IDs to delete',
    example: ['folder-uuid-1', 'folder-uuid-2', 'folder-uuid-3'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one folder ID is required' })
  @IsString({ each: true })
  folder_ids: string[];
}
