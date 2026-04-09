import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../apps/models/google_drive_models.dart';
import '../apps/services/google_drive_service.dart';

/// Result item from Google Drive multi-select picker
class GoogleDrivePickerItem {
  final String id;
  final String title;
  final String? driveFileUrl;
  final String? driveThumbnailUrl;
  final String? driveMimeType;
  final int? driveFileSize;

  GoogleDrivePickerItem({
    required this.id,
    required this.title,
    this.driveFileUrl,
    this.driveThumbnailUrl,
    this.driveMimeType,
    this.driveFileSize,
  });

  factory GoogleDrivePickerItem.fromFile(GoogleDriveFile file) {
    return GoogleDrivePickerItem(
      id: file.id,
      title: file.name,
      driveFileUrl: file.webViewLink,
      driveThumbnailUrl: file.thumbnailLink,
      driveMimeType: file.mimeType,
      driveFileSize: file.size,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'title': title,
      'type': 'drive',
      'driveFileUrl': driveFileUrl,
      'driveThumbnailUrl': driveThumbnailUrl,
      'driveMimeType': driveMimeType,
      'driveFileSize': driveFileSize,
    };
  }
}

/// Google Drive multi-select file picker widget
/// Shows a modal to browse and select multiple files from Google Drive
class GoogleDriveMultiPicker extends StatefulWidget {
  final List<String>? allowedMimeTypes;
  final List<String>? allowedExtensions;
  final String? title;
  final int? maxSelections;

  const GoogleDriveMultiPicker({
    super.key,
    this.allowedMimeTypes,
    this.allowedExtensions,
    this.title,
    this.maxSelections,
  });

  /// Show the picker as a modal and return selected files
  static Future<List<GoogleDrivePickerItem>?> show({
    required BuildContext context,
    List<String>? allowedMimeTypes,
    List<String>? allowedExtensions,
    String? title,
    int? maxSelections,
  }) async {
    return showModalBottomSheet<List<GoogleDrivePickerItem>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => GoogleDriveMultiPicker(
        allowedMimeTypes: allowedMimeTypes,
        allowedExtensions: allowedExtensions,
        title: title,
        maxSelections: maxSelections,
      ),
    );
  }

  @override
  State<GoogleDriveMultiPicker> createState() => _GoogleDriveMultiPickerState();
}

class _GoogleDriveMultiPickerState extends State<GoogleDriveMultiPicker> {
  final GoogleDriveService _driveService = GoogleDriveService.instance;

  GoogleDriveConnection? _connection;
  List<GoogleDriveFile> _files = [];
  Set<String> _selectedFileIds = {};
  List<GoogleDriveFile> _selectedFiles = [];
  List<_BreadcrumbItem> _breadcrumbs = [];
  String _currentFolderId = 'root';
  String? _nextPageToken;

  bool _isCheckingConnection = true;
  bool _isLoading = false;
  bool _isLoadingMore = false;
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

  void _toggleFileSelection(GoogleDriveFile file) {
    if (file.isFolder) {
      _navigateToFolder(file);
      return;
    }

    setState(() {
      if (_selectedFileIds.contains(file.id)) {
        _selectedFileIds.remove(file.id);
        _selectedFiles.removeWhere((f) => f.id == file.id);
      } else {
        // Check max selections
        if (widget.maxSelections != null &&
            _selectedFiles.length >= widget.maxSelections!) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Maximum ${widget.maxSelections} files can be selected'),
              duration: const Duration(seconds: 2),
            ),
          );
          return;
        }
        _selectedFileIds.add(file.id);
        _selectedFiles.add(file);
      }
    });
  }

  void _confirmSelection() {
    final results = _selectedFiles
        .map((file) => GoogleDrivePickerItem.fromFile(file))
        .toList();
    Navigator.pop(context, results);
  }

  void _onSearch(String query) {
    setState(() {
      _searchQuery = query.isEmpty ? null : query;
    });
    _loadFiles(refresh: true);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

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
              else
                Expanded(
                  child: Column(
                    children: [
                      _buildSearchBar(context),
                      _buildBreadcrumbs(context),
                      Expanded(child: _buildFileList(context)),
                      if (_selectedFiles.isNotEmpty)
                        _buildSelectionBar(context, isDark),
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
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              color: Colors.green.withOpacity(0.1),
              borderRadius: BorderRadius.circular(6),
            ),
            child: const Icon(Icons.cloud, color: Colors.green, size: 18),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              widget.title ?? 'google_drive_picker.title'.tr(),
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          if (_connection != null && _connection!.googleEmail != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.green.withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (_connection!.googlePicture != null)
                    CircleAvatar(
                      radius: 10,
                      backgroundImage: NetworkImage(_connection!.googlePicture!),
                    )
                  else
                    const Icon(Icons.account_circle, size: 20, color: Colors.green),
                  const SizedBox(width: 6),
                  Text(
                    _connection!.googleEmail!.split('@').first,
                    style: const TextStyle(fontSize: 12, color: Colors.green),
                  ),
                ],
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
                  // Navigate to apps screen to connect Google Drive
                  Navigator.pushNamed(context, '/apps');
                },
                icon: const Icon(Icons.settings),
                label: Text('google_drive_picker.go_to_settings'.tr()),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green,
                  foregroundColor: Colors.white,
                ),
              ),
            ],
          ),
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
    final isSelected = _selectedFileIds.contains(file.id);

    return ListTile(
      leading: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (!file.isFolder)
            Checkbox(
              value: isSelected,
              onChanged: (_) => _toggleFileSelection(file),
              activeColor: Colors.green,
            ),
          _getFileIcon(file),
        ],
      ),
      title: Text(
        file.name,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
        ),
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
      selected: isSelected,
      selectedTileColor: Colors.green.withOpacity(0.1),
      onTap: () => _toggleFileSelection(file),
    );
  }

  Widget _buildSelectionBar(BuildContext context, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? Colors.grey[900] : Colors.grey[100],
        border: Border(
          top: BorderSide(color: Theme.of(context).dividerColor),
        ),
      ),
      child: SafeArea(
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.green.withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                '${_selectedFiles.length} selected',
                style: const TextStyle(
                  color: Colors.green,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: _selectedFiles.map((file) {
                    return Container(
                      margin: const EdgeInsets.only(right: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.green.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(color: Colors.green.withOpacity(0.3)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            file.name.length > 15
                                ? '${file.name.substring(0, 15)}...'
                                : file.name,
                            style: const TextStyle(fontSize: 12),
                          ),
                          const SizedBox(width: 4),
                          InkWell(
                            onTap: () => _toggleFileSelection(file),
                            child: const Icon(Icons.close, size: 14),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                ),
              ),
            ),
            const SizedBox(width: 12),
            ElevatedButton.icon(
              onPressed: _confirmSelection,
              icon: const Icon(Icons.check, size: 18),
              label: const Text('Attach'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              ),
            ),
          ],
        ),
      ),
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
