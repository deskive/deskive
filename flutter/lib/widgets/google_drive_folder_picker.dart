import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../apps/models/google_drive_models.dart';
import '../apps/services/google_drive_service.dart';

/// Result from Google Drive folder picker
class GoogleDriveFolderPickerResult {
  final String? folderId;
  final String? folderName;
  final String? folderPath;

  GoogleDriveFolderPickerResult({
    this.folderId,
    this.folderName,
    this.folderPath,
  });

  /// Returns true if root (My Drive) was selected
  bool get isRoot => folderId == null || folderId == 'root';
}

/// Google Drive folder picker widget for selecting export destination
/// Shows a modal to browse and select folders from Google Drive
class GoogleDriveFolderPicker extends StatefulWidget {
  final String? title;
  final String? subtitle;
  final bool allowCreateFolder;

  const GoogleDriveFolderPicker({
    super.key,
    this.title,
    this.subtitle,
    this.allowCreateFolder = true,
  });

  /// Show the picker as a modal and return selected folder
  static Future<GoogleDriveFolderPickerResult?> show({
    required BuildContext context,
    String? title,
    String? subtitle,
    bool allowCreateFolder = true,
  }) async {
    return showModalBottomSheet<GoogleDriveFolderPickerResult>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => GoogleDriveFolderPicker(
        title: title,
        subtitle: subtitle,
        allowCreateFolder: allowCreateFolder,
      ),
    );
  }

  @override
  State<GoogleDriveFolderPicker> createState() => _GoogleDriveFolderPickerState();
}

class _GoogleDriveFolderPickerState extends State<GoogleDriveFolderPicker> {
  final GoogleDriveService _driveService = GoogleDriveService.instance;

  GoogleDriveConnection? _connection;
  List<GoogleDriveFile> _folders = [];
  List<_BreadcrumbItem> _breadcrumbs = [];
  String _currentFolderId = 'root';
  String? _nextPageToken;

  bool _isCheckingConnection = true;
  bool _isLoading = false;
  bool _isLoadingMore = false;
  bool _isCreatingFolder = false;
  String? _error;

