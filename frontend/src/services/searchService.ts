/**
 * Search Service - Complete API wrapper for Search functionality
 * Handles all search-related API calls to backend
 * Base Path: /api/v1/workspaces/:workspaceId/search
 */

import { api } from '../lib/fetch';
import type { SearchFilters } from '../types/search';

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface SearchQueryParams {
  query: string;
  types?: string[];
  page?: number;
  limit?: number;
  author?: string;
  date_from?: string;
  date_to?: string;
  tags?: string;
  project_id?: string;
  semantic?: boolean;
}

export interface SearchResultItem {
  id: string;
  content_type: string;
  relevance_score: number;
  // Common fields
  title?: string;
  name?: string;
  content?: string;
  description?: string;
  content_text?: string;
  content_html?: string;
  created_at: string;
  updated_at?: string;
  // Author/User fields
  created_by?: string;
  user_id?: string;
  uploaded_by?: string;
  organizer_id?: string;
  author_id?: string;
  // Type-specific fields
  channel_id?: string;
  conversation_id?: string;
  project_id?: string;
  folder_id?: string;
  workspace_id?: string;
  // Additional metadata
  tags?: string[];
  attachments?: any;
  mentions?: string[];
  reactions?: any;
  is_pinned?: boolean;
  is_starred?: boolean;
  is_deleted?: boolean;
  is_favorite?: boolean;
  // File specific
  mime_type?: string;
  size?: number;
  url?: string;
  storage_path?: string;
  // Event specific
  start_time?: string;
  end_time?: string;
  location?: string;
  attendees?: any[];
  // Task specific
  status?: string;
  priority?: string;
  assigned_to?: string;
  due_date?: string;
  [key: string]: any;
}

export interface SearchResponse {
  data: SearchResultItem[];
  total: number;
  page: number;
  limit: number;
  query: string;
  types: string[];
  has_more: boolean;
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  result_count: number;
  content_types: string[];
  filters: Record<string, any>;
  created_at: string;
}

export interface RecentSearchesResponse {
  data: SearchHistoryItem[];
  total: number;
}

export interface PopularSearch {
  query: string;
  count: number;
}

export interface PopularSearchesResponse {
  data: PopularSearch[];
  total: number;
}

export interface ClearHistoryResponse {
  success: boolean;
  message: string;
}

// ============================================================================
// Search API Methods
// ============================================================================

/**
 * Universal search across all content types
 * GET /api/v1/workspaces/:workspaceId/search
 */
export const universalSearch = async (
  workspaceId: string,
  params: SearchQueryParams
): Promise<SearchResponse> => {
  try {
    console.log('[SearchService] Performing search:', { workspaceId, params });

    // Build query params
    const queryParams = new URLSearchParams();
    queryParams.append('query', params.query);

    if (params.types && params.types.length > 0) {
      // Backend expects types as repeated query params: types=notes&types=files
      params.types.forEach(type => queryParams.append('types', type));
    }

    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.author) queryParams.append('author', params.author);
    if (params.date_from) queryParams.append('date_from', params.date_from);
    if (params.date_to) queryParams.append('date_to', params.date_to);
    if (params.tags) queryParams.append('tags', params.tags);
    if (params.project_id) queryParams.append('project_id', params.project_id);
    if (params.semantic !== undefined) queryParams.append('semantic', params.semantic.toString());

    const response = await api.get<SearchResponse>(
      `/workspaces/${workspaceId}/search?${queryParams.toString()}`
    );

    console.log('[SearchService] Search completed:', {
      total: response.total,
      resultsCount: response.data.length
    });

    return response;
  } catch (error: any) {
    console.error('[SearchService] Search error:', {
      status: error.response?.status,
      message: error.response?.data?.message,
      error
    });
    throw new Error(error.response?.data?.message || 'Search failed');
  }
};

/**
 * Get search suggestions
 * GET /api/v1/workspaces/:workspaceId/search/suggestions
 */
export const getSearchSuggestions = async (
  workspaceId: string,
  query: string
): Promise<string[]> => {
  try {
    console.log('[SearchService] Getting suggestions for:', query);
    const response = await api.get<string[]>(
      `/workspaces/${workspaceId}/search/suggestions?q=${encodeURIComponent(query)}`
    );
    return response;
  } catch (error: any) {
    console.error('[SearchService] Error getting suggestions:', error);
    return [];
  }
};

