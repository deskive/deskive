import { Clock, TrendingUp, Search, User, Tag, FolderOpen } from 'lucide-react';
import { useIntl } from 'react-intl';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Skeleton } from '../ui/skeleton';
import type { SearchSuggestion, RecentSearch } from '../../types/search';

interface SearchSuggestionsProps {
  suggestions: SearchSuggestion[];
  recentSearches: RecentSearch[];
  onSelect: (suggestion: string) => void;
  isLoading: boolean;
}

export function SearchSuggestions({
  suggestions,
  recentSearches,
  onSelect,
  isLoading
}: SearchSuggestionsProps) {
  const intl = useIntl();

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'query':
        return Search;
      case 'person':
        return User;
      case 'tag':
        return Tag;
      case 'project':
        return FolderOpen;
      default:
        return Search;
    }
  };

  const getSuggestionColor = (type: string) => {
    switch (type) {
      case 'person':
        return 'text-blue-600';
      case 'tag':
        return 'text-green-600';
      case 'project':
        return 'text-purple-600';
      default:
        return 'text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <Card className="absolute top-full left-0 right-0 mt-2 z-50 shadow-lg">
        <CardContent className="p-3 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0 && recentSearches.length === 0) {
    return null;
  }

  return (
    <Card className="absolute top-full left-0 right-0 mt-2 z-50 shadow-lg max-h-96 overflow-y-auto">
      <CardContent className="p-0">
        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="p-3">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                {intl.formatMessage({ id: 'modules.search.suggestions', defaultMessage: 'Suggestions' })}
              </span>
            </div>
            <div className="space-y-1">
              {suggestions.slice(0, 6).map((suggestion, index) => {
                const Icon = getSuggestionIcon(suggestion.type);
                const colorClass = getSuggestionColor(suggestion.type);

                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-2 hover:bg-muted rounded-md cursor-pointer transition-colors"
                    onClick={() => onSelect(suggestion.text)}
                  >
                    <Icon className={`h-4 w-4 ${colorClass}`} />
                    <span className="flex-1 text-sm">{suggestion.text}</span>
                    {suggestion.context && (
                      <Badge variant="outline" className="text-xs">
                        {suggestion.context}
                      </Badge>
                    )}
                    {suggestion.score && (
                      <span className="text-xs text-muted-foreground">
                        {Math.round(suggestion.score * 100)}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Searches */}
        {recentSearches.length > 0 && suggestions.length > 0 && <Separator />}

        {recentSearches.length > 0 && (
          <div className="p-3">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                {intl.formatMessage({ id: 'modules.search.recentSearches', defaultMessage: 'RECENT SEARCHES' })}
              </span>
            </div>
            <div className="space-y-1">
              {recentSearches.slice(0, 5).map((search, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-2 hover:bg-muted rounded-md cursor-pointer transition-colors"
                  onClick={() => onSelect(search.query)}
                >
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 text-sm">{search.query}</span>
                  <span className="text-xs text-muted-foreground">
                    {search.timestamp instanceof Date
                      ? search.timestamp.toLocaleDateString()
                      : new Date(search.timestamp).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
