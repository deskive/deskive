import 'dart:async';
import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_html/flutter_html.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:url_launcher/url_launcher.dart';
import '../dao/search_dao.dart';
import '../dao/video_call_dao.dart';
import '../models/search/recent_search.dart';
import '../models/search/search_response.dart';
import '../apps/services/google_drive_service.dart';
import '../apps/models/google_drive_models.dart';
import '../notes/note.dart';
import '../projects/project_dashboard_screen.dart';
import '../projects/project_details_screen.dart';
import '../projects/project_service.dart';
import '../projects/task_details_screen.dart';
import '../notes/notes_screen.dart';
import '../notes/note_editor_screen.dart';
import '../files/folder_screen.dart';
import '../files/files_screen.dart';
import '../files/image_preview_dialog.dart';
import '../files/video_player_dialog.dart';
import '../message/chat_screen.dart';
import '../message/messages_screen.dart';
import '../calendar/calendar_screen.dart';
import '../calendar/edit_event_screen.dart';
import '../videocalls/video_calls_home_screen.dart';
import '../videocalls/meeting_details_screen.dart';
import '../notes/notes_service.dart';
import '../services/file_service.dart';
import '../services/project_service.dart' as services_project;
import '../api/services/calendar_api_service.dart' as calendar_api;
import '../api/services/email_api_service.dart';
import '../api/base_api_client.dart';
import '../models/calendar_event.dart' as local_calendar;
import '../models/project.dart' as local_project;
import '../email/email_screen.dart';

/// Search types matching backend implementation
/// Note: 'drive' results are merged into 'files' with source badge (matching frontend)
/// Note: 'emails' results are shown in Emails tab with source badge (matching frontend)
const List<String> _kSearchTypes = [
  'messages',
  'files',
  'folders',
  'projects',
  'notes',
  'events', // Calendar events
  // 'tasks', // Tasks are shown under Projects in frontend
  // 'videos', // Videos not shown as separate tab in frontend
];

/// Tab configuration matching frontend exactly
/// Frontend tabs: All, Messages, Files, Folders, Projects, Notes, Calendar, Emails
const List<String> _kTabTypes = [
  'all',
  'messages',
  'files',     // Includes Google Drive results with badge
  'folders',
  'projects',
  'notes',
  'calendar',  // Shows 'events' type results
  'emails',    // Shows Gmail/SMTP-IMAP results with badge
];

/// Debounce duration for search (matching frontend: 300ms)
const Duration _kSearchDebounce = Duration(milliseconds: 300);

/// Debounce duration for suggestions (matching frontend: 200ms)
const Duration _kSuggestionsDebounce = Duration(milliseconds: 200);

/// Minimum query length for search (matching frontend)
const int _kMinSearchLength = 2;

/// Minimum query length for suggestions (matching frontend)
const int _kMinSuggestionsLength = 2;

class GlobalSearchScreen extends StatefulWidget {
  const GlobalSearchScreen({super.key});

  @override
  State<GlobalSearchScreen> createState() => _GlobalSearchScreenState();
}

