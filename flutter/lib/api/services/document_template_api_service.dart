import '../base_api_client.dart';
import '../../config/api_config.dart';
import '../../models/template/document_template.dart';

/// Pagination metadata for document template responses
class DocumentTemplatePaginationMeta {
  final int page;
  final int limit;
  final int total;
  final int totalPages;
  final bool hasMore;

  DocumentTemplatePaginationMeta({
    required this.page,
    required this.limit,
    required this.total,
    required this.totalPages,
    required this.hasMore,
  });

  factory DocumentTemplatePaginationMeta.fromJson(Map<String, dynamic> json) {
    return DocumentTemplatePaginationMeta(
      page: json['page'] as int? ?? 1,
      limit: json['limit'] as int? ?? 20,
      total: json['total'] as int? ?? 0,
      totalPages: json['totalPages'] as int? ?? 1,
      hasMore: json['hasMore'] as bool? ?? false,
    );
  }
}

/// Paginated response for document templates
class PaginatedDocumentTemplatesResponse {
  final List<DocumentTemplate> templates;
  final DocumentTemplatePaginationMeta pagination;

  PaginatedDocumentTemplatesResponse({
    required this.templates,
    required this.pagination,
  });
}

/// Document type info with count
class DocumentTypeInfo {
  final String type;
  final String name;
  final String icon;
  final int count;

  DocumentTypeInfo({
    required this.type,
    required this.name,
    required this.icon,
    required this.count,
  });

  factory DocumentTypeInfo.fromJson(Map<String, dynamic> json) {
    return DocumentTypeInfo(
      type: json['type']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      icon: json['icon']?.toString() ?? '',
      count: json['count'] as int? ?? 0,
    );
  }
}

/// API service for document templates
class DocumentTemplateApiService {
  static DocumentTemplateApiService? _instance;
  final BaseApiClient _apiClient = BaseApiClient.instance;

  DocumentTemplateApiService._();

  static DocumentTemplateApiService get instance =>
      _instance ??= DocumentTemplateApiService._();

