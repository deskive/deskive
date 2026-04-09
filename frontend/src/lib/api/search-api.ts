// src/lib/api/search-api.ts
import { api } from '@/lib/fetch';
import { useQuery } from '@tanstack/react-query';

// Types
export type SearchResultType =
  | 'message'
  | 'file'
  | 'project'
  | 'note'
  | 'calendar'
  | 'video'
  | 'event'
  | 'task';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  snippet?: string;
  excerpt: string;
  highlights: string[];
  author: {
    id: string;
    name: string;
    imageUrl?: string;
  };
  updatedAt: Date;
  createdAt: Date;
  workspace?: string;
  relevanceScore?: number;
  url?: string;
  metadata?: {
    tags?: string[];
    size?: number;
    fileType?: string;
    [key: string]: unknown;
  };
}

export interface SearchFilters {
  types?: SearchResultType[];
  authors?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  workspaces?: string[];
  tags?: string[];
}

export interface SearchOptions {
  query: string;
  filters?: SearchFilters;
  limit?: number;
  offset?: number;
  aiMode?: boolean;
}

export interface SearchQuery {
  query: string;
  filters?: SearchFilters;
  limit?: number;
  offset?: number;
  aiMode?: boolean;
}

export interface RecentSearch {
  id: string;
  query: string;
  timestamp: string;
  resultsCount?: number;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters?: SearchFilters;
  createdAt: string;
  updatedAt?: string;
}

export interface SearchSuggestion {
  text: string;
  type: 'query' | 'tag' | 'author' | 'workspace';
  score?: number;
}

export interface SearchResponse {
  results: Record<string, SearchResult[]>;
  total: number;
  query: string;
  processingTime: number;
  suggestions?: string[];
  totalResults?: number;
  relevanceScore?: number;
  searchTime?: number;
  relatedQueries?: string[];
  stats?: {
    totalHits: number;
    maxScore: number;
    took: number;
  };
}

// Query Keys
export const searchKeys = {
  all: ['search'] as const,
  queries: (workspaceId: string) => [...searchKeys.all, 'queries', workspaceId] as const,
  query: (workspaceId: string, options: SearchOptions) =>
    [...searchKeys.queries(workspaceId), options] as const,
};

// API Functions
export const searchApi = {
  async search(workspaceId: string, options: SearchOptions): Promise<SearchResponse> {
    const params = new URLSearchParams();
    params.append('q', options.query);

    if (options.filters?.types) {
      params.append('types', options.filters.types.join(','));
    }
    if (options.filters?.authors) {
      params.append('authors', options.filters.authors.join(','));
    }
    if (options.filters?.dateRange) {
      params.append('startDate', options.filters.dateRange.start);
      params.append('endDate', options.filters.dateRange.end);
    }
    if (options.filters?.workspaces) {
      params.append('workspaces', options.filters.workspaces.join(','));
    }
    if (options.filters?.tags) {
      params.append('tags', options.filters.tags.join(','));
    }
    if (options.limit) {
      params.append('limit', String(options.limit));
    }
    if (options.offset) {
      params.append('offset', String(options.offset));
    }
    if (options.aiMode) {
      params.append('aiMode', 'true');
    }

    const response = await api.get<SearchResponse>(
      `/workspaces/${workspaceId}/search?${params.toString()}`
    );

    // Transform date strings to Date objects
    const transformedResults: Record<string, SearchResult[]> = {};

    for (const [type, results] of Object.entries(response.results)) {
      transformedResults[type] = results.map(result => ({
        ...result,
        updatedAt: new Date(result.updatedAt),
        createdAt: new Date(result.createdAt),
      }));
    }

    return {
      ...response,
      results: transformedResults,
    };
  },

  async getSearchSuggestions(workspaceId: string, query: string, limit?: number): Promise<string[]> {
    const params = new URLSearchParams({ q: query, limit: String(limit || 5) });
    return api.get<string[]>(`/workspaces/${workspaceId}/search/suggestions?${params.toString()}`);
  },

  async getRecentSearches(workspaceId: string, limit?: number): Promise<RecentSearch[]> {
    const params = limit ? new URLSearchParams({ limit: String(limit) }) : '';
    return api.get<RecentSearch[]>(`/workspaces/${workspaceId}/search/recent${params ? '?' + params.toString() : ''}`);
  },

  async getRecentQueries(workspaceId: string): Promise<string[]> {
    const searches = await this.getRecentSearches(workspaceId);
    return searches.map(s => s.query);
  },

  async clearRecentSearches(workspaceId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/search/recent`);
  },

  async clearRecentQueries(workspaceId: string): Promise<void> {
    await this.clearRecentSearches(workspaceId);
  },

  async saveSearch(workspaceId: string, query: string, name: string, filters?: SearchFilters): Promise<SavedSearch> {
    return api.post<SavedSearch>(`/workspaces/${workspaceId}/search/saved`, { query, name, filters });
  },

  async getSavedSearches(workspaceId: string): Promise<SavedSearch[]> {
    return api.get<SavedSearch[]>(`/workspaces/${workspaceId}/search/saved`);
  },

  async updateSavedSearch(workspaceId: string, searchId: string, updates: Partial<SavedSearch>): Promise<SavedSearch> {
    return api.patch<SavedSearch>(`/workspaces/${workspaceId}/search/saved/${searchId}`, updates);
  },

  async deleteSavedSearch(workspaceId: string, searchId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/search/saved/${searchId}`);
  },

  async universalSearch(workspaceId: string, options: SearchOptions): Promise<SearchResponse> {
    // Universal search across all content types
    return this.search(workspaceId, options);
  },

  async semanticSearch(workspaceId: string, options: SearchOptions): Promise<SearchResponse> {
    // AI-powered semantic search
    const semanticOptions = { ...options, aiMode: true };
    return this.search(workspaceId, semanticOptions);
  },
};

// React Query Hooks
export const useSearch = (workspaceId: string, options: SearchOptions) => {
  return useQuery({
    queryKey: searchKeys.query(workspaceId, options),
    queryFn: () => searchApi.search(workspaceId, options),
    enabled: !!workspaceId && !!options.query && options.query.length > 0,
    staleTime: 30000, // 30 seconds
  });
};

export const useSearchSuggestions = (workspaceId: string, query: string) => {
  return useQuery({
    queryKey: [...searchKeys.queries(workspaceId), 'suggestions', query] as const,
    queryFn: () => searchApi.getSearchSuggestions(workspaceId, query),
    enabled: !!workspaceId && !!query && query.length >= 2,
    staleTime: 60000, // 1 minute
  });
};

export const useRecentSearches = (workspaceId: string) => {
  return useQuery({
    queryKey: [...searchKeys.queries(workspaceId), 'recent'] as const,
    queryFn: () => searchApi.getRecentSearches(workspaceId),
    enabled: !!workspaceId,
    staleTime: 300000, // 5 minutes
  });
};

export const useSavedSearches = (workspaceId: string) => {
  return useQuery({
    queryKey: [...searchKeys.queries(workspaceId), 'saved'] as const,
    queryFn: () => searchApi.getSavedSearches(workspaceId),
    enabled: !!workspaceId,
    staleTime: 300000, // 5 minutes
  });
};

// Backward compatibility: export as searchService
export const searchService = searchApi;
