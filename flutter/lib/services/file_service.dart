import 'dart:io';
import 'dart:async';
import 'package:flutter/foundation.dart';
import '../dao/folder_dao.dart';
import '../dao/file_dao.dart';
import '../models/folder/folder.dart';
import '../models/file/file.dart' as file_model;
import '../models/file/dashboard_stats.dart';
import '../models/trash_item.dart';
import '../models/offline/offline_file_metadata.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import '../api/base_api_client.dart';
import 'offline_sync_service.dart';
import 'offline_storage_service.dart';

/// Comprehensive file service that handles all file operations
/// including upload, download, preview, sharing, and management
class FileService extends ChangeNotifier {
  static FileService? _instance;
  static FileService get instance => _instance ??= FileService._internal();

  FileService._internal();

  // API Client - Initialize lazily to ensure BaseApiClient is ready
  BaseApiClient get _apiClient => BaseApiClient.instance;

  // Progress tracking
  final Map<String, double> _uploadProgress = {};
  final Map<String, double> _downloadProgress = {};

  // State
  String? _currentWorkspaceId;
  FolderDao? _folderDao;
  FileDao? _fileDao;
  List<Folder> _folders = [];
  List<file_model.File> _files = [];
  bool _isLoadingFolders = false;
  bool _isLoadingFiles = false;

  // Getters
  List<Folder> get folders => _folders;
  List<file_model.File> get files => _files;
  bool get isLoadingFolders => _isLoadingFolders;
  bool get isLoadingFiles => _isLoadingFiles;

  /// Initialize the service with workspace context
  void initialize(String workspaceId) {
    _currentWorkspaceId = workspaceId;
    _initializeDAOs(workspaceId);
  }

  /// Initialize DAOs
  void _initializeDAOs(String workspaceId) {
    _folderDao = FolderDao(
      workspaceId: workspaceId,
    );

    _fileDao = FileDao(
      workspaceId: workspaceId,
    );
  }

  // ==================== PROGRESS TRACKING ====================

  /// Get upload progress for a file
  double getUploadProgress(String fileId) => _uploadProgress[fileId] ?? 0.0;

  /// Get download progress for a file
  double getDownloadProgress(String fileId) => _downloadProgress[fileId] ?? 0.0;

  /// Check if file is currently uploading
  bool isUploading(String fileId) => _uploadProgress.containsKey(fileId);

  /// Check if file is currently downloading
  bool isDownloading(String fileId) => _downloadProgress.containsKey(fileId);

  /// Cancel file upload
  void cancelUpload(String fileId) {
    _uploadProgress.remove(fileId);
    notifyListeners();
  }

  /// Cancel file download
  void cancelDownload(String fileId) {
    _downloadProgress.remove(fileId);
    notifyListeners();
  }

  // ==================== FOLDER OPERATIONS ====================

  /// Fetch all folders from API
  Future<void> fetchFolders({String? parentId}) async {
    if (_folderDao == null) {
      return;
    }

    _isLoadingFolders = true;
    notifyListeners();

    try {
      final response = await _folderDao!.getAllFolders(parentId: parentId);

      if (response.success && response.data != null) {
        _folders = response.data!;
      } else {
        _folders = [];
      }
    } catch (e) {
      _folders = [];
    } finally {
      _isLoadingFolders = false;
      notifyListeners();
    }
  }

  /// Create a new folder
  Future<Folder?> createFolder({
    required String name,
    String? parentId,
    String? description,
  }) async {
    if (_folderDao == null) {
      return null;
    }

    try {
      final response = await _folderDao!.createFolder(
        name: name,
        parentId: parentId,
        description: description,
      );

      if (response.success && response.data != null) {
        _folders.add(response.data!);
        notifyListeners();
        return response.data!;
      } else {
      }
    } catch (e) {
    }

    return null;
  }

  /// Get folders (returns cached list)
  List<Folder> getFolders({String? parentId}) {
    if (parentId == null) {
      return _folders.where((f) => f.parentId == null).toList();
    }
    return _folders.where((f) => f.parentId == parentId).toList();
  }

