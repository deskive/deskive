/**
 * Search History Hook
 * Manages search history and saved searches with backend integration
 */

import { useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSearchStore } from '../../stores/searchStore';
import {
  getRecentSearches,
  getPopularSearches,
  clearSearchHistory,
} from '../../services/searchService';
import type { SavedSearch, UseSearchHistoryReturn, RecentSearch } from '../../types/search';
import { generateId } from '../../lib/search/searchUtils';

export function useSearchHistory(): UseSearchHistoryReturn {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const {
    recentSearches,
    savedSearches,
    addToHistory: addToHistoryStore,
    removeFromHistory: removeFromHistoryStore,
    addSavedSearch,
    updateSavedSearch: updateSavedSearchStore,
    removeSavedSearch: removeSavedSearchStore,
    setRecentSearches,
  } = useSearchStore();

  // Load recent searches from backend on mount
  useEffect(() => {
    if (workspaceId) {
      getRecentSearches(workspaceId, 10)
        .then((response) => {
          const searches: RecentSearch[] = response.data.map((item) => ({
            query: item.query,
            timestamp: new Date(item.created_at),
            resultsCount: item.result_count,
          }));
          setRecentSearches(searches);
        })
        .catch((error) => {
          console.error('[useSearchHistory] Error loading recent searches:', error);
        });
    }
  }, [workspaceId, setRecentSearches]);

  const addToHistory = useCallback(
    (query: string) => {
      addToHistoryStore(query);
    },
    [addToHistoryStore]
  );

  const removeFromHistory = useCallback(
    (query: string) => {
      removeFromHistoryStore(query);
    },
    [removeFromHistoryStore]
  );

  const saveSearch = useCallback(
    async (search: Omit<SavedSearch, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newSearch: SavedSearch = {
        ...search,
        id: generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      addSavedSearch(newSearch);
    },
    [addSavedSearch]
  );

  const updateSavedSearch = useCallback(
    async (id: string, updates: Partial<SavedSearch>) => {
      updateSavedSearchStore(id, updates);
    },
    [updateSavedSearchStore]
  );

  const deleteSavedSearch = useCallback(
    async (id: string) => {
      removeSavedSearchStore(id);
    },
    [removeSavedSearchStore]
  );

  const shareSavedSearch = useCallback(
    async (id: string, userIds: string[]) => {
      updateSavedSearchStore(id, { sharedWith: userIds });
    },
    [updateSavedSearchStore]
  );

  const getSearchAnalytics = useCallback(async () => {
    // Return mock analytics data
    return {
      totalSearches: Math.floor(Math.random() * 10000) + 5000,
      searchGrowth: Math.floor(Math.random() * 40) - 10,
      avgResults: Math.floor(Math.random() * 100) + 50,
      successRate: Math.floor(Math.random() * 30) + 70,
      avgSearchTime: Math.floor(Math.random() * 100) + 50,
      fastestSearch: Math.floor(Math.random() * 30) + 10,
      slowestSearch: Math.floor(Math.random() * 500) + 200,
      totalDocuments: Math.floor(Math.random() * 100000) + 50000,
      indexSize: `${Math.floor(Math.random() * 500) + 100} MB`,
      lastIndexUpdate: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      mostActiveDay: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][Math.floor(Math.random() * 5)],
      peakHour: `${Math.floor(Math.random() * 12) + 1}:00 ${Math.random() > 0.5 ? 'PM' : 'AM'}`,
      avgDailySearches: Math.floor(Math.random() * 500) + 100,
      topSearches: [
        { query: 'project roadmap', count: 234 },
        { query: 'meeting notes', count: 189 },
        { query: 'Q4 budget', count: 156 },
      ],
      topUsers: [
        { name: 'Sarah Johnson', searchCount: 456 },
        { name: 'Mike Wilson', searchCount: 342 },
      ],
      peakHours: [
        { time: '9:00 AM', percentage: 85 },
        { time: '10:00 AM', percentage: 95 },
      ],
      searchModes: [
        { mode: 'hybrid' as const, percentage: 45 },
        { mode: 'full-text' as const, percentage: 35 },
        { mode: 'semantic' as const, percentage: 20 },
      ],
      contentTypes: [
        { type: 'files', percentage: 35, count: 3456 },
        { type: 'messages', percentage: 30, count: 2890 },
      ],
      topContent: [
        { title: 'Q4 Financial Report.pdf', type: 'file', views: 234, searchCount: 45 },
      ],
    };
  }, []);

  const getFrequentSearches = useCallback(async () => {
    if (!workspaceId) {
      return [];
    }

    try {
      const response = await getPopularSearches(workspaceId, 10);
      return response.data;
    } catch (error) {
      console.error('[useSearchHistory] Error getting popular searches:', error);
      return [];
    }
  }, [workspaceId]);

  return {
    recentSearches,
    savedSearches,
    frequentSearches: [],
    addToHistory,
    saveSearch,
    updateSavedSearch,
    deleteSavedSearch,
    shareSavedSearch,
    removeFromHistory,
    getSearchAnalytics,
    getFrequentSearches,
  };
}
