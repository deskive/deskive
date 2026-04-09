import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsObject,
  IsEmail,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ==================== ENUMS ====================

export enum DocumentStatus {
  DRAFT = 'draft',
  PENDING_SIGNATURE = 'pending_signature',
  PARTIALLY_SIGNED = 'partially_signed',
  SIGNED = 'signed',
  EXPIRED = 'expired',
  DECLINED = 'declined',
  ARCHIVED = 'archived',
}

export enum DocumentType {
  PROPOSAL = 'proposal',
  CONTRACT = 'contract',
  INVOICE = 'invoice',
  SOW = 'sow',
}

export enum RecipientRole {
  SIGNER = 'signer',
  VIEWER = 'viewer',
  APPROVER = 'approver',
  CC = 'cc',
}

export enum RecipientStatus {
  PENDING = 'pending',
  VIEWED = 'viewed',
  SIGNED = 'signed',
  DECLINED = 'declined',
  EXPIRED = 'expired',
}

export enum SignatureType {
  DRAWN = 'drawn',
  TYPED = 'typed',
  UPLOADED = 'uploaded',
}

// ==================== REQUEST DTOs ====================

export class CreateDocumentDto {
  @ApiProperty({ description: 'Template ID to create from', required: false })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiProperty({ description: 'Document title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Document description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Document type',
    enum: DocumentType,
  })
  @IsEnum(DocumentType)
  documentType: DocumentType;

  @ApiProperty({ description: 'Document content in Quill Delta format' })
  @IsObject()
  content: Record<string, any>;

  @ApiProperty({ description: 'HTML content', required: false })
  @IsOptional()
  @IsString()
  contentHtml?: string;

  @ApiProperty({ description: 'Filled placeholder values', required: false })
  @IsOptional()
  @IsObject()
  placeholderValues?: Record<string, any>;

  @ApiProperty({ description: 'Document expiration date', required: false })
  @IsOptional()
  @IsString()
  expiresAt?: string;

  @ApiProperty({ description: 'Additional settings', required: false })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateDocumentDto {
  @ApiProperty({ description: 'Document title', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'Document description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Document content in Quill Delta format', required: false })
  @IsOptional()
  @IsObject()
  content?: Record<string, any>;

  @ApiProperty({ description: 'HTML content', required: false })
  @IsOptional()
  @IsString()
  contentHtml?: string;

  @ApiProperty({ description: 'Filled placeholder values', required: false })
  @IsOptional()
  @IsObject()
  placeholderValues?: Record<string, any>;

  @ApiProperty({ description: 'Document expiration date', required: false })
  @IsOptional()
  @IsString()
  expiresAt?: string;

  @ApiProperty({ description: 'Additional settings', required: false })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class AddRecipientDto {
  @ApiProperty({ description: 'Recipient email' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Recipient name' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Recipient role',
    enum: RecipientRole,
    default: RecipientRole.SIGNER,
  })
  @IsOptional()
  @IsEnum(RecipientRole)
  role?: RecipientRole;

  @ApiProperty({ description: 'Signing order (for sequential signing)', required: false })
  @IsOptional()
  @IsNumber()
  order?: number;

  @ApiProperty({ description: 'Personal message to recipient', required: false })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiProperty({ description: 'Access code for extra security', required: false })
  @IsOptional()
  @IsString()
  accessCode?: string;
}

export class UpdateRecipientDto {
  @ApiProperty({ description: 'Recipient name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Recipient role',
    enum: RecipientRole,
    required: false,
  })
  @IsOptional()
  @IsEnum(RecipientRole)
  role?: RecipientRole;

  @ApiProperty({ description: 'Signing order', required: false })
  @IsOptional()
  @IsNumber()
  order?: number;

  @ApiProperty({ description: 'Personal message', required: false })
  @IsOptional()
  @IsString()
  message?: string;
}

export class SignDocumentDto {
  @ApiProperty({ description: 'Signature field ID' })
  @IsString()
  signatureFieldId: string;

  @ApiProperty({
    description: 'Signature type',
    enum: SignatureType,
  })
  @IsEnum(SignatureType)
  signatureType: SignatureType;

  @ApiProperty({ description: 'Signature data (base64 for drawn, text for typed)' })
  @IsString()
  signatureData: string;

  @ApiProperty({ description: 'Typed name (if typed signature)', required: false })
  @IsOptional()
  @IsString()
  typedName?: string;

  @ApiProperty({ description: 'Font family (if typed signature)', required: false })
  @IsOptional()
  @IsString()
  fontFamily?: string;
}

export class DeclineDocumentDto {
  @ApiProperty({ description: 'Reason for declining' })
  @IsString()
  reason: string;
}

export class SendDocumentDto {
  @ApiProperty({ description: 'Custom email subject', required: false })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({ description: 'Custom email message', required: false })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiProperty({ description: 'Send reminder after N days', required: false })
  @IsOptional()
  @IsNumber()
  reminderDays?: number;
}

export class DocumentQueryDto {
  @ApiProperty({
    description: 'Filter by document type',
    enum: DocumentType,
    required: false,
  })
  @IsOptional()
  @IsEnum(DocumentType)
  documentType?: DocumentType;

  @ApiProperty({
    description: 'Filter by status',
    enum: DocumentStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @ApiProperty({ description: 'Search query', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ description: 'Page number', required: false, default: 1 })
  @IsOptional()
  page?: number;

  @ApiProperty({ description: 'Items per page', required: false, default: 20 })
  @IsOptional()
  limit?: number;
}

// ==================== SIGNATURE POSITION DTOs ====================

export class SignaturePositionDto {
  @ApiProperty({ description: 'X position as percentage (0-1)' })
  @IsNumber()
  xPercent: number;

  @ApiProperty({ description: 'Y position as percentage (0-1)' })
  @IsNumber()
  yPercent: number;

  @ApiProperty({ description: 'Scale factor (default 1.0)', default: 1.0 })
  @IsOptional()
  @IsNumber()
  scale?: number;

  @ApiProperty({ description: 'Absolute pixel position from top', required: false })
  @IsOptional()
  @IsNumber()
  topPx?: number;

  @ApiProperty({ description: 'Document height used for positioning', required: false })
  @IsOptional()
  @IsNumber()
  documentHeight?: number;
}

export class EmbedSignatureDto {
  @ApiProperty({ description: 'Signature ID to embed' })
  @IsString()
  signatureId: string;

  @ApiProperty({ description: 'Position of signature on document' })
  @ValidateNested()
  @Type(() => SignaturePositionDto)
  position: SignaturePositionDto;
}
