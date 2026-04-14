import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsHexColor, IsArray, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateEventCategoryDto {
  @ApiProperty({
    description: 'Category name',
    example: 'Work Meetings',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Category description',
    example: 'All work-related meetings and events',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Category color in hex format',
    example: '#3b82f6',
  })
  @IsHexColor()
  color: string;

  @ApiProperty({
    description: 'Category icon (emoji or icon identifier)',
    example: '💼',
    required: false,
  })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({
    description:
      'Array of file IDs embedded in the description content (for rich text images/files)',
    example: ['file-uuid-1', 'file-uuid-2'],
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    // Handle undefined/null
    if (value === undefined || value === null) {
      return undefined;
    }
    // Handle empty string
    if (value === '') {
      return [];
    }
    // Handle string that needs to be parsed
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        // If not valid JSON, treat as single item array
        return value.trim() ? [value] : [];
      }
    }
    // Already an array
    if (Array.isArray(value)) {
      return value;
    }
    return [];
  })
  @IsArray()
  @IsUUID('4', { each: true })
  description_file_ids?: string[];
}
