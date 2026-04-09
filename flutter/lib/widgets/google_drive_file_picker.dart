import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/foundation.dart' show kIsWeb, debugPrint;
import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:path_provider/path_provider.dart';
import 'package:dio/dio.dart';
import '../apps/models/google_drive_models.dart';
import '../apps/services/google_drive_service.dart';
import '../config/app_config.dart';
import '../services/auth_service.dart';

/// Helper class for web download result
class _WebDownloadResult {
  final Uint8List bytes;
  final String url;
  _WebDownloadResult({required this.bytes, required this.url});
}

/// Result from Google Drive file picker
class GoogleDrivePickerResult {
  final GoogleDriveFile file;
  final dynamic localFile; // File on mobile, null on web
  final String? downloadUrl;
  final Uint8List? fileBytes; // For web platform

  GoogleDrivePickerResult({
    required this.file,
    this.localFile,
    this.downloadUrl,
    this.fileBytes,
  });
}

/// Google Drive file picker widget
/// Shows a modal to browse and select files from Google Drive
class GoogleDriveFilePicker extends StatefulWidget {
  final List<String>? allowedMimeTypes;
  final List<String>? allowedExtensions;
  final bool downloadFile;
  final String? title;

  const GoogleDriveFilePicker({
    super.key,
    this.allowedMimeTypes,
    this.allowedExtensions,
    this.downloadFile = true,
    this.title,
  });

  /// Show the picker as a modal and return selected file
  static Future<GoogleDrivePickerResult?> show({
    required BuildContext context,
    List<String>? allowedMimeTypes,
    List<String>? allowedExtensions,
    bool downloadFile = true,
    String? title,
  }) async {
    return showModalBottomSheet<GoogleDrivePickerResult>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => GoogleDriveFilePicker(
        allowedMimeTypes: allowedMimeTypes,
        allowedExtensions: allowedExtensions,
        downloadFile: downloadFile,
        title: title,
      ),
    );
  }

  @override
  State<GoogleDriveFilePicker> createState() => _GoogleDriveFilePickerState();
}

class _GoogleDriveFilePickerState extends State<GoogleDriveFilePicker> {
  final GoogleDriveService _driveService = GoogleDriveService.instance;

  GoogleDriveConnection? _connection;
  List<GoogleDriveFile> _files = [];
  List<_BreadcrumbItem> _breadcrumbs = [];
  String _currentFolderId = 'root';
  String? _nextPageToken;

  bool _isCheckingConnection = true;
  bool _isLoading = false;
  bool _isLoadingMore = false;
  bool _isDownloading = false;
  String? _error;
  String? _searchQuery;

