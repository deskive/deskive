import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsOptional,
  IsArray,
  IsNumber,
  IsEmail,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ==================== Provider Types ====================

export enum EmailProvider {
  GMAIL = 'gmail',
  SMTP_IMAP = 'smtp_imap',
}

// ==================== Connection DTOs ====================

export class EmailConnectionDto {
  @ApiProperty({ description: 'Connection ID' })
  id: string;

  @ApiProperty({ description: 'Workspace ID' })
  workspaceId: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Email provider', enum: EmailProvider, example: 'gmail' })
  provider: EmailProvider;

  @ApiProperty({ description: 'Connected email address' })
  emailAddress: string;

  @ApiPropertyOptional({ description: 'Display name' })
  displayName?: string;

  @ApiPropertyOptional({ description: 'Profile picture URL' })
  profilePicture?: string;

  @ApiProperty({ description: 'Whether connection is active' })
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Last sync timestamp' })
  lastSyncedAt?: string;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: string;
}

export class NativeConnectGmailDto {
  @ApiProperty({ description: 'Server auth code from native Google Sign-In' })
  @IsString()
  serverAuthCode: string;

  @ApiPropertyOptional({ description: 'User email from Google Sign-In' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'User display name from Google Sign-In' })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiPropertyOptional({ description: 'User photo URL from Google Sign-In' })
  @IsString()
  @IsOptional()
  photoUrl?: string;
}

// ==================== SMTP/IMAP Connection DTOs ====================

export class SmtpConfigDto {
  @ApiProperty({ description: 'SMTP server host', example: 'smtp.gmail.com' })
  @IsString()
  host: string;

  @ApiProperty({ description: 'SMTP server port', example: 587 })
  @IsNumber()
  port: number;

  @ApiProperty({ description: 'Use SSL/TLS', default: true })
  @IsBoolean()
  @IsOptional()
  secure?: boolean;

  @ApiProperty({ description: 'SMTP username/email' })
  @IsString()
  user: string;

  @ApiProperty({ description: 'SMTP password or app password' })
  @IsString()
  password: string;
}

export class ImapConfigDto {
  @ApiProperty({ description: 'IMAP server host', example: 'imap.gmail.com' })
  @IsString()
  host: string;

  @ApiProperty({ description: 'IMAP server port', example: 993 })
  @IsNumber()
  port: number;

  @ApiProperty({ description: 'Use SSL/TLS', default: true })
  @IsBoolean()
  @IsOptional()
  secure?: boolean;

  @ApiProperty({ description: 'IMAP username/email' })
  @IsString()
  user: string;

  @ApiProperty({ description: 'IMAP password or app password' })
  @IsString()
  password: string;
}

export class ConnectSmtpImapDto {
  @ApiProperty({ description: 'Email address for this connection' })
  @IsEmail()
  emailAddress: string;

  @ApiPropertyOptional({ description: 'Display name for outgoing emails' })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiProperty({ description: 'SMTP configuration for sending emails', type: SmtpConfigDto })
  @ValidateNested()
  @Type(() => SmtpConfigDto)
  smtp: SmtpConfigDto;

  @ApiProperty({ description: 'IMAP configuration for receiving emails', type: ImapConfigDto })
  @ValidateNested()
  @Type(() => ImapConfigDto)
  imap: ImapConfigDto;
}

export class TestSmtpImapConnectionDto {
  @ApiProperty({ description: 'SMTP configuration to test', type: SmtpConfigDto })
  @ValidateNested()
  @Type(() => SmtpConfigDto)
  smtp: SmtpConfigDto;

  @ApiProperty({ description: 'IMAP configuration to test', type: ImapConfigDto })
  @ValidateNested()
  @Type(() => ImapConfigDto)
  imap: ImapConfigDto;
}

export class TestConnectionResultDto {
  @ApiProperty({ description: 'Overall success status' })
  success: boolean;

  @ApiProperty({ description: 'SMTP connection result' })
  smtp: {
    success: boolean;
    message: string;
  };

  @ApiProperty({ description: 'IMAP connection result' })
  imap: {
    success: boolean;
    message: string;
  };
}

// ==================== Email DTOs ====================

export class EmailAttachmentDto {
  @ApiProperty({ description: 'Attachment ID' })
  attachmentId: string;

  @ApiProperty({ description: 'Filename' })
  filename: string;

  @ApiProperty({ description: 'MIME type' })
  mimeType: string;

  @ApiProperty({ description: 'Size in bytes' })
  size: number;
}

export class EmailAddressDto {
  @ApiProperty({ description: 'Email address' })
  email: string;

  @ApiPropertyOptional({ description: 'Display name' })
  name?: string;
}

export class EmailDto {
  @ApiProperty({ description: 'Email message ID' })
  id: string;

  @ApiProperty({ description: 'Thread ID' })
  threadId: string;

