import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_html/flutter_html.dart';
import 'package:easy_localization/easy_localization.dart';
import '../chat_screen.dart';
import 'ai_actions_dropdown.dart';

/// Dialog state for AI action processing
enum AIActionState {
  customPromptInput,
  loading,
  success,
  error,
}

/// Dialog to show AI action results
class AIActionResultDialog extends StatefulWidget {
  final AIAction action;
  final List<ChatMessage> selectedMessages;
  final String? initialResult;
  final String? initialError;
  final bool isLoading;
  final Function(String noteTitle, String content)? onSaveAsNote;
  final VoidCallback? onClose;

  const AIActionResultDialog({
    super.key,
    required this.action,
    required this.selectedMessages,
    this.initialResult,
    this.initialError,
    this.isLoading = false,
    this.onSaveAsNote,
    this.onClose,
  });

  @override
  State<AIActionResultDialog> createState() => _AIActionResultDialogState();
}

class _AIActionResultDialogState extends State<AIActionResultDialog> {
  late AIActionState _state;
  String? _result;
  String? _error;
  final TextEditingController _noteTitleController = TextEditingController();
  final TextEditingController _customPromptController = TextEditingController();
  bool _showSourceMessages = false;
  bool _copied = false;

  @override
  void initState() {
    super.initState();
    _result = widget.initialResult;
    _error = widget.initialError;

    if (widget.action == AIAction.customPrompt && widget.initialResult == null) {
      _state = AIActionState.customPromptInput;
    } else if (widget.isLoading) {
      _state = AIActionState.loading;
    } else if (widget.initialError != null) {
      _state = AIActionState.error;
    } else {
      _state = AIActionState.success;
    }
  }

