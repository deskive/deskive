import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_html/flutter_html.dart';
import 'email_ai_actions.dart';
import '../../api/services/notes_api_service.dart';
import '../../services/workspace_service.dart';

/// Dialog state for email AI action processing
enum EmailAIState {
  loading,
  success,
  error,
}

/// Modal to show email AI action results
class EmailAIResultModal extends StatefulWidget {
  final EmailAIAction action;
  final String emailSubject;
  final String? initialResult;
  final String? initialError;
  final bool isLoading;
  final VoidCallback? onClose;
  final Function(String)? onUseResult;

  const EmailAIResultModal({
    super.key,
    required this.action,
    required this.emailSubject,
    this.initialResult,
    this.initialError,
    this.isLoading = false,
    this.onClose,
    this.onUseResult,
  });

  @override
  State<EmailAIResultModal> createState() => _EmailAIResultModalState();
}

class _EmailAIResultModalState extends State<EmailAIResultModal> {
  late EmailAIState _state;
  String? _result;
  String? _error;
  bool _copied = false;
  bool _savingNote = false;
  bool _noteSaved = false;
  final NotesApiService _notesApiService = NotesApiService();

  @override
  void initState() {
    super.initState();
    _result = widget.initialResult;
    _error = widget.initialError;

    if (widget.isLoading) {
      _state = EmailAIState.loading;
    } else if (widget.initialError != null) {
      _state = EmailAIState.error;
    } else {
      _state = EmailAIState.success;
    }
  }