  @ApiProperty({ description: 'Email labels/folders' })
  labelIds: string[];

  @ApiProperty({ description: 'Email snippet/preview' })
  snippet: string;

  @ApiPropertyOptional({ description: 'Sender information' })
  from?: EmailAddressDto;

  @ApiPropertyOptional({ description: 'Recipients' })
  to?: EmailAddressDto[];

  @ApiPropertyOptional({ description: 'CC recipients' })
  cc?: EmailAddressDto[];

  @ApiPropertyOptional({ description: 'BCC recipients' })
  bcc?: EmailAddressDto[];

  @ApiPropertyOptional({ description: 'Email subject' })
  subject?: string;

  @ApiPropertyOptional({ description: 'Email body (plain text)' })
  bodyText?: string;

  @ApiPropertyOptional({ description: 'Email body (HTML)' })
  bodyHtml?: string;

  @ApiPropertyOptional({ description: 'Email date' })
  date?: string;

  @ApiProperty({ description: 'Internal date timestamp' })
  internalDate: string;

  @ApiProperty({ description: 'Is email read' })
  isRead: boolean;

  @ApiProperty({ description: 'Is email starred' })
  isStarred: boolean;

  @ApiPropertyOptional({ description: 'Attachments' })
  attachments?: EmailAttachmentDto[];
}

export class EmailListItemDto {
  @ApiProperty({ description: 'Email message ID' })
  id: string;

  @ApiProperty({ description: 'Thread ID' })
  threadId: string;

  @ApiProperty({ description: 'Email labels/folders' })
  labelIds: string[];

  @ApiProperty({ description: 'Email snippet/preview' })
  snippet: string;

  @ApiPropertyOptional({ description: 'Sender information' })
  from?: EmailAddressDto;

  @ApiPropertyOptional({ description: 'Email subject' })
  subject?: string;

  @ApiPropertyOptional({ description: 'Email date' })
  date?: string;

  @ApiProperty({ description: 'Is email read' })
  isRead: boolean;

  @ApiProperty({ description: 'Is email starred' })
  isStarred: boolean;

  @ApiProperty({ description: 'Has attachments' })
  hasAttachments: boolean;
}

export class EmailListResponseDto {
  @ApiProperty({ description: 'List of emails', type: [EmailListItemDto] })
  emails: EmailListItemDto[];

  @ApiPropertyOptional({ description: 'Next page token for pagination' })
  nextPageToken?: string;

  @ApiPropertyOptional({ description: 'Estimated total results' })
  resultSizeEstimate?: number;
}

// ==================== Label DTOs ====================

export class LabelDto {
  @ApiProperty({ description: 'Label ID' })
  id: string;

  @ApiProperty({ description: 'Label name' })
  name: string;

  @ApiPropertyOptional({ description: 'Label type (system or user)' })
  type?: string;

  @ApiPropertyOptional({ description: 'Total messages in label' })
  messagesTotal?: number;

  @ApiPropertyOptional({ description: 'Unread messages in label' })
  messagesUnread?: number;

  @ApiPropertyOptional({ description: 'Label color' })
  color?: {
    textColor: string;
    backgroundColor: string;
  };
}

// ==================== Query DTOs ====================

export class ListEmailsQueryDto {
  @ApiPropertyOptional({ description: 'Label/folder ID', example: 'INBOX' })
  @IsString()
  @IsOptional()
  labelId?: string;

  @ApiPropertyOptional({ description: 'Search query' })
  @IsString()
  @IsOptional()
  query?: string;

  @ApiPropertyOptional({ description: 'Page token for pagination' })
  @IsString()
  @IsOptional()
  pageToken?: string;

