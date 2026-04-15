import {
  IsOptional,
  IsString,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsArray,
} from 'class-validator';
import { Type, Transform, TransformFnParams } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType, NotificationPriority } from './create-notification.dto';

// Helper function to convert string boolean to actual boolean
const toBoolean = (params: TransformFnParams): boolean | undefined => {
  // Get the original value from the obj, not the already-converted value
  // because enableImplicitConversion converts it before @Transform runs
  const originalValue = params.obj?.[params.key];
  const value = originalValue !== undefined ? originalValue : params.value;

  if (value === undefined || value === null) return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    if (lower === 'true' || lower === '1') return true;
    if (lower === 'false' || lower === '0') return false;
  }
  return undefined;
};

export class NotificationQueryDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'created_at',
  })
  @IsOptional()
  @IsString()
  sort_by?: string = 'created_at';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    example: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sort_order?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({
    description: 'Filter by notification type',
    enum: NotificationType,
  })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptional({
    description: 'Filter by read status',
    example: false,
  })
  @IsOptional()
  @Transform(toBoolean)
  is_read?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by archived status',
    example: false,
  })
  @IsOptional()
  @Transform(toBoolean)
  is_archived?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by priority',
    enum: NotificationPriority,
  })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @ApiPropertyOptional({
    description: 'Filter by start date',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({
    description: 'Filter by end date',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({
    description: 'Search in title and message',
    example: 'workout',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by multiple types',
    type: [String],
    example: ['reminder', 'health'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  types?: string[];

  @ApiPropertyOptional({
    description: 'Include expired notifications',
    example: false,
  })
  @IsOptional()
  @Transform((params) => {
    const result = toBoolean(params);
    return result !== undefined ? result : false;
  })
  include_expired?: boolean = false;

  @ApiPropertyOptional({
    description: 'Only return notifications with action URLs',
    example: false,
  })
  @IsOptional()
  @Transform(toBoolean)
  has_action?: boolean;
}
