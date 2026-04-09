import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:easy_localization/easy_localization.dart';
import '../chat_screen.dart';
import 'ai_actions_dropdown.dart';

/// A bar that appears when messages are selected, showing count and action buttons
class MessageSelectionBar extends StatelessWidget {
  final int selectedCount;
  final List<ChatMessage> selectedMessages;
  final VoidCallback onClose;
  final VoidCallback? onDelete;
  final VoidCallback? onBookmark;
  final Function(AIAction action, {String? language, String? customPrompt}) onAIAction;
  final bool isProcessing;

  const MessageSelectionBar({
    super.key,
    required this.selectedCount,
    required this.selectedMessages,
    required this.onClose,
    this.onDelete,
    this.onBookmark,
    required this.onAIAction,
    this.isProcessing = false,
  });

  /// Copy selected messages to clipboard
  void _copyMessages(BuildContext context) {
    final formattedText = selectedMessages
        .map((msg) => '[${msg.senderName ?? "User"}] ${msg.text.replaceAll(RegExp(r'<[^>]*>'), '')}')
        .join('\n\n');
    Clipboard.setData(ClipboardData(text: formattedText));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('messages.messages_copied'.tr(args: [selectedCount.toString()])),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: isDarkMode ? Colors.grey.shade900 : Colors.grey.shade100,
        border: Border(
          bottom: BorderSide(
            color: isDarkMode ? Colors.grey.shade800 : Colors.grey.shade300,
            width: 1,
          ),
        ),
      ),
      child: Row(
        children: [
          // Close button
          GestureDetector(
            onTap: onClose,
            child: Icon(
              Icons.close,
              color: isDarkMode ? Colors.grey.shade400 : Colors.grey.shade600,
              size: 22,
            ),
          ),

          const SizedBox(width: 12),

          // Selection count
          Text(
            '$selectedCount',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: isDarkMode ? Colors.white : Colors.black87,
            ),
          ),

          const Spacer(),

          // Action buttons row
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Copy button
              _ActionButton(
                icon: Icons.copy_outlined,
                tooltip: 'messages.copy'.tr(),
                onTap: isProcessing ? null : () => _copyMessages(context),
                isDarkMode: isDarkMode,
              ),

              const SizedBox(width: 4),

              // Email button
              _ActionButton(
                icon: Icons.email_outlined,
                tooltip: 'messages.create_email'.tr(),
                onTap: isProcessing ? null : () => onAIAction(AIAction.createEmail),
                isDarkMode: isDarkMode,
              ),

              const SizedBox(width: 4),

              // Bookmark button
              if (onBookmark != null)
                _ActionButton(
                  icon: Icons.bookmark_add_outlined,
                  tooltip: 'messages.bookmark'.tr(),
                  onTap: isProcessing ? null : onBookmark,
                  isDarkMode: isDarkMode,
                ),

              if (onBookmark != null) const SizedBox(width: 4),

              // Delete button
              if (onDelete != null)
                _ActionButton(
                  icon: Icons.delete_outline,
                  tooltip: 'messages.delete'.tr(),
                  onTap: isProcessing ? null : onDelete,
                  isDarkMode: isDarkMode,
                  isDestructive: true,
                ),

              if (onDelete != null) const SizedBox(width: 4),

              // AI Actions Dropdown
              AIActionsDropdown(
                selectedMessages: selectedMessages,
                onAction: onAIAction,
                isProcessing: isProcessing,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Compact action button for the selection bar
class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String tooltip;
  final VoidCallback? onTap;
  final bool isDarkMode;
  final bool isDestructive;

  const _ActionButton({
    required this.icon,
    required this.tooltip,
    required this.onTap,
    required this.isDarkMode,
    this.isDestructive = false,
  });

  @override
  Widget build(BuildContext context) {
    final color = isDestructive
        ? Colors.red.shade400
        : (isDarkMode ? Colors.grey.shade300 : Colors.grey.shade700);

    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Icon(
            icon,
            size: 22,
            color: onTap == null ? color.withOpacity(0.5) : color,
          ),
        ),
      ),
    );
  }
}
