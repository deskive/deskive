import 'package:flutter/material.dart';
import 'package:html/parser.dart' as html_parser;
import '../api/services/calendar_api_service.dart' as calendar_api;
import '../api/services/notes_api_service.dart' as notes_api;
import '../notes/note.dart';
import '../notes/note_editor_screen.dart';
import '../services/workspace_service.dart';

/// Reusable Event Preview Dialog that fetches full event details from API
class EventPreviewDialog extends StatefulWidget {
  final String eventId;
  final String eventName;
  final String workspaceId;
  final calendar_api.CalendarApiService? calendarApi;

  const EventPreviewDialog({
    super.key,
    required this.eventId,
    required this.eventName,
    required this.workspaceId,
    this.calendarApi,
  });

  /// Show the event preview dialog
  static void show(
    BuildContext context, {
    required String eventId,
    required String eventName,
    required String workspaceId,
    calendar_api.CalendarApiService? calendarApi,
  }) {
    showDialog(
      context: context,
      builder: (dialogContext) {
        return EventPreviewDialog(
          eventId: eventId,
          eventName: eventName,
          workspaceId: workspaceId,
          calendarApi: calendarApi,
        );
      },
    );
  }

  @override
  State<EventPreviewDialog> createState() => _EventPreviewDialogState();
}

class _EventPreviewDialogState extends State<EventPreviewDialog> {
  late final calendar_api.CalendarApiService _calendarApi;
  calendar_api.CalendarEvent? _event;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _calendarApi = widget.calendarApi ?? calendar_api.CalendarApiService();
    _fetchEventDetails();
  }

  Future<void> _fetchEventDetails() async {
    try {
      final response = await _calendarApi.getEvent(
        widget.workspaceId,
        widget.eventId,
      );

      if (mounted) {
        if (response.isSuccess && response.data != null) {
          setState(() {
            _event = response.data;
            _isLoading = false;
          });
        } else {
          setState(() {
            _error = response.message ?? 'Failed to load event details';
            _isLoading = false;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Failed to load event details: $e';
          _isLoading = false;
        });
      }
    }
  }

  String _formatDateTime(DateTime dateTime) {
    final localDate = dateTime.toLocal();
    return '${localDate.day}/${localDate.month}/${localDate.year} ${localDate.hour.toString().padLeft(2, '0')}:${localDate.minute.toString().padLeft(2, '0')}';
  }

  String _parseHtmlContent(String htmlContent) {
    try {
      final document = html_parser.parse(htmlContent);
      return document.body?.text ?? htmlContent;
    } catch (e) {
      return htmlContent.replaceAll(RegExp(r'<[^>]*>'), '');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 500, maxHeight: 600),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.green.withOpacity(0.1),
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(16),
                  topRight: Radius.circular(16),
                ),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.green.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(
                      Icons.event,
                      color: Colors.green,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _event?.title ?? widget.eventName,
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 16,
                            color: Theme.of(context).colorScheme.onSurface,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const Text(
                          'Event',
                          style: TextStyle(
                            color: Colors.green,
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: Icon(
                      Icons.close,
                      color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                    ),
                  ),
                ],
              ),
            ),

            // Content
            Flexible(
              child: _isLoading
                  ? const Center(
                      child: Padding(
                        padding: EdgeInsets.all(32),
                        child: CircularProgressIndicator(),
                      ),
                    )
                  : _error != null
                      ? Center(
                          child: Padding(
                            padding: const EdgeInsets.all(32),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.error_outline,
                                  size: 48,
                                  color: Colors.red.withOpacity(0.7),
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  _error!,
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    color: Theme.of(context).colorScheme.onSurface.withOpacity(0.7),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        )
                      : SingleChildScrollView(
                          padding: const EdgeInsets.all(16),
                          child: _buildEventContent(),
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEventContent() {
    if (_event == null) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Date & Time Section
        _buildDetailRow(
          Icons.access_time,
          'Start',
          _formatDateTime(_event!.startTime),
        ),
        const SizedBox(height: 12),
        _buildDetailRow(
          Icons.access_time_filled,
          'End',
          _formatDateTime(_event!.endTime),
        ),

        // Location
        if (_event!.location != null && _event!.location!.isNotEmpty) ...[
          const SizedBox(height: 12),
          _buildDetailRow(
            Icons.location_on,
            'Location',
            _event!.location!,
          ),
        ],

        // Description
        if (_event!.description != null && _event!.description!.isNotEmpty) ...[
          const SizedBox(height: 16),
          Text(
            'Description',
            style: TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 14,
              color: Theme.of(context).colorScheme.onSurface,
            ),
          ),
          const SizedBox(height: 8),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.05),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              _parseHtmlContent(_event!.description!),
              style: TextStyle(
                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.8),
                fontSize: 14,
                height: 1.5,
              ),
            ),
          ),
        ],

        // Attendees
        if (_event!.attendees != null && _event!.attendees!.isNotEmpty) ...[
          const SizedBox(height: 16),
          Text(
            'Attendees (${_event!.attendees!.length})',
            style: TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 14,
              color: Theme.of(context).colorScheme.onSurface,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _event!.attendees!.take(10).map((attendee) {
              final displayName = (attendee.name != null && attendee.name!.isNotEmpty)
                  ? attendee.name!
                  : attendee.email;
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.green.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: Colors.green.withOpacity(0.3),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.person,
                      size: 16,
                      color: Colors.green,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      displayName,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurface,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
          if (_event!.attendees!.length > 10)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                '+${_event!.attendees!.length - 10} more attendees',
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                  fontSize: 12,
                ),
              ),
            ),
        ],
      ],
    );
  }

  Widget _buildDetailRow(IconData icon, String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(
          icon,
          size: 18,
          color: Colors.green,
        ),
        const SizedBox(width: 8),
        Text(
          '$label: ',
          style: TextStyle(
            fontWeight: FontWeight.w500,
            fontSize: 14,
            color: Theme.of(context).colorScheme.onSurface.withOpacity(0.7),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: TextStyle(
              color: Theme.of(context).colorScheme.onSurface,
              fontSize: 14,
            ),
          ),
        ),
      ],
    );
  }
}

