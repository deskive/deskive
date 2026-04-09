import 'dart:io';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:dio/dio.dart';
import 'package:path_provider/path_provider.dart';
import '../services/workspace_service.dart';
import '../api/services/file_api_service.dart';
import '../config/env_config.dart';
import '../widgets/google_drive_file_picker.dart';
import '../apps/services/google_drive_service.dart';

/// Modal dialog for importing files
/// Supports:
/// - Import from device (batch file selection)
/// - Import from URL (download file from link)
/// - Import from Google Drive (via existing integration)
class FileImportModal extends StatefulWidget {
  final String? folderId;
  final Function()? onFilesImported;

  const FileImportModal({
    super.key,
    this.folderId,
    this.onFilesImported,
  });

  @override
  State<FileImportModal> createState() => _FileImportModalState();
}

class _FileImportModalState extends State<FileImportModal> {
  final _urlController = TextEditingController();
  final _workspaceService = WorkspaceService.instance;
  final _fileApiService = FileApiService();

  String? _importType; // 'device', 'url', or 'drive'
  List<PlatformFile> _selectedFiles = [];
  bool _isProcessing = false;
  String? _errorMessage;
  double _uploadProgress = 0;
  int _uploadedCount = 0;

  @override
  void initState() {
    super.initState();
    _urlController.addListener(_onTextChanged);
  }

  void _onTextChanged() {
    setState(() {});
  }

  @override
  void dispose() {
    _urlController.removeListener(_onTextChanged);
    _urlController.dispose();
    super.dispose();
  }

