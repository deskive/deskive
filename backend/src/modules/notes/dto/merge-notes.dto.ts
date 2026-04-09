import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString, IsUUID, ArrayMinSize } from 'class-validator';

export class MergeNotesDto {
  @ApiProperty({
    description: 'Array of note IDs to merge (minimum 2 notes)',
    example: ['uuid-1', 'uuid-2', 'uuid-3'],
    type: [String]
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(2, { message: 'At least 2 notes are required to merge' })
  note_ids: string[];

  @ApiProperty({
    description: 'Title for the merged note (optional, defaults to "Merged Note")',
    example: 'Combined Meeting Notes',
    required: false
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    description: 'Include note headers and metadata (title, date, author) for each note',
    example: true,
    required: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  include_headers?: boolean;

  @ApiProperty({
    description: 'Add horizontal dividers between notes',
    example: true,
    required: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  add_dividers?: boolean;

  @ApiProperty({
    description: 'Sort notes by creation date (oldest first) before merging',
    example: false,
    required: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  sort_by_date?: boolean;
}
