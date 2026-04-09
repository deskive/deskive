import 'dart:io';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:markdown/markdown.dart' as md;
import 'package:archive/archive.dart';
import 'package:xml/xml.dart' as xml;
import '../../api/services/notes_api_service.dart' as api;
import '../../services/workspace_service.dart';
import '../../config/env_config.dart';

/// Modal dialog for importing files as notes
/// Supports: TXT, Markdown (.md), Word documents (.docx), PDF (with tables & images)
/// Also supports importing content from URLs (articles, blog posts, etc.)
class FileImportModal extends StatefulWidget {
  final String? parentId;
  final Function(String noteId)? onNoteCreated;

  const FileImportModal({
    super.key,
    this.parentId,
    this.onNoteCreated,
  });

  @override
  State<FileImportModal> createState() => _FileImportModalState();
}

class _FileImportModalState extends State<FileImportModal> {
  final _titleController = TextEditingController();
  final _urlController = TextEditingController();
  final _notesApiService = api.NotesApiService();
  final _workspaceService = WorkspaceService.instance;

  String? _importType; // 'file' or 'url'
  PlatformFile? _selectedFile;
  bool _isProcessing = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    // Add listeners to update button state when text changes
    _titleController.addListener(_onTextChanged);
    _urlController.addListener(_onTextChanged);
  }

  void _onTextChanged() {
    // Trigger rebuild to update button enabled state
    setState(() {});
  }

  @override
  void dispose() {
    _titleController.removeListener(_onTextChanged);
    _urlController.removeListener(_onTextChanged);
    _titleController.dispose();
    _urlController.dispose();
    super.dispose();
  }

  void _handleFileSelect() async {
    try {
      // Use FileType.any to avoid permission issues on Android 13+
      // We'll filter by extension after selection
      FilePickerResult? result = await FilePicker.platform.pickFiles(
        type: FileType.any,
        allowMultiple: false,
      );

      if (result != null && result.files.isNotEmpty) {
        final file = result.files.first;
        final fileName = file.name.toLowerCase();

        // Check if file extension is supported
        final supportedExtensions = ['txt', 'md', 'docx', 'pdf'];
        final extension = fileName.contains('.')
            ? fileName.split('.').last
            : '';

        if (!supportedExtensions.contains(extension)) {
          setState(() {
            _errorMessage = 'Unsupported file type. Please select a .txt, .md, .docx, or .pdf file.';
          });
          return;
        }

        debugPrint('File selected: ${file.name}, path: ${file.path}, size: ${file.size}');
        setState(() {
          _selectedFile = file;
          // Set title from filename (without extension)
          final lastDotIndex = file.name.lastIndexOf('.');
          _titleController.text = lastDotIndex > 0
              ? file.name.substring(0, lastDotIndex)
              : file.name;
          _errorMessage = null;
        });
      }
    } catch (e, stackTrace) {
      debugPrint('File picker error: $e');
      debugPrint('Stack trace: $stackTrace');
      setState(() {
        _errorMessage = 'Failed to select file: $e';
      });
    }
  }

  /// Check if file is a PDF
  bool _isPdfFile(PlatformFile file) {
    return file.name.toLowerCase().endsWith('.pdf');
  }

  /// Process file content and convert to HTML (for non-PDF files)
  Future<String> _processFileContent(PlatformFile file) async {
    final fileName = file.name.toLowerCase();
    debugPrint('Processing file: $fileName');
    debugPrint('File bytes available: ${file.bytes != null}');
    debugPrint('File path: ${file.path}');

    // Read file bytes - try from bytes first, then from path
    List<int> bytes;
    if (file.bytes != null) {
      debugPrint('Reading from bytes, size: ${file.bytes!.length}');
      bytes = file.bytes!;
    } else if (file.path != null) {
      debugPrint('Reading from file path: ${file.path}');
      final fileOnDisk = File(file.path!);
      if (!await fileOnDisk.exists()) {
        debugPrint('File does not exist at path: ${file.path}');
        throw Exception('File not found at path');
      }
      bytes = await fileOnDisk.readAsBytes();
      debugPrint('Read ${bytes.length} bytes from file');
    } else {
      debugPrint('No bytes or path available');
      throw Exception('Failed to read file content - no path or bytes available');
    }

    // Handle plain text files (.txt)
    if (fileName.endsWith('.txt')) {
      final content = utf8.decode(bytes);
      // Convert plain text to HTML paragraphs
      final paragraphs = content.split('\n\n').where((p) => p.trim().isNotEmpty);
      if (paragraphs.isEmpty) {
        return '<p>${content.replaceAll('\n', '<br>')}</p>';
      }
      return paragraphs.map((p) => '<p>${p.replaceAll('\n', '<br>')}</p>').join('');
    }

    // Handle Markdown files (.md)
    if (fileName.endsWith('.md')) {
      final content = utf8.decode(bytes);
      // Convert markdown to HTML
      final html = md.markdownToHtml(
        content,
        extensionSet: md.ExtensionSet.gitHubWeb,
      );
      return html.isNotEmpty ? html : '<p></p>';
    }

    // Handle Word documents (.docx)
    if (fileName.endsWith('.docx')) {
      try {
        return await _extractDocxContent(bytes);
      } catch (e) {
        debugPrint('Failed to parse Word document: $e');
        throw Exception('Failed to parse Word document. Please ensure the file is a valid .docx file.');
      }
    }

    // For other file types, try to read as text
    try {
      final content = utf8.decode(bytes);
      return '<p>${content.replaceAll('\n', '<br>')}</p>';
    } catch (e) {
      throw Exception('Unable to read file content');
    }
  }

  /// Extract text content from .docx file
  Future<String> _extractDocxContent(List<int> bytes) async {
    // .docx files are ZIP archives containing XML files
    final archive = ZipDecoder().decodeBytes(bytes);

    // Find the main document content
    final documentFile = archive.files.firstWhere(
      (file) => file.name == 'word/document.xml',
      orElse: () => throw Exception('Invalid .docx file: document.xml not found'),
    );

    final documentContent = utf8.decode(documentFile.content as List<int>);
    final document = xml.XmlDocument.parse(documentContent);

    // Extract text from paragraphs
    final paragraphs = <String>[];
    final body = document.findAllElements('w:body').firstOrNull;

    if (body != null) {
      for (final paragraph in body.findAllElements('w:p')) {
        final textParts = <String>[];

        for (final run in paragraph.findAllElements('w:r')) {
          for (final text in run.findAllElements('w:t')) {
            textParts.add(text.innerText);
          }
        }

        final paragraphText = textParts.join('');
        if (paragraphText.isNotEmpty) {
          paragraphs.add('<p>$paragraphText</p>');
        }
      }
    }

    return paragraphs.isNotEmpty ? paragraphs.join('\n') : '<p></p>';
  }

  Future<void> _handleImport() async {
    final title = _titleController.text.trim();

    if (title.isEmpty) {
      setState(() {
        _errorMessage = 'notes_import.error_no_title'.tr();
      });
      return;
    }

    // Get workspace ID
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
    });

    try {
      String? noteId;

      if (_importType == 'file' && _selectedFile != null) {
        // Check if it's a PDF - use backend processing
        if (_isPdfFile(_selectedFile!)) {
          if (_selectedFile!.path == null) {
            throw Exception('PDF file path not available');
          }

          debugPrint('Importing PDF: ${_selectedFile!.name}');
          final response = await _notesApiService.importPdf(
            workspaceId,
            _selectedFile!.path!,
            _selectedFile!.name,
            title: title,
            parentId: widget.parentId,
            tags: ['pdf', 'imported'],
            extractImages: true,
          );

          if (response.isSuccess && response.data != null) {
            noteId = response.data!.noteId;

            if (mounted) {
              final data = response.data!;
              String description = 'Imported ${data.pageCount} pages';
              if (data.hasTable) description += ' with tables';
              if (data.imageCount > 0) description += ' and ${data.imageCount} images';

              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(description),
                  backgroundColor: Colors.green,
                ),
              );
            }
          } else {
            throw Exception(response.message ?? 'Failed to import PDF');
          }
        } else {
          // Process other file types locally (TXT, MD, DOCX)
          debugPrint('Processing file: ${_selectedFile!.name}');
          final htmlContent = await _processFileContent(_selectedFile!);
          debugPrint('File processed, content length: ${htmlContent.length}');

          // Create the note using the API
          final createNoteDto = api.CreateNoteDto(
            title: title,
            content: htmlContent,
            tags: ['imported'],
          );

          final response = await _notesApiService.createNote(
            workspaceId,
            createNoteDto,
          );

          if (response.isSuccess && response.data != null) {
            noteId = response.data!.id;
          } else {
            throw Exception(response.message ?? 'Failed to create note');
          }
        }
      } else if (_importType == 'url' && _urlController.text.isNotEmpty) {
        // Use backend to fetch and extract content from URL
        final url = _urlController.text.trim();
        debugPrint('Importing URL: $url');

        final response = await _notesApiService.importUrl(
          workspaceId,
          url: url,
          title: title.isNotEmpty ? title : null,
          parentId: widget.parentId,
          tags: ['web', 'imported'],
        );

        if (response.isSuccess && response.data != null) {
          noteId = response.data!.noteId;

          if (mounted) {
            final siteName = response.data!.siteName ?? 'website';
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Imported content from $siteName'),
                backgroundColor: Colors.green,
              ),
            );
          }
        } else {
          throw Exception(response.message ?? 'Failed to import URL');
        }
      }

      if (noteId != null && mounted) {
        // Show success message
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('notes_import.success'.tr()),
            backgroundColor: Colors.green,
          ),
        );

        // Close the modal first and return the noteId
        Navigator.of(context).pop(noteId);

        // Call the callback after modal is closed (if provided)
        // Use addPostFrameCallback to ensure modal is fully dismissed
        final nonNullNoteId = noteId!; // noteId is guaranteed non-null here
        WidgetsBinding.instance.addPostFrameCallback((_) {
          widget.onNoteCreated?.call(nonNullNoteId);
        });
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

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 400),
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
                          _selectedFile = null;
                          _titleController.clear();
                          _urlController.clear();
                          _errorMessage = null;
                        });
                      },
                    ),
                  Expanded(
                    child: Text(
                      'notes_import.title'.tr(),
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
                  'notes_import.description'.tr(),
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
                        icon: Icons.insert_drive_file,
                        label: 'notes_import.import_file'.tr(),
                        onTap: () {
                          setState(() {
                            _importType = 'file';
                          });
                        },
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: _ImportTypeCard(
                        icon: Icons.link,
                        label: 'notes_import.import_url'.tr(),
                        onTap: () {
                          setState(() {
                            _importType = 'url';
                          });
                        },
                      ),
                    ),
                  ],
                ),
              ] else ...[
                // Title input
                TextField(
                  controller: _titleController,
                  decoration: InputDecoration(
                    labelText: 'notes_import.note_title'.tr(),
                    hintText: 'notes_import.note_title_hint'.tr(),
                    border: const OutlineInputBorder(),
                  ),
                  autofocus: true,
                ),
                const SizedBox(height: 16),

                if (_importType == 'file') ...[
                  // File selection
                  InkWell(
                    onTap: _handleFileSelect,
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        border: Border.all(color: colorScheme.outline),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            _selectedFile != null
                                ? (_isPdfFile(_selectedFile!) ? Icons.picture_as_pdf : Icons.description)
                                : Icons.upload_file,
                            color: _selectedFile != null && _isPdfFile(_selectedFile!)
                                ? Colors.red
                                : colorScheme.primary,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _selectedFile?.name ??
                                      'notes_import.select_file'.tr(),
                                  style: theme.textTheme.bodyMedium,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                if (_selectedFile == null)
                                  Text(
                                    'notes_import.supported_formats'.tr(),
                                    style: theme.textTheme.bodySmall?.copyWith(
                                      color: colorScheme.onSurfaceVariant,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                          if (_selectedFile != null)
                            IconButton(
                              icon: const Icon(Icons.close),
                              onPressed: () {
                                setState(() {
                                  _selectedFile = null;
                                  _titleController.clear();
                                });
                              },
                            ),
                        ],
                      ),
                    ),
                  ),
                ] else if (_importType == 'url') ...[
                  // URL input
                  TextField(
                    controller: _urlController,
                    decoration: InputDecoration(
                      labelText: 'notes_import.url'.tr(),
                      hintText: 'https://example.com/article',
                      border: const OutlineInputBorder(),
                      prefixIcon: const Icon(Icons.link),
                    ),
                    keyboardType: TextInputType.url,
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
                        Text(
                          'Supported URLs:',
                          style: theme.textTheme.bodySmall?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '• News articles (BBC, CNN, etc.)\n'
                          '• Blog posts (Medium, Dev.to, etc.)\n'
                          '• Wikipedia articles\n'
                          '• Documentation pages',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: colorScheme.onSurfaceVariant,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Note: Google Docs, Notion, and login-protected pages are not supported.',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: Colors.amber.shade700,
                          ),
                        ),
                      ],
                    ),
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
                              _titleController.text.trim().isEmpty ||
                              (_importType == 'file'
                                  ? _selectedFile == null
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
                            ? 'notes_import.importing'.tr()
                            : 'notes_import.import'.tr(),
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
/// Returns the noteId on success, null on cancel
Future<dynamic> showFileImportModal({
  required BuildContext context,
  String? parentId,
  Function(String noteId)? onNoteCreated,
}) {
  return showDialog<dynamic>(
    context: context,
    builder: (context) => FileImportModal(
      parentId: parentId,
      onNoteCreated: onNoteCreated,
    ),
  );
}
