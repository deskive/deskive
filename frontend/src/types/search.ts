/**
 * Search Module Type Definitions
 * Migrated from Next.js to React+Vite
 */

// ============================================================================
// Core Search Types
// ============================================================================

export type SearchType = 'all' | 'messages' | 'files' | 'folders' | 'projects' | 'notes' | 'calendar' | 'videos' | 'emails';
export type SearchMode = 'full-text' | 'semantic' | 'hybrid';
export type SearchSource = 'deskive' | 'google-drive' | 'google-calendar' | 'gmail' | 'smtp-imap';

// Filter interface for search functionality
export interface SearchFilters {
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  authors?: string[];
  projects?: string[];
  tags?: string[];
  fileTypes?: string[];
  hasAttachments?: boolean;
  isShared?: boolean;
  isStarred?: boolean;
  channels?: string[];
  priority?: 'high' | 'medium' | 'low';
  [key: string]: any; // Allow additional filters
}

export interface SearchQuery {
  query: string;
  type: SearchType;
  mode: SearchMode;
  filters?: SearchFilters;
}

// ============================================================================
// Search Result Types
// ============================================================================

export interface SearchResultAuthor {
  id: string;
  name: string;
  email?: string;
  imageUrl?: string;
}

export interface BaseSearchResult {
  id: string;
  type: string;
  title: string;
  snippet: string;
  author: SearchResultAuthor;
  workspace?: string;
  highlights: string[];
  relevanceScore?: number;
  updatedAt: string | Date;
  metadata?: Record<string, any>;
  source: SearchSource; // Where the result came from (deskive, google-drive, google-calendar)
  externalUrl?: string; // URL to open external content (e.g., Google Drive link)
}

export interface MessageSearchResult extends BaseSearchResult {
  type: 'message';
  channel: string;
  channelType: 'public' | 'private';
  timestamp: string;
  replies?: number;
  reactions?: Array<{ emoji: string; count: number }>;
  mentions?: string[];
  isPinned?: boolean;
  isStarred?: boolean;
  attachments?: number;
}

export interface FileSearchResult extends BaseSearchResult {
  type: 'file';
  fileType: string;
  fileSize: number;
  filePath: string;
  downloadUrl?: string;
  previewUrl?: string;
  sharedWith?: string[];
  parentId?: string; // Parent folder ID
}

export interface FolderSearchResult extends BaseSearchResult {
  type: 'folder';
  parentId?: string;
  itemCount?: number;
  sharedWith?: string[];
}

export interface ProjectSearchResult extends BaseSearchResult {
  type: 'project';
  projectType: 'scrum' | 'kanban' | 'bug-tracking' | 'research' | 'feature-development';
  status: 'active' | 'completed' | 'archived';
  completionRate?: number;
  teamMembers?: string[];
  dueDate?: string;
}

export interface NoteSearchResult extends BaseSearchResult {
  type: 'note';
  category?: string;
  tags: string[];
  wordCount?: number;
  lastEditedBy?: string;
  sharedWith?: string[];
}

export interface CalendarSearchResult extends BaseSearchResult {
  type: 'calendar';
  eventType: string;
  startTime: string;
  endTime: string;
  location?: string;
  attendees?: string[];
  isRecurring?: boolean;
}

export interface VideoSearchResult extends BaseSearchResult {
  type: 'video';
  duration?: number;
  thumbnailUrl?: string;
  participants?: string[];
  recordingUrl?: string;
  transcript?: string;
}

export interface EmailSearchResult extends BaseSearchResult {
  type: 'email';
  from?: {
    email: string;
    name?: string;
  };
  to?: Array<{
    email: string;
    name?: string;
  }>;
  subject?: string;
  date?: string;
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  labelIds?: string[];
  threadId?: string;
}

export type SearchResult =
  | MessageSearchResult
  | FileSearchResult
  | FolderSearchResult
  | ProjectSearchResult
  | NoteSearchResult
  | CalendarSearchResult
  | VideoSearchResult
  | EmailSearchResult;

export interface SearchResults {
  all?: SearchResult[];
  messages?: MessageSearchResult[];
  files?: FileSearchResult[];
  folders?: FolderSearchResult[];
  projects?: ProjectSearchResult[];
  notes?: NoteSearchResult[];
  calendar?: CalendarSearchResult[];
  videos?: VideoSearchResult[];
  emails?: EmailSearchResult[];
  [key: string]: SearchResult[] | undefined;
}

// ============================================================================
// Search Suggestion Types
// ============================================================================

export interface SearchSuggestion {
  text: string;
  type: 'query' | 'person' | 'tag' | 'project' | 'file';
  context?: string;
  score?: number;
  icon?: string;
}

export interface SearchSuggestionsResponse {
  suggestions: SearchSuggestion[];
  isLoading: boolean;
}

// ============================================================================
// Search History Types
// ============================================================================

export interface RecentSearch {
  query: string;
  timestamp: Date;
  type?: SearchType;
  resultsCount?: number;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  type: SearchType;
  mode: SearchMode;
  filters: SearchFilters;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  isNotificationEnabled?: boolean;
  sharedWith?: string[];
}

export interface SearchHistoryData {
  recentSearches: RecentSearch[];
  savedSearches: SavedSearch[];
  frequentSearches?: Array<{ query: string; count: number }>;
}

// ============================================================================
// AI Search Types
// ============================================================================

export type AISearchResultType = 'answer' | 'summary' | 'suggestion' | 'insight' | 'related';

