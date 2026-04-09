/**
 * Search Store - Zustand State Management
 * Handles all search-related state and operations
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  SearchType,
  SearchMode,
  SearchFilters,
  SearchResults,
  SearchSuggestion,
  RecentSearch,
  SavedSearch,
} from '../types/search';

interface SearchState {
  // Search query state
  query: string;
  searchType: SearchType;
  searchMode: SearchMode;
  filters: SearchFilters;

  // Results state
  results: SearchResults;
  isSearching: boolean;
  totalResults: number;
  relevanceScore?: number;

  // Suggestions state
  suggestions: SearchSuggestion[];
  isLoadingSuggestions: boolean;

  // History state
  recentSearches: RecentSearch[];
  savedSearches: SavedSearch[];

  // UI state
  isFocused: boolean;
  showFilters: boolean;
  showVoiceSearch: boolean;
  showAnalytics: boolean;
  showSavedSearches: boolean;
  selectedTab: string;

  // Actions
  setQuery: (query: string) => void;
  setSearchType: (type: SearchType) => void;
  setSearchMode: (mode: SearchMode) => void;
  updateFilters: (filters: SearchFilters) => void;
  clearFilters: () => void;

  setResults: (results: SearchResults) => void;
  clearResults: () => void;
  setIsSearching: (isSearching: boolean) => void;

  setSuggestions: (suggestions: SearchSuggestion[]) => void;
  clearSuggestions: () => void;
  setIsLoadingSuggestions: (isLoading: boolean) => void;

  addToHistory: (query: string) => void;
  removeFromHistory: (query: string) => void;
  clearHistory: () => void;
  setRecentSearches: (searches: RecentSearch[]) => void;

  addSavedSearch: (search: SavedSearch) => void;
  updateSavedSearch: (id: string, updates: Partial<SavedSearch>) => void;
  removeSavedSearch: (id: string) => void;
  setSavedSearches: (searches: SavedSearch[]) => void;

  setIsFocused: (focused: boolean) => void;
  setShowFilters: (show: boolean) => void;
  setShowVoiceSearch: (show: boolean) => void;
  setShowAnalytics: (show: boolean) => void;
  setShowSavedSearches: (show: boolean) => void;
  setSelectedTab: (tab: string) => void;

  // Reset all state
  reset: () => void;
}

const initialState = {
  query: '',
  searchType: 'all' as SearchType,
  searchMode: 'hybrid' as SearchMode,
  filters: {},
  results: {},
  isSearching: false,
  totalResults: 0,
  relevanceScore: undefined,
  suggestions: [],
  isLoadingSuggestions: false,
  recentSearches: [],
  savedSearches: [],
  isFocused: false,
  showFilters: false,
  showVoiceSearch: false,
  showAnalytics: false,
  showSavedSearches: false,
  selectedTab: 'universal-search',
};

export const useSearchStore = create<SearchState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Query actions
      setQuery: (query) => set({ query }),

      setSearchType: (searchType) => set({ searchType }),

      setSearchMode: (searchMode) => set({ searchMode }),

      updateFilters: (filters) => set({ filters }),

      clearFilters: () => set({ filters: {} }),

      // Results actions
      setResults: (results) => {
        // Only count the 'all' array to avoid double counting
        const totalResults = results.all?.length || 0;
        set({ results, totalResults });
      },

      clearResults: () => set({ results: {}, totalResults: 0, relevanceScore: undefined }),

      setIsSearching: (isSearching) => set({ isSearching }),

      // Suggestions actions
      setSuggestions: (suggestions) => set({ suggestions }),

      clearSuggestions: () => set({ suggestions: [] }),

      setIsLoadingSuggestions: (isLoadingSuggestions) => set({ isLoadingSuggestions }),

      // History actions
      addToHistory: (query) => {
        const { recentSearches } = get();
        const newSearch: RecentSearch = {
          query,
          timestamp: new Date(),
        };

        // Remove duplicate if exists
        const filtered = recentSearches.filter((s) => s.query !== query);

        // Add to beginning, keep last 20
        const updated = [newSearch, ...filtered].slice(0, 20);

        set({ recentSearches: updated });
      },

      removeFromHistory: (query) => {
        const { recentSearches } = get();
        set({
          recentSearches: recentSearches.filter((s) => s.query !== query),
        });
      },

      clearHistory: () => set({ recentSearches: [] }),

      setRecentSearches: (searches) => set({ recentSearches: searches }),

      // Saved searches actions
      addSavedSearch: (search) => {
        const { savedSearches } = get();
        set({ savedSearches: [...savedSearches, search] });
      },

      updateSavedSearch: (id, updates) => {
        const { savedSearches } = get();
        set({
          savedSearches: savedSearches.map((s) =>
            s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
          ),
        });
      },

      removeSavedSearch: (id) => {
        const { savedSearches } = get();
        set({
          savedSearches: savedSearches.filter((s) => s.id !== id),
        });
      },

      setSavedSearches: (searches) => set({ savedSearches: searches }),

      // UI actions
      setIsFocused: (isFocused) => set({ isFocused }),

      setShowFilters: (showFilters) => set({ showFilters }),

      setShowVoiceSearch: (showVoiceSearch) => set({ showVoiceSearch }),

      setShowAnalytics: (showAnalytics) => set({ showAnalytics }),

      setShowSavedSearches: (showSavedSearches) => set({ showSavedSearches }),

      setSelectedTab: (selectedTab) => set({ selectedTab }),

      // Reset
      reset: () => set(initialState),
    }),
    {
      name: 'deskive-search-store',
      partialize: (state) => ({
        // Only persist these fields
        recentSearches: state.recentSearches,
        savedSearches: state.savedSearches,
        searchMode: state.searchMode,
      }),
    }
  )
);
