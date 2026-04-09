import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../api/services/chat_api_service.dart';
import 'schedule_message_dialog.dart';

/// Panel that displays scheduled messages using backend API
class ScheduledMessagesPanel extends StatefulWidget {
  final String workspaceId;
  final String? channelId;
  final String? conversationId;
  final VoidCallback? onClose;
  final VoidCallback? onMessageSent;

  const ScheduledMessagesPanel({
    super.key,
    required this.workspaceId,
    this.channelId,
    this.conversationId,
    this.onClose,
    this.onMessageSent,
  });

  @override
  State<ScheduledMessagesPanel> createState() => _ScheduledMessagesPanelState();

  /// Show scheduled messages panel as a bottom sheet
  static Future<void> show(
    BuildContext context, {
    required String workspaceId,
    String? channelId,
    String? conversationId,
    VoidCallback? onMessageSent,
  }) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder:
          (context) => DraggableScrollableSheet(
            initialChildSize: 0.7,
            minChildSize: 0.5,
            maxChildSize: 0.95,
            expand: false,
            builder:
                (context, scrollController) => ScheduledMessagesPanel(
                  workspaceId: workspaceId,
                  channelId: channelId,
                  conversationId: conversationId,
                  onMessageSent: onMessageSent,
                  onClose: () => Navigator.pop(context),
                ),
          ),
    );
  }
}

