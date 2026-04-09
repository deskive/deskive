// src/lib/api/integrations-api.ts
import { api } from '@/lib/fetch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ============================================================================
// NEW INTEGRATION FRAMEWORK TYPES (align with backend)
// ============================================================================

export type IntegrationAuthType = 'oauth2' | 'oauth1' | 'api_key' | 'webhook_only' | 'basic_auth';
export type IntegrationPricingType = 'free' | 'freemium' | 'paid';
export type ConnectionStatus = 'active' | 'expired' | 'revoked' | 'error' | 'pending';

export type IntegrationCategoryType =
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
  | 'SOCIAL_MEDIA'
  | 'AI'
  | 'OTHER';

// Catalog entry (available integration in marketplace)
export interface IntegrationCatalogEntry {
  id: string;
  slug: string;
  name: string;
  description?: string;
  category: IntegrationCategoryType;
  provider?: string;
  logoUrl?: string;
  website?: string;
  documentationUrl?: string;
  authType: IntegrationAuthType;
  apiBaseUrl?: string;
  supportsWebhooks: boolean;
  capabilities: string[];
  features: string[];
  pricingType: IntegrationPricingType;
  isVerified: boolean;
  isFeatured: boolean;
  isActive: boolean;
  installCount: number;
  rating?: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

// User's connection to an integration
export interface IntegrationConnection {
  id: string;
  workspaceId: string;
  userId: string;
  integrationId: string;
  authType: string;
  externalId?: string;
  externalEmail?: string;
  externalName?: string;
  externalAvatar?: string;
  status: ConnectionStatus;
  errorMessage?: string;
  lastErrorAt?: string;
  config?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  lastSyncedAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  integration?: {
    slug: string;
    name: string;
    category: string;
    provider?: string;
    logoUrl?: string;
  };
}

// API response types
export interface CatalogMarketplaceResponse {
  integrations: IntegrationCatalogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ConnectionListResponse {
  connections: IntegrationConnection[];
  total: number;
}

export interface CatalogFilters {
  search?: string;
  category?: IntegrationCategoryType;
  authType?: IntegrationAuthType;
  provider?: string;
  featured?: boolean;
  verified?: boolean;
  pricingType?: IntegrationPricingType;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CategoryCount {
  category: string;
  count: number;
}

// ============================================================================
// NEW INTEGRATION FRAMEWORK API
// ============================================================================

export const integrationFrameworkApi = {
  // Catalog APIs
  async getCatalog(filters?: CatalogFilters): Promise<CatalogMarketplaceResponse> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.authType) params.append('authType', filters.authType);
    if (filters?.provider) params.append('provider', filters.provider);
    if (filters?.featured !== undefined) params.append('featured', String(filters.featured));
    if (filters?.verified !== undefined) params.append('verified', String(filters.verified));
    if (filters?.pricingType) params.append('pricingType', filters.pricingType);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);

    const queryString = params.toString();
    return api.get<CatalogMarketplaceResponse>(
      `/integrations/catalog${queryString ? `?${queryString}` : ''}`
    );
  },

  async getCatalogBySlug(slug: string): Promise<IntegrationCatalogEntry> {
    return api.get<IntegrationCatalogEntry>(`/integrations/catalog/${slug}`);
  },

  async getCategories(): Promise<CategoryCount[]> {
    return api.get<CategoryCount[]>('/integrations/catalog/categories');
  },

  // OAuth APIs
  async initiateOAuth(
    workspaceId: string,
    slug: string,
    returnUrl?: string
  ): Promise<{ authUrl: string }> {
    return api.post<{ authUrl: string }>(
      `/integrations/${workspaceId}/connect/${slug}`,
      { returnUrl }
    );
  },

  // Connection APIs
  async getConnections(workspaceId: string): Promise<ConnectionListResponse> {
    return api.get<ConnectionListResponse>(`/integrations/${workspaceId}/connections`);
  },