export interface AISearchSource {
  title: string;
  type: string;
  relevance: number;
}

export interface AISearchResult {
  id: string;
  type: AISearchResultType;
  title: string;
  content: string;
  confidence: number;
  sources: AISearchSource[];
  tags: string[];
  helpful?: boolean;
}

export interface AIConversationMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: string;
}

// ============================================================================
// Voice Search Types
// ============================================================================

export type RecordingState = 'idle' | 'recording' | 'processing' | 'completed';

export interface VoiceSearchState {
  recordingState: RecordingState;
  transcript: string;
  confidence: number;
  duration: number;
  isSupported: boolean;
  permissionDenied: boolean;
}

// ============================================================================
// Search Analytics Types
// ============================================================================

export interface SearchAnalytics {
  totalSearches: number;
  searchGrowth: number;
  avgResults: number;
  successRate: number;
  avgSearchTime: number;
  fastestSearch: number;
  slowestSearch: number;
  totalDocuments: number;
  indexSize: string;
  lastIndexUpdate: string;
  mostActiveDay: string;
  peakHour: string;
  avgDailySearches: number;
  topSearches: Array<{ query: string; count: number }>;
  topUsers: Array<{ name: string; searchCount: number }>;
  peakHours: Array<{ time: string; percentage: number }>;
  searchModes: Array<{ mode: SearchMode; percentage: number }>;
  contentTypes: Array<{ type: string; percentage: number; count: number }>;
  topContent: Array<{
    title: string;
    type: string;
    views: number;
    searchCount: number
  }>;
}

// ============================================================================
// Quick Search Types
// ============================================================================

export interface QuickSearchItem {
  id: string;
  type: 'message' | 'file' | 'note' | 'project' | 'calendar' | 'video' | 'user';
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  timestamp?: string;
  path?: string;
  tags?: string[];
  starred?: boolean;
}

export interface PopularSearch {
  query: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
}

export interface SearchShortcut {
  key: string;
  description: string;
  icon: React.ReactNode;
}

export interface SmartSuggestionCategory {
  category: string;
  icon: React.ReactNode;
  suggestions: string[];
}

// ============================================================================
// Message Search Types
// ============================================================================

export interface MessageAuthor {
  name: string;
  avatar: string;
  status: 'online' | 'offline' | 'away';
}

export interface Message {
  id: string;
  content: string;
  author: MessageAuthor;
  channel: string;
  timestamp: string;
  replies?: number;
  reactions?: Array<{ emoji: string; count: number }>;
  attachments?: number;
  isPinned?: boolean;
  isStarred?: boolean;
  mentions?: string[];
}

export interface Channel {
  name: string;
  type: 'public' | 'private';
  unread: number;
  members: number;
}

export interface DirectMessage {
  user: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  status: 'online' | 'offline' | 'away';
}

// ============================================================================
// Search Hook Response Types
// ============================================================================

export interface UseUniversalSearchReturn {
  results: SearchResults;
  isSearching: boolean;
  totalResults: number;
  relevanceScore?: number;
  search: (query: SearchQuery) => Promise<void>;
  clearResults: () => void;
  filters: SearchFilters;
  updateFilters: (filters: SearchFilters) => void;
}

export interface UseSearchSuggestionsReturn {
  suggestions: SearchSuggestion[];
  isLoadingSuggestions: boolean;
  getSuggestions: (query: string, type?: SearchType) => Promise<void>;
  clearSuggestions: () => void;
}

export interface UseSearchHistoryReturn {
  recentSearches: RecentSearch[];
  savedSearches: SavedSearch[];
  frequentSearches: Array<{ query: string; count: number }>;
  addToHistory: (query: string) => void;
  saveSearch: (search: Omit<SavedSearch, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateSavedSearch: (id: string, updates: Partial<SavedSearch>) => Promise<void>;
  deleteSavedSearch: (id: string) => Promise<void>;
  shareSavedSearch: (id: string, userIds: string[]) => Promise<void>;
  removeFromHistory: (query: string) => void;
  getSearchAnalytics: () => Promise<SearchAnalytics>;
  getFrequentSearches: () => Promise<Array<{ query: string; count: number }>>;
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface UniversalSearchViewProps {
  initialQuery?: string;
  initialType?: SearchType;
  initialMode?: SearchMode;
}

export interface SearchResultsProps {
  results: SearchResults;
  searchType: SearchType;
  isLoading: boolean;
  searchQuery: string;
}

export interface SearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  searchType: SearchType;
}

export interface VoiceSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscript: (transcript: string) => void;
}

export interface SearchSuggestionsProps {
  suggestions: SearchSuggestion[];
  recentSearches: RecentSearch[];
  onSelect: (suggestion: string) => void;
  isLoading: boolean;
}

export interface SavedSearchesProps {
  savedSearches: SavedSearch[];
  onSelect: (search: SavedSearch) => void;
  onClose: () => void;
}

export interface SearchAnalyticsProps {
  onClose: () => void;
}

export interface AISearchViewProps {
  initialQuery?: string;
}

// ============================================================================
// Search Context Types
// ============================================================================

export interface SearchContextValue {
  query: string;
  setQuery: (query: string) => void;
  searchType: SearchType;
  setSearchType: (type: SearchType) => void;
  searchMode: SearchMode;
  setSearchMode: (mode: SearchMode) => void;
  filters: SearchFilters;
  updateFilters: (filters: SearchFilters) => void;
  results: SearchResults;
  isSearching: boolean;
  performSearch: () => Promise<void>;
  clearSearch: () => void;
}
