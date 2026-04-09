/// Sync status for offline files
enum SyncStatus {
  pending,
  syncing,
  synced,
  error,
  outdated;

  static SyncStatus fromString(String value) {
    switch (value.toLowerCase()) {
      case 'pending':
        return SyncStatus.pending;
      case 'syncing':
        return SyncStatus.syncing;
      case 'synced':
        return SyncStatus.synced;
      case 'error':
        return SyncStatus.error;
      case 'outdated':
        return SyncStatus.outdated;
      default:
        return SyncStatus.pending;
    }
  }

  String get value {
    switch (this) {
      case SyncStatus.pending:
        return 'pending';
      case SyncStatus.syncing:
        return 'syncing';
      case SyncStatus.synced:
        return 'synced';
      case SyncStatus.error:
        return 'error';
      case SyncStatus.outdated:
        return 'outdated';
    }
  }
}

/// Metadata for an offline file stored locally
class OfflineFileMetadata {
  final String fileId;
  final String workspaceId;
  final String fileName;
  final String mimeType;
  final int size;
  final int serverVersion;
  final int localVersion;
  final SyncStatus syncStatus;
  final bool autoSync;
  final DateTime? lastSyncedAt;
  final DateTime cachedAt;
  final String? fileUrl;
  final String? localPath;

  OfflineFileMetadata({
    required this.fileId,
    required this.workspaceId,
    required this.fileName,
    required this.mimeType,
    required this.size,
    required this.serverVersion,
    required this.localVersion,
    required this.syncStatus,
    required this.autoSync,
    this.lastSyncedAt,
    required this.cachedAt,
    this.fileUrl,
    this.localPath,
  });

  factory OfflineFileMetadata.fromMap(Map<String, dynamic> map) {
    return OfflineFileMetadata(
      fileId: map['file_id'] as String,
      workspaceId: map['workspace_id'] as String,
      fileName: map['file_name'] as String,
      mimeType: map['mime_type'] as String,
      size: map['size'] as int,
      serverVersion: map['server_version'] as int,
      localVersion: map['local_version'] as int,
      syncStatus: SyncStatus.fromString(map['sync_status'] as String),
      autoSync: (map['auto_sync'] as int) == 1,
      lastSyncedAt: map['last_synced_at'] != null
          ? DateTime.parse(map['last_synced_at'] as String)
          : null,
      cachedAt: DateTime.parse(map['cached_at'] as String),
      fileUrl: map['file_url'] as String?,
      localPath: map['local_path'] as String?,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'file_id': fileId,
      'workspace_id': workspaceId,
      'file_name': fileName,
      'mime_type': mimeType,
      'size': size,
      'server_version': serverVersion,
      'local_version': localVersion,
      'sync_status': syncStatus.value,
      'auto_sync': autoSync ? 1 : 0,
      'last_synced_at': lastSyncedAt?.toIso8601String(),
      'cached_at': cachedAt.toIso8601String(),
      'file_url': fileUrl,
      'local_path': localPath,
    };
  }

  OfflineFileMetadata copyWith({
    String? fileId,
    String? workspaceId,
    String? fileName,
    String? mimeType,
    int? size,
    int? serverVersion,
    int? localVersion,
    SyncStatus? syncStatus,
    bool? autoSync,
    DateTime? lastSyncedAt,
    DateTime? cachedAt,
    String? fileUrl,
    String? localPath,
  }) {
    return OfflineFileMetadata(
      fileId: fileId ?? this.fileId,
      workspaceId: workspaceId ?? this.workspaceId,
      fileName: fileName ?? this.fileName,
      mimeType: mimeType ?? this.mimeType,
      size: size ?? this.size,
      serverVersion: serverVersion ?? this.serverVersion,
      localVersion: localVersion ?? this.localVersion,
      syncStatus: syncStatus ?? this.syncStatus,
      autoSync: autoSync ?? this.autoSync,
      lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
      cachedAt: cachedAt ?? this.cachedAt,
      fileUrl: fileUrl ?? this.fileUrl,
      localPath: localPath ?? this.localPath,
    );
  }

  /// Check if file needs syncing
  bool get needsSync =>
      syncStatus == SyncStatus.outdated || serverVersion > localVersion;

  @override
  String toString() {
    return 'OfflineFileMetadata(fileId: $fileId, fileName: $fileName, syncStatus: $syncStatus)';
  }
}

/// Item in the sync queue
class SyncQueueItem {
  final String id;
  final String fileId;
  final String workspaceId;
  final SyncOperation operation;
  final SyncQueueStatus status;
  final int retryCount;
  final DateTime createdAt;
  final String? errorMessage;

  SyncQueueItem({
    required this.id,
    required this.fileId,
    required this.workspaceId,
    required this.operation,
    required this.status,
    required this.retryCount,
    required this.createdAt,
    this.errorMessage,
  });

  factory SyncQueueItem.fromMap(Map<String, dynamic> map) {
    return SyncQueueItem(
      id: map['id'] as String,
      fileId: map['file_id'] as String,
      workspaceId: map['workspace_id'] as String,
      operation: SyncOperation.fromString(map['operation'] as String),
      status: SyncQueueStatus.fromString(map['status'] as String),
      retryCount: map['retry_count'] as int,
      createdAt: DateTime.parse(map['created_at'] as String),
      errorMessage: map['error_message'] as String?,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'file_id': fileId,
      'workspace_id': workspaceId,
      'operation': operation.value,
      'status': status.value,
      'retry_count': retryCount,
      'created_at': createdAt.toIso8601String(),
      'error_message': errorMessage,
    };
  }