  @ApiPropertyOptional({ description: 'Max results per page', default: 20 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  maxResults?: number;

  @ApiPropertyOptional({ description: 'Connection ID for specific SMTP/IMAP account' })
  @IsString()
  @IsOptional()
  connectionId?: string;
}

export class UpdateLabelsDto {
  @ApiPropertyOptional({ description: 'Label IDs to add' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  addLabelIds?: string[];

  @ApiPropertyOptional({ description: 'Label IDs to remove' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  removeLabelIds?: string[];
}

export class CreateLabelDto {
  @ApiProperty({ description: 'Label name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Label color' })
  @IsOptional()
  color?: {
    textColor: string;
    backgroundColor: string;
  };
}

// ==================== Email Priority DTOs ====================

export class EmailPriorityItemDto {
  @ApiProperty({ description: 'Email ID' })
  @IsString()
  id: string;

  @ApiPropertyOptional({ description: 'Sender information' })
  @IsOptional()
  from?: EmailAddressDto;

  @ApiPropertyOptional({ description: 'Email subject' })
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiProperty({ description: 'Email snippet/preview' })
  @IsString()
  snippet: string;

  @ApiPropertyOptional({ description: 'Email date' })
  @IsString()
  @IsOptional()
  date?: string;

  @ApiProperty({ description: 'Is email read' })
  @IsBoolean()
  isRead: boolean;

  @ApiProperty({ description: 'Has attachments' })
  @IsBoolean()
  hasAttachments: boolean;
}

export class AnalyzeEmailPriorityDto {
  @ApiProperty({ description: 'List of emails to analyze', type: [EmailPriorityItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmailPriorityItemDto)
  emails: EmailPriorityItemDto[];

  @ApiPropertyOptional({ description: 'Email connection ID for storage' })
  @IsString()
  @IsOptional()
  connectionId?: string;
}

export class GetStoredPrioritiesDto {
  @ApiProperty({ description: 'List of email IDs to get priorities for', type: [String] })
  @IsArray()
  @IsString({ each: true })
  emailIds: string[];
}

export enum EmailPriorityLevel {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  NONE = 'none',
}

export class EmailPriorityDto {
  @ApiProperty({ description: 'Priority level', enum: EmailPriorityLevel })
  level: EmailPriorityLevel;

  @ApiProperty({ description: 'Priority score (0-10)' })
  score: number;

  @ApiProperty({ description: 'Reason for priority' })
  reason: string;

  @ApiProperty({ description: 'Factors that influenced priority', type: [String] })
  factors: string[];
}

export class EmailPriorityResultDto {
  @ApiProperty({ description: 'Email ID' })
  emailId: string;

  @ApiProperty({ description: 'Priority information', type: EmailPriorityDto })
  priority: EmailPriorityDto;
}

export class AnalyzeEmailPriorityResponseDto {
  @ApiProperty({ description: 'Priority results for each email', type: [EmailPriorityResultDto] })
  priorities: EmailPriorityResultDto[];
}

// ==================== Travel Ticket Extraction DTOs ====================

export enum TravelType {
  FLIGHT = 'flight',
  TRAIN = 'train',
  BUS = 'bus',
  OTHER = 'other',
}

export class TravelTicketInfoDto {
  @ApiProperty({ description: 'Type of travel', enum: TravelType })
  travelType: TravelType;

  @ApiProperty({ description: 'Whether ticket information was found' })
  found: boolean;

  @ApiPropertyOptional({ description: 'Booking/PNR reference number' })
  bookingReference?: string;

  @ApiPropertyOptional({ description: 'Passenger name' })
  passengerName?: string;

  @ApiPropertyOptional({ description: 'Departure location/station/airport' })
  departureLocation?: string;

  @ApiPropertyOptional({ description: 'Arrival location/station/airport' })
  arrivalLocation?: string;

  @ApiPropertyOptional({ description: 'Departure date and time (ISO format)' })
  departureDateTime?: string;

  @ApiPropertyOptional({ description: 'Arrival date and time (ISO format)' })
  arrivalDateTime?: string;

  @ApiPropertyOptional({ description: 'Flight/Train/Bus number' })
  vehicleNumber?: string;

  @ApiPropertyOptional({ description: 'Seat number or class' })
  seatInfo?: string;

  @ApiPropertyOptional({ description: 'Carrier/Airline/Operator name' })
  carrier?: string;

  @ApiPropertyOptional({ description: 'Additional notes or details' })
  notes?: string;

  @ApiPropertyOptional({
    description: 'Timezone offset of departure location (e.g., +01:00 for Madrid)',
  })
  departureTimezone?: string;
}

export class ExtractTravelInfoDto {
  @ApiProperty({ description: 'Email subject' })
  @IsString()
  subject: string;

  @ApiProperty({ description: 'Email body (HTML or plain text)' })
  @IsString()
  body: string;

  @ApiPropertyOptional({ description: 'Sender email address' })
  @IsString()
  @IsOptional()
  senderEmail?: string;

  @ApiPropertyOptional({ description: 'Email message ID (for fetching attachments)' })
  @IsString()
  @IsOptional()
  messageId?: string;

  @ApiPropertyOptional({ description: 'PDF attachment ID to extract text from' })
  @IsString()
  @IsOptional()
  attachmentId?: string;

  @ApiPropertyOptional({ description: 'Email provider (gmail or smtp_imap)' })
  @IsString()
  @IsOptional()
  provider?: string;

  @ApiPropertyOptional({ description: 'Connection ID for the email account' })
  @IsString()
  @IsOptional()
  connectionId?: string;

  @ApiPropertyOptional({ description: 'Mailbox/folder for IMAP' })
  @IsString()
  @IsOptional()
  mailbox?: string;
}

export class ExtractTravelInfoResponseDto {
  @ApiProperty({ description: 'Extracted travel ticket information' })
  ticketInfo: TravelTicketInfoDto;

  @ApiProperty({ description: 'Suggested event title' })
  suggestedTitle: string;

  @ApiProperty({ description: 'Suggested event description' })
  suggestedDescription: string;
}
