import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum FileCategory {
  DOCUMENTS = 'documents',
  IMAGES = 'images',
  SPREADSHEETS = 'spreadsheets',
  VIDEOS = 'videos',
  AUDIO = 'audio',
  PDFS = 'pdfs',
}

export class FilterFilesByTypeDto {
  @ApiProperty({
    description: 'File category to filter by',
    enum: FileCategory,
    required: false,
    example: FileCategory.IMAGES,
  })
  @IsOptional()
  @IsEnum(FileCategory)
  category?: FileCategory;

  @ApiProperty({
    description: 'Specific MIME type to filter by (e.g., "image/png", "application/pdf")',
    required: false,
    example: 'image/png',
  })
  @IsOptional()
  @IsString()
  mime_type?: string;

  @ApiProperty({
    description: 'File extension to filter by (e.g., "pdf", "jpg")',
    required: false,
    example: 'pdf',
  })
  @IsOptional()
  @IsString()
  extension?: string;

  @ApiProperty({
    description: 'Folder ID to filter within',
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  folder_id?: string;

  @ApiProperty({
    description: 'Page number for pagination',
    required: false,
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    required: false,
    example: 50,
    default: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 50;
}