class _ScheduledMessagesPanelState extends State<ScheduledMessagesPanel> {
  final ChatApiService _chatApiService = ChatApiService();
  List<ScheduledMessage> _scheduledMessages = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadScheduledMessages();
  }

  Future<void> _loadScheduledMessages() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await _chatApiService.getScheduledMessages(
        widget.workspaceId,
        status: 'pending',
        channelId: widget.channelId,
        conversationId: widget.conversationId,
      );

      if (response.isSuccess && response.data != null) {
        setState(() {
          _scheduledMessages = response.data!;
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = response.message;
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  List<ScheduledMessage> get _pendingMessages =>
      _scheduledMessages
          .where((msg) => msg.status == ScheduledMessageStatus.pending)
          .toList();

  Future<void> _cancelScheduledMessage(ScheduledMessage message) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder:
          (context) => AlertDialog(
            title: Text('scheduled_message.cancel_confirm_title'.tr()),
            content: Text('scheduled_message.cancel_confirm_message'.tr()),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: Text('common.cancel'.tr()),
              ),
              TextButton(
                onPressed: () => Navigator.pop(context, true),
                style: TextButton.styleFrom(foregroundColor: Colors.red),
                child: Text('scheduled_message.cancel_message'.tr()),
              ),
            ],
          ),
    );

    if (confirmed != true) return;

    final response = await _chatApiService.cancelScheduledMessage(
      widget.workspaceId,
      message.id,
    );

    if (response.isSuccess) {
      _loadScheduledMessages();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('scheduled_message.cancelled_success'.tr())),
        );
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(response.message ?? 'common.error'.tr()),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _rescheduleMessage(ScheduledMessage message) async {
    final newTime = await ScheduleMessageDialog.show(context);

    if (newTime == null) return;

    final response = await _chatApiService.updateScheduledMessage(
      widget.workspaceId,
      message.id,
      UpdateScheduledMessageDto(scheduledFor: newTime),
    );

    if (response.isSuccess) {
      _loadScheduledMessages();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('scheduled_message.rescheduled_success'.tr())),
        );
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(response.message ?? 'common.error'.tr()),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _editMessage(ScheduledMessage message) async {
    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder:
          (context) => _EditScheduledMessageDialog(
            initialText: message.content,
            initialTime: message.scheduledFor,
          ),
    );

    if (result == null) return;

    final newText = result['text'] as String;
    final newTime = result['time'] as DateTime?;

    final response = await _chatApiService.updateScheduledMessage(
      widget.workspaceId,
      message.id,
      UpdateScheduledMessageDto(content: newText, scheduledFor: newTime),
    );

    if (response.isSuccess) {
      _loadScheduledMessages();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('scheduled_message.edited_success'.tr())),
        );
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(response.message ?? 'common.error'.tr()),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _sendNow(ScheduledMessage message) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder:
          (context) => AlertDialog(
            title: Text('scheduled_message.send_now_title'.tr()),
            content: Text('scheduled_message.send_now_confirm'.tr()),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: Text('common.cancel'.tr()),
              ),
              ElevatedButton(
                onPressed: () => Navigator.pop(context, true),
                child: Text('scheduled_message.send_now'.tr()),
              ),
            ],
          ),
    );

    if (confirmed != true) return;

    final response = await _chatApiService.sendScheduledMessageNow(
      widget.workspaceId,
      message.id,
    );

    if (response.isSuccess) {
      _loadScheduledMessages();
      widget.onMessageSent?.call();
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('scheduled_message.sent_success'.tr())),
        );
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(response.message ?? 'common.error'.tr()),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _deleteScheduledMessage(ScheduledMessage message) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder:
          (context) => AlertDialog(
            title: Text('scheduled_message.delete_confirm_title'.tr()),
            content: Text('scheduled_message.delete_confirm_message'.tr()),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: Text('common.cancel'.tr()),
              ),
              TextButton(
                onPressed: () => Navigator.pop(context, true),
                style: TextButton.styleFrom(foregroundColor: Colors.red),
                child: Text('common.delete'.tr()),
              ),
            ],
          ),
    );

    if (confirmed != true) return;

    final response = await _chatApiService.deleteScheduledMessage(
      widget.workspaceId,
      message.id,
    );

    if (response.isSuccess) {
      _loadScheduledMessages();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('scheduled_message.deleted_success'.tr())),
        );
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(response.message ?? 'common.error'.tr()),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  String _formatScheduledTime(DateTime dateTime) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final tomorrow = today.add(const Duration(days: 1));
    final scheduledDate = DateTime(dateTime.year, dateTime.month, dateTime.day);

    if (scheduledDate == today) {
      return 'Today at ${DateFormat.jm().format(dateTime)}';
    } else if (scheduledDate == tomorrow) {
      return 'Tomorrow at ${DateFormat.jm().format(dateTime)}';
    } else {
      return DateFormat('EEE, MMM d \'at\' h:mm a').format(dateTime);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        color: isDarkMode ? Colors.grey[900] : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
      ),
      child: Column(
        children: [
          // Handle bar
          Container(
            width: 40,
            height: 4,
            margin: const EdgeInsets.only(top: 12, bottom: 8),
            decoration: BoxDecoration(
              color: Colors.grey[400],
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                Icon(
                  Icons.schedule_send,
                  color: Theme.of(context).primaryColor,
                ),
                const SizedBox(width: 12),
                Text(
                  'scheduled_message.panel_title'.tr(),
                  style: Theme.of(
                    context,
                  ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                ),
                const Spacer(),
                if (!_isLoading && _pendingMessages.isNotEmpty)
                  Text(
                    '${_pendingMessages.length}',
                    style: TextStyle(
                      color: Theme.of(context).primaryColor,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.refresh),
                  onPressed: _loadScheduledMessages,
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: widget.onClose ?? () => Navigator.pop(context),
                ),
              ],
            ),
          ),

          const Divider(),

          // Content
          Expanded(child: _buildContent()),
        ],
      ),
    );
  }

  Widget _buildContent() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 48, color: Colors.red[400]),
            const SizedBox(height: 16),
            Text(
              _error!,
              style: TextStyle(color: Colors.red[600]),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadScheduledMessages,
              child: Text('common.retry'.tr()),
            ),
          ],
        ),
      );
    }

    if (_pendingMessages.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.schedule, size: 48, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              'scheduled_message.no_scheduled'.tr(),
              style: TextStyle(color: Colors.grey[600]),
            ),
            const SizedBox(height: 8),
            Text(
              'scheduled_message.no_scheduled_hint'.tr(),
              style: TextStyle(color: Colors.grey[500], fontSize: 13),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: _pendingMessages.length,
      separatorBuilder: (context, index) => const Divider(height: 1),
      itemBuilder: (context, index) {
        final message = _pendingMessages[index];
        return _buildMessageItem(message);
      },
    );
  }

  Widget _buildMessageItem(ScheduledMessage message) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    return Dismissible(
      key: Key(message.id),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        color: Colors.red,
        child: const Icon(Icons.delete, color: Colors.white),
      ),
      confirmDismiss: (direction) async {
        return await showDialog<bool>(
          context: context,
          builder:
              (context) => AlertDialog(
                title: Text('scheduled_message.delete_confirm_title'.tr()),
                content: Text('scheduled_message.delete_confirm_message'.tr()),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.pop(context, false),
                    child: Text('common.cancel'.tr()),
                  ),
                  TextButton(
                    onPressed: () => Navigator.pop(context, true),
                    style: TextButton.styleFrom(foregroundColor: Colors.red),
                    child: Text('common.delete'.tr()),
                  ),
                ],
              ),
        );
      },
      onDismissed: (direction) {
        _deleteScheduledMessage(message);
      },
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        title: Text(
          message.content,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontWeight: FontWeight.w500),
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 8),
          child: Row(
            children: [
              Icon(
                Icons.schedule,
                size: 14,
                color: Theme.of(context).primaryColor,
              ),
              const SizedBox(width: 4),
              Text(
                _formatScheduledTime(message.scheduledFor),
                style: TextStyle(
                  color: Theme.of(context).primaryColor,
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
        trailing: PopupMenuButton<String>(
          icon: Icon(
            Icons.more_vert,
            color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
          ),
          onSelected: (value) {
            switch (value) {
              case 'edit':
                _editMessage(message);
                break;
              case 'send_now':
                _sendNow(message);
                break;
              case 'reschedule':
                _rescheduleMessage(message);
                break;
              case 'cancel':
                _cancelScheduledMessage(message);
                break;
              case 'delete':
                _deleteScheduledMessage(message);
                break;
            }
          },
          itemBuilder:
              (context) => [
                PopupMenuItem(
                  value: 'edit',
                  child: Row(
                    children: [
                      const Icon(Icons.edit, size: 20),
                      const SizedBox(width: 12),
                      Text('scheduled_message.edit'.tr()),
                    ],
                  ),
                ),
                PopupMenuItem(
                  value: 'send_now',
                  child: Row(
                    children: [
                      const Icon(Icons.send, size: 20),
                      const SizedBox(width: 12),
                      Text('scheduled_message.send_now'.tr()),
                    ],
                  ),
                ),
                PopupMenuItem(
                  value: 'reschedule',
                  child: Row(
                    children: [
                      const Icon(Icons.schedule, size: 20),
                      const SizedBox(width: 12),
                      Text('scheduled_message.reschedule'.tr()),
                    ],
                  ),
                ),
                const PopupMenuDivider(),
                PopupMenuItem(
                  value: 'cancel',
                  child: Row(
                    children: [
                      const Icon(
                        Icons.cancel_outlined,
                        size: 20,
                        color: Colors.orange,
                      ),
                      const SizedBox(width: 12),
                      Text(
                        'scheduled_message.cancel_message'.tr(),
                        style: const TextStyle(color: Colors.orange),
                      ),
                    ],
                  ),
                ),
                PopupMenuItem(
                  value: 'delete',
                  child: Row(
                    children: [
                      const Icon(
                        Icons.delete_outline,
                        size: 20,
                        color: Colors.red,
                      ),
                      const SizedBox(width: 12),
                      Text(
                        'common.delete'.tr(),
                        style: const TextStyle(color: Colors.red),
                      ),
                    ],
                  ),
                ),
              ],
        ),
      ),
    );
  }
}