/// Reusable Note Preview Dialog that fetches full note details and allows opening in editor
class NotePreviewDialog extends StatefulWidget {
  final String noteId;
  final String noteName;
  final String? noteIcon;
  final String workspaceId;
  final notes_api.NotesApiService? notesApi;
  final bool showOpenButton;

  const NotePreviewDialog({
    super.key,
    required this.noteId,
    required this.noteName,
    this.noteIcon,
    required this.workspaceId,
    this.notesApi,
    this.showOpenButton = true,
  });

  /// Show the note preview dialog
  static void show(
    BuildContext context, {
    required String noteId,
    required String noteName,
    String? noteIcon,
    required String workspaceId,
    notes_api.NotesApiService? notesApi,
    bool showOpenButton = true,
  }) {
    showDialog(
      context: context,
      builder: (dialogContext) {
        return NotePreviewDialog(
          noteId: noteId,
          noteName: noteName,
          noteIcon: noteIcon,
          workspaceId: workspaceId,
          notesApi: notesApi,
          showOpenButton: showOpenButton,
        );
      },
    );
  }

  @override
  State<NotePreviewDialog> createState() => _NotePreviewDialogState();
}

class _NotePreviewDialogState extends State<NotePreviewDialog> {
  late final notes_api.NotesApiService _notesApi;
  notes_api.Note? _note;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _notesApi = widget.notesApi ?? notes_api.NotesApiService();
    _fetchNoteDetails();
  }

  Future<void> _fetchNoteDetails() async {
    try {
      final response = await _notesApi.getNote(widget.workspaceId, widget.noteId);

      if (mounted) {
        if (response.isSuccess && response.data != null) {
          setState(() {
            _note = response.data;
            _isLoading = false;
          });
        } else {
          setState(() {
            _error = response.message ?? 'Failed to load note details';
            _isLoading = false;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Failed to load note details: $e';
          _isLoading = false;
        });
      }
    }
  }

  String _formatDateTime(DateTime dateTime) {
    final localDate = dateTime.toLocal();
    return '${localDate.day}/${localDate.month}/${localDate.year} ${localDate.hour.toString().padLeft(2, '0')}:${localDate.minute.toString().padLeft(2, '0')}';
  }

  String _parseHtmlContent(String htmlContent) {
    try {
      final document = html_parser.parse(htmlContent);
      return document.body?.text ?? htmlContent;
    } catch (e) {
      return htmlContent.replaceAll(RegExp(r'<[^>]*>'), '');
    }
  }

  Future<void> _openNoteEditor() async {
    if (_note == null) return;

    Navigator.of(context).pop();

    final note = Note(
      id: _note!.id,
      parentId: _note!.parentId,
      title: _note!.title,
      description: '',
      content: _note!.content ?? '',
      icon: widget.noteIcon ?? '📝',
      categoryId: _note!.category ?? 'work',
      subcategory: '',
      keywords: _note!.tags ?? [],
      isFavorite: _note!.isFavorite,
      isTemplate: false,
      isDeleted: _note!.deletedAt != null,
      createdBy: _note!.authorId,
      collaborators: [],
      activities: [],
      createdAt: _note!.createdAt,
      updatedAt: _note!.updatedAt,
    );

    if (mounted) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (context) => NoteEditorScreen(
            note: note,
            initialMode: NoteEditorMode.edit,
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 500, maxHeight: 600),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.orange.withOpacity(0.1),
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(16),
                  topRight: Radius.circular(16),
                ),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.orange.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      widget.noteIcon ?? '📝',
                      style: const TextStyle(fontSize: 20),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _note?.title ?? widget.noteName,
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 16,
                            color: Theme.of(context).colorScheme.onSurface,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const Text(
                          'Note',
                          style: TextStyle(
                            color: Colors.orange,
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: Icon(
                      Icons.close,
                      color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                    ),
                  ),
                ],
              ),
            ),

            // Content
            Flexible(
              child: _isLoading
                  ? const Center(
                      child: Padding(
                        padding: EdgeInsets.all(32),
                        child: CircularProgressIndicator(),
                      ),
                    )
                  : _error != null
                      ? Center(
                          child: Padding(
                            padding: const EdgeInsets.all(32),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.error_outline,
                                  size: 48,
                                  color: Colors.red.withOpacity(0.7),
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  _error!,
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    color: Theme.of(context).colorScheme.onSurface.withOpacity(0.7),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        )
                      : SingleChildScrollView(
                          padding: const EdgeInsets.all(16),
                          child: _buildNoteContent(),
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNoteContent() {
    if (_note == null) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Last Updated
        _buildDetailRow(
          Icons.update,
          'Last Updated',
          _formatDateTime(_note!.updatedAt),
        ),

        // Tags
        if (_note!.tags != null && _note!.tags!.isNotEmpty) ...[
          const SizedBox(height: 12),
          Text(
            'Tags',
            style: TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 14,
              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.7),
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _note!.tags!.map((tag) {
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.orange.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: Colors.orange.withOpacity(0.3),
                  ),
                ),
                child: Text(
                  tag,
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurface,
                    fontSize: 12,
                  ),
                ),
              );
            }).toList(),
          ),
        ],

        // Content Preview
        if (_note!.content != null && _note!.content!.isNotEmpty) ...[
          const SizedBox(height: 16),
          Text(
            'Content Preview',
            style: TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 14,
              color: Theme.of(context).colorScheme.onSurface,
            ),
          ),
          const SizedBox(height: 8),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.05),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              _parseHtmlContent(_note!.content!),
              style: TextStyle(
                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.8),
                fontSize: 14,
                height: 1.5,
              ),
              maxLines: 10,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],

        // Open Note Button
        if (widget.showOpenButton) ...[
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _openNoteEditor,
              icon: const Icon(Icons.open_in_new, size: 18),
              label: const Text('Open Note'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Theme.of(context).colorScheme.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildDetailRow(IconData icon, String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(
          icon,
          size: 18,
          color: Colors.orange,
        ),
        const SizedBox(width: 8),
        Text(
          '$label: ',
          style: TextStyle(
            fontWeight: FontWeight.w500,
            fontSize: 14,
            color: Theme.of(context).colorScheme.onSurface.withOpacity(0.7),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: TextStyle(
              color: Theme.of(context).colorScheme.onSurface,
              fontSize: 14,
            ),
          ),
        ),
      ],
    );
  }
}

