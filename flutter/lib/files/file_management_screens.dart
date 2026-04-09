import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../services/file_service.dart';
import '../services/workspace_service.dart';
import '../models/file/file.dart' as file_model;
import 'image_preview_dialog.dart';
import 'package:url_launcher/url_launcher.dart';

class RecentFilesScreen extends StatefulWidget {
  const RecentFilesScreen({super.key});

  @override
  State<RecentFilesScreen> createState() => _RecentFilesScreenState();
}

class _RecentFilesScreenState extends State<RecentFilesScreen> {
  String _currentView = 'List';
  bool _isSearching = false;
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();
  String? _selectedType;
  String _sortBy = 'Most Recent';

  final FileService _fileService = FileService.instance;
  List<file_model.File> _recentFiles = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _initializeAndFetchFiles();
  }

  Future<void> _initializeAndFetchFiles() async {
    final workspaceService = WorkspaceService.instance;
    final currentWorkspace = workspaceService.currentWorkspace;

    if (currentWorkspace == null) {
      setState(() {
        _isLoading = false;
      });
      return;
    }

    _fileService.initialize(currentWorkspace.id);
    await _fetchRecentFiles();
  }

  Future<void> _fetchRecentFiles() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final files = await _fileService.getRecentFiles(limit: 50);
      setState(() {
        _recentFiles = files;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.surface,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
        title: _isSearching
            ? TextField(
                controller: _searchController,
                autofocus: true,
                style: const TextStyle(fontSize: 16),
                decoration: InputDecoration(
                  hintText: 'files.search_files'.tr(),
                  border: InputBorder.none,
                ),
                onChanged: (value) {
                  setState(() {
                    _searchQuery = value.toLowerCase();
                  });
                },
              )
            : Text('files.recent_files'.tr()),
        actions: [
          if (_isSearching)
            IconButton(
              icon: const Icon(Icons.close),
              onPressed: () {
                setState(() {
                  _isSearching = false;
                  _searchQuery = '';
                  _searchController.clear();
                });
              },
            )
          else
            IconButton(
              icon: const Icon(Icons.search),
              onPressed: () {
                setState(() {
                  _isSearching = true;
                });
              },
            ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.filter_list),
            tooltip: 'files.filter_by_type'.tr(),
            onSelected: (value) {
              setState(() {
                _selectedType = value == 'All' ? null : value;
              });
            },
            itemBuilder: (context) => [
              PopupMenuItem(value: 'All', child: Text('files.all_types'.tr())),
              PopupMenuItem(value: 'PDF', child: Text('files.pdfs'.tr())),
              PopupMenuItem(value: 'Image', child: Text('files.images'.tr())),
              PopupMenuItem(value: 'Document', child: Text('files.documents'.tr())),
              PopupMenuItem(value: 'Spreadsheet', child: Text('files.spreadsheets'.tr())),
              PopupMenuItem(value: 'Video', child: Text('files.videos'.tr())),
            ],
          ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.sort),
            tooltip: 'files.sort'.tr(),
            onSelected: (value) {
              setState(() {
                _sortBy = value;
              });
            },
            itemBuilder: (context) => [
              PopupMenuItem(value: 'Most Recent', child: Text('files.sort_by_date'.tr())),
              PopupMenuItem(value: 'Name', child: Text('files.sort_by_name'.tr())),
              PopupMenuItem(value: 'Size', child: Text('files.sort_by_size'.tr())),
              PopupMenuItem(value: 'Type', child: Text('files.sort_by_type'.tr())),
            ],
          ),
          IconButton(
            icon: Icon(_currentView == 'Grid' ? Icons.list : Icons.grid_view),
            tooltip: _currentView == 'Grid' ? 'files.list_view'.tr() : 'files.grid_view'.tr(),
            onPressed: () {
              setState(() {
                _currentView = _currentView == 'Grid' ? 'List' : 'Grid';
              });
            },
          ),
        ],
      ),
      body: _buildContent(),
    );
  }

  Widget _buildContent() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    final filteredFiles = _getFilteredFiles();

    if (filteredFiles.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.access_time,
              size: 64,
              color: Theme.of(context).colorScheme.onSurfaceVariant.withOpacity(0.5),
            ),
            const SizedBox(height: 16),
            Text(
              _searchQuery.isNotEmpty ? 'No files found' : 'No recent files',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
          ],
        ),
      );
    }

    return _currentView == 'Grid' ? _buildGridView(filteredFiles) : _buildListView(filteredFiles);
  }

  Widget _buildGridView(List<file_model.File> files) {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 0.75,
      ),
      itemCount: files.length,
      itemBuilder: (context, index) {
        final file = files[index];
        return _buildFileGridItem(file);
      },
    );
  }

  Widget _buildFileGridItem(file_model.File file) {
    final fileIcon = _getFileIcon(file.mimeType);
    final fileColor = _getFileColor(file.mimeType);
    final fileSize = _formatFileSize(int.tryParse(file.size) ?? 0);

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => _openFile(file),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: Container(
                color: Theme.of(context).colorScheme.surfaceContainerHighest,
                child: Center(
                  child: Icon(
                    fileIcon,
                    size: 48,
                    color: fileColor,
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          file.name,
                          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (file.starred == true)
                        const Padding(
                          padding: EdgeInsets.only(right: 4),
                          child: Icon(Icons.star, size: 16, color: Colors.amber),
                        ),
                      PopupMenuButton<String>(
                        padding: EdgeInsets.zero,
                        icon: const Icon(Icons.more_vert, size: 20),
                        onSelected: (value) => _handleFileAction(value, file),
                        itemBuilder: (context) => _buildFileActionMenu(file),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _getTimeAgo(file.updatedAt ?? file.createdAt),
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  Text(
                    fileSize,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildListView(List<file_model.File> files) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: files.length,
      itemBuilder: (context, index) {
        final file = files[index];
        final fileIcon = _getFileIcon(file.mimeType);
        final fileColor = _getFileColor(file.mimeType);
        final fileSize = _formatFileSize(int.tryParse(file.size) ?? 0);

        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            leading: Icon(
              fileIcon,
              color: fileColor,
              size: 32,
            ),
            title: Text(
              file.name,
              style: const TextStyle(fontWeight: FontWeight.w500),
            ),
            subtitle: Text('${_getTimeAgo(file.updatedAt ?? file.createdAt)} • $fileSize'),
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (file.starred == true)
                  const Icon(Icons.star, size: 20, color: Colors.amber),
                PopupMenuButton<String>(
                  icon: const Icon(Icons.more_vert),
                  onSelected: (value) => _handleFileAction(value, file),
                  itemBuilder: (context) => _buildFileActionMenu(file),
                ),
              ],
            ),
            onTap: () => _openFile(file),
          ),
        );
      },
    );
  }

  List<PopupMenuEntry<String>> _buildFileActionMenu(file_model.File file) {
    final isStarred = file.starred == true;

    return [
      const PopupMenuItem(
        value: 'preview',
        child: Row(
          children: [
            Icon(Icons.visibility_outlined, size: 20),
            SizedBox(width: 12),
            Text('Preview'),
          ],
        ),
      ),
      const PopupMenuItem(
        value: 'download',
        child: Row(
          children: [
            Icon(Icons.download_outlined, size: 20),
            SizedBox(width: 12),
            Text('Download'),
          ],
        ),
      ),
      const PopupMenuItem(
        value: 'rename',
        child: Row(
          children: [
            Icon(Icons.edit_outlined, size: 20),
            SizedBox(width: 12),
            Text('Rename'),
          ],
        ),
      ),
      PopupMenuItem(
        value: 'star',
        child: Row(
          children: [
            Icon(
              isStarred ? Icons.star : Icons.star_outline,
              size: 20,
              color: isStarred ? Colors.amber : null,
            ),
            const SizedBox(width: 12),
            Text(isStarred ? 'Unstar' : 'Star'),
          ],
        ),
      ),
      const PopupMenuItem(
        value: 'share',
        child: Row(
          children: [
            Icon(Icons.share_outlined, size: 20),
            SizedBox(width: 12),
            Text('Share'),
          ],
        ),
      ),
      const PopupMenuItem(
        value: 'properties',
        child: Row(
          children: [
            Icon(Icons.info_outline, size: 20),
            SizedBox(width: 12),
            Text('Properties'),
          ],
        ),
      ),
      const PopupMenuDivider(),
      const PopupMenuItem(
        value: 'trash',
        child: Row(
          children: [
            Icon(Icons.delete_outline, size: 20, color: Colors.red),
            SizedBox(width: 12),
            Text('Move to trash', style: TextStyle(color: Colors.red)),
          ],
        ),
      ),
    ];
  }

  List<file_model.File> _getFilteredFiles() {
    var filtered = _recentFiles.where((file) {
      // Search filter
      if (_searchQuery.isNotEmpty) {
        return file.name.toLowerCase().contains(_searchQuery);
      }
      return true;
    }).toList();

    // Type filter
    if (_selectedType != null) {
      filtered = filtered.where((file) {
        final fileType = _getFileType(file.mimeType);
        return fileType == _selectedType;
      }).toList();
    }

    // Sorting
    switch (_sortBy) {
      case 'Name':
        filtered.sort((a, b) => a.name.compareTo(b.name));
        break;
      case 'Size':
        filtered.sort((a, b) {
          final sizeA = int.tryParse(a.size) ?? 0;
          final sizeB = int.tryParse(b.size) ?? 0;
          return sizeB.compareTo(sizeA); // Descending
        });
        break;
      case 'Type':
        filtered.sort((a, b) => a.mimeType.compareTo(b.mimeType));
        break;
      case 'Most Recent':
      default:
        // Already sorted by most recent from API
        break;
    }

    return filtered;
  }

  String _getFileType(String mimeType) {
    if (mimeType == 'application/pdf') return 'PDF';
    if (mimeType.startsWith('image/')) return 'Image';
    if (mimeType.contains('word') || mimeType.contains('document')) return 'Document';
    if (mimeType.contains('spreadsheet') || mimeType.contains('excel')) return 'Spreadsheet';
    if (mimeType.startsWith('video/')) return 'Video';
    return 'Other';
  }

  IconData _getFileIcon(String mimeType) {
    if (mimeType == 'application/pdf') return Icons.picture_as_pdf;
    if (mimeType.startsWith('image/')) return Icons.image;
    if (mimeType.startsWith('video/')) return Icons.videocam;
    if (mimeType.startsWith('audio/')) return Icons.audiotrack;
    if (mimeType.contains('word') || mimeType.contains('document')) return Icons.description;
    if (mimeType.contains('spreadsheet') || mimeType.contains('excel')) return Icons.table_chart;
    if (mimeType.contains('presentation') || mimeType.contains('powerpoint')) return Icons.slideshow;
    if (mimeType.contains('zip') || mimeType.contains('archive')) return Icons.folder_zip;
    return Icons.insert_drive_file;
  }

  Color _getFileColor(String mimeType) {
    if (mimeType == 'application/pdf') return Colors.red;
    if (mimeType.startsWith('image/')) return Colors.green;
    if (mimeType.startsWith('video/')) return Colors.purple;
    if (mimeType.startsWith('audio/')) return Colors.orange;
    if (mimeType.contains('word') || mimeType.contains('document')) return Colors.blue;
    if (mimeType.contains('spreadsheet') || mimeType.contains('excel')) return Colors.orange;
    if (mimeType.contains('presentation') || mimeType.contains('powerpoint')) return Colors.deepOrange;
    return Colors.grey;
  }

  String _formatFileSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    if (bytes < 1024 * 1024 * 1024) return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
  }

  String _getTimeAgo(DateTime? dateTime) {
    if (dateTime == null) return 'Unknown';

    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inSeconds < 60) return 'Just now';
    if (difference.inMinutes < 60) return '${difference.inMinutes}m ago';
    if (difference.inHours < 24) return '${difference.inHours}h ago';
    if (difference.inDays < 7) return '${difference.inDays}d ago';
    if (difference.inDays < 30) return '${(difference.inDays / 7).floor()}w ago';
    if (difference.inDays < 365) return '${(difference.inDays / 30).floor()}mo ago';
    return '${(difference.inDays / 365).floor()}y ago';
  }

  void _openFile(file_model.File file) {
    // Open image preview for images
    if (file.mimeType.startsWith('image/')) {
      showImagePreviewDialog(
        context,
        file: file,
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Opening ${file.name}')),
      );
    }
  }

  void _handleFileAction(String action, file_model.File file) {

    switch (action) {
      case 'preview':
        _openFile(file);
        break;
      case 'download':
        _downloadFile(file.id, file.name);
        break;
      case 'rename':
        _showRenameDialog(file.name, file.id);
        break;
      case 'star':
        _toggleStar(file);
        break;
      case 'share':
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Sharing ${file.name}')),
        );
        // TODO: Implement share functionality
        break;
      case 'properties':
        _showPropertiesDialog(file.name, file.id);
        break;
      case 'trash':
        _showDeleteConfirmation(file.name, file.id);
        break;
    }
  }

  Future<void> _toggleStar(file_model.File file) async {
    final newStarredState = !(file.starred ?? false);

    final success = await _fileService.toggleStarred(file.id, newStarredState);

    if (success && mounted) {
      setState(() {
        // Update the file in the list
        final index = _recentFiles.indexWhere((f) => f.id == file.id);
        if (index != -1) {
          _recentFiles[index] = file.copyWith(starred: newStarredState);
        }
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(newStarredState ? 'Added to starred' : 'Removed from starred'),
          duration: const Duration(seconds: 2),
        ),
      );
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to update starred status'),
          duration: Duration(seconds: 2),
        ),
      );
    }
  }

  Future<void> _downloadFile(String fileId, String fileName) async {

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Downloading $fileName...')),
    );

    final filePath = await _fileService.downloadFile(
      fileId: fileId,
      fileName: fileName,
    );

    if (mounted) {
      if (filePath != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Downloaded to:\n$filePath'),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 4),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to download $fileName'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _showRenameDialog(String fileName, String fileId) {
    final controller = TextEditingController(text: fileName);
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Rename File'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(
            labelText: 'File name',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              final newName = controller.text.trim();
              if (newName.isEmpty || newName == fileName) {
                Navigator.pop(context);
                return;
              }

              Navigator.pop(context);

              final success = await _fileService.updateFile(fileId, name: newName);
              if (success) {
                await _fetchRecentFiles();
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Renamed to $newName')),
                  );
                }
              } else {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Failed to rename file')),
                  );
                }
              }
            },
            child: const Text('Rename'),
          ),
        ],
      ),
    );
  }

  void _showPropertiesDialog(String fileName, String fileId) {
    final file = _recentFiles.firstWhere((f) => f.id == fileId);
    final fileSize = _formatFileSize(int.tryParse(file.size) ?? 0);
    final fileType = _getFileType(file.mimeType);

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Properties: $fileName'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildPropertyRow('Name', fileName),
            _buildPropertyRow('Type', fileType),
            _buildPropertyRow('MIME Type', file.mimeType),
            _buildPropertyRow('Size', fileSize),
            _buildPropertyRow('Modified', _getTimeAgo(file.updatedAt ?? file.createdAt)),
            _buildPropertyRow('Version', file.version.toString()),
            _buildPropertyRow('Scan Status', file.virusScanStatus),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  Widget _buildPropertyRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(
              label,
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }

  void _showDeleteConfirmation(String fileName, String fileId) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Move to trash?'),
        content: Text('Are you sure you want to move "$fileName" to trash?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);

              final success = await _fileService.deleteFile(fileId);
              if (success) {
                await _fetchRecentFiles();
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('$fileName moved to trash')),
                  );
                }
              } else {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Failed to delete file')),
                  );
                }
              }
            },
            style: TextButton.styleFrom(
              foregroundColor: Colors.red,
            ),
            child: const Text('Move to trash'),
          ),
        ],
      ),
    );
  }
}

