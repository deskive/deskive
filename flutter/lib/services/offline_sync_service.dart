import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../dao/offline_file_dao.dart';
import '../dao/file_dao.dart';
import '../models/offline/offline_file_metadata.dart';
import 'offline_storage_service.dart';

/// Progress state for sync operations
class SyncProgress {
  final int total;
  final int completed;
  final String? currentFileName;
  final SyncProgressStatus status;

  SyncProgress({
    required this.total,
    required this.completed,
    this.currentFileName,
    required this.status,
  });

  factory SyncProgress.idle() => SyncProgress(
        total: 0,
        completed: 0,
        status: SyncProgressStatus.idle,
      );

  SyncProgress copyWith({
    int? total,
    int? completed,
    String? currentFileName,
    SyncProgressStatus? status,
  }) {
    return SyncProgress(
      total: total ?? this.total,
      completed: completed ?? this.completed,
      currentFileName: currentFileName ?? this.currentFileName,
      status: status ?? this.status,
    );
  }
}

enum SyncProgressStatus {
  idle,
  syncing,
  completed,
  error,
}

/// Service for managing offline file sync
class OfflineSyncService extends ChangeNotifier {
  static OfflineSyncService? _instance;
  static OfflineSyncService get instance =>
      _instance ??= OfflineSyncService._internal();

  OfflineSyncService._internal();

  final OfflineStorageService _storageService = OfflineStorageService.instance;
  final Connectivity _connectivity = Connectivity();

  String? _currentWorkspaceId;
  OfflineFileDao? _offlineFileDao;
  FileDao? _fileDao;

  bool _isOnline = true;
  bool _isSyncing = false;
  SyncProgress _syncProgress = SyncProgress.idle();

  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;
  Timer? _autoSyncTimer;

  // Configuration
  Duration autoSyncInterval = const Duration(minutes: 5);
  bool enableAutoSync = true;

  // Getters
  bool get isOnline => _isOnline;
  bool get isSyncing => _isSyncing;
  SyncProgress get syncProgress => _syncProgress;

  /// Initialize the service with workspace context
  void initialize(String workspaceId) {
    _currentWorkspaceId = workspaceId;
    _offlineFileDao = OfflineFileDao(workspaceId: workspaceId);
    _fileDao = FileDao(workspaceId: workspaceId);

    _startConnectivityMonitoring();
    _startAutoSyncTimer();
  }

  /// Start monitoring connectivity changes
  void _startConnectivityMonitoring() {
    _connectivitySubscription?.cancel();
    _connectivitySubscription =
        _connectivity.onConnectivityChanged.listen(_handleConnectivityChange);

    // Check initial connectivity
    _checkConnectivity();
  }

  Future<void> _checkConnectivity() async {
    final result = await _connectivity.checkConnectivity();
    _handleConnectivityChange(result);
  }

  void _handleConnectivityChange(List<ConnectivityResult> results) {
    final wasOnline = _isOnline;
    _isOnline = results.isNotEmpty &&
        !results.contains(ConnectivityResult.none);

    if (!wasOnline && _isOnline && enableAutoSync) {
      // Just came back online - trigger sync
      syncAllFiles();
    }

    notifyListeners();
  }

  /// Start auto-sync timer
  void _startAutoSyncTimer() {
    _autoSyncTimer?.cancel();
    if (enableAutoSync) {
      _autoSyncTimer = Timer.periodic(autoSyncInterval, (_) {
        if (_isOnline && !_isSyncing) {
          checkForUpdates();
        }
      });
    }
  }

  /// Mark a file for offline access
  Future<bool> markFileOffline({
    required String fileId,
    required String fileName,
    required String mimeType,
    required int size,
    required int version,
    String? fileUrl,
    bool autoSync = true,
    int priority = 0,
  }) async {
    if (_offlineFileDao == null || _fileDao == null) return false;

    try {
      _syncProgress = SyncProgress(
        total: 1,
        completed: 0,
        currentFileName: fileName,
        status: SyncProgressStatus.syncing,
      );
      notifyListeners();

      // Register with backend
      final offlineRecord = await _offlineFileDao!.markFileOffline(
        fileId,
        autoSync: autoSync,
        priority: priority,
      );

      if (offlineRecord == null) {
        _syncProgress = _syncProgress.copyWith(status: SyncProgressStatus.error);
        notifyListeners();
        return false;
      }

      // Download the file
      final bytes = await _fileDao!.downloadFile(fileId: fileId);

      if (bytes == null || bytes.isEmpty) {
        _syncProgress = _syncProgress.copyWith(status: SyncProgressStatus.error);
        notifyListeners();
        return false;
      }

      // Store in local cache
      await _storageService.cacheFile(
        fileId: fileId,
        workspaceId: _currentWorkspaceId!,
        fileName: fileName,
        mimeType: mimeType,
        size: size,
        version: version,
        bytes: Uint8List.fromList(bytes),
        fileUrl: fileUrl,
        autoSync: autoSync,
      );

      // Update backend sync status
      await _offlineFileDao!.updateOfflineSettings(
        fileId,
        syncStatus: SyncStatus.synced,
        syncedVersion: version,
      );

      _syncProgress = SyncProgress(
        total: 1,
        completed: 1,
        status: SyncProgressStatus.completed,
      );
      notifyListeners();

      return true;
    } catch (e) {
      debugPrint('Failed to mark file offline: $e');
      _syncProgress = _syncProgress.copyWith(status: SyncProgressStatus.error);
      notifyListeners();
      return false;
    }
  }

