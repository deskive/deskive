import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useIntl } from 'react-intl';
import {
  Search,
  Filter,
  Sparkles,
  Mic,
  X,
  TrendingUp,
  Clock,
  FileText,
  MessageSquare,
  Calendar,
  Video,
  FolderOpen,
  StickyNote,
  BarChart3,
  Save,
  Share2,
  History,
  Mail
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { cn } from '../../lib/utils';
import { useUniversalSearch } from '../../hooks/search/useUniversalSearch';
import { useSearchSuggestions } from '../../hooks/search/useSearchSuggestions';
import { useSearchHistory } from '../../hooks/search/useSearchHistory';
import { useSearchStore } from '../../stores/searchStore';
import { SearchFilters } from './SearchFilters';
import { SearchResults } from './SearchResults';
import { SearchAnalytics } from './SearchAnalytics';
import { SavedSearches } from './SavedSearches';
import { VoiceSearchModal } from './VoiceSearchModal';
import { SearchSuggestions } from './SearchSuggestions';
import { SaveSearchModal } from './SaveSearchModal';
import { createSavedSearch, getSavedSearchById } from '../../services/searchService';
import { toast } from 'sonner';
import type { SearchType, SearchMode } from '../../types/search';

export function UniversalSearchView() {
  const intl = useIntl();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const loadedSavedSearchIdRef = useRef<string | null>(null);
  const isLoadingFromSavedSearchRef = useRef(false);

  const {
    query,
    searchType,
    searchMode,
    filters,
    isFocused,
    showFilters,
    showVoiceSearch,
    showAnalytics,
    showSavedSearches,
    selectedTab,
    setQuery,
    setSearchType,
    setSearchMode,
    updateFilters,
    setIsFocused,
    setShowFilters,
    setShowVoiceSearch,
    setShowAnalytics,
    setShowSavedSearches,
    setSelectedTab,
    addSavedSearch,
    setResults,
  } = useSearchStore();

  const {
    results,
    isSearching,
    totalResults,
    relevanceScore,
    search,
    clearResults,
  } = useUniversalSearch();

  const {
    suggestions,
    isLoadingSuggestions,
    getSuggestions,
    clearSuggestions,
  } = useSearchSuggestions();

  const {
    recentSearches,
    savedSearches,
    addToHistory,
    saveSearch,
  } = useSearchHistory();

  // Load saved search if savedSearchId is in URL
  useEffect(() => {
    const savedSearchId = searchParams.get('savedSearchId');

    // Only load if we haven't loaded this specific savedSearchId yet
    if (savedSearchId && workspaceId && loadedSavedSearchIdRef.current !== savedSearchId) {
      console.log('[UniversalSearchView] Loading saved search:', savedSearchId);

      // Mark that we're loading this savedSearchId
      loadedSavedSearchIdRef.current = savedSearchId;

      // Set flag to prevent automatic search while loading
      isLoadingFromSavedSearchRef.current = true;

      // Load the saved search
      getSavedSearchById(workspaceId, savedSearchId)
        .then((savedSearch) => {
          console.log('[UniversalSearchView] Loaded saved search data:', savedSearch);

          // Set query and filters from saved search
          setQuery(savedSearch.query);
          setSearchType(savedSearch.type as SearchType);
          setSearchMode(savedSearch.mode as SearchMode);
          updateFilters(savedSearch.filters);

          // Display the saved results snapshot
          if (savedSearch.results_snapshot && savedSearch.results_snapshot.length > 0) {
            console.log('[UniversalSearchView] Loading results snapshot:', savedSearch.results_snapshot.length, 'items');

            // Transform the snapshot to match the expected results format
            const transformedResults = {
              all: savedSearch.results_snapshot,
              [savedSearch.type]: savedSearch.results_snapshot,
            };

            // Set results directly without triggering a new search
            setResults(transformedResults);

            toast.success(`Loaded saved search: ${savedSearch.name}`);
          }

          // After a short delay, allow automatic search again (for user edits)
          setTimeout(() => {
            isLoadingFromSavedSearchRef.current = false;
          }, 500);
        })
        .catch((error) => {
          console.error('Failed to load saved search:', error);
          toast.error('Failed to load saved search');
          isLoadingFromSavedSearchRef.current = false;
        });
    }

    // Reset the loaded ref when there's no savedSearchId
    if (!savedSearchId) {
      loadedSavedSearchIdRef.current = null;
    }
  }, [searchParams, workspaceId, setQuery, setSearchType, setSearchMode, updateFilters, setResults]);

  // Debounced search - Skip if we're loading from a saved search
  useEffect(() => {
    // Skip this search if we're currently loading from a saved search
    if (isLoadingFromSavedSearchRef.current) {
      console.log('[UniversalSearchView] Skipping automatic search (loading from saved search)');
      return;
    }

    if (query.length > 2) {
      const timer = setTimeout(() => {
        console.log('[UniversalSearchView] Triggering search for query:', query);
        search({
          query,
          type: searchType,
          mode: searchMode,
          filters,
        });
        addToHistory(query);
      }, 300);
      return () => clearTimeout(timer);
    } else if (query.length === 0) {
      clearResults();
    }
  }, [query, searchType, searchMode, filters, search, clearResults, addToHistory]);

  // Get suggestions as user types
  useEffect(() => {
    if (query.length > 1 && isFocused) {
      const timer = setTimeout(() => {
        getSuggestions(query, searchType);
      }, 200);
      return () => clearTimeout(timer);
    } else {
      clearSuggestions();
    }
  }, [query, searchType, isFocused, getSuggestions, clearSuggestions]);

  const handleVoiceSearch = (transcript: string) => {
    setQuery(transcript);
    setShowVoiceSearch(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setIsFocused(false);
  };

  const handleSaveSearch = async (name: string, tags: string[]) => {
    if (!query || !workspaceId) return;

    try {
      // Get current results to save as snapshot
      const resultsSnapshot = results.all || [];

      const response = await createSavedSearch(workspaceId, {
        name,
        query,
        type: searchType,
        mode: searchMode,
        filters,
        resultsSnapshot,
        tags,
      });

      // Add to local store
      addSavedSearch(response.data);

      toast.success('Search saved successfully!');
    } catch (error: any) {
      console.error('Failed to save search:', error);
      toast.error(error.message || 'Failed to save search');
    }
  };

  const searchTypeConfig = {
    all: { icon: Search, label: intl.formatMessage({ id: 'modules.search.filters.all', defaultMessage: 'All' }), color: 'text-gray-600' },
    messages: { icon: MessageSquare, label: intl.formatMessage({ id: 'modules.search.filters.messages', defaultMessage: 'Messages' }), color: 'text-blue-600' },
    files: { icon: FileText, label: intl.formatMessage({ id: 'modules.search.filters.files', defaultMessage: 'Files' }), color: 'text-green-600' },
    folders: { icon: FolderOpen, label: intl.formatMessage({ id: 'modules.search.filters.folders', defaultMessage: 'Folders' }), color: 'text-orange-600' },
    projects: { icon: FolderOpen, label: intl.formatMessage({ id: 'modules.search.filters.projects', defaultMessage: 'Projects' }), color: 'text-purple-600' },
    notes: { icon: StickyNote, label: intl.formatMessage({ id: 'modules.search.filters.notes', defaultMessage: 'Notes' }), color: 'text-yellow-600' },
    calendar: { icon: Calendar, label: intl.formatMessage({ id: 'modules.search.filters.calendar', defaultMessage: 'Calendar' }), color: 'text-red-600' },
    emails: { icon: Mail, label: intl.formatMessage({ id: 'modules.search.filters.emails', defaultMessage: 'Emails' }), color: 'text-pink-600' },
    // videos: { icon: Video, label: 'Videos', color: 'text-indigo-600' },
  };

  return (
    <div className="flex h-full bg-background">
      <div className="flex-1 flex flex-col">
        {/* Search Header */}
        <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 border-b">
          <div className="p-6">
            {/* Search Input */}
            <div className="max-w-4xl mx-auto">
              <div className="relative">
                <div className="relative flex items-center">
                  <Search className="absolute left-4 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={intl.formatMessage({ id: 'modules.search.placeholder', defaultMessage: 'Search across all your workspace content...' })}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                    className="pl-12 pr-32 h-14 text-lg"
                  />
                  <div className="absolute right-2 flex items-center gap-2">
                    {query && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setQuery('')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    {/* <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowVoiceSearch(true)}
                    >
                      <Mic className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={showFilters ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                    >
                      <Filter className="h-4 w-4" />
                    </Button> */}
                  </div>
                </div>

                {/* Search Suggestions Dropdown */}
                {isFocused && (suggestions.length > 0 || recentSearches.length > 0) && (
                  <SearchSuggestions
                    suggestions={suggestions}
                    recentSearches={recentSearches}
                    onSelect={handleSuggestionClick}
                    isLoading={isLoadingSuggestions}
                  />
                )}
              </div>

              {/* Search Type Tabs */}
              <div className="mt-6 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                <Tabs value={searchType} onValueChange={(value) => setSearchType(value as SearchType)} className="w-full xl:w-auto">
                  <TabsList className="h-auto p-1 inline-flex overflow-x-auto flex-nowrap w-full xl:w-auto">
                    {Object.entries(searchTypeConfig).map(([key, config]) => {
                      const Icon = config.icon;
                      return (
                        <TabsTrigger
                          key={key}
                          value={key}
                          className="flex items-center gap-1.5 px-4 py-2 flex-shrink-0 whitespace-nowrap min-w-fit"
                        >
                          <Icon className={cn("h-4 w-4", config.color)} />
                          <span className="hidden sm:inline">{config.label}</span>
                          <span className="sm:hidden">{config.label.slice(0, 3)}</span>
                          {results[key]?.length && results[key]?.length > 0 && (
                            <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                              {results[key]?.length}
                            </Badge>
                          )}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </Tabs>

                {/* Search Mode & Actions */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                    <Button
                      variant={searchMode === 'full-text' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setSearchMode('full-text')}
                      className="h-7 px-2"
                    >
                      {intl.formatMessage({ id: 'modules.search.actions.text', defaultMessage: 'Text' })}
                    </Button>
                    {/* <Button
                      variant={searchMode === 'semantic' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setSearchMode('semantic')}
                      className="h-7 px-2"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      AI
                    </Button>
                    <Button
                      variant={searchMode === 'hybrid' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setSearchMode('hybrid')}
                      className="h-7 px-2"
                    >
                      Hybrid
                    </Button> */}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSaveModal(true)}
                      disabled={!query || totalResults === 0}
                      className="h-8"
                    >
                      <Save className="h-4 w-4" />
                      <span className="hidden lg:inline ml-1">{intl.formatMessage({ id: 'modules.search.actions.save', defaultMessage: 'Save' })}</span>
                    </Button>
                   {/*  <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSavedSearches(!showSavedSearches)}
                      className="h-8"
                    >
                      <History className="h-4 w-4" />
                      <span className="hidden lg:inline ml-1">History</span>
                    </Button> */}
                    {/* <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAnalytics(!showAnalytics)}
                      className="h-8"
                    >
                      <BarChart3 className="h-4 w-4" />
                      <span className="hidden lg:inline ml-1">Analytics</span>
                    </Button> */}
                  </div>
                </div>
              </div>

              {/* Search Stats */}
              {query && totalResults > 0 && (
                <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span>{totalResults.toLocaleString()} results found</span>
                    {relevanceScore && (
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {Math.round(relevanceScore * 100)}% relevance
                      </span>
                    )}
                    {isSearching && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 animate-spin" />
                        Searching...
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {/* Share search results */}}
                  >
                    <Share2 className="h-4 w-4 mr-1" />
                    Share Results
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="border-t bg-muted/50">
              <div className="max-w-4xl mx-auto p-4">
                <SearchFilters
                  filters={filters}
                  onFiltersChange={updateFilters}
                  searchType={searchType}
                />
              </div>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {showSavedSearches ? (
            <SavedSearches
              savedSearches={savedSearches}
              onSelect={(saved) => {
                setQuery(saved.query);
                setSearchType(saved.type as SearchType);
                setSearchMode(saved.mode as SearchMode);
                updateFilters(saved.filters);
                setShowSavedSearches(false);
              }}
              onClose={() => setShowSavedSearches(false)}
            />
          ) : showAnalytics ? (
            <SearchAnalytics onClose={() => setShowAnalytics(false)} />
          ) : (
            <SearchResults
              results={results}
              searchType={searchType}
              isLoading={isSearching}
              searchQuery={query}
              onSearchTypeChange={setSearchType}
            />
          )}
        </div>
      </div>

      {/* Voice Search Modal */}
      <VoiceSearchModal
        isOpen={showVoiceSearch}
        onClose={() => setShowVoiceSearch(false)}
        onTranscript={handleVoiceSearch}
      />

      {/* Save Search Modal */}
      <SaveSearchModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveSearch}
        defaultQuery={query}
      />
    </div>
  );
}
