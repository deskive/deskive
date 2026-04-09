import 'dart:io';
import 'package:dio/dio.dart';
import '../base_api_client.dart';
import '../../models/file/file_comment.dart';

/// DTO classes for File operations
class UploadFileDto {
  final String? folderId;
  final String? description;
  final List<String>? tags;
  final bool isPublic;
  final Map<String, dynamic>? metadata;
  
  UploadFileDto({
    this.folderId,
    this.description,
    this.tags,
    this.isPublic = false,
    this.metadata,
  });
  
  Map<String, dynamic> toJson() => {
    if (folderId != null) 'parent_folder_id': folderId,
    if (description != null) 'description': description,
    if (tags != null) 'tags': tags,
    if (metadata != null) 'metadata': metadata,
  };
}

class CreateFolderDto {
  final String name;
  final String? description;
  final String? parentId;
  final bool isPublic;
  
  CreateFolderDto({
    required this.name,
    this.description,
    this.parentId,
    this.isPublic = false,
  });
  
  Map<String, dynamic> toJson() => {
    'name': name,
    if (description != null) 'description': description,
    if (parentId != null) 'parent_id': parentId,
    'is_public': isPublic,
  };
}

class ShareFileDto {
  final List<String>? userIds;
  final Map<String, bool> permissions; // e.g., {'read': true, 'write': false}
  final DateTime? expiresAt;
  final String? password;
  final int? maxDownloads;
  
  ShareFileDto({
    this.userIds,
    required String permission,
    this.expiresAt,
    this.password,
    this.maxDownloads,
  }) : permissions = {permission: true};
  
  Map<String, dynamic> toJson() => {
    if (userIds != null) 'user_ids': userIds,
    'permissions': permissions,
    if (expiresAt != null) 'expires_at': expiresAt!.toIso8601String(),
    if (password != null) 'password': password,
    if (maxDownloads != null) 'max_downloads': maxDownloads,
  };
}

class MoveFileDto {
  final String? folderId;
  final String? name;

  MoveFileDto({
    this.folderId,
    this.name,
  });

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    if (folderId != null) map['parent_folder_id'] = folderId;
    if (name != null) map['new_name'] = name;
    return map;
  }
}

class DeleteMultipleFilesDto {
  final List<String> fileIds;

  DeleteMultipleFilesDto({
    required this.fileIds,
  });

  Map<String, dynamic> toJson() => {
    'file_ids': fileIds,
  };
}

class DeleteMultipleFoldersDto {
  final List<String> folderIds;

  DeleteMultipleFoldersDto({
    required this.folderIds,
  });

  Map<String, dynamic> toJson() => {
    'folder_ids': folderIds,
  };
}

class CopyFilesDto {
  final List<String> fileIds;
  final String? targetFolderId;

  CopyFilesDto({
    required this.fileIds,
    this.targetFolderId,
  });

  Map<String, dynamic> toJson() => {
    'file_ids': fileIds,
    if (targetFolderId != null) 'target_folder_id': targetFolderId,
  };
}

class CopyFoldersDto {
  final List<String> folderIds;
  final String? targetParentId;

  CopyFoldersDto({
    required this.folderIds,
    this.targetParentId,
  });

  Map<String, dynamic> toJson() => {
    'folder_ids': folderIds,
    if (targetParentId != null) 'target_parent_id': targetParentId,
  };
}

class MoveFilesDto {
  final List<String> fileIds;
  final String? targetFolderId;

  MoveFilesDto({
    required this.fileIds,
    this.targetFolderId,
  });

  Map<String, dynamic> toJson() => {
    'file_ids': fileIds,
    if (targetFolderId != null) 'target_folder_id': targetFolderId,
  };
}

class MoveFoldersDto {
  final List<String> folderIds;
  final String? targetParentId;

  MoveFoldersDto({
    required this.folderIds,
    this.targetParentId,
  });

  Map<String, dynamic> toJson() => {
    'folder_ids': folderIds,
    if (targetParentId != null) 'target_parent_id': targetParentId,
  };
}

/// DTO for creating a file comment
class CreateFileCommentDto {
  final String content;
  final String? parentId;
  final Map<String, dynamic>? metadata;

  CreateFileCommentDto({
    required this.content,
    this.parentId,
    this.metadata,
  });

  Map<String, dynamic> toJson() => {
    'content': content,
    if (parentId != null) 'parent_id': parentId,
    if (metadata != null) 'metadata': metadata,
  };
}

/// DTO for updating a file comment
class UpdateFileCommentDto {
  final String content;
  final Map<String, dynamic>? metadata;

  UpdateFileCommentDto({
    required this.content,
    this.metadata,
  });

  Map<String, dynamic> toJson() => {
    'content': content,
    if (metadata != null) 'metadata': metadata,
  };
}

