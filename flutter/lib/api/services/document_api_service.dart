import '../base_api_client.dart';
import '../../config/api_config.dart';
import '../../models/document/document.dart';
import '../../models/template/document_template.dart';

/// Pagination metadata for document responses
class DocumentPaginationMeta {
  final int page;
  final int limit;
  final int total;
  final int totalPages;
  final bool hasMore;

  DocumentPaginationMeta({
    required this.page,
    required this.limit,
    required this.total,
    required this.totalPages,
    required this.hasMore,
  });

  factory DocumentPaginationMeta.fromJson(Map<String, dynamic> json) {
    return DocumentPaginationMeta(
      page: json['page'] as int? ?? 1,
      limit: json['limit'] as int? ?? 20,
      total: json['total'] as int? ?? 0,
      totalPages: json['totalPages'] as int? ?? 1,
      hasMore: json['hasMore'] as bool? ?? false,
    );
  }
}

/// Paginated response for documents
class PaginatedDocumentsResponse {
  final List<Document> documents;
  final DocumentPaginationMeta pagination;

  PaginatedDocumentsResponse({
    required this.documents,
    required this.pagination,
  });
}

/// Document statistics
class DocumentStats {
  final int total;
  final Map<String, int> byStatus;
  final Map<String, int> byType;

  DocumentStats({
    required this.total,
    required this.byStatus,
    required this.byType,
  });

  factory DocumentStats.fromJson(Map<String, dynamic> json) {
    return DocumentStats(
      total: json['total'] as int? ?? 0,
      byStatus: (json['byStatus'] as Map<String, dynamic>?)
              ?.map((k, v) => MapEntry(k, v as int? ?? 0)) ??
          {},
      byType: (json['byType'] as Map<String, dynamic>?)
              ?.map((k, v) => MapEntry(k, v as int? ?? 0)) ??
          {},
    );
  }
}

/// API service for documents
class DocumentApiService {
  static DocumentApiService? _instance;
  final BaseApiClient _apiClient = BaseApiClient.instance;

  DocumentApiService._();

  static DocumentApiService get instance =>
      _instance ??= DocumentApiService._();

  /// Get all documents with optional filtering and pagination
  Future<PaginatedDocumentsResponse> getDocumentsPaginated({
    required String workspaceId,
    DocumentType? documentType,
    DocumentStatus? status,
    String? search,
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
      if (status != null) {
        queryParams['status'] = status.name;
      }
      if (search != null && search.isNotEmpty) {
        queryParams['search'] = search;
      }

      final response = await _apiClient.get(
        ApiConfig.documents(workspaceId),
        queryParameters: queryParams,
      );

      if (response.data == null) {
        return PaginatedDocumentsResponse(
          documents: [],
          pagination: DocumentPaginationMeta(
            page: page,
            limit: limit,
            total: 0,
            totalPages: 0,
            hasMore: false,
          ),
        );
      }

      final data = response.data;
      List<dynamic> documentList = [];
      DocumentPaginationMeta pagination;

      if (data is Map<String, dynamic>) {
        documentList = data['data'] as List<dynamic>? ??
            data['documents'] as List<dynamic>? ??
            [];

        final paginationData = data['pagination'] as Map<String, dynamic>?;
        if (paginationData != null) {
          pagination = DocumentPaginationMeta.fromJson(paginationData);
        } else {
          pagination = DocumentPaginationMeta(
            page: page,
            limit: limit,
            total: documentList.length,
            totalPages: 1,
            hasMore: false,
          );
        }
      } else if (data is List) {
        documentList = data;
        pagination = DocumentPaginationMeta(
          page: page,
          limit: limit,
          total: documentList.length,
          totalPages: 1,
          hasMore: false,
        );
      } else {
        pagination = DocumentPaginationMeta(
          page: page,
          limit: limit,
          total: 0,
          totalPages: 0,
          hasMore: false,
        );
      }

      final documents = documentList
          .map((json) => Document.fromJson(json as Map<String, dynamic>))
          .toList();

      return PaginatedDocumentsResponse(
        documents: documents,
        pagination: pagination,
      );
    } catch (e) {
      rethrow;
    }
  }

  /// Get all documents (convenience method)
  Future<List<Document>> getDocuments({
    required String workspaceId,
    DocumentType? documentType,
    DocumentStatus? status,
    String? search,
    int? limit,
  }) async {
    final response = await getDocumentsPaginated(
      workspaceId: workspaceId,
      documentType: documentType,
      status: status,
      search: search,
      page: 1,
      limit: limit ?? 100,
    );
    return response.documents;
  }

