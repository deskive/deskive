import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsArray, ValidateNested, IsIn, IsBoolean, IsNumber, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class AttachmentDto {
  @ApiProperty({ description: 'File ID from storage', example: 'uuid-here' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'File name', example: 'document.pdf' })
  @IsString()
  fileName: string;

  @ApiProperty({ description: 'File URL', example: 'https://storage.example.com/files/abc123' })
  @IsString()
  url: string;

  @ApiProperty({ description: 'File MIME type', example: 'application/pdf' })
  @IsString()
  mimeType: string;

  @ApiProperty({ description: 'File size in bytes', example: 1024000 })
  @IsString()
  fileSize: string;
}

// Poll option structure
export class PollOptionDto {
  @ApiProperty({ description: 'Option ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Option text' })
  @IsString()
  text: string;

  @ApiProperty({ description: 'Vote count', default: 0 })
  @IsOptional()
  @IsNumber()
  voteCount?: number;
}

// Poll structure for linked content
export class PollDto {
  @ApiProperty({ description: 'Poll ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Poll question' })
  @IsString()
  question: string;

  @ApiProperty({ description: 'Poll options', type: [PollOptionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PollOptionDto)
  options: PollOptionDto[];

  @ApiProperty({ description: 'Whether poll is still open for voting', default: true })
  @IsBoolean()
  isOpen: boolean;

  @ApiProperty({ description: 'Whether to show results before voting' })
  @IsBoolean()
  showResultsBeforeVoting: boolean;

  @ApiProperty({ description: 'User ID who created the poll' })
  @IsString()
  createdBy: string;

  @ApiProperty({ description: 'Total votes count', default: 0 })
  @IsOptional()
  @IsNumber()
  totalVotes?: number;
}

export class LinkedContentDto {
  @ApiProperty({ description: 'Content ID', example: 'uuid-here' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Content title', example: 'Meeting Notes' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Content type', enum: ['notes', 'events', 'files', 'drive', 'poll'], example: 'notes' })
  @IsString()
  @IsIn(['notes', 'events', 'files', 'drive', 'poll'])
  type: 'notes' | 'events' | 'files' | 'drive' | 'poll';

  @ApiProperty({ description: 'Optional subtitle/description', required: false })
  @IsOptional()
  @IsString()
  subtitle?: string;

  // Google Drive specific fields
  @ApiProperty({ description: 'Google Drive file URL', required: false })
  @IsOptional()
  @IsString()
  driveFileUrl?: string;

  @ApiProperty({ description: 'Google Drive thumbnail URL', required: false })
  @IsOptional()
  @IsString()
  driveThumbnailUrl?: string;

  @ApiProperty({ description: 'Google Drive file MIME type', required: false })
  @IsOptional()
  @IsString()
  driveMimeType?: string;

  @ApiProperty({ description: 'Google Drive file size in bytes', required: false })
  @IsOptional()
  driveFileSize?: number;

  // Poll specific fields
  @ApiProperty({ description: 'Poll data (when type is poll)', required: false, type: PollDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PollDto)
  poll?: PollDto;
}

export class SendMessageDto {
  @ApiProperty({ description: 'Message content (plaintext or empty if encrypted)', example: 'Hello everyone!' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ description: 'HTML formatted content', required: false })
  @IsOptional()
  @IsString()
  content_html?: string;

  // E2EE fields
  @ApiProperty({ description: 'Encrypted message content (base64)', required: false })
  @IsOptional()
  @IsString()
  encrypted_content?: string;

  @ApiProperty({
    description: 'Encryption metadata (algorithm, nonce, version)',
    required: false,
    example: { algorithm: 'x25519-xsalsa20-poly1305', version: '1.0', nonce: 'base64...', conversationId: 'uuid' }
  })
  @IsOptional()
  @IsObject()
  encryption_metadata?: {
    algorithm: string;
    version: string;
    nonce: string;
    conversationId: string;
  };

  @ApiProperty({ description: 'Whether message is end-to-end encrypted', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  is_encrypted?: boolean;

  @ApiProperty({ description: 'Thread ID if replying to a thread', required: false })
  @IsOptional()
  @IsUUID()
  thread_id?: string;

  @ApiProperty({ description: 'Parent message ID if replying', required: false })
  @IsOptional()
  @IsUUID()
  parent_id?: string;

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
  linked_content?: LinkedContentDto[];
}