  final ScrollController _scrollController = ScrollController();
  final TextEditingController _newFolderController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _checkConnection();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _newFolderController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
            _scrollController.position.maxScrollExtent - 200 &&
        !_isLoadingMore &&
        _nextPageToken != null) {
      _loadFolders(pageToken: _nextPageToken);
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
          _loadFolders();
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

  Future<void> _loadFolders({String? pageToken, bool refresh = false}) async {
    if (refresh) {
      setState(() {
        _isLoading = true;
        _folders = [];
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
          fileType: 'folder',
          pageToken: pageToken,
          pageSize: 50,
        ),
      );

      if (mounted) {
        // Filter to only include folders
        final folders = response.files.where((f) => f.isFolder).toList();

        setState(() {
          if (pageToken != null) {
            _folders.addAll(folders);
          } else {
            _folders = folders;
          }
          _nextPageToken = response.nextPageToken;
          _isLoading = false;
          _isLoadingMore = false;
        });
      }
    } catch (e) {
      debugPrint('❌ Error loading folders: $e');
      if (mounted) {
        setState(() {
          _isLoading = false;
          _isLoadingMore = false;
          _error = e.toString();
        });
      }
    }
  }

  void _navigateToFolder(GoogleDriveFile folder) {
    setState(() {
      _breadcrumbs.add(_BreadcrumbItem(id: folder.id, name: folder.name));
      _currentFolderId = folder.id;
    });
    _loadFolders(refresh: true);
  }

  void _navigateToBreadcrumb(int index) {
    if (index < 0) {
      setState(() {
        _breadcrumbs = [];
        _currentFolderId = 'root';
      });
    } else {
      setState(() {
        _breadcrumbs = _breadcrumbs.sublist(0, index + 1);
        _currentFolderId = _breadcrumbs[index].id;
      });
    }
    _loadFolders(refresh: true);
  }

  void _selectCurrentFolder() {
    final folderPath = _breadcrumbs.isEmpty
        ? 'google_drive_export.my_drive'.tr()
        : 'My Drive / ${_breadcrumbs.map((b) => b.name).join(' / ')}';

    Navigator.pop(
      context,
      GoogleDriveFolderPickerResult(
        folderId: _currentFolderId == 'root' ? null : _currentFolderId,
        folderName: _breadcrumbs.isEmpty
            ? 'google_drive_export.my_drive'.tr()
            : _breadcrumbs.last.name,
        folderPath: folderPath,
      ),
    );
  }

  Future<void> _showCreateFolderDialog() async {
    _newFolderController.clear();

    final folderName = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('google_drive_export.create_folder'.tr()),
        content: TextField(
          controller: _newFolderController,
          autofocus: true,
          decoration: InputDecoration(
            labelText: 'google_drive_export.folder_name'.tr(),
            hintText: 'google_drive_export.folder_name_hint'.tr(),
            border: const OutlineInputBorder(),
          ),
          onSubmitted: (value) => Navigator.pop(context, value),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('common.cancel'.tr()),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, _newFolderController.text),
            child: Text('common.create'.tr()),
          ),
        ],
      ),
    );

    if (folderName != null && folderName.trim().isNotEmpty) {
      await _createFolder(folderName.trim());
    }
  }

  Future<void> _createFolder(String name) async {
    setState(() => _isCreatingFolder = true);

    try {
      final newFolder = await _driveService.createFolder(
        name,
        parentId: _currentFolderId == 'root' ? null : _currentFolderId,
      );

      if (mounted) {
        setState(() {
          _folders.insert(0, newFolder);
          _isCreatingFolder = false;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('google_drive_export.folder_created'.tr(args: [name])),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      debugPrint('❌ Error creating folder: $e');
      if (mounted) {
        setState(() => _isCreatingFolder = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('google_drive_export.folder_create_failed'.tr()),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: DraggableScrollableSheet(
        initialChildSize: 0.75,
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
                      _buildBreadcrumbs(context),
                      Expanded(child: _buildFolderList(context)),
                      _buildBottomBar(context),
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.pop(context),
              ),
              const SizedBox(width: 8),
              const Icon(Icons.cloud_upload, color: Color(0xFF4285F4), size: 24),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  widget.title ?? 'google_drive_export.select_folder'.tr(),
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
          if (widget.subtitle != null) ...[
            const SizedBox(height: 8),
            Text(
              widget.subtitle!,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.grey[600],
                  ),
            ),
          ],
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
                'google_drive_export.not_connected_title'.tr(),
                style: Theme.of(context).textTheme.titleLarge,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'google_drive_export.not_connected_subtitle'.tr(),
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Colors.grey[600],
                    ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              ElevatedButton.icon(
                onPressed: () {
                  Navigator.pop(context);
                  Navigator.pushNamed(context, '/apps');
                },
                icon: const Icon(Icons.settings),
                label: Text('google_drive_export.go_to_settings'.tr()),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBreadcrumbs(BuildContext context) {
    return Container(
      height: 48,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        border: Border(
          bottom: BorderSide(color: Theme.of(context).dividerColor),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                InkWell(
                  onTap: () => _navigateToBreadcrumb(-1),
                  borderRadius: BorderRadius.circular(4),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
                    child: Row(
                      children: [
                        const Icon(Icons.cloud, size: 18, color: Color(0xFF4285F4)),
                        const SizedBox(width: 4),
                        Text(
                          'google_drive_export.my_drive'.tr(),
                          style: TextStyle(
                            fontWeight: _breadcrumbs.isEmpty ? FontWeight.bold : FontWeight.normal,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                ..._breadcrumbs.asMap().entries.map((entry) {
                  final index = entry.key;
                  final item = entry.value;
                  final isLast = index == _breadcrumbs.length - 1;
                  return Row(
                    children: [
                      const Icon(Icons.chevron_right, size: 18, color: Colors.grey),
                      InkWell(
                        onTap: () => _navigateToBreadcrumb(index),
                        borderRadius: BorderRadius.circular(4),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
                          child: Text(
                            item.name,
                            style: TextStyle(
                              fontWeight: isLast ? FontWeight.bold : FontWeight.normal,
                            ),
                          ),
                        ),
                      ),
                    ],
                  );
                }),
              ],
            ),
          ),
          if (widget.allowCreateFolder && !_isCreatingFolder)
            IconButton(
              icon: const Icon(Icons.create_new_folder_outlined),
              tooltip: 'google_drive_export.create_folder'.tr(),
              onPressed: _showCreateFolderDialog,
            ),
          if (_isCreatingFolder)
            const SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
        ],
      ),
    );
  }

  Widget _buildFolderList(BuildContext context) {
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
              'google_drive_export.error_loading'.tr(),
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: () => _loadFolders(refresh: true),
              child: Text('common.retry'.tr()),
            ),
          ],
        ),
      );
    }

    if (_folders.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.folder_open, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              'google_drive_export.no_subfolders'.tr(),
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text(
              'google_drive_export.export_here_hint'.tr(),
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.grey[600],
                  ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => _loadFolders(refresh: true),
      child: ListView.builder(
        controller: _scrollController,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: _folders.length + (_isLoadingMore ? 1 : 0),
        itemBuilder: (context, index) {
          if (index == _folders.length) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: CircularProgressIndicator(),
              ),
            );
          }

          final folder = _folders[index];
          return _buildFolderItem(context, folder);
        },
      ),
    );
  }

  Widget _buildFolderItem(BuildContext context, GoogleDriveFile folder) {
    return ListTile(
      leading: const Icon(Icons.folder, color: Colors.amber, size: 40),
      title: Text(
        folder.name,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      subtitle: folder.modifiedTime != null
          ? Text(
              DateFormat('MMM dd, yyyy').format(folder.modifiedTime!),
              style: Theme.of(context).textTheme.bodySmall,
            )
          : null,
      trailing: const Icon(Icons.chevron_right),
      onTap: () => _navigateToFolder(folder),
    );
  }

  Widget _buildBottomBar(BuildContext context) {
    final currentPath = _breadcrumbs.isEmpty
        ? 'google_drive_export.my_drive'.tr()
        : _breadcrumbs.last.name;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        border: Border(
          top: BorderSide(color: Theme.of(context).dividerColor),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, -5),
          ),
        ],
      ),
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                const Icon(Icons.folder, color: Colors.amber, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'google_drive_export.export_to'.tr(args: [currentPath]),
                    style: Theme.of(context).textTheme.bodyMedium,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ElevatedButton.icon(
              onPressed: _selectCurrentFolder,
              icon: const Icon(Icons.check),
              label: Text('google_drive_export.select_this_folder'.tr()),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
                backgroundColor: const Color(0xFF4285F4),
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BreadcrumbItem {
  final String id;
  final String name;

  _BreadcrumbItem({required this.id, required this.name});
}
