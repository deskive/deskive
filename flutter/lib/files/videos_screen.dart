import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../services/file_service.dart';
import '../services/workspace_service.dart';
import '../models/file/file.dart' as file_model;
import 'video_player_dialog.dart';
import 'file_comments_sheet.dart';
import 'share_link_sheet.dart';
import '../widgets/google_drive_folder_picker.dart';
import '../apps/services/google_drive_service.dart';

class VideosScreen extends StatefulWidget {
  const VideosScreen({super.key});

  @override
  State<VideosScreen> createState() => _VideosScreenState();
}

class _VideosScreenState extends State<VideosScreen> {
  String _currentView = 'Grid';
  bool _isSearching = false;
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();
  String? _selectedType;
  String _sortBy = 'Most Recent';

  final FileService _fileService = FileService.instance;
  List<file_model.File> _videoFiles = [];
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
    await _fetchVideoFiles();
  }

  Future<void> _fetchVideoFiles() async {
    setState(() {
      _isLoading = true;
    });

    try {
      // Use the by-type API endpoint to fetch videos
      final videoFiles = await _fileService.getFilesByType(category: 'videos');

      setState(() {
        _videoFiles = videoFiles;
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
                decoration: const InputDecoration(
                  hintText: 'Search videos...',
                  border: InputBorder.none,
                ),
                onChanged: (value) {
                  setState(() {
                    _searchQuery = value.toLowerCase();
                  });
                },
              )
            : Text('files.videos'.tr()),
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
              const PopupMenuItem(value: 'MP4', child: Text('MP4 Videos')),
              const PopupMenuItem(value: 'AVI', child: Text('AVI Videos')),
              const PopupMenuItem(value: 'MOV', child: Text('MOV Videos')),
              const PopupMenuItem(value: 'WebM', child: Text('WebM Videos')),
              const PopupMenuItem(value: 'MKV', child: Text('MKV Videos')),
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
              const PopupMenuItem(value: 'Most Recent', child: Text('Date Modified')),
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
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _fetchVideoFiles,
        child: _buildContent(),
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
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          SizedBox(height: MediaQuery.of(context).size.height * 0.3),
          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.video_library_outlined,
                  size: 64,
                  color: Theme.of(context).colorScheme.onSurfaceVariant.withOpacity(0.5),
                ),
                const SizedBox(height: 16),
                Text(
                  _searchQuery.isNotEmpty ? 'No videos found' : 'No videos',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Upload videos to get started',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant.withOpacity(0.7),
                      ),
                ),
              ],
            ),
          ),
        ],
      );
    }

    return _currentView == 'Grid' ? _buildGridView(filteredFiles) : _buildListView(filteredFiles);
  }

  Widget _buildGridView(List<file_model.File> files) {
    return GridView.builder(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 1.0,
      ),
      itemCount: files.length,
      itemBuilder: (context, index) {
        final file = files[index];
        return _buildVideoGridItem(file);
      },
    );
  }

  Widget _buildVideoGridItem(file_model.File file) {
    final fileColor = _getFileColor(file.mimeType);
    final fileSize = _formatFileSize(int.tryParse(file.size) ?? 0);
    final surfaceColor = Theme.of(context).colorScheme.surfaceContainerHighest;

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => _openFile(file),
        child: Stack(
          fit: StackFit.expand,
          children: [
            // Video thumbnail
            if (file.url != null && file.url!.isNotEmpty)
              Image.network(
                file.url!,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return Container(
                    color: surfaceColor,
                    child: Center(
                      child: Icon(
                        Icons.play_circle_filled,
                        size: 64,
                        color: fileColor.withOpacity(0.7),
                      ),
                    ),
                  );
                },
                loadingBuilder: (context, child, loadingProgress) {
                  if (loadingProgress == null) return child;
                  return Container(
                    color: surfaceColor,
                    child: Center(
                      child: CircularProgressIndicator(
                        value: loadingProgress.expectedTotalBytes != null
                            ? loadingProgress.cumulativeBytesLoaded / loadingProgress.expectedTotalBytes!
                            : null,
                      ),
                    ),
                  );
                },
              )
            else
              Container(
                color: surfaceColor,
                child: Center(
                  child: Icon(
                    Icons.play_circle_filled,
                    size: 64,
                    color: fileColor.withOpacity(0.7),
                  ),
                ),
              ),
            // Play button overlay
            Center(
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.6),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.play_arrow,
                  color: Colors.white,
                  size: 36,
                ),
              ),
            ),
            // Gradient overlay at bottom
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.bottomCenter,
                    end: Alignment.topCenter,
                    colors: [
                      Colors.black.withOpacity(0.7),
                      Colors.transparent,
                    ],
                  ),
                ),
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            file.name,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        PopupMenuButton<String>(
                          padding: EdgeInsets.zero,
                          icon: const Icon(Icons.more_vert, size: 20, color: Colors.white),
                          onSelected: (value) => _handleFileAction(value, file),
                          itemBuilder: (context) => _buildFileActionMenu(),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      fileSize,
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.9),
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildListView(List<file_model.File> files) {
    return ListView.builder(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      itemCount: files.length,
      itemBuilder: (context, index) {
        final file = files[index];
        final fileIcon = _getFileIcon(file.mimeType);
        final fileColor = _getFileColor(file.mimeType);
        final fileSize = _formatFileSize(int.tryParse(file.size) ?? 0);
        final surfaceColor = Theme.of(context).colorScheme.surfaceContainerHighest;

        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            leading: file.url != null && file.url!.isNotEmpty
                ? Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        Image.network(
                          file.url!,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) {
                            return Icon(
                              fileIcon,
                              color: fileColor,
                              size: 32,
                            );
                          },
                          loadingBuilder: (context, child, loadingProgress) {
                            if (loadingProgress == null) return child;
                            return Center(
                              child: SizedBox(
                                width: 24,
                                height: 24,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  value: loadingProgress.expectedTotalBytes != null
                                      ? loadingProgress.cumulativeBytesLoaded / loadingProgress.expectedTotalBytes!
                                      : null,
                                ),
                              ),
                            );
                          },
                        ),
                        // Play button overlay
                        Center(
                          child: Container(
                            padding: const EdgeInsets.all(4),
                            decoration: BoxDecoration(
                              color: Colors.black.withOpacity(0.6),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.play_arrow,
                              color: Colors.white,
                              size: 20,
                            ),
                          ),
                        ),
                      ],
                    ),
                  )
                : Icon(
                    fileIcon,
                    color: fileColor,
                    size: 32,
                  ),
            title: Text(
              file.name,
              style: const TextStyle(fontWeight: FontWeight.w500),
            ),
            subtitle: Text('${_getTimeAgo(file.updatedAt ?? file.createdAt)} • $fileSize'),
            trailing: PopupMenuButton<String>(
              icon: const Icon(Icons.more_vert),
              onSelected: (value) => _handleFileAction(value, file),
              itemBuilder: (context) => _buildFileActionMenu(),
            ),
            onTap: () => _openFile(file),
          ),
        );
      },
    );
  }

  List<PopupMenuEntry<String>> _buildFileActionMenu() {
    return [
      const PopupMenuItem(
        value: 'preview',
        child: Row(
          children: [
            Icon(Icons.play_arrow, size: 20),
            SizedBox(width: 12),
            Text('Play'),
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
      PopupMenuItem(
        value: 'export_to_drive',
        child: Row(
          children: [
            const Icon(Icons.cloud_upload, size: 20, color: Color(0xFF4285F4)),
            const SizedBox(width: 12),
            Text('files.export_to_drive'.tr()),
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
      const PopupMenuItem(
        value: 'star',
        child: Row(
          children: [
            Icon(Icons.star_outline, size: 20, color: Colors.amber),
            SizedBox(width: 12),
            Text('Star', style: TextStyle(color: Colors.amber)),
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
        value: 'get_link',
        child: Row(
          children: [
            Icon(Icons.link, size: 20),
            SizedBox(width: 12),
            Text('Get Link'),
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
      const PopupMenuItem(
        value: 'comments',
        child: Row(
          children: [
            Icon(Icons.comment_outlined, size: 20),
            SizedBox(width: 12),
            Text('Comments'),
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
    var filtered = _videoFiles.where((file) {
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
    if (mimeType.contains('mp4')) return 'MP4';
    if (mimeType.contains('avi')) return 'AVI';
    if (mimeType.contains('mov') || mimeType.contains('quicktime')) return 'MOV';
    if (mimeType.contains('webm')) return 'WebM';
    if (mimeType.contains('mkv') || mimeType.contains('matroska')) return 'MKV';
    return 'Other';
  }

  IconData _getFileIcon(String mimeType) {
    return Icons.video_library;
  }

  Color _getFileColor(String mimeType) {
    if (mimeType.contains('mp4')) return Colors.red;
    if (mimeType.contains('avi')) return Colors.purple;
    if (mimeType.contains('mov') || mimeType.contains('quicktime')) return Colors.blue;
    if (mimeType.contains('webm')) return Colors.orange;
    if (mimeType.contains('mkv') || mimeType.contains('matroska')) return Colors.indigo;
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
    // Open video player dialog
    showVideoPlayerDialog(
      context,
      file: file,
    );
  }

  void _handleFileAction(String action, file_model.File file) {
    switch (action) {
      case 'preview':
        // Open video player dialog
        showVideoPlayerDialog(
          context,
          file: file,
        );
        break;
      case 'download':
        _downloadFile(file.id, file.name);
        break;
      case 'rename':
        _showRenameDialog(file.name, file.id);
        break;
      case 'star':
        _starFile(file.id, file.name);
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
      case 'export_to_drive':
        _exportToGoogleDrive(file.id, file.name);
        break;
      case 'comments':
        final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
        if (workspaceId != null) {
          showFileCommentsSheet(
            context,
            workspaceId: workspaceId,
            fileId: file.id,
            fileName: file.name,
          );
        }
        break;
      case 'get_link':
        final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
        if (workspaceId != null) {
          showShareLinkSheet(
            context,
            workspaceId: workspaceId,
            fileId: file.id,
            fileName: file.name,
          );
        }
        break;
    }
  }

  Future<void> _exportToGoogleDrive(String fileId, String fileName) async {
    final result = await GoogleDriveFolderPicker.show(
      context: context,
      title: 'files.export_to_drive_title'.tr(),
      subtitle: 'files.export_to_drive_subtitle'.tr(args: [fileName]),
    );

    if (result == null) return;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => PopScope(
        canPop: false,
        child: AlertDialog(
          content: Row(
            children: [
              const CircularProgressIndicator(),
              const SizedBox(width: 20),
              Expanded(
                child: Text('files.exporting_to_drive'.tr(args: [fileName])),
              ),
            ],
          ),
        ),
      ),
    );

    try {
      final driveService = GoogleDriveService.instance;
      final exportResult = await driveService.exportFile(
        fileId: fileId,
        targetFolderId: result.folderId,
      );

      if (mounted) Navigator.of(context).pop();

      if (exportResult.success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('files.export_success'.tr(args: [fileName, result.folderPath ?? 'My Drive'])),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 4),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(exportResult.message ?? 'files.export_failed'.tr()),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      if (mounted) Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('files.export_failed'.tr()),
          backgroundColor: Colors.red,
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
    if (filePath != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Downloaded to:\n$filePath'),
          duration: const Duration(seconds: 4),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Download failed')),
      );
    }
  }

  Future<void> _starFile(String fileId, String fileName) async {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('$fileName added to starred')),
    );
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
                await _fetchVideoFiles();
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
    final file = _videoFiles.firstWhere((f) => f.id == fileId);
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
                await _fetchVideoFiles();
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
