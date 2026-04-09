import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsEnum, IsUUID } from 'class-validator';

/**
 * Deletion reason enum - matches the exit survey options
 */
export enum DeletionReason {
  FOUND_ALTERNATIVE = 'found_alternative',
  PRIVACY_CONCERNS = 'privacy_concerns',
  BUGS_ERRORS = 'bugs_errors',
  MISSING_FEATURES = 'missing_features',
  TOO_COMPLICATED = 'too_complicated',
  NOT_USING = 'not_using',
  OTHER = 'other',
}

/**
 * Feedback status enum
 */
export enum FeedbackStatus {
  PENDING = 'pending',
  REVIEWED = 'reviewed',
  ACTIONED = 'actioned',
  RESOLVED = 'resolved',
}

/**
 * Feedback priority enum
 */
export enum FeedbackPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * DTO for submitting account deletion feedback
 */
export class SubmitDeletionFeedbackDto {
  @ApiProperty({
    description: 'Primary reason for account deletion',
    enum: DeletionReason,
    example: DeletionReason.NOT_USING,
  })
  @IsEnum(DeletionReason)
  reason: DeletionReason;

  @ApiPropertyOptional({
    description: 'Additional details about the reason',
    example: 'I found another app that better suits my needs',
  })
  @IsString()
  @IsOptional()
  reasonDetails?: string;

  @ApiPropertyOptional({
    description: 'User feedback or suggestions',
    example: 'Would be great if you added calendar integration',
  })
  @IsString()
  @IsOptional()
  feedbackResponse?: string;

  @ApiProperty({
    description: 'Whether user was retained (cancelled deletion)',
    example: false,
  })
  @IsBoolean()
  wasRetained: boolean;

  @ApiProperty({
    description: 'Whether user proceeded with account deletion',
    example: true,
  })
  @IsBoolean()
  deletedAccount: boolean;
}

/**
 * DTO for updating deletion feedback (admin)
 */
export class UpdateDeletionFeedbackDto {
  @ApiPropertyOptional({
    description: 'Feedback status',
    enum: FeedbackStatus,
    example: FeedbackStatus.REVIEWED,
  })
  @IsEnum(FeedbackStatus)
  @IsOptional()
  status?: FeedbackStatus;

  @ApiPropertyOptional({
    description: 'Feedback priority',
    enum: FeedbackPriority,
    example: FeedbackPriority.HIGH,
  })
  @IsEnum(FeedbackPriority)
  @IsOptional()
  priority?: FeedbackPriority;

  @ApiPropertyOptional({
    description: 'Admin notes about the feedback',
    example: 'User reported bug in calendar - assigned to dev team',
  })
  @IsString()
  @IsOptional()
  adminNotes?: string;
}

/**
 * Response DTO for deletion feedback
 */
export class DeletionFeedbackResponseDto {
  @ApiProperty({ description: 'Feedback ID' })
  id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'User email' })
  userEmail: string;

  @ApiPropertyOptional({ description: 'User name' })
  userName?: string;

  @ApiProperty({ description: 'Deletion reason', enum: DeletionReason })
  reason: DeletionReason;

  @ApiPropertyOptional({ description: 'Reason details' })
  reasonDetails?: string;

  @ApiPropertyOptional({ description: 'User feedback' })
  feedbackResponse?: string;

  @ApiProperty({ description: 'Was user retained' })
  wasRetained: boolean;

  @ApiProperty({ description: 'Did user delete account' })
  deletedAccount: boolean;

  @ApiProperty({ description: 'Feedback status', enum: FeedbackStatus })
  status: FeedbackStatus;

  @ApiProperty({ description: 'Feedback priority', enum: FeedbackPriority })
  priority: FeedbackPriority;

  @ApiPropertyOptional({ description: 'Admin notes' })
  adminNotes?: string;

  @ApiPropertyOptional({ description: 'Reviewed at timestamp' })
  reviewedAt?: string;

  @ApiPropertyOptional({ description: 'Reviewed by admin ID' })
  reviewedBy?: string;

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'Updated at timestamp' })
  updatedAt: string;
}

/**
 * Query params for fetching deletion feedback (admin)
 */
export class GetDeletionFeedbackQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: FeedbackStatus,
  })
  @IsEnum(FeedbackStatus)
  @IsOptional()
  status?: FeedbackStatus;

  @ApiPropertyOptional({
    description: 'Filter by reason',
    enum: DeletionReason,
  })
  @IsEnum(DeletionReason)
  @IsOptional()
  reason?: DeletionReason;

  @ApiPropertyOptional({
    description: 'Filter by priority',
    enum: FeedbackPriority,
  })
  @IsEnum(FeedbackPriority)
  @IsOptional()
  priority?: FeedbackPriority;

  @ApiPropertyOptional({
    description: 'Filter by retained status',
  })
  @IsBoolean()
  @IsOptional()
  wasRetained?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by deleted account status',
  })
  @IsBoolean()
  @IsOptional()
  deletedAccount?: boolean;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
  })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({
    description: 'Number of items to skip',
    example: 0,
  })
  @IsOptional()
  offset?: number;
}