  /// Update folder
  Future<bool> updateFolder(
    String folderId, {
    String? name,
    String? parentId,
  }) async {
    if (_folderDao == null) {
      return false;
    }

    try {
      final response = await _folderDao!.updateFolder(
        folderId,
        name: name,
        parentId: parentId,
      );

      if (response.success && response.data != null) {
        final index = _folders.indexWhere((f) => f.id == folderId);
        if (index != -1) {
          _folders[index] = response.data!;
          notifyListeners();
        }
        return true;
      } else {
      }
    } catch (e) {
    }

    return false;
  }

  /// Delete a folder
  Future<bool> deleteFolder(String folderId) async {
    if (_folderDao == null) {
      return false;
    }

    try {
      final success = await _folderDao!.deleteFolder(folderId);

      if (success) {
        _folders.removeWhere((f) => f.id == folderId);
        notifyListeners();
        return true;
      } else {
      }
    } catch (e) {
    }

    return false;
  }

  /// Delete a folder recursively (including all subfolders and files)
  Future<Map<String, dynamic>?> deleteFolderRecursive(String folderId) async {
    if (_folderDao == null) {
      return null;
    }

    try {
      final result = await _folderDao!.deleteFolderRecursive(folderId);

      if (result != null) {
        // Remove the folder from local cache
        _folders.removeWhere((f) => f.id == folderId);

        // Also remove any files that were in that folder
        _files.removeWhere((f) => f.folderId == folderId);

        notifyListeners();
        return result;
      } else {
      }
    } catch (e) {
    }

    return null;
  }

  /// Move folder to different parent and optionally rename it
  Future<Folder?> moveFolder({
    required String folderId,
    String? targetParentId,
    String? newName,
  }) async {
    if (_folderDao == null) {
      return null;
    }

    try {
      final response = await _folderDao!.moveFolder(
        folderId,
        targetParentId: targetParentId,
        newName: newName,
      );

      if (response.success && response.data != null) {
        final index = _folders.indexWhere((f) => f.id == folderId);
        if (index != -1) {
          _folders[index] = response.data!;
          notifyListeners();
        }
        return response.data;
      } else {
        return null;
      }
    } catch (e) {
      return null;
    }
  }

  // ==================== FILE OPERATIONS ====================

  /// Fetch all files from API
  Future<void> fetchFiles({
    String? folderId,
    int page = 1,
    int limit = 100,
  }) async {
    if (_fileDao == null) {
      return;
    }

    _isLoadingFiles = true;
    notifyListeners();

    try {
      final response = await _fileDao!.getAllFiles(
        folderId: folderId,
        page: page,
        limit: limit,
      );

      if (response.success && response.data != null) {
        _files = response.data!;
      } else {
        _files = [];
      }
    } catch (e) {
      _files = [];
    } finally {
      _isLoadingFiles = false;
      notifyListeners();
    }
  }

  /// Get files list from API (returns the list directly)
  Future<List<file_model.File>?> getFiles({
    String? folderId,
    int page = 1,
    int limit = 100,
  }) async {
    if (_fileDao == null) {
      return null;
    }

    try {
      final response = await _fileDao!.getAllFiles(
        folderId: folderId,
        page: page,
        limit: limit,
      );

      if (response.success && response.data != null) {
        return response.data!;
      } else {
      }
    } catch (e) {
    }

    return null;
  }

  /// Get a specific file by ID
  Future<file_model.File?> getFileById(String fileId) async {
    if (_fileDao == null) {
      return null;
    }

    try {
      final response = await _fileDao!.getFile(fileId);

      if (response.success && response.data != null) {
        return response.data!;
      } else {
      }
    } catch (e) {
    }

    return null;
  }

