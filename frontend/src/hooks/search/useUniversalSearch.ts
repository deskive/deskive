/**
 * Universal Search Hook
 * Provides search functionality with real backend API integration
 */

import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useSearchStore } from '../../stores/searchStore';
import {
  universalSearch,
  mapSearchTypes,
  convertFiltersToParams,
  type SearchResultItem
} from '../../services/searchService';
import { googleDriveApi, type GoogleDriveFile } from '../../lib/api/google-drive-api';
import { calendarApi } from '../../lib/api/calendar-api';
import { emailService, type EmailListItem } from '../../lib/api/email-api';
import type {
  SearchQuery,
  UseUniversalSearchReturn,
  SearchResults,
  SearchResult,
  SearchResultAuthor,
  FileSearchResult,
  FolderSearchResult,
  CalendarSearchResult,
  EmailSearchResult
} from '../../types/search';

/**
 * Transform Google Drive file to search result format (merged into files/folders)
 */
const transformDriveFile = (file: GoogleDriveFile): FileSearchResult | FolderSearchResult => {
  const baseResult = {
    id: `drive-${file.id}`, // Prefix to avoid ID conflicts with Deskive files
    title: file.name,
    snippet: `Google Drive • ${file.mimeType}`,
    author: {
      id: 'google-drive',
      name: 'Google Drive',
      email: undefined,
      imageUrl: undefined,
    },
    workspace: undefined,
    highlights: [],
    relevanceScore: undefined,
    updatedAt: file.modifiedTime || file.createdTime || new Date().toISOString(),
    metadata: {
      ...file,
      driveFileType: file.fileType,
      thumbnailLink: file.thumbnailLink,
    },
    source: 'google-drive' as const,
    externalUrl: file.webViewLink,
  };

  // Return as folder or file based on type
  if (file.fileType === 'folder') {
    return {
      ...baseResult,
      type: 'folder',
      parentId: file.parentId,
      itemCount: undefined,
      sharedWith: [],
    } as FolderSearchResult;
  }

  return {
    ...baseResult,
    type: 'file',
    fileType: file.mimeType,
    fileSize: file.size || 0,
    filePath: '',
    downloadUrl: file.webContentLink,
    previewUrl: file.webViewLink,
    sharedWith: [],
    parentId: file.parentId,
  } as FileSearchResult;
};

/**
 * Google Calendar event type from the calendar API
 */
interface GoogleCalendarEventFromAPI {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  attendees?: string[];
  syncedFromGoogle?: boolean;
  googleCalendarHtmlLink?: string;
  googleCalendarName?: string;
  organizerId?: string;
  workspaceId?: string;
  createdAt?: string;
  updatedAt?: string;
  allDay?: boolean;
  isRecurring?: boolean;
  [key: string]: any;
}

/**
 * Transform Google Calendar event to search result format
 */
const transformGoogleCalendarEvent = (event: GoogleCalendarEventFromAPI): CalendarSearchResult => {
  return {
    id: event.id,
    type: 'calendar',
    title: event.title || '(No title)',
    snippet: event.description || `${event.googleCalendarName || 'Google Calendar'} • ${new Date(event.startTime).toLocaleString()}`,
    author: {
      id: event.organizerId || 'google-calendar',
      name: event.googleCalendarName || 'Google Calendar',
      email: undefined,
      imageUrl: undefined,
    },
    workspace: event.workspaceId,
    highlights: [],
    relevanceScore: undefined,
    updatedAt: event.updatedAt || event.createdAt || new Date().toISOString(),
    metadata: event,
    source: 'google-calendar' as const,
    externalUrl: event.googleCalendarHtmlLink,
    eventType: 'meeting',
    startTime: event.startTime,
    endTime: event.endTime,
    location: event.location,
    attendees: event.attendees || [],
    isRecurring: event.isRecurring || false,
  };
};

/**
 * Check if a string matches a search query (case-insensitive)
 */
const matchesSearchQuery = (text: string | undefined, query: string): boolean => {
  if (!text) return false;
  return text.toLowerCase().includes(query.toLowerCase());
};

/**
 * Transform email list item to search result format
 */