  @override
  void didUpdateWidget(EmailAIResultModal oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.initialResult != oldWidget.initialResult) {
      setState(() {
        _result = widget.initialResult;
        if (_result != null) {
          _state = EmailAIState.success;
        }
      });
    }
    if (widget.initialError != oldWidget.initialError) {
      setState(() {
        _error = widget.initialError;
        if (_error != null) {
          _state = EmailAIState.error;
        }
      });
    }
    if (widget.isLoading != oldWidget.isLoading) {
      setState(() {
        if (widget.isLoading) {
          _state = EmailAIState.loading;
        }
      });
    }
  }

  EmailAIActionConfig get _config => getEmailAIActionConfig(widget.action);

  void _copyToClipboard() {
    if (_result != null) {
      // Strip HTML tags for plain text copy
      final plainText = _result!.replaceAll(RegExp(r'<[^>]*>'), '');
      Clipboard.setData(ClipboardData(text: plainText));
      setState(() => _copied = true);
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) setState(() => _copied = false);
      });
    }
  }

  Future<void> _saveAsNote() async {
    if (_result == null || _savingNote) return;

    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) {
      _showMessage('Unable to save: No workspace selected', isError: true);
      return;
    }

    setState(() => _savingNote = true);

    try {
      // Create note title based on action and email subject
      final actionLabel = _config.label;
      final noteTitle = '$actionLabel: ${widget.emailSubject}';

      // Strip HTML tags and convert to plain text for note content
      final plainContent = _result!.replaceAll(RegExp(r'<[^>]*>'), '').trim();

      // Create the note
      final dto = CreateNoteDto(
        title: noteTitle.length > 100 ? '${noteTitle.substring(0, 97)}...' : noteTitle,
        content: plainContent,
        tags: ['email', 'ai-generated', actionLabel.toLowerCase().replaceAll(' ', '-')],
      );

      final response = await _notesApiService.createNote(workspaceId, dto);

      if (response.isSuccess) {
        setState(() {
          _noteSaved = true;
          _savingNote = false;
        });
        _showMessage('Note saved successfully!');

        // Reset after delay
        Future.delayed(const Duration(seconds: 2), () {
          if (mounted) setState(() => _noteSaved = false);
        });
      } else {
        setState(() => _savingNote = false);
        _showMessage(response.message ?? 'Failed to save note', isError: true);
      }
    } catch (e) {
      setState(() => _savingNote = false);
      _showMessage('Failed to save note: ${e.toString()}', isError: true);
    }
  }

  void _showMessage(String message, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? Colors.red : Colors.green,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        width: MediaQuery.of(context).size.width * 0.9,
        constraints: const BoxConstraints(maxWidth: 600, maxHeight: 600),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            _buildHeader(isDarkMode),

            // Content
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: _buildContent(isDarkMode),
              ),
            ),

            // Footer
            if (_state == EmailAIState.success) _buildFooter(isDarkMode),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(bool isDarkMode) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDarkMode ? Colors.grey.shade900 : Colors.grey.shade50,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: _config.color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              _config.icon,
              color: _config.color,
              size: 24,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _config.label,
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: isDarkMode ? Colors.white : Colors.black87,
                  ),
                ),
                Text(
                  widget.emailSubject.length > 40
                      ? '${widget.emailSubject.substring(0, 40)}...'
                      : widget.emailSubject,
                  style: TextStyle(
                    fontSize: 13,
                    color: isDarkMode ? Colors.grey.shade400 : Colors.grey.shade600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: () => Navigator.of(context).pop(),
            icon: Icon(
              Icons.close,
              color: isDarkMode ? Colors.grey.shade400 : Colors.grey.shade600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContent(bool isDarkMode) {
    switch (_state) {
      case EmailAIState.loading:
        return _buildLoadingState(isDarkMode);
      case EmailAIState.error:
        return _buildErrorState(isDarkMode);
      case EmailAIState.success:
        return _buildSuccessState(isDarkMode);
    }
  }

  Widget _buildLoadingState(bool isDarkMode) {
    return SizedBox(
      height: 200,
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    _config.color.withValues(alpha: 0.2),
                    Colors.purple.withValues(alpha: 0.2),
                  ],
                ),
                shape: BoxShape.circle,
              ),
              child: CircularProgressIndicator(
                color: _config.color,
                strokeWidth: 3,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Processing email...',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w500,
                color: isDarkMode ? Colors.white : Colors.black87,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorState(bool isDarkMode) {
    return SizedBox(
      height: 200,
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.red.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.error_outline,
                color: Colors.red,
                size: 40,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Failed to process',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: isDarkMode ? Colors.white : Colors.black87,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _error ?? 'An unknown error occurred',
              style: TextStyle(
                fontSize: 13,
                color: Colors.red.shade400,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSuccessState(bool isDarkMode) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Result content
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDarkMode ? Colors.grey.shade800 : Colors.grey.shade50,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isDarkMode ? Colors.grey.shade700 : Colors.grey.shade200,
            ),
          ),
          child: Html(
            data: (_result ?? '').replaceAll('\n', '<br>'),
            style: {
              "body": Style(
                margin: Margins.zero,
                padding: HtmlPaddings.zero,
                color: isDarkMode ? Colors.grey.shade200 : Colors.grey.shade800,
                fontSize: FontSize(14),
                lineHeight: LineHeight(1.5),
              ),
              "p": Style(
                margin: Margins.only(bottom: 8),
              ),
              "ul": Style(
                margin: Margins.only(left: 16, bottom: 8),
              ),
              "li": Style(
                margin: Margins.only(bottom: 4),
              ),
              "strong": Style(
                fontWeight: FontWeight.bold,
              ),
              "h1": Style(
                fontSize: FontSize(18),
                fontWeight: FontWeight.bold,
                margin: Margins.only(bottom: 12),
              ),
              "h2": Style(
                fontSize: FontSize(16),
                fontWeight: FontWeight.bold,
                margin: Margins.only(bottom: 10),
              ),
              "h3": Style(
                fontSize: FontSize(14),
                fontWeight: FontWeight.bold,
                margin: Margins.only(bottom: 8),
              ),
            },
          ),
        ),
      ],
    );
  }

  Widget _buildFooter(bool isDarkMode) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDarkMode ? Colors.grey.shade900 : Colors.grey.shade50,
        borderRadius: const BorderRadius.vertical(bottom: Radius.circular(16)),
        border: Border(
          top: BorderSide(
            color: isDarkMode ? Colors.grey.shade800 : Colors.grey.shade200,
          ),
        ),
      ),
      child: Row(
        children: [
          // Copy button
          OutlinedButton.icon(
            onPressed: _copyToClipboard,
            icon: Icon(
              _copied ? Icons.check : Icons.copy,
              size: 14,
            ),
            label: Text(
              _copied ? 'Copied!' : 'Copy',
              style: const TextStyle(fontSize: 12),
            ),
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
          ),
          const SizedBox(width: 8),
          // Save as Note button
          OutlinedButton.icon(
            onPressed: _savingNote ? null : _saveAsNote,
            icon: _savingNote
                ? const SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Icon(
                    _noteSaved ? Icons.check : Icons.note_add,
                    size: 14,
                  ),
            label: Text(
              _savingNote
                  ? 'Saving...'
                  : _noteSaved
                      ? 'Saved!'
                      : 'Save as Note',
              style: const TextStyle(fontSize: 12),
            ),
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              foregroundColor: _noteSaved ? Colors.green : null,
            ),
          ),
          const Spacer(),
          // Close button
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }
}

/// Helper function to show the email AI result modal
Future<void> showEmailAIResultModal({
  required BuildContext context,
  required EmailAIAction action,
  required String emailSubject,
  String? result,
  String? error,
  bool isLoading = false,
}) {
  return showDialog(
    context: context,
    barrierDismissible: false,
    builder: (context) => EmailAIResultModal(
      action: action,
      emailSubject: emailSubject,
      initialResult: result,
      initialError: error,
      isLoading: isLoading,
    ),
  );
}