  /// Remove a file from offline access
  Future<bool> removeFileOffline(String fileId) async {
    if (_offlineFileDao == null) return false;

    try {
      // Remove from backend
      final success = await _offlineFileDao!.removeFileOffline(fileId);
      if (!success) return false;

      // Remove from local storage
      await _storageService.removeFile(fileId);

      notifyListeners();
      return true;
    } catch (e) {
      debugPrint('Failed to remove file offline: $e');
      return false;
    }
  }

  /// Check if a file is available offline
  Future<bool> isFileAvailableOffline(String fileId) async {
    return await _storageService.isFileAvailableOffline(fileId);
  }

  /// Get file from local cache
  Future<Uint8List?> getOfflineFileBlob(String fileId) async {
    // Try local cache first
    final cachedBlob = await _storageService.getFileBlob(fileId);
    if (cachedBlob != null) {
      return cachedBlob;
    }

    // If online, try to download
    if (_isOnline && _fileDao != null) {
      try {
        final bytes = await _fileDao!.downloadFile(fileId: fileId);
        if (bytes != null && bytes.isNotEmpty) {
          return Uint8List.fromList(bytes);
        }
      } catch (e) {
        debugPrint('Failed to download file: $e');
      }
    }

    return null;
  }

  /// Get local offline files
  Future<List<OfflineFileMetadata>> getLocalOfflineFiles() async {
    if (_currentWorkspaceId == null) return [];
    return await _storageService.getOfflineFiles(_currentWorkspaceId!);
  }

  /// Check for updates on all offline files
  Future<List<OfflineFileResponse>> checkForUpdates() async {
    if (!_isOnline || _offlineFileDao == null) return [];

    try {
      // Get files needing sync from backend
      final filesNeedingSync = await _offlineFileDao!.getFilesNeedingSync();

      // Mark local files as outdated
      for (final file in filesNeedingSync) {
        if (file.serverVersion != null && file.syncedVersion > 0) {
          await _storageService.markAsOutdated(
            file.fileId,
            file.serverVersion!,
          );
        }
      }

      notifyListeners();
      return filesNeedingSync;
    } catch (e) {
      debugPrint('Failed to check for updates: $e');
      return [];
    }
  }

  /// Sync a single file
  Future<bool> syncFile(String fileId) async {
    if (!_isOnline || _fileDao == null || _offlineFileDao == null) {
      return false;
    }

    try {
      final metadata = await _storageService.getFileMetadata(fileId);
      if (metadata == null) return false;

      // Update status to syncing
      await _storageService.updateSyncStatus(fileId, SyncStatus.syncing);
      notifyListeners();

      // Download latest version
      final bytes = await _fileDao!.downloadFile(fileId: fileId);
      if (bytes == null || bytes.isEmpty) {
        await _storageService.updateSyncStatus(fileId, SyncStatus.error);
        notifyListeners();
        return false;
      }

      // Check for update info
      final updateInfo = await _offlineFileDao!.checkFileUpdate(fileId);

      // Update local cache
      await _storageService.saveFileBlob(
        fileId,
        metadata.fileName,
        Uint8List.fromList(bytes),
      );
      await _storageService.updateSyncStatus(
        fileId,
        SyncStatus.synced,
        syncedVersion: updateInfo?.serverVersion ?? metadata.serverVersion,
      );

      // Update backend
      await _offlineFileDao!.updateOfflineSettings(
        fileId,
        syncStatus: SyncStatus.synced,
        syncedVersion: updateInfo?.serverVersion ?? metadata.serverVersion,
      );

      notifyListeners();
      return true;
    } catch (e) {
      debugPrint('Failed to sync file: $e');
      await _storageService.updateSyncStatus(fileId, SyncStatus.error);
      notifyListeners();
      return false;
    }
  }