  final ScrollController _scrollController = ScrollController();
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _checkConnection();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
            _scrollController.position.maxScrollExtent - 200 &&
        !_isLoadingMore &&
        _nextPageToken != null) {
      _loadFiles(pageToken: _nextPageToken);
    }
  }

  Future<void> _checkConnection() async {
    try {
      final connection = await _driveService.getConnection();
      if (mounted) {
        setState(() {
          _connection = connection;
          _isCheckingConnection = false;
        });
        if (connection != null && connection.isActive) {
          _loadFiles();
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isCheckingConnection = false;
          _error = e.toString();
        });
      }
    }
  }

  Future<void> _loadFiles({String? pageToken, bool refresh = false}) async {
    if (refresh) {
      setState(() {
        _isLoading = true;
        _files = [];
        _nextPageToken = null;
      });
    } else if (pageToken != null) {
      setState(() => _isLoadingMore = true);
    } else {
      setState(() => _isLoading = true);
    }

    try {
      final response = await _driveService.listFiles(
        params: ListFilesParams(
          folderId: _currentFolderId == 'root' ? null : _currentFolderId,
          query: _searchQuery,
          pageToken: pageToken,
          pageSize: 50,
        ),
      );

      if (mounted) {
        setState(() {
          if (pageToken != null) {
            _files.addAll(_filterFiles(response.files));
          } else {
            _files = _filterFiles(response.files);
          }
          _nextPageToken = response.nextPageToken;
          _isLoading = false;
          _isLoadingMore = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _isLoadingMore = false;
          _error = e.toString();
        });
      }
    }
  }

  List<GoogleDriveFile> _filterFiles(List<GoogleDriveFile> files) {
    return files.where((file) {
      // Always show folders for navigation
      if (file.isFolder) return true;

      // Filter by mime types if specified
      if (widget.allowedMimeTypes != null &&
          widget.allowedMimeTypes!.isNotEmpty) {
        if (!widget.allowedMimeTypes!.any((mime) =>
            file.mimeType.contains(mime) || mime.contains(file.mimeType))) {
          return false;
        }
      }

      // Filter by extensions if specified
      if (widget.allowedExtensions != null &&
          widget.allowedExtensions!.isNotEmpty) {
        final fileName = file.name.toLowerCase();
        if (!widget.allowedExtensions!
            .any((ext) => fileName.endsWith('.${ext.toLowerCase()}'))) {
          return false;
        }
      }

      return true;
    }).toList();
  }

  void _navigateToFolder(GoogleDriveFile folder) {
    setState(() {
      _breadcrumbs.add(_BreadcrumbItem(id: folder.id, name: folder.name));
      _currentFolderId = folder.id;
      _searchQuery = null;
      _searchController.clear();
    });
    _loadFiles(refresh: true);
  }

  void _navigateToBreadcrumb(int index) {
    if (index < 0) {
      setState(() {
        _breadcrumbs = [];
        _currentFolderId = 'root';
        _searchQuery = null;
        _searchController.clear();
      });
    } else {
      setState(() {
        _breadcrumbs = _breadcrumbs.sublist(0, index + 1);
        _currentFolderId = _breadcrumbs[index].id;
        _searchQuery = null;
        _searchController.clear();
      });
    }
    _loadFiles(refresh: true);
  }

  Future<void> _selectFile(GoogleDriveFile file) async {
    if (file.isFolder) {
      _navigateToFolder(file);
      return;
    }

    if (widget.downloadFile) {
      setState(() => _isDownloading = true);

      try {
        if (kIsWeb) {
          // On web, download as bytes
          final result = await _downloadFileAsBytes(file);
          if (mounted) {
            Navigator.pop(
              context,
              GoogleDrivePickerResult(
                file: file,
                fileBytes: result.bytes,
                downloadUrl: result.url,
              ),
            );
          }
        } else {
          // On mobile, download to local file
          final localFile = await _downloadFile(file);
          if (mounted) {
            Navigator.pop(
              context,
              GoogleDrivePickerResult(
                file: file,
                localFile: localFile,
              ),
            );
          }
        }
      } catch (e) {
        debugPrint('❌ Error selecting file: $e');
        if (mounted) {
          setState(() => _isDownloading = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('google_drive_picker.download_failed'.tr()),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } else {
      final workspaceId = await AppConfig.getCurrentWorkspaceId();
      Navigator.pop(
        context,
        GoogleDrivePickerResult(
          file: file,
          downloadUrl: workspaceId != null
              ? _driveService.getDownloadUrl(workspaceId, file.id)
              : null,
        ),
      );
    }
  }

  Future<File> _downloadFile(GoogleDriveFile file) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final downloadUrl = _driveService.getDownloadUrl(workspaceId, file.id);
    final tempDir = await getTemporaryDirectory();
    final filePath = '${tempDir.path}/${file.name}';

    debugPrint('📥 Downloading file from Google Drive...');
    debugPrint('   URL: $downloadUrl');
    debugPrint('   Target path: $filePath');

    final dio = Dio();
    final token = AuthService.instance.currentSession;
    if (token != null && token.isNotEmpty) {
      dio.options.headers['Authorization'] = 'Bearer $token';
    }

    // Add response validation
    dio.options.validateStatus = (status) => status != null && status < 500;

    try {
      final response = await dio.download(
        downloadUrl,
        filePath,
        onReceiveProgress: (received, total) {
          if (total != -1) {
            debugPrint('📥 Download progress: ${(received / total * 100).toStringAsFixed(0)}%');
          }
        },
      );

      // Check if download was successful
      if (response.statusCode != 200) {
        debugPrint('❌ Download failed with status: ${response.statusCode}');
        throw Exception('Download failed: HTTP ${response.statusCode}');
      }

      // Verify file exists and has content
      final downloadedFile = File(filePath);
      if (!await downloadedFile.exists()) {
        throw Exception('Downloaded file not found at $filePath');
      }

      final fileSize = await downloadedFile.length();
      debugPrint('✅ File downloaded successfully: ${_formatFileSize(fileSize.toInt())}');

      if (fileSize == 0) {
        throw Exception('Downloaded file is empty');
      }

      return downloadedFile;
    } catch (e) {
      debugPrint('❌ Error downloading file: $e');
      // Clean up partial download
      final partialFile = File(filePath);
      if (await partialFile.exists()) {
        await partialFile.delete();
      }
      rethrow;
    }
  }

  /// Download file as bytes (for web platform)
  Future<_WebDownloadResult> _downloadFileAsBytes(GoogleDriveFile file) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final downloadUrl = _driveService.getDownloadUrl(workspaceId, file.id);

    debugPrint('📥 Downloading file from Google Drive (web)...');
    debugPrint('   URL: $downloadUrl');

    final dio = Dio();
    final token = AuthService.instance.currentSession;
    if (token != null && token.isNotEmpty) {
      dio.options.headers['Authorization'] = 'Bearer $token';
    }

    dio.options.responseType = ResponseType.bytes;
    dio.options.validateStatus = (status) => status != null && status < 500;

    try {
      final response = await dio.get<List<int>>(
        downloadUrl,
        onReceiveProgress: (received, total) {
          if (total != -1) {
            debugPrint('📥 Download progress: ${(received / total * 100).toStringAsFixed(0)}%');
          }
        },
      );

      if (response.statusCode != 200) {
        debugPrint('❌ Download failed with status: ${response.statusCode}');
        throw Exception('Download failed: HTTP ${response.statusCode}');
      }

      final bytes = Uint8List.fromList(response.data ?? []);
      debugPrint('✅ File downloaded successfully: ${_formatFileSize(bytes.length)}');

      if (bytes.isEmpty) {
        throw Exception('Downloaded file is empty');
      }

      return _WebDownloadResult(bytes: bytes, url: downloadUrl);
    } catch (e) {
      debugPrint('❌ Error downloading file: $e');
      rethrow;
    }
  }

  void _onSearch(String query) {
    setState(() {
      _searchQuery = query.isEmpty ? null : query;
    });
    _loadFiles(refresh: true);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: DraggableScrollableSheet(
        initialChildSize: 0.85,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) {
          return Column(
            children: [
              _buildHeader(context),
              if (_isCheckingConnection)
                const Expanded(
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (_connection == null || !_connection!.isActive)
                _buildNotConnectedView(context)
              else if (_isDownloading)
                _buildDownloadingView(context)
              else
                Expanded(
                  child: Column(
                    children: [
                      _buildSearchBar(context),
                      _buildBreadcrumbs(context),
                      Expanded(child: _buildFileList(context)),
                    ],
                  ),
                ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(color: Theme.of(context).dividerColor),
        ),
      ),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.close),
            onPressed: () => Navigator.pop(context),
          ),
          const SizedBox(width: 8),
          const Icon(Icons.cloud, color: Color(0xFF4285F4), size: 24),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              widget.title ?? 'google_drive_picker.title'.tr(),
              style: Theme.of(context).textTheme.titleLarge,
            ),
          ),
          if (_connection != null && _connection!.googleEmail != null)
            Chip(
              avatar: _connection!.googlePicture != null
                  ? CircleAvatar(
                      backgroundImage:
                          NetworkImage(_connection!.googlePicture!),
                    )
                  : null,
              label: Text(
                _connection!.googleEmail!,
                style: const TextStyle(fontSize: 12),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildNotConnectedView(BuildContext context) {
    return Expanded(
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.cloud_off,
                size: 80,
                color: Colors.grey[400],
              ),
              const SizedBox(height: 24),
              Text(
                'google_drive_picker.not_connected_title'.tr(),
                style: Theme.of(context).textTheme.titleLarge,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'google_drive_picker.not_connected_subtitle'.tr(),
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Colors.grey[600],
                    ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              ElevatedButton.icon(
                onPressed: () {
                  Navigator.pop(context);
                  // Navigate to integrations screen
                  Navigator.pushNamed(context, '/integrations');
                },
                icon: const Icon(Icons.settings),
                label: Text('google_drive_picker.go_to_settings'.tr()),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDownloadingView(BuildContext context) {
    return Expanded(
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: 24),
            Text(
              'google_drive_picker.downloading'.tr(),
              style: Theme.of(context).textTheme.titleMedium,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSearchBar(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: TextField(
        controller: _searchController,
        decoration: InputDecoration(
          hintText: 'google_drive_picker.search_files'.tr(),
          prefixIcon: const Icon(Icons.search),
          suffixIcon: _searchQuery != null
              ? IconButton(
                  icon: const Icon(Icons.clear),
                  onPressed: () {
                    _searchController.clear();
                    _onSearch('');
                  },
                )
              : null,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
          ),
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        ),
        onSubmitted: _onSearch,
      ),
    );
  }

  Widget _buildBreadcrumbs(BuildContext context) {
    return Container(
      height: 40,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: [
          InkWell(
            onTap: () => _navigateToBreadcrumb(-1),
            borderRadius: BorderRadius.circular(4),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              child: Row(
                children: [
                  const Icon(Icons.home, size: 18),
                  const SizedBox(width: 4),
                  Text('google_drive_picker.my_drive'.tr()),
                ],
              ),
            ),
          ),
          ..._breadcrumbs.asMap().entries.map((entry) {
            final index = entry.key;
            final item = entry.value;
            return Row(
              children: [
                const Icon(Icons.chevron_right, size: 18, color: Colors.grey),
                InkWell(
                  onTap: () => _navigateToBreadcrumb(index),
                  borderRadius: BorderRadius.circular(4),
                  child: Padding(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                    child: Text(
                      item.name,
                      style: TextStyle(
                        fontWeight: index == _breadcrumbs.length - 1
                            ? FontWeight.bold
                            : FontWeight.normal,
                      ),
                    ),
                  ),
                ),
              ],
            );
          }),
        ],
      ),
    );
  }

  Widget _buildFileList(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 64, color: Colors.red[300]),
            const SizedBox(height: 16),
            Text(
              'google_drive_picker.error_loading'.tr(),
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: () => _loadFiles(refresh: true),
              child: Text('common.retry'.tr()),
            ),
          ],
        ),
      );
    }

    if (_files.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.folder_open, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              _searchQuery != null
                  ? 'google_drive_picker.no_results'.tr()
                  : 'google_drive_picker.empty_folder'.tr(),
              style: Theme.of(context).textTheme.titleMedium,
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => _loadFiles(refresh: true),
      child: ListView.builder(
        controller: _scrollController,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: _files.length + (_isLoadingMore ? 1 : 0),
        itemBuilder: (context, index) {
          if (index == _files.length) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: CircularProgressIndicator(),
              ),
            );
          }

          final file = _files[index];
          return _buildFileItem(context, file);
        },
      ),
    );
  }

  Widget _buildFileItem(BuildContext context, GoogleDriveFile file) {
    return ListTile(
      leading: _getFileIcon(file),
      title: Text(
        file.name,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      subtitle: file.modifiedTime != null
          ? Text(
              DateFormat('MMM dd, yyyy').format(file.modifiedTime!),
              style: Theme.of(context).textTheme.bodySmall,
            )
          : null,
      trailing: file.isFolder
          ? const Icon(Icons.chevron_right)
          : file.size != null
              ? Text(
                  _formatFileSize(file.size!),
                  style: Theme.of(context).textTheme.bodySmall,
                )
              : null,
      onTap: () => _selectFile(file),
    );
  }

  Widget _getFileIcon(GoogleDriveFile file) {
    IconData iconData;
    Color iconColor;

    switch (file.fileType) {
      case GoogleDriveFileType.folder:
        iconData = Icons.folder;
        iconColor = Colors.amber;
        break;
      case GoogleDriveFileType.document:
        iconData = Icons.article;
        iconColor = Colors.blue;
        break;
      case GoogleDriveFileType.spreadsheet:
        iconData = Icons.table_chart;
        iconColor = Colors.green;
        break;
      case GoogleDriveFileType.presentation:
        iconData = Icons.slideshow;
        iconColor = Colors.orange;
        break;
      case GoogleDriveFileType.image:
        iconData = Icons.image;
        iconColor = Colors.purple;
        break;
      case GoogleDriveFileType.video:
        iconData = Icons.video_file;
        iconColor = Colors.red;
        break;
      case GoogleDriveFileType.pdf:
        iconData = Icons.picture_as_pdf;
        iconColor = Colors.red;
        break;
      default:
        iconData = Icons.insert_drive_file;
        iconColor = Colors.grey;
    }

    if (file.thumbnailLink != null && !file.isFolder) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(4),
        child: Image.network(
          file.thumbnailLink!,
          width: 40,
          height: 40,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stack) => Icon(
            iconData,
            color: iconColor,
            size: 40,
          ),
        ),
      );
    }

    return Icon(iconData, color: iconColor, size: 40);
  }

  String _formatFileSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    if (bytes < 1024 * 1024 * 1024) {
      return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    }
    return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
  }
}

class _BreadcrumbItem {
  final String id;
  final String name;

  _BreadcrumbItem({required this.id, required this.name});
}
