/// Recent search model
class RecentSearch {
  final String id;
  final String query;
  final int resultCount;
  final List<String> contentTypes;
  final Map<String, dynamic> filters;
  final DateTime createdAt;

  RecentSearch({
    required this.id,
    required this.query,
    required this.resultCount,
    required this.contentTypes,
    required this.filters,
    required this.createdAt,
  });

  factory RecentSearch.fromJson(Map<String, dynamic> json) {
    return RecentSearch(
      id: json['id'] ?? '',
      query: json['query'] ?? '',
      resultCount: json['result_count'] ?? 0,
      contentTypes: List<String>.from(json['content_types'] ?? []),
      filters: Map<String, dynamic>.from(json['filters'] ?? {}),
      createdAt: DateTime.parse(json['created_at']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'query': query,
      'result_count': resultCount,
      'content_types': contentTypes,
      'filters': filters,
      'created_at': createdAt.toIso8601String(),
    };
  }
}

/// Saved search model
class SavedSearch {
  final String id;
  final String name;
  final int resultCount;
  final String query;
  final List<String> contentTypes;
  final Map<String, dynamic> filters;
  final DateTime createdAt;
  final DateTime updatedAt;

  SavedSearch({
    required this.id,
    required this.name,
    required this.resultCount,
    required this.query,
    required this.contentTypes,
    required this.filters,
    required this.createdAt,
    required this.updatedAt,
  });

  factory SavedSearch.fromJson(Map<String, dynamic> json) {
    return SavedSearch(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      resultCount: json['result_count'] ?? 0,
      query: json['query'] ?? '',
      contentTypes: List<String>.from(json['content_types'] ?? []),
      filters: Map<String, dynamic>.from(json['filters'] ?? {}),
      createdAt: DateTime.parse(json['created_at']),
      updatedAt: DateTime.parse(json['updated_at']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'result_count': resultCount,
      'query': query,
      'content_types': contentTypes,
      'filters': filters,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }
}
