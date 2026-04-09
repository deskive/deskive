import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../models/file/file_response.dart';
import '../models/file/file.dart' as file_model;
import '../models/file/dashboard_stats.dart';
import '../models/trash_item.dart';
import 'base_dao_impl.dart';

/// File DAO for handling file API operations
class FileDao extends BaseDaoImpl {
  final String workspaceId;

  FileDao({
    required this.workspaceId,
  }) : super(
          baseEndpoint: '/workspaces/$workspaceId/files',
        );

  /// Get all files in the workspace
  /// Optional parameters:
  /// - folderId: Get files within a specific folder
  /// - page: Page number for pagination
  /// - limit: Number of items per page
  Future<FileListResponse> getAllFiles({
    String? folderId,
    int page = 1,
    int limit = 100,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'limit': limit.toString(),
        'page': page.toString(),
      };

      if (folderId != null) {
        queryParams['folder_id'] = folderId;
      }

      final response = await get<dynamic>(
        '',
        queryParameters: queryParams,
      );

      return FileListResponse.fromJson(response);
    } catch (e) {
      return FileListResponse(
        success: false,
        message: 'Failed to fetch files: $e',
      );
    }
  }

  /// Get a specific file by ID
  Future<FileResponse> getFile(String fileId) async {
    try {
      final response = await get<Map<String, dynamic>>(fileId);
      return FileResponse.fromJson(response);
    } catch (e) {
      return FileResponse(
        success: false,
        message: 'Failed to fetch file: $e',
      );
    }
  }

  /// Upload a file (this would typically use FormData)
  Future<FileResponse> uploadFile({
    required String filePath,
    required String fileName,
    String? folderId,
    String? description,
    List<String>? tags,
    bool isPublic = false,
  }) async {
    try {
      // Create multipart file
      final multipartFile = await MultipartFile.fromFile(
        filePath,
        filename: fileName,
      );

      // Build form data
      final formDataMap = <String, dynamic>{
        'file': multipartFile,
        'workspace_id': workspaceId,
        // Only include parent_folder_id if it's not null (backend rejects empty string)
        if (folderId != null && folderId.isNotEmpty) 'parent_folder_id': folderId,
        if (description != null && description.isNotEmpty) 'description': description,
        if (tags != null && tags.isNotEmpty) 'tags': tags.join(','),
        'is_public': isPublic.toString(),
      };

      // Use FormData for multipart upload
      final formData = FormData.fromMap(formDataMap);

      // Upload file
      final response = await post<dynamic>(
        'upload',
        data: formData,
      );

      return FileResponse.fromJson(response as Map<String, dynamic>);
    } catch (e) {
      return FileResponse(
        success: false,
        message: 'Failed to upload file: $e',
      );
    }
  }

  /// Update file details
  Future<FileResponse> updateFile(
    String fileId, {
    String? name,
    String? folderId,
    String? description,
    String? tags,
    bool? markAsOpened,
    bool? starred,
  }) async {
    try {
      final data = <String, dynamic>{
        if (name != null) 'name': name,
        if (folderId != null) 'folder_id': folderId,
        if (description != null) 'description': description,
        if (tags != null) 'tags': tags,
        if (markAsOpened != null) 'mark_as_opened': markAsOpened,
        if (starred != null) 'starred': starred,
      };

      final response = await put<dynamic>(
        fileId,
        data: data,
      );

      // The API returns data as an array, extract the first element
      if (response is Map<String, dynamic>) {
        final responseData = response['data'];

        // Check if data is an array and has at least one element
        if (responseData is List && responseData.isNotEmpty) {
          final fileData = responseData[0] as Map<String, dynamic>;
          return FileResponse(
            success: true,
            message: 'File updated successfully',
            data: file_model.File.fromJson(fileData),
          );
        }
      }

      return FileResponse.fromJson(response as Map<String, dynamic>);
    } catch (e) {
      return FileResponse(
        success: false,
        message: 'Failed to update file: $e',
      );
    }
  }

  /// Delete a file
  Future<bool> deleteFile(String fileId) async {
    try {
      await delete<Map<String, dynamic>>(fileId);
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Copy a file to a target folder
  Future<FileResponse> copyFile(
    String fileId, {
    String? targetFolderId,
    String? newName,
  }) async {
    try {
      // Build request data - always include target_folder_id (can be null for root)
      final data = <String, dynamic>{
        'target_folder_id': targetFolderId, // Send null explicitly for root folder
        if (newName != null && newName.isNotEmpty) 'new_name': newName,
      };

      final response = await post<dynamic>(
        '$fileId/copy',
        data: data,
      );

      if (response is Map<String, dynamic>) {
        return FileResponse(
          success: true,
          message: 'File copied successfully',
          data: file_model.File.fromJson(response),
        );
      }

      return FileResponse.fromJson(response as Map<String, dynamic>);
    } catch (e) {
      return FileResponse(
        success: false,
        message: 'Failed to copy file: $e',
      );
    }
  }

  /// Move file to a different folder
  Future<FileResponse> moveFile(
    String fileId, {
    String? targetFolderId,
    String? newName,
  }) async {
    try {
      // Build request data - always include target_folder_id (can be null for root)
      final data = <String, dynamic>{
        'target_folder_id': targetFolderId, // Send null explicitly for root folder
        if (newName != null && newName.isNotEmpty) 'new_name': newName,
      };

      final response = await put<dynamic>(
        '$fileId/move',
        data: data,
      );

      // The API returns {"data": [file_object]} with an array
      if (response is Map<String, dynamic>) {
        final responseData = response['data'];

        // Check if data is an array and has at least one element
        if (responseData is List && responseData.isNotEmpty) {
          final fileData = responseData[0] as Map<String, dynamic>;
          return FileResponse(
            success: true,
            message: 'File moved successfully',
            data: file_model.File.fromJson(fileData),
          );
        }
      }

      return FileResponse.fromJson(response as Map<String, dynamic>);
    } catch (e) {
      return FileResponse(
        success: false,
        message: 'Failed to move file: $e',
      );
    }
  }

  /// Search files
  Future<FileListResponse> searchFiles({
    required String query,
    String? mimeType,
    int page = 1,
    int limit = 100,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'q': query,
        'limit': limit.toString(),
        'page': page.toString(),
      };

      if (mimeType != null) {
        queryParams['mime_type'] = mimeType;
      }

      final response = await get<dynamic>(
        'search',
        queryParameters: queryParams,
      );

      return FileListResponse.fromJson(response);
    } catch (e) {
      return FileListResponse(
        success: false,
        message: 'Failed to search files: $e',
      );
    }
  }

  /// Get recent files
  Future<FileListResponse> getRecentFiles({
    int limit = 50,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'limit': limit.toString(),
      };

      final response = await get<dynamic>(
        'recent',
        queryParameters: queryParams,
      );

      return FileListResponse.fromJson(response);
    } catch (e) {
      return FileListResponse(
        success: false,
        message: 'Failed to fetch recent files: $e',
      );
    }
  }

  /// Get starred files
  Future<FileListResponse> getStarredFiles() async {
    try {
      final response = await get<dynamic>('starred');

      return FileListResponse.fromJson(response);
    } catch (e) {
      return FileListResponse(
        success: false,
        message: 'Failed to fetch starred files: $e',
      );
    }
  }

  /// Get files shared with the current user
  Future<FileListResponse> getSharedWithMeFiles({
    int page = 1,
    int limit = 100,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'limit': limit.toString(),
        'page': page.toString(),
      };

      final response = await get<dynamic>(
        'shared-with-me',
        queryParameters: queryParams,
      );

      // The shared-with-me endpoint returns a direct array, not wrapped in {success, data}
      if (response is List) {
        final files = response
            .where((item) => item is Map<String, dynamic>)
            .map((item) => file_model.File.fromJson(item as Map<String, dynamic>))
            .toList();


        return FileListResponse(
          success: true,
          message: 'Shared files fetched successfully',
          data: files,
        );
      }

      // Fallback to standard response format
      return FileListResponse.fromJson(response);
    } catch (e) {
      return FileListResponse(
        success: false,
        message: 'Failed to fetch shared files: $e',
      );
    }
  }

  /// Get trashed files (returns only files, not folders)
  Future<FileListResponse> getTrashedFiles() async {
    try {
      final response = await get<dynamic>('trash');

      // The trash API returns {"items": [...]} with mixed files and folders
      // Each item has a "type" field: "folder" or no type field (for files)
      if (response is Map<String, dynamic> && response['items'] != null) {
        final items = response['items'] as List<dynamic>;

        // Filter out only files (items without type or type != 'folder')
        final files = items
            .where((item) => item is Map<String, dynamic> &&
                   (item['type'] == null || item['type'] != 'folder'))
            .map((item) => file_model.File.fromJson(item as Map<String, dynamic>))
            .toList();


        return FileListResponse(
          success: true,
          message: 'Trashed files fetched successfully',
          data: files,
        );
      }

      return FileListResponse.fromJson(response);
    } catch (e) {
      return FileListResponse(
        success: false,
        message: 'Failed to fetch trashed files: $e',
      );
    }
  }

  /// Get all trashed items (both files and folders)
  Future<List<TrashItem>> getTrashedItems() async {
    try {
      final response = await get<dynamic>('trash');

      // The trash API returns {"items": [...]} with mixed files and folders
      if (response is Map<String, dynamic> && response['items'] != null) {
        final items = response['items'] as List<dynamic>;

        final trashItems = items
            .where((item) => item is Map<String, dynamic>)
            .map((item) => TrashItem.fromJson(item as Map<String, dynamic>))
            .toList();


        return trashItems;
      }

      return [];
    } catch (e) {
      return [];
    }
  }

  /// Get dashboard statistics
  Future<DashboardStats?> getDashboardStats() async {
    try {
      final response = await get<Map<String, dynamic>>('dashboard-stats');
      return DashboardStats.fromJson(response);
    } catch (e) {
      return null;
    }
  }

  /// Get files by type category
  /// Categories: documents, images, videos, audio, spreadsheets, pdfs
  Future<FileListResponse> getFilesByType({
    required String category,
    int page = 1,
    int limit = 100,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'category': category,
        'page': page.toString(),
        'limit': limit.toString(),
      };

      final response = await get<dynamic>(
        'by-type',
        queryParameters: queryParams,
      );

      return FileListResponse.fromJson(response);
    } catch (e) {
      return FileListResponse(
        success: false,
        message: 'Failed to fetch files by type: $e',
      );
    }
  }

  /// Restore a file from trash
  Future<FileResponse> restoreFile(String fileId) async {
    try {
      final response = await post<dynamic>(
        '$fileId/restore',
        data: {},
      );

      // The restore API returns: {"message": "...", "file": {...}}
      // The file object is minimal (only id, name, folder_id), so we don't parse it
      if (response is Map<String, dynamic>) {
        final message = response['message'] as String? ?? 'File restored successfully';
        final fileData = response['file'];

        // Just check that file data exists - we don't need to parse the full object
        if (fileData is Map<String, dynamic> && fileData['id'] != null) {
          return FileResponse(
            success: true,
            message: message,
            data: null, // We don't have full file data, just return null
          );
        }
      }

      return FileResponse(
        success: false,
        message: 'Unexpected response format',
      );
    } catch (e) {
      return FileResponse(
        success: false,
        message: 'Failed to restore file: $e',
      );
    }
  }

  /// Download a file - returns the file bytes
  Future<List<int>?> downloadFile({
    required String fileId,
    void Function(int received, int total)? onProgress,
  }) async {
    try {

      final response = await getWithOptions<List<int>>(
        '$fileId/download',
        options: Options(
          responseType: ResponseType.bytes,
          followRedirects: true,
        ),
        onReceiveProgress: onProgress,
      );

      if (response.data != null) {
        final bytes = response.data!;
        return bytes;
      }

      return null;
    } catch (e) {
      return null;
    }
  }
}