/// Reusable File Preview Dialog
class FilePreviewDialog extends StatelessWidget {
  final String fileId;
  final String fileName;
  final String? fileSize;
  final String? mimeType;
  final String? fileUrl;
  final VoidCallback? onDownload;
  final VoidCallback? onOpen;

  const FilePreviewDialog({
    super.key,
    required this.fileId,
    required this.fileName,
    this.fileSize,
    this.mimeType,
    this.fileUrl,
    this.onDownload,
    this.onOpen,
  });

  /// Show the file preview dialog
  static void show(
    BuildContext context, {
    required String fileId,
    required String fileName,
    String? fileSize,
    String? mimeType,
    String? fileUrl,
    VoidCallback? onDownload,
    VoidCallback? onOpen,
  }) {
    showDialog(
      context: context,
      builder: (dialogContext) {
        return FilePreviewDialog(
          fileId: fileId,
          fileName: fileName,
          fileSize: fileSize,
          mimeType: mimeType,
          fileUrl: fileUrl,
          onDownload: onDownload,
          onOpen: onOpen,
        );
      },
    );
  }

  IconData _getFileIcon() {
    if (mimeType == null) return Icons.insert_drive_file;

    if (mimeType!.startsWith('image/')) return Icons.image;
    if (mimeType!.startsWith('video/')) return Icons.video_file;
    if (mimeType!.startsWith('audio/')) return Icons.audio_file;
    if (mimeType!.contains('pdf')) return Icons.picture_as_pdf;
    if (mimeType!.contains('word') || mimeType!.contains('document')) return Icons.description;
    if (mimeType!.contains('excel') || mimeType!.contains('spreadsheet')) return Icons.table_chart;
    if (mimeType!.contains('powerpoint') || mimeType!.contains('presentation')) return Icons.slideshow;
    if (mimeType!.contains('zip') || mimeType!.contains('archive')) return Icons.folder_zip;

    return Icons.insert_drive_file;
  }

