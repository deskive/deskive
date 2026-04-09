import { IsString, IsOptional, IsBoolean, IsEnum, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FeedbackStatus } from './update-feedback.dto';

export class CreateFeedbackResponseDto {
  @ApiProperty({
    description: 'Response content',
    example: 'Thank you for reporting this issue. We are investigating and will update you soon.',
    minLength: 5,
  })
  @IsString()
  @MinLength(5)
  content: string;

  @ApiPropertyOptional({
    description: 'Whether this is an internal note (not visible to user)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;

  @ApiPropertyOptional({
    description: 'Status change associated with this response',
    enum: FeedbackStatus,
  })
  @IsOptional()
  @IsEnum(FeedbackStatus)
  statusChange?: FeedbackStatus;
}

export class FeedbackResponseDto {
  id: string;
  feedbackId: string;
  userId: string;
  content: string;
  isInternal: boolean;
  statusChange?: string;
  createdAt: string;
}

export class FeedbackDto {
  id: string;
  userId: string;
  type: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category?: string;
  attachments: Array<{
    url: string;
    name: string;
    type: string;
    size: number;
  }>;
  appVersion?: string;
  deviceInfo: Record<string, any>;
  resolutionNotes?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  notifiedAt?: string;
  assignedTo?: string;
  duplicateOfId?: string;
  createdAt: string;
  updatedAt: string;
}

export class PaginatedFeedbackDto {
  data: FeedbackDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
