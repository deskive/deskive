import '../models/search/search_response.dart';
import 'base_dao_impl.dart';

/// Search filter options matching frontend implementation
class SearchFilters {
  final DateTime? dateFrom;
  final DateTime? dateTo;
  final String? author;
  final List<String>? tags;
  final String? projectId;
  final List<String>? fileTypes;
  final bool? hasAttachments;
  final bool? isShared;
  final bool? isStarred;

  const SearchFilters({
    this.dateFrom,
    this.dateTo,
    this.author,
    this.tags,
    this.projectId,
    this.fileTypes,
    this.hasAttachments,
    this.isShared,
    this.isStarred,
  });

  /// Check if any filter is active
  bool get hasActiveFilters =>
      dateFrom != null ||
      dateTo != null ||
      author != null ||
      (tags != null && tags!.isNotEmpty) ||
      projectId != null ||
      (fileTypes != null && fileTypes!.isNotEmpty) ||
      hasAttachments != null ||
      isShared != null ||
      isStarred != null;

  /// Convert to API query parameters
  Map<String, dynamic> toQueryParams() {
    final params = <String, dynamic>{};
    if (dateFrom != null) params['date_from'] = dateFrom!.toIso8601String();
    if (dateTo != null) params['date_to'] = dateTo!.toIso8601String();
    if (author != null) params['author'] = author;
    if (tags != null && tags!.isNotEmpty) params['tags'] = tags!.join(',');
    if (projectId != null) params['project_id'] = projectId;
    if (fileTypes != null && fileTypes!.isNotEmpty) params['file_types'] = fileTypes!.join(',');
    if (hasAttachments != null) params['has_attachments'] = hasAttachments;
    if (isShared != null) params['is_shared'] = isShared;
    if (isStarred != null) params['is_starred'] = isStarred;
    return params;
  }
}

/// Search mode enum matching frontend
enum SearchMode {
  fullText,  // keyword-based search (semantic=false)
  semantic,  // AI-powered search (semantic=true)
  hybrid,    // combination (semantic=true)
}

/// Search DAO for handling search API operations
/// Matches frontend search implementation for consistency
class SearchDao extends BaseDaoImpl {
  SearchDao()
      : super(
          baseEndpoint: '/workspaces',
        );

  /// Normalize search query (matching frontend logic)
  /// - Trims whitespace
  /// - Collapses multiple spaces to single space
  /// - Converts to lowercase
  static String normalizeQuery(String query) {
    return query.trim().replaceAll(RegExp(r'\s+'), ' ').toLowerCase();
  }

  /// Get recent searches for a workspace
  Future<RecentSearchListResponse> getRecentSearches({
    required String workspaceId,
    int limit = 10,
  }) async {
    try {
      final response = await get<dynamic>(
        '$workspaceId/search/recent',
        queryParameters: {'limit': limit},
      );
      return RecentSearchListResponse.fromJson(response);
    } catch (e) {
      return RecentSearchListResponse(
        success: false,
        message: 'Failed to fetch recent searches: $e',
      );
    }
  }

  /// Get search suggestions for autocomplete
  /// Matches frontend: /search/suggestions?q={query}
  Future<List<String>> getSearchSuggestions({
    required String workspaceId,
    required String query,
  }) async {
    try {
      final response = await get<dynamic>(
        '$workspaceId/search/suggestions',
        queryParameters: {'q': query},
      );

      if (response is List) {
        return response.map((e) => e.toString()).toList();
      } else if (response is Map && response['data'] is List) {
        return (response['data'] as List).map((e) => e.toString()).toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  /// Get popular searches
  /// Matches frontend: /search/popular?limit={limit}
  Future<List<String>> getPopularSearches({
    required String workspaceId,
    int limit = 10,
  }) async {
    try {
      final response = await get<dynamic>(
        '$workspaceId/search/popular',
        queryParameters: {'limit': limit},
      );

      if (response is List) {
        return response.map((e) => e.toString()).toList();
      } else if (response is Map && response['data'] is List) {
        return (response['data'] as List).map((e) => e.toString()).toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  /// Perform a search with full filter support
  /// Matches frontend search implementation
  Future<SearchResultsResponse> search({
    required String workspaceId,
    required String query,
    List<String>? types,
    SearchMode mode = SearchMode.fullText,
    SearchFilters? filters,
    int page = 1,
    int limit = 50,
  }) async {
    try {
      // Normalize the query (matching frontend)
      final normalizedQuery = normalizeQuery(query);

      final queryParams = <String, dynamic>{
        'query': normalizedQuery,
        'page': page,
        'limit': limit,
        'semantic': mode != SearchMode.fullText,
      };

      // Add types as comma-separated string for backend compatibility
      if (types != null && types.isNotEmpty) {
        queryParams['types'] = types.join(',');
      }

      // Add filter parameters (matching frontend)
      if (filters != null && filters.hasActiveFilters) {
        queryParams.addAll(filters.toQueryParams());
      }

      final response = await get<dynamic>(
        '$workspaceId/search',
        queryParameters: queryParams,
      );
      return SearchResultsResponse.fromJson(response);
    } catch (e) {
      return SearchResultsResponse(
        success: false,
        message: 'Failed to perform search: $e',
      );
    }
  }

  /// Clear recent searches
  Future<bool> clearRecentSearches({required String workspaceId}) async {
    try {
      await delete<Map<String, dynamic>>('$workspaceId/search/recent');
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Get saved searches for a workspace
  Future<SavedSearchListResponse> getSavedSearches({
    required String workspaceId,
  }) async {
    try {
      final response = await get<dynamic>('$workspaceId/search/saved');
      return SavedSearchListResponse.fromJson(response);
    } catch (e) {
      return SavedSearchListResponse(
        success: false,
        message: 'Failed to fetch saved searches: $e',
      );
    }
  }

  /// Save a search
  Future<Map<String, dynamic>> saveSearch({
    required String workspaceId,
    required String name,
    required String query,
    List<String>? types,
    String mode = 'hybrid',
    Map<String, dynamic>? filters,
    List<String>? tags,
    bool isNotificationEnabled = false,
    List<Map<String, dynamic>>? resultsSnapshot,
  }) async {
    try {
      final body = <String, dynamic>{
        'name': name,
        'query': query,
        'type': types != null && types.isNotEmpty ? types.join(',') : 'all',
        'mode': mode,
        'filters': filters ?? {},
        'tags': tags ?? [],
        'isNotificationEnabled': isNotificationEnabled,
        'resultsSnapshot': resultsSnapshot ?? [],
      };

      final response = await post<dynamic>(
        '$workspaceId/search/saved',
        data: body,
      );

      return {
        'success': true,
        'message': 'Search saved successfully',
        'data': response,
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Failed to save search: $e',
      };
    }
  }

  /// Delete a saved search
  Future<bool> deleteSavedSearch({
    required String workspaceId,
    required String searchId,
  }) async {
    try {
      await delete<dynamic>('$workspaceId/search/saved/$searchId');
      return true;
    } catch (e) {
      return false;
    }
  }
}