/// Model classes
class FileModel {
  final String id;
  final String name;
  final String originalName;
  final String mimeType;
  final int size;
  final String url;
  final String? thumbnailUrl;
  final String uploadedBy;
  final String? uploaderName;
  final String workspaceId;
  final String? folderId;
  final String? folderName;
  final String? description;
  final List<String>? tags;
  final bool isPublic;
  final Map<String, dynamic>? metadata;
  final DateTime createdAt;
  final DateTime updatedAt;
  
  FileModel({
    required this.id,
    required this.name,
    required this.originalName,
    required this.mimeType,
    required this.size,
    required this.url,
    this.thumbnailUrl,
    required this.uploadedBy,
    this.uploaderName,
    required this.workspaceId,
    this.folderId,
    this.folderName,
    this.description,
    this.tags,
    required this.isPublic,
    this.metadata,
    required this.createdAt,
    required this.updatedAt,
  });
  
  factory FileModel.fromJson(Map<String, dynamic> json) {
    return FileModel(
      id: json['id'],
      name: json['name'],
      originalName: json['metadata']?['original_name'] ?? json['name'],
      mimeType: json['mime_type'],
      size: int.tryParse(json['size'].toString()) ?? 0,
      url: json['url'] ?? '',
      thumbnailUrl: json['thumbnail_url'],
      uploadedBy: json['uploaded_by'],
      uploaderName: json['uploader_name'],
      workspaceId: json['workspace_id'],
      folderId: json['parent_folder_id'],
      folderName: json['folder_name'],
      description: json['metadata']?['description'],
      tags: json['metadata']?['tags'] != null ? List<String>.from(json['metadata']['tags']) : null,
      isPublic: json['is_public'] ?? false,
      metadata: json['metadata'],
      createdAt: DateTime.parse(json['created_at']),
      updatedAt: DateTime.parse(json['updated_at']),
    );
  }
}

class Folder {
  final String id;
  final String name;
  final String? description;
  final String? parentId;
  final String createdBy;
  final String workspaceId;
  final bool isPublic;
  final List<Folder>? subfolders;
  final int? fileCount;
  final DateTime createdAt;
  final DateTime updatedAt;
  
  Folder({
    required this.id,
    required this.name,
    this.description,
    this.parentId,
    required this.createdBy,
    required this.workspaceId,
    required this.isPublic,
    this.subfolders,
    this.fileCount,
    required this.createdAt,
    required this.updatedAt,
  });
  
  factory Folder.fromJson(Map<String, dynamic> json) {
    return Folder(
      id: json['id'],
      name: json['name'],
      description: json['description'],
      parentId: json['parent_id'],
      createdBy: json['created_by'],
      workspaceId: json['workspace_id'],
      isPublic: json['is_public'] ?? false,
      subfolders: json['subfolders'] != null
          ? (json['subfolders'] as List).map((e) => Folder.fromJson(e)).toList()
          : null,
      fileCount: json['file_count'],
      createdAt: DateTime.parse(json['created_at']),
      updatedAt: DateTime.parse(json['updated_at']),
    );
  }
}

class FileShare {
  final String id;
  final String fileId;
  final String token;
  final String permission;
  final DateTime? expiresAt;
  final bool isPublic;
  final bool hasPassword;
  final DateTime createdAt;
  
  FileShare({
    required this.id,
    required this.fileId,
    required this.token,
    required this.permission,
    this.expiresAt,
    required this.isPublic,
    required this.hasPassword,
    required this.createdAt,
  });
  
  factory FileShare.fromJson(Map<String, dynamic> json) {
    return FileShare(
      id: json['id'],
      fileId: json['file_id'],
      token: json['share_token'],
      permission: json['permissions']?.keys?.first ?? 'read',
      expiresAt: json['expires_at'] != null
          ? DateTime.parse(json['expires_at'])
          : null,
      isPublic: json['is_public'] ?? false,
      hasPassword: json['password'] != null,
      createdAt: DateTime.parse(json['created_at']),
    );
  }
}

/// Public share link model (Google Drive style sharing)
class ShareLink {
  final String id;
  final String fileId;
  final String shareToken;
  final String shareUrl;
  final String accessLevel; // 'view' | 'download' | 'edit'
  final bool hasPassword;
  final DateTime? expiresAt;
  final int? maxDownloads;
  final int downloadCount;
  final int viewCount;
  final bool isActive;
  final DateTime createdAt;

  ShareLink({
    required this.id,
    required this.fileId,
    required this.shareToken,
    required this.shareUrl,
    required this.accessLevel,
    required this.hasPassword,
    this.expiresAt,
    this.maxDownloads,
    required this.downloadCount,
    required this.viewCount,
    required this.isActive,
    required this.createdAt,
  });

