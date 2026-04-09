import 'dart:io';
import 'dart:typed_data';
import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart';
import '../models/offline/offline_file_metadata.dart';

/// SQLite-based offline storage service for files
/// Handles local caching of files for offline access
class OfflineStorageService {
  static OfflineStorageService? _instance;
  static OfflineStorageService get instance =>
      _instance ??= OfflineStorageService._internal();

  OfflineStorageService._internal();

  static const String _dbName = 'deskive_offline_files.db';
  static const int _dbVersion = 1;

  // Table names
  static const String _filesMetadataTable = 'offline_files_metadata';
  static const String _syncQueueTable = 'sync_queue';

  Database? _database;

  /// Initialize the database
  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDatabase();
    return _database!;
  }

  Future<Database> _initDatabase() async {
    final databasesPath = await getDatabasesPath();
    final dbPath = '$databasesPath/$_dbName';

    return await openDatabase(
      dbPath,
      version: _dbVersion,
      onCreate: _onCreate,
      onUpgrade: _onUpgrade,
    );
  }

  Future<void> _onCreate(Database db, int version) async {
    // Create files metadata table
    await db.execute('''
      CREATE TABLE $_filesMetadataTable (
        file_id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        server_version INTEGER NOT NULL,
        local_version INTEGER NOT NULL,
        sync_status TEXT NOT NULL,
        auto_sync INTEGER NOT NULL DEFAULT 1,
        last_synced_at TEXT,
        cached_at TEXT NOT NULL,
        file_url TEXT,
        local_path TEXT
      )
    ''');

    // Create indexes for files metadata
    await db.execute('''
      CREATE INDEX idx_files_workspace_id ON $_filesMetadataTable (workspace_id)
    ''');
    await db.execute('''
      CREATE INDEX idx_files_sync_status ON $_filesMetadataTable (sync_status)
    ''');
    await db.execute('''
      CREATE INDEX idx_files_auto_sync ON $_filesMetadataTable (auto_sync)
    ''');

    // Create sync queue table
    await db.execute('''
      CREATE TABLE $_syncQueueTable (
        id TEXT PRIMARY KEY,
        file_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        status TEXT NOT NULL,
        retry_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        error_message TEXT
      )
    ''');

    // Create indexes for sync queue
    await db.execute('''
      CREATE INDEX idx_sync_file_id ON $_syncQueueTable (file_id)
    ''');
    await db.execute('''
      CREATE INDEX idx_sync_status ON $_syncQueueTable (status)
    ''');
    await db.execute('''
      CREATE INDEX idx_sync_workspace_id ON $_syncQueueTable (workspace_id)
    ''');
  }

  Future<void> _onUpgrade(Database db, int oldVersion, int newVersion) async {
    // Handle future database migrations here
  }

  // ============================================
  // FILE METADATA OPERATIONS
  // ============================================

  /// Save file metadata to database
  Future<void> saveFileMetadata(OfflineFileMetadata metadata) async {
    final db = await database;
    await db.insert(
      _filesMetadataTable,
      metadata.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  /// Get file metadata by ID
  Future<OfflineFileMetadata?> getFileMetadata(String fileId) async {
    final db = await database;
    final results = await db.query(
      _filesMetadataTable,
      where: 'file_id = ?',
      whereArgs: [fileId],
    );

    if (results.isEmpty) return null;
    return OfflineFileMetadata.fromMap(results.first);
  }

  /// Get all offline files for a workspace
  Future<List<OfflineFileMetadata>> getOfflineFiles(String workspaceId) async {
    final db = await database;
    final results = await db.query(
      _filesMetadataTable,
      where: 'workspace_id = ?',
      whereArgs: [workspaceId],
    );

    return results.map((map) => OfflineFileMetadata.fromMap(map)).toList();
  }

  /// Get all offline files across all workspaces
  Future<List<OfflineFileMetadata>> getAllOfflineFiles() async {
    final db = await database;
    final results = await db.query(_filesMetadataTable);
    return results.map((map) => OfflineFileMetadata.fromMap(map)).toList();
  }

  /// Delete file metadata
  Future<void> deleteFileMetadata(String fileId) async {
    final db = await database;
    await db.delete(
      _filesMetadataTable,
      where: 'file_id = ?',
      whereArgs: [fileId],
    );
  }

  /// Update sync status for a file
  Future<void> updateSyncStatus(
    String fileId,
    SyncStatus syncStatus, {
    int? syncedVersion,
  }) async {
    final metadata = await getFileMetadata(fileId);
    if (metadata == null) return;

    final updatedMetadata = metadata.copyWith(
      syncStatus: syncStatus,
      localVersion: syncedVersion ?? metadata.localVersion,
      lastSyncedAt: syncStatus == SyncStatus.synced ? DateTime.now() : null,
    );

    await saveFileMetadata(updatedMetadata);
  }

  // ============================================
  // FILE BLOB OPERATIONS (Filesystem)
  // ============================================

  /// Get the directory for storing offline files
  Future<Directory> _getOfflineFilesDirectory() async {
    final appDir = await getApplicationDocumentsDirectory();
    final offlineDir = Directory('${appDir.path}/offline_files');
    if (!await offlineDir.exists()) {
      await offlineDir.create(recursive: true);
    }
    return offlineDir;
  }

  /// Get the path for a specific file
  Future<String> _getFilePath(String fileId, String fileName) async {
    final offlineDir = await _getOfflineFilesDirectory();
    // Use fileId as directory to avoid name collisions, preserve original filename
    final fileDir = Directory('${offlineDir.path}/$fileId');
    if (!await fileDir.exists()) {
      await fileDir.create(recursive: true);
    }
    return '${fileDir.path}/$fileName';
  }

  /// Save file blob to filesystem
  Future<String> saveFileBlob(
    String fileId,
    String fileName,
    Uint8List bytes,
  ) async {
    final filePath = await _getFilePath(fileId, fileName);
    final file = File(filePath);
    await file.writeAsBytes(bytes);
    return filePath;
  }

  /// Get file blob from filesystem
  Future<Uint8List?> getFileBlob(String fileId) async {
    final metadata = await getFileMetadata(fileId);
    if (metadata == null || metadata.localPath == null) return null;

    final file = File(metadata.localPath!);
    if (!await file.exists()) return null;

    return await file.readAsBytes();
  }

  /// Get file from filesystem as File object
  Future<File?> getFileAsFile(String fileId) async {
    final metadata = await getFileMetadata(fileId);
    if (metadata == null || metadata.localPath == null) return null;

    final file = File(metadata.localPath!);
    if (!await file.exists()) return null;

    return file;
  }

  /// Delete file blob from filesystem
  Future<void> deleteFileBlob(String fileId) async {
    final offlineDir = await _getOfflineFilesDirectory();
    final fileDir = Directory('${offlineDir.path}/$fileId');
    if (await fileDir.exists()) {
      await fileDir.delete(recursive: true);
    }
  }

  // ============================================
  // SYNC QUEUE OPERATIONS
  // ============================================

  /// Add item to sync queue
  Future<String> addToSyncQueue({
    required String fileId,
    required String workspaceId,
    required SyncOperation operation,
  }) async {
    final db = await database;
    final id = '${fileId}_${DateTime.now().millisecondsSinceEpoch}';

    final queueItem = SyncQueueItem(
      id: id,
      fileId: fileId,
      workspaceId: workspaceId,
      operation: operation,
      status: SyncQueueStatus.pending,
      retryCount: 0,
      createdAt: DateTime.now(),
    );

    await db.insert(
      _syncQueueTable,
      queueItem.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );

    return id;
  }

  /// Get pending sync queue items
  Future<List<SyncQueueItem>> getPendingSyncItems({String? workspaceId}) async {
    final db = await database;

    String? where;
    List<Object?>? whereArgs;

    if (workspaceId != null) {
      where = 'status = ? AND workspace_id = ?';
      whereArgs = ['pending', workspaceId];
    } else {
      where = 'status = ?';
      whereArgs = ['pending'];
    }

    final results = await db.query(
      _syncQueueTable,
      where: where,
      whereArgs: whereArgs,
    );

    return results.map((map) => SyncQueueItem.fromMap(map)).toList();
  }

  /// Update sync queue item status
  Future<void> updateSyncQueueItem(
    String id, {
    SyncQueueStatus? status,
    int? retryCount,
    String? errorMessage,
  }) async {
    final db = await database;

    final updates = <String, dynamic>{};
    if (status != null) updates['status'] = status.value;
    if (retryCount != null) updates['retry_count'] = retryCount;
    if (errorMessage != null) updates['error_message'] = errorMessage;

    if (updates.isEmpty) return;

    await db.update(
      _syncQueueTable,
      updates,
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  /// Remove item from sync queue
  Future<void> removeSyncQueueItem(String id) async {
    final db = await database;
    await db.delete(
      _syncQueueTable,
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  /// Clear sync queue items for a file
  Future<void> clearSyncQueueForFile(String fileId) async {
    final db = await database;
    await db.delete(
      _syncQueueTable,
      where: 'file_id = ?',
      whereArgs: [fileId],
    );
  }

  // ============================================
  // HIGH-LEVEL OPERATIONS
  // ============================================

  /// Cache a file for offline access
  Future<void> cacheFile({
    required String fileId,
    required String workspaceId,
    required String fileName,
    required String mimeType,
    required int size,
    required int version,
    required Uint8List bytes,
    String? fileUrl,
    bool autoSync = true,
  }) async {
    final now = DateTime.now();

    // Save the file to filesystem
    final localPath = await saveFileBlob(fileId, fileName, bytes);

    // Save metadata
    final metadata = OfflineFileMetadata(
      fileId: fileId,
      workspaceId: workspaceId,
      fileName: fileName,
      mimeType: mimeType,
      size: size,
      serverVersion: version,
      localVersion: version,
      syncStatus: SyncStatus.synced,
      autoSync: autoSync,
      lastSyncedAt: now,
      cachedAt: now,
      fileUrl: fileUrl,
      localPath: localPath,
    );

    await saveFileMetadata(metadata);
  }

  /// Remove file from offline cache
  Future<void> removeFile(String fileId) async {
    await deleteFileMetadata(fileId);
    await deleteFileBlob(fileId);
    await clearSyncQueueForFile(fileId);
  }

  /// Check if a file is available offline
  Future<bool> isFileAvailableOffline(String fileId) async {
    final metadata = await getFileMetadata(fileId);
    if (metadata == null) return false;

    if (metadata.localPath == null) return false;

    final file = File(metadata.localPath!);
    return await file.exists();
  }

  /// Get storage usage statistics
  Future<OfflineStorageStats> getStorageStats({String? workspaceId}) async {
    final files = workspaceId != null
        ? await getOfflineFiles(workspaceId)
        : await getAllOfflineFiles();

    int totalSize = 0;
    int pendingCount = 0;
    int syncedCount = 0;
    int errorCount = 0;
    int outdatedCount = 0;

    for (final file in files) {
      totalSize += file.size;

      switch (file.syncStatus) {
        case SyncStatus.pending:
        case SyncStatus.syncing:
          pendingCount++;
          break;
        case SyncStatus.synced:
          syncedCount++;
          break;
        case SyncStatus.error:
          errorCount++;
          break;
        case SyncStatus.outdated:
          outdatedCount++;
          break;
      }
    }

    return OfflineStorageStats(
      totalFiles: files.length,
      totalSize: totalSize,
      pendingCount: pendingCount,
      syncedCount: syncedCount,
      errorCount: errorCount,
      outdatedCount: outdatedCount,
    );
  }

  /// Get files that need syncing
  Future<List<OfflineFileMetadata>> getFilesNeedingSync({
    String? workspaceId,
  }) async {
    final files = workspaceId != null
        ? await getOfflineFiles(workspaceId)
        : await getAllOfflineFiles();

    return files
        .where((file) =>
            file.autoSync &&
            (file.syncStatus == SyncStatus.outdated ||
                file.serverVersion > file.localVersion))
        .toList();
  }

  /// Mark file as outdated when server version changes
  Future<void> markAsOutdated(String fileId, int newServerVersion) async {
    final metadata = await getFileMetadata(fileId);
    if (metadata == null) return;

    if (newServerVersion > metadata.localVersion) {
      final updatedMetadata = metadata.copyWith(
        serverVersion: newServerVersion,
        syncStatus: SyncStatus.outdated,
      );
      await saveFileMetadata(updatedMetadata);
    }
  }

  /// Clear all offline data for a workspace
  Future<void> clearWorkspaceData(String workspaceId) async {
    final files = await getOfflineFiles(workspaceId);
    for (final file in files) {
      await removeFile(file.fileId);
    }
  }

  /// Clear all offline data
  Future<void> clearAllData() async {
    final db = await database;
    await db.delete(_filesMetadataTable);
    await db.delete(_syncQueueTable);

    // Delete all files from filesystem
    final offlineDir = await _getOfflineFilesDirectory();
    if (await offlineDir.exists()) {
      await offlineDir.delete(recursive: true);
    }
  }

  /// Get total storage used by offline files
  Future<int> getTotalStorageUsed() async {
    final offlineDir = await _getOfflineFilesDirectory();
    if (!await offlineDir.exists()) return 0;

    int totalSize = 0;
    await for (final entity in offlineDir.list(recursive: true)) {
      if (entity is File) {
        totalSize += await entity.length();
      }
    }
    return totalSize;
  }

  /// Close the database
  Future<void> close() async {
    final db = _database;
    if (db != null) {
      await db.close();
      _database = null;
    }
  }
}