  String _formatFileSize(String? sizeStr) {
    if (sizeStr == null || sizeStr.isEmpty) return 'Unknown size';

    // Check if already formatted (contains KB, MB, GB, B suffix)
    if (sizeStr.contains('KB') || sizeStr.contains('MB') ||
        sizeStr.contains('GB') || sizeStr.endsWith(' B')) {
      return sizeStr;
    }

    try {
      final bytes = int.tryParse(sizeStr);
      if (bytes == null) return sizeStr; // Return as-is if not a number
      if (bytes < 1024) return '$bytes B';
      if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
      if (bytes < 1024 * 1024 * 1024) return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
      return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
    } catch (e) {
      return sizeStr;
    }
  }

  String _getFileType() {
    if (mimeType == null) return 'File';

    if (mimeType!.startsWith('image/')) return 'Image';
    if (mimeType!.startsWith('video/')) return 'Video';
    if (mimeType!.startsWith('audio/')) return 'Audio';
    if (mimeType!.contains('pdf')) return 'PDF Document';
    if (mimeType!.contains('word') || mimeType!.contains('document')) return 'Document';
    if (mimeType!.contains('excel') || mimeType!.contains('spreadsheet')) return 'Spreadsheet';
    if (mimeType!.contains('powerpoint') || mimeType!.contains('presentation')) return 'Presentation';
    if (mimeType!.contains('zip') || mimeType!.contains('archive')) return 'Archive';

    return 'File';
  }