  factory ShareLink.fromJson(Map<String, dynamic> json) {
    return ShareLink(
      id: json['id'] ?? '',
      fileId: json['fileId'] ?? json['file_id'] ?? '',
      shareToken: json['shareToken'] ?? json['share_token'] ?? '',
      shareUrl: json['shareUrl'] ?? json['share_url'] ?? '',
      accessLevel: json['accessLevel'] ?? json['access_level'] ?? 'view',
      hasPassword: json['hasPassword'] ?? json['has_password'] ?? false,
      expiresAt: json['expiresAt'] != null
          ? DateTime.parse(json['expiresAt'])
          : (json['expires_at'] != null
              ? DateTime.parse(json['expires_at'])
              : null),
      maxDownloads: json['maxDownloads'] ?? json['max_downloads'],
      downloadCount: json['downloadCount'] ?? json['download_count'] ?? 0,
      viewCount: json['viewCount'] ?? json['view_count'] ?? 0,
      isActive: json['isActive'] ?? json['is_active'] ?? true,
      createdAt: DateTime.parse(json['createdAt'] ?? json['created_at']),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'fileId': fileId,
    'shareToken': shareToken,
    'shareUrl': shareUrl,
    'accessLevel': accessLevel,
    'hasPassword': hasPassword,
    'expiresAt': expiresAt?.toIso8601String(),
    'maxDownloads': maxDownloads,
    'downloadCount': downloadCount,
    'viewCount': viewCount,
    'isActive': isActive,
    'createdAt': createdAt.toIso8601String(),
  };

  /// Get a display-friendly access level label
  String get accessLevelLabel {
    switch (accessLevel) {
      case 'view':
        return 'View only';
      case 'download':
        return 'Can download';
      case 'edit':
        return 'Can edit';
      default:
        return accessLevel;
    }
  }
}

/// DTO for creating a share link
class CreateShareLinkDto {
  final String accessLevel; // 'view' | 'download' | 'edit'
  final String? password;
  final DateTime? expiresAt;
  final int? maxDownloads;

  CreateShareLinkDto({
    this.accessLevel = 'view',
    this.password,
    this.expiresAt,
    this.maxDownloads,
  });

  Map<String, dynamic> toJson() => {
    'accessLevel': accessLevel,
    if (password != null) 'password': password,
    if (expiresAt != null) 'expiresAt': expiresAt!.toIso8601String(),
    if (maxDownloads != null) 'maxDownloads': maxDownloads,
  };
}

/// DTO for updating a share link
class UpdateShareLinkDto {
  final String? accessLevel;
  final String? password;
  final DateTime? expiresAt;
  final int? maxDownloads;
  final bool? isActive;

  UpdateShareLinkDto({
    this.accessLevel,
    this.password,
    this.expiresAt,
    this.maxDownloads,
    this.isActive,
  });

  Map<String, dynamic> toJson() => {
    if (accessLevel != null) 'accessLevel': accessLevel,
    if (password != null) 'password': password,
    if (expiresAt != null) 'expiresAt': expiresAt!.toIso8601String(),
    if (maxDownloads != null) 'maxDownloads': maxDownloads,
    if (isActive != null) 'isActive': isActive,
  };
}

class StorageStats {
  final int totalFiles;
  final int totalSize;
  final int usedStorage;
  final int storageLimit;
  final double usagePercentage;
  final Map<String, int> fileTypeBreakdown;
  
  StorageStats({
    required this.totalFiles,
    required this.totalSize,
    required this.usedStorage,
    required this.storageLimit,
    required this.usagePercentage,
    required this.fileTypeBreakdown,
  });
  
  factory StorageStats.fromJson(Map<String, dynamic> json) {
    return StorageStats(
      totalFiles: json['file_count'] ?? 0,
      totalSize: json['used_bytes'] ?? 0,
      usedStorage: json['used_bytes'] ?? 0,
      storageLimit: json['total_bytes'] ?? 0,
      usagePercentage: (json['used_percentage'] ?? 0).toDouble(),
      fileTypeBreakdown: Map<String, int>.from(json['file_type_breakdown'] ?? {}),
    );
  }
}

class DownloadResponse {
  final String fileName;
  final String mimeType;
  final Stream<List<int>> content;

  DownloadResponse({
    required this.fileName,
    required this.mimeType,
    required this.content,
  });
}

class BulkDeleteResponse {
  final String message;
  final int deletedCount;
  final int failedCount;
  final DateTime deletedAt;
  final List<String> success;
  final List<String> failed;

  BulkDeleteResponse({
    required this.message,
    required this.deletedCount,
    required this.failedCount,
    required this.deletedAt,
    required this.success,
    required this.failed,
  });

