/**
 * Search Suggestions Hook
 * Provides auto-complete suggestions - TODO: Integrate with real backend API
 */

import { useCallback } from 'react';
import { useSearchStore } from '../../stores/searchStore';
import type { SearchType, UseSearchSuggestionsReturn } from '../../types/search';

export function useSearchSuggestions(): UseSearchSuggestionsReturn {
  const {
    suggestions,
    isLoadingSuggestions,
    setSuggestions,
    setIsLoadingSuggestions,
    clearSuggestions,
  } = useSearchStore();

  const getSuggestions = useCallback(
    async (query: string, type?: SearchType) => {
      if (!query || query.length < 2) {
        clearSuggestions();
        return;
      }

      setIsLoadingSuggestions(true);

      try {
        // TODO: Implement real API call to backend suggestions endpoint
        // Example: const suggestions = await searchApi.getSuggestions(query, type);

        // For now, return empty suggestions
        setSuggestions([]);
      } catch (error) {
        console.error('Suggestions error:', error);
        clearSuggestions();
      } finally {
        setIsLoadingSuggestions(false);
      }
    },
    [setSuggestions, setIsLoadingSuggestions, clearSuggestions]
  );

  return {
    suggestions,
    isLoadingSuggestions,
    getSuggestions,
    clearSuggestions,
  };
}