  /// Get document statistics
  Future<DocumentStats> getStats({
    required String workspaceId,
  }) async {
    try {
      final response = await _apiClient.get(
        ApiConfig.documentStats(workspaceId),
      );

      final data = response.data;
      if (data is Map<String, dynamic>) {
        final statsData = data['data'] as Map<String, dynamic>? ?? data;
        return DocumentStats.fromJson(statsData);
      }

      return DocumentStats(total: 0, byStatus: {}, byType: {});
    } catch (e) {
      rethrow;
    }
  }

  /// Get a single document by ID with details
  Future<Document> getDocument({
    required String workspaceId,
    required String documentId,
  }) async {
    try {
      final response = await _apiClient.get(
        ApiConfig.documentById(workspaceId, documentId),
      );

      final data = response.data;
      if (data is Map<String, dynamic>) {
        final documentData = data['data'] as Map<String, dynamic>? ?? data;
        return Document.fromJson(documentData);
      }

      throw Exception('Invalid response format');
    } catch (e) {
      rethrow;
    }
  }

  /// Create a new document
  Future<Document> createDocument({
    required String workspaceId,
    required String title,
    required DocumentType documentType,
    required Map<String, dynamic> content,
    String? templateId,
    String? description,
    String? contentHtml,
    Map<String, dynamic>? placeholderValues,
    String? expiresAt,
    Map<String, dynamic>? settings,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      final body = <String, dynamic>{
        'title': title,
        'documentType': documentType.name,
        'content': content,
      };

      if (templateId != null) body['templateId'] = templateId;
      if (description != null) body['description'] = description;
      if (contentHtml != null) body['contentHtml'] = contentHtml;
      if (placeholderValues != null) body['placeholderValues'] = placeholderValues;
      if (expiresAt != null) body['expiresAt'] = expiresAt;
      if (settings != null) body['settings'] = settings;
      if (metadata != null) body['metadata'] = metadata;

      final response = await _apiClient.post(
        ApiConfig.documents(workspaceId),
        data: body,
      );

      final data = response.data;
      if (data is Map<String, dynamic>) {
        final documentData = data['data'] as Map<String, dynamic>? ?? data;
        return Document.fromJson(documentData);
      }

      throw Exception('Invalid response format');
    } catch (e) {
      rethrow;
    }
  }

  /// Update a document
  Future<Document> updateDocument({
    required String workspaceId,
    required String documentId,
    String? title,
    String? description,
    Map<String, dynamic>? content,
    String? contentHtml,
    Map<String, dynamic>? placeholderValues,
    String? expiresAt,
    Map<String, dynamic>? settings,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      final body = <String, dynamic>{};

      if (title != null) body['title'] = title;
      if (description != null) body['description'] = description;
      if (content != null) body['content'] = content;
      if (contentHtml != null) body['contentHtml'] = contentHtml;
      if (placeholderValues != null) body['placeholderValues'] = placeholderValues;
      if (expiresAt != null) body['expiresAt'] = expiresAt;
      if (settings != null) body['settings'] = settings;
      if (metadata != null) body['metadata'] = metadata;

      final response = await _apiClient.patch(
        ApiConfig.documentById(workspaceId, documentId),
        data: body,
      );

      final data = response.data;
      if (data is Map<String, dynamic>) {
        final documentData = data['data'] as Map<String, dynamic>? ?? data;
        return Document.fromJson(documentData);
      }

      throw Exception('Invalid response format');
    } catch (e) {
      rethrow;
    }
  }

  /// Delete a document
  Future<void> deleteDocument({
    required String workspaceId,
    required String documentId,
  }) async {
    try {
      await _apiClient.delete(
        ApiConfig.documentById(workspaceId, documentId),
      );
    } catch (e) {
      rethrow;
    }
  }

  /// Get document HTML preview
  Future<String> getPreview({
    required String workspaceId,
    required String documentId,
  }) async {
    try {
      final response = await _apiClient.get(
        ApiConfig.documentPreview(workspaceId, documentId),
      );

      final data = response.data;
      if (data is Map<String, dynamic>) {
        final previewData = data['data'] as Map<String, dynamic>?;
        return previewData?['html']?.toString() ?? '';
      }

      return '';
    } catch (e) {
      rethrow;
    }
  }

  // ==================== RECIPIENTS ====================

  /// Get recipients for a document
  Future<List<DocumentRecipient>> getRecipients({
    required String workspaceId,
    required String documentId,
  }) async {
    try {
      final response = await _apiClient.get(
        ApiConfig.documentRecipients(workspaceId, documentId),
      );

      final data = response.data;
      if (data is Map<String, dynamic>) {
        final recipients = data['data'] as List<dynamic>? ?? [];
        return recipients
            .map((json) => DocumentRecipient.fromJson(json as Map<String, dynamic>))
            .toList();
      }

      return [];
    } catch (e) {
      rethrow;
    }
  }