  factory BulkDeleteResponse.fromJson(Map<String, dynamic> json) {
    return BulkDeleteResponse(
      message: json['message'] ?? '',
      deletedCount: json['deleted_count'] ?? 0,
      failedCount: json['failed_count'] ?? 0,
      deletedAt: DateTime.parse(json['deleted_at']),
      success: List<String>.from(json['success'] ?? []),
      failed: List<String>.from(json['failed'] ?? []),
    );
  }
}

class FolderDeleteDetail {
  final String folderId;
  final int foldersDeleted;
  final int filesDeleted;

  FolderDeleteDetail({
    required this.folderId,
    required this.foldersDeleted,
    required this.filesDeleted,
  });

  factory FolderDeleteDetail.fromJson(Map<String, dynamic> json) {
    return FolderDeleteDetail(
      folderId: json['folderId'] ?? '',
      foldersDeleted: json['folders_deleted'] ?? 0,
      filesDeleted: json['files_deleted'] ?? 0,
    );
  }
}

class BulkDeleteFoldersResponse {
  final String message;
  final int deletedFoldersCount;
  final int deletedFilesCount;
  final DateTime deletedAt;
  final List<FolderDeleteDetail> success;
  final List<dynamic> failed;

  BulkDeleteFoldersResponse({
    required this.message,
    required this.deletedFoldersCount,
    required this.deletedFilesCount,
    required this.deletedAt,
    required this.success,
    required this.failed,
  });

  factory BulkDeleteFoldersResponse.fromJson(Map<String, dynamic> json) {
    return BulkDeleteFoldersResponse(
      message: json['message'] ?? '',
      deletedFoldersCount: json['deleted_folders_count'] ?? 0,
      deletedFilesCount: json['deleted_files_count'] ?? 0,
      deletedAt: DateTime.parse(json['deleted_at']),
      success: (json['success'] as List<dynamic>?)
          ?.map((item) => FolderDeleteDetail.fromJson(item))
          .toList() ?? [],
      failed: json['failed'] ?? [],
    );
  }
}

class CopiedFileDetail {
  final String fileId;
  final String newFileId;
  final String name;

  CopiedFileDetail({
    required this.fileId,
    required this.newFileId,
    required this.name,
  });

  factory CopiedFileDetail.fromJson(Map<String, dynamic> json) {
    return CopiedFileDetail(
      fileId: json['fileId'] ?? '',
      newFileId: json['newFileId'] ?? '',
      name: json['name'] ?? '',
    );
  }
}

class CopyFilesResponse {
  final String message;
  final int copiedCount;
  final int failedCount;
  final List<CopiedFileDetail> success;
  final List<dynamic> failed;

  CopyFilesResponse({
    required this.message,
    required this.copiedCount,
    required this.failedCount,
    required this.success,
    required this.failed,
  });

  factory CopyFilesResponse.fromJson(Map<String, dynamic> json) {
    return CopyFilesResponse(
      message: json['message'] ?? '',
      copiedCount: json['copied_count'] ?? 0,
      failedCount: json['failed_count'] ?? 0,
      success: (json['success'] as List<dynamic>?)
          ?.map((item) => CopiedFileDetail.fromJson(item))
          .toList() ?? [],
      failed: json['failed'] ?? [],
    );
  }
}

class CopiedFolderDetail {
  final String folderId;
  final String newFolderId;
  final String name;

  CopiedFolderDetail({
    required this.folderId,
    required this.newFolderId,
    required this.name,
  });

  factory CopiedFolderDetail.fromJson(Map<String, dynamic> json) {
    return CopiedFolderDetail(
      folderId: json['folderId'] ?? '',
      newFolderId: json['newFolderId'] ?? '',
      name: json['name'] ?? '',
    );
  }
}

class CopyFoldersResponse {
  final String message;
  final int copiedCount;
  final int failedCount;
  final List<CopiedFolderDetail> success;
  final List<dynamic> failed;

  CopyFoldersResponse({
    required this.message,
    required this.copiedCount,
    required this.failedCount,
    required this.success,
    required this.failed,
  });

  factory CopyFoldersResponse.fromJson(Map<String, dynamic> json) {
    return CopyFoldersResponse(
      message: json['message'] ?? '',
      copiedCount: json['copied_count'] ?? 0,
      failedCount: json['failed_count'] ?? 0,
      success: (json['success'] as List<dynamic>?)
          ?.map((item) => CopiedFolderDetail.fromJson(item))
          .toList() ?? [],
      failed: json['failed'] ?? [],
    );
  }
}

class MovedFileDetail {
  final String fileId;
  final String name;
  final String? targetFolderId;

  MovedFileDetail({
    required this.fileId,
    required this.name,
    this.targetFolderId,
  });

