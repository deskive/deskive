import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import {
  Search,
  Brain,
  Sparkles,
  Filter,
  History,
  BookmarkPlus,
  Clock,
  FileText,
  Target,
  Folder,
  Hash,
  MessageSquare,
  Loader2,
  Mic,
  X,
  ChevronDown,
  ChevronUp,
  Star,
  MoreHorizontal,
  Eye,
  Share2,
  Zap,
  Calendar,
  Users
} from 'lucide-react';
import type {
  SearchResult,
  SearchQuery,
  SearchFilters,
  SearchMode
} from '../../types/search';

interface AISearchInterfaceProps {
  onResultSelect?: (result: SearchResult) => void;
  initialQuery?: string;
  embedded?: boolean;
}

export default function AISearchInterface({
  onResultSelect,
  initialQuery = '',
  embedded = false
}: AISearchInterfaceProps) {
  // State management
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [searchMode, setSearchMode] = useState<SearchMode>('hybrid');
  const [showFilters, setShowFilters] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  const [isVoiceSearch, setIsVoiceSearch] = useState(false);
  const [searchHistory, setSearchHistory] = useState<{ query: string; timestamp: Date; results: number }[]>([]);

  // Filters state
  const [filters, setFilters] = useState<SearchFilters>({
    type: undefined,
    dateRange: undefined,
    authors: [],
    projects: [],
    tags: [],
    fileTypes: [],
  });

  // Advanced options
  const [includeArchived, setIncludeArchived] = useState(false);
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'title'>('relevance');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [limit, setLimit] = useState(20);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Placeholder function for search (to be connected to backend later)
  const performSearch = useCallback(async (searchQuery: string, searchFilters?: SearchFilters) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // TODO: Connect to backend API
      console.log('Performing search:', { searchQuery, searchFilters, searchMode });

      // Mock results for now
      const mockResults: SearchResult[] = [
        {
          id: '1',
          type: 'message',
          title: 'Team Standup Notes',
          snippet: 'Discussed project timeline and deliverables...',
          author: { id: '1', name: 'John Doe', email: 'john@example.com' },
          highlights: ['<mark>project</mark> timeline', 'deliverables'],
          relevanceScore: 0.95,
          updatedAt: new Date().toISOString(),
          channel: 'general',
          channelType: 'public',
          timestamp: new Date().toISOString(),
          source: 'deskive',
          metadata: {
            channelId: 'general',
            authorName: 'John Doe',
          }
        },
        {
          id: '2',
          type: 'file',
          title: 'Q3 Budget Report.pdf',
          snippet: 'Financial overview for Q3 2024...',
          author: { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
          highlights: [],
          relevanceScore: 0.88,
          updatedAt: new Date(Date.now() - 86400000).toISOString(),
          fileType: 'application/pdf',
          fileSize: 2048000,
          filePath: '/files/Q3-Budget-Report.pdf',
          source: 'deskive',
          metadata: {
            authorName: 'Jane Smith',
          }
        }
      ];

      setResults(mockResults);

      // Add to search history
      setSearchHistory(prev => [{
        query: searchQuery,
        timestamp: new Date(),
        results: mockResults.length,
      }, ...prev.slice(0, 19)]);

      // Add to recent searches
      setRecentSearches(prev => {
        const filtered = prev.filter(q => q !== searchQuery);
        return [searchQuery, ...filtered].slice(0, 10);
      });

    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchMode, filters, sortBy, sortOrder, limit, includeArchived]);

  // Get search suggestions
  const getSuggestions = useCallback(async (partial: string) => {
    if (!partial.trim() || partial.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      // TODO: Connect to backend API
      console.log('Getting suggestions for:', partial);

      // Mock suggestions
      const mockSuggestions = [
        'project roadmap 2024',
        'project status update',
        'project planning docs'
      ];

      setSuggestions(mockSuggestions);
    } catch (error) {
      console.error('Failed to get suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  // Handle input change with debounced suggestions
  const handleInputChange = useCallback((value: string) => {
    setQuery(value);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Get suggestions after delay
    searchTimeoutRef.current = setTimeout(() => {
      getSuggestions(value);
    }, 300);
  }, [getSuggestions]);

  // Handle search submission
  const handleSearch = useCallback((searchQuery?: string) => {
    const finalQuery = searchQuery || query;
    performSearch(finalQuery);
    setSuggestions([]);
  }, [query, performSearch]);

  // Save search
  const saveSearch = useCallback(async () => {
    if (!query.trim()) return;

    try {
      // TODO: Connect to backend API
      console.log('Save search:', query);
    } catch (error) {
      console.error('Failed to save search:', error);
    }
  }, [query]);

  // Voice search placeholder
  const handleVoiceSearch = useCallback(() => {
    setIsVoiceSearch(true);
    // Voice search implementation would go here
    setTimeout(() => {
      setIsVoiceSearch(false);
      setQuery('voice search result');
    }, 2000);
  }, []);

  // Auto-search on initial query
  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, [initialQuery, performSearch]);

  // Smart filter suggestions based on results
  const getSmartFilterSuggestions = () => {
    const suggestions = [];
    const types = new Set(results.map(r => r.type));
    const tags = new Set(results.flatMap(r => r.metadata?.tags || []));

    if (types.size > 1) {
      suggestions.push({
        label: `Filter by type (${types.size} types found)`,
        action: () => setShowFilters(true),
      });
    }

    if (tags.size > 0) {
      suggestions.push({
        label: `Filter by tags (${tags.size} tags found)`,
        action: () => setShowFilters(true),
      });
    }

    return suggestions;
  };

  return (
    <div className={`w-full ${embedded ? '' : 'max-w-6xl mx-auto p-4'} space-y-4`}>
      {/* Search Header */}
      <Card className={embedded ? 'border-0 shadow-none' : ''}>
        <CardContent className="p-4">
          {/* Main Search Bar */}
          <div className="relative">
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search across all content with AI..."
                  className="pl-10 pr-12"
                />
                {query && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                    onClick={() => {
                      setQuery('');
                      setResults([]);
                      setSuggestions([]);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <Button
                onClick={handleVoiceSearch}
                variant="outline"
                size="sm"
                disabled={isVoiceSearch}
                className="flex items-center gap-2"
              >
                {isVoiceSearch ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>

              <Button
                onClick={() => handleSearch()}
                disabled={isSearching || !query.trim()}
                className="flex items-center gap-2"
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4" />
                )}
                {isSearching ? 'Searching...' : 'AI Search'}
              </Button>
            </div>

            {/* Suggestions Dropdown */}
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                    onClick={() => {
                      setQuery(suggestion);
                      handleSearch(suggestion);
                    }}
                  >
                    <Sparkles className="h-3 w-3 text-purple-500" />
                    <span className="text-sm">{suggestion}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search Options */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-4">
              <Select value={searchMode} onValueChange={(value: SearchMode) => setSearchMode(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full-text">Keyword</SelectItem>
                  <SelectItem value="semantic">Semantic</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
                {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={saveSearch}
                disabled={!query.trim()}
                className="flex items-center gap-2"
              >
                <BookmarkPlus className="h-4 w-4" />
                Save
              </Button>
            </div>

            {results.length > 0 && (
              <div className="text-sm text-gray-500">
                {results.length} results in {isSearching ? '...' : '0.2s'}
              </div>
            )}
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Content Types */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Content Types</Label>
                  <div className="space-y-1">
                    {['message', 'file', 'note', 'task', 'project', 'event'].map(type => (
                      <div key={type} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={type}
                          checked={filters.type === type || false}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFilters(prev => ({ ...prev, type: type as any }));
                            } else {
                              setFilters(prev => ({ ...prev, type: undefined }));
                            }
                          }}
                        />
                        <Label htmlFor={type} className="text-sm capitalize">
                          {type}s
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Date Range */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Time Period</Label>
                  <Select onValueChange={(value) => {
                    const now = new Date();
                    let start: Date | undefined;

                    switch (value) {
                      case 'today':
                        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        break;
                      case 'week':
                        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        break;
                      case 'month':
                        start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                        break;
                      case 'year':
                        start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
                        break;
                    }

                    setFilters(prev => ({
                      ...prev,
                      dateRange: start ? { from: start, to: now } : undefined
                    }));
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">Past week</SelectItem>
                      <SelectItem value="month">Past month</SelectItem>
                      <SelectItem value="year">Past year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort Options */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Sort By</Label>
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevance">Relevance</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="title">Title</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="include-archived"
                    checked={includeArchived}
                    onCheckedChange={setIncludeArchived}
                  />
                  <Label htmlFor="include-archived" className="text-sm">
                    Include archived content
                  </Label>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilters({});
                    setIncludeArchived(false);
                    setSortBy('relevance');
                    setSortOrder('desc');
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Search Results */}
        <div className="lg:col-span-3">
          {/* Smart Filter Suggestions */}
          {results.length > 0 && !showFilters && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                {getSmartFilterSuggestions().map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={suggestion.action}
                    className="flex items-center gap-2"
                  >
                    <Zap className="h-3 w-3" />
                    {suggestion.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          <div className="space-y-3">
            {results.map(result => (
              <SearchResultCard
                key={`${result.type}-${result.id}`}
                result={result}
                onSelect={() => onResultSelect?.(result)}
                query={query}
              />
            ))}

            {results.length === 0 && query && !isSearching && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Search className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">No results found</h3>
                  <p className="text-gray-500 mb-4">
                    Try adjusting your search terms or filters
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Button variant="outline" size="sm" onClick={() => setSearchMode('semantic')}>
                      Try Semantic Search
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowFilters(true)}>
                      Adjust Filters
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <History className="h-4 w-4" />
                  Recent Searches
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recentSearches.slice(0, 5).map((search, index) => (
                  <button
                    key={index}
                    className="w-full text-left text-sm p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded flex items-center gap-2"
                    onClick={() => {
                      setQuery(search);
                      handleSearch(search);
                    }}
                  >
                    <Clock className="h-3 w-3 text-gray-400" />
                    <span className="truncate">{search}</span>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Saved Searches */}
          {savedSearches.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <BookmarkPlus className="h-4 w-4" />
                  Saved Searches
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {savedSearches.slice(0, 5).map((search, index) => (
                  <button
                    key={index}
                    className="w-full text-left text-sm p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded flex items-center gap-2"
                    onClick={() => {
                      setQuery(search.query.query);
                      setFilters(search.query.filters || {});
                      handleSearch(search.query.query);
                    }}
                  >
                    <Star className="h-3 w-3 text-yellow-500" />
                    <span className="truncate">{search.name}</span>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Search Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4" />
                Search Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
              <div className="space-y-1">
                <p><strong>Semantic mode:</strong> "Find documents about project planning"</p>
                <p><strong>Filters:</strong> Use filters to narrow down results by type, date, or tags</p>
                <p><strong>Keywords:</strong> Use quotes for exact phrases: "quarterly report"</p>
                <p><strong>Voice:</strong> Click the microphone to search by voice</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Search Result Card Component
interface SearchResultCardProps {
  result: SearchResult;
  onSelect: () => void;
  query: string;
}

function SearchResultCard({ result, onSelect, query }: SearchResultCardProps) {
  const getResultIcon = (type: string) => {
    const iconMap = {
      message: <MessageSquare className="h-4 w-4 text-blue-500" />,
      file: <FileText className="h-4 w-4 text-gray-500" />,
      note: <FileText className="h-4 w-4 text-green-500" />,
      task: <Target className="h-4 w-4 text-orange-500" />,
      project: <Folder className="h-4 w-4 text-purple-500" />,
      event: <Calendar className="h-4 w-4 text-red-500" />,
      user: <Users className="h-4 w-4 text-indigo-500" />,
      channel: <Hash className="h-4 w-4 text-gray-600" />,
    };
    return iconMap[type as keyof typeof iconMap] || <FileText className="h-4 w-4" />;
  };

  const formatDate = (dateInput: string | Date | undefined) => {
    if (!dateInput) return 'Unknown';
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onSelect}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="mt-1">
            {getResultIcon(result.type)}
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm line-clamp-1">
                {result.highlights?.[0] ? (
                  <span dangerouslySetInnerHTML={{ __html: result.highlights[0] }} />
                ) : (
                  result.title
                )}
              </h3>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Badge variant="outline" className="text-xs capitalize">
                  {result.type}
                </Badge>
                <span>{formatDate(result.updatedAt)}</span>
              </div>
            </div>

            {result.snippet && (
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {result.highlights?.[1] ? (
                  <span dangerouslySetInnerHTML={{ __html: result.highlights[1] }} />
                ) : (
                  result.snippet
                )}
              </p>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                {result.metadata?.channelId && (
                  <>
                    <span>in</span>
                    <Badge variant="outline" className="text-xs">
                      Channel
                    </Badge>
                  </>
                )}
                {result.metadata?.authorName && (
                  <span>by {result.metadata.authorName}</span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Eye className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Share2 className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
