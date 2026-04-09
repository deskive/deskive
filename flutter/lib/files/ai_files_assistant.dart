import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../services/ai_service.dart';
import '../services/workspace_service.dart';

/// Chat message model for AI assistant
class AIFilesMessage {
  final String id;
  final String content;
  final bool isUser;
  final DateTime timestamp;
  final bool isLoading;
  final bool isError;
  final String? action;
  final String? agentUsed;

  AIFilesMessage({
    required this.id,
    required this.content,
    required this.isUser,
    required this.timestamp,
    this.isLoading = false,
    this.isError = false,
    this.action,
    this.agentUsed,
  });

  AIFilesMessage copyWith({
    String? content,
    bool? isLoading,
    bool? isError,
    String? action,
    String? agentUsed,
  }) {
    return AIFilesMessage(
      id: id,
      content: content ?? this.content,
      isUser: isUser,
      timestamp: timestamp,
      isLoading: isLoading ?? this.isLoading,
      isError: isError ?? this.isError,
      action: action ?? this.action,
      agentUsed: agentUsed ?? this.agentUsed,
    );
  }
}

/// Example commands for the files AI assistant
/// Note: These will be translated dynamically in the UI using .tr()
List<Map<String, String>> getFilesExampleCommands() => [
  {
    'title': 'files.ai_files_assistant_cmd_create_folder'.tr(),
    'command': 'files.ai_files_assistant_cmd_create_folder_example'.tr(),
  },
  {
    'title': 'files.ai_files_assistant_cmd_find_files'.tr(),
    'command': 'files.ai_files_assistant_cmd_find_files_example'.tr(),
  },
  {
    'title': 'files.ai_files_assistant_cmd_organize'.tr(),
    'command': 'files.ai_files_assistant_cmd_organize_example'.tr(),
  },
  {
    'title': 'files.ai_files_assistant_cmd_star'.tr(),
    'command': 'files.ai_files_assistant_cmd_star_example'.tr(),
  },
  {
    'title': 'files.ai_files_assistant_cmd_search'.tr(),
    'command': 'files.ai_files_assistant_cmd_search_example'.tr(),
  },
  {
    'title': 'files.ai_files_assistant_cmd_delete'.tr(),
    'command': 'files.ai_files_assistant_cmd_delete_example'.tr(),
  },
];

/// AI Files Assistant Dialog
/// Provides natural language interface for managing files and folders
class AIFilesAssistant extends StatefulWidget {
  final String? folderId;
  final String? folderName;
  final VoidCallback? onFilesChanged;
  final VoidCallback? onFoldersChanged;

  const AIFilesAssistant({
    super.key,
    this.folderId,
    this.folderName,
    this.onFilesChanged,
    this.onFoldersChanged,
  });

  @override
  State<AIFilesAssistant> createState() => _AIFilesAssistantState();
}

class _AIFilesAssistantState extends State<AIFilesAssistant> {
  final TextEditingController _inputController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final AIService _aiService = AIService();
  final FocusNode _focusNode = FocusNode();

  List<AIFilesMessage> _messages = [];
  bool _isProcessing = false;

  @override
  void initState() {
    super.initState();
    _aiService.initialize();
    _addWelcomeMessage();
  }

