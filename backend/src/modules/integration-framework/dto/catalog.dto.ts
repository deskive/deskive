import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsObject,
  IsArray,
  IsUrl,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

// Re-export types for use in DTOs
export type AuthType = 'oauth2' | 'oauth1' | 'api_key' | 'webhook_only' | 'basic_auth';
export type PricingType = 'free' | 'freemium' | 'paid';
export type IntegrationCategory =
  | 'COMMUNICATION'
  | 'FILE_STORAGE'
  | 'CALENDAR'
  | 'EMAIL'
  | 'PROJECT_MANAGEMENT'
  | 'CRM'
  | 'DEVELOPMENT'
  | 'ANALYTICS'
  | 'MARKETING'
  | 'DOCUMENTATION'
  | 'DESIGN'
  | 'TIME_TRACKING'
  | 'VIDEO_CONFERENCING'
  | 'AUTOMATION'
  | 'PRODUCTIVITY'
  | 'HR'
  | 'FINANCE'
  | 'SUPPORT'
  | 'SECURITY'
  | 'ECOMMERCE'
  | 'OTHER';

export class IntegrationFiltersDto {
  @ApiPropertyOptional({ description: 'Search by name or description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: [
      'COMMUNICATION',
      'FILE_STORAGE',
      'CALENDAR',
      'EMAIL',
      'PROJECT_MANAGEMENT',
      'CRM',
      'DEVELOPMENT',
      'ANALYTICS',
      'MARKETING',
      'DOCUMENTATION',
      'DESIGN',
      'TIME_TRACKING',
      'VIDEO_CONFERENCING',
      'AUTOMATION',
      'PRODUCTIVITY',
      'HR',
      'FINANCE',
      'SUPPORT',
      'SECURITY',
      'ECOMMERCE',
      'OTHER',
    ],
  })
  @IsOptional()
  @IsString()
  category?: IntegrationCategory;

  @ApiPropertyOptional({ enum: ['oauth2', 'oauth1', 'api_key', 'webhook_only', 'basic_auth'] })
  @IsOptional()
  @IsString()
  authType?: AuthType;

  @ApiPropertyOptional({ description: 'Filter by provider (e.g., Google, Microsoft)' })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ description: 'Show only featured integrations' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ description: 'Show only verified integrations' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  verified?: boolean;

  @ApiPropertyOptional({ enum: ['free', 'freemium', 'paid'] })
  @IsOptional()
  @IsString()
  pricingType?: PricingType;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(200)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Sort by field', default: 'installCount' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'installCount';

  @ApiPropertyOptional({ description: 'Sort direction', default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class CreateIntegrationDto {
  @ApiProperty({ description: 'Unique slug identifier', example: 'slack' })
  @IsString()
  slug: string;

  @ApiProperty({ description: 'Integration name', example: 'Slack' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Category', example: 'COMMUNICATION' })
  @IsString()
  category: IntegrationCategory;

  @ApiPropertyOptional({ description: 'Provider name', example: 'Slack Technologies' })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ description: 'Logo URL' })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'Website URL' })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({ description: 'Documentation URL' })
  @IsOptional()
  @IsUrl()
  documentationUrl?: string;

  @ApiProperty({ description: 'Authentication type', example: 'oauth2' })
  @IsString()
  authType: AuthType;

  @ApiProperty({ description: 'Authentication configuration' })
  @IsObject()
  authConfig: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'API base URL' })
  @IsOptional()
  @IsUrl()
  apiBaseUrl?: string;

  @ApiPropertyOptional({ description: 'API configuration' })
  @IsOptional()
  @IsObject()
  apiConfig?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Supports webhooks' })
  @IsOptional()
  @IsBoolean()
  supportsWebhooks?: boolean;

  @ApiPropertyOptional({ description: 'Webhook configuration' })
  @IsOptional()
  @IsObject()
  webhookConfig?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Integration capabilities' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  capabilities?: string[];

  @ApiPropertyOptional({ description: 'Features list for UI' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional({ description: 'JSON Schema for configuration form' })
  @IsOptional()
  @IsObject()
  configSchema?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Screenshot URLs' })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  screenshots?: string[];

  @ApiPropertyOptional({ description: 'Pricing type', default: 'free' })
  @IsOptional()
  @IsString()
  pricingType?: PricingType;

  @ApiPropertyOptional({ description: 'Is verified integration' })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @ApiPropertyOptional({ description: 'Is featured integration' })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}

export class UpdateIntegrationDto {
  @ApiPropertyOptional({ description: 'Integration name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Logo URL' })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'Authentication configuration' })
  @IsOptional()
  @IsObject()
  authConfig?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'API configuration' })
  @IsOptional()
  @IsObject()
  apiConfig?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Webhook configuration' })
  @IsOptional()
  @IsObject()
  webhookConfig?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Integration capabilities' })
  @IsOptional()
  @IsArray()
  capabilities?: string[];

  @ApiPropertyOptional({ description: 'Features list' })
  @IsOptional()
  @IsArray()
  features?: string[];

  @ApiPropertyOptional({ description: 'Is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Is verified' })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @ApiPropertyOptional({ description: 'Is featured' })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}

export class IntegrationCatalogResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  category: IntegrationCategory;

  @ApiPropertyOptional()
  provider?: string;

  @ApiPropertyOptional()
  logoUrl?: string;

  @ApiPropertyOptional()
  website?: string;

  @ApiPropertyOptional()
  documentationUrl?: string;

  @ApiProperty()
  authType: AuthType;

  @ApiPropertyOptional()
  apiBaseUrl?: string;

  @ApiProperty()
  supportsWebhooks: boolean;

  @ApiProperty()
  capabilities: string[];

  @ApiProperty()
  features: string[];

  @ApiProperty()
  pricingType: PricingType;

  @ApiProperty()
  isVerified: boolean;

  @ApiProperty()
  isFeatured: boolean;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  installCount: number;

  @ApiPropertyOptional()
  rating?: number;

  @ApiProperty()
  reviewCount: number;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiProperty({
    description:
      'True if the server-side credentials for this integration are configured in env (OAuth client id + secret, or the api_key env var). When false, the frontend should render a "Not configured" state and disable the Connect button — clicking would otherwise fail with a server error about missing env vars.',
  })
  credentialConfigured: boolean;
}

export class MarketplaceResponseDto {
  @ApiProperty({ type: [IntegrationCatalogResponseDto] })
  integrations: IntegrationCatalogResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}
