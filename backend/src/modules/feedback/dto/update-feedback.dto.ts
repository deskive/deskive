import { IsString, IsOptional, IsEnum, IsBoolean, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum FeedbackStatus {
  PENDING = 'pending',
  IN_REVIEW = 'in_review',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  WONT_FIX = 'wont_fix',
  DUPLICATE = 'duplicate',
}

export enum FeedbackPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export class UpdateFeedbackDto {
  @ApiPropertyOptional({
    description: 'Status of the feedback',
    enum: FeedbackStatus,
    example: FeedbackStatus.IN_PROGRESS,
  })
  @IsOptional()
  @IsEnum(FeedbackStatus)
  status?: FeedbackStatus;

  @ApiPropertyOptional({
    description: 'Priority of the feedback',
    enum: FeedbackPriority,
    example: FeedbackPriority.HIGH,
  })
  @IsOptional()
  @IsEnum(FeedbackPriority)
  priority?: FeedbackPriority;

  @ApiPropertyOptional({
    description: 'User ID of the assignee',
    example: 'user_123',
  })
  @IsOptional()
  @IsString()
  assignedTo?: string;

  @ApiPropertyOptional({
    description: 'ID of the feedback this is a duplicate of',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  duplicateOfId?: string;
}

export class ResolveFeedbackDto {
  @ApiPropertyOptional({
    description: 'Resolution notes explaining how the feedback was addressed',
    example:
      'Fixed the crash by updating the notification settings handler. Will be available in version 1.2.4.',
  })
  @IsOptional()
  @IsString()
  resolutionNotes?: string;

  @ApiPropertyOptional({
    description: 'Whether to notify the user about the resolution',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  notifyUser?: boolean;
}
