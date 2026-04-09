import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsArray, ValidateNested, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';

export class EmailRecipientDto {
  @ApiProperty({ description: 'Email address' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'Display name' })
  @IsString()
  @IsOptional()
  name?: string;
}

export class AttachmentDto {
  @ApiProperty({ description: 'Filename' })
  @IsString()
  filename: string;

  @ApiProperty({ description: 'Base64 encoded content' })
  @IsString()
  content: string;

  @ApiProperty({ description: 'MIME type' })
  @IsString()
  mimeType: string;
}

export class SendEmailDto {
  @ApiProperty({ description: 'Recipient email addresses', type: [String] })
  @IsArray()
  @IsString({ each: true })
  to: string[];

  @ApiPropertyOptional({ description: 'CC recipients', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  cc?: string[];

  @ApiPropertyOptional({ description: 'BCC recipients', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  bcc?: string[];

  @ApiProperty({ description: 'Email subject' })
  @IsString()
  subject: string;

  @ApiProperty({ description: 'Email body content' })
  @IsString()
  body: string;

  @ApiPropertyOptional({ description: 'Whether body is HTML', default: true })
  @IsBoolean()
  @IsOptional()
  isHtml?: boolean;

  @ApiPropertyOptional({ description: 'Attachments', type: [AttachmentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  @IsOptional()
  attachments?: AttachmentDto[];
}

export class ReplyEmailDto {
  @ApiProperty({ description: 'Reply body content' })
  @IsString()
  body: string;

  @ApiPropertyOptional({ description: 'Whether body is HTML', default: true })
  @IsBoolean()
  @IsOptional()
  isHtml?: boolean;

  @ApiPropertyOptional({ description: 'Reply all (include all original recipients)', default: false })
  @IsBoolean()
  @IsOptional()
  replyAll?: boolean;

  @ApiPropertyOptional({ description: 'Attachments', type: [AttachmentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  @IsOptional()
  attachments?: AttachmentDto[];
}

export class ForwardEmailDto {
  @ApiProperty({ description: 'Recipient email addresses to forward to', type: [String] })
  @IsArray()
  @IsString({ each: true })
  to: string[];

  @ApiPropertyOptional({ description: 'CC recipients', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  cc?: string[];

  @ApiPropertyOptional({ description: 'Additional message to include' })
  @IsString()
  @IsOptional()
  message?: string;

  @ApiPropertyOptional({ description: 'Whether message is HTML', default: true })
  @IsBoolean()
  @IsOptional()
  isHtml?: boolean;
}

export class CreateDraftDto {
  @ApiPropertyOptional({ description: 'Recipient email addresses', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  to?: string[];

  @ApiPropertyOptional({ description: 'CC recipients', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  cc?: string[];

  @ApiPropertyOptional({ description: 'BCC recipients', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  bcc?: string[];

  @ApiPropertyOptional({ description: 'Email subject' })
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiPropertyOptional({ description: 'Email body content' })
  @IsString()
  @IsOptional()
  body?: string;

  @ApiPropertyOptional({ description: 'Whether body is HTML', default: true })
  @IsBoolean()
  @IsOptional()
  isHtml?: boolean;

  @ApiPropertyOptional({ description: 'Thread ID if replying' })
  @IsString()
  @IsOptional()
  threadId?: string;

  @ApiPropertyOptional({ description: 'Message ID if replying' })
  @IsString()
  @IsOptional()
  replyToMessageId?: string;
}

export class SendEmailResponseDto {
  @ApiProperty({ description: 'Sent message ID' })
  messageId: string;

  @ApiProperty({ description: 'Thread ID' })
  threadId: string;

  @ApiProperty({ description: 'Labels applied to sent message' })
  labelIds: string[];
}

export class DraftResponseDto {
  @ApiProperty({ description: 'Draft ID' })
  draftId: string;

  @ApiProperty({ description: 'Message ID' })
  messageId: string;

  @ApiPropertyOptional({ description: 'Thread ID' })
  threadId?: string;
}