/**
 * Get recent search history
 * GET /api/v1/workspaces/:workspaceId/search/recent
 */
export const getRecentSearches = async (
  workspaceId: string,
  limit: number = 10
): Promise<RecentSearchesResponse> => {
  try {
    console.log('[SearchService] Getting recent searches');
    const response = await api.get<RecentSearchesResponse>(
      `/workspaces/${workspaceId}/search/recent?limit=${limit}`
    );
    return response;
  } catch (error: any) {
    console.error('[SearchService] Error getting recent searches:', error);
    return { data: [], total: 0 };
  }
};

/**
 * Get popular searches across workspace
 * GET /api/v1/workspaces/:workspaceId/search/popular
 */
export const getPopularSearches = async (
  workspaceId: string,
  limit: number = 10
): Promise<PopularSearchesResponse> => {
  try {
    console.log('[SearchService] Getting popular searches');
    const response = await api.get<PopularSearchesResponse>(
      `/workspaces/${workspaceId}/search/popular?limit=${limit}`
    );
    return response;
  } catch (error: any) {
    console.error('[SearchService] Error getting popular searches:', error);
    return { data: [], total: 0 };
  }
};

/**
 * Clear search history
 * DELETE /api/v1/workspaces/:workspaceId/search/recent
 */
export const clearSearchHistory = async (
  workspaceId: string,
  query?: string
): Promise<ClearHistoryResponse> => {
  try {
    console.log('[SearchService] Clearing search history');
    const url = query
      ? `/workspaces/${workspaceId}/search/recent?query=${encodeURIComponent(query)}`
      : `/workspaces/${workspaceId}/search/recent`;

    const response = await api.delete<ClearHistoryResponse>(url);
    return response;
  } catch (error: any) {
    console.error('[SearchService] Error clearing history:', error);
    throw new Error(error.response?.data?.message || 'Failed to clear search history');
  }
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert frontend SearchFilters to backend query params
 */
export const convertFiltersToParams = (filters: SearchFilters): Partial<SearchQueryParams> => {
  const params: Partial<SearchQueryParams> = {};

  if (filters.dateRange?.from) {
    params.date_from = filters.dateRange.from.toISOString();
  }

  if (filters.dateRange?.to) {
    params.date_to = filters.dateRange.to.toISOString();
  }

  if (filters.authors && filters.authors.length > 0) {
    params.author = filters.authors[0]; // Backend supports single author for now
  }

  if (filters.tags && filters.tags.length > 0) {
    params.tags = filters.tags.join(',');
  }

  if (filters.projects && filters.projects.length > 0) {
    params.project_id = filters.projects[0]; // Backend supports single project for now
  }

  return params;
};

/**
 * Map content types from frontend to backend format
 */
export const mapSearchTypes = (type: string): string[] => {
  const typeMap: Record<string, string[]> = {
    all: ['notes', 'files', 'folders', 'messages', 'tasks', 'projects', 'events'],
    messages: ['messages'],
    files: ['files'],
    folders: ['folders'],
    projects: ['projects', 'tasks'],
    notes: ['notes'],
    calendar: ['events'],
    videos: [], // Not implemented yet in backend
  };

  return typeMap[type] || typeMap.all;
};

// ============================================================================
// Saved Searches API Methods
// ============================================================================

export interface SavedSearch {
  id: string;
  workspace_id: string;
  user_id: string;
  name: string;
  query: string;
  type: string;
  mode: string;
  filters: Record<string, any>;
  results_snapshot: any[];
  result_count: number;
  tags: string[];
  is_notification_enabled: boolean;
  shared_with: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateSavedSearchPayload {
  name: string;
  query: string;
  type: string;
  mode: string;
  filters?: Record<string, any>;
  resultsSnapshot?: any[];
  tags?: string[];
  isNotificationEnabled?: boolean;
}

export interface SavedSearchesResponse {
  data: SavedSearch[];
  total: number;
}

/**
 * Transform backend saved search to frontend format
 */
const transformSavedSearch = (backendSearch: any): any => {
  return {
    id: backendSearch.id,
    workspace_id: backendSearch.workspace_id,
    user_id: backendSearch.user_id,
    name: backendSearch.name,
    query: backendSearch.query,
    type: backendSearch.type,
    mode: backendSearch.mode,
    filters: backendSearch.filters || {},
    results_snapshot: backendSearch.results_snapshot || [],
    result_count: backendSearch.result_count || 0,
    tags: backendSearch.tags || [],
    is_notification_enabled: backendSearch.is_notification_enabled || false,
    shared_with: backendSearch.shared_with || [],
    created_at: backendSearch.created_at,
    updated_at: backendSearch.updated_at,
    // For compatibility with frontend store
    createdAt: backendSearch.created_at,
    updatedAt: backendSearch.updated_at,
    isNotificationEnabled: backendSearch.is_notification_enabled,
    sharedWith: backendSearch.shared_with,
  };
};

/**
 * Create a new saved search
 * POST /api/v1/workspaces/:workspaceId/search/saved
 */
export const createSavedSearch = async (
  workspaceId: string,
  payload: CreateSavedSearchPayload
): Promise<{ success: boolean; message: string; data: any }> => {
  try {
    console.log('[SearchService] Creating saved search:', { workspaceId, payload });
    const response = await api.post<{ success: boolean; message: string; data: any }>(
      `/workspaces/${workspaceId}/search/saved`,
      payload
    );
    console.log('[SearchService] Saved search created:', response);

    // Transform the response
    return {
      ...response,
      data: transformSavedSearch(response.data)
    };
  } catch (error: any) {
    console.error('[SearchService] Error creating saved search:', error);
    throw new Error(error.response?.data?.message || 'Failed to save search');
  }
};

/**
 * Get all saved searches for the current user
 * GET /api/v1/workspaces/:workspaceId/search/saved
 */
export const getSavedSearches = async (
  workspaceId: string
): Promise<SavedSearchesResponse> => {
  try {
    console.log('[SearchService] Getting saved searches');
    const response = await api.get<SavedSearchesResponse>(
      `/workspaces/${workspaceId}/search/saved`
    );

    // Transform all saved searches
    return {
      data: response.data.map(transformSavedSearch),
      total: response.total
    };
  } catch (error: any) {
    console.error('[SearchService] Error getting saved searches:', error);
    return { data: [], total: 0 };
  }
};

/**
 * Get a specific saved search by ID
 * GET /api/v1/workspaces/:workspaceId/search/saved/:searchId
 */
export const getSavedSearchById = async (
  workspaceId: string,
  searchId: string
): Promise<SavedSearch> => {
  try {
    const response = await api.get<SavedSearch>(
      `/workspaces/${workspaceId}/search/saved/${searchId}`
    );
    return response;
  } catch (error: any) {
    console.error('[SearchService] Error getting saved search:', error);
    throw new Error(error.response?.data?.message || 'Failed to get saved search');
  }
};

/**
 * Update a saved search
 * PUT /api/v1/workspaces/:workspaceId/search/saved/:searchId
 */
export const updateSavedSearch = async (
  workspaceId: string,
  searchId: string,
  updates: Partial<CreateSavedSearchPayload>
): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await api.put<{ success: boolean; message: string }>(
      `/workspaces/${workspaceId}/search/saved/${searchId}`,
      updates
    );
    return response;
  } catch (error: any) {
    console.error('[SearchService] Error updating saved search:', error);
    throw new Error(error.response?.data?.message || 'Failed to update saved search');
  }
};

/**
 * Delete a saved search
 * DELETE /api/v1/workspaces/:workspaceId/search/saved/:searchId
 */
export const deleteSavedSearch = async (
  workspaceId: string,
  searchId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await api.delete<{ success: boolean; message: string }>(
      `/workspaces/${workspaceId}/search/saved/${searchId}`
    );
    return response;
  } catch (error: any) {
    console.error('[SearchService] Error deleting saved search:', error);
    throw new Error(error.response?.data?.message || 'Failed to delete saved search');
  }
};

/**
 * Share a saved search with other users
 * POST /api/v1/workspaces/:workspaceId/search/saved/:searchId/share
 */
export const shareSavedSearch = async (
  workspaceId: string,
  searchId: string,
  userIds: string[]
): Promise<{ success: boolean; message: string; shared_with: string[] }> => {
  try {
    const response = await api.post<{ success: boolean; message: string; shared_with: string[] }>(
      `/workspaces/${workspaceId}/search/saved/${searchId}/share`,
      { userIds }
    );
    return response;
  } catch (error: any) {
    console.error('[SearchService] Error sharing saved search:', error);
    throw new Error(error.response?.data?.message || 'Failed to share saved search');
  }
};