class _GlobalSearchScreenState extends State<GlobalSearchScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  bool _isSearching = false;

  // Debounce timers (matching frontend implementation)
  Timer? _searchDebounceTimer;
  Timer? _suggestionsDebounceTimer;

  // Search mode (matching frontend)
  SearchMode _searchMode = SearchMode.fullText;

  // Search suggestions
  List<String> _suggestions = [];
  bool _isLoadingSuggestions = false;
  bool _showSuggestions = false;

  // Filter states (wired to SearchFilters)
  SearchFilters _filters = const SearchFilters();
  // Date range filter
  DateTime? _dateFrom;
  DateTime? _dateTo;
  String? _datePreset; // 'today', 'yesterday', 'last7days', 'last30days', 'custom'
  // Other filters
  String? _selectedAuthor;
  List<String> _selectedTags = [];
  String? _selectedProject;
  List<String> _selectedFileTypes = [];
  bool _hasFilesOnly = false;
  bool _starredOnly = false;
  bool _sharedOnly = false;

  // Available filter options (loaded from workspace)
  List<String> _availableAuthors = [];
  List<String> _availableTags = [];
  List<Map<String, dynamic>> _availableProjects = [];

  // Recent searches
  List<RecentSearch> _recentSearches = [];
  bool _isLoadingRecent = false;

  // Saved searches
  List<SavedSearch> _savedSearches = [];
  bool _isLoadingSaved = false;

  // Search results
  List<SearchResultItem> _searchResults = [];
  int _totalResults = 0;
  int _currentPage = 1;
  bool _hasMoreResults = true;
  bool _isLoadingMore = false;

  // Google Drive search results (searched in parallel with backend)
  List<GoogleDriveFile> _driveResults = [];
  bool _isSearchingDrive = false;
  bool _isDriveConnected = false;

  // Email search results (searched in parallel with backend, matching frontend)
  List<EmailListItem> _emailResults = [];
  bool _isSearchingEmail = false;
  bool _isEmailConnected = false;
  List<EmailConnection> _emailConnections = [];

  // Google Calendar search results (searched in parallel with backend, matching frontend)
  List<calendar_api.CalendarEvent> _googleCalendarResults = [];
  bool _isSearchingGoogleCalendar = false;

  String? _workspaceId;
  final SearchDao _searchDao = SearchDao();
  final GoogleDriveService _driveService = GoogleDriveService.instance;
  final EmailApiService _emailService = EmailApiService();
  final calendar_api.CalendarApiService _calendarService = calendar_api.CalendarApiService();
  final ScrollController _scrollController = ScrollController();

  // Speech to text
  late stt.SpeechToText _speech;
  bool _isListening = false;
  bool _speechAvailable = false;

  @override
  void initState() {
    super.initState();
    // 8 tabs matching frontend exactly: All, Messages, Files, Folders, Projects, Notes, Calendar, Emails
    _tabController = TabController(length: _kTabTypes.length, vsync: this);

    // Add debounced search listener (matching frontend: 300ms for search, 200ms for suggestions)
    _searchController.addListener(_onSearchQueryChanged);

    _scrollController.addListener(_onScroll);
    _loadRecentSearches();
    _loadSavedSearches();
    _loadFilterOptions(); // Load available authors, tags, projects for filters
    _checkDriveConnection(); // Check if Google Drive is connected (results shown in Files tab)
    _checkEmailConnection(); // Check if Email is connected (results shown in Emails tab)
    // Initialize speech object but don't request permission yet
    _speech = stt.SpeechToText();
  }

  /// Load available filter options from the workspace
  Future<void> _loadFilterOptions() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final workspaceId = prefs.getString('current_workspace_id');
      if (workspaceId == null) return;

      // Load projects for filter
      try {
        final projectService = services_project.ProjectService.instance;
        final projects = await projectService.getProjects(workspaceId: workspaceId);
        if (mounted) {
          setState(() {
            _availableProjects = projects.map((p) => {
              'id': p.id,
              'name': p.name,
            }).toList();
          });
        }
      } catch (e) {
        debugPrint('[GlobalSearch] Failed to load projects for filter: $e');
      }

      // TODO: Load workspace members for author filter when API is available
      // TODO: Load tags from workspace settings when API is available
    } catch (e) {
      debugPrint('[GlobalSearch] Failed to load filter options: $e');
    }
  }

  /// Update the SearchFilters object based on current filter state
  void _updateFilters() {
    setState(() {
      _filters = SearchFilters(
        dateFrom: _dateFrom,
        dateTo: _dateTo,
        author: _selectedAuthor,
        tags: _selectedTags.isNotEmpty ? _selectedTags : null,
        projectId: _selectedProject,
        fileTypes: _selectedFileTypes.isNotEmpty ? _selectedFileTypes : null,
        hasAttachments: _hasFilesOnly ? true : null,
        isShared: _sharedOnly ? true : null,
        isStarred: _starredOnly ? true : null,
      );
    });
  }

  /// Apply a date preset (matching frontend date range presets)
  void _applyDatePreset(String preset) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);

    switch (preset) {
      case 'today':
        _dateFrom = today;
        _dateTo = now;
        break;
      case 'yesterday':
        _dateFrom = today.subtract(const Duration(days: 1));
        _dateTo = today.subtract(const Duration(seconds: 1));
        break;
      case 'last7days':
        _dateFrom = today.subtract(const Duration(days: 7));
        _dateTo = now;
        break;
      case 'last30days':
        _dateFrom = today.subtract(const Duration(days: 30));
        _dateTo = now;
        break;
      default:
        // custom - don't change dates
        break;
    }
    _datePreset = preset;
  }

  /// Clear all filters
  void _clearAllFilters() {
    setState(() {
      _dateFrom = null;
      _dateTo = null;
      _datePreset = null;
      _selectedAuthor = null;
      _selectedTags = [];
      _selectedProject = null;
      _selectedFileTypes = [];
      _hasFilesOnly = false;
      _starredOnly = false;
      _sharedOnly = false;
      _filters = const SearchFilters();
    });
  }

  /// Check if any filter is active
  bool get _hasActiveFilters =>
      _dateFrom != null ||
      _dateTo != null ||
      _selectedAuthor != null ||
      _selectedTags.isNotEmpty ||
      _selectedProject != null ||
      _selectedFileTypes.isNotEmpty ||
      _hasFilesOnly ||
      _starredOnly ||
      _sharedOnly;

  /// Check if Google Drive is connected for this workspace
  Future<void> _checkDriveConnection() async {
    try {
      final connection = await _driveService.getConnection();
      if (mounted) {
        setState(() {
          _isDriveConnected = connection != null && connection.isActive;
        });
      }
    } catch (e) {
      // Drive not connected or error - silently ignore
      if (mounted) {
        setState(() {
          _isDriveConnected = false;
        });
      }
    }
  }

  /// Check if Email is connected for this workspace (Gmail or SMTP/IMAP)
  /// Matching frontend implementation that searches Gmail and SMTP/IMAP in parallel
  Future<void> _checkEmailConnection() async {
    // Wait for workspace ID to be loaded (max 2 seconds with retries)
    int retries = 0;
    while (_workspaceId == null && retries < 4) {
      await Future.delayed(const Duration(milliseconds: 500));
      retries++;
    }

    if (_workspaceId == null) {
      debugPrint('[GlobalSearch] Email connection check skipped - no workspace ID');
      return;
    }

    try {
      final response = await _emailService.getAllConnections(_workspaceId!);
      if (mounted && response.isSuccess && response.data != null) {
        final connections = response.data!;
        setState(() {
          _isEmailConnected = connections.hasAnyConnection;
          _emailConnections = connections.allAccounts;
        });
        debugPrint('[GlobalSearch] Email connected: $_isEmailConnected, accounts: ${_emailConnections.length}');
      }
    } catch (e) {
      // Email not connected or error - silently ignore
      debugPrint('[GlobalSearch] Email connection check failed: $e');
      if (mounted) {
        setState(() {
          _isEmailConnected = false;
          _emailConnections = [];
        });
      }
    }
  }

  /// Handle search query changes with debouncing (matching frontend implementation)
  void _onSearchQueryChanged() {
    final query = _searchController.text;

    setState(() {
      _searchQuery = query;
      _showSuggestions = query.isNotEmpty;
    });

    // Cancel previous timers
    _searchDebounceTimer?.cancel();
    _suggestionsDebounceTimer?.cancel();

    if (query.isEmpty) {
      // Clear results immediately when query is empty
      setState(() {
        _searchResults = [];
        _driveResults = [];
        _emailResults = [];
        _suggestions = [];
        _totalResults = 0;
        _currentPage = 1;
        _hasMoreResults = true;
        _showSuggestions = false;
      });
      return;
    }

    // Fetch suggestions with 200ms debounce (matching frontend)
    if (query.length >= _kMinSuggestionsLength) {
      _suggestionsDebounceTimer = Timer(_kSuggestionsDebounce, () {
        _fetchSuggestions();
      });
    }

    // Perform search with 300ms debounce (matching frontend)
    if (query.length >= _kMinSearchLength) {
      _searchDebounceTimer = Timer(_kSearchDebounce, () {
        _performSearch(resetPage: true);
      });
    } else {
      // Clear results if less than minimum characters
      setState(() {
        _searchResults = [];
        _driveResults = [];
        _emailResults = [];
        _totalResults = 0;
        _currentPage = 1;
        _hasMoreResults = true;
      });
    }
  }

  /// Fetch search suggestions (matching frontend)
  Future<void> _fetchSuggestions() async {
    if (_workspaceId == null || _searchQuery.length < _kMinSuggestionsLength) {
      return;
    }

    setState(() {
      _isLoadingSuggestions = true;
    });

    try {
      final suggestions = await _searchDao.getSearchSuggestions(
        workspaceId: _workspaceId!,
        query: _searchQuery,
      );

      if (mounted) {
        setState(() {
          _suggestions = suggestions;
          _isLoadingSuggestions = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoadingSuggestions = false;
        });
      }
    }
  }

  Future<bool> _initSpeechIfNeeded() async {
    // Only initialize if not already initialized
    if (!_speechAvailable) {
      _speechAvailable = await _speech.initialize(
        onStatus: (status) {
          if (status == 'done' || status == 'notListening') {
            setState(() {
              _isListening = false;
            });
          }
        },
        onError: (error) {
          setState(() {
            _isListening = false;
          });
          _showErrorMessage('Speech recognition error: ${error.errorMsg}');
        },
      );
    }
    return _speechAvailable;
  }

  void _onScroll() {
    // Check if controller has clients and handle multiple attached scroll views
    if (!_scrollController.hasClients) return;

    // Use positions to safely handle multiple scroll views
    for (final position in _scrollController.positions) {
      if (position.pixels >= position.maxScrollExtent - 200) {
        // User is near the bottom, load more
        if (!_isLoadingMore && _hasMoreResults && _searchQuery.isNotEmpty) {
          _loadMoreResults();
          break; // Only load once even if multiple views are near bottom
        }
      }
    }
  }

  Future<void> _loadRecentSearches() async {
    setState(() {
      _isLoadingRecent = true;
    });

    try {
      // Get workspace ID from shared preferences
      final prefs = await SharedPreferences.getInstance();
      _workspaceId = prefs.getString('current_workspace_id');

      if (_workspaceId != null) {
        final response = await _searchDao.getRecentSearches(
          workspaceId: _workspaceId!,
          limit: 10,
        );

        if (mounted) {
          setState(() {
            _recentSearches = response.data ?? [];
            _isLoadingRecent = false;
          });
        }
      } else {
        if (mounted) {
          setState(() {
            _isLoadingRecent = false;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoadingRecent = false;
        });
      }
    }
  }

  Future<void> _loadSavedSearches() async {
    setState(() {
      _isLoadingSaved = true;
    });

    try {
      // Get workspace ID from shared preferences
      final prefs = await SharedPreferences.getInstance();
      _workspaceId = prefs.getString('current_workspace_id');

      if (_workspaceId != null) {
        final response = await _searchDao.getSavedSearches(
          workspaceId: _workspaceId!,
        );

        if (mounted) {
          setState(() {
            _savedSearches = response.data ?? [];
            _isLoadingSaved = false;
          });
        }
      } else {
        if (mounted) {
          setState(() {
            _isLoadingSaved = false;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoadingSaved = false;
        });
      }
    }
  }

  @override
  void dispose() {
    // Cancel debounce timers
    _searchDebounceTimer?.cancel();
    _suggestionsDebounceTimer?.cancel();
    _tabController.dispose();
    _searchController.dispose();
    _scrollController.dispose();
    _speech.stop();
    super.dispose();
  }

  Future<void> _performSearch({bool resetPage = false}) async {
    if (_searchQuery.isEmpty) return;

    if (resetPage) {
      setState(() {
        _currentPage = 1;
        _hasMoreResults = true;
        _searchResults = [];
        _driveResults = []; // Clear Drive results on new search
        _emailResults = []; // Clear Email results on new search
        _googleCalendarResults = []; // Clear Google Calendar results on new search
        _showSuggestions = false; // Hide suggestions when search is performed
      });
    }

    setState(() {
      _isSearching = true;
      _isSearchingDrive = _isDriveConnected; // Only search Drive if connected
      _isSearchingEmail = _isEmailConnected; // Only search Email if connected
      _isSearchingGoogleCalendar = true; // Always search Google Calendar (matching frontend)
    });

    try {
      if (_workspaceId != null) {
        // Search backend, Google Drive, and Email in parallel (matching frontend implementation)
        final futures = <Future<dynamic>>[
          // Backend search
          _searchDao.search(
            workspaceId: _workspaceId!,
            query: _searchQuery,
            types: _kSearchTypes, // Search across all supported types
            mode: _searchMode,    // Supports full-text, semantic, hybrid
            filters: _filters,    // Wired to SearchFilters
            page: _currentPage,
            limit: 50,
          ),
        ];

        // Add Google Drive search if connected (matching frontend: parallel search)
        if (_isDriveConnected) {
          futures.add(
            _driveService.listFiles(
              params: ListFilesParams(
                query: _searchQuery,
                pageSize: 50,
              ),
            ).catchError((e) {
              // Gracefully handle Drive search failure (matching frontend behavior)
              debugPrint('[GlobalSearch] Drive search failed: $e');
              return ListFilesResponse(files: []);
            }),
          );
        }

        // Add Email search if connected (matching frontend: parallel search for Gmail/SMTP-IMAP)
        if (_isEmailConnected) {
          futures.add(
            _searchEmailsAcrossConnections(_searchQuery).catchError((e) {
              // Gracefully handle Email search failure (matching frontend behavior)
              debugPrint('[GlobalSearch] Email search failed: $e');
              return <EmailListItem>[];
            }),
          );
        }

        // Add Google Calendar search (matching frontend: fetch upcoming events, filter by query & syncedFromGoogle)
        futures.add(
          _searchGoogleCalendarEvents(_searchQuery).catchError((e) {
            // Gracefully handle Google Calendar search failure (matching frontend behavior)
            debugPrint('[GlobalSearch] Google Calendar search failed: $e');
            return <calendar_api.CalendarEvent>[];
          }),
        );

        final results = await Future.wait(futures);
        final backendResponse = results[0] as SearchResultsResponse;

        // Determine Drive, Email, and Google Calendar response indices based on what was added
        ListFilesResponse driveResponse = ListFilesResponse(files: []);
        List<EmailListItem> emailResponse = [];
        List<calendar_api.CalendarEvent> googleCalendarResponse = [];

        int nextIndex = 1;
        if (_isDriveConnected && results.length > nextIndex) {
          driveResponse = results[nextIndex] as ListFilesResponse;
          nextIndex++;
        }
        if (_isEmailConnected && results.length > nextIndex) {
          emailResponse = results[nextIndex] as List<EmailListItem>;
          nextIndex++;
        }
        // Google Calendar is always searched (last in the list)
        if (results.length > nextIndex) {
          googleCalendarResponse = results[nextIndex] as List<calendar_api.CalendarEvent>;
        }

        if (mounted) {
          setState(() {
            if (resetPage) {
              _searchResults = backendResponse.results ?? [];
              _driveResults = driveResponse.files;
              _emailResults = emailResponse;
              _googleCalendarResults = googleCalendarResponse;
            } else {
              _searchResults.addAll(backendResponse.results ?? []);
              // Note: Drive, Email, and Google Calendar don't support pagination in the same way
            }
            _totalResults = backendResponse.total;
            _hasMoreResults = (backendResponse.results?.length ?? 0) >= 50;
            _isSearching = false;
            _isSearchingDrive = false;
            _isSearchingEmail = false;
            _isSearchingGoogleCalendar = false;
          });
        }
      } else {
        if (mounted) {
          setState(() {
            _isSearching = false;
            _isSearchingDrive = false;
            _isSearchingEmail = false;
            _isSearchingGoogleCalendar = false;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSearching = false;
          _isSearchingDrive = false;
          _isSearchingEmail = false;
          _isSearchingGoogleCalendar = false;
        });
      }
    }
  }

  /// Search Google Calendar events (matching frontend implementation)
  /// Frontend: calendarApi.getUpcomingEvents(workspaceId, 365) then filters by syncedFromGoogle and query
  Future<List<calendar_api.CalendarEvent>> _searchGoogleCalendarEvents(String query) async {
    if (_workspaceId == null) return [];

    try {
      // Fetch upcoming events for 365 days (matching frontend)
      final response = await _calendarService.getUpcomingEvents(_workspaceId!, days: 365);

      if (!response.isSuccess || response.data == null) {
        return [];
      }

      final events = response.data!;
      final lowerQuery = query.toLowerCase();

      // Filter by syncedFromGoogle and query (matching frontend behavior)
      final filteredEvents = events.where((event) {
        // Only include events synced from Google Calendar
        if (!event.syncedFromGoogle) return false;

        // Match query against title, description, location
        return (event.title.toLowerCase().contains(lowerQuery)) ||
               (event.description?.toLowerCase().contains(lowerQuery) ?? false) ||
               (event.location?.toLowerCase().contains(lowerQuery) ?? false);
      }).toList();

      // Sort by start time (ascending)
      filteredEvents.sort((a, b) => a.startTime.compareTo(b.startTime));

      return filteredEvents;
    } catch (e) {
      debugPrint('[GlobalSearch] Google Calendar search error: $e');
      return [];
    }
  }

  /// Search emails across all connected email accounts (Gmail and SMTP/IMAP)
  /// Matching frontend implementation that searches all email sources in parallel
  Future<List<EmailListItem>> _searchEmailsAcrossConnections(String query) async {
    if (_workspaceId == null || _emailConnections.isEmpty) {
      return [];
    }

    final allEmails = <EmailListItem>[];

    // Search each connection in parallel
    final searchFutures = <Future<void>>[];

    for (final connection in _emailConnections) {
      searchFutures.add(() async {
        try {
          ApiResponse<EmailListResponse> response;

          if (connection.provider == 'gmail') {
            // Gmail search - pass query to Gmail API (reliable)
            // Matching frontend: maxResults: 50
            response = await _emailService.getMessages(
              _workspaceId!,
              query: query,
              maxResults: 50,
              connectionId: connection.id,
            );
          } else {
            // SMTP/IMAP search - do NOT pass query, filter client-side
            // Matching frontend: "IMAP SEARCH can be unreliable"
            // Fetch more emails without query, then filter client-side
            response = await _emailService.getSmtpImapMessages(
              _workspaceId!,
              // Do NOT pass query - IMAP server search is unreliable
              maxResults: 100,
              connectionId: connection.id,
            );
          }

          if (response.isSuccess && response.data != null) {
            final emails = response.data!.emails;

            // Client-side filtering for IMAP (matching frontend behavior)
            // Gmail results are already filtered by the API
            final filteredEmails = connection.provider == 'smtp_imap'
                ? emails.where((email) {
                    final lowerQuery = query.toLowerCase();
                    return (email.subject?.toLowerCase().contains(lowerQuery) ?? false) ||
                           (email.snippet.toLowerCase().contains(lowerQuery)) ||
                           (email.from?.name?.toLowerCase().contains(lowerQuery) ?? false) ||
                           (email.from?.email.toLowerCase().contains(lowerQuery) ?? false);
                  }).toList()
                : emails;
            allEmails.addAll(filteredEmails);
          }
        } catch (e) {
          debugPrint('[GlobalSearch] Email search for ${connection.emailAddress} failed: $e');
        }
      }());
    }

    await Future.wait(searchFutures);

    // Sort by date (newest first) and remove duplicates
    allEmails.sort((a, b) {
      final dateA = DateTime.tryParse(a.date ?? '') ?? DateTime.now();
      final dateB = DateTime.tryParse(b.date ?? '') ?? DateTime.now();
      return dateB.compareTo(dateA);
    });

    // Remove duplicates based on email ID
    final seen = <String>{};
    return allEmails.where((email) => seen.add(email.id)).toList();
  }

  Future<void> _loadMoreResults() async {
    if (_isLoadingMore || !_hasMoreResults) return;

    setState(() {
      _isLoadingMore = true;
      _currentPage++;
    });

    try {
      if (_workspaceId != null) {
        // Use the same search parameters as _performSearch (matching frontend)
        final response = await _searchDao.search(
          workspaceId: _workspaceId!,
          query: _searchQuery,
          types: _kSearchTypes, // Search across all supported types
          mode: _searchMode,    // Supports full-text, semantic, hybrid
          filters: _filters,    // Wired to SearchFilters
          page: _currentPage,
          limit: 50,
        );

        if (mounted) {
          setState(() {
            _searchResults.addAll(response.results ?? []);
            _hasMoreResults = (response.results?.length ?? 0) >= 50;
            _isLoadingMore = false;
          });
        }
      } else {
        if (mounted) {
          setState(() {
            _isLoadingMore = false;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoadingMore = false;
          _currentPage--; // Revert page increment on error
        });
      }
    }
  }

  List<SearchResultItem> _getFilteredResults(String? type) {
    if (_searchQuery.isEmpty) return [];

    if (type == null) {
      return _searchResults;
    }

    return _searchResults.where((result) => result.type == type).toList();
  }

  /// Transform GoogleDriveFile to SearchResultItem for unified display
  SearchResultItem _driveFileToSearchResult(GoogleDriveFile file) {
    return SearchResultItem(
      id: file.id,
      type: 'drive',
      title: file.name,
      content: file.mimeType,
      path: null,
      author: 'Google Drive',
      createdAt: file.createdTime,
      updatedAt: file.modifiedTime,
      metadata: {
        'webViewLink': file.webViewLink,
        'webContentLink': file.webContentLink,
        'thumbnailLink': file.thumbnailLink,
        'iconLink': file.iconLink,
        'mimeType': file.mimeType,
        'size': file.size,
        'isFolder': file.isFolder,
        'fileType': file.fileType.name,
        'parentId': file.parentId,
      },
    );
  }

  /// Get Drive results as SearchResultItem list
  List<SearchResultItem> _getDriveResultsAsSearchItems() {
    return _driveResults.map(_driveFileToSearchResult).toList();
  }

  /// Transform EmailListItem to SearchResultItem for unified display
  SearchResultItem _emailToSearchResult(EmailListItem email) {
    return SearchResultItem(
      id: email.id,
      type: 'emails',
      title: email.subject ?? '(No Subject)',
      content: email.snippet,
      path: null,
      author: email.from?.formatted ?? email.from?.email ?? 'Unknown',
      createdAt: DateTime.tryParse(email.date ?? ''),
      updatedAt: null,
      metadata: {
        'threadId': email.threadId,
        'labelIds': email.labelIds,
        'from': email.from?.email,
        'fromName': email.from?.name,
        'isRead': email.isRead,
        'isStarred': email.isStarred,
        'hasAttachments': email.hasAttachments,
        'source': 'email',
      },
    );
  }

  /// Get Email results as SearchResultItem list
  List<SearchResultItem> _getEmailResultsAsSearchItems() {
    return _emailResults.map(_emailToSearchResult).toList();
  }

  /// Transform CalendarEvent to SearchResultItem for unified display
  SearchResultItem _googleCalendarEventToSearchResult(calendar_api.CalendarEvent event) {
    return SearchResultItem(
      id: event.id,
      type: 'events',
      title: event.title,
      content: event.description,
      path: null,
      author: event.organizerName,
      createdAt: event.startTime,
      updatedAt: event.updatedAt,
      metadata: {
        'source': 'google-calendar',
        'location': event.location,
        'isAllDay': event.isAllDay,
        'googleCalendarEventId': event.googleCalendarEventId,
        'googleCalendarHtmlLink': event.googleCalendarHtmlLink,
        'googleCalendarName': event.googleCalendarName,
        'googleCalendarColor': event.googleCalendarColor,
        'startTime': event.startTime.toIso8601String(),
        'endTime': event.endTime.toIso8601String(),
      },
    );
  }

  /// Get Google Calendar results as SearchResultItem list
  List<SearchResultItem> _getGoogleCalendarResultsAsSearchItems() {
    return _googleCalendarResults.map(_googleCalendarEventToSearchResult).toList();
  }

  /// Get all results including Drive, Email, and Google Calendar (for the All tab)
  List<SearchResultItem> _getAllResultsIncludingDriveAndEmail() {
    if (_searchQuery.isEmpty) return [];
    return [
      ..._searchResults,
      ..._getDriveResultsAsSearchItems(),
      ..._getEmailResultsAsSearchItems(),
      ..._getGoogleCalendarResultsAsSearchItems(),
    ];
  }

  /// Get total result count including Drive, Email, and Google Calendar
  int _getTotalResultCount() {
    return _searchResults.length + _driveResults.length + _emailResults.length + _googleCalendarResults.length;
  }

  /// Get Files tab count (files + Google Drive results)
  int _getFilesTabCount() {
    return _getFilteredResults('files').length + _driveResults.length;
  }

  /// Get Calendar tab count (events + Google Calendar results)
  int _getCalendarTabCount() {
    return _getFilteredResults('events').length + _googleCalendarResults.length;
  }

  /// Build Calendar tab results (includes both backend events and Google Calendar with badges)
  Widget _buildCalendarTabResults() {
    final backendEvents = _getFilteredResults('events');
    final googleCalendarEvents = _getGoogleCalendarResultsAsSearchItems();

    if (backendEvents.isEmpty && googleCalendarEvents.isEmpty) {
      return _buildEmptyResults();
    }

    final allEvents = [...backendEvents, ...googleCalendarEvents];

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: allEvents.length,
      itemBuilder: (context, index) {
        final result = allEvents[index];
        return _buildResultCardWithBadge(result);
      },
    );
  }

  /// Build Files tab results (includes both backend files and Google Drive with badges)
  Widget _buildFilesTabResults() {
    final backendFiles = _getFilteredResults('files');
    final driveFiles = _getDriveResultsAsSearchItems();

    if (backendFiles.isEmpty && driveFiles.isEmpty) {
      return _buildEmptyResults();
    }

    final allFiles = [...backendFiles, ...driveFiles];

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: allFiles.length,
      itemBuilder: (context, index) {
        final result = allFiles[index];
        return _buildResultCardWithBadge(result);
      },
    );
  }

  /// Build a result card with source badge (matching frontend)
  /// Includes: author avatar, tags, relevance score, dropdown menu
  Widget _buildResultCardWithBadge(SearchResultItem result) {
    final source = result.metadata?['source'] as String?;
    final tags = result.metadata?['tags'] as List<dynamic>?;
    final relevanceScore = result.metadata?['relevanceScore'] as double?;
    final authorImageUrl = result.metadata?['authorImageUrl'] as String?;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: () => _openResult(result),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header row: Icon, Title, Source Badge, Dropdown Menu
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Type icon
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: _getTypeColor(result.type).withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      _getTypeIcon(result.type),
                      color: _getTypeColor(result.type),
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  // Title and content
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                result.title,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 15,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            // Source badge
                            if (source != null) ...[
                              const SizedBox(width: 8),
                              _buildSourceBadge(source),
                            ],
                          ],
                        ),
                        if (result.content != null && result.content!.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            result.content!,
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ],
                    ),
                  ),
                  // Dropdown menu (Open, Star, Share)
                  PopupMenuButton<String>(
                    icon: Icon(
                      Icons.more_horiz,
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                      size: 20,
                    ),
                    padding: EdgeInsets.zero,
                    onSelected: (value) => _handleResultAction(value, result),
                    itemBuilder: (context) => [
                      const PopupMenuItem(
                        value: 'open',
                        child: Row(
                          children: [
                            Icon(Icons.open_in_new, size: 16),
                            SizedBox(width: 8),
                            Text('Open'),
                          ],
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'star',
                        child: Row(
                          children: [
                            Icon(Icons.star_outline, size: 16),
                            SizedBox(width: 8),
                            Text('Star'),
                          ],
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'share',
                        child: Row(
                          children: [
                            Icon(Icons.share_outlined, size: 16),
                            SizedBox(width: 8),
                            Text('Share'),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 8),
              // Metadata row: Avatar, Author, Time, Relevance Score
              Row(
                children: [
                  // Author avatar
                  if (result.author != null) ...[
                    _buildAuthorAvatar(result.author!, authorImageUrl),
                    const SizedBox(width: 6),
                    Flexible(
                      child: Text(
                        result.author!,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 12),
                  ],
                  // Timestamp
                  if (result.createdAt != null) ...[
                    Icon(
                      Icons.access_time,
                      size: 12,
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      _formatDate(result.createdAt!),
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                        fontSize: 11,
                      ),
                    ),
                    const SizedBox(width: 12),
                  ],
                  // Relevance score (matching frontend: sparkles icon + percentage)
                  if (relevanceScore != null && relevanceScore > 0) ...[
                    Icon(
                      Icons.auto_awesome,
                      size: 12,
                      color: Colors.purple,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${(relevanceScore * 100).round()}%',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Colors.purple,
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ],
              ),
              // Tags row (matching frontend: show first 3 tags)
              if (tags != null && tags.isNotEmpty) ...[
                const SizedBox(height: 8),
                Wrap(
                  spacing: 4,
                  runSpacing: 4,
                  children: tags.take(3).map((tag) => _buildTagBadge(tag.toString())).toList(),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  /// Build author avatar widget (matching frontend)
  Widget _buildAuthorAvatar(String authorName, String? imageUrl) {
    final initial = authorName.isNotEmpty ? authorName[0].toUpperCase() : '?';

    return CircleAvatar(
      radius: 10,
      backgroundColor: Theme.of(context).colorScheme.primaryContainer,
      backgroundImage: imageUrl != null ? NetworkImage(imageUrl) : null,
      child: imageUrl == null
          ? Text(
              initial,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: Theme.of(context).colorScheme.onPrimaryContainer,
              ),
            )
          : null,
    );
  }

  /// Build tag badge widget (matching frontend)
  Widget _buildTagBadge(String tag) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        border: Border.all(color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.5)),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.label_outline,
            size: 10,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
          const SizedBox(width: 4),
          Text(
            tag,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              fontSize: 10,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }

  /// Handle result card action (Open, Star, Share)
  void _handleResultAction(String action, SearchResultItem result) {
    switch (action) {
      case 'open':
        _openResult(result);
        break;
      case 'star':
        // TODO: Implement star functionality
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Starred: ${result.title}')),
        );
        break;
      case 'share':
        // TODO: Implement share functionality
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Share: ${result.title}')),
        );
        break;
    }
  }

  /// Build source badge widget (matching frontend colors and labels)
  Widget _buildSourceBadge(String source) {
    IconData icon;
    String label;
    Color color;

    switch (source) {
      case 'google-drive':
      case 'drive':
        icon = Icons.cloud;
        label = 'Google Drive';
        color = Colors.blue;
        break;
      case 'gmail':
        icon = Icons.email;
        label = 'Gmail';
        color = Colors.pink;
        break;
      case 'smtp-imap':
      case 'smtp_imap':
        icon = Icons.email;
        label = 'Email';
        color = Colors.pink;
        break;
      case 'google-calendar':
        icon = Icons.event;
        label = 'Google Calendar';
        color = Colors.red;
        break;
      default:
        return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w500,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        title: Padding(
          padding: const EdgeInsets.only(right: 16),
          child: SizedBox(
            height: 40,
            child: TextField(
              controller: _searchController,
              autofocus: true,
              decoration: InputDecoration(
                hintText: 'search.search_everything'.tr(),
                prefixIcon: const Icon(Icons.search),
                suffixIcon: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (_searchQuery.isNotEmpty)
                      IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                        },
                      ),
                    IconButton(
                      icon: Icon(
                        _isListening ? Icons.mic : Icons.mic_outlined,
                        color: _isListening ? Colors.red : null,
                      ),
                      onPressed: _startVoiceSearch,
                      tooltip: _isListening ? 'search.stop_listening'.tr() : 'search.voice_search'.tr(),
                    ),
                  ],
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(20),
                  borderSide: BorderSide.none,
                ),
                filled: true,
                fillColor: Theme.of(context).colorScheme.surfaceContainerHighest,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16),
              ),
            ),
          ),
        ),
        bottom: PreferredSize(
          preferredSize: Size.fromHeight(_searchQuery.isNotEmpty ? 100 : 0),
          child: Column(
            children: [
              if (_searchQuery.isNotEmpty) ...[
                // Action buttons row
                Padding(
                  padding: const EdgeInsets.only(top: 0, bottom: 4),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.start,
                    children: [
                      const SizedBox(width: 8),
                      FilledButton(
                        onPressed: () {},
                        child: Text('search.text'.tr()),
                      ),
                      const SizedBox(width: 8),
                      OutlinedButton.icon(
                        onPressed: _searchQuery.length >= 3 ? _saveSearch : null,
                        icon: const Icon(Icons.bookmark_outline, size: 18),
                        label: Text('search.save'.tr()),
                      ),
                      const SizedBox(width: 8),
                      // Filter button
                      OutlinedButton.icon(
                        onPressed: _showFilters,
                        icon: Badge(
                          isLabelVisible: _hasActiveFilters,
                          label: Text(_countActiveFilters().toString()),
                          child: const Icon(Icons.filter_list, size: 18),
                        ),
                        label: Text('search.filters'.tr()),
                      ),
                    ],
                  ),
                ),
                // Divider line
                const Divider(height: 1, thickness: 1),
                // Search tabs - matching frontend exactly: All, Messages, Files, Folders, Projects, Notes, Calendar, Emails
                TabBar(
                  controller: _tabController,
                  isScrollable: true,
                  tabAlignment: TabAlignment.start,
                  padding: EdgeInsets.zero,
                  tabs: [
                    // All tab
                    Tab(
                      child: Row(
                        children: [
                          const Icon(Icons.search, size: 18),
                          const SizedBox(width: 4),
                          Text('search.tab_all'.tr()),
                          const SizedBox(width: 4),
                          Text('${_getTotalResultCount()}', style: const TextStyle(fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                    // Messages tab
                    Tab(
                      child: Row(
                        children: [
                          const Icon(Icons.chat_bubble_outline, size: 18, color: Colors.blue),
                          const SizedBox(width: 4),
                          Text('search.tab_messages'.tr()),
                          const SizedBox(width: 4),
                          Text('${_getFilteredResults('messages').length}', style: const TextStyle(fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                    // Files tab (includes Google Drive results)
                    Tab(
                      child: Row(
                        children: [
                          const Icon(Icons.insert_drive_file, size: 18, color: Colors.green),
                          const SizedBox(width: 4),
                          Text('search.tab_files'.tr()),
                          const SizedBox(width: 4),
                          Text('${_getFilesTabCount()}', style: const TextStyle(fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                    // Folders tab
                    Tab(
                      child: Row(
                        children: [
                          const Icon(Icons.folder_outlined, size: 18, color: Colors.orange),
                          const SizedBox(width: 4),
                          Text('search.tab_folders'.tr()),
                          const SizedBox(width: 4),
                          Text('${_getFilteredResults('folders').length}', style: const TextStyle(fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                    // Projects tab
                    Tab(
                      child: Row(
                        children: [
                          const Icon(Icons.work_outline, size: 18, color: Colors.purple),
                          const SizedBox(width: 4),
                          Text('search.tab_projects'.tr()),
                          const SizedBox(width: 4),
                          Text('${_getFilteredResults('projects').length}', style: const TextStyle(fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                    // Notes tab
                    Tab(
                      child: Row(
                        children: [
                          const Icon(Icons.note_outlined, size: 18, color: Colors.amber),
                          const SizedBox(width: 4),
                          Text('search.tab_notes'.tr()),
                          const SizedBox(width: 4),
                          Text('${_getFilteredResults('notes').length}', style: const TextStyle(fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                    // Calendar tab (includes Google Calendar results)
                    Tab(
                      child: Row(
                        children: [
                          const Icon(Icons.event_outlined, size: 18, color: Colors.red),
                          const SizedBox(width: 4),
                          Text('search.tab_calendar'.tr()),
                          const SizedBox(width: 4),
                          Text('${_getCalendarTabCount()}', style: const TextStyle(fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                    // Emails tab (includes Gmail and SMTP/IMAP results)
                    Tab(
                      child: Row(
                        children: [
                          const Icon(Icons.email_outlined, size: 18, color: Colors.pink),
                          const SizedBox(width: 4),
                          Text('Emails'),
                          const SizedBox(width: 4),
                          Text('${_emailResults.length}', style: const TextStyle(fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
      body: _searchQuery.isEmpty || _searchQuery.length < 3
          ? _buildEmptyState()
          : _isSearching
              ? _buildLoadingState()
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _buildGroupedSearchResults(),                           // All - grouped view
                    _buildSearchResults(_getFilteredResults('messages')),   // Messages
                    _buildFilesTabResults(),                                // Files (includes Drive)
                    _buildSearchResults(_getFilteredResults('folders')),    // Folders
                    _buildSearchResults(_getFilteredResults('projects')),   // Projects
                    _buildSearchResults(_getFilteredResults('notes')),      // Notes
                    _buildCalendarTabResults(),                             // Calendar (includes Google Calendar)
                    _buildEmailSearchResults(),                             // Emails
                  ],
                ),
    );
  }

  Widget _buildEmptyState() {
    if (_isLoadingRecent || _isLoadingSaved) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    // Show hint if user has typed but less than 3 characters
    if (_searchQuery.isNotEmpty && _searchQuery.length < 3) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.search,
              size: 64,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
            const SizedBox(height: 16),
            Text(
              'search.type_at_least_3_chars'.tr(),
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Recent Searches Section
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'search.recent_searches'.tr(),
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            if (_recentSearches.isNotEmpty)
              TextButton(
                onPressed: _clearRecentSearches,
                child: Text('search.clear_all'.tr()),
              ),
          ],
        ),
        const SizedBox(height: 16),
        if (_recentSearches.isEmpty)
          _buildEmptySection(
            icon: Icons.history,
            message: 'search.no_recent_searches'.tr(),
          )
        else
          ..._recentSearches.map((recentSearch) => _buildRecentSearchCard(recentSearch)),

        const SizedBox(height: 32),

        // Saved Searches Section
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'search.saved_searches'.tr(),
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        if (_savedSearches.isEmpty)
          _buildEmptySection(
            icon: Icons.bookmark_outline,
            message: 'search.no_saved_searches'.tr(),
          )
        else
          ..._savedSearches.map((savedSearch) => _buildSavedSearchCard(savedSearch)),
      ],
    );
  }

  Widget _buildSavedSearchCard(SavedSearch savedSearch) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.amber.withValues(alpha: 0.2),
            borderRadius: BorderRadius.circular(8),
          ),
          child: const Icon(
            Icons.bookmark,
            color: Colors.amber,
            size: 20,
          ),
        ),
        title: Text(
          savedSearch.name,
          style: const TextStyle(fontWeight: FontWeight.w500),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Text(
              savedSearch.query,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            if (savedSearch.filters.isNotEmpty) ...[
              const SizedBox(height: 4),
              Row(
                children: [
                  Icon(
                    Icons.filter_alt_outlined,
                    size: 12,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '${savedSearch.filters.length} filters',
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: Theme.of(context).colorScheme.primary,
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primary,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                '${savedSearch.resultCount}',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 11,
                ),
              ),
            ),
            const SizedBox(width: 8),
            PopupMenuButton<String>(
              icon: Icon(
                Icons.more_vert,
                size: 20,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
              padding: EdgeInsets.zero,
              onSelected: (value) {
                if (value == 'delete') {
                  _deleteSavedSearch(savedSearch);
                } else if (value == 'apply') {
                  _applySavedSearch(savedSearch);
                }
              },
              itemBuilder: (context) => [
                PopupMenuItem(
                  value: 'apply',
                  child: Row(
                    children: [
                      const Icon(Icons.search, size: 18),
                      const SizedBox(width: 8),
                      Text('search.apply_search'.tr()),
                    ],
                  ),
                ),
                PopupMenuItem(
                  value: 'delete',
                  child: Row(
                    children: [
                      Icon(Icons.delete_outline, size: 18, color: Theme.of(context).colorScheme.error),
                      const SizedBox(width: 8),
                      Text('common.delete'.tr(), style: TextStyle(color: Theme.of(context).colorScheme.error)),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
        onTap: () => _applySavedSearch(savedSearch),
      ),
    );
  }

  /// Apply a saved search (load its query and filters)
  void _applySavedSearch(SavedSearch savedSearch) {
    // Set the query
    _searchController.text = savedSearch.query;

    // Apply filters from saved search if any
    if (savedSearch.filters.isNotEmpty) {
      setState(() {
        // Parse date filters
        if (savedSearch.filters['dateFrom'] != null) {
          _dateFrom = DateTime.tryParse(savedSearch.filters['dateFrom'].toString());
        }
        if (savedSearch.filters['dateTo'] != null) {
          _dateTo = DateTime.tryParse(savedSearch.filters['dateTo'].toString());
        }
        if (savedSearch.filters['author'] != null) {
          _selectedAuthor = savedSearch.filters['author'].toString();
        }
        if (savedSearch.filters['tags'] != null && savedSearch.filters['tags'] is List) {
          _selectedTags = List<String>.from(savedSearch.filters['tags']);
        }
        if (savedSearch.filters['projectId'] != null) {
          _selectedProject = savedSearch.filters['projectId'].toString();
        }
        if (savedSearch.filters['fileTypes'] != null && savedSearch.filters['fileTypes'] is List) {
          _selectedFileTypes = List<String>.from(savedSearch.filters['fileTypes']);
        }
        if (savedSearch.filters['hasAttachments'] == true) {
          _hasFilesOnly = true;
        }
        if (savedSearch.filters['isShared'] == true) {
          _sharedOnly = true;
        }
        if (savedSearch.filters['isStarred'] == true) {
          _starredOnly = true;
        }
        _updateFilters();
      });
    }
  }

  /// Delete a saved search
  Future<void> _deleteSavedSearch(SavedSearch savedSearch) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('search.delete_saved_search'.tr()),
        content: Text('search.delete_saved_search_confirm'.tr(args: [savedSearch.name])),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('common.cancel'.tr()),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.error,
            ),
            child: Text('common.delete'.tr()),
          ),
        ],
      ),
    );

    if (confirmed == true && _workspaceId != null) {
      final success = await _searchDao.deleteSavedSearch(
        workspaceId: _workspaceId!,
        searchId: savedSearch.id,
      );

      if (success) {
        _loadSavedSearches();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('search.saved_search_deleted'.tr())),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('search.failed_to_delete_saved_search'.tr())),
          );
        }
      }
    }
  }

  Widget _buildEmptySection({
    required IconData icon,
    required String message,
  }) {
    return Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest.withOpacity(0.3),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Theme.of(context).colorScheme.outline.withOpacity(0.2),
        ),
      ),
      child: Column(
        children: [
          Icon(
            icon,
            size: 48,
            color: Theme.of(context).colorScheme.onSurfaceVariant.withOpacity(0.5),
          ),
          const SizedBox(height: 12),
          Text(
            message,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRecentSearchCard(RecentSearch recentSearch) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.primaryContainer,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(
            Icons.history,
            color: Theme.of(context).colorScheme.primary,
          ),
        ),
        title: Text(
          recentSearch.query,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Text(
              'search.results_count'.tr(args: [recentSearch.resultCount.toString()]),
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 4),
            Wrap(
              spacing: 4,
              runSpacing: 4,
              children: recentSearch.contentTypes.take(3).map((type) {
                return Chip(
                  label: Text(
                    _translateContentType(type),
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  padding: EdgeInsets.zero,
                  visualDensity: VisualDensity.compact,
                );
              }).toList(),
            ),
          ],
        ),
        trailing: Text(
          _formatDate(recentSearch.createdAt),
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
        onTap: () {
          _searchController.text = recentSearch.query;
        },
      ),
    );
  }

  Future<void> _clearRecentSearches() async {
    try {
      if (_workspaceId != null) {
        final success = await _searchDao.clearRecentSearches(
          workspaceId: _workspaceId!,
        );

        if (success) {
          setState(() {
            _recentSearches = [];
          });
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('search.recent_searches_cleared'.tr())),
            );
          }
        } else {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('search.failed_to_clear_recent'.tr())),
            );
          }
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('search.failed_to_clear_recent'.tr())),
        );
      }
    }
  }

  Widget _buildLoadingState() {
    return const Center(
      child: CircularProgressIndicator(),
    );
  }

  Widget _buildGroupedSearchResults() {
    final groupedResults = <String, List<SearchResultItem>>{};

    // Group results by content type - matching frontend tab order
    for (var result in _searchResults) {
      if (!groupedResults.containsKey(result.type)) {
        groupedResults[result.type] = [];
      }
      groupedResults[result.type]!.add(result);
    }

    // Merge Drive results into Files (matching frontend - Drive shown in Files tab with badge)
    if (_driveResults.isNotEmpty) {
      if (!groupedResults.containsKey('files')) {
        groupedResults['files'] = [];
      }
      groupedResults['files']!.addAll(_getDriveResultsAsSearchItems());
    }

    // Add Email results to grouped view (matching frontend)
    if (_emailResults.isNotEmpty) {
      groupedResults['emails'] = _getEmailResultsAsSearchItems();
    }

    // Merge Google Calendar results into events (matching frontend - Calendar shown in events with badge)
    if (_googleCalendarResults.isNotEmpty) {
      if (!groupedResults.containsKey('events')) {
        groupedResults['events'] = [];
      }
      groupedResults['events']!.addAll(_getGoogleCalendarResultsAsSearchItems());
    }

    if (groupedResults.isEmpty) {
      return _buildEmptyResults();
    }

    // Define display order matching frontend: Files, Folders, Messages, Projects, Notes, Calendar, Emails
    final displayOrder = ['files', 'folders', 'messages', 'projects', 'notes', 'events', 'emails'];
    final orderedResults = <MapEntry<String, List<SearchResultItem>>>[];

    for (final type in displayOrder) {
      if (groupedResults.containsKey(type) && groupedResults[type]!.isNotEmpty) {
        orderedResults.add(MapEntry(type, groupedResults[type]!));
      }
    }

    // Add any other types not in the display order
    for (final entry in groupedResults.entries) {
      if (!displayOrder.contains(entry.key) && entry.value.isNotEmpty) {
        orderedResults.add(entry);
      }
    }

    if (orderedResults.isEmpty) {
      return _buildEmptyResults();
    }

    return ListView(
      controller: _scrollController,
      padding: EdgeInsets.zero,
      children: [
        ...orderedResults.map((entry) {
          final type = entry.key;
          final results = entry.value;
          final displayCount = results.length > 5 ? 5 : results.length;

          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 16),
              // Category header
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  children: [
                    Icon(
                      _getTypeIcon(type),
                      size: 20,
                      color: _getTypeColor(type),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      _getCategoryName(type),
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '${results.length}',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              // Show first 5 results with source badges (matching frontend)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  children: results.take(displayCount).map((result) => _buildResultCardWithBadge(result)).toList(),
                ),
              ),
              // View All button if more than 5
              if (results.length > 5)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: TextButton(
                      onPressed: () {
                        // Switch to specific category tab
                        final tabIndex = _getTabIndexForType(type);
                        if (tabIndex != -1) {
                          _tabController.animateTo(tabIndex);
                        }
                      },
                      child: Text('search.view_all'.tr(args: [results.length.toString(), _getCategoryName(type)])),
                    ),
                  ),
                ),
              const SizedBox(height: 8),
            ],
          );
        }).toList(),
        // Loading more indicator
        if (_isLoadingMore)
          const Padding(
            padding: EdgeInsets.all(16),
            child: Center(
              child: CircularProgressIndicator(),
            ),
          ),
        // End of results indicator
        if (!_hasMoreResults && _searchResults.isNotEmpty)
          Padding(
            padding: const EdgeInsets.all(16),
            child: Center(
              child: Text(
                'search.no_more_results'.tr(),
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildEmptyResults() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.search_off,
            size: 64,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
          const SizedBox(height: 16),
          Text(
            'search.no_results_found'.tr(),
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          Text(
            'search.try_different_keywords'.tr(),
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchResults(List<SearchResultItem> results) {
    if (results.isEmpty) {
      return _buildEmptyResults();
    }

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.all(16),
      itemCount: results.length + (_isLoadingMore ? 1 : 0) + (!_hasMoreResults && results.isNotEmpty ? 1 : 0),
      itemBuilder: (context, index) {
        // Show results with source badges
        if (index < results.length) {
          final result = results[index];
          return _buildResultCardWithBadge(result);
        }

        // Show loading indicator at bottom
        if (_isLoadingMore && index == results.length) {
          return const Padding(
            padding: EdgeInsets.all(16),
            child: Center(
              child: CircularProgressIndicator(),
            ),
          );
        }

        // Show end of results
        if (!_hasMoreResults && index == results.length) {
          return Padding(
            padding: const EdgeInsets.all(16),
            child: Center(
              child: Text(
                'search.no_more_results'.tr(),
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
            ),
          );
        }

        return const SizedBox.shrink();
      },
    );
  }

  /// Build Drive search results (separate tab for Google Drive files)
  Widget _buildDriveSearchResults() {
    // Show not connected message if Drive is not connected
    if (!_isDriveConnected) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.cloud_off_outlined,
              size: 64,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
            const SizedBox(height: 16),
            Text(
              'Google Drive not connected',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'Connect Google Drive in Apps to search your Drive files',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    // Show loading if still searching Drive
    if (_isSearchingDrive) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    // Show empty state if no Drive results
    if (_driveResults.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.cloud_outlined,
              size: 64,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
            const SizedBox(height: 16),
            Text(
              'No files found in Google Drive',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'Try different search keywords',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      );
    }

    // Show Drive results
    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: _driveResults.length,
      itemBuilder: (context, index) {
        final file = _driveResults[index];
        return _buildDriveFileCard(file);
      },
    );
  }

  /// Build a card for a Google Drive file
  Widget _buildDriveFileCard(GoogleDriveFile file) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.blue.withValues(alpha: 0.2),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(
            _getDriveFileIcon(file),
            color: Colors.blue,
          ),
        ),
        title: Text(
          file.name,
          style: const TextStyle(fontWeight: FontWeight.bold),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Text(
              file.mimeType,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            if (file.modifiedTime != null)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  _formatDate(file.modifiedTime!),
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
              ),
          ],
        ),
        trailing: Icon(
          Icons.open_in_new,
          size: 18,
          color: Theme.of(context).colorScheme.onSurfaceVariant,
        ),
        onTap: () => _openDriveFile(file),
      ),
    );
  }

  /// Get icon for Drive file based on type
  IconData _getDriveFileIcon(GoogleDriveFile file) {
    switch (file.fileType) {
      case GoogleDriveFileType.folder:
        return Icons.folder;
      case GoogleDriveFileType.document:
        return Icons.description;
      case GoogleDriveFileType.spreadsheet:
        return Icons.table_chart;
      case GoogleDriveFileType.presentation:
        return Icons.slideshow;
      case GoogleDriveFileType.image:
        return Icons.image;
      case GoogleDriveFileType.video:
        return Icons.video_file;
      case GoogleDriveFileType.pdf:
        return Icons.picture_as_pdf;
      default:
        return Icons.insert_drive_file;
    }
  }

  /// Open Drive file in browser (matching frontend: window.open)
  Future<void> _openDriveFile(GoogleDriveFile file) async {
    final url = file.webViewLink;
    if (url != null && url.isNotEmpty) {
      try {
        final uri = Uri.parse(url);
        if (await canLaunchUrl(uri)) {
          await launchUrl(uri, mode: LaunchMode.externalApplication);
        } else {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Could not open file')),
            );
          }
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error opening file: $e')),
          );
        }
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No link available for this file')),
        );
      }
    }
  }

  /// Build Email search results (separate tab for Email messages)
  Widget _buildEmailSearchResults() {
    // Show not connected message if Email is not connected
    if (!_isEmailConnected) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.email_outlined,
              size: 64,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
            const SizedBox(height: 16),
            Text(
              'search.email_not_connected'.tr(),
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'search.connect_email_hint'.tr(),
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    // Show loading if still searching Email
    if (_isSearchingEmail) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    // Show empty state if no Email results
    if (_emailResults.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.email_outlined,
              size: 64,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
            const SizedBox(height: 16),
            Text(
              'search.no_emails_found'.tr(),
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'search.try_different_keywords'.tr(),
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      );
    }

    // Show Email results
    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: _emailResults.length,
      itemBuilder: (context, index) {
        final email = _emailResults[index];
        return _buildEmailCard(email);
      },
    );
  }

  /// Build a card for an Email message
  Widget _buildEmailCard(EmailListItem email) {
    final isRead = email.isRead;
    final isStarred = email.isStarred;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.pink.withValues(alpha: 0.2),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Stack(
            children: [
              Icon(
                isRead ? Icons.email_outlined : Icons.email,
                color: Colors.pink,
              ),
              if (isStarred)
                Positioned(
                  right: -4,
                  top: -4,
                  child: Icon(
                    Icons.star,
                    size: 12,
                    color: Colors.amber,
                  ),
                ),
            ],
          ),
        ),
        title: Text(
          email.subject ?? '(No Subject)',
          style: TextStyle(
            fontWeight: isRead ? FontWeight.normal : FontWeight.bold,
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Text(
              email.snippet,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                Icon(
                  Icons.person_outline,
                  size: 14,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    email.from?.formatted ?? email.from?.email ?? 'Unknown',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                if (email.hasAttachments) ...[
                  const SizedBox(width: 8),
                  Icon(
                    Icons.attach_file,
                    size: 14,
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ],
              ],
            ),
            if (email.date != null) ...[
              const SizedBox(height: 4),
              Row(
                children: [
                  Icon(
                    Icons.access_time,
                    size: 14,
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    _formatEmailDate(email.date!),
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
        trailing: Icon(
          Icons.arrow_forward_ios,
          size: 16,
          color: Theme.of(context).colorScheme.onSurfaceVariant,
        ),
        onTap: () => _openEmailFromSearch(email),
      ),
    );
  }

  /// Format email date for display
  String _formatEmailDate(String dateStr) {
    final date = DateTime.tryParse(dateStr);
    if (date == null) return dateStr;
    return _formatDate(date);
  }

  /// Open an email from search results - navigates to the email screen
  Future<void> _openEmailFromSearch(EmailListItem email) async {
    try {
      // Navigate to EmailScreen which will show the email
      if (mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => const EmailScreen(),
          ),
        );
        // Show a hint that user should find the email in their inbox
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('search.email_opened_hint'.tr(args: [email.subject ?? '(No Subject)'])),
            duration: const Duration(seconds: 3),
          ),
        );
      }
    } catch (e) {
      _showErrorMessage('search.unable_to_open_email'.tr(args: [e.toString()]));
    }
  }

  String _getCategoryName(String type) {
    switch (type) {
      case 'messages':
        return 'search.tab_messages'.tr();
      case 'files':
        return 'search.tab_files'.tr();
      case 'folders':
        return 'search.tab_folders'.tr();
      case 'notes':
        return 'search.tab_notes'.tr();
      case 'tasks':
        return 'search.tab_tasks'.tr();
      case 'projects':
        return 'search.tab_projects'.tr();
      case 'events':
        return 'search.tab_calendar'.tr();
      case 'videos':
        return 'search.tab_videos'.tr();
      case 'drive':
        return 'Google Drive';
      case 'emails':
        return 'Emails';
      default:
        return type;
    }
  }

  /// Get tab index for type - matching frontend tab structure exactly
  /// Tabs: All(0), Messages(1), Files(2), Folders(3), Projects(4), Notes(5), Calendar(6), Emails(7)
  int _getTabIndexForType(String type) {
    switch (type) {
      case 'messages':
        return 1;
      case 'files':
      case 'drive': // Drive results shown in Files tab
        return 2;
      case 'folders':
        return 3;
      case 'projects':
        return 4;
      case 'notes':
        return 5;
      case 'events':
      case 'calendar':
        return 6;
      case 'emails':
        return 7;
      default:
        return 0; // Default to All tab
    }
  }

  Widget _buildResultCard(SearchResultItem result) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: _getTypeColor(result.type).withValues(alpha: 0.2),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(
            _getTypeIcon(result.type),
            color: _getTypeColor(result.type),
          ),
        ),
        title: Text(
          result.title,
          style: const TextStyle(fontWeight: FontWeight.bold),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (result.content != null) ...[
              const SizedBox(height: 4),
              // Use HTML renderer for notes, plain text for others
              if (result.type == 'notes')
                Html(
                  data: result.content!,
                  style: {
                    "body": Style(
                      margin: Margins.zero,
                      padding: HtmlPaddings.zero,
                      fontSize: FontSize(Theme.of(context).textTheme.bodyMedium?.fontSize ?? 14),
                      maxLines: 2,
                      textOverflow: TextOverflow.ellipsis,
                    ),
                    "p": Style(
                      margin: Margins.zero,
                      padding: HtmlPaddings.zero,
                    ),
                  },
                )
              else
                Text(
                  result.content!,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
            ],
            const SizedBox(height: 6),
            // Author and path in one row
            if (result.author != null || result.path != null)
              Row(
                children: [
                  if (result.author != null) ...[
                    Icon(
                      Icons.person_outline,
                      size: 14,
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                    const SizedBox(width: 4),
                    Flexible(
                      child: Text(
                        result.author!,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                  if (result.author != null && result.path != null)
                    const SizedBox(width: 8),
                  if (result.path != null)
                    Flexible(
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.folder_outlined,
                            size: 14,
                            color: Theme.of(context).colorScheme.primary,
                          ),
                          const SizedBox(width: 4),
                          Flexible(
                            child: Text(
                              result.path!,
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: Theme.of(context).colorScheme.primary,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            // Date in separate row
            if (result.createdAt != null) ...[
              const SizedBox(height: 4),
              Row(
                children: [
                  Icon(
                    Icons.access_time,
                    size: 14,
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    _formatDate(result.createdAt!),
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
        trailing: Icon(
          Icons.arrow_forward_ios,
          size: 16,
          color: Theme.of(context).colorScheme.onSurfaceVariant,
        ),
        onTap: () => _openResult(result),
      ),
    );
  }


  IconData _getTypeIcon(String type) {
    switch (type) {
      case 'messages':
        return Icons.chat_bubble_outline;
      case 'files':
        return Icons.insert_drive_file;
      case 'folders':
        return Icons.folder_outlined;
      case 'notes':
        return Icons.note_outlined;
      case 'tasks':
        return Icons.task_alt_outlined;
      case 'projects':
        return Icons.work_outline;
      case 'events':
        return Icons.event_outlined;
      case 'videos':
        return Icons.videocam_outlined;
      case 'drive':
        return Icons.cloud_outlined;
      case 'emails':
        return Icons.email_outlined;
      default:
        return Icons.search;
    }
  }

  /// Get type color matching frontend exactly:
  /// messages: blue, files: green, folders: orange, projects: purple,
  /// notes: amber/yellow, events: red, emails: pink
  Color _getTypeColor(String type) {
    switch (type) {
      case 'messages':
        return Colors.blue;
      case 'files':
        return Colors.green;
      case 'folders':
        return Colors.orange;
      case 'projects':
        return Colors.purple;
      case 'notes':
        return Colors.amber;
      case 'tasks':
        return Colors.orange;
      case 'events':
        return Colors.red;
      case 'videos':
        return Colors.teal;
      case 'drive':
        return Colors.blue; // Google Drive blue color
      case 'emails':
        return Colors.pink; // Email pink color (matching frontend)
      default:
        return Colors.grey;
    }
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);

    if (difference.inMinutes < 60) {
      return 'search.minutes_ago'.tr(args: [difference.inMinutes.toString()]);
    } else if (difference.inHours < 24) {
      return 'search.hours_ago'.tr(args: [difference.inHours.toString()]);
    } else if (difference.inDays < 7) {
      return 'search.days_ago'.tr(args: [difference.inDays.toString()]);
    } else {
      return '${date.day}/${date.month}/${date.year}';
    }
  }

  String _translateContentType(String type) {
    switch (type.toLowerCase()) {
      case 'notes':
        return 'search.content_type_notes'.tr();
      case 'files':
        return 'search.content_type_files'.tr();
      case 'folders':
        return 'search.content_type_folders'.tr();
      case 'messages':
        return 'search.content_type_messages'.tr();
      case 'tasks':
        return 'search.content_type_tasks'.tr();
      case 'events':
        return 'search.content_type_events'.tr();
      case 'projects':
        return 'search.content_type_projects'.tr();
      case 'calendar':
        return 'search.content_type_calendar'.tr();
      case 'videos':
        return 'search.content_type_videos'.tr();
      case 'emails':
        return 'search.content_type_emails'.tr();
      default:
        return type;
    }
  }

  /// Get content types for current tab - matching frontend exactly
  /// Tabs: All(0), Messages(1), Files(2), Folders(3), Projects(4), Notes(5), Calendar(6), Emails(7)
  List<String> _getCurrentTabTypes() {
    final tabIndex = _tabController.index;
    switch (tabIndex) {
      case 0: // All
        return [];
      case 1: // Messages
        return ['messages'];
      case 2: // Files (includes Google Drive)
        return ['files'];
      case 3: // Folders
        return ['folders'];
      case 4: // Projects
        return ['projects'];
      case 5: // Notes
        return ['notes'];
      case 6: // Calendar
        return ['events'];
      case 7: // Emails (Gmail + SMTP/IMAP)
        return ['emails'];
      default:
        return [];
    }
  }

  Future<void> _saveSearch() async {
    if (_workspaceId == null) {
      _showErrorMessage('search.workspace_not_found'.tr());
      return;
    }

    // Show dialog to get search name
    final TextEditingController nameController = TextEditingController();
    final result = await showDialog<bool>(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Text('search.save_search'.tr()),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('search.enter_search_name'.tr()),
              const SizedBox(height: 16),
              TextField(
                controller: nameController,
                autofocus: true,
                decoration: InputDecoration(
                  hintText: 'search.search_name_hint'.tr(),
                  border: const OutlineInputBorder(),
                ),
                onSubmitted: (_) {
                  if (nameController.text.trim().isNotEmpty) {
                    Navigator.pop(context, true);
                  }
                },
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text('common.cancel'.tr()),
            ),
            ElevatedButton(
              onPressed: () {
                if (nameController.text.trim().isNotEmpty) {
                  Navigator.pop(context, true);
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('search.please_enter_name'.tr()),
                      backgroundColor: Colors.red,
                    ),
                  );
                }
              },
              child: Text('search.save'.tr()),
            ),
          ],
        );
      },
    );

    if (result == true && nameController.text.trim().isNotEmpty) {
      try {
        final types = _getCurrentTabTypes();

        // Get filtered results for the current tab
        List<SearchResultItem> resultsToSave;
        if (types.isEmpty) {
          // All tab - save all results
          resultsToSave = _searchResults;
        } else {
          // Specific tab - save only filtered results for that type
          resultsToSave = _getFilteredResults(types.first);
        }

        // Convert results to JSON for the snapshot
        final resultsSnapshot = resultsToSave.map((result) => result.toJson()).toList();

        final response = await _searchDao.saveSearch(
          workspaceId: _workspaceId!,
          name: nameController.text.trim(),
          query: _searchQuery,
          types: types.isNotEmpty ? types : null,
          mode: 'hybrid',
          resultsSnapshot: resultsSnapshot,
        );

        if (mounted) {
          if (response['success'] == true) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('search.search_saved_with_results'.tr(args: [resultsToSave.length.toString()])),
                backgroundColor: Colors.green,
              ),
            );
            // Reload saved searches
            _loadSavedSearches();
          } else {
            _showErrorMessage(response['message'] ?? 'search.failed_to_save_search'.tr());
          }
        }
      } catch (e) {
        if (mounted) {
          _showErrorMessage('search.error_saving_search'.tr(args: [e.toString()]));
        }
      }
    }

    nameController.dispose();
  }

  void _openResult(SearchResultItem result) {
    try {
      switch (result.type.toLowerCase()) {
        case 'projects':
          // Navigate to specific project details screen
          _openProjectFromSearch(result);
          break;

        case 'tasks':
          // Navigate to task details screen
          _openTaskFromSearch(result);
          break;

        case 'notes':
          // Navigate to note editor with the specific note
          _openNoteFromSearch(result);
          break;

        case 'folders':
          // Navigate to folder screen
          try {
            final folderId = result.id;
            final folderName = result.title;
            final workspaceId = _workspaceId ?? '';
            final itemCount = result.metadata?['item_count'] ?? 0;
            final isShared = result.metadata?['is_shared'] ?? false;

            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => FolderScreen(
                  folderId: folderId,
                  folderName: folderName,
                  workspaceId: workspaceId,
                  itemCount: itemCount,
                  isShared: isShared,
                ),
              ),
            );
          } catch (e) {
            _showErrorMessage('search.unable_to_open_folder'.tr(args: [e.toString()]));
          }
          break;

        case 'files':
          // Navigate to file preview screen
          _openFileFromSearch(result);
          break;

        case 'messages':
          // Navigate to chat screen with the message
          _openMessageFromSearch(result);
          break;

        case 'events':
        case 'calendar':
          // Navigate to event edit screen
          _openEventFromSearch(result);
          break;

        case 'videos':
          // Navigate to meeting details screen
          _openVideoCallFromSearch(result);
          break;

        case 'drive':
          // Open Google Drive file in browser (matching frontend: window.open)
          _openDriveResultFromSearch(result);
          break;

        case 'emails':
          // Navigate to email screen
          _openEmailResultFromSearch(result);
          break;

        default:
          _showErrorMessage('search.content_type_not_supported'.tr(args: [result.type]));
      }
    } catch (e) {
      _showErrorMessage('search.error_opening_result'.tr(args: [e.toString()]));
    }
  }

  /// Open a Google Drive file from search results
  Future<void> _openDriveResultFromSearch(SearchResultItem result) async {
    final webViewLink = result.metadata?['webViewLink'] as String?;
    if (webViewLink != null && webViewLink.isNotEmpty) {
      try {
        final uri = Uri.parse(webViewLink);
        if (await canLaunchUrl(uri)) {
          await launchUrl(uri, mode: LaunchMode.externalApplication);
        } else {
          _showErrorMessage('Could not open file');
        }
      } catch (e) {
        _showErrorMessage('Error opening file: $e');
      }
    } else {
      _showErrorMessage('No link available for this file');
    }
  }

  /// Open an email from search results (from grouped/unified view)
  Future<void> _openEmailResultFromSearch(SearchResultItem result) async {
    try {
      // Navigate to EmailScreen which will show the email
      if (mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => const EmailScreen(),
          ),
        );
        // Show a hint that user should find the email in their inbox
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('search.email_opened_hint'.tr(args: [result.title])),
            duration: const Duration(seconds: 3),
          ),
        );
      }
    } catch (e) {
      _showErrorMessage('search.unable_to_open_email'.tr(args: [e.toString()]));
    }
  }

  /// Open a note from search results
  Future<void> _openNoteFromSearch(SearchResultItem result) async {
    try {
      final noteId = result.id;
      final workspaceId = _workspaceId ?? '';

      if (noteId.isNotEmpty && workspaceId.isNotEmpty) {
        // Show loading indicator
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (context) => const Center(
            child: CircularProgressIndicator(),
          ),
        );

        // Try to get note from NotesService cache first
        final notesService = NotesService();
        Note? localNote = notesService.getNote(noteId);

        // If not in cache, fetch from API and convert
        if (localNote == null) {
          await notesService.fetchNotesFromApi(forceRefresh: true);
          localNote = notesService.getNote(noteId);
        }

        // Close loading indicator
        if (mounted) Navigator.pop(context);

        if (localNote != null) {
          if (mounted) {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => NoteEditorScreen(
                  note: localNote,
                  initialMode: NoteEditorMode.edit,
                ),
              ),
            );
          }
        } else {
          // If still not found, create a minimal note object from search result
          final minimalNote = Note(
            id: noteId,
            title: result.title,
            description: result.content ?? '',
            content: result.content ?? '',
            icon: '📝',
            categoryId: 'work',
            subcategory: 'Notes',
            keywords: [],
            createdAt: result.createdAt ?? DateTime.now(),
            updatedAt: result.updatedAt ?? DateTime.now(),
          );

          if (mounted) {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => NoteEditorScreen(
                  note: minimalNote,
                  initialMode: NoteEditorMode.edit,
                ),
              ),
            );
          }
        }
      } else {
        // Fallback to notes screen if no noteId
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => const NotesScreen(),
          ),
        );
      }
    } catch (e) {
      // Close loading dialog if still open
      if (mounted) {
        Navigator.of(context, rootNavigator: true).pop();
      }
      _showErrorMessage('search.unable_to_open_note'.tr(args: [e.toString()]));
    }
  }

  void _showErrorMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  /// Open a task from search results
  Future<void> _openTaskFromSearch(SearchResultItem result) async {
    try {
      final taskId = result.id;

      if (taskId.isNotEmpty) {
        // Show loading indicator
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (context) => const Center(
            child: CircularProgressIndicator(),
          ),
        );

        // Fetch task from ProjectService
        final projectService = ProjectService();
        final task = await projectService.getTaskById(taskId);

        // Close loading indicator
        if (mounted) Navigator.pop(context);

        if (task != null) {
          if (mounted) {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => TaskDetailsScreen(task: task),
              ),
            );
          }
        } else {
          _showErrorMessage('search.task_not_found'.tr());
        }
      } else {
        // Fallback to project dashboard if no task ID
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => const ProjectDashboardScreen(),
          ),
        );
      }
    } catch (e) {
      // Close loading dialog if still open
      if (mounted) {
        Navigator.of(context, rootNavigator: true).pop();
      }
      _showErrorMessage('search.unable_to_open_task'.tr(args: [e.toString()]));
    }
  }

  /// Open a file from search results
  Future<void> _openFileFromSearch(SearchResultItem result) async {
    try {
      final fileId = result.id;
      final workspaceId = _workspaceId ?? '';
      final folderId = result.metadata?['folder_id']?.toString();
      final fileName = result.title.isNotEmpty ? result.title : (result.metadata?['name']?.toString() ?? 'File');

      if (fileId.isEmpty || workspaceId.isEmpty) {
        // Fallback: Navigate to FilesScreen
        if (mounted) {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => const FilesScreen(),
            ),
          );
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('search.file_info_missing'.tr())),
          );
        }
        return;
      }

      // Show loading indicator
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(
          child: CircularProgressIndicator(),
        ),
      );

      // Fetch file from FileService
      final fileService = FileService.instance;
      fileService.initialize(workspaceId);
      final file = await fileService.getFileById(fileId);

      // Close loading indicator
      if (mounted) Navigator.pop(context);

      if (file != null) {
        if (mounted) {
          // Open file preview based on mime type
          if (file.mimeType.startsWith('image/')) {
            showImagePreviewDialog(context, file: file);
          } else if (file.mimeType.startsWith('video/')) {
            showVideoPlayerDialog(context, file: file);
          } else {
            // For other file types, navigate to folder containing the file
            final targetFolderId = file.folderId ?? folderId;
            if (targetFolderId != null && targetFolderId.isNotEmpty) {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => FolderScreen(
                    folderId: targetFolderId,
                    folderName: 'search.tab_files'.tr(),
                    workspaceId: workspaceId,
                    itemCount: 0,
                    isShared: false,
                  ),
                ),
              );
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('search.showing_folder_containing'.tr(args: [fileName]))),
              );
            } else {
              // Navigate to FilesScreen root
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const FilesScreen(),
                ),
              );
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('search.file_in_root_folder'.tr(args: [fileName]))),
              );
            }
          }
        }
      } else {
        // File not found, but try to navigate to folder if we have folder_id from metadata
        if (folderId != null && folderId.isNotEmpty && mounted) {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => FolderScreen(
                folderId: folderId,
                folderName: 'search.tab_files'.tr(),
                workspaceId: workspaceId,
                itemCount: 0,
                isShared: false,
              ),
            ),
          );
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('search.showing_folder_where_found'.tr(args: [fileName]))),
          );
        } else if (mounted) {
          // Fallback to FilesScreen
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => const FilesScreen(),
            ),
          );
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('search.file_not_found_showing_all'.tr())),
          );
        }
      }
    } catch (e) {
      // Close loading dialog if still open
      if (mounted) {
        try {
          Navigator.of(context, rootNavigator: true).pop();
        } catch (_) {}
      }
      // Fallback to FilesScreen on error
      if (mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => const FilesScreen(),
          ),
        );
      }
    }
  }

  /// Open a calendar event from search results
  Future<void> _openEventFromSearch(SearchResultItem result) async {
    try {
      final eventId = result.id;
      final workspaceId = _workspaceId ?? '';

      if (eventId.isNotEmpty && workspaceId.isNotEmpty) {
        // Show loading indicator
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (context) => const Center(
            child: CircularProgressIndicator(),
          ),
        );

        // Fetch event from CalendarApiService
        final calendarApi = calendar_api.CalendarApiService();
        final response = await calendarApi.getEvent(workspaceId, eventId);

        // Close loading indicator
        if (mounted) Navigator.pop(context);

        if (response.isSuccess && response.data != null) {
          final apiEvent = response.data!;

          // Convert calendar_api.CalendarEvent to local_calendar.CalendarEvent
          final localEvent = local_calendar.CalendarEvent(
            id: apiEvent.id,
            workspaceId: apiEvent.workspaceId,
            userId: apiEvent.organizerId,
            title: apiEvent.title,
            description: apiEvent.description,
            startTime: apiEvent.startTime,
            endTime: apiEvent.endTime,
            allDay: apiEvent.isAllDay,
            location: apiEvent.location,
            organizerId: apiEvent.organizerId,
            categoryId: apiEvent.categoryId,
            attendees: apiEvent.attendees?.map((a) => {
              'user_id': a.id,
              'name': a.name,
              'email': a.email,
              'status': a.status,
            }).toList() ?? [],
            attachments: apiEvent.attachments != null
                ? local_calendar.CalendarEventAttachments(
                    fileAttachment: apiEvent.attachments!.fileAttachment,
                    noteAttachment: apiEvent.attachments!.noteAttachment,
                    eventAttachment: apiEvent.attachments!.eventAttachment,
                  )
                : null,
            isRecurring: apiEvent.isRecurring,
            meetingUrl: apiEvent.meetingUrl,
            roomId: apiEvent.meetingRoomId,
            createdAt: apiEvent.createdAt,
            updatedAt: apiEvent.updatedAt,
          );

          if (mounted) {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => EditEventScreen(
                  event: localEvent,
                  onEventUpdated: (updatedEvent) {
                    // Handle event update if needed
                  },
                  onEventDeleted: () {
                    // Handle event deletion if needed
                  },
                ),
              ),
            );
          }
        } else {
          // Fallback to calendar screen if event not found
          if (mounted) {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => const CalendarScreen(),
              ),
            );
          }
        }
      } else {
        // Fallback to calendar screen
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => const CalendarScreen(),
          ),
        );
      }
    } catch (e) {
      // Close loading dialog if still open
      if (mounted) {
        Navigator.of(context, rootNavigator: true).pop();
      }
      _showErrorMessage('search.unable_to_open_event'.tr(args: [e.toString()]));
    }
  }

  /// Open a video call from search results
  Future<void> _openVideoCallFromSearch(SearchResultItem result) async {
    try {
      final callId = result.id;

      if (callId.isNotEmpty) {
        // Show loading indicator
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (context) => const Center(
            child: CircularProgressIndicator(),
          ),
        );

        // Fetch video call from VideoCallDao
        final videoCallDao = VideoCallDao();
        final videoCall = await videoCallDao.getCallById(callId);

        // Close loading indicator
        if (mounted) Navigator.pop(context);

        if (videoCall != null) {
          if (mounted) {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => MeetingDetailsScreen(
                  meetingId: videoCall.id,
                  callType: videoCall.callType,
                  title: videoCall.title,
                  duration: videoCall.formattedDuration,
                  date: videoCall.formattedDate,
                  time: videoCall.formattedTime,
                  status: videoCall.status,
                  participantCount: videoCall.participantCount,
                  participants: const [],
                  hasNotes: false,
                  hasSummary: false,
                ),
              ),
            );
          }
        } else {
          // Fallback to video calls home screen
          if (mounted) {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => const VideoCallsHomeScreen(),
              ),
            );
          }
        }
      } else {
        // Fallback to video calls home screen
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => const VideoCallsHomeScreen(),
          ),
        );
      }
    } catch (e) {
      // Close loading dialog if still open
      if (mounted) {
        Navigator.of(context, rootNavigator: true).pop();
      }
      _showErrorMessage('search.unable_to_open_video_call'.tr(args: [e.toString()]));
    }
  }

  /// Open a message from search results - navigates to the chat containing the message
  Future<void> _openMessageFromSearch(SearchResultItem result) async {
    try {
      // The backend returns message data with channel_id directly in the result
      // metadata contains the entire JSON response from the search
      final channelId = result.metadata?['channel_id']?.toString();
      final conversationId = result.metadata?['conversation_id']?.toString();

      // Check if we have either channel_id or conversation_id
      final hasChannel = channelId != null && channelId.isNotEmpty;
      final hasConversation = conversationId != null && conversationId.isNotEmpty;

      if (!hasChannel && !hasConversation) {
        // Fallback: Navigate to messages screen so user can find the chat manually
        if (mounted) {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => const MessagesScreen(),
            ),
          );
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('search.could_not_find_chat'.tr())),
          );
        }
        return;
      }

      // Get channel name from metadata (enriched by backend)
      String chatName = 'Chat';

      // Try to extract channel name from enriched metadata
      if (result.metadata?['channel_name'] != null && result.metadata!['channel_name'].toString().isNotEmpty) {
        chatName = result.metadata!['channel_name'].toString();
      } else if (result.metadata?['name'] != null) {
        chatName = result.metadata!['name'].toString();
      } else if (result.title.isNotEmpty) {
        chatName = result.title;
      } else if (result.content != null && result.content!.isNotEmpty) {
        final content = result.content!;
        chatName = content.length > 30 ? '${content.substring(0, 30)}...' : content;
      }

      // Determine if it's a channel or direct message based on metadata
      // Backend now returns channel_type and is_private_channel
      final channelType = result.metadata?['channel_type']?.toString() ?? '';
      final isChannel = hasChannel && (channelType == 'channel' || channelType == 'public');
      final isPrivateChannel = result.metadata?['is_private_channel'] == true || channelType == 'private';

      if (mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => ChatScreen(
              chatName: chatName,
              isChannel: isChannel,
              isPrivateChannel: isPrivateChannel,
              channelId: hasChannel ? channelId : null,
              conversationId: hasConversation ? conversationId : null,
            ),
          ),
        );
      }
    } catch (e) {
      // Fallback: Navigate to messages screen
      if (mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => const MessagesScreen(),
          ),
        );
      }
    }
  }

  /// Open a project from search results
  Future<void> _openProjectFromSearch(SearchResultItem result) async {
    try {
      final projectId = result.id;
      final workspaceId = _workspaceId ?? result.metadata?['workspace_id'];

      if (projectId.isEmpty) {
        _showErrorMessage('search.missing_project_id'.tr());
        return;
      }

      // Show loading indicator
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(
          child: CircularProgressIndicator(),
        ),
      );

      // Fetch project from services/ProjectService (returns models/project.dart)
      final projectService = services_project.ProjectService.instance;
      final project = await projectService.getProject(projectId, workspaceId: workspaceId);

      // Close loading indicator
      if (mounted) Navigator.pop(context);

      if (project != null) {
        if (mounted) {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => ProjectDetailsScreen(project: project),
            ),
          );
        }
      } else {
        // Fallback: Try to create a minimal project from search result metadata
        try {
          final minimalProject = local_project.Project(
            id: projectId,
            workspaceId: workspaceId ?? '',
            name: result.title,
            description: result.content,
            type: result.metadata?['type'] ?? 'kanban',
            status: result.metadata?['status'] ?? 'active',
            createdAt: result.createdAt ?? DateTime.now(),
            updatedAt: result.updatedAt ?? DateTime.now(),
          );

          if (mounted) {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => ProjectDetailsScreen(project: minimalProject),
              ),
            );
          }
        } catch (e) {
          // If creating minimal project fails, fallback to dashboard
          if (mounted) {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => const ProjectDashboardScreen(),
              ),
            );
          }
        }
      }
    } catch (e) {
      // Close loading dialog if still open
      if (mounted) {
        Navigator.of(context, rootNavigator: true).pop();
      }
      _showErrorMessage('search.unable_to_open_project'.tr(args: [e.toString()]));
    }
  }

  Future<void> _startVoiceSearch() async {
    if (_isListening) {
      // Stop listening
      await _speech.stop();
      setState(() {
        _isListening = false;
      });
      return;
    }

    // Request permission and initialize speech recognition
    final available = await _initSpeechIfNeeded();

    if (!available) {
      _showErrorMessage('search.speech_not_available'.tr());
      return;
    }

    // Start listening
    setState(() {
      _isListening = true;
    });

    await _speech.listen(
      onResult: (result) {
        setState(() {
          _searchController.text = result.recognizedWords;
        });
      },
      listenFor: const Duration(seconds: 30),
      pauseFor: const Duration(seconds: 3),
      partialResults: true,
      cancelOnError: true,
      listenMode: stt.ListenMode.confirmation,
    );
  }

  void _showFilters() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Container(
          padding: const EdgeInsets.all(24),
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.85,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'search.filters'.tr(),
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    TextButton(
                      onPressed: () {
                        setModalState(() {
                          _clearAllFilters();
                        });
                      },
                      child: Text('search.clear_all'.tr()),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Date Range Section (matching frontend)
                Text(
                  'search.filter_date'.tr(),
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _buildDatePresetChip(
                      label: 'search.date_today'.tr(),
                      preset: 'today',
                      setModalState: setModalState,
                    ),
                    _buildDatePresetChip(
                      label: 'search.date_yesterday'.tr(),
                      preset: 'yesterday',
                      setModalState: setModalState,
                    ),
                    _buildDatePresetChip(
                      label: 'search.date_last7days'.tr(),
                      preset: 'last7days',
                      setModalState: setModalState,
                    ),
                    _buildDatePresetChip(
                      label: 'search.date_last30days'.tr(),
                      preset: 'last30days',
                      setModalState: setModalState,
                    ),
                    _buildFilterChip(
                      icon: Icons.date_range,
                      label: 'search.date_custom'.tr(),
                      selected: _datePreset == 'custom',
                      onTap: () async {
                        Navigator.pop(context);
                        await _showCustomDateRangePicker();
                      },
                    ),
                  ],
                ),
                if (_dateFrom != null || _dateTo != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    '${_dateFrom != null ? DateFormat.yMMMd().format(_dateFrom!) : 'Start'} - ${_dateTo != null ? DateFormat.yMMMd().format(_dateTo!) : 'End'}',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.primary,
                    ),
                  ),
                ],

                const SizedBox(height: 20),

                // Project Filter
                Text(
                  'search.filter_project'.tr(),
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                if (_availableProjects.isEmpty)
                  Text(
                    'search.no_projects'.tr(),
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  )
                else
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _availableProjects.map((project) {
                      final projectId = project['id'] as String;
                      final projectName = project['name'] as String;
                      return FilterChip(
                        label: Text(projectName),
                        selected: _selectedProject == projectId,
                        onSelected: (selected) {
                          setModalState(() {
                            _selectedProject = selected ? projectId : null;
                          });
                          setState(() {});
                        },
                      );
                    }).toList(),
                  ),

                const SizedBox(height: 20),

                // File Type Filter
                Text(
                  'search.filter_file_type'.tr(),
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _buildFileTypeChip('Documents', ['pdf', 'doc', 'docx', 'txt'], Icons.description, setModalState),
                    _buildFileTypeChip('Images', ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'], Icons.image, setModalState),
                    _buildFileTypeChip('Videos', ['mp4', 'mov', 'avi', 'webm'], Icons.videocam, setModalState),
                    _buildFileTypeChip('Audio', ['mp3', 'wav', 'aac', 'm4a'], Icons.audiotrack, setModalState),
                    _buildFileTypeChip('Archives', ['zip', 'rar', '7z', 'tar', 'gz'], Icons.archive, setModalState),
                  ],
                ),

                const SizedBox(height: 20),

                // Quick Filters
                Text(
                  'search.quick_filters'.tr(),
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _buildFilterChip(
                      icon: Icons.attach_file,
                      label: 'search.filter_has_files'.tr(),
                      selected: _hasFilesOnly,
                      onTap: () {
                        setModalState(() {
                          _hasFilesOnly = !_hasFilesOnly;
                        });
                        setState(() {});
                      },
                    ),
                    _buildFilterChip(
                      icon: Icons.star_outline,
                      label: 'search.filter_starred'.tr(),
                      selected: _starredOnly,
                      onTap: () {
                        setModalState(() {
                          _starredOnly = !_starredOnly;
                        });
                        setState(() {});
                      },
                    ),
                    _buildFilterChip(
                      icon: Icons.share_outlined,
                      label: 'search.filter_shared'.tr(),
                      selected: _sharedOnly,
                      onTap: () {
                        setModalState(() {
                          _sharedOnly = !_sharedOnly;
                        });
                        setState(() {});
                      },
                    ),
                  ],
                ),

                const SizedBox(height: 24),

                // Active filters count
                if (_hasActiveFilters)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: Text(
                      'search.active_filters_count'.tr(args: [_countActiveFilters().toString()]),
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.primary,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),

                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: () {
                      _updateFilters();
                      Navigator.pop(context);
                      _performSearch(resetPage: true);
                    },
                    child: Text('search.apply_filters'.tr()),
                  ),
                ),
                SizedBox(height: MediaQuery.of(context).viewInsets.bottom),
              ],
            ),
          ),
        ),
      ),
    );
  }

  /// Build a date preset chip
  Widget _buildDatePresetChip({
    required String label,
    required String preset,
    required StateSetter setModalState,
  }) {
    return FilterChip(
      label: Text(label),
      selected: _datePreset == preset,
      onSelected: (selected) {
        setModalState(() {
          if (selected) {
            _applyDatePreset(preset);
          } else {
            _dateFrom = null;
            _dateTo = null;
            _datePreset = null;
          }
        });
        setState(() {});
      },
    );
  }

  /// Build a file type chip
  Widget _buildFileTypeChip(
    String label,
    List<String> extensions,
    IconData icon,
    StateSetter setModalState,
  ) {
    final isSelected = _selectedFileTypes.any((ext) => extensions.contains(ext));
    return FilterChip(
      avatar: Icon(icon, size: 16),
      label: Text(label),
      selected: isSelected,
      onSelected: (selected) {
        setModalState(() {
          if (selected) {
            _selectedFileTypes.addAll(extensions.where((ext) => !_selectedFileTypes.contains(ext)));
          } else {
            _selectedFileTypes.removeWhere((ext) => extensions.contains(ext));
          }
        });
        setState(() {});
      },
    );
  }

  /// Count active filters
  int _countActiveFilters() {
    int count = 0;
    if (_dateFrom != null || _dateTo != null) count++;
    if (_selectedAuthor != null) count++;
    if (_selectedTags.isNotEmpty) count++;
    if (_selectedProject != null) count++;
    if (_selectedFileTypes.isNotEmpty) count++;
    if (_hasFilesOnly) count++;
    if (_starredOnly) count++;
    if (_sharedOnly) count++;
    return count;
  }

  /// Show custom date range picker
  Future<void> _showCustomDateRangePicker() async {
    final initialDateRange = DateTimeRange(
      start: _dateFrom ?? DateTime.now().subtract(const Duration(days: 30)),
      end: _dateTo ?? DateTime.now(),
    );

    final pickedRange = await showDateRangePicker(
      context: context,
      initialDateRange: initialDateRange,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: Theme.of(context).colorScheme,
          ),
          child: child!,
        );
      },
    );

    if (pickedRange != null) {
      setState(() {
        _dateFrom = pickedRange.start;
        _dateTo = pickedRange.end;
        _datePreset = 'custom';
        _updateFilters();
      });
      _performSearch(resetPage: true);
    }
  }

  Widget _buildFilterChip({
    required IconData icon,
    required String label,
    required bool selected,
    required VoidCallback onTap,
  }) {
    return FilterChip(
      avatar: Icon(icon, size: 18),
      label: Text(label),
      selected: selected,
      onSelected: (_) => onTap(),
      showCheckmark: false,
    );
  }
}

