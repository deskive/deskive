import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:file_picker/file_picker.dart';
import 'dart:async';
import 'dart:io';
import '../services/socket_io_chat_service.dart';
import '../api/base_api_client.dart';
import '../api/services/chat_api_service.dart';
import '../api/services/file_api_service.dart';
import '../widgets/presence_indicator.dart';
import '../widgets/google_drive_file_picker.dart';
import '../widgets/poll_creator_dialog.dart';
import '../widgets/poll_message_widget.dart';
import '../services/bookmark_service.dart';
import 'saved_messages_screen.dart';
import 'channel_settings_screen.dart';
import '../theme/app_theme.dart';

class RealTimeChatScreen extends StatefulWidget {
  final String chatId; // Channel ID or Conversation ID
  final String chatName;
  final String? chatSubtitle;
  final bool isChannel;
  final Color? avatarColor;
  final String workspaceId;
  final String currentUserId;
  final String currentUserName;

  const RealTimeChatScreen({
    super.key,
    required this.chatId,
    required this.chatName,
    this.chatSubtitle,
    this.isChannel = false,
    this.avatarColor,
    required this.workspaceId,
    required this.currentUserId,
    required this.currentUserName,
  });

  @override
  State<RealTimeChatScreen> createState() => _RealTimeChatScreenState();
}

