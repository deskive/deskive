import 'package:dio/dio.dart';
import 'package:http_parser/http_parser.dart' show MediaType;
import '../base_api_client.dart';

/// Storage File Model
class StorageFile {
  final String id;
  final String workspaceId;
  final String name;
  final String storagePath;
  final String url; // Full CDN URL
  final String mimeType;
  final String size;
  final String uploadedBy;
  final String? folderId;
  final List<dynamic> parentFolderIds;
  final int version;
  final String? previousVersionId;
  final String fileHash;
  final String virusScanStatus;
  final DateTime? virusScanAt;
  final String? extractedText;
  final String? ocrStatus;
  final Map<String, dynamic> metadata;
  final Map<String, dynamic> collaborativeData;
  final bool isDeleted;
  final DateTime? deletedAt;
  final bool starred;
  final DateTime? starredAt;
  final String? starredBy;
  final DateTime? lastOpenedAt;
  final String? lastOpenedBy;
  final int openCount;
  final DateTime createdAt;
  final DateTime updatedAt;

  StorageFile({
    required this.id,
    required this.workspaceId,
    required this.name,
    required this.storagePath,
    required this.url,
    required this.mimeType,
    required this.size,
    required this.uploadedBy,
    this.folderId,
    required this.parentFolderIds,
    required this.version,
    this.previousVersionId,
    required this.fileHash,
    required this.virusScanStatus,
    this.virusScanAt,
    this.extractedText,
    this.ocrStatus,
    required this.metadata,
    required this.collaborativeData,
    required this.isDeleted,
    this.deletedAt,
    required this.starred,
    this.starredAt,
    this.starredBy,
    this.lastOpenedAt,
    this.lastOpenedBy,
    required this.openCount,
    required this.createdAt,
    required this.updatedAt,
  });

  factory StorageFile.fromJson(Map<String, dynamic> json) {
    return StorageFile(
      id: json['id'],
      workspaceId: json['workspace_id'],
      name: json['name'],
      storagePath: json['storage_path'],
      url: json['url'], // Full CDN URL from API response
      mimeType: json['mime_type'],
      size: json['size'].toString(),
      uploadedBy: json['uploaded_by'],
      folderId: json['folder_id'],
      parentFolderIds: json['parent_folder_ids'] ?? [],
      version: json['version'],
      previousVersionId: json['previous_version_id'],
      fileHash: json['file_hash'],
      virusScanStatus: json['virus_scan_status'],
      virusScanAt: json['virus_scan_at'] != null
          ? DateTime.parse(json['virus_scan_at'])
          : null,
      extractedText: json['extracted_text'],
      ocrStatus: json['ocr_status'],
      metadata: json['metadata'] ?? {},
      collaborativeData: json['collaborative_data'] ?? {},
      isDeleted: json['is_deleted'] ?? false,
      deletedAt: json['deleted_at'] != null
          ? DateTime.parse(json['deleted_at'])
          : null,
      starred: json['starred'] ?? false,
      starredAt: json['starred_at'] != null
          ? DateTime.parse(json['starred_at'])
          : null,
      starredBy: json['starred_by'],
      lastOpenedAt: json['last_opened_at'] != null
          ? DateTime.parse(json['last_opened_at'])
          : null,
      lastOpenedBy: json['last_opened_by'],
      openCount: json['open_count'] ?? 0,
      createdAt: DateTime.parse(json['created_at']),
      updatedAt: DateTime.parse(json['updated_at']),
    );
  }
}

/// File version model for version history
class FileVersion {
  final String id;
  final String fileId;
  final int versionNumber;
  final String? storageUrl;
  final int size;
  final String? comment;
  final String createdBy;
  final String? createdByName;
  final DateTime createdAt;

  FileVersion({
    required this.id,
    required this.fileId,
    required this.versionNumber,
    this.storageUrl,
    required this.size,
    this.comment,
    required this.createdBy,
    this.createdByName,
    required this.createdAt,
  });

  factory FileVersion.fromJson(Map<String, dynamic> json) {
    return FileVersion(
      id: json['id'],
      fileId: json['file_id'] ?? json['fileId'],
      versionNumber: json['version_number'] ?? json['versionNumber'] ?? 1,
      storageUrl: json['storage_url'] ?? json['storageUrl'],
      size: json['size'] ?? 0,
      comment: json['comment'],
      createdBy: json['created_by'] ?? json['createdBy'] ?? '',
      createdByName: json['created_by_name'] ?? json['createdByName'],
      createdAt: DateTime.parse(json['created_at'] ?? json['createdAt']),
    );
  }

