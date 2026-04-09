import 'package:flutter/material.dart';
import '../../models/file/file_comment.dart';

/// Widget for inputting a new comment or editing an existing comment
class FileCommentInput extends StatefulWidget {
  /// Called when the user submits a comment
  final Future<void> Function(String content) onSubmit;

  /// The comment being replied to (if any)
  final FileComment? replyTo;

  /// The comment being edited (if any)
  final FileComment? editingComment;

  /// Called when canceling a reply or edit
  final VoidCallback? onCancel;

  /// Whether the input is currently submitting
  final bool isSubmitting;

  const FileCommentInput({
    super.key,
    required this.onSubmit,
    this.replyTo,
    this.editingComment,
    this.onCancel,
    this.isSubmitting = false,
  });

  @override
  State<FileCommentInput> createState() => _FileCommentInputState();
}

class _FileCommentInputState extends State<FileCommentInput> {
  final TextEditingController _controller = TextEditingController();
  final FocusNode _focusNode = FocusNode();
  bool _hasContent = false;

  @override
  void initState() {
    super.initState();
    if (widget.editingComment != null) {
      _controller.text = widget.editingComment!.content;
      _hasContent = _controller.text.isNotEmpty;
    }
    _controller.addListener(_onTextChanged);
  }

  @override
  void didUpdateWidget(FileCommentInput oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Update text if editing comment changed
    if (widget.editingComment != oldWidget.editingComment) {
      if (widget.editingComment != null) {
        _controller.text = widget.editingComment!.content;
      } else if (oldWidget.editingComment != null) {
        _controller.clear();
      }
    }
    // Focus when replying
    if (widget.replyTo != null && oldWidget.replyTo == null) {
      _focusNode.requestFocus();
    }
  }

  @override
  void dispose() {
    _controller.removeListener(_onTextChanged);
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _onTextChanged() {
    final hasContent = _controller.text.trim().isNotEmpty;
    if (hasContent != _hasContent) {
      setState(() {
        _hasContent = hasContent;
      });
    }
  }

  Future<void> _handleSubmit() async {
    final content = _controller.text.trim();
    if (content.isEmpty || widget.isSubmitting) return;

    await widget.onSubmit(content);
    _controller.clear();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isReply = widget.replyTo != null;
    final isEdit = widget.editingComment != null;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        border: Border(
          top: BorderSide(
            color: theme.colorScheme.outline.withValues(alpha: 0.2),
          ),
        ),
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Reply/Edit indicator
            if (isReply || isEdit)
              Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: theme.colorScheme.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(
                      isEdit ? Icons.edit : Icons.reply,
                      size: 16,
                      color: theme.colorScheme.primary,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        isEdit
                            ? 'Editing comment'
                            : 'Replying to ${widget.replyTo?.author?.name ?? 'Unknown'}',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.primary,
                          fontWeight: FontWeight.w500,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    GestureDetector(
                      onTap: widget.onCancel,
                      child: Icon(
                        Icons.close,
                        size: 18,
                        color: theme.colorScheme.primary,
                      ),
                    ),
                  ],
                ),
              ),

            // Input field
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    focusNode: _focusNode,
                    maxLines: 4,
                    minLines: 1,
                    enabled: !widget.isSubmitting,
                    textCapitalization: TextCapitalization.sentences,
                    decoration: InputDecoration(
                      hintText: isReply
                          ? 'Write a reply...'
                          : (isEdit ? 'Edit your comment...' : 'Add a comment...'),
                      hintStyle: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                      ),
                      filled: true,
                      fillColor: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide.none,
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide.none,
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide(
                          color: theme.colorScheme.primary,
                          width: 1.5,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                // Send button
                AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  child: Material(
                    color: _hasContent && !widget.isSubmitting
                        ? theme.colorScheme.primary
                        : theme.colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(24),
                    child: InkWell(
                      onTap: _hasContent && !widget.isSubmitting ? _handleSubmit : null,
                      borderRadius: BorderRadius.circular(24),
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        child: widget.isSubmitting
                            ? SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor: AlwaysStoppedAnimation<Color>(
                                    theme.colorScheme.onPrimary,
                                  ),
                                ),
                              )
                            : Icon(
                                Icons.send_rounded,
                                size: 20,
                                color: _hasContent
                                    ? theme.colorScheme.onPrimary
                                    : theme.colorScheme.onSurface.withValues(alpha: 0.4),
                              ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
