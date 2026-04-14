import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsString, IsBoolean } from 'class-validator';

export class SearchFiltersDto {
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
  @IsBoolean()
  semantic?: boolean;
}
