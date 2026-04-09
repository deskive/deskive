import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:url_launcher/url_launcher.dart';
import 'models/google_drive_models.dart';
import 'services/google_drive_service.dart';

/// Google Drive file browser screen
class GoogleDriveBrowserScreen extends StatefulWidget {
  const GoogleDriveBrowserScreen({super.key});

  @override
  State<GoogleDriveBrowserScreen> createState() => _GoogleDriveBrowserScreenState();
}

class _GoogleDriveBrowserScreenState extends State<GoogleDriveBrowserScreen> {
  final GoogleDriveService _service = GoogleDriveService.instance;

  List<GoogleDriveFile> _files = [];
  List<_BreadcrumbItem> _breadcrumbs = [];
  String _currentFolderId = 'root';
  String? _nextPageToken;

  bool _isLoading = true;
  bool _isLoadingMore = false;
  String? _searchQuery;

  // View mode: grid or list
  bool _isGridView = true;

  @override
  void initState() {
    super.initState();
    _loadFiles();
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
      final response = await _service.listFiles(
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
            _files.addAll(response.files);
          } else {
            _files = response.files;
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
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('apps.google_drive.load_failed'.tr()),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _navigateToFolder(GoogleDriveFile folder) {
    setState(() {
      _breadcrumbs.add(_BreadcrumbItem(id: folder.id, name: folder.name));
      _currentFolderId = folder.id;
      _searchQuery = null;
    });
    _loadFiles(refresh: true);
  }

  void _navigateToBreadcrumb(int index) {
    if (index < 0) {
      // Navigate to root
      setState(() {
        _breadcrumbs = [];
        _currentFolderId = 'root';
        _searchQuery = null;
      });
    } else {
      // Navigate to specific breadcrumb
      setState(() {
        _breadcrumbs = _breadcrumbs.sublist(0, index + 1);
        _currentFolderId = _breadcrumbs[index].id;
        _searchQuery = null;
      });
    }
    _loadFiles(refresh: true);
  }

  Future<void> _openFile(GoogleDriveFile file) async {
    if (file.isFolder) {
      _navigateToFolder(file);
    } else if (file.webViewLink != null) {
      final uri = Uri.parse(file.webViewLink!);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    }
  }

  Future<void> _importFile(GoogleDriveFile file) async {
    try {
      // Show loading indicator
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => AlertDialog(
          content: Row(
            children: [
              const CircularProgressIndicator(),
              const SizedBox(width: 16),
              Text('apps.google_drive.importing'.tr()),
            ],
          ),
        ),
      );

      await _service.importFile(fileId: file.id);

      if (mounted) {
        Navigator.pop(context); // Close loading dialog
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('apps.google_drive.import_success'.tr(args: [file.name])),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        Navigator.pop(context); // Close loading dialog
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('apps.google_drive.import_failed'.tr()),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _deleteFile(GoogleDriveFile file) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('apps.google_drive.delete_file'.tr()),
        content: Text('apps.google_drive.delete_confirm'.tr(args: [file.name])),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('common.cancel'.tr()),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: Text('common.delete'.tr()),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      await _service.deleteFile(file.id);
      if (mounted) {
        setState(() {
          _files.removeWhere((f) => f.id == file.id);
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('apps.google_drive.file_deleted'.tr()),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('apps.google_drive.delete_failed'.tr()),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _createFolder() async {
    final controller = TextEditingController();
    final name = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('apps.google_drive.create_folder'.tr()),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: InputDecoration(
            hintText: 'apps.google_drive.folder_name'.tr(),
            border: const OutlineInputBorder(),
          ),
          onSubmitted: (value) => Navigator.pop(context, value),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('common.cancel'.tr()),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, controller.text),
            child: Text('common.create'.tr()),
          ),
        ],
      ),
    );

    if (name == null || name.trim().isEmpty) return;

    try {
      final folder = await _service.createFolder(
        name.trim(),
        parentId: _currentFolderId == 'root' ? null : _currentFolderId,
      );
      if (mounted) {
        setState(() {
          _files.insert(0, folder);
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('apps.google_drive.folder_created'.tr()),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('apps.google_drive.create_folder_failed'.tr()),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _showSearch() {
    showSearch(
      context: context,
      delegate: _GoogleDriveSearchDelegate(
        onSearch: (query) {
          setState(() {
            _searchQuery = query;
            _breadcrumbs = [];
            _currentFolderId = 'root';
          });
          _loadFiles(refresh: true);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Sort files: folders first, then by name
    final sortedFiles = List<GoogleDriveFile>.from(_files)
      ..sort((a, b) {
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
        return a.name.toLowerCase().compareTo(b.name.toLowerCase());
      });

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
        title: Row(
          children: [
            const _GoogleDriveMiniLogo(),
            const SizedBox(width: 8),
            Text('apps.google_drive.title'.tr()),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: _showSearch,
          ),
          IconButton(
            icon: Icon(_isGridView ? Icons.view_list : Icons.grid_view),
            onPressed: () => setState(() => _isGridView = !_isGridView),
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => _loadFiles(refresh: true),
          ),
        ],
      ),
      body: Column(
        children: [
          // Breadcrumb navigation
          if (_breadcrumbs.isNotEmpty || _searchQuery != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: Theme.of(context).colorScheme.surfaceContainerHighest,
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: _searchQuery != null
                    ? Row(
                        children: [
                          const Icon(Icons.search, size: 18),
                          const SizedBox(width: 8),
                          Text(
                            'apps.google_drive.search_results'.tr(args: [_searchQuery!]),
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                          const SizedBox(width: 8),
                          IconButton(
                            icon: const Icon(Icons.close, size: 18),
                            onPressed: () {
                              setState(() => _searchQuery = null);
                              _loadFiles(refresh: true);
                            },
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                          ),
                        ],
                      )
                    : Row(
                        children: [
                          InkWell(
                            onTap: () => _navigateToBreadcrumb(-1),
                            child: const Icon(Icons.home, size: 20),
                          ),
                          for (int i = 0; i < _breadcrumbs.length; i++) ...[
                            const Icon(Icons.chevron_right, size: 18),
                            InkWell(
                              onTap: () => _navigateToBreadcrumb(i),
                              child: Padding(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 4,
                                  vertical: 4,
                                ),
                                child: Text(
                                  _breadcrumbs[i].name,
                                  style: i == _breadcrumbs.length - 1
                                      ? Theme.of(context).textTheme.bodyMedium?.copyWith(
                                            fontWeight: FontWeight.bold,
                                          )
                                      : Theme.of(context).textTheme.bodyMedium,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
              ),
            ),

          // File list
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : sortedFiles.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.folder_open,
                              size: 64,
                              color: Theme.of(context).colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'apps.google_drive.empty_folder'.tr(),
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                                  ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'apps.google_drive.empty_folder_hint'.tr(),
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                                  ),
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: () => _loadFiles(refresh: true),
                        child: _isGridView
                            ? _buildGridView(sortedFiles)
                            : _buildListView(sortedFiles),
                      ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _createFolder,
        child: const Icon(Icons.create_new_folder),
      ),
    );
  }

  Widget _buildGridView(List<GoogleDriveFile> files) {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 0.95,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: files.length + (_nextPageToken != null ? 1 : 0),
      itemBuilder: (context, index) {
        if (index >= files.length) {
          return _buildLoadMoreButton();
        }
        return _FileGridItem(
          file: files[index],
          onTap: () => _openFile(files[index]),
          onImport: files[index].isFolder ? null : () => _importFile(files[index]),
          onDelete: () => _deleteFile(files[index]),
        );
      },
    );
  }

  Widget _buildListView(List<GoogleDriveFile> files) {
    return ListView.builder(
      itemCount: files.length + (_nextPageToken != null ? 1 : 0),
      itemBuilder: (context, index) {
        if (index >= files.length) {
          return _buildLoadMoreButton();
        }
        return _FileListItem(
          file: files[index],
          onTap: () => _openFile(files[index]),
          onImport: files[index].isFolder ? null : () => _importFile(files[index]),
          onDelete: () => _deleteFile(files[index]),
        );
      },
    );
  }

  Widget _buildLoadMoreButton() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Center(
        child: _isLoadingMore
            ? const CircularProgressIndicator()
            : OutlinedButton(
                onPressed: () => _loadFiles(pageToken: _nextPageToken),
                child: Text('apps.google_drive.load_more'.tr()),
              ),
      ),
    );
  }
}

/// Breadcrumb item
class _BreadcrumbItem {
  final String id;
  final String name;

  _BreadcrumbItem({required this.id, required this.name});
}

/// File grid item widget
class _FileGridItem extends StatelessWidget {
  final GoogleDriveFile file;
  final VoidCallback onTap;
  final VoidCallback? onImport;
  final VoidCallback onDelete;

  const _FileGridItem({
    required this.file,
    required this.onTap,
    this.onImport,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              // Thumbnail or icon
              if (file.thumbnailLink != null && !file.isFolder)
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.network(
                    file.thumbnailLink!,
                    width: 40,
                    height: 40,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) => _FileTypeIcon(fileType: file.fileType, size: 36),
                  ),
                )
              else
                _FileTypeIcon(fileType: file.fileType, size: 36),

              const SizedBox(height: 6),

              // File name - use Flexible to prevent overflow
              Flexible(
                child: Text(
                  file.name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),

              // File size
              if (!file.isFolder && file.size != null)
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Text(
                    _formatFileSize(file.size!),
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                  ),
                ),

              const SizedBox(height: 4),

              // Actions - compact row
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (onImport != null)
                    SizedBox(
                      width: 32,
                      height: 32,
                      child: IconButton(
                        icon: const Icon(Icons.download, size: 16),
                        onPressed: onImport,
                        tooltip: 'apps.google_drive.import'.tr(),
                        padding: EdgeInsets.zero,
                        visualDensity: VisualDensity.compact,
                      ),
                    ),
                  SizedBox(
                    width: 32,
                    height: 32,
                    child: IconButton(
                      icon: const Icon(Icons.delete_outline, size: 16),
                      onPressed: onDelete,
                      tooltip: 'common.delete'.tr(),
                      padding: EdgeInsets.zero,
                      visualDensity: VisualDensity.compact,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// File list item widget
class _FileListItem extends StatelessWidget {
  final GoogleDriveFile file;
  final VoidCallback onTap;
  final VoidCallback? onImport;
  final VoidCallback onDelete;

  const _FileListItem({
    required this.file,
    required this.onTap,
    this.onImport,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: _FileTypeIcon(fileType: file.fileType, size: 32),
      title: Text(
        file.name,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      subtitle: Row(
        children: [
          if (!file.isFolder && file.size != null) ...[
            Text(
              _formatFileSize(file.size!),
              style: Theme.of(context).textTheme.labelSmall,
            ),
            const SizedBox(width: 8),
          ],
          if (file.modifiedTime != null)
            Text(
              _formatDate(file.modifiedTime!),
              style: Theme.of(context).textTheme.labelSmall,
            ),
        ],
      ),
      trailing: PopupMenuButton<String>(
        itemBuilder: (context) => [
          if (onImport != null)
            PopupMenuItem(
              value: 'import',
              child: Row(
                children: [
                  const Icon(Icons.download, size: 20),
                  const SizedBox(width: 8),
                  Text('apps.google_drive.import_to_deskive'.tr()),
                ],
              ),
            ),
          if (file.webViewLink != null)
            PopupMenuItem(
              value: 'open_external',
              child: Row(
                children: [
                  const Icon(Icons.open_in_new, size: 20),
                  const SizedBox(width: 8),
                  Text('apps.google_drive.open_in_drive'.tr()),
                ],
              ),
            ),
          PopupMenuItem(
            value: 'delete',
            child: Row(
              children: [
                const Icon(Icons.delete_outline, size: 20, color: Colors.red),
                const SizedBox(width: 8),
                Text(
                  'common.delete'.tr(),
                  style: const TextStyle(color: Colors.red),
                ),
              ],
            ),
          ),
        ],
        onSelected: (value) async {
          switch (value) {
            case 'import':
              onImport?.call();
              break;
            case 'open_external':
              if (file.webViewLink != null) {
                final uri = Uri.parse(file.webViewLink!);
                if (await canLaunchUrl(uri)) {
                  await launchUrl(uri, mode: LaunchMode.externalApplication);
                }
              }
              break;
            case 'delete':
              onDelete();
              break;
          }
        },
      ),
      onTap: onTap,
    );
  }
}

/// File type icon widget
class _FileTypeIcon extends StatelessWidget {
  final GoogleDriveFileType fileType;
  final double size;

  const _FileTypeIcon({
    required this.fileType,
    required this.size,
  });

  @override
  Widget build(BuildContext context) {
    IconData icon;
    Color color;

    switch (fileType) {
      case GoogleDriveFileType.folder:
        icon = Icons.folder;
        color = Colors.amber;
        break;
      case GoogleDriveFileType.document:
        icon = Icons.description;
        color = Colors.blue;
        break;
      case GoogleDriveFileType.spreadsheet:
        icon = Icons.table_chart;
        color = Colors.green;
        break;
      case GoogleDriveFileType.presentation:
        icon = Icons.slideshow;
        color = Colors.orange;
        break;
      case GoogleDriveFileType.image:
        icon = Icons.image;
        color = Colors.purple;
        break;
      case GoogleDriveFileType.video:
        icon = Icons.video_file;
        color = Colors.red;
        break;
      case GoogleDriveFileType.pdf:
        icon = Icons.picture_as_pdf;
        color = Colors.red.shade700;
        break;
      default:
        icon = Icons.insert_drive_file;
        color = Colors.grey;
    }

    return Icon(icon, size: size, color: color);
  }
}

/// Google Drive mini logo for app bar
class _GoogleDriveMiniLogo extends StatelessWidget {
  const _GoogleDriveMiniLogo();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 24,
      height: 24,
      child: CustomPaint(
        painter: _GoogleDriveMiniLogoPainter(),
      ),
    );
  }
}

class _GoogleDriveMiniLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final double scale = size.width / 87.3;
    final double heightScale = size.height / 78;

    // Blue bottom
    final bluePath = Path();
    bluePath.moveTo(6.6 * scale, 66.85 * heightScale);
    bluePath.lineTo(15.9 * scale, 78 * heightScale);
    bluePath.lineTo(71.4 * scale, 78 * heightScale);
    bluePath.lineTo(80.7 * scale, 66.85 * heightScale);
    bluePath.close();
    canvas.drawPath(bluePath, Paint()..color = const Color(0xFF0066DA));

    // Green left
    final greenPath = Path();
    greenPath.moveTo(57.6 * scale, 0);
    greenPath.lineTo(29.4 * scale, 0);
    greenPath.lineTo(0, 48.1 * heightScale);
    greenPath.lineTo(14.8 * scale, 67 * heightScale);
    greenPath.lineTo(43.6 * scale, 18.8 * heightScale);
    greenPath.close();
    canvas.drawPath(greenPath, Paint()..color = const Color(0xFF00AC47));

    // Red top right
    final redPath = Path();
    redPath.moveTo(29.4 * scale, 0);
    redPath.lineTo(57.6 * scale, 0);
    redPath.lineTo(87.3 * scale, 48.1 * heightScale);
    redPath.lineTo(29.1 * scale, 48.1 * heightScale);
    redPath.close();
    canvas.drawPath(redPath, Paint()..color = const Color(0xFFEA4335));

    // Dark green bottom
    final darkGreenPath = Path();
    darkGreenPath.moveTo(29.1 * scale, 48.1 * heightScale);
    darkGreenPath.lineTo(87.3 * scale, 48.1 * heightScale);
    darkGreenPath.lineTo(78.1 * scale, 67 * heightScale);
    darkGreenPath.lineTo(14.8 * scale, 67 * heightScale);
    darkGreenPath.close();
    canvas.drawPath(darkGreenPath, Paint()..color = const Color(0xFF00832D));

    // Light blue center
    final lightBluePath = Path();
    lightBluePath.moveTo(57.6 * scale, 0);
    lightBluePath.lineTo(29.1 * scale, 48.1 * heightScale);
    lightBluePath.lineTo(87.3 * scale, 48.1 * heightScale);
    lightBluePath.close();
    canvas.drawPath(lightBluePath, Paint()..color = const Color(0xFF2684FC));

    // Yellow corner
    final yellowPath = Path();
    yellowPath.moveTo(0, 48.1 * heightScale);
    yellowPath.lineTo(14.8 * scale, 67 * heightScale);
    yellowPath.lineTo(29.1 * scale, 48.1 * heightScale);
    yellowPath.close();
    canvas.drawPath(yellowPath, Paint()..color = const Color(0xFFFFBA00));
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Search delegate for Google Drive
class _GoogleDriveSearchDelegate extends SearchDelegate<String> {
  final Function(String) onSearch;

  _GoogleDriveSearchDelegate({required this.onSearch});

  @override
  List<Widget> buildActions(BuildContext context) {
    return [
      IconButton(
        icon: const Icon(Icons.clear),
        onPressed: () => query = '',
      ),
    ];
  }

  @override
  Widget buildLeading(BuildContext context) {
    return IconButton(
      icon: const Icon(Icons.arrow_back),
      onPressed: () => close(context, ''),
    );
  }

  @override
  Widget buildResults(BuildContext context) {
    if (query.isNotEmpty) {
      onSearch(query);
      close(context, query);
    }
    return const SizedBox.shrink();
  }

  @override
  Widget buildSuggestions(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.search,
            size: 64,
            color: Theme.of(context).colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
          ),
          const SizedBox(height: 16),
          Text(
            'apps.google_drive.search_hint'.tr(),
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
          ),
        ],
      ),
    );
  }
}

/// Format file size to human readable string
String _formatFileSize(int bytes) {
  if (bytes < 1024) return '$bytes B';
  if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
  if (bytes < 1024 * 1024 * 1024) {
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
  return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
}

/// Format date to relative string
String _formatDate(DateTime date) {
  final now = DateTime.now();
  final diff = now.difference(date);

  if (diff.inDays == 0) return 'Today';
  if (diff.inDays == 1) return 'Yesterday';
  if (diff.inDays < 7) return '${diff.inDays} days ago';
  return DateFormat.yMMMd().format(date);
}
