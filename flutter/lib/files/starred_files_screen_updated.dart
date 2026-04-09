import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../services/file_service.dart';
import '../services/workspace_service.dart';
import '../models/file/file.dart' as file_model;
import 'image_preview_dialog.dart';
import 'package:url_launcher/url_launcher.dart';
import '../widgets/google_drive_folder_picker.dart';
import '../apps/services/google_drive_service.dart';

class StarredFilesScreen extends StatefulWidget {
  const StarredFilesScreen({super.key});

  @override
  State<StarredFilesScreen> createState() => _StarredFilesScreenState();
}

class _StarredFilesScreenState extends State<StarredFilesScreen> {
  String _currentView = 'List';
  bool _isSearching = false;
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();
  String? _selectedType;
  String _sortBy = 'Most Recent';

  final FileService _fileService = FileService.instance;
  List<file_model.File> _starredFiles = [];
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
    await _fetchStarredFiles();
  }

  Future<void> _fetchStarredFiles() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final files = await _fileService.getStarredFiles();
      setState(() {
        _starredFiles = files;
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
            : Text('files.starred_files'.tr()),
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
            tooltip: 'files.sort_by'.tr(),
            onSelected: (value) {
              setState(() {
                _sortBy = value;
              });
            },
            itemBuilder: (context) => [
              PopupMenuItem(value: 'Most Recent', child: Text('files.date_modified'.tr())),
              PopupMenuItem(value: 'Name', child: Text('files.name_sort'.tr())),
              PopupMenuItem(value: 'Size', child: Text('files.size_sort'.tr())),
              PopupMenuItem(value: 'Type', child: Text('files.type_sort'.tr())),
            ],
          ),
          IconButton(
            icon: Icon(_currentView == 'Grid' ? Icons.list : Icons.grid_view),
            tooltip: _currentView == 'Grid' ? 'files.list_view_tooltip'.tr() : 'files.grid_view_tooltip'.tr(),
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
              Icons.star_outline,
              size: 64,
              color: Theme.of(context).colorScheme.onSurfaceVariant.withOpacity(0.5),
            ),
            const SizedBox(height: 16),
            Text(
              _searchQuery.isNotEmpty ? 'files.no_files_found'.tr() : 'files.no_starred_files'.tr(),
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              'files.star_files_hint'.tr(),
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
                      const Padding(
                        padding: EdgeInsets.only(right: 4),
                        child: Icon(Icons.star, size: 16, color: Colors.amber),
                      ),
                      PopupMenuButton<String>(
                        padding: EdgeInsets.zero,
                        icon: const Icon(Icons.more_vert, size: 20),
                        onSelected: (value) => _handleFileAction(value, file),
                        itemBuilder: (context) => _buildFileActionMenu(true),
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
                const Icon(Icons.star, size: 20, color: Colors.amber),
                PopupMenuButton<String>(
                  icon: const Icon(Icons.more_vert),
                  onSelected: (value) => _handleFileAction(value, file),
                  itemBuilder: (context) => _buildFileActionMenu(true),
                ),
              ],
            ),
            onTap: () => _openFile(file),
          ),
        );
      },
    );
  }

  List<PopupMenuEntry<String>> _buildFileActionMenu(bool isStarred) {
    return [
      PopupMenuItem(
        value: 'preview',
        child: Row(
          children: [
            const Icon(Icons.visibility_outlined, size: 20),
            const SizedBox(width: 12),
            Text('files.preview'.tr()),
          ],
        ),
      ),
      PopupMenuItem(
        value: 'download',
        child: Row(
          children: [
            const Icon(Icons.download_outlined, size: 20),
            const SizedBox(width: 12),
            Text('files.download'.tr()),
          ],
        ),
      ),
      PopupMenuItem(
        value: 'export_to_drive',
        child: Row(
          children: [
            const Icon(Icons.cloud_upload_outlined, size: 20),
            const SizedBox(width: 12),
            Text('files.export_to_drive'.tr()),
          ],
        ),
      ),
      PopupMenuItem(
        value: 'rename',
        child: Row(
          children: [
            const Icon(Icons.edit_outlined, size: 20),
            const SizedBox(width: 12),
            Text('files.rename'.tr()),
          ],
        ),
      ),
      PopupMenuItem(
        value: 'unstar',
        child: Row(
          children: [
            Icon(isStarred ? Icons.star : Icons.star_outline, size: 20, color: Colors.amber),
            const SizedBox(width: 12),
            Text(isStarred ? 'files.unstar'.tr() : 'files.star'.tr(), style: const TextStyle(color: Colors.amber)),
          ],
        ),
      ),
      PopupMenuItem(
        value: 'share',
        child: Row(
          children: [
            const Icon(Icons.share_outlined, size: 20),
            const SizedBox(width: 12),
            Text('files.share'.tr()),
          ],
        ),
      ),
      PopupMenuItem(
        value: 'properties',
        child: Row(
          children: [
            const Icon(Icons.info_outline, size: 20),
            const SizedBox(width: 12),
            Text('files.properties'.tr()),
          ],
        ),
      ),
      const PopupMenuDivider(),
      PopupMenuItem(
        value: 'trash',
        child: Row(
          children: [
            const Icon(Icons.delete_outline, size: 20, color: Colors.red),
            const SizedBox(width: 12),
            Text('files.move_to_trash'.tr(), style: const TextStyle(color: Colors.red)),
          ],
        ),
      ),
    ];
  }

  List<file_model.File> _getFilteredFiles() {
    var filtered = _starredFiles.where((file) {
      if (_searchQuery.isNotEmpty) {
        return file.name.toLowerCase().contains(_searchQuery);
      }
      return true;
    }).toList();

    if (_selectedType != null) {
      filtered = filtered.where((file) {
        final fileType = _getFileType(file.mimeType);
        return fileType == _selectedType;
      }).toList();
    }

    switch (_sortBy) {
      case 'Name':
        filtered.sort((a, b) => a.name.compareTo(b.name));
        break;
      case 'Size':
        filtered.sort((a, b) {
          final sizeA = int.tryParse(a.size) ?? 0;
          final sizeB = int.tryParse(b.size) ?? 0;
          return sizeB.compareTo(sizeA);
        });
        break;
      case 'Type':
        filtered.sort((a, b) => a.mimeType.compareTo(b.mimeType));
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
      case 'export_to_drive':
        _exportToGoogleDrive(file.id, file.name);
        break;
      case 'rename':
        _showRenameDialog(file.name, file.id);
        break;
      case 'unstar':
        _unstarFile(file);
        break;
      case 'share':
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Sharing ${file.name}')),
        );
        break;
      case 'properties':
        _showPropertiesDialog(file.name, file.id);
        break;
      case 'trash':
        _showDeleteConfirmation(file.name, file.id);
        break;
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

  Future<void> _exportToGoogleDrive(String fileId, String fileName) async {
    // Show folder picker dialog
    final result = await GoogleDriveFolderPicker.show(
      context: context,
      title: 'files.export_to_drive_title'.tr(),
      subtitle: 'files.export_to_drive_subtitle'.tr(args: [fileName]),
    );

    if (result == null || !mounted) return;

    // Show loading indicator
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        content: Row(
          children: [
            const CircularProgressIndicator(),
            const SizedBox(width: 16),
            Expanded(
              child: Text('files.exporting_to_drive'.tr(args: [fileName])),
            ),
          ],
        ),
      ),
    );

    try {
      final response = await GoogleDriveService.instance.exportFile(
        fileId: fileId,
        targetFolderId: result.folderId,
      );

      if (!mounted) return;
      Navigator.of(context).pop(); // Close loading dialog

      if (response.success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('files.export_success'.tr(args: [fileName, result.folderPath ?? 'My Drive'])),
            duration: const Duration(seconds: 4),
            action: response.webViewLink != null
                ? SnackBarAction(
                    label: 'files.open_in_drive'.tr(),
                    onPressed: () {
                      // Open in Google Drive
                    },
                  )
                : null,
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(response.message ?? 'files.export_failed'.tr()),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      Navigator.of(context).pop(); // Close loading dialog

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('files.export_failed'.tr()),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _unstarFile(file_model.File file) async {
    // Call API to unstar the file
    final success = await _fileService.toggleStarred(file.id, false);

    if (success && mounted) {
      // Remove from local list immediately
      setState(() {
        _starredFiles.removeWhere((f) => f.id == file.id);
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('${file.name} removed from starred'),
          duration: const Duration(seconds: 2),
          action: SnackBarAction(
            label: 'Undo',
            onPressed: () async {
              // Re-star the file
              final restarred = await _fileService.toggleStarred(file.id, true);
              if (restarred && mounted) {
                await _fetchStarredFiles();
              }
            },
          ),
        ),
      );
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to unstar file'),
          duration: Duration(seconds: 2),
        ),
      );
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
                await _fetchStarredFiles();
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
    final file = _starredFiles.firstWhere((f) => f.id == fileId);
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
                await _fetchStarredFiles();
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