  /// Update file details
  Future<bool> updateFile(
    String fileId, {
    String? name,
    String? folderId,
    String? description,
    String? tags,
    bool? markAsOpened,
    bool? starred,
  }) async {
    if (_fileDao == null) {
      return false;
    }

    try {
      final response = await _fileDao!.updateFile(
        fileId,
        name: name,
        folderId: folderId,
        description: description,
        tags: tags,
        markAsOpened: markAsOpened,
        starred: starred,
      );

      if (response.success && response.data != null) {
        final index = _files.indexWhere((f) => f.id == fileId);
        if (index != -1) {
          _files[index] = response.data!;
          notifyListeners();
        }
        return true;
      } else {
      }
    } catch (e) {
    }

    return false;
  }

  /// Toggle starred status of a file
  Future<bool> toggleStarred(String fileId, bool isStarred) async {
    if (_fileDao == null) {
      return false;
    }

    try {
      final response = await _fileDao!.updateFile(
        fileId,
        starred: isStarred,
      );

      if (response.success && response.data != null) {
        final index = _files.indexWhere((f) => f.id == fileId);
        if (index != -1) {
          _files[index] = response.data!;
          notifyListeners();
        }
        return true;
      } else {
      }
    } catch (e) {
    }

    return false;
  }

  /// Search files
  Future<List<file_model.File>> searchFiles({
    required String query,
    String? mimeType,
  }) async {
    if (_fileDao == null) {
      return [];
    }

    try {
      final response = await _fileDao!.searchFiles(
        query: query,
        mimeType: mimeType,
      );

      if (response.success && response.data != null) {
        return response.data!;
      } else {
      }
    } catch (e) {
    }

    return [];
  }

  /// Get recent files
  Future<List<file_model.File>> getRecentFiles({int limit = 50}) async {
    if (_fileDao == null) {
      return [];
    }

    try {
      final response = await _fileDao!.getRecentFiles(limit: limit);

      if (response.success && response.data != null) {
        return response.data!;
      } else {
      }
    } catch (e) {
    }

    return [];
  }

  /// Get starred files
  Future<List<file_model.File>> getStarredFiles() async {
    if (_fileDao == null) {
      return [];
    }

    try {
      final response = await _fileDao!.getStarredFiles();

      if (response.success && response.data != null) {
        return response.data!;
      } else {
      }
    } catch (e) {
    }

    return [];
  }

  /// Get files shared with the current user
  Future<List<file_model.File>> getSharedWithMeFiles({
    int page = 1,
    int limit = 100,
  }) async {
    if (_fileDao == null) {
      return [];
    }

    try {
      final response = await _fileDao!.getSharedWithMeFiles(
        page: page,
        limit: limit,
      );

      if (response.success && response.data != null) {
        return response.data!;
      } else {
      }
    } catch (e) {
    }

    return [];
  }

  /// Get trashed files
  Future<List<file_model.File>> getTrashedFiles() async {
    if (_fileDao == null) {
      return [];
    }

    try {
      final response = await _fileDao!.getTrashedFiles();

      if (response.success && response.data != null) {
        return response.data!;
      } else {
      }
    } catch (e) {
    }

    return [];
  }

  /// Get all trashed items (both files and folders)
  Future<List<TrashItem>> getTrashedItems() async {
    if (_fileDao == null) {
      return [];
    }

    try {
      final items = await _fileDao!.getTrashedItems();
      return items;
    } catch (e) {
      return [];
    }
  }

  // ==================== FILE UPLOAD ====================

  /// Upload a single file with progress tracking
  Future<bool> uploadFile({
    required File file,
    String? folderId,
    String? description,
    List<String>? tags,
    bool isPublic = false,
    Map<String, dynamic>? metadata,
  }) async {
    if (_fileDao == null) {
      return false;
    }

    final fileName = file.path.split('/').last;
    _uploadProgress[fileName] = 0.0;
    notifyListeners();

    try {

      final response = await _fileDao!.uploadFile(
        filePath: file.path,
        fileName: fileName,
        folderId: folderId,
        description: description,
        tags: tags,
        isPublic: isPublic,
      );

      if (response.success && response.data != null) {
        // Add the uploaded file to the files list
        _files.add(response.data!);
        _uploadProgress.remove(fileName);
        notifyListeners();

        return true;
      } else {
        _uploadProgress.remove(fileName);
        notifyListeners();
        return false;
      }
    } catch (e) {
      _uploadProgress.remove(fileName);
      notifyListeners();
      return false;
    }
  }