  @override
  void didUpdateWidget(AIActionResultDialog oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.initialResult != oldWidget.initialResult) {
      setState(() {
        _result = widget.initialResult;
        if (_result != null) {
          _state = AIActionState.success;
        }
      });
    }
    if (widget.initialError != oldWidget.initialError) {
      setState(() {
        _error = widget.initialError;
        if (_error != null) {
          _state = AIActionState.error;
        }
      });
    }
    if (widget.isLoading != oldWidget.isLoading) {
      setState(() {
        if (widget.isLoading) {
          _state = AIActionState.loading;
        }
      });
    }
  }

  @override
  void dispose() {
    _noteTitleController.dispose();
    _customPromptController.dispose();
    super.dispose();
  }

  AIActionConfig get _config => getAIActionConfig(widget.action);

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

  void _saveAsNote() {
    if (_result != null && widget.onSaveAsNote != null) {
      final title = _noteTitleController.text.isNotEmpty
          ? _noteTitleController.text
          : 'messages.ai_generated'.tr(args: [_config.label]);
      widget.onSaveAsNote!(title, _result!);
    }
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
            if (_state == AIActionState.success || _state == AIActionState.customPromptInput)
              _buildFooter(isDarkMode),
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
              color: _config.color.withOpacity(0.1),
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
                  'messages.messages_selected'.tr(args: [widget.selectedMessages.length.toString()]),
                  style: TextStyle(
                    fontSize: 13,
                    color: isDarkMode ? Colors.grey.shade400 : Colors.grey.shade600,
                  ),
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
      case AIActionState.customPromptInput:
        return _buildCustomPromptInput(isDarkMode);
      case AIActionState.loading:
        return _buildLoadingState(isDarkMode);
      case AIActionState.error:
        return _buildErrorState(isDarkMode);
      case AIActionState.success:
        return _buildSuccessState(isDarkMode);
    }
  }

  Widget _buildCustomPromptInput(bool isDarkMode) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Selected messages preview
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: isDarkMode ? Colors.grey.shade800 : Colors.grey.shade100,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'messages.selected_messages'.tr(),
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 12,
                  color: isDarkMode ? Colors.grey.shade300 : Colors.grey.shade700,
                ),
              ),
              const SizedBox(height: 8),
              ...widget.selectedMessages.take(3).map((msg) => Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Text(
                  '${msg.senderName ?? "User"}: ${msg.text.length > 50 ? "${msg.text.substring(0, 50)}..." : msg.text}',
                  style: TextStyle(
                    fontSize: 12,
                    color: isDarkMode ? Colors.grey.shade400 : Colors.grey.shade600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              )),
              if (widget.selectedMessages.length > 3)
                Text(
                  'messages.and_more'.tr(args: [(widget.selectedMessages.length - 3).toString()]),
                  style: TextStyle(
                    fontSize: 12,
                    fontStyle: FontStyle.italic,
                    color: isDarkMode ? Colors.grey.shade500 : Colors.grey.shade500,
                  ),
                ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // Custom prompt input
        Text(
          'messages.enter_your_prompt'.tr(),
          style: TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 14,
            color: isDarkMode ? Colors.white : Colors.black87,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _customPromptController,
          maxLines: 4,
          decoration: InputDecoration(
            hintText: 'messages.custom_prompt_hint'.tr(),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
            ),
            filled: true,
            fillColor: isDarkMode ? Colors.grey.shade800 : Colors.white,
          ),
        ),
      ],
    );
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
                    _config.color.withOpacity(0.2),
                    Colors.purple.withOpacity(0.2),
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
              'messages.processing_messages'.tr(args: [widget.selectedMessages.length.toString()]),
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
                color: Colors.red.withOpacity(0.1),
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
        // Note title input for create_note action
        if (widget.action == AIAction.createNote) ...[
          Text(
            'messages.note_title'.tr(),
            style: TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 14,
              color: isDarkMode ? Colors.white : Colors.black87,
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _noteTitleController,
            decoration: InputDecoration(
              hintText: 'messages.enter_note_title'.tr(),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
              ),
              filled: true,
              fillColor: isDarkMode ? Colors.grey.shade800 : Colors.white,
            ),
          ),
          const SizedBox(height: 16),
        ],

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
            // Convert newlines to <br> tags for proper rendering
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

        const SizedBox(height: 16),

        // Source messages toggle
        GestureDetector(
          onTap: () => setState(() => _showSourceMessages = !_showSourceMessages),
          child: Row(
            children: [
              Icon(
                _showSourceMessages ? Icons.expand_less : Icons.expand_more,
                size: 20,
                color: isDarkMode ? Colors.grey.shade400 : Colors.grey.shade600,
              ),
              const SizedBox(width: 4),
              Text(
                'messages.view_source_messages'.tr(),
                style: TextStyle(
                  fontSize: 13,
                  color: isDarkMode ? Colors.grey.shade400 : Colors.grey.shade600,
                ),
              ),
            ],
          ),
        ),

        if (_showSourceMessages) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isDarkMode ? Colors.grey.shade900 : Colors.grey.shade100,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: widget.selectedMessages.map((msg) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      msg.senderName ?? 'User',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 12,
                        color: isDarkMode ? Colors.blue.shade300 : Colors.blue.shade700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      msg.text.replaceAll(RegExp(r'<[^>]*>'), ''),
                      style: TextStyle(
                        fontSize: 13,
                        color: isDarkMode ? Colors.grey.shade300 : Colors.grey.shade700,
                      ),
                    ),
                  ],
                ),
              )).toList(),
            ),
          ),
        ],
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
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          if (_state == AIActionState.customPromptInput) ...[
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              child: Text('messages.cancel'.tr(), style: const TextStyle(fontSize: 13)),
            ),
            ElevatedButton.icon(
              onPressed: _customPromptController.text.isNotEmpty
                  ? () {
                      // This will be handled by the parent
                      Navigator.of(context).pop({
                        'action': 'submit_custom_prompt',
                        'prompt': _customPromptController.text,
                      });
                    }
                  : null,
              icon: const Icon(Icons.send, size: 14),
              label: Text('messages.send_to_ai'.tr(), style: const TextStyle(fontSize: 12)),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.indigo,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
            ),
          ] else ...[
            // Copy button
            OutlinedButton.icon(
              onPressed: _copyToClipboard,
              icon: Icon(
                _copied ? Icons.check : Icons.copy,
                size: 14,
              ),
              label: Text(_copied ? 'messages.copied'.tr() : 'messages.copy'.tr(), style: const TextStyle(fontSize: 12)),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
            ),

            // Save as Note button (for certain actions)
            if (widget.action == AIAction.createNote ||
                widget.action == AIAction.summarize ||
                widget.action == AIAction.extractTasks ||
                widget.action == AIAction.translate)
              ElevatedButton.icon(
                onPressed: _saveAsNote,
                icon: const Icon(Icons.note_add, size: 14),
                label: Text('messages.save_as_note'.tr(), style: const TextStyle(fontSize: 12)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
              ),
          ],
        ],
      ),
    );
  }
}

/// Helper function to show the AI action result dialog
Future<Map<String, dynamic>?> showAIActionResultDialog({
  required BuildContext context,
  required AIAction action,
  required List<ChatMessage> selectedMessages,
  String? result,
  String? error,
  bool isLoading = false,
  Function(String, String)? onSaveAsNote,
}) {
  return showDialog<Map<String, dynamic>>(
    context: context,
    barrierDismissible: false,
    builder: (context) => AIActionResultDialog(
      action: action,
      selectedMessages: selectedMessages,
      initialResult: result,
      initialError: error,
      isLoading: isLoading,
      onSaveAsNote: onSaveAsNote,
    ),
  );
}
