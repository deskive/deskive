import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateFileDto {
  @ApiProperty({
    description: 'New file name',
    example: 'updated-document.pdf',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'File description',
    example: 'Updated project document',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'File tags (comma-separated or JSON array)',
    example: 'important,updated,final',
    required: false,
    type: String,
  })
  @IsOptional()
  tags?: string | string[];

  @ApiProperty({
    description: 'Update last opened timestamp to current time (marks file as accessed)',
    example: true,
    required: false,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  mark_as_opened?: boolean;

  @ApiProperty({
    description: 'Star or unstar the file (true = starred, false = unstarred)',
    example: true,
    required: false,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  starred?: boolean;
}