  /// Add a recipient to a document
  Future<DocumentRecipient> addRecipient({
    required String workspaceId,
    required String documentId,
    required String email,
    required String name,
    RecipientRole? role,
    int? order,
    String? message,
    String? accessCode,
  }) async {
    try {
      final body = <String, dynamic>{
        'email': email,
        'name': name,
      };

      if (role != null) body['role'] = role.name;
      if (order != null) body['order'] = order;
      if (message != null) body['message'] = message;
      if (accessCode != null) body['accessCode'] = accessCode;

      final response = await _apiClient.post(
        ApiConfig.documentRecipients(workspaceId, documentId),
        data: body,
      );

      final data = response.data;
      if (data is Map<String, dynamic>) {
        final recipientData = data['data'] as Map<String, dynamic>? ?? data;
        return DocumentRecipient.fromJson(recipientData);
      }

      throw Exception('Invalid response format');
    } catch (e) {
      rethrow;
    }
  }

  /// Update a recipient
  Future<DocumentRecipient> updateRecipient({
    required String workspaceId,
    required String documentId,
    required String recipientId,
    String? name,
    RecipientRole? role,
    int? order,
    String? message,
  }) async {
    try {
      final body = <String, dynamic>{};

      if (name != null) body['name'] = name;
      if (role != null) body['role'] = role.name;
      if (order != null) body['order'] = order;
      if (message != null) body['message'] = message;

      final response = await _apiClient.patch(
        '${ApiConfig.documentRecipients(workspaceId, documentId)}/$recipientId',
        data: body,
      );

      final data = response.data;
      if (data is Map<String, dynamic>) {
        final recipientData = data['data'] as Map<String, dynamic>? ?? data;
        return DocumentRecipient.fromJson(recipientData);
      }

      throw Exception('Invalid response format');
    } catch (e) {
      rethrow;
    }
  }

  /// Remove a recipient
  Future<void> removeRecipient({
    required String workspaceId,
    required String documentId,
    required String recipientId,
  }) async {
    try {
      await _apiClient.delete(
        '${ApiConfig.documentRecipients(workspaceId, documentId)}/$recipientId',
      );
    } catch (e) {
      rethrow;
    }
  }

  // ==================== SEND & SIGN ====================

  /// Send document for signatures
  Future<Document> sendForSignature({
    required String workspaceId,
    required String documentId,
    String? subject,
    String? message,
    int? reminderDays,
  }) async {
    try {
      final body = <String, dynamic>{};

      if (subject != null) body['subject'] = subject;
      if (message != null) body['message'] = message;
      if (reminderDays != null) body['reminderDays'] = reminderDays;

      final response = await _apiClient.post(
        ApiConfig.documentSend(workspaceId, documentId),
        data: body,
      );

      final data = response.data;
      if (data is Map<String, dynamic>) {
        final documentData = data['data'] as Map<String, dynamic>? ?? data;
        return Document.fromJson(documentData);
      }

      throw Exception('Invalid response format');
    } catch (e) {
      rethrow;
    }
  }

  // ==================== ACTIVITY LOG ====================

  /// Get activity log for a document
  Future<List<DocumentActivityLog>> getActivityLog({
    required String workspaceId,
    required String documentId,
  }) async {
    try {
      final response = await _apiClient.get(
        ApiConfig.documentActivity(workspaceId, documentId),
      );

      final data = response.data;
      if (data is Map<String, dynamic>) {
        final logs = data['data'] as List<dynamic>? ?? [];
        return logs
            .map((json) => DocumentActivityLog.fromJson(json as Map<String, dynamic>))
            .toList();
      }

      return [];
    } catch (e) {
      rethrow;
    }
  }

  // ==================== SIGN DOCUMENT ====================

  /// Sign a document by embedding signature at specified position
  Future<Document> signDocument({
    required String workspaceId,
    required String documentId,
    required String signatureId,
    required double xPercent,
    required double yPercent,
    double scale = 1.0,
    int? topPx, // Absolute pixel position from top
    double? documentHeight,
  }) async {
    try {
      final body = {
        'signatureId': signatureId,
        'position': {
          'xPercent': xPercent,
          'yPercent': yPercent,
          'scale': scale,
          if (topPx != null) 'topPx': topPx,
          if (documentHeight != null) 'documentHeight': documentHeight,
        },
      };

      final response = await _apiClient.post(
        ApiConfig.documentSign(workspaceId, documentId),
        data: body,
      );

      final data = response.data;
      if (data is Map<String, dynamic>) {
        final documentData = data['data'] as Map<String, dynamic>? ?? data;
        return Document.fromJson(documentData);
      }

      throw Exception('Invalid response format');
    } catch (e) {
      rethrow;
    }
  }
}
