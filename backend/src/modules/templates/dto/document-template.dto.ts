import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ==================== ENUMS ====================

export enum DocumentType {
  PROPOSAL = 'proposal',
  CONTRACT = 'contract',
  INVOICE = 'invoice',
  SOW = 'sow',
  LETTER = 'letter',
  FORM = 'form',
  REPORT = 'report',
  POLICY = 'policy',
  AGREEMENT = 'agreement',
  PLAN = 'plan',
  CHECKLIST = 'checklist',
  MEMO = 'memo',
  CERTIFICATE = 'certificate',
  RECEIPT = 'receipt',
  BRIEF = 'brief',
  MANUAL = 'manual',
  GUIDE = 'guide',
  TEMPLATE = 'template',
  RECORD = 'record',
  LOG = 'log',
}

export enum DocumentTemplateCategory {
  SALES = 'sales',
  LEGAL = 'legal',
  FREELANCE = 'freelance',
  CONSULTING = 'consulting',
  GENERAL = 'general',
  BUSINESS = 'business',
  HR = 'hr',
  FINANCE = 'finance',
  PROJECT = 'project',
  REALESTATE = 'realestate',
  HEALTHCARE = 'healthcare',
  EDUCATION = 'education',
  TECHNICAL = 'technical',
  EVENTS = 'events',
  NONPROFIT = 'nonprofit',
  PERSONAL = 'personal',
  MANUFACTURING = 'manufacturing',
  COMPLIANCE = 'compliance',
  CONSTRUCTION = 'construction',
  HOSPITALITY = 'hospitality',
  AUTOMOTIVE = 'automotive',
  AGRICULTURE = 'agriculture',
  ECOMMERCE = 'ecommerce',
  MEDIA = 'media',
  INSURANCE = 'insurance',
  GOVERNMENT = 'government',
  TELECOM = 'telecom',
  UTILITIES = 'utilities',
  SPORTS = 'sports',
  CHILDCARE = 'childcare',
  VETERINARY = 'veterinary',
  BEAUTY = 'beauty',
  RELIGIOUS = 'religious',
  CREATIVE = 'creative',
}

// ==================== STRUCTURE DTOs ====================

export class TemplatePlaceholderDto {
  @ApiProperty({ description: 'Placeholder key (used in template)', example: 'client_name' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'Display label', example: 'Client Name' })
  @IsString()
  label: string;

  @ApiProperty({
    description: 'Placeholder type',
    example: 'text',
  })
  @IsString()
  type: 'text' | 'number' | 'date' | 'currency' | 'email' | 'textarea' | 'select';

  @ApiProperty({ description: 'Is this placeholder required', default: true })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiProperty({ description: 'Default value', required: false })
  @IsOptional()
  @IsString()
  defaultValue?: string;

  @ApiProperty({ description: 'Options for select type', type: [String], required: false })
  @IsOptional()
  @IsArray()
  options?: string[];

  @ApiProperty({ description: 'Help text/description', required: false })
  @IsOptional()
  @IsString()
  helpText?: string;
}

export class SignatureFieldDto {
  @ApiProperty({ description: 'Unique field ID', example: 'client_signature' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Field label', example: 'Client Signature' })
  @IsString()
  label: string;

  @ApiProperty({ description: 'Is signature required', default: true })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiProperty({ description: 'Signer role', example: 'client', required: false })
  @IsOptional()
  @IsString()
  signerRole?: string;
}

// ==================== REQUEST/RESPONSE DTOs ====================

export class CreateDocumentTemplateDto {
  @ApiProperty({ description: 'Template name', example: 'Professional Services Proposal' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Template slug (URL-friendly)',
    example: 'professional-services-proposal',
  })
  @IsString()
  slug: string;

  @ApiProperty({ description: 'Template description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Document type',
    enum: DocumentType,
    example: DocumentType.PROPOSAL,
  })
  @IsEnum(DocumentType)
  documentType: DocumentType;

  @ApiProperty({
    description: 'Template category',
    enum: DocumentTemplateCategory,
    required: false,
  })
  @IsOptional()
  @IsEnum(DocumentTemplateCategory)
  category?: DocumentTemplateCategory;

  @ApiProperty({ description: 'Icon name', required: false })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ description: 'Color for UI', required: false })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ description: 'Template content in Quill Delta format' })
  @IsObject()
  content: Record<string, any>;

  @ApiProperty({ description: 'Pre-rendered HTML content', required: false })
  @IsOptional()
  @IsString()
  contentHtml?: string;

  @ApiProperty({
    description: 'Placeholders for dynamic content',
    type: [TemplatePlaceholderDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplatePlaceholderDto)
  placeholders?: TemplatePlaceholderDto[];

  @ApiProperty({
    description: 'Signature field definitions',
    type: [SignatureFieldDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SignatureFieldDto)
  signatureFields?: SignatureFieldDto[];

  @ApiProperty({ description: 'Additional settings', required: false })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}

export class UpdateDocumentTemplateDto {
  @ApiProperty({ description: 'Template name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Template description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Icon name', required: false })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ description: 'Color for UI', required: false })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ description: 'Template content in Quill Delta format', required: false })
  @IsOptional()
  @IsObject()
  content?: Record<string, any>;

  @ApiProperty({ description: 'Pre-rendered HTML content', required: false })
  @IsOptional()
  @IsString()
  contentHtml?: string;

  @ApiProperty({
    description: 'Placeholders for dynamic content',
    type: [TemplatePlaceholderDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplatePlaceholderDto)
  placeholders?: TemplatePlaceholderDto[];

  @ApiProperty({
    description: 'Signature field definitions',
    type: [SignatureFieldDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SignatureFieldDto)
  signatureFields?: SignatureFieldDto[];

  @ApiProperty({ description: 'Is featured in gallery', required: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiProperty({ description: 'Additional settings', required: false })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}

export class DocumentTemplateQueryDto {
  @ApiProperty({
    description: 'Filter by document type',
    enum: DocumentType,
    required: false,
  })
  @IsOptional()
  @IsEnum(DocumentType)
  documentType?: DocumentType;

  @ApiProperty({
    description: 'Filter by category',
    enum: DocumentTemplateCategory,
    required: false,
  })
  @IsOptional()
  @IsEnum(DocumentTemplateCategory)
  category?: DocumentTemplateCategory;

  @ApiProperty({ description: 'Show only system templates', required: false })
  @IsOptional()
  @IsBoolean()
  systemOnly?: boolean;

  @ApiProperty({ description: 'Show only featured templates', required: false })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiProperty({ description: 'Search query', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ description: 'Page number (1-based)', required: false, default: 1 })
  @IsOptional()
  page?: number;

  @ApiProperty({ description: 'Items per page', required: false, default: 20 })
  @IsOptional()
  limit?: number;
}