  async getConnection(workspaceId: string, connectionId: string): Promise<IntegrationConnection> {
    return api.get<IntegrationConnection>(
      `/integrations/${workspaceId}/connections/${connectionId}`
    );
  },

  async getConnectionBySlug(workspaceId: string, slug: string): Promise<IntegrationConnection | null> {
    return api.get<IntegrationConnection | null>(
      `/integrations/${workspaceId}/connections/slug/${slug}`
    );
  },

  async updateConnection(
    workspaceId: string,
    connectionId: string,
    data: { config?: Record<string, unknown>; settings?: Record<string, unknown> }
  ): Promise<IntegrationConnection> {
    return api.patch<IntegrationConnection>(
      `/integrations/${workspaceId}/connections/${connectionId}`,
      data
    );
  },

  async disconnect(workspaceId: string, connectionId: string): Promise<void> {
    await api.delete(`/integrations/${workspaceId}/connections/${connectionId}`);
  },

  // API Key Connection
  async connectWithApiKey(
    workspaceId: string,
    slug: string,
    apiKey: string,
    config?: Record<string, unknown>
  ): Promise<IntegrationConnection> {
    return api.post<IntegrationConnection>(
      `/integrations/${workspaceId}/connect-api-key/${slug}`,
      { apiKey, config }
    );
  },
};

// ============================================================================
// NEW INTEGRATION FRAMEWORK HOOKS
// ============================================================================

export const integrationFrameworkKeys = {
  all: ['integration-framework'] as const,
  catalog: () => [...integrationFrameworkKeys.all, 'catalog'] as const,
  catalogList: (filters?: CatalogFilters) => [...integrationFrameworkKeys.catalog(), filters] as const,
  catalogDetail: (slug: string) => [...integrationFrameworkKeys.catalog(), slug] as const,
  categories: () => [...integrationFrameworkKeys.all, 'categories'] as const,
  connections: (workspaceId: string) => [...integrationFrameworkKeys.all, 'connections', workspaceId] as const,
  connection: (workspaceId: string, connectionId: string) => [...integrationFrameworkKeys.connections(workspaceId), connectionId] as const,
};

export const useIntegrationCatalog = (filters?: CatalogFilters) => {
  return useQuery({
    queryKey: integrationFrameworkKeys.catalogList(filters),
    queryFn: () => integrationFrameworkApi.getCatalog(filters),
  });
};

export const useIntegrationBySlug = (slug: string) => {
  return useQuery({
    queryKey: integrationFrameworkKeys.catalogDetail(slug),
    queryFn: () => integrationFrameworkApi.getCatalogBySlug(slug),
    enabled: !!slug,
  });
};

export const useIntegrationCategories = () => {
  return useQuery({
    queryKey: integrationFrameworkKeys.categories(),
    queryFn: () => integrationFrameworkApi.getCategories(),
  });
};

export const useUserConnections = (workspaceId: string) => {
  return useQuery({
    queryKey: integrationFrameworkKeys.connections(workspaceId),
    queryFn: () => integrationFrameworkApi.getConnections(workspaceId),
    enabled: !!workspaceId,
  });
};

export const useUserConnection = (workspaceId: string, connectionId: string) => {
  return useQuery({
    queryKey: integrationFrameworkKeys.connection(workspaceId, connectionId),
    queryFn: () => integrationFrameworkApi.getConnection(workspaceId, connectionId),
    enabled: !!workspaceId && !!connectionId,
  });
};

export const useInitiateOAuth = () => {
  return useMutation({
    mutationFn: ({ workspaceId, slug, returnUrl }: { workspaceId: string; slug: string; returnUrl?: string }) =>
      integrationFrameworkApi.initiateOAuth(workspaceId, slug, returnUrl),
  });
};

export const useConnectWithApiKey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, slug, apiKey, config }: { workspaceId: string; slug: string; apiKey: string; config?: Record<string, unknown> }) =>
      integrationFrameworkApi.connectWithApiKey(workspaceId, slug, apiKey, config),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: integrationFrameworkKeys.connections(workspaceId) });
    },
  });
};

