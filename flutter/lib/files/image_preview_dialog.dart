import 'package:flutter/material.dart';
import '../models/file/file.dart' as file_model;
import '../services/file_service.dart';
import '../services/auth_service.dart';
import '../config/env_config.dart';

/// Image preview dialog that displays an image file in a modal
class ImagePreviewDialog extends StatefulWidget {
  final file_model.File file;

  const ImagePreviewDialog({
    super.key,
    required this.file,
  });

  @override
  State<ImagePreviewDialog> createState() => _ImagePreviewDialogState();
}

class _ImagePreviewDialogState extends State<ImagePreviewDialog> {
  final TransformationController _transformationController = TransformationController();
  String? _imageUrl;
  bool _isLoadingUrl = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _transformationController.addListener(_onTransformChanged);
    _fetchFileDetails();
  }

  @override
  void dispose() {
    _transformationController.removeListener(_onTransformChanged);
    _transformationController.dispose();
    super.dispose();
  }

  void _onTransformChanged() {
    setState(() {}); // Rebuild to update zoom percentage display
  }

  double get _currentScale {
    return _transformationController.value.getMaxScaleOnAxis();
  }

  /// Fetch file details from API to get the image URL
  Future<void> _fetchFileDetails() async {

    // Check if URL is already available in the file object
    if (widget.file.url != null && widget.file.url!.isNotEmpty) {
      setState(() {
        _imageUrl = widget.file.url;
        _isLoadingUrl = false;
      });
      return;
    }

    try {
      final fileService = FileService.instance;
      fileService.initialize(widget.file.workspaceId);


      // Use getFiles API which returns the url field
      final filesResponse = await fileService.getFiles(
        folderId: widget.file.folderId,
        page: 1,
        limit: 100, // Get enough files to find ours
      );

      if (filesResponse != null && mounted) {

        // Find our file in the list
        final fileWithUrl = filesResponse.firstWhere(
          (f) => f.id == widget.file.id,
          orElse: () => widget.file,
        );

        if (fileWithUrl.url != null && fileWithUrl.url!.isNotEmpty) {
          setState(() {
            _imageUrl = fileWithUrl.url!;
            _isLoadingUrl = false;
          });
        } else {
          setState(() {
            _error = 'Image URL not available';
            _isLoadingUrl = false;
          });
        }
      } else {
        setState(() {
          _error = 'Failed to load file details';
          _isLoadingUrl = false;
        });
      }
    } catch (e, stackTrace) {
      setState(() {
        _error = 'Error: $e';
        _isLoadingUrl = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.all(16),
      child: Container(
        constraints: BoxConstraints(
          maxWidth: 500,
          maxHeight: MediaQuery.of(context).size.height * 0.6,
        ),
        decoration: BoxDecoration(
          color: const Color(0xFF2C2C2C),
          borderRadius: BorderRadius.circular(10),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.5),
              blurRadius: 15,
              spreadRadius: 3,
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            _buildHeader(),

            // Image Preview Area
            Expanded(
              child: _buildImagePreview(),
            ),

            // Footer with actions
            _buildFooter(),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: const BoxDecoration(
        border: Border(
          bottom: BorderSide(
            color: Color(0xFF3C3C3C),
            width: 1,
          ),
        ),
      ),
      child: Row(
        children: [
          // File icon
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: Colors.green.withOpacity(0.2),
              borderRadius: BorderRadius.circular(6),
            ),
            child: const Icon(
              Icons.image,
              color: Colors.green,
              size: 18,
            ),
          ),
          const SizedBox(width: 10),

          // File name and info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.file.name,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  '${widget.file.mimeType} • ${_formatFileSize()}',
                  style: TextStyle(
                    color: Colors.grey.shade400,
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),

          // Close button
          IconButton(
            onPressed: () => Navigator.pop(context),
            icon: const Icon(Icons.close, color: Colors.white70, size: 20),
            tooltip: 'Close',
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
          ),
        ],
      ),
    );
  }

  Widget _buildImagePreview() {
    return ClipRect(
      child: Container(
        color: const Color(0xFF1C1C1C),
        child: Center(
        child: _isLoadingUrl
            ? CircularProgressIndicator(color: Colors.green)
            : _error != null
                ? Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.error_outline,
                        size: 64,
                        color: Colors.grey.shade600,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        _error!,
                        style: TextStyle(
                          color: Colors.grey.shade400,
                          fontSize: 16,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  )
                : _imageUrl != null
                    ? InteractiveViewer(
                        transformationController: _transformationController,
                        minScale: 0.5,
                        maxScale: 4.0,
                        constrained: true,
                        clipBehavior: Clip.hardEdge,
                        child: Builder(
                          builder: (context) {
                            final headers = _imageUrl!.startsWith('http://') || _imageUrl!.startsWith('https://')
                                ? (_imageUrl!.contains('s3.')
                                    ? <String, String>{} // S3 URLs don't need Authorization header
                                    : {'Authorization': 'Bearer ${AuthService.instance.currentSession}'})
                                : {'Authorization': 'Bearer ${AuthService.instance.currentSession}'};

                            return Image.network(
                              _imageUrl!,
                              fit: BoxFit.contain,
                              headers: headers,
                              loadingBuilder: (context, child, loadingProgress) {
                                if (loadingProgress == null) {
                                  return child;
                                }
                                final progress = loadingProgress.expectedTotalBytes != null
                                    ? loadingProgress.cumulativeBytesLoaded / loadingProgress.expectedTotalBytes!
                                    : null;
                                return Center(
                                  child: CircularProgressIndicator(
                                    value: progress,
                                    color: Colors.green,
                                  ),
                                );
                              },
                              errorBuilder: (context, error, stackTrace) {
                                return Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      Icons.broken_image,
                                      size: 48,
                                      color: Colors.grey.shade600,
                                    ),
                                    const SizedBox(height: 12),
                                    Text(
                                      'Failed to load image',
                                      style: TextStyle(
                                        color: Colors.grey.shade400,
                                        fontSize: 14,
                                      ),
                                    ),
                                  ],
                                );
                              },
                            );
                          },
                        ),
                      )
                    : const SizedBox(),
        ),
      ),
    );
  }

  Widget _buildFooter() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: const BoxDecoration(
        border: Border(
          top: BorderSide(
            color: Color(0xFF3C3C3C),
            width: 1,
          ),
        ),
      ),
      child: Row(
        children: [
          // Zoom controls
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: const Color(0xFF3C3C3C),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                InkWell(
                  onTap: () {
                    final newScale = (_currentScale - 0.25).clamp(0.5, 4.0);
                    _transformationController.value = Matrix4.identity()..scale(newScale);
                  },
                  child: const Icon(Icons.remove, color: Colors.white70, size: 16),
                ),
                const SizedBox(width: 8),
                Text(
                  '${(_currentScale * 100).toInt()}%',
                  style: const TextStyle(
                    color: Colors.white70,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(width: 8),
                InkWell(
                  onTap: () {
                    final newScale = (_currentScale + 0.25).clamp(0.5, 4.0);
                    _transformationController.value = Matrix4.identity()..scale(newScale);
                  },
                  child: const Icon(Icons.add, color: Colors.white70, size: 16),
                ),
                const SizedBox(width: 8),
                InkWell(
                  onTap: () {
                    _transformationController.value = Matrix4.identity();
                  },
                  child: const Icon(Icons.fit_screen, color: Colors.white70, size: 16),
                ),
              ],
            ),
          ),

          const Spacer(),

          // Action buttons
          IconButton(
            onPressed: _downloadImage,
            icon: const Icon(Icons.download, size: 20),
            color: Colors.white70,
            tooltip: 'Download',
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
          ),
        ],
      ),
    );
  }

  Future<void> _downloadImage() async {
    final messenger = ScaffoldMessenger.of(context);

    messenger.showSnackBar(
      SnackBar(content: Text('Downloading ${widget.file.name}...')),
    );

    try {
      final fileService = FileService.instance;
      fileService.initialize(widget.file.workspaceId);

      final filePath = await fileService.downloadFile(
        fileId: widget.file.id,
        fileName: widget.file.name,
      );

      if (filePath != null && mounted) {
        messenger.showSnackBar(
          SnackBar(
            content: Text('Downloaded to:\n$filePath'),
            duration: const Duration(seconds: 4),
            backgroundColor: Colors.green,
          ),
        );
      } else if (mounted) {
        messenger.showSnackBar(
          SnackBar(content: Text('Download failed')),
        );
      }
    } catch (e) {
      if (mounted) {
        messenger.showSnackBar(
          SnackBar(content: Text('Download error: $e')),
        );
      }
    }
  }

  String _formatFileSize() {
    final sizeInBytes = int.tryParse(widget.file.size) ?? 0;
    if (sizeInBytes < 1024) {
      return '$sizeInBytes B';
    } else if (sizeInBytes < 1024 * 1024) {
      return '${(sizeInBytes / 1024).toStringAsFixed(1)} KB';
    } else if (sizeInBytes < 1024 * 1024 * 1024) {
      return '${(sizeInBytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    } else {
      return '${(sizeInBytes / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
    }
  }
}

/// Helper function to show the image preview dialog
void showImagePreviewDialog(
  BuildContext context, {
  required file_model.File file,
}) {
  showDialog(
    context: context,
    builder: (context) => ImagePreviewDialog(
      file: file,
    ),
  );
}