class _RealTimeChatScreenState extends State<RealTimeChatScreen> 
    with WidgetsBindingObserver {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<RealtimeMessage> _messages = [];
  final SocketIOChatService _socketIOChatService = SocketIOChatService.instance;
  final BookmarkService _bookmarkService = BookmarkService();
  
  // Subscription management
  StreamSubscription<RealtimeMessage>? _messageSubscription;
  StreamSubscription<UserPresence>? _presenceSubscription;
  StreamSubscription<TypingIndicator>? _typingSubscription;
  StreamSubscription<MessageDeliveryStatus>? _deliverySubscription;
  StreamSubscription<Map<String, dynamic>>? _pollSubscription;
  
  // UI state
  bool _isLoading = true;
  bool _isSendingMessage = false;
  RealtimeMessage? _replyingToMessage;
  bool _isSearching = false;
  final TextEditingController _searchController = TextEditingController();
  List<int> _searchResultIndices = [];
  int _currentSearchIndex = -1;

  // File attachment state
  final List<PlatformFile> _selectedFiles = [];
  final List<Map<String, dynamic>> _selectedDriveFiles = [];
  bool _isUploadingFiles = false;
  final FileApiService _fileApiService = FileApiService();

  // Typing management
  Timer? _typingTimer;
  bool _isTyping = false;
  
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initializeRealTimeChat();
    _messageController.addListener(_onMessageTextChanged);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _cleanupSubscriptions();
    _messageController.removeListener(_onMessageTextChanged);
    _messageController.dispose();
    _scrollController.dispose();
    _searchController.dispose();
    _typingTimer?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    switch (state) {
      case AppLifecycleState.paused:
        _socketIOChatService.updatePresenceStatus(status: UserPresenceStatus.away);
        break;
      case AppLifecycleState.resumed:
        _socketIOChatService.updatePresenceStatus(status: UserPresenceStatus.online);
        break;
      case AppLifecycleState.detached:
        _socketIOChatService.updatePresenceStatus(status: UserPresenceStatus.offline);
        break;
      default:
        break;
    }
  }

  Future<void> _initializeRealTimeChat() async {
    try {

      // Initialize the Socket.IO chat service
      await _socketIOChatService.initialize(
        workspaceId: widget.workspaceId,
        userId: widget.currentUserId,
        userName: widget.currentUserName,
      );


      // Subscribe to real-time updates
      if (widget.isChannel) {
        await _socketIOChatService.subscribeToChannelMessages(widget.chatId);
      } else {
        await _socketIOChatService.subscribeToConversationMessages(widget.chatId);
      }

      // Set up stream subscriptions
      _setupStreamSubscriptions();

      // Load initial messages
      await _loadInitialMessages();

      setState(() {
        _isLoading = false;
      });

    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      _showErrorSnackBar('messages.failed_initialize_chat'.tr(args: [e.toString()]));
    }
  }

  void _setupStreamSubscriptions() {

    // Message updates
    _messageSubscription = _socketIOChatService.messageStream.listen(
      _handleIncomingMessage,
      onError: (error) {
        _showErrorSnackBar('messages.message_stream_error'.tr(args: [error.toString()]));
      },
    );

    // Presence updates
    _presenceSubscription = _socketIOChatService.presenceStream.listen(
      (presence) {
        if (mounted) setState(() {});
      },
      onError: (error) {
      },
    );

    // Typing indicators
    _typingSubscription = _socketIOChatService.typingStream.listen(
      (typingIndicator) {
        if (mounted && typingIndicator.channelId == widget.chatId) {
          setState(() {});
        }
      },
      onError: (error) {
      },
    );

    // Delivery status updates
    _deliverySubscription = _socketIOChatService.deliveryStatusStream.listen(
      (status) {
        // Update message delivery status in UI if needed
        if (mounted) setState(() {});
      },
      onError: (error) {
      },
    );

    // Poll updates (vote, close)
    _pollSubscription = _socketIOChatService.pollStream.listen(
      _handlePollEvent,
      onError: (error) {
        debugPrint('Poll stream error: $error');
      },
    );
  }

  void _cleanupSubscriptions() {
    _messageSubscription?.cancel();
    _presenceSubscription?.cancel();
    _typingSubscription?.cancel();
    _deliverySubscription?.cancel();
    _pollSubscription?.cancel();

    // Unsubscribe from real-time updates
    if (widget.isChannel) {
      _socketIOChatService.unsubscribeFromChannel(widget.chatId);
    } else {
      _socketIOChatService.unsubscribeFromConversation(widget.chatId);
    }
  }

  void _handleIncomingMessage(RealtimeMessage message) {

    // Only add messages for the current channel/conversation
    if (widget.isChannel && message.channelId != widget.chatId) {
      return;
    }
    if (!widget.isChannel && message.conversationId != widget.chatId) {
      return;
    }

    if (mounted) {
      setState(() {
        // Check if message already exists (avoid duplicates)
        final existingIndex = _messages.indexWhere((m) => m.id == message.id);
        if (existingIndex != -1) {
          // Update existing message
          _messages[existingIndex] = message;
        } else {
          // Add new message
          _messages.add(message);
          _messages.sort((a, b) => a.createdAt.compareTo(b.createdAt));
        }
      });


      // Auto-scroll to bottom for new messages
      if (message.userId == widget.currentUserId) {
        _scrollToBottom();
      }
    }
  }

  void _handlePollEvent(Map<String, dynamic> event) {
    final messageId = event['messageId'];
    final pollData = event['poll'];
    final eventType = event['eventType'];

    if (messageId == null || pollData == null) return;

    // Find the message with this poll and update it
    if (mounted) {
      setState(() {
        final messageIndex = _messages.indexWhere((m) => m.id == messageId);
        if (messageIndex != -1) {
          // Message found, trigger rebuild to update poll widget
          debugPrint('Poll $eventType event received for message $messageId');
        }
      });
    }
  }

  void _showPollCreator() {
    PollCreatorDialog.show(
      context: context,
      creatorId: widget.currentUserId,
      onCreatePoll: (linkedContent) async {
        await _sendPollMessage(linkedContent);
      },
    );
  }

  Future<void> _sendPollMessage(Map<String, dynamic> linkedContent) async {
    setState(() {
      _isSendingMessage = true;
    });

    try {
      final pollQuestion = linkedContent['poll']?['question'] ?? 'poll.title'.tr();

      if (widget.isChannel) {
        await _socketIOChatService.sendChannelMessage(
          channelId: widget.chatId,
          content: pollQuestion,
          linkedContent: [linkedContent],
        );
      } else {
        await _socketIOChatService.sendConversationMessage(
          conversationId: widget.chatId,
          content: pollQuestion,
          linkedContent: [linkedContent],
        );
      }

      _scrollToBottom();
    } catch (e) {
      _showErrorSnackBar('poll.send_failed'.tr());
    } finally {
      setState(() {
        _isSendingMessage = false;
      });
    }
  }

  Future<void> _loadInitialMessages() async {
    try {
      final chatApiService = ChatApiService();
      ApiResponse<List<Message>> response;

      if (widget.isChannel) {
        response = await chatApiService.getChannelMessages(
          widget.workspaceId,
          widget.chatId,
          limit: 50,
        );
      } else {
        response = await chatApiService.getConversationMessages(
          widget.workspaceId,
          widget.chatId,
          limit: 50,
        );
      }

      if (response.isSuccess && response.data != null) {
        final messages = response.data!
            .map((msg) => RealtimeMessage.fromMessage(msg))
            .toList();

        setState(() {
          _messages.addAll(messages);
          _messages.sort((a, b) => a.createdAt.compareTo(b.createdAt));
        });

        _scrollToBottom();
      }
    } catch (e) {
      _showErrorSnackBar('messages.error'.tr(args: [e.toString()]));
    }
  }

  void _onMessageTextChanged() {
    final text = _messageController.text.trim();

    if (text.isNotEmpty && !_isTyping) {
      _isTyping = true;
      _socketIOChatService.sendTypingIndicator(
        channelId: widget.chatId,
        isConversation: !widget.isChannel,
      );
    }

    // Cancel previous timer
    _typingTimer?.cancel();

    // Set new timer to stop typing indicator
    _typingTimer = Timer(const Duration(seconds: 1), () {
      if (_isTyping) {
        _isTyping = false;
        _socketIOChatService.stopTypingIndicator(
          channelId: widget.chatId,
          isConversation: !widget.isChannel,
        );
      }
    });
  }

  Future<void> _sendMessage() async {
    // Check if empty (text and files), but preserve newlines in the actual message
    final hasText = _messageController.text.trim().isNotEmpty;
    final hasFiles = _hasSelectedFiles;

    if ((!hasText && !hasFiles) || _isSendingMessage) return;

    final text = _messageController.text;

    setState(() {
      _isSendingMessage = true;
      if (hasFiles) _isUploadingFiles = true;
    });

    try {

      // Stop typing indicator
      _isTyping = false;
      _typingTimer?.cancel();
      await _socketIOChatService.stopTypingIndicator(
        channelId: widget.chatId,
        isConversation: !widget.isChannel,
      );

      // Upload files and get attachments
      List<AttachmentDto>? attachments;
      if (hasFiles) {
        attachments = await _uploadFilesAndGetAttachments();
      }

      RealtimeMessage sentMessage;
      if (widget.isChannel) {
        sentMessage = await _socketIOChatService.sendChannelMessage(
          channelId: widget.chatId,
          content: hasText ? text : (attachments?.isNotEmpty == true ? 'messages.shared_files'.tr(args: [attachments!.length.toString()]) : ''),
          attachments: attachments,
          parentId: _replyingToMessage?.id,
        );
      } else {
        sentMessage = await _socketIOChatService.sendConversationMessage(
          conversationId: widget.chatId,
          content: hasText ? text : (attachments?.isNotEmpty == true ? 'messages.shared_files'.tr(args: [attachments!.length.toString()]) : ''),
          attachments: attachments,
          parentId: _replyingToMessage?.id,
        );
      }


      // Clear message input and selected files
      _messageController.clear();
      _clearSelectedFiles();
      _clearReply();

      // Scroll to bottom
      _scrollToBottom();

    } catch (e) {
      _showErrorSnackBar('messages.failed_send_message'.tr());
    } finally {
      setState(() {
        _isSendingMessage = false;
        _isUploadingFiles = false;
      });
    }
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

  void _replyToMessage(RealtimeMessage message) {
    setState(() {
      _replyingToMessage = message;
    });
    FocusScope.of(context).requestFocus();
  }

  void _clearReply() {
    setState(() {
      _replyingToMessage = null;
    });
  }

  void _showErrorSnackBar(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: Colors.red,
          duration: const Duration(seconds: 4),
        ),
      );
    }
  }

  // ==================== FILE ATTACHMENT METHODS ====================

  /// Show attachment options bottom sheet
  void _showAttachmentOptions() {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    showModalBottomSheet(
      context: context,
      backgroundColor: context.cardColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: isDarkMode ? Colors.grey[600] : Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryLight.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    Icons.phone_android,
                    color: AppTheme.primaryLight,
                  ),
                ),
                title: Text('messages.from_device'.tr()),
                subtitle: Text('messages.from_device_desc'.tr()),
                onTap: () {
                  Navigator.pop(context);
                  _pickFilesFromDevice();
                },
              ),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF4285F4).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.cloud,
                    color: Color(0xFF4285F4),
                    size: 24,
                  ),
                ),
                title: Text('messages.from_google_drive'.tr()),
                subtitle: Text('messages.from_google_drive_desc'.tr()),
                onTap: () {
                  Navigator.pop(context);
                  _pickFilesFromGoogleDrive();
                },
              ),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.purple.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.poll,
                    color: Colors.purple,
                    size: 24,
                  ),
                ),
                title: Text('poll.create_poll'.tr()),
                subtitle: Text('poll.create_poll_desc'.tr()),
                onTap: () {
                  Navigator.pop(context);
                  _showPollCreator();
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Pick files from device storage
  Future<void> _pickFilesFromDevice() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.any,
        allowMultiple: true,
      );

      if (result != null && result.files.isNotEmpty) {
        setState(() {
          _selectedFiles.addAll(result.files);
        });
      }
    } catch (e) {
      _showErrorSnackBar('messages.failed_pick_files'.tr());
    }
  }

  /// Pick files from Google Drive
  Future<void> _pickFilesFromGoogleDrive() async {
    try {
      final result = await GoogleDriveFilePicker.show(
        context: context,
      );

      if (result != null) {
        setState(() {
          _selectedDriveFiles.add({
            'id': result.file.id,
            'name': result.file.name,
            'mimeType': result.file.mimeType,
            'size': result.file.size,
            'localPath': result.localFile?.path,
            'downloadUrl': result.file.webContentLink,
            'thumbnailUrl': result.file.thumbnailLink,
          });
        });
      }
    } catch (e) {
      _showErrorSnackBar('messages.failed_pick_drive_files'.tr());
    }
  }

  /// Remove a selected device file
  void _removeSelectedFile(int index) {
    setState(() {
      _selectedFiles.removeAt(index);
    });
  }

  /// Remove a selected Drive file
  void _removeSelectedDriveFile(int index) {
    setState(() {
      _selectedDriveFiles.removeAt(index);
    });
  }

  /// Clear all selected files
  void _clearSelectedFiles() {
    setState(() {
      _selectedFiles.clear();
      _selectedDriveFiles.clear();
    });
  }

  /// Check if there are any files selected
  bool get _hasSelectedFiles =>
      _selectedFiles.isNotEmpty || _selectedDriveFiles.isNotEmpty;

  /// Get total count of selected files
  int get _selectedFilesCount =>
      _selectedFiles.length + _selectedDriveFiles.length;

  /// Upload files and get attachments
  Future<List<AttachmentDto>> _uploadFilesAndGetAttachments() async {
    final attachments = <AttachmentDto>[];

    // Upload device files
    for (final file in _selectedFiles) {
      if (file.path != null) {
        try {
          final response = await _fileApiService.uploadFile(
            widget.workspaceId,
            File(file.path!),
            UploadFileDto(),
          );

          if (response.isSuccess && response.data != null) {
            final uploadedFile = response.data!;
            attachments.add(AttachmentDto(
              id: uploadedFile.id,
              fileName: uploadedFile.name,
              url: uploadedFile.url,
              mimeType: uploadedFile.mimeType,
              fileSize: uploadedFile.size.toString(),
            ));
          }
        } catch (e) {
          debugPrint('Failed to upload file ${file.name}: $e');
        }
      }
    }

    // Import Google Drive files
    for (final driveFile in _selectedDriveFiles) {
      try {
        // If we have a local file path, upload it
        if (driveFile['localPath'] != null) {
          final response = await _fileApiService.uploadFile(
            widget.workspaceId,
            File(driveFile['localPath']),
            UploadFileDto(),
          );

          if (response.isSuccess && response.data != null) {
            final uploadedFile = response.data!;
            attachments.add(AttachmentDto(
              id: uploadedFile.id,
              fileName: uploadedFile.name,
              url: uploadedFile.url,
              mimeType: uploadedFile.mimeType,
              fileSize: uploadedFile.size.toString(),
            ));
          }
        } else {
          // Use the Drive file directly as attachment
          attachments.add(AttachmentDto(
            id: driveFile['id'] ?? '',
            fileName: driveFile['name'] ?? '',
            url: driveFile['downloadUrl'] ?? '',
            mimeType: driveFile['mimeType'] ?? 'application/octet-stream',
            fileSize: (driveFile['size'] ?? 0).toString(),
          ));
        }
      } catch (e) {
        debugPrint('Failed to import Drive file ${driveFile['name']}: $e');
      }
    }

    return attachments;
  }

  /// Get file icon based on mime type
  IconData _getFileIcon(String? mimeType) {
    if (mimeType == null) return Icons.insert_drive_file;

    if (mimeType.startsWith('image/')) return Icons.image;
    if (mimeType.startsWith('video/')) return Icons.video_file;
    if (mimeType.startsWith('audio/')) return Icons.audio_file;
    if (mimeType.contains('pdf')) return Icons.picture_as_pdf;
    if (mimeType.contains('word') || mimeType.contains('document')) {
      return Icons.description;
    }
    if (mimeType.contains('sheet') || mimeType.contains('excel')) {
      return Icons.table_chart;
    }
    if (mimeType.contains('presentation') || mimeType.contains('powerpoint')) {
      return Icons.slideshow;
    }
    if (mimeType.contains('zip') || mimeType.contains('archive')) {
      return Icons.folder_zip;
    }
    return Icons.insert_drive_file;
  }

  /// Format file size for display
  String _formatFileSize(int? bytes) {
    if (bytes == null || bytes == 0) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    int unitIndex = 0;
    double size = bytes.toDouble();
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return '${size.toStringAsFixed(1)} ${units[unitIndex]}';
  }

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    
    return Scaffold(
      backgroundColor: context.backgroundColor,
      appBar: _buildAppBar(context, isDarkMode),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _buildChatBody(context, isDarkMode),
    );
  }

  PreferredSizeWidget _buildAppBar(BuildContext context, bool isDarkMode) {
    return AppBar(
      backgroundColor: context.cardColor,
      elevation: 1,
      leading: IconButton(
        icon: Icon(
          Icons.arrow_back,
          color: isDarkMode ? Colors.white : Colors.black,
        ),
        onPressed: () => Navigator.pop(context),
      ),
      title: GestureDetector(
        onTap: widget.isChannel ? _openChannelSettings : null,
        child: Row(
          children: [
            // Avatar with presence indicator
            Stack(
              children: [
                CircleAvatar(
                  radius: 18,
                  backgroundColor: widget.avatarColor ?? 
                      (widget.isChannel ? AppTheme.infoLight : Colors.green),
                  child: widget.isChannel
                      ? const Icon(Icons.tag, color: Colors.white, size: 20)
                      : Text(
                          widget.chatName.isNotEmpty ? widget.chatName[0].toUpperCase() : '?',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                ),
                if (!widget.isChannel)
                  Positioned(
                    right: 0,
                    bottom: 0,
                    child: PresenceIndicator(
                      userId: widget.chatId, // Using chatId as userId for direct messages
                      size: 12,
                    ),
                  ),
              ],
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.isChannel ? '#${widget.chatName}' : widget.chatName,
                    style: TextStyle(
                      color: isDarkMode ? Colors.white : Colors.black,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  if (widget.chatSubtitle != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      widget.chatSubtitle!,
                      style: TextStyle(
                        color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
                        fontSize: 12,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
      actions: [
        // Online users indicator for channels
        if (widget.isChannel)
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: OnlineUsersList(
              userIds: [], // TODO: Get actual member IDs
              onTap: _showOnlineUsers,
            ),
          ),
        IconButton(
          icon: Icon(
            _isSearching ? Icons.close : Icons.search,
            color: isDarkMode ? Colors.white : Colors.black,
          ),
          onPressed: _toggleSearch,
        ),
        PopupMenuButton<String>(
          icon: Icon(
            Icons.more_vert,
            color: isDarkMode ? Colors.white : Colors.black,
          ),
          onSelected: _handleMenuSelection,
          itemBuilder: (context) => [
            PopupMenuItem(
              value: 'bookmark',
              child: Row(
                children: [
                  const Icon(Icons.bookmark_border),
                  const SizedBox(width: 8),
                  Text('messages.bookmarks'.tr()),
                ],
              ),
            ),
            if (widget.isChannel)
              PopupMenuItem(
                value: 'settings',
                child: Row(
                  children: [
                    const Icon(Icons.settings),
                    const SizedBox(width: 8),
                    Text('messages.channel_settings'.tr()),
                  ],
                ),
              ),
          ],
        ),
      ],
    );
  }

  Widget _buildChatBody(BuildContext context, bool isDarkMode) {
    return Column(
      children: [
        // Search bar
        if (_isSearching) _buildSearchBar(isDarkMode),
        
        // Messages list
        Expanded(
          child: Column(
            children: [
              Expanded(
                child: ListView.builder(
                  controller: _scrollController,
                  padding: const EdgeInsets.all(16),
                  itemCount: _messages.length,
                  itemBuilder: (context, index) {
                    final message = _messages[index];
                    final isMe = message.senderId == widget.currentUserId;
                    final showSender = widget.isChannel && !isMe;
                    
                    return _buildMessageBubble(
                      message: message,
                      isMe: isMe,
                      showSender: showSender,
                      isDarkMode: isDarkMode,
                      context: context,
                    );
                  },
                ),
              ),
              
              // Typing indicators
              TypingIndicatorsWidget(channelId: widget.chatId),
            ],
          ),
        ),
        
        // Reply preview
        if (_replyingToMessage != null) _buildReplyPreview(isDarkMode),
        
        // Message input
        _buildMessageInput(isDarkMode),
      ],
    );
  }

  Widget _buildSearchBar(bool isDarkMode) {
    return Container(
      padding: const EdgeInsets.all(16),
      color: context.cardColor,
      child: TextField(
        controller: _searchController,
        autofocus: true,
        decoration: InputDecoration(
          hintText: 'messages.search_messages'.tr(),
          prefixIcon: const Icon(Icons.search),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
          ),
          filled: true,
          fillColor: isDarkMode ? AppTheme.mutedDark : AppTheme.mutedLight,
        ),
        onChanged: _performSearch,
      ),
    );
  }

  Widget _buildMessageBubble({
    required RealtimeMessage message,
    required bool isMe,
    required bool showSender,
    required bool isDarkMode,
    required BuildContext context,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      child: Row(
        mainAxisAlignment: isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Avatar on left for received messages
          if (!isMe)
            CircleAvatar(
              radius: 18,
              backgroundColor: message.senderName != null
                  ? Colors.primaries[message.senderName!.hashCode % Colors.primaries.length]
                  : Colors.grey[400],
              child: Text(
                (message.senderName ?? 'U')[0].toUpperCase(),
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          if (!isMe) const SizedBox(width: 12),

          // Message content
          Flexible(
            child: Column(
              crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
              children: [
                // Sender name, timestamp, and status
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      isMe ? widget.currentUserName : (message.senderName ?? 'messages.unknown_user'.tr()),
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: isDarkMode ? Colors.white : Colors.black87,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      _formatTime(message.createdAt),
                      style: TextStyle(
                        color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
                        fontSize: 11,
                      ),
                    ),
                    if (message.isEdited) ...[
                      const SizedBox(width: 6),
                      Text(
                        'messages.edited'.tr(),
                        style: TextStyle(
                          color: isDarkMode ? Colors.grey[500] : Colors.grey[500],
                          fontSize: 10,
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                    ],
                    if (isMe) ...[
                      const SizedBox(width: 6),
                      _buildDeliveryStatusIcon(message.deliveryStatus),
                    ],
                  ],
                ),
                const SizedBox(height: 4),

                // Message bubble
                GestureDetector(
                  onLongPress: () => _showMessageOptions(message),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.transparent,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Reply reference
                        if (message.replyToId != null) _buildReplyReference(message, isDarkMode),

                        // Message text
                        Text(
                          message.content,
                          softWrap: true,
                          style: TextStyle(
                            color: isDarkMode ? Colors.white : Colors.black87,
                            fontSize: 15,
                            height: 1.4,
                          ),
                        ),

                        // Poll display (if message has a poll in linkedContent)
                        ..._buildPollWidgets(message),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),

          // Avatar on right for sent messages
          if (isMe) const SizedBox(width: 12),
          if (isMe)
            CircleAvatar(
              radius: 18,
              backgroundColor: AppTheme.infoLight,
              child: Text(
                widget.currentUserName[0].toUpperCase(),
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
        ],
      ),
    );
  }

  /// Build poll widgets from message linkedContent
  List<Widget> _buildPollWidgets(RealtimeMessage message) {
    final linkedContent = message.linkedContent;
    if (linkedContent == null || linkedContent.isEmpty) {
      return [];
    }

    final polls = <Widget>[];
    for (final content in linkedContent) {
      if (content is Map<String, dynamic> && content['type'] == 'poll') {
        final pollData = content['poll'] ?? content;
        if (pollData != null) {
          final createdBy = pollData['createdBy'] ?? pollData['created_by'] ?? '';
          polls.add(
            PollMessageWidget(
              key: ValueKey('poll_${message.id}_${content['id']}'),
              messageId: message.id,
              workspaceId: widget.workspaceId,
              pollData: content,
              currentUserId: widget.currentUserId,
              isCreator: createdBy == widget.currentUserId,
              onPollUpdated: () {
                // Trigger a rebuild when poll is updated
                if (mounted) setState(() {});
              },
            ),
          );
        }
      }
    }
    return polls;
  }

  Widget _buildReplyReference(RealtimeMessage message, bool isDarkMode) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border(
          left: BorderSide(
            color: isDarkMode ? Colors.grey[600]! : Colors.grey[400]!,
            width: 3,
          ),
        ),
      ),
      child: Text(
        'messages.replying_to'.tr(args: [(message.replyToMessage?.content ?? 'messages.title'.tr()).substring(0, (message.replyToMessage?.content ?? 'messages.title'.tr()).length > 50 ? 50 : (message.replyToMessage?.content ?? 'messages.title'.tr()).length)]),
        style: TextStyle(
          color: isDarkMode ? Colors.grey[300] : Colors.grey[700],
          fontSize: 12,
          fontStyle: FontStyle.italic,
        ),
      ),
    );
  }

  Widget _buildDeliveryStatusIcon(MessageDeliveryStatus status) {
    IconData icon;
    Color color;

    switch (status) {
      case MessageDeliveryStatus.sending:
        icon = Icons.schedule;
        color = Colors.grey;
        break;
      case MessageDeliveryStatus.sent:
        icon = Icons.check;
        color = Colors.grey;
        break;
      case MessageDeliveryStatus.delivered:
        icon = Icons.done_all;
        color = Colors.grey;
        break;
      case MessageDeliveryStatus.read:
        icon = Icons.done_all;
        color = Colors.blue;
        break;
      case MessageDeliveryStatus.failed:
        icon = Icons.error;
        color = Colors.red;
        break;
    }

    return Icon(
      icon,
      size: 12,
      color: color,
    );
  }

  Widget _buildReplyPreview(bool isDarkMode) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      color: isDarkMode ? AppTheme.cardDark : AppTheme.mutedLight,
      child: Row(
        children: [
          Icon(
            Icons.reply,
            size: 16,
            color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Replying to: ${(_replyingToMessage?.content ?? '').substring(0, 30)}...',
              style: TextStyle(
                color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
                fontSize: 12,
              ),
            ),
          ),
          IconButton(
            icon: Icon(
              Icons.close,
              size: 16,
              color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
            ),
            onPressed: _clearReply,
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
          ),
        ],
      ),
    );
  }

  Widget _buildMessageInput(bool isDarkMode) {
    return Container(
      decoration: BoxDecoration(
        color: context.cardColor,
        border: Border(
          top: BorderSide(
            color: isDarkMode ? Colors.grey[800]! : Colors.grey[200]!,
            width: 1,
          ),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Selected files preview
          if (_hasSelectedFiles) _buildSelectedFilesPreview(isDarkMode),

          // Message input row
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                // Attachment button
                IconButton(
                  icon: Stack(
                    children: [
                      Icon(
                        Icons.attach_file,
                        color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
                      ),
                      if (_hasSelectedFiles)
                        Positioned(
                          right: 0,
                          top: 0,
                          child: Container(
                            padding: const EdgeInsets.all(2),
                            decoration: BoxDecoration(
                              color: AppTheme.primaryLight,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            constraints: const BoxConstraints(
                              minWidth: 14,
                              minHeight: 14,
                            ),
                            child: Text(
                              _selectedFilesCount.toString(),
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ),
                        ),
                    ],
                  ),
                  onPressed: _showAttachmentOptions,
                  tooltip: 'messages.attach_file'.tr(),
                ),
                const SizedBox(width: 4),
                Expanded(
                  child: TextField(
                    controller: _messageController,
                    maxLines: 5,
                    minLines: 1,
                    textCapitalization: TextCapitalization.sentences,
                    decoration: InputDecoration(
                      hintText: 'messages.type_message'.tr(),
                      hintMaxLines: 1,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide.none,
                      ),
                      filled: true,
                      fillColor: isDarkMode ? AppTheme.mutedDark : AppTheme.mutedLight,
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
                    ),
                    onSubmitted: (_) => _sendMessage(),
                  ),
                ),
                const SizedBox(width: 8),
                CircleAvatar(
                  backgroundColor: AppTheme.infoLight,
                  child: IconButton(
                    icon: _isSendingMessage || _isUploadingFiles
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(
                            Icons.send,
                            color: Colors.white,
                            size: 20,
                          ),
                    onPressed: _isSendingMessage || _isUploadingFiles ? null : _sendMessage,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Build the selected files preview section
  Widget _buildSelectedFilesPreview(bool isDarkMode) {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header with clear all button
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'messages.attachments'.tr(args: [_selectedFilesCount.toString()]),
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
                ),
              ),
              TextButton.icon(
                onPressed: _clearSelectedFiles,
                icon: const Icon(Icons.clear_all, size: 16),
                label: Text('messages.clear_all'.tr()),
                style: TextButton.styleFrom(
                  foregroundColor: Colors.red,
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          // Files list
          SizedBox(
            height: 64,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                // Device files
                ..._selectedFiles.asMap().entries.map((entry) {
                  final index = entry.key;
                  final file = entry.value;
                  return _buildFilePreviewChip(
                    name: file.name,
                    size: file.size,
                    mimeType: _getMimeTypeFromExtension(file.extension),
                    onRemove: () => _removeSelectedFile(index),
                    isDarkMode: isDarkMode,
                  );
                }),
                // Drive files
                ..._selectedDriveFiles.asMap().entries.map((entry) {
                  final index = entry.key;
                  final file = entry.value;
                  return _buildFilePreviewChip(
                    name: file['name'] ?? 'Unknown',
                    size: file['size'] as int?,
                    mimeType: file['mimeType'] as String?,
                    onRemove: () => _removeSelectedDriveFile(index),
                    isDarkMode: isDarkMode,
                    isDriveFile: true,
                  );
                }),
              ],
            ),
          ),
          // Upload progress indicator
          if (_isUploadingFiles)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Row(
                children: [
                  const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'messages.uploading_files'.tr(),
                    style: TextStyle(
                      fontSize: 12,
                      color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  /// Build a single file preview chip
  Widget _buildFilePreviewChip({
    required String name,
    int? size,
    String? mimeType,
    required VoidCallback onRemove,
    required bool isDarkMode,
    bool isDriveFile = false,
  }) {
    return Container(
      width: 140,
      margin: const EdgeInsets.only(right: 8),
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: isDarkMode ? Colors.grey[800] : Colors.grey[100],
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isDarkMode ? Colors.grey[700]! : Colors.grey[300]!,
        ),
      ),
      child: Row(
        children: [
          // File icon
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: (isDriveFile ? Colors.blue : AppTheme.primaryLight).withOpacity(0.1),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Icon(
              isDriveFile ? Icons.cloud : _getFileIcon(mimeType),
              size: 18,
              color: isDriveFile ? Colors.blue : AppTheme.primaryLight,
            ),
          ),
          const SizedBox(width: 8),
          // File info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  name,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: isDarkMode ? Colors.white : Colors.black87,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                if (size != null && size > 0)
                  Text(
                    _formatFileSize(size),
                    style: TextStyle(
                      fontSize: 10,
                      color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
                    ),
                  ),
              ],
            ),
          ),
          // Remove button
          GestureDetector(
            onTap: onRemove,
            child: Container(
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                color: Colors.red.withOpacity(0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(
                Icons.close,
                size: 14,
                color: Colors.red,
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Get MIME type from file extension
  String? _getMimeTypeFromExtension(String? extension) {
    if (extension == null) return null;
    final ext = extension.toLowerCase();
    const mimeTypes = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'mp4': 'video/mp4',
      'mov': 'video/quicktime',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'zip': 'application/zip',
      'rar': 'application/x-rar-compressed',
      'txt': 'text/plain',
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'json': 'application/json',
    };
    return mimeTypes[ext];
  }

  String _formatTime(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inDays > 0) {
      return '${difference.inDays}d ago';
    } else if (difference.inHours > 0) {
      return '${difference.inHours}h ago';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes}m ago';
    } else {
      return 'Just now';
    }
  }

  void _showMessageOptions(RealtimeMessage message) {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.reply),
              title: Text('messages.reply'.tr()),
              onTap: () {
                Navigator.pop(context);
                _replyToMessage(message);
              },
            ),
            if (message.senderId == widget.currentUserId)
              ListTile(
                leading: const Icon(Icons.edit),
                title: Text('messages.edit'.tr()),
                onTap: () {
                  Navigator.pop(context);
                  // TODO: Implement message editing
                },
              ),
            ListTile(
              leading: const Icon(Icons.bookmark_border),
              title: Text('messages.bookmark'.tr()),
              onTap: () {
                Navigator.pop(context);
                // TODO: Implement message bookmarking
              },
            ),
            if (message.senderId == widget.currentUserId)
              ListTile(
                leading: const Icon(Icons.delete, color: Colors.red),
                title: Text('messages.delete'.tr(), style: const TextStyle(color: Colors.red)),
                onTap: () {
                  Navigator.pop(context);
                  _confirmDeleteMessage(message);
                },
              ),
          ],
        ),
      ),
    );
  }

  void _confirmDeleteMessage(RealtimeMessage message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('messages.delete_message'.tr()),
        content: Text('messages.delete_message_confirm'.tr()),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('messages.cancel'.tr()),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              // TODO: Implement message deletion
            },
            child: Text('messages.delete'.tr(), style: const TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  void _toggleSearch() {
    setState(() {
      _isSearching = !_isSearching;
      if (!_isSearching) {
        _searchController.clear();
        _searchResultIndices.clear();
        _currentSearchIndex = -1;
      }
    });
  }

  void _performSearch(String query) {
    if (query.isEmpty) {
      setState(() {
        _searchResultIndices.clear();
        _currentSearchIndex = -1;
      });
      return;
    }

    final indices = <int>[];
    for (int i = 0; i < _messages.length; i++) {
      if (_messages[i].content.toLowerCase().contains(query.toLowerCase())) {
        indices.add(i);
      }
    }

    setState(() {
      _searchResultIndices = indices;
      _currentSearchIndex = indices.isNotEmpty ? 0 : -1;
    });

    // Scroll to first result
    if (indices.isNotEmpty) {
      // TODO: Implement scroll to specific message
    }
  }

  void _openChannelSettings() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ChannelSettingsScreen(
          channelName: widget.chatName,
          channelDescription: widget.chatSubtitle,
          isPrivateChannel: false, // TODO: Get from channel data
          notificationsEnabled: true,
          channelMuted: false,
        ),
      ),
    );
  }

  void _showOnlineUsers() {
    // TODO: Show online users dialog
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('messages.online_users'.tr()),
        content: Text('messages.feature_coming_soon'.tr()),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('messages.close'.tr()),
          ),
        ],
      ),
    );
  }

  void _handleMenuSelection(String value) {
    switch (value) {
      case 'bookmark':
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => const SavedMessagesScreen(),
          ),
        );
        break;
      case 'settings':
        _openChannelSettings();
        break;
    }
  }
}