export const useDisconnectIntegration = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, connectionId }: { workspaceId: string; connectionId: string }) =>
      integrationFrameworkApi.disconnect(workspaceId, connectionId),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: integrationFrameworkKeys.connections(workspaceId) });
    },
  });
};

export const useUpdateConnection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, connectionId, data }: { workspaceId: string; connectionId: string; data: { config?: Record<string, unknown>; settings?: Record<string, unknown> } }) =>
      integrationFrameworkApi.updateConnection(workspaceId, connectionId, data),
    onSuccess: (_, { workspaceId, connectionId }) => {
      queryClient.invalidateQueries({ queryKey: integrationFrameworkKeys.connections(workspaceId) });
      queryClient.invalidateQueries({ queryKey: integrationFrameworkKeys.connection(workspaceId, connectionId) });
    },
  });
};

// ============================================================================
// LEGACY TYPES (for backward compatibility)
// ============================================================================

// Enums
export type IntegrationCategory =
  | 'COMMUNICATION'
  | 'PRODUCTIVITY'
  | 'ANALYTICS'
  | 'STORAGE'
  | 'DEVELOPMENT'
  | 'MARKETING'
  | 'CRM'
  | 'HR'
  | 'FINANCE'
  | 'SECURITY'
  | 'PROJECT_MANAGEMENT'
  | 'FILE_STORAGE'
  | 'CALENDAR'
  | 'CODE_REPOSITORIES'
  | 'DESIGN'
  | 'SOCIAL_MEDIA'
  | 'E_COMMERCE'
  | 'OTHER';

export type PricingType = 'FREE' | 'FREEMIUM' | 'PAID';
export type AuthType = 'OAuth' | 'API_Key' | 'Basic' | 'OAUTH2' | 'API_KEY' | 'BASIC_AUTH' | 'JWT' | 'WEBHOOK_ONLY';

// Types
export interface Integration {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  config: Record<string, unknown>;
  createdAt: string;
  provider?: string;
  logo?: string;
  description?: string;
  category?: IntegrationCategory;
  isVerified?: boolean;
  rating?: number;
  reviewCount?: number;
  installCount?: number;
  pricing?: {
    type: PricingType;
    cost?: number;
    interval?: string;
  };
  features?: string[];
  website?: string;
  version?: string;
  screenshots?: string[];
  supportedAuthTypes?: AuthType[];
  webhookSupport?: boolean;
  lastUpdated?: string;
  apiDocumentation?: string;
  supportEmail?: string;
}

export interface InstalledIntegration extends Integration {
  integrationId?: string; // Reference to the marketplace integration
  installedAt: string;
  installedBy: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'PENDING';
  lastSync?: string;
  nextSync?: string;
  settings?: Record<string, unknown>;
  authType?: AuthType;
  permissions?: string[];
  errors?: Array<{
    code: string;
    message: string;
    timestamp: string;
    severity?: 'error' | 'warning' | 'info';
  }>;
  configuration?: {
    syncFrequency?: string;
    syncEnabled?: boolean;
    notificationsEnabled?: boolean;
    authData?: {
      apiKey?: string;
      tokenExpiry?: string;
      refreshToken?: string;
      scope?: string[];
      [key: string]: unknown;
    };
    settings?: Record<string, unknown>;
    webhooks?: Array<{
      id: string;
      url: string;
      events: string[];
      enabled: boolean;
    }>;
  };
  usage?: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    dataTransferred?: number;
    lastRequestAt?: string;
  };
}

export interface IntegrationFilters {
  categories?: string[];
  authTypes?: string[];
  pricing?: string[];
  search?: string;
  verified?: boolean;
  popular?: boolean;
  tags?: string[];
  page?: number;
  pageSize?: number;
}

export interface MarketplaceResponse {
  integrations: Integration[];
  total: number;
  page: number;
  pageSize: number;
  categories: Array<{
    category: string;
    count: number;
  }>;
  popularIntegrations?: Integration[];
}