const transformEmailToSearchResult = (email: EmailListItem, source: 'gmail' | 'smtp-imap'): EmailSearchResult => {
  return {
    id: email.id,
    type: 'email',
    title: email.subject || '(No subject)',
    snippet: email.snippet || '',
    author: {
      id: email.from?.email || 'unknown',
      name: email.from?.name || email.from?.email || 'Unknown',
      email: email.from?.email,
      imageUrl: undefined,
    },
    workspace: undefined,
    highlights: [],
    relevanceScore: undefined,
    updatedAt: email.date || new Date().toISOString(),
    metadata: email,
    source: source,
    externalUrl: undefined,
    from: email.from,
    to: undefined, // Not available in list item
    subject: email.subject,
    date: email.date,
    isRead: email.isRead,
    isStarred: email.isStarred,
    hasAttachments: email.hasAttachments,
    labelIds: email.labelIds,
    threadId: email.threadId,
  };
};

/**
 * Transform backend search result to frontend format
 */
const transformSearchResult = (item: SearchResultItem): SearchResult => {
  // Extract author information
  const authorId = item.created_by || item.user_id || item.uploaded_by || item.organizer_id || item.author_id || 'unknown';
  const author: SearchResultAuthor = {
    id: authorId,
    name: authorId, // TODO: Fetch actual user names
    email: undefined,
    imageUrl: undefined,
  };

  // Base result - all Deskive results have source: 'deskive'
  const baseResult = {
    id: item.id,
    title: item.title || item.name || 'Untitled',
    snippet: item.content_text || item.content || item.description || '',
    author,
    workspace: item.workspace_id,
    highlights: [],
    relevanceScore: item.relevance_score,
    updatedAt: item.updated_at || item.created_at,
    metadata: item,
    source: 'deskive' as const,
    externalUrl: undefined,
  };

  // Type-specific transformations
  switch (item.content_type) {
    case 'messages':
      return {
        ...baseResult,
        type: 'message',
        channel: item.channel_id || item.conversation_id || 'unknown',
        channelType: 'public', // TODO: Determine from data
        timestamp: item.created_at,
        replies: 0,
        reactions: item.reactions || [],
        mentions: item.mentions || [],
        isPinned: item.is_pinned,
        isStarred: item.is_starred,
        attachments: 0,
      };

    case 'files':
      return {
        ...baseResult,
        type: 'file',
        fileType: item.mime_type || 'unknown',
        fileSize: item.size || 0,
        filePath: item.storage_path || '',
        downloadUrl: item.url,
        previewUrl: item.url,
        sharedWith: [],
        parentId: item.folder_id,
      };

    case 'folders':
      return {
        ...baseResult,
        type: 'folder',
        parentId: item.parent_id,
        itemCount: undefined,
        sharedWith: [],
      };

    case 'projects':
      return {
        ...baseResult,
        type: 'project',
        projectType: 'kanban',
        status: (item.status as any) || 'active',
        completionRate: 0,
        teamMembers: [],
        dueDate: item.due_date,
      };

    case 'notes':
      return {
        ...baseResult,
        type: 'note',
        category: undefined,
        tags: item.tags || [],
        wordCount: undefined,
        lastEditedBy: item.created_by,
        sharedWith: [],
      };

    case 'events':
      // Database events are always from Deskive (Google Calendar events are fetched separately)
      return {
        ...baseResult,
        type: 'calendar',
        eventType: 'meeting',
        startTime: item.start_time || '',
        endTime: item.end_time || '',
        location: item.location,
        attendees: item.attendees || [],
        isRecurring: false,
      };

    case 'tasks':
      return {
        ...baseResult,
        type: 'project', // Tasks are shown as project items
        projectType: 'kanban',
        status: (item.status as any) || 'active',
        completionRate: 0,
        teamMembers: item.assigned_to ? [item.assigned_to] : [],
        dueDate: item.due_date,
      };

    default:
      return {
        ...baseResult,
        type: 'note',
        category: undefined,
        tags: [],
        wordCount: undefined,
        lastEditedBy: undefined,
        sharedWith: [],
      };
  }
};

