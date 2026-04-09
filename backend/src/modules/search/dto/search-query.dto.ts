import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsInt, Min, Max, IsDateString, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class SearchQueryDto {
  @ApiProperty({ description: 'Search query', example: 'meeting notes' })
  @IsString()
  query: string;

  @ApiProperty({ description: 'Content types to search', example: ['notes', 'files', 'messages'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    // Handle comma-separated string
    if (typeof value === 'string') {
      return value.split(',').map(v => v.trim()).filter(v => v.length > 0);
    }
    // Handle array input (from query params like types[]=notes&types[]=files)
    if (Array.isArray(value)) {
      return value.map(v => typeof v === 'string' ? v.trim() : v).filter(v => v && v.length > 0);
    }
    return value;
  })
  types?: string[];

  @ApiProperty({ description: 'Page number', example: 1, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({ description: 'Results per page', example: 20, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  // Filters (merged from SearchFiltersDto)
  @ApiProperty({ description: 'Filter by author/creator', required: false })
  @IsOptional()
  @IsString()
  author?: string;

  @ApiProperty({ description: 'Filter by date from', required: false })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiProperty({ description: 'Filter by date to', required: false })
  @IsOptional()
  @IsDateString()
  date_to?: string;

  @ApiProperty({ description: 'Filter by tags', required: false })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiProperty({ description: 'Filter by project ID', required: false })
  @IsOptional()
  @IsString()
  project_id?: string;

  @ApiProperty({ description: 'Enable semantic (AI-powered) search', required: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  semantic?: boolean;
}