  factory MovedFileDetail.fromJson(Map<String, dynamic> json) {
    return MovedFileDetail(
      fileId: json['fileId'] ?? '',
      name: json['name'] ?? '',
      targetFolderId: json['targetFolderId'],
    );
  }
}

class MoveFilesResponse {
  final String message;
  final int movedCount;
  final int failedCount;
  final List<MovedFileDetail> success;
  final List<dynamic> failed;

  MoveFilesResponse({
    required this.message,
    required this.movedCount,
    required this.failedCount,
    required this.success,
    required this.failed,
  });

  factory MoveFilesResponse.fromJson(Map<String, dynamic> json) {
    return MoveFilesResponse(
      message: json['message'] ?? '',
      movedCount: json['moved_count'] ?? 0,
      failedCount: json['failed_count'] ?? 0,
      success: (json['success'] as List<dynamic>?)
          ?.map((item) => MovedFileDetail.fromJson(item))
          .toList() ?? [],
      failed: json['failed'] ?? [],
    );
  }
}

class MovedFolderDetail {
  final String folderId;
  final String name;
  final String? targetParentId;

  MovedFolderDetail({
    required this.folderId,
    required this.name,
    this.targetParentId,
  });

  factory MovedFolderDetail.fromJson(Map<String, dynamic> json) {
    return MovedFolderDetail(
      folderId: json['folderId'] ?? '',
      name: json['name'] ?? '',
      targetParentId: json['targetParentId'],
    );
  }
}

class MoveFoldersResponse {
  final String message;
  final int movedCount;
  final int failedCount;
  final List<MovedFolderDetail> success;
  final List<dynamic> failed;

  MoveFoldersResponse({
    required this.message,
    required this.movedCount,
    required this.failedCount,
    required this.success,
    required this.failed,
  });

  factory MoveFoldersResponse.fromJson(Map<String, dynamic> json) {
    return MoveFoldersResponse(
      message: json['message'] ?? '',
      movedCount: json['moved_count'] ?? 0,
      failedCount: json['failed_count'] ?? 0,
      success: (json['success'] as List<dynamic>?)
          ?.map((item) => MovedFolderDetail.fromJson(item))
          .toList() ?? [],
      failed: json['failed'] ?? [],
    );
  }
}

/// API service for file operations
class FileApiService {
  final BaseApiClient _apiClient;
  
  FileApiService({BaseApiClient? apiClient}) 
      : _apiClient = apiClient ?? BaseApiClient.instance;
  
  // ==================== FOLDER OPERATIONS ====================
  
  /// Create a new folder
  Future<ApiResponse<Folder>> createFolder(
    String workspaceId,
    CreateFolderDto dto,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/files/folders',
        data: dto.toJson(),
      );
      