  bool _isImage() {
    return mimeType != null && mimeType!.startsWith('image/');
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: Container(
        constraints: BoxConstraints(maxWidth: 500, maxHeight: _isImage() ? 550 : 400),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.blue.withOpacity(0.1),
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(16),
                  topRight: Radius.circular(16),
                ),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.blue.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      _getFileIcon(),
                      color: Colors.blue,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          fileName,
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 16,
                            color: Theme.of(context).colorScheme.onSurface,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          _getFileType(),
                          style: const TextStyle(
                            color: Colors.blue,
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: Icon(
                      Icons.close,
                      color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                    ),
                  ),
                ],
              ),
            ),

            // Image Preview (if applicable)
            if (mimeType != null && mimeType!.startsWith('image/') && fileUrl != null && fileUrl!.isNotEmpty)
              Container(
                constraints: const BoxConstraints(maxHeight: 200),
                width: double.infinity,
                child: ClipRRect(
                  child: Image.network(
                    fileUrl!,
                    fit: BoxFit.contain,
                    loadingBuilder: (context, child, loadingProgress) {
                      if (loadingProgress == null) return child;
                      return Container(
                        height: 150,
                        color: Theme.of(context).colorScheme.onSurface.withOpacity(0.05),
                        child: Center(
                          child: CircularProgressIndicator(
                            value: loadingProgress.expectedTotalBytes != null
                                ? loadingProgress.cumulativeBytesLoaded / loadingProgress.expectedTotalBytes!
                                : null,
                            strokeWidth: 2,
                          ),
                        ),
                      );
                    },
                    errorBuilder: (context, error, stackTrace) {
                      return Container(
                        height: 100,
                        color: Theme.of(context).colorScheme.onSurface.withOpacity(0.05),
                        child: Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.broken_image,
                                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.4),
                                size: 32,
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Failed to load image',
                                style: TextStyle(
                                  color: Theme.of(context).colorScheme.onSurface.withOpacity(0.5),
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ),

            // Content
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // File Size
                  _buildDetailRow(
                    context,
                    Icons.storage,
                    'Size',
                    _formatFileSize(fileSize),
                  ),

                  // File Type
                  if (mimeType != null) ...[
                    const SizedBox(height: 12),
                    _buildDetailRow(
                      context,
                      Icons.file_present,
                      'Type',
                      mimeType!,
                    ),
                  ],

                  const SizedBox(height: 24),

                  // Action Buttons
                  Row(
                    children: [
                      if (onDownload != null)
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: () {
                              Navigator.of(context).pop();
                              onDownload!();
                            },
                            icon: const Icon(Icons.download, size: 18),
                            label: const Text('Download'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.blue,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                          ),
                        ),
                      if (onDownload != null && onOpen != null)
                        const SizedBox(width: 12),
                      if (onOpen != null)
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () {
                              Navigator.of(context).pop();
                              onOpen!();
                            },
                            icon: const Icon(Icons.open_in_new, size: 18),
                            label: const Text('Open'),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: Colors.blue,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                              side: const BorderSide(color: Colors.blue),
                            ),
                          ),
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

  Widget _buildDetailRow(BuildContext context, IconData icon, String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(
          icon,
          size: 18,
          color: Colors.blue,
        ),
        const SizedBox(width: 8),
        Text(
          '$label: ',
          style: TextStyle(
            fontWeight: FontWeight.w500,
            fontSize: 14,
            color: Theme.of(context).colorScheme.onSurface.withOpacity(0.7),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: TextStyle(
              color: Theme.of(context).colorScheme.onSurface,
              fontSize: 14,
            ),
          ),
        ),
      ],
    );
  }
}
