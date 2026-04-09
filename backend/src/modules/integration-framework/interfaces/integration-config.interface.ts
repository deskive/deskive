/**
 * Integration Configuration Interfaces
 * Defines the structure for integration configs in the catalog
 */

export type AuthType = 'oauth2' | 'oauth1' | 'api_key' | 'webhook_only' | 'basic_auth';

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

export type ConnectionStatus = 'active' | 'expired' | 'revoked' | 'error' | 'pending';

export type PricingType = 'free' | 'freemium' | 'paid';

export interface OAuthConfig {
  authorizationUrl: string;
  tokenUrl: string;
  revokeUrl?: string;
  userInfoUrl?: string;
  scopes: string[];
  scopePrefix?: string; // e.g., 'https://www.googleapis.com/auth/' for Google
  scopeDelimiter?: string; // default: ' ', some use ','
  pkce?: boolean;
  clientIdEnvKey: string;
  clientSecretEnvKey: string;
  redirectUriPath?: string;
  extraAuthParams?: Record<string, string>;
  extraTokenParams?: Record<string, string>;
  tokenResponseMapping?: {
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: string;
    scope?: string;
    tokenType?: string;
  };
  userInfoMapping?: {
    id?: string;
    email?: string;
    name?: string;
    avatar?: string;
  };
}

export interface ApiKeyConfig {
  headerName: string; // e.g., 'Authorization', 'X-API-Key'
  headerPrefix?: string; // e.g., 'Bearer ', 'Api-Key '
  fieldLabel: string; // Label for UI input
  helpText?: string; // Help text for users
  validationPattern?: string; // Regex pattern to validate key format
}

export interface BasicAuthConfig {
  usernameFieldLabel: string;
  passwordFieldLabel: string;
  helpText?: string;
}

export interface WebhookConfig {
  events?: string[];
  signatureHeader?: string; // e.g., 'X-Hub-Signature-256'
  signatureAlgorithm?: 'sha1' | 'sha256' | 'sha512';
  signaturePrefix?: string; // e.g., 'sha256='
}

export interface ApiConfig {
  defaultHeaders?: Record<string, string>;
  rateLimiting?: {
    requestsPerMinute?: number;
    requestsPerHour?: number;
    burstLimit?: number;
  };
  retryConfig?: {
    maxRetries: number;
    retryDelay: number;
    retryOn?: number[]; // HTTP status codes to retry on
  };
  pagination?: {
    type: 'offset' | 'cursor' | 'page' | 'link';
    paramNames?: {
      limit?: string;
      offset?: string;
      cursor?: string;
      page?: string;
      pageSize?: string;
    };
    defaultLimit?: number;
    maxLimit?: number;
  };
}

export interface IntegrationCatalogEntry {
  id?: string;
  slug: string;
  name: string;
  description?: string;
  category: IntegrationCategory;
  provider?: string;
  logoUrl?: string;
  website?: string;
  documentationUrl?: string;
  version?: string;

  authType: AuthType;
  authConfig: OAuthConfig | ApiKeyConfig | BasicAuthConfig | Record<string, unknown>;

  apiBaseUrl?: string;
  apiConfig?: ApiConfig;

  supportsWebhooks?: boolean;
  webhookConfig?: WebhookConfig;

  capabilities?: string[];
  requiredPermissions?: string[];
  features?: string[];
  configSchema?: Record<string, unknown>; // JSON Schema for user config form
  screenshots?: string[];

  pricingType?: PricingType;
  pricingDetails?: Record<string, unknown>;
  isVerified?: boolean;
  isFeatured?: boolean;
  isActive?: boolean;
  installCount?: number;
  rating?: number;
  reviewCount?: number;

  createdAt?: string;
  updatedAt?: string;
}

export interface IntegrationConnection {
  id: string;
  workspaceId: string;
  userId: string;
  integrationId: string;

  authType: AuthType;
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  scope?: string;
  expiresAt?: string;
  apiKey?: string;
  credentials?: Record<string, unknown>;

  externalId?: string;
  externalEmail?: string;
  externalName?: string;
  externalAvatar?: string;
  externalMetadata?: Record<string, unknown>;

  status: ConnectionStatus;
  errorMessage?: string;
  lastErrorAt?: string;

  config?: Record<string, unknown>;
  settings?: Record<string, unknown>;

  lastSyncedAt?: string;
  syncCursor?: string;

  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  // Joined data
  integration?: IntegrationCatalogEntry;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  scope?: string;
  expiresIn?: number;
  expiresAt?: Date;
}

export interface ExternalUserInfo {
  id: string;
  email?: string;
  name?: string;
  avatar?: string;
  metadata?: Record<string, unknown>;
}

export interface OAuthState {
  integrationSlug: string;
  userId: string;
  workspaceId: string;
  returnUrl?: string;
  timestamp: number;
  nonce: string;
}
