import { IsString, IsOptional, IsBoolean, IsEmail, IsArray, ValidateNested, IsDateString, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ==================== Connection DTOs ====================

export class SendGridConnectDto {
  @ApiProperty({ description: 'SendGrid API key' })
  @IsString()
  apiKey: string;

  @ApiProperty({ description: 'Default sender email address' })
  @IsEmail()
  senderEmail: string;

  @ApiPropertyOptional({ description: 'Default sender name' })
  @IsOptional()
  @IsString()
  senderName?: string;
}

export class SendGridConnectionDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  workspaceId: string;

  @ApiProperty({ description: 'User ID who owns this connection' })
  userId: string;

  @ApiProperty({ description: 'Default sender email address' })
  senderEmail: string;

  @ApiPropertyOptional({ description: 'Default sender name' })
  senderName?: string;

  @ApiProperty({ description: 'Whether the connection is active' })
  isActive: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiPropertyOptional()
  updatedAt?: string;
}

// ==================== Email DTOs ====================

export class EmailRecipientDto {
  @ApiProperty({ description: 'Recipient email address' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'Recipient name' })
  @IsOptional()
  @IsString()
  name?: string;
}

export class EmailAttachmentDto {
  @ApiProperty({ description: 'Base64 encoded file content' })
  @IsString()
  content: string;

  @ApiProperty({ description: 'File name' })
  @IsString()
  filename: string;

  @ApiPropertyOptional({ description: 'MIME type' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'Content disposition (inline or attachment)' })
  @IsOptional()
  @IsString()
  disposition?: 'inline' | 'attachment';
}