  /// Handle Google Drive file selection
  Future<void> _handleGoogleDriveSelect() async {
    try {
      final result = await GoogleDriveFilePicker.show(
        context: context,
        title: 'files_import.select_from_drive'.tr(),
      );

      if (result != null) {
        // Use the Google Drive service to import the file directly to Deskive
        final driveService = GoogleDriveService.instance;

        setState(() {
          _isProcessing = true;
          _errorMessage = null;
        });

        try {
          final importResult = await driveService.importFile(
            fileId: result.file.id,
            targetFolderId: widget.folderId,
          );

          if (importResult.success) {
            if (mounted) {
              Navigator.pop(context);
              widget.onFilesImported?.call();
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('files_import.google_drive_success'.tr(args: [importResult.fileName])),
                  backgroundColor: Colors.green,
                ),
              );
            }
          } else {
            throw Exception('Import failed');
          }
        } catch (e) {
          if (mounted) {
            setState(() {
              _isProcessing = false;
              _errorMessage = 'files_import.google_drive_error'.tr();
            });
          }
        }
      }
    } catch (e) {
      debugPrint('Google Drive file picker error: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('files_import.google_drive_error'.tr()),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// Handle device file selection (multiple files)
  void _handleFileSelect() async {
    try {
      FilePickerResult? result = await FilePicker.platform.pickFiles(
        type: FileType.any,
        allowMultiple: true,
      );

      if (result != null && result.files.isNotEmpty) {
        setState(() {
          _selectedFiles = result.files;
          _errorMessage = null;
        });
      }
    } catch (e) {
      debugPrint('File picker error: $e');
      setState(() {
        _errorMessage = 'Failed to select files: $e';
      });
    }
  }

  /// Download file from URL
  Future<File?> _downloadFileFromUrl(String url) async {
    try {
      final dio = Dio();
      final tempDir = await getTemporaryDirectory();

      // Extract filename from URL or generate one
      Uri uri = Uri.parse(url);
      String fileName = uri.pathSegments.isNotEmpty
          ? uri.pathSegments.last
          : 'downloaded_file_${DateTime.now().millisecondsSinceEpoch}';

      // Handle URLs without file extension
      if (!fileName.contains('.')) {
        // Try to get content type from headers
        final headResponse = await dio.head(url);
        final contentType = headResponse.headers.value('content-type');
        if (contentType != null) {
          if (contentType.contains('pdf')) fileName += '.pdf';
          else if (contentType.contains('image/jpeg')) fileName += '.jpg';
          else if (contentType.contains('image/png')) fileName += '.png';
          else if (contentType.contains('image/gif')) fileName += '.gif';
          else if (contentType.contains('text/plain')) fileName += '.txt';
          else if (contentType.contains('application/zip')) fileName += '.zip';
          else if (contentType.contains('application/json')) fileName += '.json';
          else if (contentType.contains('text/html')) fileName += '.html';
        }
      }

      final savePath = '${tempDir.path}/$fileName';

      await dio.download(
        url,
        savePath,
        onReceiveProgress: (received, total) {
          if (total != -1) {
            setState(() {
              _uploadProgress = received / total;
            });
          }
        },
      );

      return File(savePath);
    } catch (e) {
      debugPrint('Download error: $e');
      throw Exception('Failed to download file: $e');
    }
  }

  /// Handle the import process
  Future<void> _handleImport() async {
    String? workspaceId = _workspaceService.currentWorkspace?.id;
    if (workspaceId == null || workspaceId.isEmpty) {
      workspaceId = EnvConfig.defaultWorkspaceId;
    }

    if (workspaceId == null || workspaceId.isEmpty) {
      setState(() {
        _errorMessage = 'No workspace selected';
      });
      return;
    }

    setState(() {
      _isProcessing = true;
      _errorMessage = null;
      _uploadProgress = 0;
      _uploadedCount = 0;
    });

    try {
      if (_importType == 'device' && _selectedFiles.isNotEmpty) {
        // Upload files from device
        int successCount = 0;
        final uploadDto = UploadFileDto(folderId: widget.folderId);

        for (int i = 0; i < _selectedFiles.length; i++) {
          final platformFile = _selectedFiles[i];
          if (platformFile.path != null) {
            try {
              final file = File(platformFile.path!);
              final response = await _fileApiService.uploadFile(
                workspaceId,
                file,
                uploadDto,
              );
              if (response.isSuccess) {
                successCount++;
              }
              setState(() {
                _uploadedCount = successCount;
                _uploadProgress = (i + 1) / _selectedFiles.length;
              });
            } catch (e) {
              debugPrint('Failed to upload ${platformFile.name}: $e');
            }
          }
        }

        if (successCount > 0 && mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Successfully imported $successCount file(s)'),
              backgroundColor: Colors.green,
            ),
          );
          Navigator.of(context).pop(true);
          widget.onFilesImported?.call();
        } else {
          throw Exception('Failed to upload any files');
        }
      } else if (_importType == 'url' && _urlController.text.isNotEmpty) {
        // Download and upload file from URL
        final url = _urlController.text.trim();

        setState(() {
          _uploadProgress = 0;
        });

        final downloadedFile = await _downloadFileFromUrl(url);

        if (downloadedFile != null && await downloadedFile.exists()) {
          setState(() {
            _uploadProgress = 0.5; // 50% for download complete
          });

          final uploadDto = UploadFileDto(folderId: widget.folderId);
          final response = await _fileApiService.uploadFile(
            workspaceId,
            downloadedFile,
            uploadDto,
          );

          if (response.isSuccess) {
            setState(() {
              _uploadProgress = 1.0;
            });

            // Clean up temp file
            try {
              await downloadedFile.delete();
            } catch (_) {}

            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('File imported successfully from URL'),
                  backgroundColor: Colors.green,
                ),
              );
              Navigator.of(context).pop(true);
              widget.onFilesImported?.call();
            }
          } else {
            throw Exception(response.message ?? 'Failed to upload file');
          }
        }
      }
    } catch (e) {
      debugPrint('Import error: $e');
      setState(() {
        _errorMessage = e.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          _isProcessing = false;
        });
      }
    }
  }

  /// Get file icon based on extension
  IconData _getFileIcon(String fileName) {
    final ext = fileName.toLowerCase().split('.').last;
    switch (ext) {
      case 'pdf':
        return Icons.picture_as_pdf;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return Icons.image;
      case 'mp4':
      case 'mov':
      case 'avi':
      case 'mkv':
        return Icons.video_file;
      case 'mp3':
      case 'wav':
      case 'aac':
      case 'm4a':
        return Icons.audio_file;
      case 'doc':
      case 'docx':
        return Icons.description;
      case 'xls':
      case 'xlsx':
      case 'csv':
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

  /// Format file size
  String _formatFileSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    if (bytes < 1024 * 1024 * 1024) return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 450, maxHeight: 600),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header
              Row(
                children: [
                  if (_importType != null)
                    IconButton(
                      icon: const Icon(Icons.arrow_back),
                      onPressed: () {
                        setState(() {
                          _importType = null;
                          _selectedFiles = [];
                          _urlController.clear();
                          _errorMessage = null;
                        });
                      },
                    ),
                  Expanded(
                    child: Text(
                      'files_import.title'.tr(),
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Content
              if (_importType == null) ...[
                Text(
                  'files_import.description'.tr(),
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 24),

                // Import type selection
                Row(
                  children: [
                    Expanded(
                      child: _ImportTypeCard(
                        icon: Icons.smartphone,
                        label: 'files_import.from_device'.tr(),
                        onTap: () {
                          setState(() {
                            _importType = 'device';
                          });
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _ImportTypeCard(
                        icon: Icons.link,
                        label: 'files_import.from_url'.tr(),
                        onTap: () {
                          setState(() {
                            _importType = 'url';
                          });
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                _ImportTypeCard(
                  icon: Icons.cloud,
                  label: 'files_import.from_google_drive'.tr(),
                  onTap: _handleGoogleDriveSelect,
                ),
              ] else ...[
                if (_importType == 'device') ...[
                  // File selection area
                  InkWell(
                    onTap: _handleFileSelect,
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        border: Border.all(
                          color: colorScheme.outline,
                          style: BorderStyle.solid,
                        ),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Column(
                        children: [
                          Icon(
                            Icons.cloud_upload_outlined,
                            size: 48,
                            color: colorScheme.primary,
                          ),
                          const SizedBox(height: 12),
                          Text(
                            _selectedFiles.isEmpty
                                ? 'files_import.select_files'.tr()
                                : '${_selectedFiles.length} file(s) selected',
                            style: theme.textTheme.bodyMedium,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'files_import.tap_to_browse'.tr(),
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Selected files list
                  if (_selectedFiles.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    ConstrainedBox(
                      constraints: const BoxConstraints(maxHeight: 200),
                      child: ListView.builder(
                        shrinkWrap: true,
                        itemCount: _selectedFiles.length,
                        itemBuilder: (context, index) {
                          final file = _selectedFiles[index];
                          return ListTile(
                            dense: true,
                            leading: Icon(
                              _getFileIcon(file.name),
                              color: colorScheme.primary,
                            ),
                            title: Text(
                              file.name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            subtitle: Text(_formatFileSize(file.size)),
                            trailing: IconButton(
                              icon: const Icon(Icons.close, size: 18),
                              onPressed: () {
                                setState(() {
                                  _selectedFiles.removeAt(index);
                                });
                              },
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ] else if (_importType == 'url') ...[
                  // URL input
                  TextField(
                    controller: _urlController,
                    decoration: InputDecoration(
                      labelText: 'files_import.url'.tr(),
                      hintText: 'https://example.com/file.pdf',
                      border: const OutlineInputBorder(),
                      prefixIcon: const Icon(Icons.link),
                    ),
                    keyboardType: TextInputType.url,
                    autofocus: true,
                  ),
                  const SizedBox(height: 12),
                  // URL hints
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(
                              Icons.info_outline,
                              size: 16,
                              color: colorScheme.onSurfaceVariant,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'files_import.url_hint'.tr(),
                              style: theme.textTheme.bodySmall?.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'files_import.url_examples'.tr(),
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                // Progress indicator
                if (_isProcessing) ...[
                  const SizedBox(height: 16),
                  Column(
                    children: [
                      LinearProgressIndicator(value: _uploadProgress),
                      const SizedBox(height: 8),
                      Text(
                        _importType == 'device'
                            ? 'Uploading $_uploadedCount of ${_selectedFiles.length} files...'
                            : 'Downloading and uploading file...',
                        style: theme.textTheme.bodySmall,
                      ),
                    ],
                  ),
                ],

                // Error message
                if (_errorMessage != null && _errorMessage!.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.red.shade200),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.error_outline,
                          color: Colors.red.shade700,
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _errorMessage!,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: Colors.red.shade700,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                const SizedBox(height: 24),

                // Action buttons
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed: () => Navigator.of(context).pop(),
                      child: Text('common.cancel'.tr()),
                    ),
                    const SizedBox(width: 12),
                    FilledButton.icon(
                      onPressed: _isProcessing ||
                              (_importType == 'device'
                                  ? _selectedFiles.isEmpty
                                  : _urlController.text.trim().isEmpty)
                          ? null
                          : _handleImport,
                      icon: _isProcessing
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Icon(Icons.upload, size: 18),
                      label: Text(
                        _isProcessing
                            ? 'files_import.importing'.tr()
                            : 'files_import.import'.tr(),
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

/// Card widget for import type selection
class _ImportTypeCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _ImportTypeCard({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 16),
        decoration: BoxDecoration(
          border: Border.all(color: colorScheme.outline),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Icon(
              icon,
              size: 32,
              color: colorScheme.primary,
            ),
            const SizedBox(height: 12),
            Text(
              label,
              style: theme.textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w500,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

/// Show the file import modal dialog
/// Returns true on success, null on cancel
Future<bool?> showFileImportModal({
  required BuildContext context,
  String? folderId,
  Function()? onFilesImported,
}) {
  return showDialog<bool>(
    context: context,
    builder: (context) => FileImportModal(
      folderId: folderId,
      onFilesImported: onFilesImported,
    ),
  );
}