  String get formattedSize {
    if (size < 1024) return '$size B';
    if (size < 1024 * 1024) return '${(size / 1024).toStringAsFixed(1)} KB';
    if (size < 1024 * 1024 * 1024) return '${(size / (1024 * 1024)).toStringAsFixed(1)} MB';
    return '${(size / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
  }
}

/// Storage API Service
class StorageApiService {
  final BaseApiClient _apiClient = BaseApiClient.instance;

  /// Upload a file to storage
  Future<ApiResponse<StorageFile>> uploadFile({
    required String workspaceId,
    required String fileName,
    required dynamic fileBytes, // Can be Uint8List or File path
    String? mimeType,
    String? description,
    List<String>? tags,
    bool? isPublic,
  }) async {
    try {

      // Create multipart form data matching backend expectations
      final Map<String, dynamic> formDataMap = {
        'file': MultipartFile.fromBytes(
          fileBytes,
          filename: fileName,
          contentType: mimeType != null
            ? MediaType.parse(mimeType)
            : null,
        ),
        'workspace_id': workspaceId,
      };

      // Only add optional fields if they have values
      if (description != null && description.isNotEmpty) {
        formDataMap['description'] = description;
      }
      if (tags != null && tags.isNotEmpty) {
        formDataMap['tags'] = tags.join(',');
      }
      if (isPublic != null) {
        formDataMap['is_public'] = isPublic.toString();
      }

      final formData = FormData.fromMap(formDataMap);


      final response = await _apiClient.post(
        '/storage/upload',
        data: formData,
        options: Options(
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        ),
      );


      return ApiResponse.success(
        StorageFile.fromJson(response.data),
        message: 'File uploaded successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {

      // Extract error message from response if available
      String errorMessage = e.message ?? 'Failed to upload file';
      if (e.response?.data != null && e.response?.data is Map) {
        final responseData = e.response!.data as Map<String, dynamic>;
        errorMessage = responseData['message'] ?? errorMessage;
      }

      return ApiResponse.error(
        errorMessage,
        statusCode: e.response?.statusCode,
        data: null, // Don't pass error response as StorageFile
      );
    } catch (e, stackTrace) {

      return ApiResponse.error(
        'Failed to upload file: $e',
        statusCode: null,
        data: null,
      );
    }
  }

  // ==================== File Versioning ====================

  /// Get all versions of a file
  Future<ApiResponse<List<FileVersion>>> getFileVersions(
    String workspaceId,
    String fileId,
  ) async {
    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/files/$fileId/versions',
      );

      final data = response.data;
      final versionsData = data is List ? data : (data['data'] ?? data['versions'] ?? []);

      final versions = (versionsData as List)
          .map((e) => FileVersion.fromJson(e))
          .toList();

      return ApiResponse.success(
        versions,
        message: 'File versions retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.response?.data?['message'] ?? e.message ?? 'Failed to get file versions',
        statusCode: e.response?.statusCode,
      );
    }
  }

  /// Upload a new version of a file
  Future<ApiResponse<FileVersion>> uploadNewVersion({
    required String workspaceId,
    required String fileId,
    required String fileName,
    required dynamic fileBytes,
    String? mimeType,
    String? comment,
  }) async {
    try {
      final Map<String, dynamic> formDataMap = {
        'file': MultipartFile.fromBytes(
          fileBytes,
          filename: fileName,
          contentType: mimeType != null ? MediaType.parse(mimeType) : null,
        ),
      };

      if (comment != null && comment.isNotEmpty) {
        formDataMap['comment'] = comment;
      }

      final formData = FormData.fromMap(formDataMap);

      final response = await _apiClient.post(
        '/workspaces/$workspaceId/files/$fileId/versions',
        data: formData,
        options: Options(
          headers: {'Content-Type': 'multipart/form-data'},
        ),
      );

      final data = response.data;
      final versionData = data is Map ? (data['data'] ?? data) : data;

      return ApiResponse.success(
        FileVersion.fromJson(versionData),
        message: 'New version uploaded successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.response?.data?['message'] ?? e.message ?? 'Failed to upload new version',
        statusCode: e.response?.statusCode,
      );
    }
  }

  /// Restore a previous version of a file
  Future<ApiResponse<StorageFile>> restoreVersion(
    String workspaceId,
    String fileId,
    String versionId,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/files/$fileId/versions/$versionId/restore',
        data: {},
      );

      final data = response.data;
      final fileData = data is Map ? (data['data'] ?? data) : data;

      return ApiResponse.success(
        StorageFile.fromJson(fileData),
        message: 'Version restored successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.response?.data?['message'] ?? e.message ?? 'Failed to restore version',
        statusCode: e.response?.statusCode,
      );
    }
  }
}
