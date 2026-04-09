import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { searchService } from '@/lib/api/search-api';
import type { RecentSearch, SavedSearch, SearchFilters } from '@/lib/api/search-api';

export interface SavedSearchData {
  query: string;
  type: string;
  mode: string;
  filters: SearchFilters;
}

export interface UseSearchHistoryProps {
  workspaceId: string;
}

export function useSearchHistory({ workspaceId }: UseSearchHistoryProps) {
  const queryClient = useQueryClient();
  
  // Recent searches query
  const {
    data: recentSearches = [],
    isLoading: isLoadingRecent,
  } = useQuery({
    queryKey: ['recent-searches', workspaceId],
    queryFn: async (): Promise<RecentSearch[]> => {
      try {
        return await searchService.getRecentSearches(workspaceId);
      } catch (error) {
        console.warn('Failed to load recent searches:', error);
        return [];
      }
    },
    enabled: !!workspaceId,
    staleTime: 300000, // 5 minutes
    retry: 1,
  });

  // Saved searches query
  const {
    data: savedSearches = [],
    isLoading: isLoadingSaved,
  } = useQuery({
    queryKey: ['saved-searches', workspaceId],
    queryFn: async (): Promise<SavedSearch[]> => {
      try {
        return await searchService.getSavedSearches(workspaceId);
      } catch (error) {
        console.warn('Failed to load saved searches:', error);
        return [];
      }
    },
    enabled: !!workspaceId,
    staleTime: 300000, // 5 minutes
    retry: 1,
  });

  // Save search mutation
  const saveSearchMutation = useMutation({
    mutationFn: async (searchData: SavedSearchData & { name?: string }) => {
      return await searchService.saveSearch(
        workspaceId,
        searchData.query,
        searchData.name || searchData.query,
        searchData.filters
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches', workspaceId] });
    },
  });

  // Update saved search mutation
  const updateSavedSearchMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<SavedSearchData> & { name?: string };
    }) => {
      return await searchService.updateSavedSearch(workspaceId, id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches', workspaceId] });
    },
  });

  // Delete saved search mutation
  const deleteSavedSearchMutation = useMutation({
    mutationFn: async (id: string) => {
      return await searchService.deleteSavedSearch(workspaceId, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches', workspaceId] });
    },
  });

  // Clear recent searches mutation
  const clearRecentMutation = useMutation({
    mutationFn: async () => {
      await searchService.clearRecentSearches(workspaceId);
      // Also clear local cache
      await searchService.clearRecentQueries(workspaceId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recent-searches', workspaceId] });
    },
  });

  // Add to history (local only, server handles this automatically)
  const addToHistory = useCallback((_query: string) => {
    // This is primarily handled by the search service
    // when a search is performed, but we can trigger a refetch
    // of recent searches to update the UI
    queryClient.invalidateQueries({ queryKey: ['recent-searches'] });
  }, [queryClient]);

  // Save search
  const saveSearch = useCallback(async (searchData: SavedSearchData & { name?: string }) => {
    return await saveSearchMutation.mutateAsync(searchData);
  }, [saveSearchMutation]);

  // Update saved search
  const updateSavedSearch = useCallback(async (
    id: string,
    data: Partial<SavedSearchData> & { name?: string }
  ) => {
    return await updateSavedSearchMutation.mutateAsync({ id, data });
  }, [updateSavedSearchMutation]);

  // Delete saved search
  const deleteSavedSearch = useCallback(async (id: string) => {
    return await deleteSavedSearchMutation.mutateAsync(id);
  }, [deleteSavedSearchMutation]);

  // Remove from history (clear all recent for now)
  const removeFromHistory = useCallback(async () => {
    return await clearRecentMutation.mutateAsync();
  }, [clearRecentMutation]);

  // Get recent queries from service
  const getRecentQueries = useCallback(() => {
    return searchService.getRecentQueries(workspaceId);
  }, [workspaceId]);

  return {
    // Data
    recentSearches,
    savedSearches,
    
    // Loading states
    isLoadingRecent,
    isLoadingSaved,
    isSaving: saveSearchMutation.isPending,
    isUpdating: updateSavedSearchMutation.isPending,
    isDeleting: deleteSavedSearchMutation.isPending,
    isClearing: clearRecentMutation.isPending,
    
    // Actions
    addToHistory,
    saveSearch,
    updateSavedSearch,
    deleteSavedSearch,
    removeFromHistory,
    getRecentQueries,
  };
}

export default useSearchHistory;