  SyncQueueItem copyWith({
    String? id,
    String? fileId,
    String? workspaceId,
    SyncOperation? operation,
    SyncQueueStatus? status,
    int? retryCount,
    DateTime? createdAt,
    String? errorMessage,
  }) {
    return SyncQueueItem(
      id: id ?? this.id,
      fileId: fileId ?? this.fileId,
      workspaceId: workspaceId ?? this.workspaceId,
      operation: operation ?? this.operation,
      status: status ?? this.status,
      retryCount: retryCount ?? this.retryCount,
      createdAt: createdAt ?? this.createdAt,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

enum SyncOperation {
  download,
  sync,
  remove;

  static SyncOperation fromString(String value) {
    switch (value.toLowerCase()) {
      case 'download':
        return SyncOperation.download;
      case 'sync':
        return SyncOperation.sync;
      case 'remove':
        return SyncOperation.remove;
      default:
        return SyncOperation.download;
    }
  }

  String get value {
    switch (this) {
      case SyncOperation.download:
        return 'download';
      case SyncOperation.sync:
        return 'sync';
      case SyncOperation.remove:
        return 'remove';
    }
  }
}

enum SyncQueueStatus {
  pending,
  inProgress,
  failed;

  static SyncQueueStatus fromString(String value) {
    switch (value.toLowerCase()) {
      case 'pending':
        return SyncQueueStatus.pending;
      case 'in_progress':
        return SyncQueueStatus.inProgress;
      case 'failed':
        return SyncQueueStatus.failed;
      default:
        return SyncQueueStatus.pending;
    }
  }

  String get value {
    switch (this) {
      case SyncQueueStatus.pending:
        return 'pending';
      case SyncQueueStatus.inProgress:
        return 'in_progress';
      case SyncQueueStatus.failed:
        return 'failed';
    }
  }
}

/// Response from the backend for offline file
class OfflineFileResponse {
  final String id;
  final String fileId;
  final String userId;
  final String workspaceId;
  final SyncStatus syncStatus;
  final DateTime? lastSyncedAt;
  final int syncedVersion;
  final bool autoSync;
  final int priority;
  final int fileSize;
  final String? errorMessage;
  final DateTime createdAt;
  final DateTime updatedAt;

  // Joined file data (optional)
  final String? fileName;
  final String? mimeType;
  final String? fileUrl;
  final int? serverVersion;
  final bool? needsSync;

  OfflineFileResponse({
    required this.id,
    required this.fileId,
    required this.userId,
    required this.workspaceId,
    required this.syncStatus,
    this.lastSyncedAt,
    required this.syncedVersion,
    required this.autoSync,
    required this.priority,
    required this.fileSize,
    this.errorMessage,
    required this.createdAt,
    required this.updatedAt,
    this.fileName,
    this.mimeType,
    this.fileUrl,
    this.serverVersion,
    this.needsSync,
  });

  factory OfflineFileResponse.fromJson(Map<String, dynamic> json) {
    return OfflineFileResponse(
      id: json['id'] as String,
      fileId: json['fileId'] as String,
      userId: json['userId'] as String,
      workspaceId: json['workspaceId'] as String,
      syncStatus: SyncStatus.fromString(json['syncStatus'] as String),
      lastSyncedAt: json['lastSyncedAt'] != null
          ? DateTime.parse(json['lastSyncedAt'] as String)
          : null,
      syncedVersion: json['syncedVersion'] as int,
      autoSync: json['autoSync'] as bool,
      priority: json['priority'] as int,
      fileSize: json['fileSize'] as int,
      errorMessage: json['errorMessage'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      fileName: json['fileName'] as String?,
      mimeType: json['mimeType'] as String?,
      fileUrl: json['fileUrl'] as String?,
      serverVersion: json['serverVersion'] as int?,
      needsSync: json['needsSync'] as bool?,
    );
  }
}

/// Storage statistics for offline files
class OfflineStorageStats {
  final int totalFiles;
  final int totalSize;
  final int pendingCount;
  final int syncedCount;
  final int errorCount;
  final int outdatedCount;

  OfflineStorageStats({
    required this.totalFiles,
    required this.totalSize,
    required this.pendingCount,
    required this.syncedCount,
    required this.errorCount,
    required this.outdatedCount,
  });

  factory OfflineStorageStats.fromJson(Map<String, dynamic> json) {
    return OfflineStorageStats(
      totalFiles: json['totalFiles'] as int,
      totalSize: json['totalSize'] as int,
      pendingCount: json['pendingCount'] as int,
      syncedCount: json['syncedCount'] as int,
      errorCount: json['errorCount'] as int,
      outdatedCount: json['outdatedCount'] as int,
    );
  }

  factory OfflineStorageStats.empty() {
    return OfflineStorageStats(
      totalFiles: 0,
      totalSize: 0,
      pendingCount: 0,
      syncedCount: 0,
      errorCount: 0,
      outdatedCount: 0,
    );
  }
}