class StarredFilesScreen extends StatelessWidget {
  const StarredFilesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Starred Files'),
        actions: [
          IconButton(
            icon: const Icon(Icons.select_all),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Select all starred files')),
              );
            },
          ),
        ],
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            color: Theme.of(context).colorScheme.primaryContainer.withValues(alpha: 0.3),
            child: Row(
              children: [
                Icon(
                  Icons.star,
                  color: Colors.amber,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    '6 starred files',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: GridView.builder(
              padding: const EdgeInsets.all(16),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 0.8,
              ),
              itemCount: 6,
              itemBuilder: (context, index) {
                return Card(
                  clipBehavior: Clip.antiAlias,
                  child: InkWell(
                    onTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Opening starred file ${index + 1}')),
                      );
                    },
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Expanded(
                          child: Container(
                            color: Theme.of(context).colorScheme.surfaceContainerHighest,
                            child: Center(
                              child: _getFilePreview(index),
                            ),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      'Starred File ${index + 1}',
                                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                        fontWeight: FontWeight.bold,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  Icon(
                                    Icons.star,
                                    size: 16,
                                    color: Colors.amber,
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${2 + index}.$index MB',
                                style: Theme.of(context).textTheme.bodySmall,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _getFilePreview(int index) {
    final previews = [
      Icons.picture_as_pdf,
      Icons.image,
      Icons.description,
      Icons.table_chart,
      Icons.videocam,
      Icons.folder,
    ];
    final colors = [
      Colors.red,
      Colors.green,
      Colors.blue,
      Colors.orange,
      Colors.purple,
      Colors.teal,
    ];
    
    return Icon(
      previews[index % previews.length],
      size: 48,
      color: colors[index % colors.length],
    );
  }
}

class TrashScreen extends StatefulWidget {
  const TrashScreen({super.key});

  @override
  State<TrashScreen> createState() => _TrashScreenState();
}

class _TrashScreenState extends State<TrashScreen> {
  final List<Map<String, dynamic>> _trashedFiles = List.generate(
    5,
    (index) => {
      'name': 'Deleted File ${index + 1}',
      'deletedDate': DateTime.now().subtract(Duration(days: index)),
      'size': '${1 + index}.$index MB',
      'type': ['pdf', 'image', 'doc', 'video', 'audio'][index % 5],
    },
  );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Trash'),
        actions: [
          TextButton(
            onPressed: _trashedFiles.isEmpty ? null : _emptyTrash,
            child: const Text('Empty Trash'),
          ),
        ],
      ),
      body: _trashedFiles.isEmpty
          ? _buildEmptyState()
          : Column(
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  color: Theme.of(context).colorScheme.errorContainer.withValues(alpha: 0.3),
                  child: Row(
                    children: [
                      Icon(
                        Icons.info_outline,
                        color: Theme.of(context).colorScheme.error,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Items in trash will be permanently deleted after 30 days',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _trashedFiles.length,
                    itemBuilder: (context, index) {
                      final file = _trashedFiles[index];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          leading: Icon(
                            _getIconForType(file['type']),
                            color: _getColorForType(file['type']),
                            size: 32,
                          ),
                          title: Text(file['name']),
                          subtitle: Text(
                            'Deleted ${_formatDeletedDate(file['deletedDate'])} • ${file['size']}',
                          ),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(
                                icon: const Icon(Icons.restore),
                                tooltip: 'Restore',
                                onPressed: () => _restoreFile(index),
                              ),
                              IconButton(
                                icon: const Icon(Icons.delete_forever),
                                tooltip: 'Delete permanently',
                                onPressed: () => _deletePermanently(index),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.delete_outline,
            size: 64,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
          const SizedBox(height: 16),
          Text(
            'Trash is empty',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          Text(
            'Items you delete will appear here',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }

  IconData _getIconForType(String type) {
    switch (type) {
      case 'pdf':
        return Icons.picture_as_pdf;
      case 'image':
        return Icons.image;
      case 'doc':
        return Icons.description;
      case 'video':
        return Icons.videocam;
      case 'audio':
        return Icons.audiotrack;
      default:
        return Icons.insert_drive_file;
    }
  }

  Color _getColorForType(String type) {
    switch (type) {
      case 'pdf':
        return Colors.red;
      case 'image':
        return Colors.green;
      case 'doc':
        return Colors.blue;
      case 'video':
        return Colors.purple;
      case 'audio':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }

  String _formatDeletedDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);
    
    if (difference.inDays == 0) {
      return 'today';
    } else if (difference.inDays == 1) {
      return 'yesterday';
    } else {
      return '${difference.inDays} days ago';
    }
  }

  void _restoreFile(int index) {
    final file = _trashedFiles[index];
    setState(() {
      _trashedFiles.removeAt(index);
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${file['name']} restored'),
        action: SnackBarAction(
          label: 'Undo',
          onPressed: () {
            setState(() {
              _trashedFiles.insert(index, file);
            });
          },
        ),
      ),
    );
  }

  void _deletePermanently(int index) {
    final file = _trashedFiles[index];
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete permanently?'),
        content: Text('${file['name']} will be deleted forever. This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              setState(() {
                _trashedFiles.removeAt(index);
              });
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('${file['name']} deleted permanently')),
              );
            },
            style: TextButton.styleFrom(
              foregroundColor: Theme.of(context).colorScheme.error,
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  void _emptyTrash() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Empty trash?'),
        content: const Text('All items in trash will be permanently deleted. This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              setState(() {
                _trashedFiles.clear();
              });
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Trash emptied')),
              );
            },
            style: TextButton.styleFrom(
              foregroundColor: Theme.of(context).colorScheme.error,
            ),
            child: const Text('Empty Trash'),
          ),
        ],
      ),
    );
  }
}

class SharedWithMeScreen extends StatefulWidget {
  final String workspaceId;

  const SharedWithMeScreen({
    super.key,
    required this.workspaceId,
  });

  @override
  State<SharedWithMeScreen> createState() => _SharedWithMeScreenState();
}

class _SharedWithMeScreenState extends State<SharedWithMeScreen> {
  final FileService _fileService = FileService.instance;
  List<file_model.File> _sharedFiles = [];
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadSharedFiles();
  }

  Future<void> _loadSharedFiles() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // Initialize file service with workspace ID
      _fileService.initialize(widget.workspaceId);

      // Fetch shared files
      final files = await _fileService.getSharedWithMeFiles();

      setState(() {
        _sharedFiles = files;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to load shared files: $e';
        _isLoading = false;
      });
    }
  }

  IconData _getFileIcon(String mimeType) {
    if (mimeType.startsWith('image/')) return Icons.image;
    if (mimeType.startsWith('video/')) return Icons.videocam;
    if (mimeType.startsWith('audio/')) return Icons.audiotrack;
    if (mimeType == 'application/pdf') return Icons.picture_as_pdf;
    if (mimeType.contains('word')) return Icons.description;
    if (mimeType.contains('excel') || mimeType.contains('spreadsheet')) return Icons.table_chart;
    if (mimeType.contains('powerpoint') || mimeType.contains('presentation')) return Icons.slideshow;
    if (mimeType.startsWith('text/')) return Icons.text_snippet;
    if (mimeType.contains('zip') || mimeType.contains('archive')) return Icons.folder_zip;
    return Icons.insert_drive_file;
  }

  Color _getFileColor(String mimeType) {
    if (mimeType.startsWith('image/')) return Colors.blue;
    if (mimeType.startsWith('video/')) return Colors.orange;
    if (mimeType.startsWith('audio/')) return Colors.purple;
    if (mimeType == 'application/pdf') return Colors.red;
    if (mimeType.contains('word')) return Colors.blue;
    if (mimeType.contains('excel') || mimeType.contains('spreadsheet')) return Colors.green;
    if (mimeType.contains('powerpoint') || mimeType.contains('presentation')) return Colors.orange;
    if (mimeType.startsWith('text/')) return Colors.grey;
    return Colors.blueGrey;
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);

    if (difference.inMinutes < 1) {
      return 'Just now';
    } else if (difference.inHours < 1) {
      final minutes = difference.inMinutes;
      return 'Shared $minutes minute${minutes > 1 ? 's' : ''} ago';
    } else if (difference.inHours < 24) {
      final hours = difference.inHours;
      return 'Shared $hours hour${hours > 1 ? 's' : ''} ago';
    } else if (difference.inDays < 7) {
      final days = difference.inDays;
      return 'Shared $days day${days > 1 ? 's' : ''} ago';
    } else if (difference.inDays < 30) {
      final weeks = (difference.inDays / 7).floor();
      return 'Shared $weeks week${weeks > 1 ? 's' : ''} ago';
    } else {
      final months = (difference.inDays / 30).floor();
      return 'Shared $months month${months > 1 ? 's' : ''} ago';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Shared with me'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadSharedFiles,
          ),
          IconButton(
            icon: const Icon(Icons.sort),
            onPressed: () {
              _showSortOptions(context);
            },
          ),
          IconButton(
            icon: const Icon(Icons.more_vert),
            onPressed: () {
              _showMoreOptions(context);
            },
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    if (_errorMessage != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.error_outline,
              size: 64,
              color: Colors.red,
            ),
            const SizedBox(height: 16),
            Text(
              _errorMessage!,
              style: const TextStyle(color: Colors.red),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: _loadSharedFiles,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (_sharedFiles.isEmpty) {
      return _buildEmptyState();
    }

    return RefreshIndicator(
      onRefresh: _loadSharedFiles,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _sharedFiles.length,
        itemBuilder: (context, index) {
          final file = _sharedFiles[index];
          final icon = _getFileIcon(file.mimeType);
          final color = _getFileColor(file.mimeType);

          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: ListTile(
              contentPadding: const EdgeInsets.all(16),
              leading: CircleAvatar(
                backgroundColor: color.withValues(alpha: 0.1),
                child: Icon(
                  icon,
                  color: color,
                  size: 24,
                ),
              ),
              title: Text(
                file.name,
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 16,
                ),
              ),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 4),
                  if (file.uploadedBy != null)
                    Text(
                      'Owner: ${file.uploadedBy}',
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.primary,
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  const SizedBox(height: 2),
                  Text(
                    '${_fileService.formatFileSize(int.tryParse(file.size) ?? 0)} • ${_formatDate(file.createdAt ?? DateTime.now())}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
              trailing: PopupMenuButton<String>(
                onSelected: (value) => _handleFileAction(value, file),
                itemBuilder: (context) => [
                  const PopupMenuItem(
                    value: 'download',
                    child: Row(
                      children: [
                        Icon(Icons.download, size: 20),
                        SizedBox(width: 12),
                        Text('Download'),
                      ],
                    ),
                  ),
                  const PopupMenuItem(
                    value: 'share',
                    child: Row(
                      children: [
                        Icon(Icons.share, size: 20),
                        SizedBox(width: 12),
                        Text('Share'),
                      ],
                    ),
                  ),
                  const PopupMenuItem(
                    value: 'info',
                    child: Row(
                      children: [
                        Icon(Icons.info_outline, size: 20),
                        SizedBox(width: 12),
                        Text('File info'),
                      ],
                    ),
                  ),
                ],
              ),
              onTap: () {
                _openFile(file);
              },
            ),
          );
        },
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.people_outline,
            size: 64,
            color: Theme.of(context).colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
          ),
          const SizedBox(height: 16),
          Text(
            'No files shared with you',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Files shared with you by others will appear here',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant.withValues(alpha: 0.7),
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  void _openFile(file_model.File file) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Opening ${file.name}')),
    );
    // TODO: Implement file opening logic
  }

  Future<void> _handleFileAction(String action, file_model.File file) async {
    switch (action) {
      case 'download':
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Downloading ${file.name}...')),
        );
        final filePath = await _fileService.downloadFile(
          fileId: file.id,
          fileName: file.name,
        );
        if (filePath != null && mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Downloaded to: $filePath'),
              backgroundColor: Colors.green,
            ),
          );
        }
        break;
      case 'share':
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Sharing ${file.name}...')),
        );
        // TODO: Implement sharing
        break;
      case 'info':
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('File: ${file.name}\nSize: ${_fileService.formatFileSize(int.tryParse(file.size) ?? 0)}\nType: ${file.mimeType}')),
        );
        break;
    }
  }
}

void _showSortOptions(BuildContext context) {
  showModalBottomSheet(
    context: context,
    builder: (context) => Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Sort by',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          ...[
            'Name',
            'Date shared',
            'File size',
            'Owner',
          ].map((option) => ListTile(
            title: Text(option),
            onTap: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Sorted by $option')),
              );
            },
          )),
        ],
      ),
    ),
  );
}

void _showMoreOptions(BuildContext context) {
  showModalBottomSheet(
    context: context,
    builder: (context) => Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Options',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          ListTile(
            leading: const Icon(Icons.refresh),
            title: const Text('Refresh'),
            onTap: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Refreshing shared files...')),
              );
            },
          ),
          ListTile(
            leading: const Icon(Icons.help_outline),
            title: const Text('Help'),
            onTap: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Opening help...')),
              );
            },
          ),
        ],
      ),
    ),
  );
}