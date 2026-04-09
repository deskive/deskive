import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsDateString, IsIn, IsArray, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { AttachmentDto, LinkedContentDto } from './send-message.dto';

export enum ScheduledMessageStatus {
  PENDING = 'pending',
  SENT = 'sent',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

export class ScheduleMessageDto {
  @ApiProperty({ description: 'Message content', example: 'Hello everyone!' })
  @IsString()
  content: string;

  @ApiProperty({ description: 'HTML formatted content', required: false })
  @IsOptional()
  @IsString()
  contentHtml?: string;

  @ApiProperty({ description: 'Channel ID (for channel messages)', required: false })
  @IsOptional()
  @IsUUID()
  channelId?: string;

  @ApiProperty({ description: 'Conversation ID (for direct messages)', required: false })
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @ApiProperty({ description: 'Thread ID if replying to a thread', required: false })
  @IsOptional()
  @IsUUID()
  threadId?: string;

  @ApiProperty({ description: 'Parent message ID if replying', required: false })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiProperty({
    description: 'File attachments with full metadata',
    type: [AttachmentDto],
    required: false
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @ApiProperty({ description: 'Mentioned user IDs', type: [String], required: false })
  @IsOptional()
  @IsArray()
  mentions?: string[];

  @ApiProperty({
    description: 'Linked content items (notes, events, files) attached to the message',
    type: [LinkedContentDto],
    required: false
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LinkedContentDto)
  linkedContent?: LinkedContentDto[];

  @ApiProperty({ description: 'Scheduled send time (ISO 8601 format)', example: '2024-12-25T10:00:00Z' })
  @IsDateString()
  scheduledAt: string;
}

export class UpdateScheduledMessageDto {
  @ApiProperty({ description: 'Message content', required: false })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ description: 'HTML formatted content', required: false })
  @IsOptional()
  @IsString()
  contentHtml?: string;

  @ApiProperty({ description: 'Scheduled send time (ISO 8601 format)', required: false })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiProperty({
    description: 'File attachments with full metadata',
    type: [AttachmentDto],
    required: false
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @ApiProperty({ description: 'Mentioned user IDs', type: [String], required: false })
  @IsOptional()
  @IsArray()
  mentions?: string[];

  @ApiProperty({
    description: 'Linked content items (notes, events, files) attached to the message',
    type: [LinkedContentDto],
    required: false
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LinkedContentDto)
  linkedContent?: LinkedContentDto[];
}

export class ScheduledMessageResponseDto {
  @ApiProperty({ description: 'Scheduled message ID' })
  id: string;

  @ApiProperty({ description: 'Workspace ID' })
  workspaceId: string;

  @ApiProperty({ description: 'Channel ID (null for DMs)' })
  channelId: string | null;

  @ApiProperty({ description: 'Conversation ID (null for channels)' })
  conversationId: string | null;

  @ApiProperty({ description: 'User who scheduled the message' })
  userId: string;

  @ApiProperty({ description: 'Message content' })
  content: string;

  @ApiProperty({ description: 'HTML formatted content' })
  contentHtml: string | null;

  @ApiProperty({ description: 'File attachments' })
  attachments: AttachmentDto[];

  @ApiProperty({ description: 'Mentioned user IDs' })
  mentions: string[];

  @ApiProperty({ description: 'Linked content items' })
  linkedContent: LinkedContentDto[];

  @ApiProperty({ description: 'Thread ID' })
  threadId: string | null;

  @ApiProperty({ description: 'Parent message ID' })
  parentId: string | null;

  @ApiProperty({ description: 'Scheduled send time' })
  scheduledAt: string;

  @ApiProperty({ description: 'Status', enum: ScheduledMessageStatus })
  status: ScheduledMessageStatus;

  @ApiProperty({ description: 'Time message was sent (if sent)' })
  sentAt: string | null;

  @ApiProperty({ description: 'ID of sent message (if sent)' })
  sentMessageId: string | null;

  @ApiProperty({ description: 'Failure reason (if failed)' })
  failureReason: string | null;

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'Updated at timestamp' })
  updatedAt: string;

  // Additional fields for UI display
  @ApiProperty({ description: 'Destination name (channel or user name)' })
  destinationName?: string;

  @ApiProperty({ description: 'Destination type (channel or conversation)' })
  destinationType?: 'channel' | 'conversation';
}

export class QueryScheduledMessagesDto {
  @ApiProperty({ description: 'Filter by status', required: false, enum: ScheduledMessageStatus })
  @IsOptional()
  @IsIn(['pending', 'sent', 'cancelled', 'failed'])
  status?: ScheduledMessageStatus;

  @ApiProperty({ description: 'Filter by channel ID', required: false })
  @IsOptional()
  @IsUUID()
  channelId?: string;

  @ApiProperty({ description: 'Filter by conversation ID', required: false })
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @ApiProperty({ description: 'Number of messages to fetch', required: false, default: 50 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiProperty({ description: 'Offset for pagination', required: false, default: 0 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(0)
  offset?: number;
}
