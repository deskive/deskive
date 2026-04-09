import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { searchService } from '@/lib/api/search-api';
import type { SearchQuery, SearchResponse, SearchFilters } from '@/lib/api/search-api';
import { toast } from 'sonner';

export interface UseUniversalSearchProps {
  workspaceId: string;
  enabled?: boolean;
}

export interface SearchRequest {
  query: string;
  type: 'all' | 'messages' | 'files' | 'projects' | 'notes' | 'calendar' | 'videos';
  mode: 'full-text' | 'semantic' | 'hybrid';
  filters?: SearchFilters;
}

export function useUniversalSearch({ workspaceId, enabled = true }: UseUniversalSearchProps) {
  const queryClient = useQueryClient();
  const [searchRequest, setSearchRequest] = useState<SearchRequest | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({});

  // Main search query
  const {
    data: searchResponse,
    isLoading: isSearching,
    error,
    refetch: _refetch,
  } = useQuery({
    queryKey: ['universal-search', workspaceId, searchRequest],
    queryFn: async (): Promise<SearchResponse> => {
      if (!searchRequest || !searchRequest.query || !workspaceId) {
        return {
          results: {},
          total: 0,
          query: '',
          processingTime: 0,
          totalResults: 0,
          relevanceScore: 0,
          searchTime: 0,
          suggestions: [],
          relatedQueries: [],
          stats: {
            totalHits: 0,
            maxScore: 0,
            took: 0,
          },
        };
      }

      const searchQuery: SearchQuery = {
        query: searchRequest.query,
        filters: { ...filters, ...searchRequest.filters },
        aiMode: searchRequest.mode === 'semantic' || searchRequest.mode === 'hybrid',
      };

      return await searchService.universalSearch(workspaceId, searchQuery);
    },
    enabled: enabled && !!searchRequest?.query && !!workspaceId,
    staleTime: 30000, // 30 seconds
    retry: 1,
  });

  // Save search mutation
  const saveSearchMutation = useMutation({
    mutationFn: async (searchData: {
      name: string;
      query: string;
      type: string;
      mode: string;
      filters: SearchFilters;
    }) => {
      return await searchService.saveSearch(
        workspaceId,
        searchData.query,
        searchData.name,
        searchData.filters
      );
    },
    onSuccess: () => {
      toast.success('Search saved successfully');
      queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save search');
    },
  });

  // Search function
  const search = useCallback((request: SearchRequest) => {
    setSearchRequest({ ...request, filters: { ...filters, ...request.filters } });
  }, [filters]);

  // Clear results
  const clearResults = useCallback(() => {
    setSearchRequest(null);
    queryClient.removeQueries({ queryKey: ['universal-search', workspaceId] });
  }, [queryClient, workspaceId]);

  // Update filters
  const updateFilters = useCallback((newFilters: SearchFilters) => {
    setFilters(newFilters);
    if (searchRequest) {
      setSearchRequest({
        ...searchRequest,
        filters: newFilters,
      });
    }
  }, [searchRequest]);

  // Save current search
  const saveCurrentSearch = useCallback(async (name: string) => {
    if (searchRequest) {
      await saveSearchMutation.mutateAsync({
        name,
        query: searchRequest.query,
        type: searchRequest.type,
        mode: searchRequest.mode,
        filters: searchRequest.filters || {},
      });
    }
  }, [searchRequest, saveSearchMutation]);

  // Get semantic results
  const getSemanticResults = useCallback(async (query: string) => {
    try {
      return await searchService.semanticSearch(workspaceId, { query, aiMode: true });
    } catch (error) {
      console.error('Semantic search failed:', error);
      return {
        results: {},
        total: 0,
        query,
        processingTime: 0,
      };
    }
  }, [workspaceId]);

  return {
    // Data
    results: searchResponse?.results || {},
    totalResults: searchResponse?.totalResults || 0,
    relevanceScore: searchResponse?.relevanceScore || 0,
    searchTime: searchResponse?.searchTime || 0,
    suggestions: searchResponse?.suggestions || [],
    relatedQueries: searchResponse?.relatedQueries || [],
    stats: searchResponse?.stats,
    filters,
    
    // States
    isSearching,
    error,
    
    // Actions
    search,
    clearResults,
    updateFilters,
    saveCurrentSearch,
    getSemanticResults,
    
    // Loading states
    isSaving: saveSearchMutation.isPending,
  };
}

export default useUniversalSearch;