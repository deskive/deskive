import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/file_service.dart';
import '../api/services/file_api_service.dart';

/// Widget for handling file downloads with progress tracking
class FileDownloadWidget extends StatefulWidget {
  final FileModel file;
  final String? customPath;
  final VoidCallback? onDownloadComplete;
  
  const FileDownloadWidget({
    super.key,
    required this.file,
    this.customPath,
    this.onDownloadComplete,
  });

  @override
  State<FileDownloadWidget> createState() => _FileDownloadWidgetState();
}

class _FileDownloadWidgetState extends State<FileDownloadWidget> {
  bool _isDownloading = false;
  String? _downloadPath;

  @override
  Widget build(BuildContext context) {
    return Consumer<FileService>(
      builder: (context, fileService, child) {
        final progress = fileService.getDownloadProgress(widget.file.id);
        final isDownloading = fileService.isDownloading(widget.file.id);

        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Theme.of(context).cardColor,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.grey.shade300),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // File info
              Row(
                children: [
                  Icon(
                    _getFileIcon(widget.file.mimeType),
                    size: 32,
                    color: Theme.of(context).primaryColor,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.file.name,
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${fileService.formatFileSize(widget.file.size)} • ${widget.file.mimeType}',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: Colors.grey.shade600,
                              ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 16),
              
              // Download progress
              if (isDownloading) ...[
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.download, size: 16),
                        const SizedBox(width: 8),
                        Text(
                          'Downloading...',
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                fontWeight: FontWeight.w500,
                              ),
                        ),
                        const Spacer(),
                        Text(
                          '${(progress * 100).toInt()}%',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: Theme.of(context).primaryColor,
                                fontWeight: FontWeight.w500,
                              ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    LinearProgressIndicator(
                      value: progress,
                      backgroundColor: Colors.grey.shade300,
                      valueColor: AlwaysStoppedAnimation<Color>(
                        Theme.of(context).primaryColor,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Text(
                          'Downloading to: ${widget.customPath ?? 'Downloads folder'}',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: Colors.grey.shade600,
                              ),
                        ),
                        const Spacer(),
                        TextButton(
                          onPressed: () => _cancelDownload(fileService),
                          child: const Text('Cancel'),
                        ),
                      ],
                    ),
                  ],
                ),
              ] else if (_downloadPath != null) ...[
                // Download completed
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.green.shade50,
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(color: Colors.green.shade200),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.check_circle,
                        color: Colors.green.shade600,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Download completed',
                              style: TextStyle(
                                color: Colors.green.shade700,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            Text(
                              'Saved to: $_downloadPath',
                              style: TextStyle(
                                color: Colors.green.shade600,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: () => _openFile(_downloadPath!),
                        icon: Icon(
                          Icons.open_in_new,
                          color: Colors.green.shade600,
                          size: 20,
                        ),
                        tooltip: 'Open file',
                      ),
                    ],
                  ),
                ),
              ] else ...[
                // Download button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _isDownloading ? null : () => _startDownload(fileService),
                    icon: const Icon(Icons.download),
                    label: const Text('Download'),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.all(12),
                      backgroundColor: Theme.of(context).primaryColor,
                      foregroundColor: Colors.white,
                    ),
                  ),
                ),
              ],
            ],
          ),
        );
      },
    );
  }

  Future<void> _startDownload(FileService fileService) async {
    setState(() {
      _isDownloading = true;
      _downloadPath = null;
    });

    try {
      final response = await fileService.downloadFile(
        fileId: widget.file.id,
        customPath: widget.customPath,
      );

      if (mounted) {
        setState(() {
          _isDownloading = false;
        });

        if (response.success && response.data != null) {
          setState(() {
            _downloadPath = response.data;
          });

          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('${widget.file.name} downloaded successfully'),
              backgroundColor: Colors.green,
              action: SnackBarAction(
                label: 'Open',
                textColor: Colors.white,
                onPressed: () => _openFile(_downloadPath!),
              ),
            ),
          );

          widget.onDownloadComplete?.call();
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to download: ${response.message}'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isDownloading = false;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Download failed: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _cancelDownload(FileService fileService) {
    fileService.cancelDownload(widget.file.id);
    setState(() {
      _isDownloading = false;
    });
  }

  void _openFile(String filePath) {
    // TODO: Implement file opening functionality
    // You can use packages like open_file or url_launcher
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('File saved to: $filePath'),
        backgroundColor: Colors.blue,
      ),
    );
  }

  IconData _getFileIcon(String mimeType) {
    if (mimeType.startsWith('image/')) return Icons.image;
    if (mimeType.startsWith('video/')) return Icons.video_file;
    if (mimeType.startsWith('audio/')) return Icons.audio_file;
    if (mimeType == 'application/pdf') return Icons.picture_as_pdf;
    if (mimeType.contains('word') || mimeType.contains('document')) return Icons.description;
    if (mimeType.contains('excel') || mimeType.contains('spreadsheet')) return Icons.table_chart;
    if (mimeType.contains('powerpoint') || mimeType.contains('presentation')) return Icons.slideshow;
    if (mimeType.startsWith('text/')) return Icons.text_fields;
    if (mimeType.contains('zip') || mimeType.contains('archive')) return Icons.archive;
    return Icons.insert_drive_file;
  }
}

/// Simple download button widget
class DownloadButton extends StatelessWidget {
  final FileModel file;
  final String? customPath;
  final VoidCallback? onDownloadComplete;
  final bool compact;

  const DownloadButton({
    super.key,
    required this.file,
    this.customPath,
    this.onDownloadComplete,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    return Consumer<FileService>(
      builder: (context, fileService, child) {
        final progress = fileService.getDownloadProgress(file.id);
        final isDownloading = fileService.isDownloading(file.id);

        if (isDownloading) {
          return compact
              ? SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                    value: progress,
                    strokeWidth: 2,
                  ),
                )
              : Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SizedBox(
                      width: 32,
                      height: 32,
                      child: CircularProgressIndicator(
                        value: progress,
                        strokeWidth: 3,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${(progress * 100).toInt()}%',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                );
        }

        return IconButton(
          onPressed: () => _download(context, fileService),
          icon: const Icon(Icons.download),
          tooltip: 'Download ${file.name}',
          iconSize: compact ? 20 : 24,
        );
      },
    );
  }

  Future<void> _download(BuildContext context, FileService fileService) async {
    try {
      final response = await fileService.downloadFile(
        fileId: file.id,
        customPath: customPath,
      );

      if (context.mounted) {
        if (response.success) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('${file.name} downloaded successfully'),
              backgroundColor: Colors.green,
            ),
          );
          onDownloadComplete?.call();
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to download: ${response.message}'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Download failed: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }
}