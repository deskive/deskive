import 'package:dio/dio.dart';
import '../../api/base_api_client.dart';
import '../../config/app_config.dart';
import '../models/google_drive_models.dart';

/// Service for Google Drive API operations
class GoogleDriveService {
  static GoogleDriveService? _instance;
  final BaseApiClient _apiClient = BaseApiClient.instance;

  static GoogleDriveService get instance =>
      _instance ??= GoogleDriveService._internal();

  GoogleDriveService._internal();

  // ==========================================================================
  // OAuth & Connection
  // ==========================================================================

  /// Get OAuth authorization URL for connecting Google Drive
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
      '/workspaces/$workspaceId/google-drive/auth/url',
      queryParameters: queryParams,
    );

    final data = _extractData(response.data);
    return {
      'authorizationUrl': data['authorizationUrl'] as String,
      'state': data['state'] as String? ?? '',
    };
  }

  /// Get current Google Drive connection status
  Future<GoogleDriveConnection?> getConnection() async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/google-drive/connection',
      );

      final data = _extractData(response.data);
      if (data == null) return null;

      return GoogleDriveConnection.fromJson(data as Map<String, dynamic>);
    } on DioException catch (e) {
      // 404 means no connection exists, return null
      if (e.response?.statusCode == 404) {
        return null;
      }
      rethrow;
    }
  }

  /// Disconnect Google Drive
  Future<void> disconnect() async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    await _apiClient.delete('/workspaces/$workspaceId/google-drive/disconnect');
  }

  // ==========================================================================
  // Drive & File Browsing
  // ==========================================================================

  /// List available drives (My Drive + Shared Drives)
  Future<List<GoogleDriveDrive>> listDrives() async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.get(
      '/workspaces/$workspaceId/google-drive/drives',
    );

    final data = _extractData(response.data);
    if (data is List) {
      return data
          .map((e) => GoogleDriveDrive.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// List files in a folder
  Future<ListFilesResponse> listFiles({ListFilesParams? params}) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.get(
      '/workspaces/$workspaceId/google-drive/files',
      queryParameters: params?.toQueryParams(),
    );

    final data = _extractData(response.data);
    return ListFilesResponse.fromJson(data as Map<String, dynamic>);
  }

  /// Get file metadata
  Future<GoogleDriveFile> getFile(String fileId) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.get(
      '/workspaces/$workspaceId/google-drive/files/$fileId',
    );

    final data = _extractData(response.data);
    return GoogleDriveFile.fromJson(data as Map<String, dynamic>);
  }

  /// Get download URL for a file
  String getDownloadUrl(String workspaceId, String fileId, {String? convertTo}) {
    final baseUrl = BaseApiClient.baseUrl;
    final path = '/workspaces/$workspaceId/google-drive/files/$fileId/download';
    return convertTo != null ? '$baseUrl$path?convertTo=$convertTo' : '$baseUrl$path';
  }

  // ==========================================================================
  // File Operations
  // ==========================================================================

  /// Create a folder in Google Drive
  Future<GoogleDriveFile> createFolder(
    String name, {
    String? parentId,
    String? driveId,
  }) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.post(
      '/workspaces/$workspaceId/google-drive/folders',
      data: {
        'name': name,
        if (parentId != null) 'parentId': parentId,
        if (driveId != null) 'driveId': driveId,
      },
    );

    final data = _extractData(response.data);
    return GoogleDriveFile.fromJson(data as Map<String, dynamic>);
  }

  /// Delete a file (move to trash)
  Future<void> deleteFile(String fileId, {bool permanent = false}) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    await _apiClient.delete(
      '/workspaces/$workspaceId/google-drive/files/$fileId',
      queryParameters: permanent ? {'permanent': 'true'} : null,
    );
  }

  /// Import a file from Google Drive to Deskive
  Future<ImportFileResponse> importFile({
    required String fileId,
    String? targetFolderId,
    String? convertTo,
  }) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.post(
      '/workspaces/$workspaceId/google-drive/import',
      data: {
        'fileId': fileId,
        if (targetFolderId != null) 'targetFolderId': targetFolderId,
        if (convertTo != null) 'convertTo': convertTo,
      },
    );

    final data = _extractData(response.data);
    return ImportFileResponse.fromJson(data as Map<String, dynamic>);
  }

  /// Export a Deskive file to Google Drive
  Future<ExportFileResponse> exportFile({
    required String fileId,
    String? targetFolderId,
  }) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.post(
      '/workspaces/$workspaceId/google-drive/export',
      data: {
        'fileId': fileId,
        if (targetFolderId != null) 'targetFolderId': targetFolderId,
      },
    );

    final data = _extractData(response.data);
    return ExportFileResponse.fromJson(data as Map<String, dynamic>);
  }

  /// Export a note to Google Drive
  Future<ExportFileResponse> exportNote({
    required String noteId,
    String? targetFolderId,
    String? format, // 'pdf', 'docx', 'txt'
  }) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.post(
      '/workspaces/$workspaceId/google-drive/export-note',
      data: {
        'noteId': noteId,
        if (targetFolderId != null) 'targetFolderId': targetFolderId,
        if (format != null) 'format': format,
      },
    );

    final data = _extractData(response.data);
    return ExportFileResponse.fromJson(data as Map<String, dynamic>);
  }

  /// Export a project to Google Drive
  Future<ExportFileResponse> exportProject({
    required String projectId,
    String? targetFolderId,
    String? format, // 'pdf', 'xlsx', 'csv'
  }) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.post(
      '/workspaces/$workspaceId/google-drive/export-project',
      data: {
        'projectId': projectId,
        if (targetFolderId != null) 'targetFolderId': targetFolderId,
        if (format != null) 'format': format,
      },
    );

    final data = _extractData(response.data);
    return ExportFileResponse.fromJson(data as Map<String, dynamic>);
  }

  /// Export a task to Google Drive
  Future<ExportFileResponse> exportTask({
    required String taskId,
    String? targetFolderId,
    String? format, // 'pdf', 'txt'
  }) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.post(
      '/workspaces/$workspaceId/google-drive/export-task',
      data: {
        'taskId': taskId,
        if (targetFolderId != null) 'targetFolderId': targetFolderId,
        if (format != null) 'format': format,
      },
    );

    final data = _extractData(response.data);
    return ExportFileResponse.fromJson(data as Map<String, dynamic>);
  }

  /// List only folders in Google Drive (for folder picker)
  Future<ListFilesResponse> listFolders({String? parentId, String? driveId}) async {
    return listFiles(
      params: ListFilesParams(
        folderId: parentId,
        driveId: driveId,
        fileType: 'folder',
      ),
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