export class SendGridSendEmailDto {
  @ApiProperty({ description: 'List of recipients', type: [EmailRecipientDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmailRecipientDto)
  to: EmailRecipientDto[];

  @ApiProperty({ description: 'Email subject' })
  @IsString()
  subject: string;

  @ApiPropertyOptional({ description: 'Plain text content' })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional({ description: 'HTML content' })
  @IsOptional()
  @IsString()
  html?: string;

  @ApiPropertyOptional({ description: 'Override sender email' })
  @IsOptional()
  @IsEmail()
  fromEmail?: string;

  @ApiPropertyOptional({ description: 'Override sender name' })
  @IsOptional()
  @IsString()
  fromName?: string;

  @ApiPropertyOptional({ description: 'Reply-to email address' })
  @IsOptional()
  @IsEmail()
  replyTo?: string;

  @ApiPropertyOptional({ description: 'CC recipients', type: [EmailRecipientDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmailRecipientDto)
  cc?: EmailRecipientDto[];

  @ApiPropertyOptional({ description: 'BCC recipients', type: [EmailRecipientDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmailRecipientDto)
  bcc?: EmailRecipientDto[];

  @ApiPropertyOptional({ description: 'File attachments', type: [EmailAttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmailAttachmentDto)
  attachments?: EmailAttachmentDto[];

  @ApiPropertyOptional({ description: 'SendGrid template ID' })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional({ description: 'Dynamic template data' })
  @IsOptional()
  dynamicTemplateData?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Categories for email tracking' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({ description: 'Schedule send time (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  sendAt?: string;
}

export class SendEmailResponseDto {
  @ApiProperty({ description: 'Whether the email was sent successfully' })
  success: boolean;

  @ApiPropertyOptional({ description: 'SendGrid message ID' })
  messageId?: string;

  @ApiPropertyOptional({ description: 'Error message if failed' })
  error?: string;
}

// ==================== Template DTOs ====================

export class SendGridTemplateDto {
  @ApiProperty({ description: 'Template ID' })
  id: string;

  @ApiProperty({ description: 'Template name' })
  name: string;

  @ApiPropertyOptional({ description: 'Template generation (legacy or dynamic)' })
  generation?: string;

  @ApiPropertyOptional({ description: 'Template updated date' })
  updatedAt?: string;

  @ApiPropertyOptional({ description: 'Active version ID' })
  activeVersionId?: string;

  @ApiPropertyOptional({ description: 'Template versions' })
  versions?: SendGridTemplateVersionDto[];
}

export class SendGridTemplateVersionDto {
  @ApiProperty({ description: 'Version ID' })
  id: string;

  @ApiPropertyOptional({ description: 'Version name' })
  name?: string;

  @ApiPropertyOptional({ description: 'Subject line' })
  subject?: string;

  @ApiPropertyOptional({ description: 'Is active version' })
  active?: boolean;

  @ApiPropertyOptional({ description: 'Updated date' })
  updatedAt?: string;
}

export class ListTemplatesResponseDto {
  @ApiProperty({ type: [SendGridTemplateDto] })
  templates: SendGridTemplateDto[];

  @ApiPropertyOptional({ description: 'Pagination metadata' })
  metadata?: {
    count: number;
  };
}

export class ListTemplatesQueryDto {
  @ApiPropertyOptional({ description: 'Template generations to include (legacy, dynamic)', default: 'dynamic' })
  @IsOptional()
  @IsString()
  generations?: string;

  @ApiPropertyOptional({ description: 'Number of templates per page', default: 50 })
  @IsOptional()
  @IsNumber()
  pageSize?: number;

  @ApiPropertyOptional({ description: 'Page token for pagination' })
  @IsOptional()
  @IsString()
  pageToken?: string;
}

// ==================== Stats DTOs ====================

export class EmailStatsDto {
  @ApiProperty({ description: 'Date for the stats' })
  date: string;

  @ApiProperty({ description: 'Number of requests sent' })
  requests: number;

  @ApiProperty({ description: 'Number of emails delivered' })
  delivered: number;

  @ApiProperty({ description: 'Number of emails opened' })
  opens: number;

  @ApiProperty({ description: 'Unique opens count' })
  uniqueOpens: number;

  @ApiProperty({ description: 'Number of clicks' })
  clicks: number;

  @ApiProperty({ description: 'Unique clicks count' })
  uniqueClicks: number;

  @ApiProperty({ description: 'Number of bounces' })
  bounces: number;

  @ApiProperty({ description: 'Number of blocks' })
  blocks: number;

  @ApiProperty({ description: 'Number of spam reports' })
  spamReports: number;

  @ApiProperty({ description: 'Number of unsubscribes' })
  unsubscribes: number;
}

export class GetStatsQueryDto {
  @ApiProperty({ description: 'Start date (YYYY-MM-DD)' })
  @IsString()
  startDate: string;

  @ApiPropertyOptional({ description: 'End date (YYYY-MM-DD)', default: 'today' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Aggregation by day, week, or month', default: 'day' })
  @IsOptional()
  @IsString()
  aggregatedBy?: 'day' | 'week' | 'month';
}

export class GetStatsResponseDto {
  @ApiProperty({ type: [EmailStatsDto] })
  stats: EmailStatsDto[];
}

// ==================== Validation DTOs ====================

export class ValidateApiKeyResponseDto {
  @ApiProperty({ description: 'Whether the API key is valid' })
  valid: boolean;

  @ApiPropertyOptional({ description: 'Scopes associated with the API key' })
  scopes?: string[];

  @ApiPropertyOptional({ description: 'Error message if invalid' })
  error?: string;
}

// ==================== Bulk Email DTOs ====================

export class BulkEmailRecipientDto {
  @ApiProperty({ description: 'Recipient email address' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'Dynamic template data for this recipient' })
  @IsOptional()
  templateData?: Record<string, any>;
}

export class SendBulkEmailDto {
  @ApiProperty({ description: 'List of recipients with optional template data', type: [BulkEmailRecipientDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkEmailRecipientDto)
  recipients: BulkEmailRecipientDto[];

  @ApiProperty({ description: 'SendGrid template ID' })
  @IsString()
  templateId: string;

  @ApiPropertyOptional({ description: 'Global dynamic template data applied to all recipients' })
  @IsOptional()
  globalData?: Record<string, any>;
}

export class BulkEmailResponseDto {
  @ApiPropertyOptional({ description: 'Job ID for tracking' })
  jobId?: string;

  @ApiProperty({ description: 'Status of the bulk email operation' })
  status: string;

  @ApiProperty({ description: 'Total number of recipients' })
  totalRecipients: number;

  @ApiPropertyOptional({ description: 'Number of successfully sent emails' })
  successCount?: number;

  @ApiPropertyOptional({ description: 'Number of failed emails' })
  failureCount?: number;
}
