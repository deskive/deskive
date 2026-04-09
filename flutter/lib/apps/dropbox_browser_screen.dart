import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:url_launcher/url_launcher.dart';
import 'models/dropbox_models.dart';
import 'services/dropbox_service.dart';

/// Dropbox file browser screen
class DropboxBrowserScreen extends StatefulWidget {
  const DropboxBrowserScreen({super.key});

  @override
  State<DropboxBrowserScreen> createState() => _DropboxBrowserScreenState();
}

class _DropboxBrowserScreenState extends State<DropboxBrowserScreen> {
  final DropboxService _service = DropboxService.instance;

  List<DropboxFile> _files = [];
  List<_BreadcrumbItem> _breadcrumbs = [];
  String _currentPath = '';
  String? _nextCursor;
  bool _hasMore = false;

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

  Future<void> _loadFiles({String? cursor, bool refresh = false}) async {
    if (refresh) {
      setState(() {
        _isLoading = true;
        _files = [];
        _nextCursor = null;
        _hasMore = false;
      });
    } else if (cursor != null) {
      setState(() => _isLoadingMore = true);
    } else {
      setState(() => _isLoading = true);
    }

    try {
      final response = await _service.listFiles(
        params: DropboxListFilesParams(
          path: _currentPath.isEmpty ? '' : _currentPath,
          query: _searchQuery,
          cursor: cursor,
          limit: 50,
        ),
      );

      if (mounted) {
        setState(() {
          if (cursor != null) {
            _files.addAll(response.files);
          } else {
            _files = response.files;
          }
          _nextCursor = response.cursor;
          _hasMore = response.hasMore;
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
            content: Text('apps.dropbox.load_failed'.tr()),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _navigateToFolder(DropboxFile folder) {
    setState(() {
      _breadcrumbs.add(_BreadcrumbItem(path: folder.pathLower, name: folder.name));
      _currentPath = folder.pathLower;
      _searchQuery = null;
    });
    _loadFiles(refresh: true);
  }

  void _navigateToBreadcrumb(int index) {
    if (index < 0) {
      // Navigate to root
      setState(() {
        _breadcrumbs = [];
        _currentPath = '';
        _searchQuery = null;
      });
    } else {
      // Navigate to specific breadcrumb
      setState(() {
        _breadcrumbs = _breadcrumbs.sublist(0, index + 1);
        _currentPath = _breadcrumbs[index].path;
        _searchQuery = null;
      });
    }
    _loadFiles(refresh: true);
  }

  Future<void> _openFile(DropboxFile file) async {
    if (file.isFolder) {
      _navigateToFolder(file);
    } else {
      // Get temporary link and open in browser
      try {
        final link = await _service.getTemporaryLink(file.pathLower);
        if (link.isNotEmpty) {
          final uri = Uri.parse(link);
          if (await canLaunchUrl(uri)) {
            await launchUrl(uri, mode: LaunchMode.externalApplication);
          }
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('apps.dropbox.open_failed'.tr()),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    }
  }

  Future<void> _importFile(DropboxFile file) async {
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
              Text('apps.dropbox.importing'.tr()),
            ],
          ),
        ),
      );

      await _service.importFile(path: file.pathLower);

      if (mounted) {
        Navigator.pop(context); // Close loading dialog
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('apps.dropbox.import_success'.tr(args: [file.name])),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        Navigator.pop(context); // Close loading dialog
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('apps.dropbox.import_failed'.tr()),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _shareFile(DropboxFile file) async {
    try {
      final result = await _service.shareFile(path: file.pathLower);

      if (mounted) {
        // Copy link to clipboard would be nice, but for now show a dialog
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            title: Text('apps.dropbox.share_link'.tr()),
            content: SelectableText(result.url),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: Text('common.close'.tr()),
              ),
              TextButton(
                onPressed: () async {
                  final uri = Uri.parse(result.url);
                  if (await canLaunchUrl(uri)) {
                    await launchUrl(uri, mode: LaunchMode.externalApplication);
                  }
                  if (mounted) Navigator.pop(context);
                },
                child: Text('apps.dropbox.open_link'.tr()),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('apps.dropbox.share_failed'.tr()),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _deleteFile(DropboxFile file) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('apps.dropbox.delete_file'.tr()),
        content: Text('apps.dropbox.delete_confirm'.tr(args: [file.name])),
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
      await _service.deleteFile(file.pathLower);
      if (mounted) {
        setState(() {
          _files.removeWhere((f) => f.pathLower == file.pathLower);
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('apps.dropbox.file_deleted'.tr()),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('apps.dropbox.delete_failed'.tr()),
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
        title: Text('apps.dropbox.create_folder'.tr()),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: InputDecoration(
            hintText: 'apps.dropbox.folder_name'.tr(),
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
      final folderPath = _currentPath.isEmpty
          ? '/${name.trim()}'
          : '$_currentPath/${name.trim()}';

      final folder = await _service.createFolder(folderPath);
      if (mounted) {
        setState(() {
          _files.insert(0, folder);
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('apps.dropbox.folder_created'.tr()),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('apps.dropbox.create_folder_failed'.tr()),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _showSearch() {
    showSearch(
      context: context,
      delegate: _DropboxSearchDelegate(
        onSearch: (query) {
          setState(() {
            _searchQuery = query;
            _breadcrumbs = [];
            _currentPath = '';
          });
          _loadFiles(refresh: true);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Sort files: folders first, then by name
    final sortedFiles = List<DropboxFile>.from(_files)
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
            const _DropboxMiniLogo(),
            const SizedBox(width: 8),
            Text('apps.dropbox.title'.tr()),
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
                            'apps.dropbox.search_results'.tr(args: [_searchQuery!]),
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
                              'apps.dropbox.empty_folder'.tr(),
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                                  ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'apps.dropbox.empty_folder_hint'.tr(),
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

  Widget _buildGridView(List<DropboxFile> files) {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 0.95,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: files.length + (_hasMore ? 1 : 0),
      itemBuilder: (context, index) {
        if (index >= files.length) {
          return _buildLoadMoreButton();
        }
        return _FileGridItem(
          file: files[index],
          onTap: () => _openFile(files[index]),
          onImport: files[index].isFolder ? null : () => _importFile(files[index]),
          onShare: files[index].isFolder ? null : () => _shareFile(files[index]),
          onDelete: () => _deleteFile(files[index]),
        );
      },
    );
  }

  Widget _buildListView(List<DropboxFile> files) {
    return ListView.builder(
      itemCount: files.length + (_hasMore ? 1 : 0),
      itemBuilder: (context, index) {
        if (index >= files.length) {
          return _buildLoadMoreButton();
        }
        return _FileListItem(
          file: files[index],
          onTap: () => _openFile(files[index]),
          onImport: files[index].isFolder ? null : () => _importFile(files[index]),
          onShare: files[index].isFolder ? null : () => _shareFile(files[index]),
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
                onPressed: () => _loadFiles(cursor: _nextCursor),
                child: Text('apps.dropbox.load_more'.tr()),
              ),
      ),
    );
  }
}

/// Breadcrumb item
class _BreadcrumbItem {
  final String path;
  final String name;

  _BreadcrumbItem({required this.path, required this.name});
}

/// File grid item widget
class _FileGridItem extends StatelessWidget {
  final DropboxFile file;
  final VoidCallback onTap;
  final VoidCallback? onImport;
  final VoidCallback? onShare;
  final VoidCallback onDelete;

  const _FileGridItem({
    required this.file,
    required this.onTap,
    this.onImport,
    this.onShare,
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
              _FileTypeIcon(fileType: file.fileType, size: 36),

              const SizedBox(height: 6),

              Flexible(
                child: Text(
                  file.name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),

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
                        tooltip: 'apps.dropbox.import'.tr(),
                        padding: EdgeInsets.zero,
                        visualDensity: VisualDensity.compact,
                      ),
                    ),
                  if (onShare != null)
                    SizedBox(
                      width: 32,
                      height: 32,
                      child: IconButton(
                        icon: const Icon(Icons.share, size: 16),
                        onPressed: onShare,
                        tooltip: 'apps.dropbox.share'.tr(),
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
  final DropboxFile file;
  final VoidCallback onTap;
  final VoidCallback? onImport;
  final VoidCallback? onShare;
  final VoidCallback onDelete;

  const _FileListItem({
    required this.file,
    required this.onTap,
    this.onImport,
    this.onShare,
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
          if (file.serverModified != null)
            Text(
              _formatDate(file.serverModified!),
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
                  Text('apps.dropbox.import_to_deskive'.tr()),
                ],
              ),
            ),
          if (onShare != null)
            PopupMenuItem(
              value: 'share',
              child: Row(
                children: [
                  const Icon(Icons.share, size: 20),
                  const SizedBox(width: 8),
                  Text('apps.dropbox.share'.tr()),
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
        onSelected: (value) {
          switch (value) {
            case 'import':
              onImport?.call();
              break;
            case 'share':
              onShare?.call();
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
  final DropboxFileType fileType;
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
      case DropboxFileType.folder:
        icon = Icons.folder;
        color = Colors.amber;
        break;
      case DropboxFileType.document:
        icon = Icons.description;
        color = Colors.blue;
        break;
      case DropboxFileType.image:
        icon = Icons.image;
        color = Colors.purple;
        break;
      case DropboxFileType.video:
        icon = Icons.video_file;
        color = Colors.red;
        break;
      case DropboxFileType.audio:
        icon = Icons.audio_file;
        color = Colors.orange;
        break;
      case DropboxFileType.pdf:
        icon = Icons.picture_as_pdf;
        color = Colors.red.shade700;
        break;
      case DropboxFileType.archive:
        icon = Icons.archive;
        color = Colors.brown;
        break;
      default:
        icon = Icons.insert_drive_file;
        color = Colors.grey;
    }

    return Icon(icon, size: size, color: color);
  }
}

/// Dropbox mini logo for app bar
class _DropboxMiniLogo extends StatelessWidget {
  const _DropboxMiniLogo();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 24,
      height: 24,
      child: CustomPaint(
        painter: _DropboxLogoPainter(),
      ),
    );
  }
}

class _DropboxLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = const Color(0xFF0061FF);

    // Simplified Dropbox logo - diamond shape
    final path = Path();
    final cx = size.width / 2;
    final cy = size.height / 2;
    final s = size.width * 0.4;

    // Top diamond
    path.moveTo(cx, cy - s);
    path.lineTo(cx - s * 0.6, cy - s * 0.4);
    path.lineTo(cx, cy);
    path.lineTo(cx + s * 0.6, cy - s * 0.4);
    path.close();

    // Bottom diamond
    path.moveTo(cx, cy);
    path.lineTo(cx - s * 0.6, cy + s * 0.4);
    path.lineTo(cx, cy + s);
    path.lineTo(cx + s * 0.6, cy + s * 0.4);
    path.close();

    // Left diamond
    path.moveTo(cx - s, cy);
    path.lineTo(cx - s * 0.4, cy - s * 0.6);
    path.lineTo(cx, cy);
    path.lineTo(cx - s * 0.4, cy + s * 0.6);
    path.close();

    // Right diamond
    path.moveTo(cx + s, cy);
    path.lineTo(cx + s * 0.4, cy - s * 0.6);
    path.lineTo(cx, cy);
    path.lineTo(cx + s * 0.4, cy + s * 0.6);
    path.close();

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Search delegate for Dropbox
class _DropboxSearchDelegate extends SearchDelegate<String> {
  final Function(String) onSearch;

  _DropboxSearchDelegate({required this.onSearch});

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
            'apps.dropbox.search_hint'.tr(),
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