  @override
  void dispose() {
    _inputController.dispose();
    _scrollController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _addWelcomeMessage() {
    final contextInfo = widget.folderId != null
        ? 'files.ai_files_assistant_context'.tr(args: [widget.folderName ?? 'Unknown'])
        : '';

    _messages.add(AIFilesMessage(
      id: 'welcome',
      content: 'files.ai_files_assistant_welcome'.tr(args: [contextInfo]),
      isUser: false,
      timestamp: DateTime.now(),
    ));
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage(String text) async {
    if (text.trim().isEmpty || _isProcessing) return;

    final userMessage = AIFilesMessage(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      content: text.trim(),
      isUser: true,
      timestamp: DateTime.now(),
    );

    final loadingMessage = AIFilesMessage(
      id: '${DateTime.now().millisecondsSinceEpoch}_loading',
      content: 'files.ai_files_assistant_processing'.tr(),
      isUser: false,
      timestamp: DateTime.now(),
      isLoading: true,
    );

    setState(() {
      _messages.add(userMessage);
      _messages.add(loadingMessage);
      _isProcessing = true;
    });

    _inputController.clear();
    _scrollToBottom();

    try {
      final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
      if (workspaceId == null) {
        throw Exception('No workspace selected');
      }

      // Use unified AI assistant
      final response = await _aiService.processAssistantCommand(
        prompt: text.trim(),
        workspaceId: workspaceId,
        currentView: 'files',
      );

      setState(() {
        // Remove loading message
        _messages.removeWhere((m) => m.id == loadingMessage.id);

        _messages.add(AIFilesMessage(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          content: response.message,
          isUser: false,
          timestamp: DateTime.now(),
          action: response.success ? response.action : null,
          agentUsed: response.agentUsed,
          isError: !response.success,
        ));

        // Notify parent to refresh data on successful action
        if (response.success && response.action.isNotEmpty) {
          widget.onFilesChanged?.call();
          widget.onFoldersChanged?.call();

          // Close dialog after successful action with a short delay
          Future.delayed(const Duration(milliseconds: 800), () {
            if (mounted && context.mounted) {
              Navigator.of(context).pop();
            }
          });
        }
      });
    } catch (e) {
      setState(() {
        _messages.removeWhere((m) => m.id == loadingMessage.id);
        _messages.add(AIFilesMessage(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          content: 'Error: ${e.toString()}',
          isUser: false,
          timestamp: DateTime.now(),
          isError: true,
        ));
      });
    } finally {
      setState(() => _isProcessing = false);
      _scrollToBottom();
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        width: MediaQuery.of(context).size.width * 0.9,
        height: MediaQuery.of(context).size.height * 0.8,
        constraints: const BoxConstraints(maxWidth: 600, maxHeight: 700),
        child: Column(
          children: [
            // Header
            _buildHeader(isDarkMode),

            // Messages
            Expanded(
              child: _messages.isEmpty
                  ? _buildEmptyState(isDarkMode)
                  : _buildMessagesList(isDarkMode),
            ),

            // Quick commands (show when no messages or few messages)
            if (_messages.length <= 2) _buildQuickCommands(isDarkMode),

            // Input
            _buildInputArea(isDarkMode),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(bool isDarkMode) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.teal.shade600, Colors.green.shade600],
        ),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(
              Icons.auto_awesome,
              color: Colors.white,
              size: 24,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'files.ai_files_assistant_title'.tr(),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                if (widget.folderName != null)
                  Text(
                    'files.ai_files_assistant_folder'.tr(args: [widget.folderName!]),
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.8),
                      fontSize: 12,
                    ),
                  ),
              ],
            ),
          ),
          IconButton(
            onPressed: () => Navigator.of(context).pop(),
            icon: const Icon(Icons.close, color: Colors.white),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(bool isDarkMode) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.folder_open,
              size: 64,
              color: isDarkMode ? Colors.grey[600] : Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              'files.ai_files_assistant_start'.tr(),
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w500,
                color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'files.ai_files_assistant_start_desc'.tr(),
              style: TextStyle(
                fontSize: 14,
                color: isDarkMode ? Colors.grey[500] : Colors.grey[500],
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMessagesList(bool isDarkMode) {
    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.all(16),
      itemCount: _messages.length,
      itemBuilder: (context, index) {
        final message = _messages[index];
        return _buildMessageBubble(message, isDarkMode);
      },
    );
  }

  Widget _buildMessageBubble(AIFilesMessage message, bool isDarkMode) {
    final isUser = message.isUser;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment:
            isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isUser) ...[
            CircleAvatar(
              radius: 16,
              backgroundColor: message.isError
                  ? Colors.red.shade100
                  : Colors.teal.shade100,
              child: Icon(
                message.isError ? Icons.error : Icons.auto_awesome,
                size: 18,
                color: message.isError ? Colors.red : Colors.teal,
              ),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isUser
                    ? Colors.teal.shade600
                    : message.isError
                        ? (isDarkMode
                            ? Colors.red.shade900.withOpacity(0.3)
                            : Colors.red.shade50)
                        : (isDarkMode ? Colors.grey[800] : Colors.grey[100]),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (message.isLoading)
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: isDarkMode ? Colors.white : Colors.teal,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          message.content,
                          style: TextStyle(
                            color:
                                isDarkMode ? Colors.grey[300] : Colors.grey[600],
                            fontStyle: FontStyle.italic,
                          ),
                        ),
                      ],
                    )
                  else
                    Text(
                      message.content,
                      style: TextStyle(
                        color: isUser
                            ? Colors.white
                            : message.isError
                                ? Colors.red
                                : (isDarkMode ? Colors.white : Colors.black87),
                      ),
                    ),
                  if (message.action != null && message.action!.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.green.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.check_circle,
                            size: 14,
                            color: Colors.green,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            message.action!.replaceAll('_', ' ').toUpperCase(),
                            style: const TextStyle(
                              fontSize: 11,
                              color: Colors.green,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          if (message.agentUsed != null) ...[
                            const SizedBox(width: 8),
                            Text(
                              '(${message.agentUsed} agent)',
                              style: TextStyle(
                                fontSize: 10,
                                color: Colors.grey[600],
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          if (isUser) ...[
            const SizedBox(width: 8),
            CircleAvatar(
              radius: 16,
              backgroundColor: Colors.teal.shade100,
              child: const Icon(
                Icons.person,
                size: 18,
                color: Colors.teal,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildQuickCommands(bool isDarkMode) {
    final commands = getFilesExampleCommands();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'files.ai_files_assistant_try_commands'.tr(),
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: commands.take(4).map((cmd) {
              return ActionChip(
                label: Text(
                  cmd['title']!,
                  style: const TextStyle(fontSize: 12),
                ),
                onPressed: () => _sendMessage(cmd['command']!),
                backgroundColor:
                    isDarkMode ? Colors.grey[800] : Colors.grey[100],
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildInputArea(bool isDarkMode) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDarkMode ? Colors.grey[900] : Colors.grey[50],
        borderRadius: const BorderRadius.vertical(bottom: Radius.circular(16)),
        border: Border(
          top: BorderSide(
            color: isDarkMode ? Colors.grey[800]! : Colors.grey[200]!,
          ),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _inputController,
              focusNode: _focusNode,
              enabled: !_isProcessing,
              decoration: InputDecoration(
                hintText: 'files.ai_files_assistant_type_command'.tr(),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                  borderSide: BorderSide.none,
                ),
                filled: true,
                fillColor: isDarkMode ? Colors.grey[800] : Colors.white,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
              ),
              onSubmitted: _sendMessage,
              textInputAction: TextInputAction.send,
            ),
          ),
          const SizedBox(width: 8),
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [Colors.teal.shade500, Colors.green.shade500],
              ),
              shape: BoxShape.circle,
            ),
            child: IconButton(
              onPressed: _isProcessing
                  ? null
                  : () => _sendMessage(_inputController.text),
              icon: _isProcessing
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.send, color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }
}

/// Show the AI Files Assistant as a dialog
Future<void> showAIFilesAssistant({
  required BuildContext context,
  String? folderId,
  String? folderName,
  VoidCallback? onFilesChanged,
  VoidCallback? onFoldersChanged,
}) {
  return showDialog(
    context: context,
    builder: (context) => AIFilesAssistant(
      folderId: folderId,
      folderName: folderName,
      onFilesChanged: onFilesChanged,
      onFoldersChanged: onFoldersChanged,
    ),
  );
}