  /// Upload multiple files with individual progress tracking
  Future<List<bool>> uploadMultipleFiles({
    required List<File> files,
    String? folderId,
    String? description,
    List<String>? tags,
    bool isPublic = false,
    Map<String, dynamic>? metadata,
  }) async {
    // TODO: Implement multiple file upload
    final results = <bool>[];

    for (final file in files) {
      final result = await uploadFile(
        file: file,
        folderId: folderId,
        description: description,
        tags: tags,
        isPublic: isPublic,
        metadata: metadata,
      );
      results.add(result);
    }

    return results;
  }

  // ==================== FILE DOWNLOAD ====================

  /// Download a file with progress tracking
  Future<String?> downloadFile({
    required String fileId,
    String? fileName,
  }) async {

    if (_fileDao == null) {
      return null;
    }

    try {
      // Request storage permission for Android
      if (Platform.isAndroid) {
        // Android 13+ (API 33+) doesn't need storage permission for Downloads
        // But for older versions, we need it
        if (await Permission.storage.isDenied) {
          final status = await Permission.storage.request();

          if (status.isDenied) {
            // Try photos permission for Android 13+
            final photosStatus = await Permission.photos.request();

            if (photosStatus.isDenied) {
              // Continue anyway - we'll use app directory
            }
          }
        }
      }


      final bytes = await _fileDao!.downloadFile(
        fileId: fileId,
        onProgress: (received, total) {
          if (total > 0) {
            final progress = received / total;
          }
        },
      );

      if (bytes != null && bytes.isNotEmpty) {

        String? filePath;

        if (Platform.isAndroid) {
          // Try to save to public Downloads directory
          try {
            // For Android, try to get the public Downloads directory
            Directory? directory = Directory('/storage/emulated/0/Download');

            if (!await directory.exists()) {
              // Fallback to Downloads with 's'
              directory = Directory('/storage/emulated/0/Downloads');
            }

            if (!await directory.exists()) {
              // Fallback to external storage
              directory = await getExternalStorageDirectory();
              if (directory != null) {
                directory = Directory('${directory.path}/Download');
                await directory.create(recursive: true);
              }
            }

            if (directory != null && await directory.exists()) {
              final timestamp = DateTime.now().millisecondsSinceEpoch;
              final filename = fileName ?? 'file_$timestamp';
              filePath = '${directory.path}/$filename';

              final file = File(filePath);
              await file.writeAsBytes(bytes);

            }
          } catch (e) {
            filePath = null;
          }
        }

        // If Android save failed or iOS, use app directory
        if (filePath == null) {
          Directory? directory;
          if (Platform.isAndroid) {
            directory = await getExternalStorageDirectory();
          } else {
            directory = await getApplicationDocumentsDirectory();
          }

          if (directory == null) {
            return null;
          }

          final downloadsDir = Directory('${directory.path}/Downloads');
          if (!await downloadsDir.exists()) {
            await downloadsDir.create(recursive: true);
          }

          final timestamp = DateTime.now().millisecondsSinceEpoch;
          final filename = fileName ?? 'file_$timestamp';
          filePath = '${downloadsDir.path}/$filename';

          final file = File(filePath);
          await file.writeAsBytes(bytes);

        }

        return filePath;
      } else {
        return null;
      }
    } catch (e, stackTrace) {
      return null;
    }
  }

  // ==================== FILE MANAGEMENT ====================

  /// Move or rename a file
  /// Move a file to a different folder (for cut/paste)
  Future<file_model.File?> moveFile({
    required String fileId,
    String? targetFolderId,
    String? newName,
  }) async {
    if (_fileDao == null) {
      return null;
    }

    try {
      final response = await _fileDao!.moveFile(
        fileId,
        targetFolderId: targetFolderId,
        newName: newName,
      );

      if (response.success && response.data != null) {
        // Don't modify _files list here - let the calling code refresh
        // This is because _files might be tracking a different folder context
        return response.data;
      } else {
        return null;
      }
    } catch (e) {
      return null;
    }
  }

