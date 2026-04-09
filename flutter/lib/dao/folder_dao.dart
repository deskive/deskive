import 'package:flutter/foundation.dart';
import '../models/folder/folder_response.dart';
import '../models/folder/folder.dart';
import 'base_dao_impl.dart';

/// Folder DAO for handling folder API operations
class FolderDao extends BaseDaoImpl {
  final String workspaceId;

  FolderDao({
    required this.workspaceId,
  }) : super(
          baseEndpoint: '/workspaces/$workspaceId/files/folders',
        );

  /// Get all folders in the workspace
  /// Optional parentId to get folders within a specific folder
  Future<FolderListResponse> getAllFolders({String? parentId}) async {
    try {
      final queryParams = <String, dynamic>{};
      if (parentId != null) {
        queryParams['parent_id'] = parentId;
      }

      final response = await get<dynamic>(
        '',
        queryParameters: queryParams.isNotEmpty ? queryParams : null,
      );

      return FolderListResponse.fromJson(response);
    } catch (e) {
      return FolderListResponse(
        success: false,
        message: 'Failed to fetch folders: $e',
      );
    }
  }

  /// Get a specific folder by ID
  Future<FolderResponse> getFolder(String folderId) async {
    try {
      final response = await get<Map<String, dynamic>>(folderId);
      return FolderResponse.fromJson(response);
    } catch (e) {
      return FolderResponse(
        success: false,
        message: 'Failed to fetch folder: $e',
      );
    }
  }

  /// Create a new folder
  Future<FolderResponse> createFolder({
    required String name,
    String? parentId,
    String? description,
  }) async {
    try {
      // Build request data - only include parent_id if it's a valid UUID
      final data = <String, dynamic>{
        'name': name,
      };

      // Only add parent_id if it's not null and not empty
      if (parentId != null && parentId.isNotEmpty) {
        data['parent_id'] = parentId;
      }

      // Only add description if provided
      if (description != null && description.isNotEmpty) {
        data['description'] = description;
      }

      final response = await post<dynamic>('', data: data);

      // Ensure response is a Map before parsing
      if (response is! Map<String, dynamic>) {
        if (response is Map) {
          final mapResponse = Map<String, dynamic>.from(response);
          return FolderResponse.fromJson(mapResponse);
        }
        throw Exception('Unexpected response type: ${response.runtimeType}');
      }

      return FolderResponse.fromJson(response as Map<String, dynamic>);
    } catch (e, stackTrace) {
      return FolderResponse(
        success: false,
        message: 'Failed to create folder: $e',
      );
    }
  }

  /// Update folder details
  Future<FolderResponse> updateFolder(
    String folderId, {
    String? name,
    String? parentId,
  }) async {
    try {
      final data = {
        if (name != null) 'name': name,
        if (parentId != null) 'parent_id': parentId,
      };

      final response = await put<dynamic>(
        folderId,
        data: data,
      );

      // The API returns data as an array: {"data": [{folder}], "count": 1}
      if (response is Map<String, dynamic>) {
        final responseData = response['data'];

        // Check if data is an array and has at least one element
        if (responseData is List && responseData.isNotEmpty) {
          final folderData = responseData[0] as Map<String, dynamic>;

          // Import Folder model at the top if not already imported
          final folder = Folder.fromJson(folderData);

          return FolderResponse(
            success: true,
            message: 'Folder updated successfully',
            data: folder,
          );
        }
      }

      return FolderResponse.fromJson(response as Map<String, dynamic>);
    } catch (e) {
      return FolderResponse(
        success: false,
        message: 'Failed to update folder: $e',
      );
    }
  }

  /// Delete a folder
  Future<bool> deleteFolder(String folderId) async {
    try {
      await delete<Map<String, dynamic>>(folderId);
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Move folder to a different parent and optionally rename it
  Future<FolderResponse> moveFolder(
    String folderId, {
    String? targetParentId,
    String? newName,
  }) async {
    try {
      // Build request data
      final data = <String, dynamic>{
        'target_parent_id': targetParentId, // Can be null for root folder
        if (newName != null && newName.isNotEmpty) 'new_name': newName,
      };


      final response = await put<dynamic>(
        '$folderId/move',
        data: data,
      );


      // The API returns data as an array: {"data": [{folder}], "count": 1}
      if (response is Map<String, dynamic>) {
        final responseData = response['data'];

        // Check if data is an array and has at least one element
        if (responseData is List && responseData.isNotEmpty) {
          final folderData = responseData[0] as Map<String, dynamic>;

          final folder = Folder.fromJson(folderData);

          return FolderResponse(
            success: true,
            message: 'Folder moved successfully',
            data: folder,
          );
        }
      }

      return FolderResponse.fromJson(response as Map<String, dynamic>);
    } catch (e) {
      return FolderResponse(
        success: false,
        message: 'Failed to move folder: $e',
      );
    }
  }

  /// Delete a folder recursively (including all subfolders and files)
  Future<Map<String, dynamic>?> deleteFolderRecursive(String folderId) async {
    try {
      final response = await delete<dynamic>('$folderId/recursive');

      if (response is Map<String, dynamic>) {
        return response;
      }

      // If response is not a map, return a simple success indicator
      return {
        'message': 'Folder deleted successfully',
        'deleted_folders_count': 0,
        'deleted_files_count': 0,
      };
    } catch (e) {
      return null;
    }
  }

  /// Restore a folder from trash
  Future<Map<String, dynamic>?> restoreFolder(String folderId) async {
    try {
      final response = await post<dynamic>(
        '$folderId/restore',
        data: {},
      );

      // The restore API returns: {"message": "...", "restored_folders_count": 1, "restored_files_count": 0}
      if (response is Map<String, dynamic>) {
        return response;
      }

      return null;
    } catch (e) {
      return null;
    }
  }

  /// Copy a folder to a target location
  Future<FolderResponse> copyFolder(
    String folderId, {
    String? targetParentId,
    String? newName,
  }) async {
    try {
      // Build request data - always include target_parent_id (can be null for root)
      final data = <String, dynamic>{
        'target_parent_id': targetParentId, // Send null explicitly for root folder
        if (newName != null && newName.isNotEmpty) 'new_name': newName,
      };

      final response = await post<dynamic>(
        '$folderId/copy',
        data: data,
      );

      // The API returns a single folder object
      if (response is Map<String, dynamic>) {
        return FolderResponse(
          success: true,
          message: 'Folder copied successfully',
          data: Folder.fromJson(response),
        );
      }

      return FolderResponse.fromJson(response as Map<String, dynamic>);
    } catch (e) {
      return FolderResponse(
        success: false,
        message: 'Failed to copy folder: $e',
      );
    }
  }
}
