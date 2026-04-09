import { IsString, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class GetRecentSearchesDto {
  @ApiProperty({
    description: 'Limit number of recent searches to return',
    example: 10,
    required: false,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}

export class ClearSearchHistoryDto {
  @ApiProperty({
    description: 'Optional query to clear specific search from history',
    example: 'project planning',
    required: false,
  })
  @IsOptional()
  @IsString()
  query?: string;
}

export class SearchHistoryResponseDto {
  @ApiProperty({ description: 'Search history ID' })
  id: string;

  @ApiProperty({ description: 'Search query' })
  query: string;

  @ApiProperty({ description: 'Number of results found' })
  result_count: number;

  @ApiProperty({ description: 'Content types searched', type: [String] })
  content_types: string[];

  @ApiProperty({
    description: 'Applied filters',
    type: 'object',
    additionalProperties: true
  })
  filters: Record<string, any>;

  @ApiProperty({ description: 'When the search was performed' })
  created_at: Date;
}
