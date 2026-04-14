import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class DeleteFilesDto {
  @ApiProperty({
    description: 'Array of file IDs to delete',
    example: ['file-uuid-1', 'file-uuid-2', 'file-uuid-3'],
    required: true,
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  file_ids: string[];
}
