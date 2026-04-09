import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../base_api_client.dart';
import '../../models/dashboard_models.dart';

/// API service for dashboard operations
class DashboardApiService {
  final BaseApiClient _apiClient;

  // In-memory cache for suggestions with TTL
  static final Map<String, SuggestionsResponse> _suggestionsCache = {};
  static final Map<String, DateTime> _suggestionsCacheTime = {};
  static const Duration _suggestionsCacheDuration = Duration(minutes: 5);

  // Persistent cache keys
  static const String _persistentCachePrefix = 'suggestions_cache_';
  static const String _persistentCacheTimePrefix = 'suggestions_cache_time_';
  static const Duration _persistentCacheDuration = Duration(hours: 24); // Keep for 24 hours

  DashboardApiService({BaseApiClient? apiClient})
      : _apiClient = apiClient ?? BaseApiClient.instance;

  /// Check if in-memory cached suggestions are still valid (fresh)
  bool _isSuggestionsCacheValid(String workspaceId) {
    final cacheTime = _suggestionsCacheTime[workspaceId];
    if (cacheTime == null) return false;
    return DateTime.now().difference(cacheTime) < _suggestionsCacheDuration;
  }

  /// Get cached suggestions if available and valid (in-memory)
  SuggestionsResponse? getCachedSuggestions(String workspaceId) {
    if (_isSuggestionsCacheValid(workspaceId)) {
      return _suggestionsCache[workspaceId];
    }
    return null;
  }

  /// Get persistent cached suggestions (from SharedPreferences)
  /// Returns data even if stale (up to 24 hours old) for instant display
  Future<SuggestionsResponse?> getPersistentCachedSuggestions(String workspaceId) async {
    try {
      // First check in-memory cache
      if (_suggestionsCache.containsKey(workspaceId)) {
        debugPrint('[DashboardAPI] Found in-memory cache for workspace: $workspaceId');
        return _suggestionsCache[workspaceId];
      }

      // Then check persistent cache
      final prefs = await SharedPreferences.getInstance();
      final cachedJson = prefs.getString('$_persistentCachePrefix$workspaceId');
      final cachedTimeStr = prefs.getString('$_persistentCacheTimePrefix$workspaceId');

      if (cachedJson != null && cachedTimeStr != null) {
        final cachedTime = DateTime.tryParse(cachedTimeStr);
        if (cachedTime != null) {
          // Check if persistent cache is still valid (24 hours)
          if (DateTime.now().difference(cachedTime) < _persistentCacheDuration) {
            debugPrint('[DashboardAPI] Loading suggestions from persistent cache for workspace: $workspaceId');
            final jsonData = jsonDecode(cachedJson) as Map<String, dynamic>;
            final suggestions = SuggestionsResponse.fromJson(jsonData);

            // Also populate in-memory cache
            _suggestionsCache[workspaceId] = suggestions;
            _suggestionsCacheTime[workspaceId] = cachedTime;

            return suggestions;
          } else {
            debugPrint('[DashboardAPI] Persistent cache expired for workspace: $workspaceId');
          }
        }
      }
      return null;
    } catch (e) {
      debugPrint('[DashboardAPI] Error loading persistent cache: $e');
      return null;
    }
  }