  /// Delete a file
  Future<bool> deleteFile(String fileId) async {
    if (_fileDao == null) {
      return false;
    }

    try {
      final success = await _fileDao!.deleteFile(fileId);

      if (success) {
        _files.removeWhere((f) => f.id == fileId);
        notifyListeners();
        return true;
      } else {
      }
    } catch (e) {
    }

    return false;
  }

  /// Restore a file from trash
  Future<bool> restoreFile(String fileId) async {
    if (_fileDao == null) {
      return false;
    }

    try {
      final response = await _fileDao!.restoreFile(fileId);

      if (response.success) {
        return true;
      } else {
        return false;
      }
    } catch (e) {
      return false;
    }
  }

  /// Restore a folder from trash
  Future<Map<String, dynamic>?> restoreFolder(String folderId) async {
    if (_folderDao == null) {
      return null;
    }

    try {
      final response = await _folderDao!.restoreFolder(folderId);

      if (response != null) {
        return response;
      } else {
        return null;
      }
    } catch (e) {
      return null;
    }
  }

  /// Copy a folder to a target location
  Future<Folder?> copyFolder({
    required String folderId,
    String? targetParentId,
    String? newName,
  }) async {
    if (_folderDao == null) {
      return null;
    }

    try {
      final response = await _folderDao!.copyFolder(
        folderId,
        targetParentId: targetParentId,
        newName: newName,
      );

      if (response.success && response.data != null) {
        return response.data;
      } else {
        return null;
      }
    } catch (e) {
      return null;
    }
  }

  /// Copy a file to a target folder
  Future<file_model.File?> copyFile({
    required String fileId,
    String? targetFolderId,
    String? newName,
  }) async {
    if (_fileDao == null) {
      return null;
    }

    try {
      final response = await _fileDao!.copyFile(
        fileId,
        targetFolderId: targetFolderId,
        newName: newName,
      );

      if (response.success && response.data != null) {
        // Don't modify _files list here - let the calling code refresh
        // This is because _files might be tracking a different folder context
        return response.data;
      } else {
      }
    } catch (e) {
    }

    return null;
  }

  // ==================== FILE SHARING ====================

  /// Create a share link for a file
  Future<Map<String, dynamic>?> shareFile({
    required String workspaceId,
    required String fileId,
    required List<String> userIds,
    Map<String, bool>? permissions,
    DateTime? expiresAt,
  }) async {
    try {

      final requestData = {
        'user_ids': userIds,
        if (permissions != null) 'permissions': permissions,
        if (expiresAt != null) 'expires_at': expiresAt.toIso8601String(),
      };


      final response = await _apiClient.post(
        '/workspaces/$workspaceId/files/$fileId/share',
        data: requestData,
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.data as Map<String, dynamic>;
        return data;
      } else {
        return null;
      }
    } catch (e) {
      return null;
    }
  }

  /// Get all share links for a file
  Future<List<dynamic>> getFileShares(String fileId) async {
    // TODO: Implement get file shares
    await Future.delayed(const Duration(milliseconds: 500));
    return [];
  }

  /// Revoke a file share link
  Future<bool> revokeFileShare(String shareId) async {
    // TODO: Implement revoke share
    await Future.delayed(const Duration(milliseconds: 500));
    return true;
  }

  /// Access a shared file via token
  Future<dynamic> getSharedFile(String shareToken, {String? password}) async {
    // TODO: Implement get shared file
    await Future.delayed(const Duration(milliseconds: 500));
    return null;
  }

  // ==================== STORAGE STATS ====================

  /// Get dashboard statistics for current workspace
  Future<DashboardStats?> getDashboardStats() async {
    if (_fileDao == null) {
      return null;
    }

    try {
      final stats = await _fileDao!.getDashboardStats();

      if (stats != null) {
      } else {
      }

      return stats;
    } catch (e) {
      return null;
    }
  }

