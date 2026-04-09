import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/file_service.dart';
import '../api/services/file_api_service.dart';

/// Widget for previewing files based on their type
class FilePreviewWidget extends StatefulWidget {
  final FileModel file;
  final double? width;
  final double? height;
  final bool showControls;
  final VoidCallback? onFullscreenTap;

  const FilePreviewWidget({
    super.key,
    required this.file,
    this.width,
    this.height,
    this.showControls = true,
    this.onFullscreenTap,
  });

  @override
  State<FilePreviewWidget> createState() => _FilePreviewWidgetState();
}

class _FilePreviewWidgetState extends State<FilePreviewWidget> {
  bool _isLoading = false;
  String? _error;

  @override
  Widget build(BuildContext context) {
    return Consumer<FileService>(
      builder: (context, fileService, child) {
        final canPreview = fileService.canPreviewFile(widget.file.mimeType);
        
        if (!canPreview) {
          return _buildUnsupportedPreview();
        }

        return Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            color: Colors.grey.shade50,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.grey.shade300),
          ),
          child: Stack(
            children: [
              // Preview content
              _buildPreviewContent(),
              
              // Loading overlay
              if (_isLoading)
                Container(
                  color: Colors.black26,
                  child: const Center(
                    child: CircularProgressIndicator(),
                  ),
                ),
              
              // Error overlay
              if (_error != null)
                Container(
                  color: Colors.red.shade50,
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.error_outline,
                          size: 48,
                          color: Colors.red.shade400,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Preview failed',
                          style: TextStyle(
                            color: Colors.red.shade700,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _error!,
                          style: TextStyle(
                            color: Colors.red.shade600,
                            fontSize: 12,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 8),
                        TextButton(
                          onPressed: () => setState(() {
                            _error = null;
                            _loadPreview();
                          }),
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  ),
                ),
              
              // Controls overlay
              if (widget.showControls && _error == null && !_isLoading)
                Positioned(
                  top: 8,
                  right: 8,
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.black54,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (widget.onFullscreenTap != null)
                          IconButton(
                            onPressed: widget.onFullscreenTap,
                            icon: const Icon(
                              Icons.fullscreen,
                              color: Colors.white,
                              size: 20,
                            ),
                            tooltip: 'Fullscreen',
                          ),
                        IconButton(
                          onPressed: _downloadFile,
                          icon: const Icon(
                            Icons.download,
                            color: Colors.white,
                            size: 20,
                          ),
                          tooltip: 'Download',
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildPreviewContent() {
    final mimeType = widget.file.mimeType;
    
    if (mimeType.startsWith('image/')) {
      return _buildImagePreview();
    } else if (mimeType == 'application/pdf') {
      return _buildPdfPreview();
    } else if (mimeType.startsWith('text/') || 
               mimeType == 'application/json' ||
               mimeType == 'text/markdown') {
      return _buildTextPreview();
    } else if (mimeType.startsWith('video/')) {
      return _buildVideoPreview();
    } else if (mimeType.startsWith('audio/')) {
      return _buildAudioPreview();
    }
    
    return _buildUnsupportedPreview();
  }

  Widget _buildImagePreview() {
    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: Image.network(
        widget.file.url,
        width: widget.width,
        height: widget.height,
        fit: BoxFit.cover,
        loadingBuilder: (context, child, loadingProgress) {
          if (loadingProgress == null) return child;
          return Center(
            child: CircularProgressIndicator(
              value: loadingProgress.expectedTotalBytes != null
                  ? loadingProgress.cumulativeBytesLoaded /
                      loadingProgress.expectedTotalBytes!
                  : null,
            ),
          );
        },
        errorBuilder: (context, error, stackTrace) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.broken_image,
                  size: 48,
                  color: Colors.grey.shade400,
                ),
                const SizedBox(height: 8),
                Text(
                  'Failed to load image',
                  style: TextStyle(
                    color: Colors.grey.shade600,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildPdfPreview() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.picture_as_pdf,
            size: 64,
            color: Colors.red.shade400,
          ),
          const SizedBox(height: 16),
          Text(
            'PDF Preview',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            widget.file.name,
            style: Theme.of(context).textTheme.bodyMedium,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: _openInBrowser,
            icon: const Icon(Icons.open_in_browser, size: 16),
            label: const Text('Open in Browser'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red.shade400,
              foregroundColor: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTextPreview() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.text_fields,
            size: 64,
            color: Colors.blue.shade400,
          ),
          const SizedBox(height: 16),
          Text(
            'Text Preview',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            widget.file.name,
            style: Theme.of(context).textTheme.bodyMedium,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: _openInBrowser,
            icon: const Icon(Icons.open_in_browser, size: 16),
            label: const Text('Open in Browser'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.blue.shade400,
              foregroundColor: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVideoPreview() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Stack(
            alignment: Alignment.center,
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: Colors.black87,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  Icons.video_file,
                  size: 48,
                  color: Colors.white,
                ),
              ),
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: Colors.red.shade600,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.play_arrow,
                  color: Colors.white,
                  size: 24,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            'Video Preview',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            widget.file.name,
            style: Theme.of(context).textTheme.bodyMedium,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: _openInBrowser,
            icon: const Icon(Icons.play_arrow, size: 16),
            label: const Text('Play Video'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red.shade600,
              foregroundColor: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAudioPreview() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: Colors.purple.shade100,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              Icons.audio_file,
              size: 48,
              color: Colors.purple.shade600,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Audio Preview',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            widget.file.name,
            style: Theme.of(context).textTheme.bodyMedium,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: _openInBrowser,
            icon: const Icon(Icons.play_arrow, size: 16),
            label: const Text('Play Audio'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.purple.shade600,
              foregroundColor: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUnsupportedPreview() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            _getFileIcon(widget.file.mimeType),
            size: 64,
            color: Colors.grey.shade400,
          ),
          const SizedBox(height: 16),
          Text(
            'Preview not available',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Colors.grey.shade600,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            widget.file.name,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.grey.shade600,
                ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            widget.file.mimeType,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Colors.grey.shade500,
                ),
          ),
        ],
      ),
    );
  }

  void _loadPreview() {
    // Implement preview loading logic if needed
    setState(() {
      _isLoading = true;
      _error = null;
    });
    
    // Simulate loading
    Future.delayed(const Duration(seconds: 1), () {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    });
  }

  void _downloadFile() {
    final fileService = Provider.of<FileService>(context, listen: false);
    fileService.downloadFile(fileId: widget.file.id);
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Downloading ${widget.file.name}...'),
        backgroundColor: Colors.blue,
      ),
    );
  }

  void _openInBrowser() {
    // TODO: Implement URL launcher to open file in browser
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Opening ${widget.file.name} in browser...'),
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

/// Fullscreen file preview dialog
class FullscreenFilePreview extends StatelessWidget {
  final FileModel file;

  const FullscreenFilePreview({
    super.key,
    required this.file,
  });

  @override
  Widget build(BuildContext context) {
    return Dialog.fullscreen(
      child: Scaffold(
        backgroundColor: Colors.black,
        appBar: AppBar(
          backgroundColor: Colors.black,
          iconTheme: const IconThemeData(color: Colors.white),
          title: Text(
            file.name,
            style: const TextStyle(color: Colors.white),
            overflow: TextOverflow.ellipsis,
          ),
          actions: [
            IconButton(
              onPressed: () => Navigator.of(context).pop(),
              icon: const Icon(Icons.close, color: Colors.white),
              tooltip: 'Close',
            ),
          ],
        ),
        body: Center(
          child: FilePreviewWidget(
            file: file,
            width: double.infinity,
            height: double.infinity,
            showControls: false,
          ),
        ),
      ),
    );
  }
}

/// Thumbnail preview widget for file lists
class FileThumbnail extends StatelessWidget {
  final FileModel file;
  final double size;
  final VoidCallback? onTap;

  const FileThumbnail({
    super.key,
    required this.file,
    this.size = 48,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final fileService = Provider.of<FileService>(context, listen: false);
    
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: Colors.grey.shade100,
          borderRadius: BorderRadius.circular(4),
          border: Border.all(color: Colors.grey.shade300),
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: fileService.canPreviewFile(file.mimeType) && 
                 file.mimeType.startsWith('image/')
              ? Image.network(
                  file.thumbnailUrl ?? file.url,
                  width: size,
                  height: size,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) {
                    return _buildIconThumbnail();
                  },
                )
              : _buildIconThumbnail(),
        ),
      ),
    );
  }

  Widget _buildIconThumbnail() {
    return Center(
      child: Icon(
        _getFileIcon(file.mimeType),
        size: size * 0.5,
        color: Colors.grey.shade600,
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