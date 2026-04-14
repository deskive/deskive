import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum EmailTone {
  PROFESSIONAL = 'professional',
  CASUAL = 'casual',
  FRIENDLY = 'friendly',
  FORMAL = 'formal',
  URGENT = 'urgent',
}

export class OriginalEmailDto {
  @ApiPropertyOptional({ description: 'Subject of the original email' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ description: 'Sender name' })
  @IsOptional()
  @IsString()
  senderName?: string;

  @ApiPropertyOptional({ description: 'Sender email address' })
  @IsOptional()
  @IsString()
  senderEmail?: string;

  @ApiPropertyOptional({ description: 'Body content of the original email (plain text)' })
  @IsOptional()
  @IsString()
  bodyText?: string;

  @ApiPropertyOptional({ description: 'Body content of the original email (HTML)' })
  @IsOptional()
  @IsString()
  bodyHtml?: string;
}

export class GenerateEmailSuggestionsDto {
  @ApiProperty({ description: 'Subject of the email to compose' })
  @IsString()
  subject: string;

  @ApiPropertyOptional({ description: 'Recipient email address or name' })
  @IsOptional()
  @IsString()
  recipient?: string;

  @ApiPropertyOptional({ description: 'Current draft content (if any)' })
  @IsOptional()
  @IsString()
  currentDraft?: string;

  @ApiPropertyOptional({
    description: 'Original email details (for replies)',
    type: OriginalEmailDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => OriginalEmailDto)
  replyTo?: OriginalEmailDto;

  @ApiPropertyOptional({
    description: 'Whether this is a reply to an existing email',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isReply?: boolean;

  @ApiPropertyOptional({
    description: 'Tone of the email',
    enum: EmailTone,
    default: EmailTone.PROFESSIONAL,
  })
  @IsOptional()
  @IsEnum(EmailTone)
  tone?: EmailTone;

  @ApiPropertyOptional({ description: 'Number of suggestions to generate (1-5)', default: 3 })
  @IsOptional()
  @IsNumber()
  count?: number;

  @ApiPropertyOptional({ description: 'Maximum tokens for generation', default: 600 })
  @IsOptional()
  @IsNumber()
  maxTokens?: number;
}

export class GenerateSmartRepliesDto {
  @ApiProperty({ description: 'Subject of the original email' })
  @IsString()
  subject: string;

  @ApiProperty({ description: 'Sender name or email' })
  @IsString()
  sender: string;

  @ApiProperty({ description: 'Body content of the original email' })
  @IsString()
  body: string;

  @ApiPropertyOptional({ description: 'Number of smart replies to generate (1-5)', default: 3 })
  @IsOptional()
  @IsNumber()
  count?: number;

  @ApiPropertyOptional({
    description: 'Tone of the replies',
    enum: EmailTone,
    default: EmailTone.PROFESSIONAL,
  })
  @IsOptional()
  @IsEnum(EmailTone)
  tone?: EmailTone;
}

export class EmailSuggestionResponseDto {
  @ApiProperty({ description: 'Array of email body suggestions', type: [String] })
  suggestions: string[];

  @ApiProperty({ description: 'Number of suggestions returned' })
  count: number;

  @ApiProperty({ description: 'Whether this was for a reply' })
  isReply: boolean;

  @ApiProperty({ description: 'Timestamp of generation' })
  timestamp: string;

  @ApiProperty({ description: 'Unique request ID' })
  requestId: string;

  @ApiPropertyOptional({ description: 'Token usage information' })
  usage?: {
    tokensUsed: number;
    processingTimeMs: number;
  };
}

export class SmartReplyResponseDto {
  @ApiProperty({ description: 'Array of short smart reply options', type: [String] })
  replies: string[];

  @ApiProperty({ description: 'Number of replies returned' })
  count: number;

  @ApiProperty({ description: 'Timestamp of generation' })
  timestamp: string;

  @ApiProperty({ description: 'Unique request ID' })
  requestId: string;

  @ApiPropertyOptional({ description: 'Token usage information' })
  usage?: {
    tokensUsed: number;
    processingTimeMs: number;
  };
}
