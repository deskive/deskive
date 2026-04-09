import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchService } from '@/lib/api/search-api';
import type { SearchSuggestion } from '@/lib/api/search-api';

export interface UseSearchSuggestionsProps {
  workspaceId: string;
  enabled?: boolean;
}

export function useSearchSuggestions({ workspaceId, enabled = true }: UseSearchSuggestionsProps) {
  const [currentInput, setCurrentInput] = useState<string>('');
  const [searchType, setSearchType] = useState<string | undefined>();

  // Search suggestions query
  const {
    data: suggestions = [],
    isLoading: isLoadingSuggestions,
    error,
  } = useQuery({
    queryKey: ['search-suggestions', workspaceId, currentInput, searchType],
    queryFn: async (): Promise<SearchSuggestion[]> => {
      if (!currentInput.trim() || !workspaceId) {
        return [];
      }

      const rawSuggestions = await searchService.getSearchSuggestions(workspaceId, currentInput);
      // Transform string[] to SearchSuggestion[]
      return rawSuggestions.map(text => ({
        text,
        type: 'query' as const,
      }));
    },
    enabled: enabled && !!currentInput.trim() && currentInput.length > 1 && !!workspaceId,
    staleTime: 60000, // 1 minute
    retry: 1,
  });

  // Get suggestions
  const getSuggestions = useCallback((input: string, type?: string) => {
    setCurrentInput(input);
    setSearchType(type);
  }, []);

  // Clear suggestions
  const clearSuggestions = useCallback(() => {
    setCurrentInput('');
    setSearchType(undefined);
  }, []);

  return {
    suggestions,
    isLoadingSuggestions,
    error,
    getSuggestions,
    clearSuggestions,
  };
}

export default useSearchSuggestions;