  /// Sync all offline files that need updating
  Future<void> syncAllFiles() async {
    if (!_isOnline || _isSyncing || _currentWorkspaceId == null) return;

    try {
      _isSyncing = true;
      notifyListeners();

      // Get files needing sync
      final filesNeedingSync = await _storageService.getFilesNeedingSync(
        workspaceId: _currentWorkspaceId,
      );

      if (filesNeedingSync.isEmpty) {
        _syncProgress = SyncProgress(
          total: 0,
          completed: 0,
          status: SyncProgressStatus.completed,
        );
        _isSyncing = false;
        notifyListeners();
        return;
      }

      _syncProgress = SyncProgress(
        total: filesNeedingSync.length,
        completed: 0,
        status: SyncProgressStatus.syncing,
      );
      notifyListeners();

      final updates = <Map<String, dynamic>>[];
      int errorCount = 0;

      for (int i = 0; i < filesNeedingSync.length; i++) {
        final file = filesNeedingSync[i];

        _syncProgress = _syncProgress.copyWith(
          currentFileName: file.fileName,
        );
        notifyListeners();

        try {
          // Download and update local cache
          final bytes = await _fileDao!.downloadFile(fileId: file.fileId);
          if (bytes != null && bytes.isNotEmpty) {
            final updateInfo =
                await _offlineFileDao!.checkFileUpdate(file.fileId);

            await _storageService.saveFileBlob(
              file.fileId,
              file.fileName,
              Uint8List.fromList(bytes),
            );
            await _storageService.updateSyncStatus(
              file.fileId,
              SyncStatus.synced,
              syncedVersion:
                  updateInfo?.serverVersion ?? file.serverVersion,
            );

            updates.add({
              'fileId': file.fileId,
              'syncStatus': SyncStatus.synced.value,
              'syncedVersion':
                  updateInfo?.serverVersion ?? file.serverVersion,
            });
          } else {
            await _storageService.updateSyncStatus(
              file.fileId,
              SyncStatus.error,
            );
            updates.add({
              'fileId': file.fileId,
              'syncStatus': SyncStatus.error.value,
              'errorMessage': 'Failed to download file',
            });
            errorCount++;
          }
        } catch (e) {
          debugPrint('Failed to sync ${file.fileName}: $e');
          await _storageService.updateSyncStatus(file.fileId, SyncStatus.error);
          updates.add({
            'fileId': file.fileId,
            'syncStatus': SyncStatus.error.value,
            'errorMessage': e.toString(),
          });
          errorCount++;
        }

        _syncProgress = _syncProgress.copyWith(completed: i + 1);
        notifyListeners();
      }

      // Batch update backend
      if (updates.isNotEmpty && _offlineFileDao != null) {
        await _offlineFileDao!.batchUpdateSyncStatus(updates);
      }

      _syncProgress = SyncProgress(
        total: filesNeedingSync.length,
        completed: filesNeedingSync.length,
        status: errorCount > 0
            ? SyncProgressStatus.error
            : SyncProgressStatus.completed,
      );
    } catch (e) {
      debugPrint('Failed to sync files: $e');
      _syncProgress = _syncProgress.copyWith(status: SyncProgressStatus.error);
    } finally {
      _isSyncing = false;
      notifyListeners();
    }
  }

  /// Get storage statistics
  Future<OfflineStorageStats> getStorageStats() async {
    if (_currentWorkspaceId == null) {
      return OfflineStorageStats.empty();
    }
    return await _storageService.getStorageStats(
      workspaceId: _currentWorkspaceId,
    );
  }

  /// Clear all offline data for the current workspace
  Future<void> clearOfflineData() async {
    if (_currentWorkspaceId == null) return;

    try {
      // Get all offline files
      final files = await _storageService.getOfflineFiles(_currentWorkspaceId!);

      // Remove from backend
      for (final file in files) {
        await _offlineFileDao?.removeFileOffline(file.fileId);
      }

      // Clear local storage
      await _storageService.clearWorkspaceData(_currentWorkspaceId!);

      notifyListeners();
    } catch (e) {
      debugPrint('Failed to clear offline data: $e');
    }
  }

  /// Dispose resources
  @override
  void dispose() {
    _connectivitySubscription?.cancel();
    _autoSyncTimer?.cancel();
    super.dispose();
  }
}