  /// Get all document templates with optional filtering and pagination
  Future<PaginatedDocumentTemplatesResponse> getTemplatesPaginated({
    required String workspaceId,
    DocumentType? documentType,
    String? category,
    String? search,
    bool? systemOnly,
    bool? featured,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'page': page,
        'limit': limit,
      };
      if (documentType != null) {
        queryParams['documentType'] = documentType.name;
      }
      if (category != null && category.isNotEmpty) {
        queryParams['category'] = category;
      }
      if (search != null && search.isNotEmpty) {
        queryParams['search'] = search;
      }
      if (systemOnly != null) {
        queryParams['systemOnly'] = systemOnly;
      }
      if (featured != null) {
        queryParams['featured'] = featured;
      }

      final response = await _apiClient.get(
        ApiConfig.documentTemplates(workspaceId),
        queryParameters: queryParams,
      );

      if (response.data == null) {
        return PaginatedDocumentTemplatesResponse(
          templates: [],
          pagination: DocumentTemplatePaginationMeta(
            page: page,
            limit: limit,
            total: 0,
            totalPages: 0,
            hasMore: false,
          ),
        );
      }

      final data = response.data;
      List<dynamic> templateList = [];
      DocumentTemplatePaginationMeta pagination;

      if (data is Map<String, dynamic>) {
        templateList = data['data'] as List<dynamic>? ??
            data['templates'] as List<dynamic>? ??
            [];

        final paginationData = data['pagination'] as Map<String, dynamic>?;
        if (paginationData != null) {
          pagination = DocumentTemplatePaginationMeta.fromJson(paginationData);
        } else {
          pagination = DocumentTemplatePaginationMeta(
            page: page,
            limit: limit,
            total: templateList.length,
            totalPages: 1,
            hasMore: false,
          );
        }
      } else if (data is List) {
        templateList = data;
        pagination = DocumentTemplatePaginationMeta(
          page: page,
          limit: limit,
          total: templateList.length,
          totalPages: 1,
          hasMore: false,
        );
      } else {
        pagination = DocumentTemplatePaginationMeta(
          page: page,
          limit: limit,
          total: 0,
          totalPages: 0,
          hasMore: false,
        );
      }

      final templates = templateList
          .map((json) => DocumentTemplate.fromJson(json as Map<String, dynamic>))
          .toList();

      return PaginatedDocumentTemplatesResponse(
        templates: templates,
        pagination: pagination,
      );
    } catch (e) {
      rethrow;
    }
  }

  /// Get all document templates (convenience method)
  Future<List<DocumentTemplate>> getTemplates({
    required String workspaceId,
    DocumentType? documentType,
    String? category,
    String? search,
    bool? systemOnly,
    bool? featured,
    int? limit,
  }) async {
    final response = await getTemplatesPaginated(
      workspaceId: workspaceId,
      documentType: documentType,
      category: category,
      search: search,
      systemOnly: systemOnly,
      featured: featured,
      page: 1,
      limit: limit ?? 100,
    );
    return response.templates;
  }

  /// Get document types with counts
  Future<List<DocumentTypeInfo>> getDocumentTypes({
    required String workspaceId,
  }) async {
    try {
      final response = await _apiClient.get(
        ApiConfig.documentTemplateTypes(workspaceId),
      );

      final data = response.data;
      if (data is Map<String, dynamic>) {
        final types = data['data'] as List<dynamic>? ?? [];
        return types
            .map((json) => DocumentTypeInfo.fromJson(json as Map<String, dynamic>))
            .toList();
      }

      return [];
    } catch (e) {
      rethrow;
    }
  }

  /// Get categories with counts
  Future<List<DocumentTemplateCategory>> getCategories({
    required String workspaceId,
  }) async {
    try {
      final response = await _apiClient.get(
        ApiConfig.documentTemplateCategories(workspaceId),
      );

      final data = response.data;
      if (data is Map<String, dynamic>) {
        final categories = data['data'] as List<dynamic>? ?? [];
        return categories.map((json) {
          final map = json as Map<String, dynamic>;
          return DocumentTemplateCategory(
            id: map['id']?.toString() ?? '',
            name: map['name']?.toString() ?? '',
            count: map['count'] as int? ?? 0,
          );
        }).toList();
      }

      return [];
    } catch (e) {
      rethrow;
    }
  }

  /// Get templates by document type
  Future<List<DocumentTemplate>> getTemplatesByType({
    required String workspaceId,
    required DocumentType documentType,
    String? category,
    int? limit,
  }) async {
    try {
      final response = await _apiClient.get(
        ApiConfig.documentTemplatesByType(workspaceId, documentType.name),
        queryParameters: {
          if (category != null) 'category': category,
          if (limit != null) 'limit': limit,
        },
      );

      final data = response.data;
      if (data is Map<String, dynamic>) {
        final templates = data['data'] as List<dynamic>? ?? [];
        return templates
            .map((json) => DocumentTemplate.fromJson(json as Map<String, dynamic>))
            .toList();
      }

      return [];
    } catch (e) {
      rethrow;
    }
  }

  /// Get a single template by ID or slug
  Future<DocumentTemplate> getTemplateById({
    required String workspaceId,
    required String idOrSlug,
  }) async {
    try {
      final response = await _apiClient.get(
        ApiConfig.documentTemplateById(workspaceId, idOrSlug),
      );

      final data = response.data;
      if (data is Map<String, dynamic>) {
        final templateData = data['data'] as Map<String, dynamic>? ?? data;
        return DocumentTemplate.fromJson(templateData);
      }

      throw Exception('Invalid response format');
    } catch (e) {
      rethrow;
    }
  }

  /// Create a custom document template
  Future<DocumentTemplate> createTemplate({
    required String workspaceId,
    required String name,
    required String slug,
    required DocumentType documentType,
    required Map<String, dynamic> content,
    String? description,
    String? category,
    String? icon,
    String? color,
    String? contentHtml,
    List<TemplatePlaceholder>? placeholders,
    List<SignatureField>? signatureFields,
    Map<String, dynamic>? settings,
  }) async {
    try {
      final body = <String, dynamic>{
        'name': name,
        'slug': slug,
        'documentType': documentType.name,
        'content': content,
      };

      if (description != null) body['description'] = description;
      if (category != null) body['category'] = category;
      if (icon != null) body['icon'] = icon;
      if (color != null) body['color'] = color;
      if (contentHtml != null) body['contentHtml'] = contentHtml;
      if (placeholders != null) {
        body['placeholders'] = placeholders.map((p) => p.toJson()).toList();
      }
      if (signatureFields != null) {
        body['signatureFields'] = signatureFields.map((s) => s.toJson()).toList();
      }
      if (settings != null) body['settings'] = settings;

      final response = await _apiClient.post(
        ApiConfig.documentTemplates(workspaceId),
        data: body,
      );

      final data = response.data;
      if (data is Map<String, dynamic>) {
        final templateData = data['data'] as Map<String, dynamic>? ?? data;
        return DocumentTemplate.fromJson(templateData);
      }

      throw Exception('Invalid response format');
    } catch (e) {
      rethrow;
    }
  }

  /// Update a document template
  Future<DocumentTemplate> updateTemplate({
    required String workspaceId,
    required String templateId,
    String? name,
    String? description,
    String? icon,
    String? color,
    Map<String, dynamic>? content,
    String? contentHtml,
    List<TemplatePlaceholder>? placeholders,
    List<SignatureField>? signatureFields,
    bool? isFeatured,
    Map<String, dynamic>? settings,
  }) async {
    try {
      final body = <String, dynamic>{};

      if (name != null) body['name'] = name;
      if (description != null) body['description'] = description;
      if (icon != null) body['icon'] = icon;
      if (color != null) body['color'] = color;
      if (content != null) body['content'] = content;
      if (contentHtml != null) body['contentHtml'] = contentHtml;
      if (placeholders != null) {
        body['placeholders'] = placeholders.map((p) => p.toJson()).toList();
      }
      if (signatureFields != null) {
        body['signatureFields'] = signatureFields.map((s) => s.toJson()).toList();
      }
      if (isFeatured != null) body['isFeatured'] = isFeatured;
      if (settings != null) body['settings'] = settings;

      final response = await _apiClient.patch(
        ApiConfig.documentTemplateById(workspaceId, templateId),
        data: body,
      );

      final data = response.data;
      if (data is Map<String, dynamic>) {
        final templateData = data['data'] as Map<String, dynamic>? ?? data;
        return DocumentTemplate.fromJson(templateData);
      }

      throw Exception('Invalid response format');
    } catch (e) {
      rethrow;
    }
  }

  /// Delete a document template
  Future<void> deleteTemplate({
    required String workspaceId,
    required String templateId,
  }) async {
    try {
      await _apiClient.delete(
        ApiConfig.documentTemplateById(workspaceId, templateId),
      );
    } catch (e) {
      rethrow;
    }
  }

  /// Seed system templates (admin only)
  Future<void> seedSystemTemplates({
    required String workspaceId,
  }) async {
    try {
      await _apiClient.post(
        '${ApiConfig.documentTemplates(workspaceId)}/seed',
        data: {},
      );
    } catch (e) {
      rethrow;
    }
  }
}
