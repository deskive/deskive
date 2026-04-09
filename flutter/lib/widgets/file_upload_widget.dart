import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:provider/provider.dart';
import 'dart:io';
import '../services/file_service.dart';

/// Widget for handling file uploads with progress tracking
class FileUploadWidget extends StatefulWidget {
  final String? folderId;
  final VoidCallback? onUploadComplete;
  final bool allowMultiple;
  final List<String>? allowedExtensions;
  final int maxFileSizeBytes;
  
  const FileUploadWidget({
    super.key,
    this.folderId,
    this.onUploadComplete,
    this.allowMultiple = true,
    this.allowedExtensions,
    this.maxFileSizeBytes = 100 * 1024 * 1024, // 100MB default
  });

  @override
  State<FileUploadWidget> createState() => _FileUploadWidgetState();
}

class _FileUploadWidgetState extends State<FileUploadWidget> {
  final List<UploadTask> _uploadTasks = [];
  bool _isUploading = false;

  @override
  Widget build(BuildContext context) {
    return Consumer<FileService>(
      builder: (context, fileService, child) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Upload button
            ElevatedButton.icon(
              onPressed: _isUploading ? null : _pickAndUploadFiles,
              icon: const Icon(Icons.cloud_upload),
              label: Text(_isUploading ? 'Uploading...' : 'Upload Files'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.all(16),
                backgroundColor: Theme.of(context).primaryColor,
                foregroundColor: Colors.white,
              ),
            ),
            
            if (_uploadTasks.isNotEmpty) ...[
              const SizedBox(height: 16),
              // Upload progress section
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Theme.of(context).cardColor,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey.shade300),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.upload_file, size: 20),
                        const SizedBox(width: 8),
                        Text(
                          'Upload Progress',
                          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                        ),
                        const Spacer(),
                        if (_isUploading)
                          TextButton(
                            onPressed: _cancelAllUploads,
                            child: const Text('Cancel All'),
                          ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    ...(_uploadTasks.map((task) => _buildUploadTaskItem(task, fileService)).toList()),
                  ],
                ),
              ),
            ],
          ],
        );
      },
    );
  }

  Widget _buildUploadTaskItem(UploadTask task, FileService fileService) {
    final progress = fileService.getUploadProgress(task.id);
    final isUploading = fileService.isUploading(task.id);
    
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                _getFileIcon(task.fileName),
                size: 16,
                color: Theme.of(context).primaryColor,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  task.fileName,
                  style: Theme.of(context).textTheme.bodyMedium,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Text(
                _formatFileSize(task.fileSize),
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Colors.grey.shade600,
                    ),
              ),
              if (isUploading) ...[
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.cancel, size: 16),
                  onPressed: () => _cancelUpload(task.id, fileService),
                  tooltip: 'Cancel upload',
                ),
              ],
            ],
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Expanded(
                child: LinearProgressIndicator(
                  value: task.isCompleted ? 1.0 : progress,
                  backgroundColor: Colors.grey.shade300,
                  valueColor: AlwaysStoppedAnimation<Color>(
                    task.hasError
                        ? Colors.red
                        : task.isCompleted
                            ? Colors.green
                            : Theme.of(context).primaryColor,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                task.hasError
                    ? 'Error'
                    : task.isCompleted
                        ? 'Complete'
                        : '${(progress * 100).toInt()}%',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: task.hasError
                          ? Colors.red
                          : task.isCompleted
                              ? Colors.green
                              : Theme.of(context).primaryColor,
                      fontWeight: FontWeight.w500,
                    ),
              ),
            ],
          ),
          if (task.hasError && task.errorMessage != null) ...[
            const SizedBox(height: 4),
            Text(
              task.errorMessage!,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.red,
                  ),
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _pickAndUploadFiles() async {
    try {
      FilePickerResult? result = await FilePicker.platform.pickFiles(
        allowMultiple: widget.allowMultiple,
        type: widget.allowedExtensions != null ? FileType.custom : FileType.any,
        allowedExtensions: widget.allowedExtensions,
        withData: false, // We'll read the file ourselves for better performance
      );

      if (result != null) {
        final files = result.paths
            .where((path) => path != null)
            .map((path) => File(path!))
            .toList();

        await _uploadFiles(files);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to pick files: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _uploadFiles(List<File> files) async {
    final fileService = Provider.of<FileService>(context, listen: false);
    
    // Validate files first
    final validFiles = <File>[];
    for (final file in files) {
      final fileSize = await file.length();
      if (fileSize > widget.maxFileSizeBytes) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('${file.path.split('/').last} exceeds maximum file size'),
              backgroundColor: Colors.orange,
            ),
          );
        }
        continue;
      }
      validFiles.add(file);
    }

    if (validFiles.isEmpty) return;

    setState(() {
      _isUploading = true;
      // Create upload tasks
      for (final file in validFiles) {
        _uploadTasks.add(UploadTask(
          id: file.path,
          fileName: file.path.split('/').last,
          fileSize: 0, // Will be set after getting file size
        ));
      }
    });

    // Start uploads
    final uploadFutures = validFiles.map((file) async {
      try {
        final fileSize = await file.length();
        final taskIndex = _uploadTasks.indexWhere((task) => task.id == file.path);
        if (taskIndex != -1) {
          setState(() {
            _uploadTasks[taskIndex] = _uploadTasks[taskIndex].copyWith(fileSize: fileSize);
          });
        }

        final response = await fileService.uploadFile(
          file: file,
          folderId: widget.folderId,
        );

        if (mounted) {
          final taskIndex = _uploadTasks.indexWhere((task) => task.id == file.path);
          if (taskIndex != -1) {
            setState(() {
              if (response.success) {
                _uploadTasks[taskIndex] = _uploadTasks[taskIndex].copyWith(
                  isCompleted: true,
                  hasError: false,
                );
              } else {
                _uploadTasks[taskIndex] = _uploadTasks[taskIndex].copyWith(
                  hasError: true,
                  errorMessage: response.message ?? 'Upload failed',
                );
              }
            });
          }

          if (!response.success) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Failed to upload ${file.path.split('/').last}: ${response.message}'),
                backgroundColor: Colors.red,
              ),
            );
          }
        }

        return response;
      } catch (e) {
        if (mounted) {
          final taskIndex = _uploadTasks.indexWhere((task) => task.id == file.path);
          if (taskIndex != -1) {
            setState(() {
              _uploadTasks[taskIndex] = _uploadTasks[taskIndex].copyWith(
                hasError: true,
                errorMessage: e.toString(),
              );
            });
          }
        }
        return null;
      }
    }).toList();

    // Wait for all uploads to complete
    await Future.wait(uploadFutures);

    if (mounted) {
      setState(() {
        _isUploading = false;
      });

      // Call callback if all uploads were successful
      final hasErrors = _uploadTasks.any((task) => task.hasError);
      if (!hasErrors && widget.onUploadComplete != null) {
        widget.onUploadComplete!();
      }

      // Show completion message
      final completedCount = _uploadTasks.where((task) => task.isCompleted).length;
      final totalCount = _uploadTasks.length;
      
      if (completedCount > 0) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('$completedCount of $totalCount files uploaded successfully'),
            backgroundColor: hasErrors ? Colors.orange : Colors.green,
          ),
        );
      }

      // Clear completed tasks after a delay
      Future.delayed(const Duration(seconds: 3), () {
        if (mounted) {
          setState(() {
            _uploadTasks.removeWhere((task) => task.isCompleted && !task.hasError);
          });
        }
      });
    }
  }

  void _cancelUpload(String taskId, FileService fileService) {
    fileService.cancelUpload(taskId);
    setState(() {
      _uploadTasks.removeWhere((task) => task.id == taskId);
    });
  }

  void _cancelAllUploads() {
    final fileService = Provider.of<FileService>(context, listen: false);
    for (final task in _uploadTasks) {
      if (!task.isCompleted) {
        fileService.cancelUpload(task.id);
      }
    }
    setState(() {
      _uploadTasks.clear();
      _isUploading = false;
    });
  }

  IconData _getFileIcon(String fileName) {
    final extension = fileName.split('.').last.toLowerCase();
    switch (extension) {
      case 'pdf':
        return Icons.picture_as_pdf;
      case 'doc':
      case 'docx':
        return Icons.description;
      case 'xls':
      case 'xlsx':
        return Icons.table_chart;
      case 'ppt':
      case 'pptx':
        return Icons.slideshow;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
      case 'webp':
        return Icons.image;
      case 'mp4':
      case 'mov':
      case 'avi':
      case 'wmv':
        return Icons.video_file;
      case 'mp3':
      case 'wav':
      case 'flac':
      case 'aac':
        return Icons.audio_file;
      case 'zip':
      case 'rar':
      case '7z':
      case 'tar':
        return Icons.archive;
      case 'txt':
      case 'md':
      case 'rtf':
        return Icons.text_fields;
      default:
        return Icons.insert_drive_file;
    }
  }

  String _formatFileSize(int bytes) {
    if (bytes == 0) return '0 B';
    const suffixes = ['B', 'KB', 'MB', 'GB', 'TB'];
    var i = 0;
    double size = bytes.toDouble();
    
    while (size >= 1024 && i < suffixes.length - 1) {
      size /= 1024;
      i++;
    }
    
    return '${size.toStringAsFixed(i == 0 ? 0 : 1)} ${suffixes[i]}';
  }
}

/// Data class for tracking upload tasks
class UploadTask {
  final String id;
  final String fileName;
  final int fileSize;
  final bool isCompleted;
  final bool hasError;
  final String? errorMessage;

  const UploadTask({
    required this.id,
    required this.fileName,
    required this.fileSize,
    this.isCompleted = false,
    this.hasError = false,
    this.errorMessage,
  });

  UploadTask copyWith({
    String? id,
    String? fileName,
    int? fileSize,
    bool? isCompleted,
    bool? hasError,
    String? errorMessage,
  }) {
    return UploadTask(
      id: id ?? this.id,
      fileName: fileName ?? this.fileName,
      fileSize: fileSize ?? this.fileSize,
      isCompleted: isCompleted ?? this.isCompleted,
      hasError: hasError ?? this.hasError,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}