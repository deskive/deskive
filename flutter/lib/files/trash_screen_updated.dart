import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../services/file_service.dart';
import '../services/workspace_service.dart';
import '../models/trash_item.dart';

class TrashScreen extends StatefulWidget {
  const TrashScreen({super.key});

  @override
  State<TrashScreen> createState() => _TrashScreenState();
}

class _TrashScreenState extends State<TrashScreen> {
  String _currentView = 'List';
  bool _isSearching = false;
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();
  String? _selectedType;
  String _sortBy = 'Most Recent';

  final FileService _fileService = FileService.instance;
  List<TrashItem> _trashedItems = [];
  bool _isLoading = false;

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
    await _fetchTrashedFiles();
  }

  Future<void> _fetchTrashedFiles() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final items = await _fileService.getTrashedItems();
      setState(() {
        _trashedItems = items;
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
            : Text('files.trash'.tr()),
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
            tooltip: 'Filter by type',
            onSelected: (value) {
              setState(() {
                _selectedType = value == 'All' ? null : value;
              });
            },
            itemBuilder: (context) => [
              const PopupMenuItem(value: 'All', child: Text('All Types')),
              const PopupMenuItem(value: 'PDF', child: Text('PDF Documents')),
              const PopupMenuItem(value: 'Image', child: Text('Images')),
              const PopupMenuItem(value: 'Document', child: Text('Documents')),
              const PopupMenuItem(value: 'Spreadsheet', child: Text('Spreadsheets')),
              const PopupMenuItem(value: 'Video', child: Text('Videos')),
            ],
          ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.sort),
            tooltip: 'Sort by',
            onSelected: (value) {
              setState(() {
                _sortBy = value;
              });
            },
            itemBuilder: (context) => [
              const PopupMenuItem(value: 'Most Recent', child: Text('Date Deleted')),
              const PopupMenuItem(value: 'Name', child: Text('Name')),
              const PopupMenuItem(value: 'Size', child: Text('Size')),
              const PopupMenuItem(value: 'Type', child: Text('Type')),
            ],
          ),
          IconButton(
            icon: Icon(_currentView == 'Grid' ? Icons.list : Icons.grid_view),
            tooltip: _currentView == 'Grid' ? 'List View' : 'Grid View',
            onPressed: () {
              setState(() {
                _currentView = _currentView == 'Grid' ? 'List' : 'Grid';
              });
            },
          ),
          if (_trashedItems.isNotEmpty)
            PopupMenuButton<String>(
              icon: const Icon(Icons.more_vert),
              onSelected: (value) {
                if (value == 'empty_trash') {
                  _showEmptyTrashConfirmation();
                }
              },
              itemBuilder: (context) => [
                const PopupMenuItem(
                  value: 'empty_trash',
                  child: Row(
                    children: [
                      Icon(Icons.delete_sweep, size: 20, color: Colors.red),
                      SizedBox(width: 12),
                      Text('Empty Trash', style: TextStyle(color: Colors.red)),
                    ],
                  ),
                ),
              ],
            ),
        ],
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            color: Theme.of(context).colorScheme.errorContainer.withOpacity(0.3),
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
          Expanded(child: _buildContent()),
        ],
      ),
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
              Icons.delete_outline,
              size: 64,
              color: Theme.of(context).colorScheme.onSurfaceVariant.withOpacity(0.5),
            ),
            const SizedBox(height: 16),
            Text(
              _searchQuery.isNotEmpty ? 'No files found' : 'Trash is empty',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              'Items you delete will appear here',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant.withOpacity(0.7),
                  ),
            ),
          ],
        ),
      );
    }

    return _currentView == 'Grid' ? _buildGridView(filteredFiles) : _buildListView(filteredFiles);
  }

  Widget _buildGridView(List<TrashItem> items) {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 0.75,
      ),
      itemCount: items.length,
      itemBuilder: (context, index) {
        final item = items[index];
        return _buildItemGridItem(item);
      },
    );
  }

  Widget _buildItemGridItem(TrashItem item) {
    final itemIcon = item.isFolder ? Icons.folder : _getFileIcon(item.mimeType ?? '');
    final itemColor = item.isFolder ? Colors.amber : _getFileColor(item.mimeType ?? '');
    final itemSize = item.isFolder ? '' : _formatFileSize(int.tryParse(item.size ?? '0') ?? 0);

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => _showPropertiesDialog(item.name, item.id),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: Container(
                color: Theme.of(context).colorScheme.surfaceContainerHighest,
                child: Center(
                  child: Icon(
                    itemIcon,
                    size: 48,
                    color: itemColor,
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
                          item.name,
                          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      PopupMenuButton<String>(
                        padding: EdgeInsets.zero,
                        icon: const Icon(Icons.more_vert, size: 20),
                        onSelected: (value) => _handleItemAction(value, item.name, item.id, item.isFolder),
                        itemBuilder: (context) => _buildItemActionMenu(),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _getTimeAgo(item.updatedAt ?? item.createdAt),
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  if (itemSize.isNotEmpty)
                    Text(
                      itemSize,
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

  Widget _buildListView(List<TrashItem> items) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: items.length,
      itemBuilder: (context, index) {
        final item = items[index];
        final itemIcon = item.isFolder ? Icons.folder : _getFileIcon(item.mimeType ?? '');
        final itemColor = item.isFolder ? Colors.amber : _getFileColor(item.mimeType ?? '');
        final itemSize = item.isFolder ? '' : _formatFileSize(int.tryParse(item.size ?? '0') ?? 0);

        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            leading: Icon(
              itemIcon,
              color: itemColor,
              size: 32,
            ),
            title: Text(
              item.name,
              style: const TextStyle(fontWeight: FontWeight.w500),
            ),
            subtitle: Text('Deleted ${_getTimeAgo(item.updatedAt ?? item.createdAt)}${itemSize.isNotEmpty ? ' • $itemSize' : ''}'),
            trailing: PopupMenuButton<String>(
              icon: const Icon(Icons.more_vert),
              onSelected: (value) => _handleItemAction(value, item.name, item.id, item.isFolder),
              itemBuilder: (context) => _buildItemActionMenu(),
            ),
            onTap: () => _showPropertiesDialog(item.name, item.id),
          ),
        );
      },
    );
  }

  List<PopupMenuEntry<String>> _buildItemActionMenu() {
    return [
      const PopupMenuItem(
        value: 'restore',
        child: Row(
          children: [
            Icon(Icons.restore, size: 20, color: Colors.green),
            SizedBox(width: 12),
            Text('Restore', style: TextStyle(color: Colors.green)),
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
        value: 'delete_permanently',
        child: Row(
          children: [
            Icon(Icons.delete_forever, size: 20, color: Colors.red),
            SizedBox(width: 12),
            Text('Delete Permanently', style: TextStyle(color: Colors.red)),
          ],
        ),
      ),
    ];
  }

  List<TrashItem> _getFilteredFiles() {
    var filtered = _trashedItems.where((item) {
      if (_searchQuery.isNotEmpty) {
        return item.name.toLowerCase().contains(_searchQuery);
      }
      return true;
    }).toList();

    if (_selectedType != null) {
      filtered = filtered.where((item) {
        if (_selectedType == 'Folder') {
          return item.isFolder;
        }
        final itemType = item.displayType;
        return itemType == _selectedType;
      }).toList();
    }

    switch (_sortBy) {
      case 'Name':
        filtered.sort((a, b) => a.name.compareTo(b.name));
        break;
      case 'Size':
        filtered.sort((a, b) {
          final sizeA = int.tryParse(a.size ?? '0') ?? 0;
          final sizeB = int.tryParse(b.size ?? '0') ?? 0;
          return sizeB.compareTo(sizeA);
        });
        break;
      case 'Type':
        filtered.sort((a, b) => a.displayType.compareTo(b.displayType));
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

  void _handleItemAction(String action, String itemName, String itemId, bool isFolder) {
    switch (action) {
      case 'restore':
        _restoreItem(itemId, itemName, isFolder);
        break;
      case 'properties':
        _showPropertiesDialog(itemName, itemId);
        break;
      case 'delete_permanently':
        _showDeletePermanentlyConfirmation(itemName, itemId, isFolder);
        break;
    }
  }

  Future<void> _restoreItem(String itemId, String itemName, bool isFolder) async {
    try {
      // Show loading indicator
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Restoring $itemName...'),
          duration: const Duration(seconds: 1),
        ),
      );

      bool success = false;
      String message = '';

      if (isFolder) {
        // Call the folder restore API
        final response = await _fileService.restoreFolder(itemId);

        if (response != null) {
          success = true;
          final foldersCount = response['restored_folders_count'] ?? 0;
          final filesCount = response['restored_files_count'] ?? 0;
          message = '$itemName and all contents restored ($foldersCount folders, $filesCount files)';
        }
      } else {
        // Call the file restore API
        success = await _fileService.restoreFile(itemId);
        if (success) {
          message = '$itemName restored successfully';
        }
      }

      if (!mounted) return;

      if (success) {
        // Refresh the trash list
        await _fetchTrashedFiles();

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(message),
            backgroundColor: Colors.green,
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to restore $itemName'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error restoring $itemName: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _showPropertiesDialog(String itemName, String itemId) {
    try {
      final item = _trashedItems.firstWhere((i) => i.id == itemId);
      final itemSize = item.isFolder ? 'N/A' : _formatFileSize(int.tryParse(item.size ?? '0') ?? 0);
      final itemType = item.displayType;

      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: Text('Properties: $itemName'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildPropertyRow('Name', itemName),
              _buildPropertyRow('Type', itemType),
              if (!item.isFolder) ...[
                _buildPropertyRow('MIME Type', item.mimeType ?? 'N/A'),
                _buildPropertyRow('Size', itemSize),
                if (item.version != null)
                  _buildPropertyRow('Version', item.version.toString()),
                if (item.virusScanStatus != null)
                  _buildPropertyRow('Scan Status', item.virusScanStatus!),
              ],
              _buildPropertyRow('Deleted', _getTimeAgo(item.updatedAt ?? item.createdAt)),
              _buildPropertyRow('Workspace', item.workspaceId),
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
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error loading item properties')),
      );
    }
  }

  Widget _buildPropertyRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 90,
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

  void _showDeletePermanentlyConfirmation(String itemName, String itemId, bool isFolder) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete permanently?'),
        content: Text(
          '$itemName will be deleted forever. This action cannot be undone.'
          '${isFolder ? '\n\nNote: This will also permanently delete all contents of the folder.' : ''}'
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);

              // TODO: Implement folder delete API
              final success = await _fileService.deleteFile(itemId);
              if (success) {
                await _fetchTrashedFiles();
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('$itemName deleted permanently')),
                  );
                }
              } else {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Failed to delete ${isFolder ? 'folder' : 'file'}')),
                  );
                }
              }
            },
            style: TextButton.styleFrom(
              foregroundColor: Colors.red,
            ),
            child: const Text('Delete Permanently'),
          ),
        ],
      ),
    );
  }

  void _showEmptyTrashConfirmation() {
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
            onPressed: () async {
              Navigator.pop(context);

              // TODO: Implement empty trash API call
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Trash emptied')),
              );
              await _fetchTrashedFiles();
            },
            style: TextButton.styleFrom(
              foregroundColor: Colors.red,
            ),
            child: const Text('Empty Trash'),
          ),
        ],
      ),
    );
  }
}
