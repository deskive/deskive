import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, ArrayMinSize, IsString } from 'class-validator';

export class BulkDeleteDto {
  @ApiProperty({
    description: 'Array of note IDs to delete',
    example: ['uuid-1', 'uuid-2', 'uuid-3'],
    type: [String],
    minItems: 1
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one note ID is required' })
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  note_ids: string[];
}