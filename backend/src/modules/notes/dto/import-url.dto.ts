import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsUrl } from 'class-validator';

export class ImportUrlDto {
  @ApiProperty({
    description: 'URL to import content from',
    example: 'https://example.com/article',
  })
  @IsUrl({}, { message: 'Please provide a valid URL' })
  url: string;

  @ApiPropertyOptional({
    description: 'Custom title for the imported note (uses page title if not provided)',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    description: 'Parent folder/note ID',
  })
  @IsString()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({
    description: 'Tags for the note',
    type: [String],
    example: ['web', 'imported'],
  })
  @IsArray()
  @IsOptional()
  tags?: string[];
}

export class ImportUrlResponseDto {
  @ApiProperty({ description: 'Whether the import was successful' })
  success: boolean;

  @ApiProperty({ description: 'The created note ID' })
  noteId: string;

  @ApiProperty({ description: 'Title extracted from the page' })
  title: string;

  @ApiProperty({ description: 'Excerpt/summary of the content' })
  excerpt?: string;

  @ApiProperty({ description: 'Site name' })
  siteName?: string;

  @ApiPropertyOptional({ description: 'Message about the import' })
  message?: string;
}