/// Dialog for editing a scheduled message
class _EditScheduledMessageDialog extends StatefulWidget {
  final String initialText;
  final DateTime initialTime;

  const _EditScheduledMessageDialog({
    required this.initialText,
    required this.initialTime,
  });

  @override
  State<_EditScheduledMessageDialog> createState() =>
      _EditScheduledMessageDialogState();
}

class _EditScheduledMessageDialogState
    extends State<_EditScheduledMessageDialog> {
  late TextEditingController _textController;
  DateTime? _newTime;
  bool _timeChanged = false;

  @override
  void initState() {
    super.initState();
    _textController = TextEditingController(text: widget.initialText);
    _newTime = widget.initialTime;
  }

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }

  Future<void> _pickNewTime() async {
    final newTime = await ScheduleMessageDialog.show(context);
    if (newTime != null) {
      setState(() {
        _newTime = newTime;
        _timeChanged = true;
      });
    }
  }

  String _formatScheduledTime(DateTime dateTime) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final tomorrow = today.add(const Duration(days: 1));
    final scheduledDate = DateTime(dateTime.year, dateTime.month, dateTime.day);

    if (scheduledDate == today) {
      return 'Today at ${DateFormat.jm().format(dateTime)}';
    } else if (scheduledDate == tomorrow) {
      return 'Tomorrow at ${DateFormat.jm().format(dateTime)}';
    } else {
      return DateFormat('EEE, MMM d \'at\' h:mm a').format(dateTime);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    return AlertDialog(
      title: Text('scheduled_message.edit_title'.tr()),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Message text field
            TextField(
              controller: _textController,
              maxLines: 4,
              decoration: InputDecoration(
                labelText: 'scheduled_message.message_label'.tr(),
                border: const OutlineInputBorder(),
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 16),

            // Scheduled time
            Text(
              'scheduled_message.scheduled_for_label'.tr(),
              style: TextStyle(
                fontSize: 12,
                color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
              ),
            ),
            const SizedBox(height: 8),
            InkWell(
              onTap: _pickNewTime,
              borderRadius: BorderRadius.circular(8),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 12,
                ),
                decoration: BoxDecoration(
                  border: Border.all(
                    color: isDarkMode ? Colors.grey[700]! : Colors.grey[300]!,
                  ),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.schedule,
                      size: 20,
                      color: Theme.of(context).primaryColor,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _formatScheduledTime(_newTime!),
                        style: TextStyle(
                          color:
                              _timeChanged
                                  ? Theme.of(context).primaryColor
                                  : null,
                          fontWeight: _timeChanged ? FontWeight.w500 : null,
                        ),
                      ),
                    ),
                    Icon(
                      Icons.edit,
                      size: 16,
                      color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text('common.cancel'.tr()),
        ),
        ElevatedButton(
          onPressed: () {
            final text = _textController.text.trim();
            if (text.isEmpty) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('scheduled_message.empty_message'.tr()),
                  backgroundColor: Colors.orange,
                ),
              );
              return;
            }
            Navigator.pop(context, {
              'text': text,
              'time': _timeChanged ? _newTime : null,
            });
          },
          child: Text('common.save'.tr()),
        ),
      ],
    );
  }
}