  /// Save suggestions to persistent cache (stores raw JSON)
  Future<void> _saveToPersistentCache(String workspaceId, Map<String, dynamic> rawJson) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonStr = jsonEncode(rawJson);
      await prefs.setString('$_persistentCachePrefix$workspaceId', jsonStr);
      await prefs.setString('$_persistentCacheTimePrefix$workspaceId', DateTime.now().toIso8601String());
      debugPrint('[DashboardAPI] Saved suggestions to persistent cache for workspace: $workspaceId');
    } catch (e) {
      debugPrint('[DashboardAPI] Error saving to persistent cache: $e');
    }
  }

  /// Clear suggestions cache for a workspace (both in-memory and persistent)
  Future<void> clearSuggestionsCache(String workspaceId) async {
    _suggestionsCache.remove(workspaceId);
    _suggestionsCacheTime.remove(workspaceId);

    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('$_persistentCachePrefix$workspaceId');
      await prefs.remove('$_persistentCacheTimePrefix$workspaceId');
    } catch (e) {
      debugPrint('[DashboardAPI] Error clearing persistent cache: $e');
    }
  }

  /// Clear all suggestions cache (both in-memory and persistent)
  Future<void> clearAllSuggestionsCache() async {
    _suggestionsCache.clear();
    _suggestionsCacheTime.clear();

    try {
      final prefs = await SharedPreferences.getInstance();
      final keys = prefs.getKeys();
      for (final key in keys) {
        if (key.startsWith(_persistentCachePrefix) || key.startsWith(_persistentCacheTimePrefix)) {
          await prefs.remove(key);
        }
      }
    } catch (e) {
      debugPrint('[DashboardAPI] Error clearing all persistent cache: $e');
    }
  }

  /// Get dashboard data for a workspace
  Future<ApiResponse<DashboardData>> getDashboardData(String workspaceId) async {
    try {
      final response = await _apiClient.get('/workspaces/$workspaceId/dashboard');

      return ApiResponse.success(
        DashboardData.fromJson(response.data),
        message: 'Dashboard data fetched successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to fetch dashboard data',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    } catch (e) {
      return ApiResponse.error(
        'An unexpected error occurred: $e',
      );
    }
  }

  /// Get smart suggestions for a workspace
  /// Set [forceRefresh] to true to bypass cache and fetch fresh data
  Future<ApiResponse<SuggestionsResponse>> getSuggestions(
    String workspaceId, {
    bool forceRefresh = false,
  }) async {
    // Check cache first (unless force refresh requested)
    if (!forceRefresh && _isSuggestionsCacheValid(workspaceId)) {
      final cached = _suggestionsCache[workspaceId];
      if (cached != null) {
        debugPrint('[DashboardAPI] Returning cached suggestions for workspace: $workspaceId');
        return ApiResponse.success(
          cached,
          message: 'Suggestions loaded from cache',
          statusCode: 200,
        );
      }
    }

    try {
      debugPrint('[DashboardAPI] Fetching suggestions for workspace: $workspaceId (forceRefresh: $forceRefresh)');
      // Use longer timeout for suggestions as AI generation takes time
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/dashboard/suggestions',
        options: Options(
          receiveTimeout: const Duration(seconds: 120), // 2 minutes for AI suggestions
          sendTimeout: const Duration(seconds: 30),
        ),
      );
      debugPrint('[DashboardAPI] Response status: ${response.statusCode}');
      debugPrint('[DashboardAPI] Response data type: ${response.data.runtimeType}');

      // Handle potential response wrapping - check if data is wrapped in 'data' field
      dynamic jsonData = response.data;
      if (jsonData is Map<String, dynamic> && jsonData.containsKey('data') && !jsonData.containsKey('suggestions')) {
        debugPrint('[DashboardAPI] Unwrapping data from response');
        jsonData = jsonData['data'];
      }

      // Ensure we have a valid map
      if (jsonData is! Map<String, dynamic>) {
        debugPrint('[DashboardAPI] Invalid response format: ${jsonData.runtimeType}');
        return ApiResponse.error(
          'Invalid response format',
          statusCode: response.statusCode,
        );
      }

      debugPrint('[DashboardAPI] Parsing suggestions response...');
      final suggestionsResponse = SuggestionsResponse.fromJson(jsonData);
      debugPrint('[DashboardAPI] Parsed ${suggestionsResponse.suggestions.length} suggestions');

      // Store in in-memory cache
      _suggestionsCache[workspaceId] = suggestionsResponse;
      _suggestionsCacheTime[workspaceId] = DateTime.now();
      debugPrint('[DashboardAPI] Cached suggestions for workspace: $workspaceId');

      // Also save to persistent cache (for instant load on app restart)
      _saveToPersistentCache(workspaceId, jsonData);

      return ApiResponse.success(
        suggestionsResponse,
        message: 'Suggestions fetched successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      debugPrint('[DashboardAPI] DioException: ${e.message}');
      debugPrint('[DashboardAPI] Response: ${e.response?.data}');
      return ApiResponse.error(
        e.message ?? 'Failed to fetch suggestions',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    } catch (e, stackTrace) {
      debugPrint('[DashboardAPI] Error: $e');
      debugPrint('[DashboardAPI] StackTrace: $stackTrace');
      return ApiResponse.error(
        'An unexpected error occurred: $e',
      );
    }
  }
}