export function useUniversalSearch(): UseUniversalSearchReturn {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const {
    results,
    isSearching,
    totalResults,
    relevanceScore,
    filters,
    setResults,
    setIsSearching,
    updateFilters,
    clearResults,
    addToHistory,
  } = useSearchStore();

  const search = useCallback(
    async (query: SearchQuery) => {
      if (!query.query || query.query.trim().length === 0) {
        clearResults();
        return;
      }

      if (!workspaceId) {
        console.error('[useUniversalSearch] No workspaceId available');
        return;
      }

      setIsSearching(true);

      try {
        // Map frontend types to backend types
        const types = mapSearchTypes(query.type);

        // Convert filters to API params
        const filterParams = convertFiltersToParams(query.filters || {});

        // Determine if we should search Google Drive (for all, files, or folders searches)
        const shouldSearchDrive = query.type === 'all' || query.type === 'files' || query.type === 'folders';

        // Determine if we should search Google Calendar (for all or calendar searches)
        const shouldSearchGoogleCalendar = query.type === 'all' || query.type === 'calendar';

        // Determine if we should search emails (for all or emails searches)
        const shouldSearchEmails = query.type === 'all' || query.type === 'emails';

        // Run searches in parallel
        const [backendResponse, driveResponse, calendarEventsResponse, gmailResponse, imapResponse] = await Promise.all([
          // Backend search
          universalSearch(workspaceId, {
            query: query.query,
            types,
            page: 1,
            limit: 50,
            semantic: query.mode === 'semantic' || query.mode === 'hybrid',
            ...filterParams,
          }),
          // Google Drive search (merged into files/folders)
          shouldSearchDrive
            ? googleDriveApi.listFiles(workspaceId, {
                query: query.query,
                pageSize: 50,
              }).catch((err) => {
                console.warn('[useUniversalSearch] Drive search failed (may not be connected):', err.message);
                return { files: [] };
              })
            : Promise.resolve({ files: [] }),
          // Google Calendar events (fetch upcoming events which includes Google Calendar)
          shouldSearchGoogleCalendar
            ? calendarApi.getUpcomingEvents(workspaceId, 365).catch((err) => {
                console.warn('[useUniversalSearch] Calendar fetch failed:', err.message);
                return [] as any[];
              })
            : Promise.resolve([] as any[]),
          // Gmail search
          shouldSearchEmails
            ? emailService.getMessages(workspaceId, {
                query: query.query,
                maxResults: 50,
              }).catch((err) => {
                console.warn('[useUniversalSearch] Gmail search failed (may not be connected):', err.message);
                return { emails: [] };
              })
            : Promise.resolve({ emails: [] }),
          // SMTP/IMAP email search - fetch all and filter client-side (IMAP SEARCH can be unreliable)
          shouldSearchEmails
            ? emailService.getSmtpImapMessages(workspaceId, {
                maxResults: 100, // Fetch more emails, filter client-side
              }).then((response) => {
                console.log('[useUniversalSearch] IMAP raw response (before filter):', response?.emails?.length || 0, 'emails');
                // Filter emails client-side by search query
                if (response?.emails && response.emails.length > 0) {
                  const searchLower = query.query.toLowerCase();
                  response.emails = response.emails.filter((email) =>
                    (email.subject?.toLowerCase().includes(searchLower)) ||
                    (email.snippet?.toLowerCase().includes(searchLower)) ||
                    (email.from?.name?.toLowerCase().includes(searchLower)) ||
                    (email.from?.email?.toLowerCase().includes(searchLower))
                  );
                  console.log('[useUniversalSearch] IMAP filtered results:', response.emails.length);
                }
                return response;
              }).catch((err) => {
                console.error('[useUniversalSearch] IMAP search failed:', err.message, err.response?.data || err);
                return { emails: [] };
              })
            : Promise.resolve({ emails: [] }),
        ]);

        // Transform results by content type
        const transformedResults: SearchResults = {};
        const allResults: SearchResult[] = [];

        // Process backend results
        backendResponse.data.forEach((item) => {
          const transformed = transformSearchResult(item);
          allResults.push(transformed);

          // Group by TRANSFORMED type (not backend content_type)
          // This ensures tasks and projects are grouped together as 'projects'
          let groupKey: string = transformed.type;

          // Map transformed types to frontend tab keys (plural forms)
          const typeToKeyMap: Record<string, string> = {
            'message': 'messages',
            'file': 'files',
            'folder': 'folders',
            'project': 'projects',
            'note': 'notes',
            'calendar': 'calendar',
            'video': 'videos'
          };

          groupKey = typeToKeyMap[groupKey] || groupKey;

          if (!transformedResults[groupKey]) {
            transformedResults[groupKey] = [];
          }
          transformedResults[groupKey]!.push(transformed as any);
        });

        // Process Google Drive results - merge into files/folders
        if (driveResponse.files && driveResponse.files.length > 0) {
          driveResponse.files.forEach((file) => {
            const transformed = transformDriveFile(file);
            allResults.push(transformed);

            // Merge into appropriate category based on type
            if (transformed.type === 'folder') {
              if (!transformedResults.folders) {
                transformedResults.folders = [];
              }
              transformedResults.folders.push(transformed as FolderSearchResult);
            } else {
              if (!transformedResults.files) {
                transformedResults.files = [];
              }
              transformedResults.files.push(transformed as FileSearchResult);
            }
          });
        }

        // Process Google Calendar events - filter by search query and merge into calendar
        if (calendarEventsResponse && calendarEventsResponse.length > 0) {
          // Filter events that match the search query and are from Google Calendar
          const googleCalendarEvents = calendarEventsResponse.filter((event: GoogleCalendarEventFromAPI) => {
            // Only include events from Google Calendar
            if (!event.syncedFromGoogle) return false;

            // Check if the event matches the search query
            const searchQuery = query.query.toLowerCase();
            return (
              matchesSearchQuery(event.title, searchQuery) ||
              matchesSearchQuery(event.description, searchQuery) ||
              matchesSearchQuery(event.location, searchQuery) ||
              matchesSearchQuery(event.googleCalendarName, searchQuery)
            );
          });

          googleCalendarEvents.forEach((event: GoogleCalendarEventFromAPI) => {
            const transformed = transformGoogleCalendarEvent(event);
            allResults.push(transformed);

            // Merge into calendar category
            if (!transformedResults.calendar) {
              transformedResults.calendar = [];
            }
            transformedResults.calendar.push(transformed);
          });

          console.log('[useUniversalSearch] Google Calendar events found:', googleCalendarEvents.length);
        }

        // Process Gmail results
        if (gmailResponse && gmailResponse.emails && gmailResponse.emails.length > 0) {
          gmailResponse.emails.forEach((email: EmailListItem) => {
            const transformed = transformEmailToSearchResult(email, 'gmail');
            allResults.push(transformed);

            // Merge into emails category
            if (!transformedResults.emails) {
              transformedResults.emails = [];
            }
            transformedResults.emails.push(transformed);
          });

          console.log('[useUniversalSearch] Gmail emails found:', gmailResponse.emails.length);
        }

        // Process IMAP results
        if (imapResponse && imapResponse.emails && imapResponse.emails.length > 0) {
          imapResponse.emails.forEach((email: EmailListItem) => {
            const transformed = transformEmailToSearchResult(email, 'smtp-imap');
            allResults.push(transformed);

            // Merge into emails category
            if (!transformedResults.emails) {
              transformedResults.emails = [];
            }
            transformedResults.emails.push(transformed);
          });

          console.log('[useUniversalSearch] IMAP emails found:', imapResponse.emails.length);
        }

        // Add 'all' category
        transformedResults.all = allResults;

        const totalEmails = (gmailResponse?.emails?.length || 0) + (imapResponse?.emails?.length || 0);
        console.log('[useUniversalSearch] Search results:', {
          total: backendResponse.total + (driveResponse.files?.length || 0) + (calendarEventsResponse?.filter((e: any) => e.syncedFromGoogle)?.length || 0) + totalEmails,
          grouped: Object.keys(transformedResults).reduce((acc, key) => {
            acc[key] = transformedResults[key]?.length || 0;
            return acc;
          }, {} as Record<string, number>)
        });

        setResults(transformedResults);
        addToHistory(query.query);
      } catch (error) {
        console.error('[useUniversalSearch] Search error:', error);
        clearResults();
      } finally {
        setIsSearching(false);
      }
    },
    [workspaceId, setResults, setIsSearching, clearResults, addToHistory]
  );

  return {
    results,
    isSearching,
    totalResults,
    relevanceScore,
    search,
    clearResults,
    filters,
    updateFilters,
  };
}
