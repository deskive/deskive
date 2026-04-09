import '../base_api_client.dart';
import '../../config/api_config.dart';
import '../../models/template/project_template.dart';
import '../../models/project.dart';

/// Pagination metadata for template responses
class PaginationMeta {
  final int page;
  final int limit;
  final int total;
  final int totalPages;
  final bool hasMore;

  PaginationMeta({
    required this.page,
    required this.limit,
    required this.total,
    required this.totalPages,
    required this.hasMore,
  });

  factory PaginationMeta.fromJson(Map<String, dynamic> json) {
    return PaginationMeta(
      page: json['page'] as int? ?? 1,
      limit: json['limit'] as int? ?? 20,
      total: json['total'] as int? ?? 0,
      totalPages: json['totalPages'] as int? ?? 1,
      hasMore: json['hasMore'] as bool? ?? false,
    );
  }
}

/// Paginated response for templates
class PaginatedTemplatesResponse {
  final List<ProjectTemplate> templates;
  final PaginationMeta pagination;

  PaginatedTemplatesResponse({
    required this.templates,
    required this.pagination,
  });
}

/// API service for project templates
class TemplateApiService {
  static TemplateApiService? _instance;
  final BaseApiClient _apiClient = BaseApiClient.instance;

  TemplateApiService._();

  static TemplateApiService get instance => _instance ??= TemplateApiService._();

  /// Get all templates with optional filtering and pagination
  Future<PaginatedTemplatesResponse> getTemplatesPaginated({
    required String workspaceId,
    String? category,
    String? search,
    bool? isFeatured,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'page': page,
        'limit': limit,
      };
      if (category != null && category.isNotEmpty) {
        queryParams['category'] = category;
      }
      if (search != null && search.isNotEmpty) {
        queryParams['search'] = search;
      }
      if (isFeatured != null) {
        queryParams['featured'] = isFeatured;
      }

      final response = await _apiClient.get(
        ApiConfig.templates(workspaceId),
        queryParameters: queryParams,
      );

      if (response.data == null) {
        return PaginatedTemplatesResponse(
          templates: [],
          pagination: PaginationMeta(
            page: page,
            limit: limit,
            total: 0,
            totalPages: 0,
            hasMore: false,
          ),
        );
      }

      // Handle response with pagination metadata
      final data = response.data;
      List<dynamic> templateList = [];
      PaginationMeta pagination;

      if (data is Map<String, dynamic>) {
        // Backend returns { data: [...], pagination: {...} }
        templateList = data['data'] as List<dynamic>? ??
            data['templates'] as List<dynamic>? ??
            [];

        final paginationData = data['pagination'] as Map<String, dynamic>?;
        if (paginationData != null) {
          pagination = PaginationMeta.fromJson(paginationData);
        } else {
          pagination = PaginationMeta(
            page: page,
            limit: limit,
            total: templateList.length,
            totalPages: 1,
            hasMore: false,
          );
        }
      } else if (data is List) {
        templateList = data;
        pagination = PaginationMeta(
          page: page,
          limit: limit,
          total: templateList.length,
          totalPages: 1,
          hasMore: false,
        );
      } else {
        pagination = PaginationMeta(
          page: page,
          limit: limit,
          total: 0,
          totalPages: 0,
          hasMore: false,
        );
      }

      final templates = templateList
          .map((json) => ProjectTemplate.fromJson(json as Map<String, dynamic>))
          .toList();

      return PaginatedTemplatesResponse(
        templates: templates,
        pagination: pagination,
      );
    } catch (e) {
      rethrow;
    }
  }

  /// Get all templates with optional filtering (backward compatible)
  Future<List<ProjectTemplate>> getTemplates({
    required String workspaceId,
    String? category,
    String? search,
    bool? isFeatured,
    int? limit,
    int? offset,
  }) async {
    // Use the paginated method and return just the templates
    final response = await getTemplatesPaginated(
      workspaceId: workspaceId,
      category: category,
      search: search,
      isFeatured: isFeatured,
      page: offset != null && limit != null ? (offset ~/ limit) + 1 : 1,
      limit: limit ?? 100, // Default high limit for backward compatibility
    );
    return response.templates;
  }

  /// Get featured templates
  Future<List<ProjectTemplate>> getFeaturedTemplates({
    required String workspaceId,
    int? limit,
  }) async {
    return getTemplates(
      workspaceId: workspaceId,
      isFeatured: true,
      limit: limit,
    );
  }

  /// Get templates by category
  Future<List<ProjectTemplate>> getTemplatesByCategory({
    required String workspaceId,
    required String category,
    int? limit,
    int? offset,
  }) async {
    return getTemplates(
      workspaceId: workspaceId,
      category: category,
      limit: limit,
      offset: offset,
    );
  }

  /// Search templates
  Future<List<ProjectTemplate>> searchTemplates({
    required String workspaceId,
    required String query,
    String? category,
    int? limit,
  }) async {
    return getTemplates(
      workspaceId: workspaceId,
      search: query,
      category: category,
      limit: limit,
    );
  }

  /// Get template by ID or slug
  Future<ProjectTemplate> getTemplateById({
    required String workspaceId,
    required String idOrSlug,
  }) async {
    try {
      final response = await _apiClient.get(
        ApiConfig.templateById(workspaceId, idOrSlug),
      );

      final data = response.data;
      if (data is Map<String, dynamic>) {
        // Handle wrapped response
        final templateData = data['data'] as Map<String, dynamic>? ?? data;
        return ProjectTemplate.fromJson(templateData);
      }

      throw Exception('Invalid response format');
    } catch (e) {
      rethrow;
    }
  }

  /// Create a project from template
  Future<Project> createProjectFromTemplate({
    required String workspaceId,
    required String templateIdOrSlug,
    required String projectName,
    String? description,
    DateTime? startDate,
  }) async {
    try {
      final body = <String, dynamic>{
        'templateId': templateIdOrSlug,
        'projectName': projectName,
      };

      if (description != null && description.isNotEmpty) {
        body['description'] = description;
      }

      if (startDate != null) {
        body['startDate'] = startDate.toIso8601String();
      }

      final response = await _apiClient.post(
        ApiConfig.createProjectFromTemplate(workspaceId, templateIdOrSlug),
        data: body,
      );

      final data = response.data;
      if (data is Map<String, dynamic>) {
        // Handle wrapped response
        final projectData = data['data'] as Map<String, dynamic>? ?? data;
        return Project.fromJson(projectData);
      }

      throw Exception('Invalid response format');
    } catch (e) {
      rethrow;
    }
  }

  /// Get template categories with counts
  Future<Map<String, int>> getTemplateCategories({
    required String workspaceId,
  }) async {
    try {
      final response = await _apiClient.get(
        ApiConfig.templateCategories(workspaceId),
      );

      final data = response.data;
      if (data is Map<String, dynamic>) {
        // Handle wrapped response
        final categoriesData = data['data'] as Map<String, dynamic>? ??
            data['categories'] as Map<String, dynamic>? ??
            data;
        return categoriesData.map((key, value) => MapEntry(key, value as int));
      }

      return {};
    } catch (e) {
      // Return empty map on error - categories can be computed client-side
      return {};
    }
  }
}