export interface WebhookConfiguration {
  id: string;
  integrationId: string;
  url: string;
  events: string[];
  secret?: string;
  enabled: boolean;
  customHeaders?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  isActive?: boolean;
  headers?: Record<string, string>;
  failureCount?: number;
  lastDelivery?: string;
}

export interface IntegrationLog {
  id: string;
  integrationId: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  source: string;
  metadata?: Record<string, unknown>;
}

// Query Keys
export const integrationsKeys = {
  all: ['integrations'] as const,
  list: (workspaceId: string) => [...integrationsKeys.all, workspaceId] as const,
  detail: (id: string) => [...integrationsKeys.all, 'detail', id] as const,
};

// API Functions
export const integrationsApi = {
  async getIntegrations(workspaceId: string): Promise<Integration[]> {
    return api.get<Integration[]>(`/workspaces/${workspaceId}/integrations`);
  },

  async getIntegration(id: string): Promise<Integration> {
    return api.get<Integration>(`/integrations/${id}`);
  },

  async createIntegration(workspaceId: string, data: Partial<Integration>): Promise<Integration> {
    return api.post<Integration>(`/workspaces/${workspaceId}/integrations`, data);
  },

  async updateIntegration(id: string, data: Partial<Integration>): Promise<Integration> {
    return api.patch<Integration>(`/integrations/${id}`, data);
  },

  async deleteIntegration(id: string): Promise<void> {
    await api.delete(`/integrations/${id}`);
  },

  async getMarketplaceIntegrations(
    workspaceId: string,
    filters?: IntegrationFilters
  ): Promise<MarketplaceResponse> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.categories) params.append('categories', filters.categories.join(','));
    if (filters?.authTypes) params.append('authTypes', filters.authTypes.join(','));
    if (filters?.pricing) params.append('pricing', filters.pricing.join(','));
    if (filters?.verified !== undefined) params.append('verified', String(filters.verified));

    const queryString = params.toString();
    return api.get<MarketplaceResponse>(
      `/workspaces/${workspaceId}/integrations/marketplace${queryString ? `?${queryString}` : ''}`
    );
  },

  async getInstalledIntegrations(workspaceId: string): Promise<InstalledIntegration[]> {
    return api.get<InstalledIntegration[]>(`/workspaces/${workspaceId}/integrations/installed`);
  },

  async getIntegrationLogs(
    workspaceId: string,
    integrationId: string,
    params?: { limit?: number; offset?: number; level?: 'INFO' | 'WARN' | 'ERROR' }
  ): Promise<{ logs: IntegrationLog[]; total: number }> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', String(params.limit));
    if (params?.offset) queryParams.append('offset', String(params.offset));
    if (params?.level) queryParams.append('level', params.level);

    const queryString = queryParams.toString();
    return api.get<{ logs: IntegrationLog[]; total: number }>(
      `/workspaces/${workspaceId}/integrations/${integrationId}/logs${queryString ? `?${queryString}` : ''}`
    );
  },

  async getWebhooks(workspaceId: string, integrationId: string): Promise<WebhookConfiguration[]> {
    return api.get<WebhookConfiguration[]>(
      `/workspaces/${workspaceId}/integrations/${integrationId}/webhooks`
    );
  },

  async createWebhook(
    workspaceId: string,
    integrationId: string,
    data: Partial<WebhookConfiguration>
  ): Promise<WebhookConfiguration> {
    return api.post<WebhookConfiguration>(
      `/workspaces/${workspaceId}/integrations/${integrationId}/webhooks`,
      data
    );
  },

  async updateWebhook(
    workspaceId: string,
    integrationId: string,
    webhookId: string,
    data: Partial<WebhookConfiguration>
  ): Promise<WebhookConfiguration> {
    return api.patch<WebhookConfiguration>(
      `/workspaces/${workspaceId}/integrations/${integrationId}/webhooks/${webhookId}`,
      data
    );
  },

  async deleteWebhook(workspaceId: string, integrationId: string, webhookId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/integrations/${integrationId}/webhooks/${webhookId}`);
  },

  async testWebhook(
    workspaceId: string,
    integrationId: string,
    webhookId: string
  ): Promise<{ success: boolean; response: unknown; statusCode: number; message: string }> {
    return api.post<{ success: boolean; response: unknown; statusCode: number; message: string }>(
      `/workspaces/${workspaceId}/integrations/${integrationId}/webhooks/${webhookId}/test`
    );
  },

  async handleOAuthCallback(
    workspaceId: string,
    data: { code: string; state: string; integrationId: string }
  ): Promise<InstalledIntegration> {
    return api.post<InstalledIntegration>(
      `/workspaces/${workspaceId}/integrations/oauth/callback`,
      data
    );
  },

  async initiateOAuth(
    workspaceId: string,
    data: { integrationId: string; redirectUri?: string }
  ): Promise<{ authUrl: string; state: string }> {
    return api.post<{ authUrl: string; state: string }>(
      `/workspaces/${workspaceId}/integrations/oauth/initiate`,
      data
    );
  },

  async installIntegration(
    workspaceId: string,
    data: { integrationId: string; config?: Record<string, unknown> }
  ): Promise<InstalledIntegration> {
    return api.post<InstalledIntegration>(
      `/workspaces/${workspaceId}/integrations/install`,
      data
    );
  },

  async uninstallIntegration(workspaceId: string, installationId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/integrations/install/${installationId}`);
  },

  async getInstalledIntegration(workspaceId: string, installationId: string): Promise<InstalledIntegration> {
    return api.get<InstalledIntegration>(
      `/workspaces/${workspaceId}/integrations/install/${installationId}`
    );
  },

  async getIntegrationDetails(workspaceId: string, integrationId: string): Promise<Integration> {
    return api.get<Integration>(
      `/workspaces/${workspaceId}/integrations/marketplace/${integrationId}`
    );
  },

  async syncIntegration(
    workspaceId: string,
    installationId: string
  ): Promise<{ success: boolean; message: string; lastSync: string }> {
    return api.post<{ success: boolean; message: string; lastSync: string }>(
      `/workspaces/${workspaceId}/integrations/install/${installationId}/sync`
    );
  },

  async testIntegrationConnection(
    workspaceId: string,
    installationId: string
  ): Promise<{ success: boolean; message: string; latency?: number; details?: unknown }> {
    return api.post<{ success: boolean; message: string; latency?: number; details?: unknown }>(
      `/workspaces/${workspaceId}/integrations/install/${installationId}/test`
    );
  },

  async refreshOAuthToken(
    workspaceId: string,
    installationId: string
  ): Promise<{ success: boolean; tokenExpiry: string; message: string }> {
    return api.post<{ success: boolean; tokenExpiry: string; message: string }>(
      `/workspaces/${workspaceId}/integrations/install/${installationId}/refresh-token`
    );
  },
};

// React Query Hooks
export const useIntegrations = (workspaceId: string) => {
  return useQuery({
    queryKey: integrationsKeys.list(workspaceId),
    queryFn: () => integrationsApi.getIntegrations(workspaceId),
    enabled: !!workspaceId,
  });
};

export const useIntegration = (id: string) => {
  return useQuery({
    queryKey: integrationsKeys.detail(id),
    queryFn: () => integrationsApi.getIntegration(id),
    enabled: !!id,
  });
};

export const useCreateIntegration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, data }: { workspaceId: string; data: Partial<Integration> }) =>
      integrationsApi.createIntegration(workspaceId, data),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: integrationsKeys.list(workspaceId) });
    },
  });
};

export const useUpdateIntegration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Integration> }) =>
      integrationsApi.updateIntegration(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: integrationsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: integrationsKeys.all });
    },
  });
};

export const useDeleteIntegration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: integrationsApi.deleteIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: integrationsKeys.all });
    },
  });
};

// Backward compatibility: export as integrationsService
export const integrationsService = integrationsApi;
