import { IsOptional, IsEnum, IsInt, Min, Max, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { FeedbackType, FeedbackCategory } from './create-feedback.dto';
import { FeedbackStatus, FeedbackPriority } from './update-feedback.dto';

export class FeedbackQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by feedback type',
    enum: FeedbackType,
  })
  @IsOptional()
  @IsEnum(FeedbackType)
  type?: FeedbackType;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: FeedbackStatus,
  })
  @IsOptional()
  @IsEnum(FeedbackStatus)
  status?: FeedbackStatus;

  @ApiPropertyOptional({
    description: 'Filter by priority',
    enum: FeedbackPriority,
  })
  @IsOptional()
  @IsEnum(FeedbackPriority)
  priority?: FeedbackPriority;

  @ApiPropertyOptional({
    description: 'Filter by category',
    enum: FeedbackCategory,
  })
  @IsOptional()
  @IsEnum(FeedbackCategory)
  category?: FeedbackCategory;

  @ApiPropertyOptional({
    description: 'Filter by user ID (admin only)',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter by assigned user ID (admin only)',
  })
  @IsOptional()
  @IsString()
  assignedTo?: string;

  @ApiPropertyOptional({
    description: 'Search term for title/description',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by start date',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by end date',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Page number',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Sort by field',
    default: 'created_at',
    enum: ['created_at', 'updated_at', 'priority', 'status', 'type'],
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'created_at';

  @ApiPropertyOptional({
    description: 'Sort order',
    default: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  @Transform(({ value }) => value?.toLowerCase())
  sortOrder?: 'asc' | 'desc' = 'desc';
}