  /// Get files by type category
  /// Categories: documents, images, videos, audio, spreadsheets, pdfs
  Future<List<file_model.File>> getFilesByType({
    required String category,
    int page = 1,
    int limit = 100,
  }) async {
    if (_fileDao == null) {
      return [];
    }

    try {
      final response = await _fileDao!.getFilesByType(
        category: category,
        page: page,
        limit: limit,
      );

      if (response.success && response.data != null) {
        return response.data!;
      } else {
      }
    } catch (e) {
    }

    return [];
  }

  // ==================== FILE PREVIEW ====================

  /// Check if file can be previewed
  bool canPreviewFile(String mimeType) {
    const previewableMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'text/html',
      'text/markdown',
      'application/json',
      'text/csv',
    ];

    return previewableMimeTypes.contains(mimeType) ||
           mimeType.startsWith('text/') ||
           mimeType.startsWith('image/');
  }

  /// Get file preview URL
  String? getPreviewUrl(dynamic file) {
    // TODO: Implement get preview URL
    return null;
  }

  // ==================== UTILITY METHODS ====================

  /// Format file size
  String formatFileSize(int bytes) {
    const suffixes = ['B', 'KB', 'MB', 'GB', 'TB'];
    var i = 0;
    double size = bytes.toDouble();

    while (size >= 1024 && i < suffixes.length - 1) {
      size /= 1024;
      i++;
    }

    return '${size.toStringAsFixed(i == 0 ? 0 : 1)} ${suffixes[i]}';
  }

  /// Get file type icon
  String getFileIcon(String mimeType) {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType == 'application/pdf') return '📄';
    if (mimeType.contains('word')) return '📝';
    if (mimeType.contains('excel') || mimeType.contains('spreadsheet')) return '📊';
    if (mimeType.contains('powerpoint') || mimeType.contains('presentation')) return '📈';
    if (mimeType.startsWith('text/')) return '📝';
    if (mimeType.contains('zip') || mimeType.contains('archive')) return '🗜️';
    return '📁';
  }

  /// Clear all caches
  void clearAllCaches() {
    _uploadProgress.clear();
    _downloadProgress.clear();
    notifyListeners();
  }

  // ==================== OFFLINE FILE OPERATIONS ====================

  /// Check if a file is available offline
  Future<bool> isFileAvailableOffline(String fileId) async {
    final offlineSyncService = OfflineSyncService.instance;
    return await offlineSyncService.isFileAvailableOffline(fileId);
  }

  /// Mark a file for offline access
  Future<bool> markFileOffline({
    required String fileId,
    required String fileName,
    required String mimeType,
    required int size,
    required int version,
    String? fileUrl,
  }) async {
    if (_currentWorkspaceId == null) return false;

    final offlineSyncService = OfflineSyncService.instance;
    offlineSyncService.initialize(_currentWorkspaceId!);

    return await offlineSyncService.markFileOffline(
      fileId: fileId,
      fileName: fileName,
      mimeType: mimeType,
      size: size,
      version: version,
      fileUrl: fileUrl,
    );
  }

  /// Remove a file from offline access
  Future<bool> removeFileOffline(String fileId) async {
    final offlineSyncService = OfflineSyncService.instance;
    return await offlineSyncService.removeFileOffline(fileId);
  }

  /// Get all offline files for the current workspace
  Future<List<OfflineFileMetadata>> getOfflineFiles() async {
    if (_currentWorkspaceId == null) return [];

    final storageService = OfflineStorageService.instance;
    return await storageService.getOfflineFiles(_currentWorkspaceId!);
  }

  /// Get file bytes from offline cache or download if online
  Future<List<int>?> getFileBytes(String fileId) async {
    final offlineSyncService = OfflineSyncService.instance;
    final bytes = await offlineSyncService.getOfflineFileBlob(fileId);
    return bytes?.toList();
  }

  /// Dispose resources
  @override
  void dispose() {
    _uploadProgress.clear();
    _downloadProgress.clear();
    super.dispose();
  }
}
