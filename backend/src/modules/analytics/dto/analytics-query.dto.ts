import { IsOptional, IsEnum, IsDateString, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum AnalyticsTimeRange {
  TODAY = 'today',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
  CUSTOM = 'custom',
}

export enum AnalyticsMetric {
  USERS = 'users',
  PROJECTS = 'projects',
  TASKS = 'tasks',
  ACTIVITY = 'activity',
  PERFORMANCE = 'performance',
}

export class AnalyticsQueryDto {
  @ApiPropertyOptional({
    enum: AnalyticsTimeRange,
    description: 'Time range for analytics data',
    default: AnalyticsTimeRange.WEEK,
  })
  @IsOptional()
  @IsEnum(AnalyticsTimeRange)
  timeRange?: AnalyticsTimeRange = AnalyticsTimeRange.WEEK;

  @ApiPropertyOptional({
    description: 'Start date for custom time range (ISO string)',
    example: '2023-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for custom time range (ISO string)',
    example: '2023-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    enum: AnalyticsMetric,
    description: 'Specific metrics to include',
    isArray: true,
  })
  @IsOptional()
  @IsEnum(AnalyticsMetric, { each: true })
  metrics?: AnalyticsMetric[];

  @ApiPropertyOptional({
    description: 'Group results by specific field',
    example: 'user_id',
  })
  @IsOptional()
  @IsString()
  groupBy?: string;
}
