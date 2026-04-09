import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:file_picker/file_picker.dart';
import '../services/file_service.dart';

class FileUploadDialog extends StatefulWidget {
  final String? folderId;
  final VoidCallback? onUploadComplete;

  const FileUploadDialog({
    super.key,
    this.folderId,
    this.onUploadComplete,
  });

  @override
  State<FileUploadDialog> createState() => _FileUploadDialogState();
}

class _FileUploadDialogState extends State<FileUploadDialog> {
  final List<PlatformFile> _selectedFiles = [];
  bool _isPublic = false;
  bool _isUploading = false;
  final FileService _fileService = FileService.instance;

  Future<void> _pickFiles() async {
    try {
      FilePickerResult? result = await FilePicker.platform.pickFiles(
        allowMultiple: true,
        type: FileType.any,
      );

      if (result != null) {
        setState(() {
          _selectedFiles.addAll(result.files);
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('files.error_picking_files'.tr(args: [e.toString()]))),
        );
      }
    }
  }

  void _removeFile(int index) {
    setState(() {
      _selectedFiles.removeAt(index);
    });
  }

  String _formatFileSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    if (bytes < 1024 * 1024 * 1024) {
      return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    }
    return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
  }

  int get _totalSize {
    return _selectedFiles.fold(0, (sum, file) => sum + (file.size));
  }

  Future<void> _uploadFiles() async {
    if (_selectedFiles.isEmpty) return;

    setState(() {
      _isUploading = true;
    });

    try {
      for (final platformFile in _selectedFiles) {
        if (platformFile.path != null) {
          final file = File(platformFile.path!);
          await _fileService.uploadFile(
            file: file,
            folderId: widget.folderId,
            isPublic: _isPublic,
          );
        }
      }

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('files.file_upload_success'.tr(args: ['${_selectedFiles.length}'])),
          ),
        );
        widget.onUploadComplete?.call();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('files.upload_failed'.tr(args: [e.toString()]))),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isUploading = false;
        });
      }
    }
  }

  IconData _getFileIcon(String? extension) {
    if (extension == null) return Icons.insert_drive_file;

    switch (extension.toLowerCase()) {
      case 'pdf':
        return Icons.picture_as_pdf;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return Icons.image;
      case 'mp4':
      case 'avi':
      case 'mov':
        return Icons.videocam;
      case 'mp3':
      case 'wav':
      case 'aac':
        return Icons.audiotrack;
      case 'doc':
      case 'docx':
        return Icons.description;
      case 'xls':
      case 'xlsx':
        return Icons.table_chart;
      case 'ppt':
      case 'pptx':
        return Icons.slideshow;
      case 'zip':
      case 'rar':
      case '7z':
        return Icons.folder_zip;
      default:
        return Icons.insert_drive_file;
    }
  }

  Color _getFileColor(String? extension) {
    if (extension == null) return Colors.grey;

    switch (extension.toLowerCase()) {
      case 'pdf':
        return Colors.red;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return Colors.green;
      case 'mp4':
      case 'avi':
      case 'mov':
        return Colors.purple;
      case 'mp3':
      case 'wav':
      case 'aac':
        return Colors.orange;
      case 'doc':
      case 'docx':
        return Colors.blue;
      case 'xls':
      case 'xlsx':
        return Colors.green.shade700;
      case 'ppt':
      case 'pptx':
        return Colors.deepOrange;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: Container(
        width: 450,
        constraints: const BoxConstraints(maxHeight: 550),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Main upload area
              GestureDetector(
                onTap: _pickFiles,
                child: Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    border: Border.all(
                      color: Theme.of(context).colorScheme.outline,
                      width: 1.5,
                      style: BorderStyle.solid,
                    ),
                    borderRadius: BorderRadius.circular(8),
                    color: Theme.of(context)
                        .colorScheme
                        .surfaceContainerHighest
                        .withOpacity(0.3),
                  ),
                  child: Column(
                    children: [
                      // Close button at top right
                      Align(
                        alignment: Alignment.topRight,
                        child: IconButton(
                          icon: const Icon(Icons.close, size: 18),
                          onPressed: () => Navigator.pop(context),
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Icon(
                        Icons.cloud_upload_outlined,
                        size: 40,
                        color: Theme.of(context)
                            .colorScheme
                            .onSurfaceVariant,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'files.drag_drop_files'.tr(),
                        style: Theme.of(context)
                            .textTheme
                            .titleMedium
                            ?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'files.or_click_browse'.tr(),
                        style: Theme.of(context)
                            .textTheme
                            .bodySmall
                            ?.copyWith(
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurfaceVariant,
                            ),
                      ),
                      const SizedBox(height: 12),
                      ElevatedButton.icon(
                        onPressed: _pickFiles,
                        icon: const Icon(Icons.folder_open, size: 18),
                        label: Text('files.choose_files'.tr()),
                        style: ElevatedButton.styleFrom(
                          backgroundColor:
                              Theme.of(context).colorScheme.primary,
                          foregroundColor:
                              Theme.of(context).colorScheme.onPrimary,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 20,
                            vertical: 10,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(6),
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'files.max_file_size'.tr(),
                        style: Theme.of(context)
                            .textTheme
                            .bodySmall
                            ?.copyWith(
                              fontSize: 11,
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurfaceVariant
                                  .withOpacity(0.7),
                            ),
                      ),
                    ],
                  ),
                ),
              ),

                    // Files to upload
                    if (_selectedFiles.isNotEmpty) ...[
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Text(
                            'files.selected_files'.tr(),
                            style:
                                Theme.of(context).textTheme.titleSmall?.copyWith(
                                      fontWeight: FontWeight.bold,
                                    ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              '${_selectedFiles.length}',
                              style: TextStyle(
                                color: Theme.of(context).colorScheme.primary,
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Container(
                        decoration: BoxDecoration(
                          border: Border.all(
                            color: Theme.of(context).colorScheme.outline,
                          ),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: ListView.separated(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: _selectedFiles.length,
                          separatorBuilder: (context, index) => Divider(
                            height: 1,
                            color: Theme.of(context).colorScheme.outline.withOpacity(0.5),
                          ),
                          itemBuilder: (context, index) {
                            final file = _selectedFiles[index];
                            final extension = file.extension;
                            final icon = _getFileIcon(extension);
                            final color = _getFileColor(extension);

                            return ListTile(
                              dense: true,
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 4,
                              ),
                              leading: Container(
                                width: 36,
                                height: 36,
                                decoration: BoxDecoration(
                                  color: color.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Icon(icon, color: color, size: 20),
                              ),
                              title: Text(
                                file.name,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w500,
                                  fontSize: 13,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              subtitle: Text(
                                '${_formatFileSize(file.size)}',
                                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  fontSize: 11,
                                ),
                              ),
                              trailing: IconButton(
                                icon: const Icon(Icons.close, size: 18),
                                color: Theme.of(context).colorScheme.error,
                                onPressed: () => _removeFile(index),
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(
                                  minWidth: 32,
                                  minHeight: 32,
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    ],


              // Action buttons at bottom
              if (_selectedFiles.isNotEmpty) ...[
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed: _isUploading ? null : () => Navigator.pop(context),
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 10,
                        ),
                      ),
                      child: Text('common.cancel'.tr()),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton.icon(
                      onPressed: _isUploading ? null : _uploadFiles,
                      icon: _isUploading
                          ? const SizedBox(
                              width: 14,
                              height: 14,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Icon(Icons.cloud_upload, size: 18),
                      label: Text(_isUploading ? 'files.uploading'.tr() : 'files.upload'.tr()),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Theme.of(context).colorScheme.primary,
                        foregroundColor: Theme.of(context).colorScheme.onPrimary,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 10,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// Helper function to show the upload dialog
void showFileUploadDialog(
  BuildContext context, {
  String? folderId,
  VoidCallback? onUploadComplete,
}) {

  showDialog(
    context: context,
    barrierDismissible: false,
    builder: (context) {
      return FileUploadDialog(
        folderId: folderId,
        onUploadComplete: onUploadComplete,
      );
    },
  );

}
