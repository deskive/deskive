import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';

class FileTypeScreen extends StatelessWidget {
  final String fileType;
  
  const FileTypeScreen({super.key, required this.fileType});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_getTitleForType(fileType)),
        actions: [
          PopupMenuButton<String>(
            onSelected: (value) => _handleSortOption(context, value),
            itemBuilder: (context) => [
              PopupMenuItem(value: 'name', child: Text('files.sort_by_name'.tr())),
              PopupMenuItem(value: 'date', child: Text('files.sort_by_date'.tr())),
              PopupMenuItem(value: 'size', child: Text('files.sort_by_size'.tr())),
            ],
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
                  _getIconForType(fileType),
                  color: _getColorForType(fileType),
                  size: 32,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _getTitleForType(fileType),
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        _getFileCount(fileType),
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
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
                childAspectRatio: 0.85,
              ),
              itemCount: _getItemCount(fileType),
              itemBuilder: (context, index) {
                return _buildFileCard(context, index);
              },
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showUploadDialog(context),
        child: const Icon(Icons.add),
      ),
    );
  }

  String _getTitleForType(String type) {
    switch (type) {
      case 'document':
        return 'files.documents'.tr();
      case 'image':
        return 'files.images'.tr();
      case 'spreadsheet':
        return 'files.spreadsheets'.tr();
      case 'video':
        return 'files.videos'.tr();
      case 'audio':
        return 'files.audio'.tr();
      case 'pdf':
        return 'files.pdfs'.tr();
      default:
        return 'files.title'.tr();
    }
  }

  IconData _getIconForType(String type) {
    switch (type) {
      case 'document':
        return Icons.article;
      case 'image':
        return Icons.image;
      case 'spreadsheet':
        return Icons.table_chart;
      case 'video':
        return Icons.video_library;
      case 'audio':
        return Icons.audiotrack;
      case 'pdf':
        return Icons.picture_as_pdf;
      default:
        return Icons.insert_drive_file;
    }
  }

  Color _getColorForType(String type) {
    switch (type) {
      case 'document':
        return Colors.blue;
      case 'image':
        return Colors.green;
      case 'spreadsheet':
        return Colors.orange;
      case 'video':
        return Colors.purple;
      case 'audio':
        return Colors.pink;
      case 'pdf':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  String _getFileCount(String type) {
    final counts = {
      'document': '23 documents',
      'image': '147 images',
      'spreadsheet': '12 spreadsheets',
      'video': '8 videos',
      'audio': '34 audio files',
      'pdf': '19 PDFs',
    };
    return counts[type] ?? '0 files';
  }

  int _getItemCount(String type) {
    final counts = {
      'document': 23,
      'image': 147,
      'spreadsheet': 12,
      'video': 8,
      'audio': 34,
      'pdf': 19,
    };
    return counts[type] ?? 0;
  }

  Widget _buildFileCard(BuildContext context, int index) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => _openFile(context, index),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: Container(
                color: Theme.of(context).colorScheme.surfaceContainerHighest,
                child: _buildFilePreview(context, index),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _getFileName(index),
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        _getFileSize(index),
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      PopupMenuButton<String>(
                        icon: const Icon(Icons.more_vert, size: 16),
                        onSelected: (value) => _handleFileAction(context, value, index),
                        itemBuilder: (context) => [
                          PopupMenuItem(value: 'share', child: Text('files.share'.tr())),
                          PopupMenuItem(value: 'download', child: Text('files.download'.tr())),
                          PopupMenuItem(value: 'delete', child: Text('files.delete'.tr())),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilePreview(BuildContext context, int index) {
    if (fileType == 'image') {
      return Stack(
        fit: StackFit.expand,
        children: [
          Container(
            color: Colors.primaries[index % Colors.primaries.length].withValues(alpha: 0.2),
          ),
          Center(
            child: Icon(
              Icons.image,
              size: 48,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      );
    } else {
      return Center(
        child: Icon(
          _getIconForType(fileType),
          size: 48,
          color: _getColorForType(fileType),
        ),
      );
    }
  }

  String _getFileName(int index) {
    final prefix = _getTitleForType(fileType).replaceAll(' Files', '').replaceAll('s', '');
    return '$prefix ${index + 1}';
  }

  String _getFileSize(int index) {
    final sizes = ['245 KB', '1.2 MB', '3.4 MB', '567 KB', '2.1 MB'];
    return sizes[index % sizes.length];
  }

  void _openFile(BuildContext context, int index) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Opening ${_getFileName(index)}')),
    );
  }

  void _handleFileAction(BuildContext context, String action, int index) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('$action: ${_getFileName(index)}')),
    );
  }

  void _handleSortOption(BuildContext context, String option) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Sorting by $option')),
    );
  }

  void _showUploadDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('files.upload'.tr()),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.upload_file),
              title: Text('files.choose_from_device'.tr()),
              onTap: () {
                Navigator.pop(context);
              },
            ),
            ListTile(
              leading: const Icon(Icons.camera_alt),
              title: Text('files.take_photo'.tr()),
              onTap: () {
                Navigator.pop(context);
              },
            ),
          ],
        ),
      ),
    );
  }
}