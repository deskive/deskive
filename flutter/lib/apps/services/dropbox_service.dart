import 'package:dio/dio.dart';
import '../../api/base_api_client.dart';
import '../../config/app_config.dart';
import '../models/dropbox_models.dart';

/// Service for Dropbox API operations
class DropboxService {
  static DropboxService? _instance;
  final BaseApiClient _apiClient = BaseApiClient.instance;

  static DropboxService get instance =>
      _instance ??= DropboxService._internal();

  DropboxService._internal();

  // ==========================================================================
  // OAuth & Connection
  // ==========================================================================

  /// Get OAuth authorization URL for connecting Dropbox
  Future<Map<String, String>> getAuthUrl({String? returnUrl}) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final queryParams = <String, dynamic>{};
    if (returnUrl != null) {
      queryParams['returnUrl'] = returnUrl;
    }

    final response = await _apiClient.get(
      '/workspaces/$workspaceId/dropbox/auth/url',
      queryParameters: queryParams,
    );

    final data = _extractData(response.data);
    return {
      'authorizationUrl': data['authorizationUrl'] as String,
      'state': data['state'] as String? ?? '',
    };
  }

  /// Get current Dropbox connection status
  Future<DropboxConnection?> getConnection() async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/dropbox/connection',
      );

      final data = _extractData(response.data);
      if (data == null) return null;

      return DropboxConnection.fromJson(data as Map<String, dynamic>);
    } on DioException catch (e) {
      // 404 means no connection exists, return null
      if (e.response?.statusCode == 404) {
        return null;
      }
      rethrow;
    }
  }

  /// Disconnect Dropbox
  Future<void> disconnect() async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    await _apiClient.delete('/workspaces/$workspaceId/dropbox/disconnect');
  }

  // ==========================================================================
  // Storage & File Browsing
  // ==========================================================================

  /// Get storage quota information
  Future<DropboxStorageQuota> getStorageQuota() async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.get(
      '/workspaces/$workspaceId/dropbox/storage-quota',
    );

    final data = _extractData(response.data);
    return DropboxStorageQuota.fromJson(data as Map<String, dynamic>);
  }

  /// List files in a folder or search
  Future<DropboxListFilesResponse> listFiles({DropboxListFilesParams? params}) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.get(
      '/workspaces/$workspaceId/dropbox/files',
      queryParameters: params?.toQueryParams(),
    );

    final data = _extractData(response.data);
    return DropboxListFilesResponse.fromJson(data as Map<String, dynamic>);
  }

  /// Get file metadata
  Future<DropboxFile> getFile(String path) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.get(
      '/workspaces/$workspaceId/dropbox/files/metadata',
      queryParameters: {'path': path},
    );

    final data = _extractData(response.data);
    return DropboxFile.fromJson(data as Map<String, dynamic>);
  }

  /// Get temporary download link for a file
  Future<String> getTemporaryLink(String path) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.get(
      '/workspaces/$workspaceId/dropbox/files/temporary-link',
      queryParameters: {'path': path},
    );

    final data = _extractData(response.data);
    return (data as Map<String, dynamic>)['link'] as String? ?? '';
  }

  /// Get download URL for a file
  String getDownloadUrl(String workspaceId, String path) {
    final baseUrl = BaseApiClient.baseUrl;
    final encodedPath = Uri.encodeQueryComponent(path);
    return '$baseUrl/workspaces/$workspaceId/dropbox/files/download?path=$encodedPath';
  }

  // ==========================================================================
  // File Operations
  // ==========================================================================

  /// Create a folder in Dropbox
  Future<DropboxFile> createFolder(String path, {bool autoRename = false}) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.post(
      '/workspaces/$workspaceId/dropbox/folders',
      data: {
        'path': path,
        'autoRename': autoRename,
      },
    );

    final data = _extractData(response.data);
    return DropboxFile.fromJson(data as Map<String, dynamic>);
  }

  /// Delete a file or folder
  Future<void> deleteFile(String path) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    await _apiClient.delete(
      '/workspaces/$workspaceId/dropbox/files',
      queryParameters: {'path': path},
    );
  }

  /// Move a file or folder
  Future<DropboxFile> moveFile({
    required String fromPath,
    required String toPath,
    bool autoRename = false,
  }) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.post(
      '/workspaces/$workspaceId/dropbox/files/move',
      data: {
        'fromPath': fromPath,
        'toPath': toPath,
        'autoRename': autoRename,
      },
    );

    final data = _extractData(response.data);
    return DropboxFile.fromJson(data as Map<String, dynamic>);
  }

  /// Copy a file or folder
  Future<DropboxFile> copyFile({
    required String fromPath,
    required String toPath,
    bool autoRename = false,
  }) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.post(
      '/workspaces/$workspaceId/dropbox/files/copy',
      data: {
        'fromPath': fromPath,
        'toPath': toPath,
        'autoRename': autoRename,
      },
    );

    final data = _extractData(response.data);
    return DropboxFile.fromJson(data as Map<String, dynamic>);
  }

  /// Create a shared link for a file
  Future<DropboxShareLinkResponse> shareFile({
    required String path,
    String? requestedVisibility,
    String? expires,
    String? linkPassword,
  }) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.post(
      '/workspaces/$workspaceId/dropbox/files/share',
      data: {
        'path': path,
        if (requestedVisibility != null) 'requestedVisibility': requestedVisibility,
        if (expires != null) 'expires': expires,
        if (linkPassword != null) 'linkPassword': linkPassword,
      },
    );

    final data = _extractData(response.data);
    return DropboxShareLinkResponse.fromJson(data as Map<String, dynamic>);
  }

  /// Import a file from Dropbox to Deskive
  Future<DropboxImportFileResponse> importFile({
    required String path,
    String? targetFolderId,
  }) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.post(
      '/workspaces/$workspaceId/dropbox/import',
      data: {
        'path': path,
        if (targetFolderId != null) 'targetFolderId': targetFolderId,
      },
    );

    final data = _extractData(response.data);
    return DropboxImportFileResponse.fromJson(data as Map<String, dynamic>);
  }

  /// Export a Deskive file to Dropbox
  Future<DropboxExportFileResponse> exportFile({
    required String fileId,
    String? targetPath,
  }) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.post(
      '/workspaces/$workspaceId/dropbox/export',
      data: {
        'fileId': fileId,
        if (targetPath != null) 'targetPath': targetPath,
      },
    );

    final data = _extractData(response.data);
    return DropboxExportFileResponse.fromJson(data as Map<String, dynamic>);
  }

  /// List only folders in Dropbox (for folder picker)
  Future<DropboxListFilesResponse> listFolders({String? path}) async {
    // Dropbox doesn't have a fileType filter like Google Drive,
    // so we filter on the client side
    final response = await listFiles(
      params: DropboxListFilesParams(
        path: path,
      ),
    );

    return DropboxListFilesResponse(
      files: response.files.where((f) => f.isFolder).toList(),
      cursor: response.cursor,
      hasMore: response.hasMore,
    );
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  /// Extract data from API response (handles both wrapped and unwrapped responses)
  dynamic _extractData(dynamic responseData) {
    if (responseData is Map<String, dynamic>) {
      // Check if response is wrapped in 'data' key
      if (responseData.containsKey('data')) {
        return responseData['data'];
      }
      return responseData;
    }
    return responseData;
  }
}
