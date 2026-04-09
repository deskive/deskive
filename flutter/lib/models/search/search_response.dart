import 'recent_search.dart';

/// Response model for recent search list API
class RecentSearchListResponse {
  final bool success;
  final List<RecentSearch>? data;
  final String? message;

  RecentSearchListResponse({
    required this.success,
    this.data,
    this.message,
  });

  factory RecentSearchListResponse.fromJson(dynamic json) {
    // Handle object response with data field
    if (json is Map<String, dynamic>) {
      return RecentSearchListResponse(
        success: json['success'] as bool? ?? true,
        data: json['data'] != null
            ? (json['data'] as List)
                .map((item) => RecentSearch.fromJson(item as Map<String, dynamic>))
                .toList()
            : null,
        message: json['message'] as String?,
      );
    }

    return RecentSearchListResponse(
      success: false,
      message: 'Invalid response format',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'success': success,
      'data': data?.map((s) => s.toJson()).toList(),
      'message': message,
    };
  }
}

/// Response model for saved search list API
class SavedSearchListResponse {
  final bool success;
  final List<SavedSearch>? data;
  final String? message;

  SavedSearchListResponse({
    required this.success,
    this.data,
    this.message,
  });

  factory SavedSearchListResponse.fromJson(dynamic json) {
    // Handle object response with data field
    if (json is Map<String, dynamic>) {
      return SavedSearchListResponse(
        success: json['success'] as bool? ?? true,
        data: json['data'] != null
            ? (json['data'] as List)
                .map((item) => SavedSearch.fromJson(item as Map<String, dynamic>))
                .toList()
            : null,
        message: json['message'] as String?,
      );
    }

    return SavedSearchListResponse(
      success: false,
      message: 'Invalid response format',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'success': success,
      'data': data?.map((s) => s.toJson()).toList(),
      'message': message,
    };
  }
}

/// Response model for search results
class SearchResultsResponse {
  final bool success;
  final List<SearchResultItem>? results;
  final int total;
  final int page;
  final int limit;
  final String? message;

  SearchResultsResponse({
    required this.success,
    this.results,
    this.total = 0,
    this.page = 1,
    this.limit = 50,
    this.message,
  });

  factory SearchResultsResponse.fromJson(dynamic json) {
    if (json is Map<String, dynamic>) {
      // Check for both 'data' and 'results' fields to handle different API formats
      final dataList = json['data'] ?? json['results'];

      final resultsList = dataList != null
          ? (dataList as List)
              .map((item) => SearchResultItem.fromJson(item as Map<String, dynamic>))
              .toList()
          : <SearchResultItem>[];

      return SearchResultsResponse(
        success: json['success'] as bool? ?? true,
        results: resultsList,
        // Use the actual results length, not the API's total field
        // The API's total might be total across all pages
        total: resultsList.length,
        page: json['page'] as int? ?? 1,
        limit: json['limit'] as int? ?? 50,
        message: json['message'] as String?,
      );
    }

    return SearchResultsResponse(
      success: false,
      message: 'Invalid response format',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'success': success,
      'results': results?.map((r) => r.toJson()).toList(),
      'total': total,
      'page': page,
      'limit': limit,
      'message': message,
    };
  }
}

/// Individual search result item
class SearchResultItem {
  final String id;
  final String type; // notes, files, folders, messages, tasks, projects, events
  final String title;
  final String? content;
  final String? path;
  final String? author;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final Map<String, dynamic>? metadata;

  SearchResultItem({
    required this.id,
    required this.type,
    required this.title,
    this.content,
    this.path,
    this.author,
    this.createdAt,
    this.updatedAt,
    this.metadata,
  });

  factory SearchResultItem.fromJson(Map<String, dynamic> json) {
    // Use content_type from API response
    String itemType = json['content_type'] ?? json['type'] ?? '';

    // If type is still not provided, infer from other fields
    if (itemType.isEmpty) {
      if (json.containsKey('project_type') || json.containsKey('status')) {
        itemType = 'projects';
      } else if (json.containsKey('is_folder')) {
        itemType = json['is_folder'] == true ? 'folders' : 'files';
      } else {
        itemType = 'notes'; // Default fallback
      }
    }

    return SearchResultItem(
      id: json['id'] ?? '',
      type: itemType,
      title: json['title'] ?? json['name'] ?? '',
      content: json['content'] ?? json['description'],
      path: json['path'] ?? json['folder_path'],
      author: json['author'] ?? json['created_by'] ?? json['owner'],
      createdAt: json['created_at'] != null ? DateTime.tryParse(json['created_at']) : null,
      updatedAt: json['updated_at'] != null ? DateTime.tryParse(json['updated_at']) : null,
      metadata: json,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type,
      'title': title,
      'content': content,
      'path': path,
      'author': author,
      'created_at': createdAt?.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
      'metadata': metadata,
    };
  }
}
