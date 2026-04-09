import '../models/offline/offline_file_metadata.dart';
import 'base_dao_impl.dart';

/// DAO for offline file API operations
class OfflineFileDao extends BaseDaoImpl {
  final String workspaceId;

  OfflineFileDao({
    required this.workspaceId,
  }) : super(
          baseEndpoint: '/workspaces/$workspaceId/files',
        );

  /// Mark a file for offline access
  /// POST /workspaces/{workspaceId}/files/{fileId}/offline
  Future<OfflineFileResponse?> markFileOffline(
    String fileId, {
    bool autoSync = true,
    int priority = 0,
  }) async {
    try {
      final response = await post<Map<String, dynamic>>(
        '$fileId/offline',
        data: {
          'autoSync': autoSync,
          'priority': priority,
        },
      );

      final data = response['data'] ?? response;
      return OfflineFileResponse.fromJson(data);
    } catch (e) {
      return null;
    }
  }

  /// Remove a file from offline access
  /// DELETE /workspaces/{workspaceId}/files/{fileId}/offline
  Future<bool> removeFileOffline(String fileId) async {
    try {
      await delete<dynamic>('$fileId/offline');
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Get all offline files for the workspace
  /// GET /workspaces/{workspaceId}/files/offline
  Future<List<OfflineFileResponse>> getOfflineFiles() async {
    try {
      final response = await get<Map<String, dynamic>>('offline');

      final data = response['data'] ?? response;
      if (data is List) {
        return data
            .map((item) => OfflineFileResponse.fromJson(item))
            .toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  /// Update offline file settings
  /// PUT /workspaces/{workspaceId}/files/{fileId}/offline
  Future<OfflineFileResponse?> updateOfflineSettings(
    String fileId, {
    bool? autoSync,
    int? priority,
    SyncStatus? syncStatus,
    int? syncedVersion,
    String? errorMessage,
  }) async {
    try {
      final data = <String, dynamic>{};
      if (autoSync != null) data['autoSync'] = autoSync;
      if (priority != null) data['priority'] = priority;
      if (syncStatus != null) data['syncStatus'] = syncStatus.value;
      if (syncedVersion != null) data['syncedVersion'] = syncedVersion;
      if (errorMessage != null) data['errorMessage'] = errorMessage;

      final response = await put<Map<String, dynamic>>(
        '$fileId/offline',
        data: data,
      );

      final responseData = response['data'] ?? response;
      return OfflineFileResponse.fromJson(responseData);
    } catch (e) {
      return null;
    }
  }

  /// Batch update sync status for multiple files
  /// POST /workspaces/{workspaceId}/files/offline/sync-status
  Future<bool> batchUpdateSyncStatus(
    List<Map<String, dynamic>> updates,
  ) async {
    try {
      await post<dynamic>(
        'offline/sync-status',
        data: {'updates': updates},
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Check if a file has an update available
  /// GET /workspaces/{workspaceId}/files/{fileId}/offline/check-update
  Future<CheckUpdateResponse?> checkFileUpdate(String fileId) async {
    try {
      final response = await get<Map<String, dynamic>>(
        '$fileId/offline/check-update',
      );

      final data = response['data'] ?? response;
      return CheckUpdateResponse.fromJson(data);
    } catch (e) {
      return null;
    }
  }

  /// Get files that need syncing
  /// GET /workspaces/{workspaceId}/files/offline/needs-sync
  Future<List<OfflineFileResponse>> getFilesNeedingSync() async {
    try {
      final response = await get<Map<String, dynamic>>('offline/needs-sync');

      final data = response['data'] ?? response;
      if (data is List) {
        return data
            .map((item) => OfflineFileResponse.fromJson(item))
            .toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  /// Get offline storage stats
  /// GET /workspaces/{workspaceId}/files/offline/stats
  Future<OfflineStorageStats?> getOfflineStats() async {
    try {
      final response = await get<Map<String, dynamic>>('offline/stats');

      final data = response['data'] ?? response;
      return OfflineStorageStats.fromJson(data);
    } catch (e) {
      return null;
    }
  }
}

/// Response from check-update endpoint
class CheckUpdateResponse {
  final String fileId;
  final int serverVersion;
  final int syncedVersion;
  final bool hasUpdate;
  final int fileSize;
  final DateTime updatedAt;

  CheckUpdateResponse({
    required this.fileId,
    required this.serverVersion,
    required this.syncedVersion,
    required this.hasUpdate,
    required this.fileSize,
    required this.updatedAt,
  });

  factory CheckUpdateResponse.fromJson(Map<String, dynamic> json) {
    return CheckUpdateResponse(
      fileId: json['fileId'] as String,
      serverVersion: json['serverVersion'] as int,
      syncedVersion: json['syncedVersion'] as int,
      hasUpdate: json['hasUpdate'] as bool,
      fileSize: json['fileSize'] as int,
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }
}
