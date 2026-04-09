import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';

export class ImportPdfDto {
  @ApiProperty({
    description: 'Title for the imported note',
    example: 'My PDF Document',
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    description: 'Parent folder/note ID',
  })
  @IsString()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({
    description: 'Tags for the note',
    type: [String],
    example: ['pdf', 'imported'],
  })
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (Array.isArray(value)) return value;
    try {
      return JSON.parse(value);
    } catch {
      return [value];
    }
  })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Whether to extract and upload images from the PDF',
    default: true,
  })
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  @IsOptional()
  extractImages?: boolean;
}

export class ImportPdfResponseDto {
  @ApiProperty({ description: 'Whether the import was successful' })
  success: boolean;

  @ApiProperty({ description: 'The created note ID' })
  noteId: string;

  @ApiProperty({ description: 'Markdown content extracted from PDF' })
  markdown: string;

  @ApiProperty({ description: 'HTML content for the editor' })
  html: string;

  @ApiProperty({ description: 'Number of pages in the PDF' })
  pageCount: number;

  @ApiProperty({ description: 'Whether tables were detected' })
  hasTable: boolean;

  @ApiProperty({ description: 'Number of images extracted' })
  imageCount: number;

  @ApiPropertyOptional({ description: 'Message about the import' })
  message?: string;
}