      return ApiResponse.success(
        Folder.fromJson(response.data),
        message: 'Folder created successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to create folder',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Get folders in workspace
  Future<ApiResponse<List<Folder>>> getFolders(
    String workspaceId, {
    String? parentId,
  }) async {
    try {
      final queryParameters = <String, dynamic>{};
      if (parentId != null) queryParameters['parent_id'] = parentId;
      
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/files/folders',
        queryParameters: queryParameters,
      );
      
      final folders = (response.data as List)
          .map((json) => Folder.fromJson(json))
          .toList();
      
      return ApiResponse.success(
        folders,
        message: 'Folders retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get folders',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Delete a folder
  Future<ApiResponse<void>> deleteFolder(
    String workspaceId,
    String folderId,
  ) async {
    try {
      final response = await _apiClient.delete(
        '/workspaces/$workspaceId/files/folders/$folderId',
      );
      
      return ApiResponse.success(
        null,
        message: 'Folder deleted successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to delete folder',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  // ==================== FILE UPLOAD & MANAGEMENT ====================
  
  /// Upload a single file
  Future<ApiResponse<FileModel>> uploadFile(
    String workspaceId,
    File file,
    UploadFileDto dto,
  ) async {
    try {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(file.path),
        'workspace_id': workspaceId,
        ...dto.toJson(),
      });

      final response = await _apiClient.post(
        '/workspaces/$workspaceId/files/upload',
        data: formData,
      );

      return ApiResponse.success(
        FileModel.fromJson(response.data),
        message: 'File uploaded successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to upload file',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Upload multiple files
  Future<ApiResponse<List<FileModel>>> uploadMultipleFiles(
    String workspaceId,
    List<File> files,
    UploadFileDto dto,
  ) async {
    try {
      final formData = FormData.fromMap({
        'files': files.map((file) => MultipartFile.fromFileSync(file.path)).toList(),
        'workspace_id': workspaceId,
        ...dto.toJson(),
      });

      final response = await _apiClient.post(
        '/workspaces/$workspaceId/files/upload/multiple',
        data: formData,
      );

      final uploadedFiles = (response.data as List)
          .map((json) => FileModel.fromJson(json))
          .toList();

      return ApiResponse.success(
        uploadedFiles,
        message: 'Files uploaded successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to upload files',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Get files in workspace
  Future<ApiResponse<PaginatedResponse<FileModel>>> getFiles(
    String workspaceId, {
    String? folderId,
    int page = 1,
    int limit = 50,
  }) async {
    try {
      final queryParameters = <String, dynamic>{
        'page': page,
        'limit': limit,
      };
      if (folderId != null) queryParameters['parent_folder_id'] = folderId;
      
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/files',
        queryParameters: queryParameters,
      );
      
      // Backend returns simple array with pagination info
      final files = (response.data['data'] as List?)
              ?.map((json) => FileModel.fromJson(json))
              .toList() ??
          <FileModel>[];
      
      final paginatedResponse = PaginatedResponse(
        data: files,
        currentPage: response.data['page'] ?? page,
        totalPages: ((response.data['total'] ?? 0) / limit).ceil(),
        totalItems: response.data['total'] ?? 0,
        itemsPerPage: response.data['limit'] ?? limit,
        hasNextPage: (response.data['page'] ?? page) < ((response.data['total'] ?? 0) / limit).ceil(),
        hasPreviousPage: (response.data['page'] ?? page) > 1,
      );
      
      return ApiResponse.success(
        paginatedResponse,
        message: 'Files retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get files',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Search files
  Future<ApiResponse<PaginatedResponse<FileModel>>> searchFiles(
    String workspaceId,
    String query, {
    String? mimeType,
    String? uploadedBy,
    String? dateFrom,
    String? dateTo,
    int page = 1,
    int limit = 50,
  }) async {
    try {
      final queryParameters = <String, dynamic>{
        'q': query,
        'page': page,
        'limit': limit,
      };
      if (mimeType != null) queryParameters['mime_type'] = mimeType;
      if (uploadedBy != null) queryParameters['uploaded_by'] = uploadedBy;
      if (dateFrom != null) queryParameters['date_from'] = dateFrom;
      if (dateTo != null) queryParameters['date_to'] = dateTo;
      
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/files/search',
        queryParameters: queryParameters,
      );
      
      // Backend returns simple array with pagination info
      final files = (response.data['data'] as List?)
              ?.map((json) => FileModel.fromJson(json))
              .toList() ??
          <FileModel>[];
      
      final paginatedResponse = PaginatedResponse(
        data: files,
        currentPage: response.data['page'] ?? page,
        totalPages: ((response.data['total'] ?? 0) / limit).ceil(),
        totalItems: response.data['total'] ?? 0,
        itemsPerPage: response.data['limit'] ?? limit,
        hasNextPage: (response.data['page'] ?? page) < ((response.data['total'] ?? 0) / limit).ceil(),
        hasPreviousPage: (response.data['page'] ?? page) > 1,
      );
      
      return ApiResponse.success(
        paginatedResponse,
        message: 'Search completed successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to search files',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Get storage statistics
  Future<ApiResponse<StorageStats>> getStorageStats(String workspaceId) async {
    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/files/stats',
      );
      
      return ApiResponse.success(
        StorageStats.fromJson(response.data),
        message: 'Storage stats retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get storage stats',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Get file details
  Future<ApiResponse<FileModel>> getFile(
    String workspaceId,
    String fileId,
  ) async {
    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/files/$fileId',
      );
      
      return ApiResponse.success(
        FileModel.fromJson(response.data),
        message: 'File retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get file',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Download a file
  Future<ApiResponse<String>> downloadFile(
    String workspaceId,
    String fileId,
    String savePath,
  ) async {
    try {
      final response = await _apiClient.download(
        '/workspaces/$workspaceId/files/$fileId/download',
        savePath,
      );
      
      return ApiResponse.success(
        savePath,
        message: 'File downloaded successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to download file',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Move or rename a file
  Future<ApiResponse<FileModel>> moveFile(
    String workspaceId,
    String fileId,
    MoveFileDto dto,
  ) async {
    try {
      final response = await _apiClient.put(
        '/workspaces/$workspaceId/files/$fileId/move',
        data: dto.toJson(),
      );
      
      return ApiResponse.success(
        FileModel.fromJson(response.data),
        message: 'File moved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to move file',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Delete a file
  Future<ApiResponse<void>> deleteFile(
    String workspaceId,
    String fileId,
  ) async {
    try {
      final response = await _apiClient.delete(
        '/workspaces/$workspaceId/files/$fileId',
      );

      return ApiResponse.success(
        null,
        message: 'File deleted successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to delete file',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Delete multiple files at once
  Future<ApiResponse<BulkDeleteResponse>> deleteMultipleFiles(
    String workspaceId,
    DeleteMultipleFilesDto dto,
  ) async {
    try {
      final response = await _apiClient.delete(
        '/workspaces/$workspaceId/files',
        data: dto.toJson(),
      );

      return ApiResponse.success(
        BulkDeleteResponse.fromJson(response.data),
        message: response.data['message'] ?? 'Files deleted successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to delete files',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Delete multiple folders at once
  Future<ApiResponse<BulkDeleteFoldersResponse>> deleteMultipleFolders(
    String workspaceId,
    DeleteMultipleFoldersDto dto,
  ) async {
    try {
      final response = await _apiClient.delete(
        '/workspaces/$workspaceId/files/folders',
        data: dto.toJson(),
      );

      return ApiResponse.success(
        BulkDeleteFoldersResponse.fromJson(response.data),
        message: response.data['message'] ?? 'Folders deleted successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to delete folders',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Copy multiple files to a target folder
  Future<ApiResponse<CopyFilesResponse>> copyFiles(
    String workspaceId,
    CopyFilesDto dto,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/files/copy',
        data: dto.toJson(),
      );

      return ApiResponse.success(
        CopyFilesResponse.fromJson(response.data),
        message: response.data['message'] ?? 'Files copied successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to copy files',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Copy multiple folders to a target parent folder
  Future<ApiResponse<CopyFoldersResponse>> copyFolders(
    String workspaceId,
    CopyFoldersDto dto,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/files/folders/batch-copy',
        data: dto.toJson(),
      );

      return ApiResponse.success(
        CopyFoldersResponse.fromJson(response.data),
        message: response.data['message'] ?? 'Folders copied successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to copy folders',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Move multiple files to a target folder
  Future<ApiResponse<MoveFilesResponse>> moveFiles(
    String workspaceId,
    MoveFilesDto dto,
  ) async {
    try {
      final response = await _apiClient.put(
        '/workspaces/$workspaceId/files/batch-move',
        data: dto.toJson(),
      );

      return ApiResponse.success(
        MoveFilesResponse.fromJson(response.data),
        message: response.data['message'] ?? 'Files moved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to move files',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Move multiple folders to a target parent folder
  Future<ApiResponse<MoveFoldersResponse>> moveFolders(
    String workspaceId,
    MoveFoldersDto dto,
  ) async {
    try {
      final response = await _apiClient.put(
        '/workspaces/$workspaceId/files/batch-move-folders',
        data: dto.toJson(),
      );

      return ApiResponse.success(
        MoveFoldersResponse.fromJson(response.data),
        message: response.data['message'] ?? 'Folders moved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to move folders',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  // ==================== FILE SHARING ====================
  
  /// Create a share link for a file
  Future<ApiResponse<FileShare>> shareFile(
    String workspaceId,
    String fileId,
    ShareFileDto dto,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/files/$fileId/share',
        data: dto.toJson(),
      );
      
      return ApiResponse.success(
        FileShare.fromJson(response.data),
        message: 'Share link created successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to share file',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Get all share links for a file
  Future<ApiResponse<List<FileShare>>> getFileShares(
    String workspaceId,
    String fileId,
  ) async {
    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/files/$fileId/shares',
      );
      
      final shares = (response.data as List)
          .map((json) => FileShare.fromJson(json))
          .toList();
      
      return ApiResponse.success(
        shares,
        message: 'File shares retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get file shares',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Revoke a file share link
  Future<ApiResponse<void>> revokeFileShare(
    String workspaceId,
    String shareId,
  ) async {
    try {
      final response = await _apiClient.delete(
        '/workspaces/$workspaceId/files/shares/$shareId',
      );
      
      return ApiResponse.success(
        null,
        message: 'Share link revoked successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to revoke share link',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Access a shared file via token
  Future<ApiResponse<FileModel>> getSharedFile(
    String shareToken, {
    String? password,
  }) async {
    try {
      final queryParameters = <String, dynamic>{};
      if (password != null) queryParameters['password'] = password;
      
      final response = await _apiClient.get(
        '/files/shared/$shareToken',
        queryParameters: queryParameters,
      );
      
      return ApiResponse.success(
        FileModel.fromJson(response.data),
        message: 'Shared file accessed successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to access shared file',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Download a shared file via token
  Future<ApiResponse<String>> downloadSharedFile(
    String shareToken,
    String savePath, {
    String? password,
  }) async {
    try {
      final queryParameters = <String, dynamic>{};
      if (password != null) queryParameters['password'] = password;
      
      final response = await _apiClient.download(
        '/files/shared/$shareToken/download',
        savePath,
        queryParameters: queryParameters,
      );
      
      return ApiResponse.success(
        savePath,
        message: 'Shared file downloaded successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to download shared file',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  // ==================== PUBLIC SHARE LINKS (Google Drive style) ====================

  /// Create a public share link for a file
  Future<ApiResponse<ShareLink>> createShareLink(
    String workspaceId,
    String fileId,
    CreateShareLinkDto dto,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/files/$fileId/share-link',
        data: dto.toJson(),
      );

      return ApiResponse.success(
        ShareLink.fromJson(response.data),
        message: 'Share link created successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to create share link',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Get all share links for a file
  Future<ApiResponse<List<ShareLink>>> getFileShareLinks(
    String workspaceId,
    String fileId,
  ) async {
    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/files/$fileId/share-links',
      );

      final links = (response.data as List)
          .map((json) => ShareLink.fromJson(json))
          .toList();

      return ApiResponse.success(
        links,
        message: 'Share links retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get share links',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Update a share link
  Future<ApiResponse<ShareLink>> updateShareLink(
    String workspaceId,
    String shareId,
    UpdateShareLinkDto dto,
  ) async {
    try {
      final response = await _apiClient.put(
        '/workspaces/$workspaceId/files/share-links/$shareId',
        data: dto.toJson(),
      );

      return ApiResponse.success(
        ShareLink.fromJson(response.data),
        message: 'Share link updated successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to update share link',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Delete a share link
  Future<ApiResponse<void>> deleteShareLink(
    String workspaceId,
    String shareId,
  ) async {
    try {
      final response = await _apiClient.delete(
        '/workspaces/$workspaceId/files/share-links/$shareId',
      );

      return ApiResponse.success(
        null,
        message: 'Share link deleted successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to delete share link',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  // ==================== FILE COMMENTS ====================

  /// Get all comments for a file
  Future<ApiResponse<List<FileComment>>> getFileComments(
    String workspaceId,
    String fileId,
  ) async {
    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/files/$fileId/comments',
      );

      final List<FileComment> comments;
      if (response.data is List) {
        comments = (response.data as List)
            .map((json) => FileComment.fromJson(json))
            .toList();
      } else if (response.data is Map && response.data['data'] != null) {
        comments = (response.data['data'] as List)
            .map((json) => FileComment.fromJson(json))
            .toList();
      } else {
        comments = [];
      }

      return ApiResponse.success(
        comments,
        message: 'Comments retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get comments',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Create a new comment on a file
  Future<ApiResponse<FileComment>> createFileComment(
    String workspaceId,
    String fileId,
    CreateFileCommentDto dto,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/files/$fileId/comments',
        data: dto.toJson(),
      );

      final commentData = response.data is Map && response.data['data'] != null
          ? response.data['data']
          : response.data;

      return ApiResponse.success(
        FileComment.fromJson(commentData),
        message: 'Comment created successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to create comment',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Get a single comment by ID
  Future<ApiResponse<FileComment>> getFileComment(
    String workspaceId,
    String fileId,
    String commentId,
  ) async {
    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/files/$fileId/comments/$commentId',
      );

      final commentData = response.data is Map && response.data['data'] != null
          ? response.data['data']
          : response.data;

      return ApiResponse.success(
        FileComment.fromJson(commentData),
        message: 'Comment retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get comment',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Update a comment
  Future<ApiResponse<FileComment>> updateFileComment(
    String workspaceId,
    String fileId,
    String commentId,
    UpdateFileCommentDto dto,
  ) async {
    try {
      final response = await _apiClient.put(
        '/workspaces/$workspaceId/files/$fileId/comments/$commentId',
        data: dto.toJson(),
      );

      final commentData = response.data is Map && response.data['data'] != null
          ? response.data['data']
          : response.data;

      return ApiResponse.success(
        FileComment.fromJson(commentData),
        message: 'Comment updated successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to update comment',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Delete a comment
  Future<ApiResponse<void>> deleteFileComment(
    String workspaceId,
    String fileId,
    String commentId,
  ) async {
    try {
      final response = await _apiClient.delete(
        '/workspaces/$workspaceId/files/$fileId/comments/$commentId',
      );

      return ApiResponse.success(
        null,
        message: 'Comment deleted successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to delete comment',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Resolve or reopen a comment
  Future<ApiResponse<FileComment>> resolveFileComment(
    String workspaceId,
    String fileId,
    String commentId,
    bool isResolved,
  ) async {
    try {
      final response = await _apiClient.put(
        '/workspaces/$workspaceId/files/$fileId/comments/$commentId/resolve',
        data: {'is_resolved': isResolved},
      );

      final commentData = response.data is Map && response.data['data'] != null
          ? response.data['data']
          : response.data;

      return ApiResponse.success(
        FileComment.fromJson(commentData),
        message: isResolved ? 'Comment resolved' : 'Comment reopened',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to update comment status',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
}