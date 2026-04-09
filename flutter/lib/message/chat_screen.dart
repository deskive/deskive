import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:easy_localization/easy_localization.dart';
import 'dart:io';
import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:flutter_sound/flutter_sound.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:video_player/video_player.dart';
import 'package:dio/dio.dart';
import 'package:gal/gal.dart';
import 'package:share_plus/share_plus.dart';
import 'package:cross_file/cross_file.dart';
import '../services/bookmark_service.dart';
import '../services/analytics_service.dart';
import 'saved_messages_screen.dart';
import '../projects/create_project_dialog.dart';
import 'widgets/message_selection_bar.dart';
import 'widgets/ai_actions_dropdown.dart';
import 'widgets/ai_action_result_dialog.dart';
import 'package:path_provider/path_provider.dart';
import '../services/ai_service.dart';
import '../videocalls/audio_call_screen.dart';
import '../notes/note_editor_screen.dart';
import '../videocalls/video_call_screen.dart';
import '../videocalls/video_call_join_screen.dart';
import '../videocalls/simple_video_call_screen.dart'; // NEW: Simple Teams-style UI
import 'channel_settings_screen.dart';
import '../api/services/chat_api_service.dart';
import '../api/services/workspace_api_service.dart';
import '../api/services/storage_api_service.dart';
import '../api/services/video_call_api_service.dart';
import '../utils/permissions_helper.dart';
import '../api/base_api_client.dart';
import '../services/workspace_service.dart';
import '../services/auth_service.dart';
import '../services/socket_io_chat_service.dart';
import '../services/navigation_service.dart';
import '../services/video_call_service.dart';
import '../services/message_cache_service.dart';
import '../services/crypto/message_encryption_helper.dart';
import '../services/crypto/key_exchange_service.dart';
import '../dao/workspace_dao.dart';
import '../widgets/member_profile_dialog.dart';
import '../widgets/poll_creator_dialog.dart';
import '../widgets/poll_message_widget.dart';
import '../widgets/gif_picker_dialog.dart';
import '../widgets/schedule_message_dialog.dart';
import '../widgets/scheduled_messages_panel.dart';
import 'package:giphy_get/giphy_get.dart';
import 'package:markdown_editor_plus/markdown_editor_plus.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:markdown/markdown.dart' as md;
import 'package:flutter_html/flutter_html.dart';
import 'package:flutter_quill/flutter_quill.dart' as quill;
import 'package:vsc_quill_delta_to_html/vsc_quill_delta_to_html.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme/app_theme.dart';
import '../config/api_config.dart';
import '../api/services/notes_api_service.dart' as notes_api;
import '../api/services/calendar_api_service.dart' as calendar_api;
import '../api/services/file_api_service.dart' as file_api;
import '../models/calendar_event.dart' as event_model;
import '../models/file/file.dart' as file_model;
import '../widgets/mention_suggestion_widget.dart';
import '../widgets/ai_button.dart';
import '../widgets/google_drive_file_picker.dart';
import '../notes/note.dart' as local_note;
import '../calendar/calendar_screen.dart';
import '../files/files_screen.dart';
import '../api/services/bot_api_service.dart';

enum MediaType { image, video, audio, document }

enum MessageDeliveryStatus {
  sending, // Message is being sent to server
  sent, // Message confirmed by server
  delivered, // Message delivered to recipient
  read, // Message read by recipient
  failed, // Message failed to send
}

class FileUtils {
  static String formatFileSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    if (bytes < 1024 * 1024 * 1024)
      return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
  }
}

class ChatScreen extends StatefulWidget {
  final String chatName;
  final String? chatSubtitle;
  final bool isChannel;
  final bool isPrivateChannel;
  final Color? avatarColor;
  final bool isAIChat;
  final String? channelId;
  final String? conversationId;
  final String? recipientId; // The other user's ID for direct messages
  final bool isBot; // Whether this is a chat with a bot

  const ChatScreen({
    super.key,
    required this.chatName,
    this.chatSubtitle,
    this.isChannel = false,
    this.isPrivateChannel = false,
    this.avatarColor,
    this.isAIChat = false,
    this.channelId,
    this.conversationId,
    this.recipientId,
    this.isBot = false,
  });

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> with WidgetsBindingObserver {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<ChatMessage> _messages = [];
  ChatMessage? _pinnedMessage;
  final BookmarkService _bookmarkService = BookmarkService();
  bool _isAITyping = false;
  bool _isAIMode = false;
  ChatMessage? _replyingToMessage;
  bool _isSearching = false;
  final TextEditingController _searchController = TextEditingController();
  List<int> _searchResultIndices = [];
  int _currentSearchIndex = -1;

  // API related
  final ChatApiService _chatApiService = ChatApiService();
  final WorkspaceApiService _workspaceApiService = WorkspaceApiService();
  bool _isLoadingMessages = false;
  String? _messagesError;

  // Mentions tracking
  List<String> _currentMentionedUserIds = [];
  List<Map<String, dynamic>> _currentLinkedContent = [];
  final GlobalKey<_MessageInputState> _messageInputKey =
      GlobalKey<_MessageInputState>();
  Map<String, WorkspaceMember> _membersMap = {};

  // Presence tracking for avatar and status
  final WorkspaceDao _workspaceDao = WorkspaceDao();
  MemberPresence? _recipientPresence;
  WorkspaceMember? _recipientMember;

  // Pagination
  static const int _messagesPerPage = 20;
  int _currentOffset = 0;
  bool _hasMoreMessages = true;
  bool _isLoadingMore = false;

  // Track current user's reactions: Set of "messageId:emoji" strings
  final Set<String> _userReactions = {};

  // Socket.IO for real-time messaging
  final SocketIOChatService _socketService = SocketIOChatService.instance;
  StreamSubscription<RealtimeMessage>? _messageSubscription;
  StreamSubscription<VideoCallEvent>? _videoCallSubscription;
  StreamSubscription<Map<String, dynamic>>? _memberLeftSubscription;
  StreamSubscription<Map<String, dynamic>>? _reactionSubscription;
  StreamSubscription<Map<String, dynamic>>? _readReceiptSubscription;
  StreamSubscription<Map<String, dynamic>>? _pinSubscription;
  StreamSubscription<Map<String, dynamic>>? _bookmarkSubscription;

  // Message caching for fast loading
  final MessageCacheService _cacheService = MessageCacheService.instance;

  // Keyboard tracking
  double _previousKeyboardHeight = 0;

  // Initial scroll tracking to prevent double scroll
  bool _initialScrollDone = false;

  // Sound players for message alerts
  final AudioPlayer _sendSoundPlayer = AudioPlayer();
  final AudioPlayer _receiveSoundPlayer = AudioPlayer();

  // Inline editing state (WhatsApp style)
  String? _editingMessageId;
  final TextEditingController _editController = TextEditingController();
  final FocusNode _editFocusNode = FocusNode();

  // Message selection mode state
  bool _selectionMode = false;
  Set<String> _selectedMessageIds = {};
  bool _aiActionProcessing = false;

  String _generateMessageId() {
    return DateTime.now().millisecondsSinceEpoch.toString();
  }

  Future<void> _deleteMessage(ChatMessage message) async {
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;

    if (workspaceId == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('messages.no_workspace_selected'.tr()),
            backgroundColor: Colors.red,
          ),
        );
      }
      return;
    }

    // Store the message and its index for potential rollback
    final messageIndex = _messages.indexWhere((msg) => msg.id == message.id);
    final deletedMessage = messageIndex != -1 ? _messages[messageIndex] : null;

    // Optimistically remove from UI
    setState(() {
      _messages.removeWhere((msg) => msg.id == message.id);
    });

    try {
      debugPrint('🗑️ Deleting message: ${message.id}');

      // Call the API
      final response = await ChatApiService().deleteMessage(
        workspaceId,
        message.id,
      );

      if (response.success) {
        debugPrint('✅ Message deleted successfully');
        // No confirmation message needed - like WhatsApp
      } else {
        throw Exception(response.message ?? 'Failed to delete message');
      }
    } catch (e) {
      debugPrint('❌ Error deleting message: $e');

      // Revert the optimistic delete on error
      if (deletedMessage != null && messageIndex != -1) {
        setState(() {
          _messages.insert(messageIndex, deletedMessage);
        });
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.error, color: Colors.white, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'messages.failed_delete_message'.tr(args: [e.toString()]),
                  ),
                ),
              ],
            ),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    }
  }

  Future<void> _editMessage(ChatMessage message, String newText) async {
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;

    if (workspaceId == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('messages.no_workspace_selected'.tr()),
            backgroundColor: Colors.red,
          ),
        );
      }
      return;
    }

    // Optimistically update the UI
    setState(() {
      final messageIndex = _messages.indexWhere((msg) => msg.id == message.id);
      if (messageIndex != -1) {
        _messages[messageIndex] = message.copyWith(
          text: newText,
          isEdited: true,
        );
      }
    });

    try {
      debugPrint(
        '📝 Updating message: ${message.id} with new text: "$newText"',
      );

      // Create update DTO
      final updateDto = UpdateMessageDto(
        content: newText,
        contentHtml: newText, // You can add HTML formatting if needed
      );

      // Call the API
      final response = await ChatApiService().updateMessage(
        workspaceId,
        message.id,
        updateDto,
      );

      if (response.success && response.data != null) {
        debugPrint('✅ Message updated successfully');

        // Update with the response from server
        setState(() {
          final messageIndex = _messages.indexWhere(
            (msg) => msg.id == message.id,
          );
          if (messageIndex != -1) {
            _messages[messageIndex] = message.copyWith(
              text: response.data!.content,
              isEdited: true,
            );
          }
        });

        // No confirmation message needed - like WhatsApp
      } else {
        throw Exception(response.message ?? 'Failed to update message');
      }
    } catch (e) {
      debugPrint('❌ Error updating message: $e');

      // Revert the optimistic update on error
      setState(() {
        final messageIndex = _messages.indexWhere(
          (msg) => msg.id == message.id,
        );
        if (messageIndex != -1) {
          _messages[messageIndex] = message; // Revert to original
        }
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.error, color: Colors.white, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'messages.failed_update_message'.tr(args: [e.toString()]),
                  ),
                ),
              ],
            ),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    }
  }

  // Start inline editing (WhatsApp style)
  void _startEditingMessage(ChatMessage message) {
    if (!message.isMe) return;

    setState(() {
      _editingMessageId = message.id;
      _editController.text = message.text;
    });

    // Focus the edit field after the widget rebuilds
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _editFocusNode.requestFocus();
      // Place cursor at the end
      _editController.selection = TextSelection.fromPosition(
        TextPosition(offset: _editController.text.length),
      );
    });
  }

  // Cancel editing
  void _cancelEditing() {
    setState(() {
      _editingMessageId = null;
      _editController.clear();
    });
    _editFocusNode.unfocus();
  }

  // Save edited message
  void _saveEditedMessage(ChatMessage message) {
    final newText = _editController.text.trim();

    if (newText.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('messages.message_empty'.tr())));
      return;
    }

    if (newText == message.text) {
      // No changes made
      _cancelEditing();
      return;
    }

    // Call the edit function
    _editMessage(message, newText);
    _cancelEditing();
  }

  @override
  void initState() {
    print('ChatScreen initState called');
    super.initState();
    AnalyticsService.instance.logScreenView(screenName: 'ChatScreen');

    // Add observer for keyboard events
    WidgetsBinding.instance.addObserver(this);

    // Notify NavigationService that user is on chat screen
    NavigationService().setOnChatScreen(
      conversationId: widget.conversationId,
      channelId: widget.channelId,
    );
    debugPrint(
      '💬 ChatScreen: Notified NavigationService - User is viewing ${widget.isChannel ? 'channel: ${widget.channelId}' : 'conversation: ${widget.conversationId}'}',
    );

    // Add scroll listener for pagination (load more when scrolling up)
    _scrollController.addListener(_onScroll);

    // Load messages from API if channel/conversation ID is provided
    if (widget.channelId != null || widget.conversationId != null) {
      _initializeRealTimeChat();
    } else {
      // Fall back to sample messages for demo/testing
      _loadSampleMessages();
    }

    _bookmarkService.addListener(_onBookmarkChanged);

    // Fetch recipient presence for direct messages (not channels)
    if (!widget.isChannel && widget.recipientId != null) {
      _fetchRecipientPresence();
    }
  }

  /// Fetch recipient's presence and member data for avatar and status
  Future<void> _fetchRecipientPresence() async {
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null || widget.recipientId == null) return;

    try {
      // Fetch presence and member data in parallel
      final results = await Future.wait([
        _workspaceDao.getMembersPresence(workspaceId),
        _workspaceApiService.getMembers(workspaceId),
      ]);

      final presenceList = results[0] as List<MemberPresence>;
      final membersResponse = results[1] as ApiResponse<List<WorkspaceMember>>;

      // Find recipient in presence list
      final recipientPresence = presenceList.firstWhere(
        (p) => p.userId == widget.recipientId,
        orElse:
            () => MemberPresence(
              userId: widget.recipientId!,
              name: widget.chatName,
              email: '',
              role: 'member',
              status: 'offline',
              connectionCount: 0,
              devices: {},
            ),
      );

      // Find recipient in members list
      WorkspaceMember? recipientMember;
      if (membersResponse.success && membersResponse.data != null) {
        recipientMember = membersResponse.data!.firstWhere(
          (m) => m.userId == widget.recipientId,
          orElse:
              () => WorkspaceMember(
                id: '',
                userId: widget.recipientId!,
                workspaceId: workspaceId,
                role: WorkspaceRole.member,
                permissions: [],
                email: '',
                name: widget.chatName,
                isActive: false,
                joinedAt: DateTime.now(),
              ),
        );
      }

      if (mounted) {
        setState(() {
          _recipientPresence = recipientPresence;
          _recipientMember = recipientMember;
        });
      }
    } catch (e) {
      debugPrint('Error fetching recipient presence: $e');
    }
  }

  /// Get status color for online/offline/away/busy
  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'online':
        return Colors.green;
      case 'away':
        return Colors.orange;
      case 'busy':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  /// Get recipient's avatar URL from presence or member data
  String? _getRecipientAvatarUrl() {
    // First try presence data (may have more up-to-date avatar)
    if (_recipientPresence?.avatar != null &&
        _recipientPresence!.avatar!.isNotEmpty) {
      return _recipientPresence!.avatar;
    }
    // Fallback to member data
    return _recipientMember?.avatar;
  }

  /// Show recipient profile dialog
  void _showRecipientProfile() {
    // Don't show profile for channels or AI chat
    if (widget.isChannel || widget.isAIChat) return;

    // Use MemberPresence if available
    if (_recipientPresence != null) {
      showMemberPresenceProfileDialog(
        context: context,
        member: _recipientPresence!,
        avatarUrl: _getRecipientAvatarUrl(),
      );
    }
    // Fallback to WorkspaceMember if available
    else if (_recipientMember != null) {
      showMemberProfileDialog(
        context: context,
        member: _recipientMember!,
        status: 'offline',
      );
    }
  }

  /// Get the current user's avatar URL
  String? _getCurrentUserAvatarUrl() {
    // First try to get from AuthService
    final authAvatar =
        AuthService.instance.currentUser?.avatarUrl ??
        AuthService.instance.currentUser?.avatar_url;
    if (authAvatar != null && authAvatar.isNotEmpty) {
      return authAvatar;
    }

    // Fallback: find avatar from existing messages where isMe is true
    for (final msg in _messages) {
      if (msg.isMe &&
          msg.senderAvatarUrl != null &&
          msg.senderAvatarUrl!.isNotEmpty) {
        return msg.senderAvatarUrl;
      }
    }

    return null;
  }

  /// Play message sent sound
  Future<void> _playMessageSentSound() async {
    try {
      await _sendSoundPlayer.stop();
      // Using a short "whoosh" sound URL - can be replaced with local asset
      await _sendSoundPlayer.play(
        UrlSource(
          'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3',
        ),
        volume: 0.5,
      );
    } catch (e) {
      print('⚠️ Could not play send sound: $e');
    }
  }

  /// Play message received sound
  Future<void> _playMessageReceivedSound() async {
    try {
      await _receiveSoundPlayer.stop();
      // Using a short notification sound URL - can be replaced with local asset
      await _receiveSoundPlayer.play(
        UrlSource(
          'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3',
        ),
        volume: 0.5,
      );
    } catch (e) {
      print('⚠️ Could not play receive sound: $e');
    }
  }

  @override
  void didChangeMetrics() {
    super.didChangeMetrics();

    // Get keyboard height
    final keyboardHeight = WidgetsBinding.instance.window.viewInsets.bottom;

    // Check if keyboard just appeared (height increased from 0)
    if (keyboardHeight > 0 && _previousKeyboardHeight == 0) {
      // Keyboard opened - scroll to bottom after a short delay to let layout settle
      Future.delayed(const Duration(milliseconds: 300), () {
        _scrollToBottom();
      });
    }

    _previousKeyboardHeight = keyboardHeight;
  }

  /// Initialize real-time chat with Socket.IO
  Future<void> _initializeRealTimeChat() async {
    print('🚀 Initializing real-time chat...');

    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    final currentUser = AuthService.instance.currentUser;

    if (workspaceId == null || currentUser == null) {
      print('❌ Cannot initialize socket: missing workspace or user');
      _fetchMessages(); // Fall back to regular API
      return;
    }

    try {
      // Initialize Socket.IO service if not already initialized
      if (!_socketService.isInitialized) {
        print('🔧 Initializing Socket.IO service...');
        await _socketService.initialize(
          workspaceId: workspaceId,
          userId: currentUser.id!,
          userName: currentUser.name,
        );
      }

      // Fetch initial messages
      await _fetchMessages();

      // Check socket connection status
      print('🔌 Socket connected: ${_socketService.isConnected}');

      if (!_socketService.isConnected) {
        print('⚠️ Socket not connected, waiting for connection...');
        // Wait a bit for connection to establish
        await Future.delayed(Duration(seconds: 2));
        print('🔌 Socket connected now: ${_socketService.isConnected}');
      }

      // Subscribe to channel or conversation
      if (widget.isChannel && widget.channelId != null) {
        print('🔔 Subscribing to channel: ${widget.channelId}');
        await _socketService.subscribeToChannelMessages(widget.channelId!);
        print('✅ Subscribed to channel messages');
        // Mark channel messages as read
        _markAsRead();
      } else if (widget.conversationId != null) {
        print('🔔 Subscribing to conversation: ${widget.conversationId}');
        await _socketService.subscribeToConversationMessages(
          widget.conversationId!,
        );
        print('✅ Subscribed to conversation messages');
        // Mark conversation messages as read
        _markAsRead();

        // Initialize conversation encryption (retrieve conversation key if available)
        print('🔐 Initializing conversation encryption...');
        await KeyExchangeService().initializeConversationEncryption(
          widget.conversationId!,
          workspaceId,
        );
      }

      // Listen for incoming real-time messages
      _messageSubscription = _socketService.messageStream.listen(
        (realtimeMessage) {
          print('📨 Received real-time message from Socket.IO:');
          print('   Message ID: ${realtimeMessage.id}');
          print('   Content: ${realtimeMessage.content}');
          print('   Sender: ${realtimeMessage.userId}');
          print('   Channel: ${realtimeMessage.channelId}');
          _handleIncomingRealtimeMessage(realtimeMessage);
        },
        onError: (error) {
          print('❌ Error in message stream: $error');
        },
        onDone: () {
          print('⚠️ Message stream closed');
        },
      );

      // Listen for incoming video calls (only for this chat)
      _videoCallSubscription = _socketService.videoCallStream.listen(
        (event) {
          print('📞 Received video call event: ${event.type}');
          print('   From user: ${event.fromUserId}');
          print('   Recipient ID: ${widget.recipientId}');
          print('   Current user ID: ${currentUser.id}');

          // Don't handle my own calls
          if (event.fromUserId == currentUser.id) {
            print('   ⚠️ Ignoring my own call event');
            return;
          }

          // Only handle incoming calls from the person I'm chatting with
          if (event.type == VideoCallEventType.incoming &&
              event.fromUserId == widget.recipientId) {
            _handleIncomingVideoCall(event);
          }
        },
        onError: (error) {
          print('❌ Error in video call stream: $error');
        },
      );

      // Listen for member:left events (when user leaves channel)
      _memberLeftSubscription = _socketService.memberLeftStream.listen(
        (data) {
          debugPrint('🔔 ChatScreen: Received member:left event: $data');

          final eventUserId = data['userId'];
          final eventChannelId = data['channelId'];
          final channelName = data['channelName'];

          debugPrint('   Current User ID: ${currentUser.id}');
          debugPrint('   Event User ID: $eventUserId');
          debugPrint('   Current Channel ID: ${widget.channelId}');
          debugPrint('   Event Channel ID: $eventChannelId');

          // If current user left this channel, close the chat screen
          if (eventUserId == currentUser.id &&
              widget.isChannel &&
              eventChannelId == widget.channelId) {
            debugPrint(
              '✅ Current user left this channel - closing chat screen',
            );

            // Clear cached messages for this channel
            final chatId = widget.channelId!;
            _cacheService.clearCache(chatId);
            debugPrint('🗑️ Cleared cached messages for channel: $chatId');

            // Navigate back to messages list
            if (mounted) {
              Navigator.of(context).pop();

              // Show feedback
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    'messages.left_channel'.tr(args: [channelName]),
                  ),
                  backgroundColor: Colors.orange,
                  duration: const Duration(seconds: 3),
                ),
              );
            }
          }
        },
        onError: (error) {
          debugPrint('❌ Error in member:left stream: $error');
        },
      );

      // Listen for reaction events (real-time reaction updates)
      _reactionSubscription = _socketService.reactionStream.listen(
        (data) {
          debugPrint('🔔 ChatScreen: Received reaction event: $data');

          final messageId = data['messageId'] as String?;
          final emoji = data['emoji'] as String?;
          final eventType = data['eventType'] as String?;
          final eventUserId = data['userId'] as String?;

          if (messageId == null || emoji == null || eventType == null) {
            debugPrint('⚠️ Missing reaction data fields');
            return;
          }

          // Skip our own events - we already did optimistic update
          final currentUserId = AuthService.instance.currentUser?.id;
          if (eventUserId == currentUserId) {
            debugPrint('⏭️ Skipping own reaction event');
            return;
          }

          // Find and update the message locally
          if (mounted) {
            setState(() {
              final messageIndex = _messages.indexWhere(
                (m) => m.id == messageId,
              );
              if (messageIndex != -1) {
                final message = _messages[messageIndex];
                final reactions = Map<String, int>.from(message.reactions);

                if (eventType == 'added') {
                  reactions[emoji] = (reactions[emoji] ?? 0) + 1;
                } else if (eventType == 'removed') {
                  final count = reactions[emoji] ?? 0;
                  if (count <= 1) {
                    reactions.remove(emoji);
                  } else {
                    reactions[emoji] = count - 1;
                  }
                }

                _messages[messageIndex] = message.copyWith(
                  reactions: reactions,
                );
                debugPrint(
                  '✅ Updated reactions for message $messageId: $reactions',
                );
              }
            });
          }
        },
        onError: (error) {
          debugPrint('❌ Error in reaction stream: $error');
        },
      );

      // Listen for read receipt events (real-time read count updates)
      _readReceiptSubscription = _socketService.readReceiptStream.listen(
        (data) {
          debugPrint('👁️ ChatScreen: Received read receipt event: $data');

          final messageIds = data['messageIds'] as List?;
          final readByUserId = data['userId'] as String?;

          if (messageIds == null || messageIds.isEmpty) {
            debugPrint('⚠️ Missing messageIds in read receipt data');
            return;
          }

          // Skip if the reader is ourselves
          final currentUserId = AuthService.instance.currentUser?.id;
          if (readByUserId == currentUserId) {
            debugPrint('⏭️ Skipping own read receipt event');
            return;
          }

          // Update read count for affected messages
          if (mounted) {
            setState(() {
              for (final msgId in messageIds) {
                final messageIndex = _messages.indexWhere(
                  (m) => m.id == msgId.toString(),
                );
                if (messageIndex != -1) {
                  final message = _messages[messageIndex];
                  // Only update read count for our own messages
                  if (message.isMe) {
                    _messages[messageIndex] = message.copyWith(
                      readByCount: message.readByCount + 1,
                    );
                    debugPrint(
                      '✅ Updated readByCount for message $msgId: ${message.readByCount + 1}',
                    );
                  }
                }
              }
            });
          }
        },
        onError: (error) {
          debugPrint('❌ Error in read receipt stream: $error');
        },
      );

      // Listen for pin events (real-time pin updates) - only for conversations
      if (!widget.isChannel && widget.conversationId != null) {
        _pinSubscription = _socketService.pinStream.listen(
          (data) {
            debugPrint('📌 ChatScreen: Received pin event: $data');

            final messageId = data['messageId'] as String?;
            final pinned = data['pinned'] as bool? ?? false;
            final conversationId = data['conversationId'] as String?;

            // Only handle events for this conversation
            if (conversationId != null &&
                conversationId != widget.conversationId) {
              debugPrint('⏭️ Pin event for different conversation, ignoring');
              return;
            }

            if (mounted) {
              setState(() {
                if (pinned && messageId != null) {
                  // Find the message in the list and set as pinned
                  final messageIndex = _messages.indexWhere(
                    (m) => m.id == messageId,
                  );
                  if (messageIndex != -1) {
                    // Update the message's isPinned status
                    _messages[messageIndex] = _messages[messageIndex].copyWith(
                      isPinned: true,
                    );
                    _pinnedMessage = _messages[messageIndex];
                    debugPrint('✅ Message pinned: $messageId');
                  } else {
                    // Message not in current loaded messages (pagination)
                    // Just update the pinned message bar - the message will show correctly when loaded
                    debugPrint(
                      '⚠️ Pinned message not in current list: $messageId',
                    );
                  }

                  // Also clear isPinned from previously pinned message
                  for (int i = 0; i < _messages.length; i++) {
                    if (_messages[i].id != messageId && _messages[i].isPinned) {
                      _messages[i] = _messages[i].copyWith(isPinned: false);
                    }
                  }
                } else {
                  // Unpin: clear isPinned from the unpinned message
                  if (messageId != null) {
                    final messageIndex = _messages.indexWhere(
                      (m) => m.id == messageId,
                    );
                    if (messageIndex != -1) {
                      _messages[messageIndex] = _messages[messageIndex]
                          .copyWith(isPinned: false);
                    }
                  }
                  _pinnedMessage = null;
                  debugPrint('✅ Message unpinned');
                }
              });
            }
          },
          onError: (error) {
            debugPrint('❌ Error in pin stream: $error');
          },
        );
        // Note: Pinned message is now loaded from messages list in _fetchMessages
      }

      // Subscribe to bookmark events
      _bookmarkSubscription = _socketService.bookmarkStream.listen(
        (data) {
          debugPrint('🔖 ChatScreen: Received bookmark event: $data');

          final messageId = data['messageId'] as String?;
          final isBookmarked = data['isBookmarked'] as bool? ?? false;

          if (messageId != null && mounted) {
            setState(() {
              final messageIndex = _messages.indexWhere(
                (m) => m.id == messageId,
              );
              if (messageIndex != -1) {
                _messages[messageIndex] = _messages[messageIndex].copyWith(
                  isBookmarked: isBookmarked,
                );
                debugPrint(
                  '✅ Message bookmark updated: $messageId -> $isBookmarked',
                );
              }
            });
          }
        },
        onError: (error) {
          debugPrint('❌ Error in bookmark stream: $error');
        },
      );

      print('✅ Real-time chat initialized successfully');
      print('   Workspace: $workspaceId');
      print('   User: ${currentUser.id}');
      print('   Channel: ${widget.channelId}');
      print('   Conversation: ${widget.conversationId}');
    } catch (e, stackTrace) {
      print('❌ Error initializing real-time chat: $e');
      print('Stack trace: $stackTrace');
    }
  }

  /// Handle incoming real-time message
  void _handleIncomingRealtimeMessage(RealtimeMessage realtimeMessage) async {
    final currentUserId = AuthService.instance.currentUser?.id;
    final isMe = realtimeMessage.userId == currentUserId;

    print('📨 _handleIncomingRealtimeMessage called');
    print('   Message ID: ${realtimeMessage.id}');
    print('   Content: ${realtimeMessage.content}');
    print('   Is Encrypted: ${realtimeMessage.isEncrypted}');
    print('   Sender: ${realtimeMessage.userId}');

    // Decrypt message if encrypted
    String displayContent = realtimeMessage.content;
    if (realtimeMessage.isEncrypted == true && realtimeMessage.encryptedContent != null) {
      try {
        print('🔓 Decrypting realtime message...');
        final decrypted = await MessageEncryptionHelper.decryptMessageIfNeeded({
          'encrypted_content': realtimeMessage.encryptedContent,
          'encryption_metadata': realtimeMessage.encryptionMetadata,
          'is_encrypted': true,
        });
        displayContent = decrypted['content'] ?? '[Decryption failed]';
        print('✅ Decrypted: $displayContent');
        // Content already updated above
      } catch (e) {
        print('❌ Decrypt failed: $e');

        // Try to retrieve conversation key and decrypt again
        if (widget.conversationId != null) {
          print('🔑 Attempting to retrieve conversation key...');
          final retrieved = await KeyExchangeService().retrieveConversationKey(
            widget.conversationId!,
          );

          if (retrieved) {
            try {
              print('🔓 Retrying decryption with retrieved key...');
              final decrypted = await MessageEncryptionHelper.decryptMessageIfNeeded({
                'encrypted_content': realtimeMessage.encryptedContent,
                'encryption_metadata': realtimeMessage.encryptionMetadata,
                'is_encrypted': true,
              });
              displayContent = decrypted['content'] ?? '[Decryption failed]';
              print('✅ Decrypted with retrieved key: $displayContent');
            } catch (retryError) {
              print('❌ Retry decrypt failed: $retryError');
              displayContent = '[Encrypted message]';
            }
          } else {
            displayContent = '[Encrypted message - key not available]';
          }
        } else {
          displayContent = '[Encrypted message]';
        }
      }
    }

    print('   Final Content: $displayContent');
    print('   Current Channel: ${widget.channelId}');
    print('   Current Conversation: ${widget.conversationId}');
    print('   Current user: $currentUserId');
    print('   Is from me: $isMe');
    print('   Existing messages count: ${_messages.length}');

    print('🔍 Checking if message belongs to current chat...');

    // FILTER: Only process messages for this chat (like frontend does)
    // Check if message belongs to current channel or conversation
    bool belongsToCurrentChat = false;

    if (widget.isChannel) {
      // For channels, match by channelId
      if (realtimeMessage.channelId == widget.channelId) {
        belongsToCurrentChat = true;
      }
      // Also accept if channelId is null but message was sent in this chat context
      // (some backends don't include channelId in the event)
      if (realtimeMessage.channelId == null && realtimeMessage.conversationId == null) {
        print('   ℹ️ Message has no channel/conversation ID - allowing through');
        belongsToCurrentChat = true;
      }
    } else {
      // For direct messages, match by conversationId
      if (realtimeMessage.conversationId == widget.conversationId) {
        belongsToCurrentChat = true;
      }
      // Also accept if conversationId is null but message is from/to the recipient
      // (some backends don't include conversationId in the event)
      if (realtimeMessage.conversationId == null && realtimeMessage.channelId == null) {
        // Check if the message involves the current recipient
        if (realtimeMessage.userId == widget.recipientId || isMe) {
          print('   ℹ️ Message has no conversation ID but matches recipient - allowing through');
          belongsToCurrentChat = true;
        }
      }
    }

    if (!belongsToCurrentChat) {
      print('⏭️ Message is for different chat - ignoring');
      print('   Message channel: ${realtimeMessage.channelId}, conversation: ${realtimeMessage.conversationId}');
      print('   Current channel: ${widget.channelId}, conversation: ${widget.conversationId}');
      return;
    }
    print('✅ Message belongs to this chat - processing');

    // DUPLICATE CHECK 1: Check by exact message ID
    print('🔍 DUPLICATE CHECK 1: Checking by ID...');
    print('   Looking for ID: ${realtimeMessage.id}');
    print('   Existing message IDs: ${_messages.map((m) => m.id).take(5).join(", ")}...');

    final existingMessageIndex = _messages.indexWhere(
      (msg) => msg.id == realtimeMessage.id,
    );

    print('   Found at index: $existingMessageIndex');

    if (existingMessageIndex != -1) {
      print('⚠️ Message already exists: ${realtimeMessage.id}');

      // Handle message deletion
      if (realtimeMessage.isDeleted) {
        print('🗑️ Message was deleted - removing from list');
        setState(() {
          _messages.removeAt(existingMessageIndex);
        });
        return;
      }

      // Handle message edit
      if (realtimeMessage.isEdited) {
        print('✏️ Message was edited - updating content');
        setState(() {
          _messages[existingMessageIndex] = _messages[existingMessageIndex]
              .copyWith(
                text: realtimeMessage.content,
                deliveryStatus: MessageDeliveryStatus.delivered,
              );
        });
        return;
      }

      // Regular duplicate - update delivery status and content (in case it was decrypted)
      print('📬 Updating delivery status and content');
      setState(() {
        _messages[existingMessageIndex] = _messages[existingMessageIndex].copyWith(
          text: displayContent, // Update content in case it was just decrypted
          deliveryStatus: MessageDeliveryStatus.delivered,
        );
      });
      return;
    }

    // DUPLICATE CHECK 2: For our own messages, check by content + recent timestamp
    // This handles race condition where Socket.IO arrives before API updates the ID
    if (isMe) {
      print('🔍 DUPLICATE CHECK 2: This is our own message');
      print('   Checking for optimistic message by content: ${displayContent.substring(0, displayContent.length < 30 ? displayContent.length : 30)}');
      final recentTimeThreshold = DateTime.now().subtract(
        const Duration(seconds: 30),
      );

      // Find MOST RECENT message with matching content that hasn't been delivered yet
      // Search in REVERSE order to get the latest message first
      int matchingMessageIndex = -1;
      for (int i = _messages.length - 1; i >= 0; i--) {
        final msg = _messages[i];
        // For encrypted messages, compare with displayContent instead of realtimeMessage.content
        final contentToMatch = displayContent; // Use decrypted content
        if (msg.isMe &&
            msg.text == contentToMatch &&
            msg.timestamp.isAfter(recentTimeThreshold) &&
            msg.deliveryStatus != MessageDeliveryStatus.delivered) {
          // Not already delivered
          matchingMessageIndex = i;
          print('   📍 Found matching message at index $i: ${msg.text.substring(0, msg.text.length < 30 ? msg.text.length : 30)}');
          break; // Found the most recent undelivered message
        }
      }

      print('   Match index: $matchingMessageIndex');

      if (matchingMessageIndex != -1) {
        print(
          '⚠️ DUPLICATE by content! Found matching optimistic message at index $matchingMessageIndex, updating it',
        );
        // Found optimistic message - update it with server ID and delivered status
        setState(() {
          _messages[matchingMessageIndex] = _messages[matchingMessageIndex]
              .copyWith(
                id: realtimeMessage.id, // Update with server ID
                deliveryStatus: MessageDeliveryStatus.delivered,
              );
        });
        return; // Don't add as new message
      }

      print('   ⚠️ No matching optimistic message found - will add as new');
    }

    // Check if this is a deleted or edited message event - don't add them as new messages
    if (realtimeMessage.isDeleted) {
      print(
        '🗑️ Received delete event for message not in list - ignoring (already deleted optimistically)',
      );
      return;
    }

    if (realtimeMessage.isEdited) {
      print(
        '✏️ Received edit event for message not in list - ignoring (message doesn\'t exist)',
      );
      return;
    }

    // Message is not in list yet - add it (works for messages from others or our messages from another device)
    print('✅ New message from Socket.IO, adding to list');

    final member = _membersMap[realtimeMessage.userId];
    final senderName = member?.name ?? member?.email ?? 'Unknown User';
    final senderAvatar = member?.avatar;

    // Extract attachment info if available
    String? mediaUrl;
    MediaType? mediaType;
    List<MessageAttachment>? attachments;

    if (realtimeMessage.attachments != null &&
        realtimeMessage.attachments!.isNotEmpty) {
      // Parse all attachments
      attachments = [];
      for (var attachment in realtimeMessage.attachments!) {
        if (attachment is Map<String, dynamic>) {
          try {
            attachments.add(MessageAttachment.fromJson(attachment));
          } catch (e) {
            print('⚠️ Error parsing attachment: $e');
          }
        }
      }

      // For backward compatibility, also set mediaUrl and mediaType from first attachment
      final firstAttachment = realtimeMessage.attachments!.first;
      if (firstAttachment is Map<String, dynamic>) {
        mediaUrl = firstAttachment['url'];
        final mimeType = firstAttachment['mimeType'] as String?;

        // Determine media type from MIME type
        if (mimeType != null) {
          if (mimeType.startsWith('image/')) {
            mediaType = MediaType.image;
          } else if (mimeType.startsWith('video/')) {
            mediaType = MediaType.video;
          } else if (mimeType.startsWith('audio/')) {
            mediaType = MediaType.audio;
          } else {
            mediaType = MediaType.document;
          }
        }
      }
    }

    // Look up parent message for replies
    ChatMessage? replyToMessage;
    final parentId = realtimeMessage.parentId;
    if (parentId != null) {
      replyToMessage = _messages.firstWhere(
        (m) => m.id == parentId,
        orElse:
            () => ChatMessage(
              id: parentId,
              text: '[Message not found]',
              isMe: false,
              timestamp: DateTime.now(),
            ),
      );
      // Only use actual found message, not placeholder
      if (replyToMessage.text == '[Message not found]') {
        replyToMessage = null;
      }
    }

    final newMessage = ChatMessage(
      id: realtimeMessage.id,
      text: displayContent, // Use decrypted content!
      isMe: isMe,
      timestamp: realtimeMessage.createdAt,
      senderName: senderName,
      senderAvatarUrl: senderAvatar,
      isAI: false,
      mediaUrl: mediaUrl,
      mediaType: mediaType,
      attachments: attachments,
      deliveryStatus:
          MessageDeliveryStatus.delivered, // Message received from server
      linkedContent: realtimeMessage.linkedContent,
      replyToMessageId: parentId,
      replyToMessage: replyToMessage,
    );

    setState(() {
      _messages.add(newMessage);
    });

    // ⚡ Cache the new message (WhatsApp strategy)
    final chatId =
        widget.isChannel ? widget.channelId! : widget.conversationId!;
    _cacheService.addMessageToCache(chatId, newMessage);

    print('✅ Message added! New count: ${_messages.length}');

    // Scroll to bottom to show new message
    _scrollToBottom();

    // Play notification sound for messages from others
    if (!isMe) {
      print('🔔 New message from $senderName: $displayContent');
      _playMessageReceivedSound();
    }
  }

  /// Handle incoming video call (only for this specific chat)
  void _handleIncomingVideoCall(VideoCallEvent event) {
    print('📞 Handling incoming video call in chat');
    print('   Call ID: ${event.callId}');
    print('   From: ${event.fromUserName}');

    if (!mounted) return;

    // Show incoming call dialog directly in this chat
    showDialog(
      context: context,
      barrierDismissible: false,
      builder:
          (context) => AlertDialog(
            title: Text('${event.fromUserName ?? 'Someone'} is calling...'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  event.isVideoCall ? Icons.videocam : Icons.call,
                  size: 64,
                  color: Colors.blue,
                ),
                const SizedBox(height: 16),
                Text(
                  event.isVideoCall
                      ? 'messages.incoming_video_call'.tr()
                      : 'messages.incoming_voice_call'.tr(),
                  style: const TextStyle(fontSize: 18),
                ),
              ],
            ),
            actions: [
              TextButton.icon(
                onPressed: () async {
                  Navigator.pop(context); // Close dialog
                  // Reject the call
                  await _socketService.rejectVideoCall(event.callId);
                },
                icon: const Icon(Icons.call_end, color: Colors.red),
                label: Text('messages.decline'.tr()),
              ),
              ElevatedButton.icon(
                onPressed: () async {
                  Navigator.pop(context); // Close dialog
                  // Accept and navigate to video call screen
                  await _socketService.acceptVideoCall(event.callId);

                  if (mounted) {
                    // Navigate to simple video call screen (Teams-style UI) for incoming call
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder:
                            (context) => SimpleVideoCallScreen(
                              participantName:
                                  event.fromUserName ?? 'messages.unknown'.tr(),
                              isVideoCall: true,
                              participants:
                                  event.fromUserId != null
                                      ? [event.fromUserId!]
                                      : [],
                            ),
                      ),
                    );
                  }
                },
                icon: const Icon(Icons.videocam),
                label: Text('messages.accept'.tr()),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green,
                  foregroundColor: Colors.white,
                ),
              ),
            ],
          ),
    );
  }

  /// Initiate video call with LiveKit
  Future<void> _initiateVideoCall() async {
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('No workspace selected')));
      return;
    }

    // 1. Request permissions FIRST (before loading)
    final hasPermissions =
        await PermissionsHelper.requestVideoCallPermissions();
    if (!hasPermissions) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('messages.camera_mic_required'.tr()),
            action: SnackBarAction(
              label: 'messages.settings'.tr(),
              onPressed: () => PermissionsHelper.openSettings(),
            ),
          ),
        );
      }
      return;
    }

    // Show connecting dialog
    if (!mounted) return;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder:
          (context) => AlertDialog(
            backgroundColor: Theme.of(context).colorScheme.surface,
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircularProgressIndicator(
                  valueColor: AlwaysStoppedAnimation<Color>(
                    Theme.of(context).colorScheme.primary,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'messages.starting_video_call'.tr(),
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurface,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'messages.connecting_to'.tr(args: [widget.chatName]),
                  style: TextStyle(
                    color: Theme.of(
                      context,
                    ).colorScheme.onSurface.withOpacity(0.7),
                    fontSize: 14,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
    );

    try {
      // Get participant IDs for direct calls
      List<String>? participantIds;
      if (!widget.isChannel && widget.recipientId != null) {
        participantIds = [widget.recipientId!];
      }

      // Create call via backend API using VideoCallService
      final videoCall = await VideoCallService.instance.createCall(
        workspaceId: workspaceId,
        title: 'messages.video_call_with'.tr(args: [widget.chatName]),
        callType: 'video',
        isGroupCall: widget.isChannel,
        participantIds: participantIds,
      );

      // Close loading dialog
      if (mounted) Navigator.pop(context);

      // Navigate to VideoCallScreen with callId
      if (mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder:
                (context) => VideoCallScreen(
                  callId: videoCall.id,
                  channelName: videoCall.title,
                  isIncoming: false,
                ),
          ),
        );
      }
    } catch (e) {
      // Close loading dialog
      if (mounted) Navigator.pop(context);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'messages.failed_start_video_call'.tr(args: [e.toString()]),
            ),
          ),
        );
      }
    }
  }

  /// Initiate audio call with LiveKit
  Future<void> _initiateAudioCall() async {
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('messages.no_workspace_selected'.tr())),
      );
      return;
    }

    // 1. Request microphone permission FIRST
    final hasPermission = await PermissionsHelper.requestMicrophonePermission();
    if (!hasPermission) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('messages.mic_required'.tr()),
            action: SnackBarAction(
              label: 'messages.settings'.tr(),
              onPressed: () => PermissionsHelper.openSettings(),
            ),
          ),
        );
      }
      return;
    }

    // Show connecting dialog
    if (!mounted) return;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder:
          (context) => AlertDialog(
            backgroundColor: Theme.of(context).colorScheme.surface,
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircularProgressIndicator(
                  valueColor: AlwaysStoppedAnimation<Color>(
                    Theme.of(context).colorScheme.primary,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'messages.starting_audio_call'.tr(),
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurface,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'messages.connecting_to'.tr(args: [widget.chatName]),
                  style: TextStyle(
                    color: Theme.of(
                      context,
                    ).colorScheme.onSurface.withOpacity(0.7),
                    fontSize: 14,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
    );

    try {
      // Get participant IDs for direct calls
      List<String>? participantIds;
      if (!widget.isChannel && widget.recipientId != null) {
        participantIds = [widget.recipientId!];
      }

      // Create call via backend API using VideoCallService
      final videoCall = await VideoCallService.instance.createCall(
        workspaceId: workspaceId,
        title: 'messages.audio_call_with'.tr(args: [widget.chatName]),
        callType: 'audio',
        isGroupCall: widget.isChannel,
        participantIds: participantIds,
      );

      // Close loading dialog
      if (mounted) Navigator.pop(context);

      // Navigate to VideoCallScreen with audio-only mode
      if (mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder:
                (context) => VideoCallScreen(
                  callId: videoCall.id,
                  channelName: videoCall.title,
                  isIncoming: false,
                  isAudioOnly: true,
                ),
          ),
        );
      }
    } catch (e) {
      // Close loading dialog
      if (mounted) Navigator.pop(context);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'messages.failed_start_audio_call'.tr(args: [e.toString()]),
            ),
          ),
        );
      }
    }
  }

  /// Fetch messages from API
  /// Scroll listener to detect when user scrolls to top (load more messages)
  void _onScroll() {
    if (_scrollController.position.pixels <= 100 && // Near top
        !_isLoadingMore &&
        _hasMoreMessages) {
      _loadMoreMessages();
    }
  }

  /// Load more (older) messages when scrolling up
  Future<void> _loadMoreMessages() async {
    if (_isLoadingMore || !_hasMoreMessages) return;

    print('📜 Loading more messages... Current offset: $_currentOffset');

    setState(() {
      _isLoadingMore = true;
    });

    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) {
      setState(() {
        _isLoadingMore = false;
      });
      return;
    }

    try {
      // Fetch older messages with pagination
      ApiResponse<List<Message>> messagesResponse;

      if (widget.isChannel && widget.channelId != null) {
        messagesResponse = await _chatApiService.getChannelMessages(
          workspaceId,
          widget.channelId!,
          limit: _messagesPerPage,
          offset: _currentOffset + _messagesPerPage, // Next page
        );
      } else if (widget.conversationId != null) {
        messagesResponse = await _chatApiService.getConversationMessages(
          workspaceId,
          widget.conversationId!,
          limit: _messagesPerPage,
          offset: _currentOffset + _messagesPerPage, // Next page
        );
      } else {
        setState(() {
          _isLoadingMore = false;
        });
        return;
      }

      if (messagesResponse.success && messagesResponse.data != null) {
        final apiMessages = messagesResponse.data!;

        if (apiMessages.isEmpty) {
          // No more messages
          setState(() {
            _hasMoreMessages = false;
            _isLoadingMore = false;
          });
          print('📭 No more messages to load');
          return;
        }

        final currentUserId = AuthService.instance.currentUser?.id;

        // Convert API messages to ChatMessage format
        final chatMessages =
            apiMessages.map((msg) {
              final member = _membersMap[msg.userId];
              final senderName =
                  msg.senderName ??
                  member?.name ??
                  member?.email ??
                  'Unknown User';
              final senderAvatar = msg.senderAvatar ?? member?.avatar;
              final isMe = msg.userId == currentUserId;

              // Parse reactions from API and track user's own reactions
              Map<String, int> reactionsMap = {};
              if (msg.reactions.isNotEmpty) {
                msg.reactions.forEach((emoji, value) {
                  if (value is int) {
                    reactionsMap[emoji] = value;
                  } else if (value is Map) {
                    reactionsMap[emoji] = value['count'] ?? 1;
                    // Track if current user has reacted with this emoji
                    final memberIds = value['memberIds'] as List?;
                    if (memberIds != null &&
                        currentUserId != null &&
                        memberIds.contains(currentUserId)) {
                      _userReactions.add('${msg.id}:$emoji');
                    }
                  }
                });
              }

              return ChatMessage(
                id: msg.id,
                text: msg.contentHtml ?? msg.content,
                isMe: isMe,
                timestamp: msg.createdAt,
                senderName: senderName,
                senderAvatarUrl: senderAvatar,
                isAI: false,
                deliveryStatus: MessageDeliveryStatus.delivered,
                linkedContent: msg.linkedContent,
                replyToMessageId:
                    msg.parentId, // Store parent message ID for replies
                reactions: reactionsMap, // Include reactions from API
                readByCount: msg.readByCount, // Include read receipt count
                isPinned: msg.isPinned,
                isBookmarked: msg.isBookmarked,
              );
            }).toList();

        // Sort by timestamp (oldest first)
        chatMessages.sort((a, b) => a.timestamp.compareTo(b.timestamp));

        // Populate replyToMessage by looking up parent messages (including existing messages)
        final allMessages = [...chatMessages, ..._messages];
        final messagesById = {for (var m in allMessages) m.id: m};
        for (int i = 0; i < chatMessages.length; i++) {
          final msg = chatMessages[i];
          if (msg.replyToMessageId != null &&
              messagesById.containsKey(msg.replyToMessageId)) {
            chatMessages[i] = msg.copyWith(
              replyToMessage: messagesById[msg.replyToMessageId],
            );
          }
        }

        setState(() {
          // Insert older messages at the beginning
          _messages.insertAll(0, chatMessages);
          _currentOffset += _messagesPerPage;
          _isLoadingMore = false;
        });

        print(
          '✅ Loaded ${chatMessages.length} more messages. Total: ${_messages.length}',
        );
      } else {
        setState(() {
          _isLoadingMore = false;
          _hasMoreMessages = false;
        });
      }
    } catch (e) {
      print('❌ Error loading more messages: $e');
      setState(() {
        _isLoadingMore = false;
      });
    }
  }

  /// Mark messages as read when entering a chat
  /// This creates read receipts and triggers the messages:read WebSocket event
  Future<void> _markAsRead() async {
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) return;

    try {
      if (widget.isChannel && widget.channelId != null) {
        print('👁️ Marking channel ${widget.channelId} as read');
        await _chatApiService.markChannelAsRead(workspaceId, widget.channelId!);
        print('✅ Channel marked as read');
      } else if (widget.conversationId != null) {
        print('👁️ Marking conversation ${widget.conversationId} as read');
        await _chatApiService.markConversationAsRead(
          workspaceId,
          widget.conversationId!,
        );
        print('✅ Conversation marked as read');
      }
    } catch (e) {
      print('⚠️ Error marking as read: $e');
      // Don't show error to user - this is a background operation
    }
  }

  /// Pin or unpin a message
  Future<void> _pinMessage(BuildContext context, ChatMessage message) async {
    // Pin is only available for conversations, not channels
    if (widget.isChannel) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('messages.pin_dm_only'.tr()),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null || widget.conversationId == null) return;

    final isCurrentlyPinned = _pinnedMessage?.id == message.id;
    final previousPinnedMessage = _pinnedMessage;

    try {
      if (isCurrentlyPinned) {
        // Unpin the message
        print('📌 Unpinning message ${message.id}');

        // Optimistic update - update both _pinnedMessage and the message in _messages list
        setState(() {
          _pinnedMessage = null;
          // Update the message's isPinned status in the list
          final messageIndex = _messages.indexWhere((m) => m.id == message.id);
          if (messageIndex != -1) {
            _messages[messageIndex] = _messages[messageIndex].copyWith(
              isPinned: false,
            );
          }
        });

        final response = await _chatApiService.unpinMessage(
          workspaceId,
          widget.conversationId!,
          message.id,
        );

        if (response.success) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Row(
                  children: [
                    const Icon(
                      Icons.push_pin_outlined,
                      color: Colors.white,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Text('messages.message_unpinned'.tr()),
                  ],
                ),
              ),
            );
          }
        } else {
          // Revert on failure
          setState(() {
            _pinnedMessage = previousPinnedMessage;
            final messageIndex = _messages.indexWhere(
              (m) => m.id == message.id,
            );
            if (messageIndex != -1) {
              _messages[messageIndex] = _messages[messageIndex].copyWith(
                isPinned: true,
              );
            }
          });
          throw Exception(response.message);
        }
      } else {
        // Pin the message
        print('📌 Pinning message ${message.id}');

        // Optimistic update - update both _pinnedMessage and the message in _messages list
        setState(() {
          // First, unpin any currently pinned message
          if (_pinnedMessage != null) {
            final prevPinnedIndex = _messages.indexWhere(
              (m) => m.id == _pinnedMessage!.id,
            );
            if (prevPinnedIndex != -1) {
              _messages[prevPinnedIndex] = _messages[prevPinnedIndex].copyWith(
                isPinned: false,
              );
            }
          }
          // Now pin the new message
          _pinnedMessage = message.copyWith(isPinned: true);
          final messageIndex = _messages.indexWhere((m) => m.id == message.id);
          if (messageIndex != -1) {
            _messages[messageIndex] = _messages[messageIndex].copyWith(
              isPinned: true,
            );
          }
        });

        final response = await _chatApiService.pinMessage(
          workspaceId,
          widget.conversationId!,
          message.id,
        );

        if (response.success) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Row(
                  children: [
                    const Icon(Icons.push_pin, color: Colors.white, size: 20),
                    const SizedBox(width: 8),
                    Text('messages.message_pinned'.tr()),
                  ],
                ),
              ),
            );
          }
        } else {
          // Revert on failure
          setState(() {
            _pinnedMessage = previousPinnedMessage;
            // Revert the current message
            final messageIndex = _messages.indexWhere(
              (m) => m.id == message.id,
            );
            if (messageIndex != -1) {
              _messages[messageIndex] = _messages[messageIndex].copyWith(
                isPinned: false,
              );
            }
            // Restore the previous pinned message
            if (previousPinnedMessage != null) {
              final prevPinnedIndex = _messages.indexWhere(
                (m) => m.id == previousPinnedMessage.id,
              );
              if (prevPinnedIndex != -1) {
                _messages[prevPinnedIndex] = _messages[prevPinnedIndex]
                    .copyWith(isPinned: true);
              }
            }
          });
          throw Exception(response.message);
        }
      }
    } catch (e) {
      print('❌ Error pinning/unpinning message: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Failed to ${isCurrentlyPinned ? 'unpin' : 'pin'} message',
            ),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _fetchMessages() async {
    print('📞 _fetchMessages called (with pagination - 20 messages per page)');
    print('   Channel ID: ${widget.channelId}');
    print('   Conversation ID: ${widget.conversationId}');

    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;

    if (workspaceId == null) {
      print('❌ No workspace selected');
      setState(() {
        _messagesError = 'No workspace selected';
      });
      return;
    }

    // Get chat ID for caching
    final chatId =
        widget.isChannel ? widget.channelId! : widget.conversationId!;

    // ⚡ STEP 1: Load cached messages INSTANTLY (WhatsApp strategy)
    final cachedMessages = _cacheService.getCachedMessages(chatId);
    if (cachedMessages != null && cachedMessages.isNotEmpty) {
      print('⚡ Loading ${cachedMessages.length} cached messages INSTANTLY');
      setState(() {
        _messages.clear();
        _messages.addAll(cachedMessages);
        _isLoadingMessages = false; // Show cached data immediately
      });

      // Scroll to bottom with cached data - instant jump, no animation
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scrollController.hasClients && mounted && !_initialScrollDone) {
          final maxScroll = _scrollController.position.maxScrollExtent;
          _scrollController.jumpTo(maxScroll);
          _initialScrollDone = true;
        }
      });
    } else {
      setState(() {
        _isLoadingMessages = true;
        _messagesError = null;
      });
    }

    try {
      // ⚡ STEP 2: Fetch workspace members (parallel with message fetch if cached)
      print('🌐 Fetching workspace members...');
      final membersResponse = await _workspaceApiService.getMembers(
        workspaceId,
      );

      if (membersResponse.success && membersResponse.data != null) {
        _membersMap = {
          for (var member in membersResponse.data!) member.userId: member,
        };
        print('✅ Loaded ${_membersMap.length} members');
      }

      // ⚡ STEP 3: Fetch NEW messages from API (incremental sync like WhatsApp)
      ApiResponse<List<Message>> messagesResponse;

      if (widget.isChannel && widget.channelId != null) {
        print(
          '🌐 Fetching channel messages: /workspaces/$workspaceId/channels/${widget.channelId}/messages',
        );
        messagesResponse = await _chatApiService.getChannelMessages(
          workspaceId,
          widget.channelId!,
          limit: _messagesPerPage, // Load 20 messages initially
          offset: 0,
        );
      } else if (widget.conversationId != null) {
        print(
          '🌐 Fetching conversation messages: /workspaces/$workspaceId/conversations/${widget.conversationId}/messages',
        );
        messagesResponse = await _chatApiService.getConversationMessages(
          workspaceId,
          widget.conversationId!,
          limit: _messagesPerPage, // Load 20 messages initially
          offset: 0,
        );
      } else {
        print('❌ No valid channel or conversation ID');
        setState(() {
          _messagesError = 'Invalid chat configuration';
          _isLoadingMessages = false;
        });
        return;
      }

      print(
        '📡 API Response - Success: ${messagesResponse.success}, Data: ${messagesResponse.data?.length ?? 0} messages',
      );

      if (messagesResponse.success && messagesResponse.data != null) {
        final apiMessages = messagesResponse.data!;
        final currentUserId = AuthService.instance.currentUser?.id;

        // Convert API messages to ChatMessage format
        final chatMessages =
            apiMessages.map((msg) {
              final member = _membersMap[msg.userId];
              final senderName =
                  msg.senderName ??
                  member?.name ??
                  member?.email ??
                  'Unknown User';
              final senderAvatar = msg.senderAvatar ?? member?.avatar;
              final isMe = msg.userId == currentUserId;

              // Extract attachment info if available
              String? mediaUrl;
              MediaType? mediaType;
              List<MessageAttachment>? attachments;

              if (msg.attachments.isNotEmpty) {
                // Parse all attachments
                attachments = [];
                for (var attachment in msg.attachments) {
                  if (attachment is Map<String, dynamic>) {
                    try {
                      attachments.add(MessageAttachment.fromJson(attachment));
                    } catch (e) {
                      print('⚠️ Error parsing attachment from API: $e');
                    }
                  }
                }

                // For backward compatibility, also set mediaUrl and mediaType from first attachment
                final firstAttachment = msg.attachments.first;
                if (firstAttachment is Map<String, dynamic>) {
                  mediaUrl = firstAttachment['url'];
                  final mimeType = firstAttachment['mimeType'] as String?;

                  // Determine media type from MIME type
                  if (mimeType != null) {
                    if (mimeType.startsWith('image/')) {
                      mediaType = MediaType.image;
                    } else if (mimeType.startsWith('video/')) {
                      mediaType = MediaType.video;
                    } else if (mimeType.startsWith('audio/')) {
                      mediaType = MediaType.audio;
                    } else {
                      mediaType = MediaType.document;
                    }
                  }
                }
              }

              // Debug: Log if message has parentId (is a reply)
              if (msg.parentId != null) {
                print(
                  '📩 Message "${msg.content.substring(0, msg.content.length > 30 ? 30 : msg.content.length)}..." has parentId: ${msg.parentId}',
                );
              }

              // Parse reactions from API and track user's own reactions
              Map<String, int> reactionsMap = {};
              if (msg.reactions.isNotEmpty) {
                msg.reactions.forEach((emoji, value) {
                  if (value is int) {
                    reactionsMap[emoji] = value;
                  } else if (value is Map) {
                    reactionsMap[emoji] = value['count'] ?? 1;
                    // Track if current user has reacted with this emoji
                    final memberIds = value['memberIds'] as List?;
                    if (memberIds != null &&
                        currentUserId != null &&
                        memberIds.contains(currentUserId)) {
                      _userReactions.add('${msg.id}:$emoji');
                    }
                  }
                });
              }

              return ChatMessage(
                id: msg.id,
                text: msg.contentHtml ?? msg.content,
                isMe: isMe,
                timestamp: msg.createdAt,
                senderName: senderName,
                senderAvatarUrl: senderAvatar,
                isAI: false,
                mediaUrl: mediaUrl,
                mediaType: mediaType,
                attachments: attachments,
                deliveryStatus:
                    MessageDeliveryStatus
                        .delivered, // Historical messages are delivered
                linkedContent: msg.linkedContent,
                replyToMessageId:
                    msg.parentId, // Store parent message ID for replies
                reactions: reactionsMap, // Include reactions from API
                readByCount: msg.readByCount, // Include read receipt count
                isPinned: msg.isPinned, // Include pin status from API
                isBookmarked:
                    msg.isBookmarked, // Include bookmark status from API
              );
            }).toList();

        // Sort messages by timestamp (oldest first)
        chatMessages.sort((a, b) => a.timestamp.compareTo(b.timestamp));

        // Populate replyToMessage by looking up parent messages
        final messagesById = {for (var m in chatMessages) m.id: m};
        int repliesFound = 0;
        for (int i = 0; i < chatMessages.length; i++) {
          final msg = chatMessages[i];
          if (msg.replyToMessageId != null) {
            if (messagesById.containsKey(msg.replyToMessageId)) {
              chatMessages[i] = msg.copyWith(
                replyToMessage: messagesById[msg.replyToMessageId],
              );
              repliesFound++;
              print(
                '✅ Found parent message for reply: ${msg.replyToMessageId}',
              );
            } else {
              print('⚠️ Parent message NOT found: ${msg.replyToMessageId}');
            }
          }
        }
        if (repliesFound > 0) {
          print('📬 Total replies with parent messages found: $repliesFound');
        }

        // ⚡ STEP 4: Update cache with fresh data (for next time)
        await _cacheService.cacheMessages(chatId, chatMessages);
        print(
          '💾 Cached ${chatMessages.length} messages for future instant loading',
        );

        // Find pinned message from the loaded messages (for conversations only)
        ChatMessage? pinnedMessage;
        if (!widget.isChannel) {
          for (final msg in chatMessages) {
            if (msg.isPinned) {
              pinnedMessage = msg;
              print('📌 Found pinned message from API: ${msg.id}');
              break;
            }
          }
        }

        setState(() {
          _messages.clear();
          _messages.addAll(chatMessages);
          _isLoadingMessages = false;
          // Update pagination state
          _currentOffset = _messagesPerPage;
          _hasMoreMessages =
              chatMessages.length ==
              _messagesPerPage; // If we got full page, there might be more
          // Set pinned message from loaded messages
          if (pinnedMessage != null) {
            _pinnedMessage = pinnedMessage;
          }
        });

        print('✅ Messages loaded successfully: ${_messages.length} messages');
        print(
          '📊 Pagination state: offset=$_currentOffset, hasMore=$_hasMoreMessages',
        );

        // Scroll to bottom only if initial scroll hasn't been done yet
        if (!_initialScrollDone) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (_scrollController.hasClients && mounted) {
              final maxScroll = _scrollController.position.maxScrollExtent;
              _scrollController.jumpTo(maxScroll);
              _initialScrollDone = true;
            }
          });
        }
      } else {
        final errorMsg = messagesResponse.message ?? 'Failed to load messages';
        print('❌ Failed to load messages: $errorMsg');

        // Check if error is due to access denied (not a member)
        final isAccessDenied =
            errorMsg.toLowerCase().contains('not a member') ||
            errorMsg.toLowerCase().contains('access denied') ||
            errorMsg.toLowerCase().contains('forbidden') ||
            messagesResponse.statusCode == 403;

        if (isAccessDenied) {
          print(
            '🚫 Access denied - clearing cached messages and navigating back',
          );

          // Clear cached messages
          _cacheService.clearCache(chatId);

          setState(() {
            _messages.clear(); // Clear messages from UI
            _messagesError =
                'You are not a member of this channel. Please join the channel to view messages.';
            _isLoadingMessages = false;
          });

          // Navigate back after a short delay
          Future.delayed(const Duration(seconds: 2), () {
            if (mounted) {
              Navigator.of(context).pop();
            }
          });
        } else {
          // Regular error - keep cached messages
          setState(() {
            _messagesError = errorMsg;
            _isLoadingMessages = false;
          });
        }
      }
    } catch (e, stackTrace) {
      print('❌ Error loading messages: $e');
      print('Stack trace: $stackTrace');

      // Check if error is due to access denied
      final errorString = e.toString().toLowerCase();
      final isAccessDenied =
          errorString.contains('not a member') ||
          errorString.contains('access denied') ||
          errorString.contains('forbidden');

      if (isAccessDenied) {
        print('🚫 Access denied (exception) - clearing cached messages');

        // Clear cached messages
        _cacheService.clearCache(chatId);

        setState(() {
          _messages.clear(); // Clear messages from UI
          _messagesError = 'You are not a member of this channel.';
          _isLoadingMessages = false;
        });

        // Navigate back after a short delay
        Future.delayed(const Duration(seconds: 2), () {
          if (mounted) {
            Navigator.of(context).pop();
          }
        });
      } else {
        setState(() {
          _messagesError = 'Error loading messages: $e';
          _isLoadingMessages = false;
        });
      }
    }
  }

  void _onBookmarkChanged() {
    if (mounted) {
      setState(() {});
    }
  }

  void _loadSampleMessages() {
    if (widget.isAIChat) {
      _messages.addAll([
        ChatMessage(
          id: "ai_1",
          text: "Hello! I'm your AI assistant. How can I help you today?",
          isMe: false,
          timestamp: DateTime.now().subtract(const Duration(minutes: 1)),
          senderName: "AI Assistant",
          isAI: true,
        ),
      ]);
    } else {
      _messages.addAll([
        ChatMessage(
          id: "msg_1",
          text: "Hey! How's the project going?",
          isMe: false,
          timestamp: DateTime.now().subtract(const Duration(hours: 2)),
          senderName: widget.isChannel ? "John" : null,
          reactions: {"👍": 2, "❤️": 1},
        ),
        ChatMessage(
          id: "msg_2",
          text: "It's going well! Just finished the UI design.",
          isMe: true,
          timestamp: DateTime.now().subtract(
            const Duration(hours: 1, minutes: 45),
          ),
          reactions: {"🎉": 3, "👏": 1},
        ),
        ChatMessage(
          id: "msg_3",
          text: "That's great! Can you share the mockups?",
          isMe: false,
          timestamp: DateTime.now().subtract(
            const Duration(hours: 1, minutes: 30),
          ),
          senderName: widget.isChannel ? "John" : null,
        ),
        ChatMessage(
          id: "msg_4",
          text: "Sure! Let me upload them to the shared drive.",
          isMe: true,
          timestamp: DateTime.now().subtract(
            const Duration(hours: 1, minutes: 15),
          ),
        ),
        ChatMessage(
          id: "msg_5",
          text: "Perfect! I'll review them and give feedback.",
          isMe: false,
          timestamp: DateTime.now().subtract(const Duration(minutes: 30)),
          senderName: widget.isChannel ? "John" : null,
        ),
        ChatMessage(
          id: "msg_6",
          text: "Thanks! Let me know if you need any changes.",
          isMe: true,
          timestamp: DateTime.now().subtract(const Duration(minutes: 15)),
        ),
        // Sample image message
        ChatMessage(
          id: "msg_7",
          text: "Check out this design mockup",
          isMe: true,
          timestamp: DateTime.now().subtract(const Duration(minutes: 10)),
          mediaType: MediaType.image,
          mediaUrl:
              "https://via.placeholder.com/400x300/4CAF50/FFFFFF?text=Design+Mockup",
        ),
        // Sample PDF message
        ChatMessage(
          id: "msg_8",
          text: "Project_Documentation.pdf",
          isMe: false,
          timestamp: DateTime.now().subtract(const Duration(minutes: 8)),
          senderName: widget.isChannel ? "Sarah" : null,
          mediaType: MediaType.document,
          mediaUrl: "https://example.com/doc.pdf",
        ),
        // Sample audio message
        ChatMessage(
          id: "msg_9",
          text: "",
          isMe: true,
          timestamp: DateTime.now().subtract(const Duration(minutes: 5)),
          mediaType: MediaType.audio,
          mediaUrl: "https://example.com/audio.mp3",
        ),
        // Sample video message with test URL
        ChatMessage(
          id: "msg_10",
          text: "Demo video",
          isMe: false,
          timestamp: DateTime.now().subtract(const Duration(minutes: 3)),
          senderName: widget.isChannel ? "Mike" : null,
          mediaType: MediaType.video,
          mediaUrl:
              "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4",
        ),
      ]);
    }

    // Scroll to bottom after loading sample messages
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Future.delayed(const Duration(milliseconds: 100), () {
        if (_scrollController.hasClients) {
          _scrollController.jumpTo(_scrollController.position.maxScrollExtent);
        }
      });
    });
  }

  Future<void> _sendMediaMessage(
    String path,
    MediaType type,
    String? description,
  ) async {
    print('📤 Sending media message...');
    print('   Path: $path');
    print('   Type: $type');
    print('   Description: $description');

    // Play send sound
    _playMessageSentSound();

    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;

    if (workspaceId == null ||
        (widget.channelId == null && widget.conversationId == null)) {
      print(
        '❌ Cannot send media: missing workspace or channel/conversation ID',
      );
      _showErrorSnackbar('Unable to send media');
      return;
    }

    try {
      // Create optimistic message - show immediately in UI (like WhatsApp)
      final optimisticMessageId =
          'temp_${DateTime.now().millisecondsSinceEpoch}';
      final optimisticMessage = ChatMessage(
        id: optimisticMessageId,
        text: description ?? 'messages.sent_file'.tr(),
        isMe: true,
        timestamp: DateTime.now(),
        senderName: 'messages.you'.tr(),
        senderAvatarUrl: _getCurrentUserAvatarUrl(),
        imagePath:
            type == MediaType.image
                ? path
                : null, // Show local image immediately
        mediaType: type,
        mediaUrl: null, // Will be updated after upload
        deliveryStatus: MessageDeliveryStatus.sending, // Shows as "sending"
      );

      // Add optimistic message to UI immediately (at the end, since reverse: false)
      setState(() {
        _messages.add(optimisticMessage); // Add at end of list (bottom of chat)
      });

      // Scroll to bottom to show new message
      _scrollToBottom();

      // Upload file in background
      final file = File(path);
      final fileBytes = await file.readAsBytes();
      final fileName = path.split('/').last;

      // Determine MIME type
      String? mimeType;
      if (type == MediaType.image) {
        mimeType = 'image/${fileName.split('.').last}';
      } else if (type == MediaType.video) {
        mimeType = 'video/${fileName.split('.').last}';
      } else if (type == MediaType.audio) {
        mimeType = 'audio/${fileName.split('.').last}';
      } else {
        mimeType = 'application/octet-stream';
      }

      print('🌐 Uploading file to storage...');
      final storageApiService = StorageApiService();
      final uploadResponse = await storageApiService.uploadFile(
        workspaceId: workspaceId,
        fileName: fileName,
        fileBytes: fileBytes,
        mimeType: mimeType,
        description: description,
      );

      if (!uploadResponse.isSuccess || uploadResponse.data == null) {
        throw Exception(uploadResponse.message ?? 'File upload failed');
      }

      final uploadedFile = uploadResponse.data!;
      print('✅ File uploaded successfully: ${uploadedFile.id}');

      // Create attachment DTO object
      final attachment = AttachmentDto(
        id: uploadedFile.id,
        url: uploadedFile.url,
        fileName: uploadedFile.name,
        fileSize: uploadedFile.size.toString(),
        mimeType: uploadedFile.mimeType,
      );

      // Send message with attachment
      final messageContent = description ?? 'Sent a file';
      final dto = SendMessageDto(
        content: messageContent,
        attachments: [attachment],
        parentId: _replyingToMessage?.id,
      );

      print('📤 Sending message with attachment...');
      ApiResponse<Message> response;

      if (widget.isChannel && widget.channelId != null) {
        response = await _chatApiService.sendChannelMessage(
          workspaceId,
          widget.channelId!,
          dto,
        );
      } else if (widget.conversationId != null) {
        response = await _chatApiService.sendConversationMessage(
          workspaceId,
          widget.conversationId!,
          dto,
        );
      } else {
        throw Exception('No valid channel or conversation ID');
      }

      if (response.success && response.data != null) {
        print('✅ Message with attachment sent successfully');
        final apiMessage = response.data!;

        // Update optimistic message with server data
        setState(() {
          final index = _messages.indexWhere(
            (msg) => msg.id == optimisticMessageId,
          );
          if (index != -1) {
            _messages[index] = _messages[index].copyWith(
              id: apiMessage.id, // Update to real server ID
              mediaUrl: uploadedFile.url, // Update with server URL
              imagePath: null, // Clear local path, use server URL now
              deliveryStatus: MessageDeliveryStatus.sent, // Mark as sent
            );
          }
          _replyingToMessage = null;
        });

        print('✅ Media message updated with server data');
      } else {
        // Mark message as failed
        setState(() {
          final index = _messages.indexWhere(
            (msg) => msg.id == optimisticMessageId,
          );
          if (index != -1) {
            _messages[index] = _messages[index].copyWith(
              deliveryStatus: MessageDeliveryStatus.failed,
            );
          }
        });
        throw Exception(response.message ?? 'Failed to send message');
      }
    } catch (e, stackTrace) {
      print('❌ Error sending media message: $e');
      print('Stack trace: $stackTrace');

      // Mark message as failed
      setState(() {
        final index = _messages.indexWhere((msg) => msg.id.startsWith('temp_'));
        if (index != -1) {
          _messages[index] = _messages[index].copyWith(
            deliveryStatus: MessageDeliveryStatus.failed,
          );
        }
      });

      _showErrorSnackbar('Failed to send file: $e');
    }
  }

  /// Send media message from bytes (for web platform)
  Future<void> _sendMediaMessageFromBytes(
    Uint8List fileBytes,
    String fileName,
    String mimeType,
    MediaType type,
    String? description,
  ) async {
    print('📤 Sending media message from bytes (web)...');
    print('   FileName: $fileName');
    print('   MimeType: $mimeType');
    print('   Type: $type');
    print('   Bytes: ${fileBytes.length}');
    print('   Description: $description');

    // Play send sound
    _playMessageSentSound();

    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;

    if (workspaceId == null ||
        (widget.channelId == null && widget.conversationId == null)) {
      print(
        '❌ Cannot send media: missing workspace or channel/conversation ID',
      );
      _showErrorSnackbar('Unable to send media');
      return;
    }

    try {
      // Create optimistic message
      final optimisticMessageId =
          'temp_${DateTime.now().millisecondsSinceEpoch}';
      final optimisticMessage = ChatMessage(
        id: optimisticMessageId,
        text: description ?? 'messages.sent_file'.tr(),
        isMe: true,
        timestamp: DateTime.now(),
        senderName: 'messages.you'.tr(),
        senderAvatarUrl: _getCurrentUserAvatarUrl(),
        imagePath: null,
        mediaType: type,
        mediaUrl: null,
        deliveryStatus: MessageDeliveryStatus.sending,
      );

      setState(() {
        _messages.add(optimisticMessage);
      });

      _scrollToBottom();

      print('🌐 Uploading file to storage...');
      final storageApiService = StorageApiService();
      final uploadResponse = await storageApiService.uploadFile(
        workspaceId: workspaceId,
        fileName: fileName,
        fileBytes: fileBytes,
        mimeType: mimeType,
        description: description,
      );

      if (!uploadResponse.isSuccess || uploadResponse.data == null) {
        throw Exception(uploadResponse.message ?? 'File upload failed');
      }

      final uploadedFile = uploadResponse.data!;
      print('✅ File uploaded successfully: ${uploadedFile.id}');

      // Create attachment DTO
      final attachment = AttachmentDto(
        id: uploadedFile.id,
        url: uploadedFile.url,
        fileName: uploadedFile.name,
        fileSize: uploadedFile.size.toString(),
        mimeType: uploadedFile.mimeType,
      );

      // Send message with attachment
      final messageContent = description ?? 'Sent a file';
      final dto = SendMessageDto(
        content: messageContent,
        attachments: [attachment],
        parentId: _replyingToMessage?.id,
      );

      print('📤 Sending message with attachment...');
      ApiResponse<Message> response;

      if (widget.isChannel && widget.channelId != null) {
        response = await _chatApiService.sendChannelMessage(
          workspaceId,
          widget.channelId!,
          dto,
        );
      } else if (widget.conversationId != null) {
        response = await _chatApiService.sendConversationMessage(
          workspaceId,
          widget.conversationId!,
          dto,
        );
      } else {
        throw Exception('No valid channel or conversation ID');
      }

      if (response.success && response.data != null) {
        print('✅ Message with attachment sent successfully');
        final apiMessage = response.data!;

        setState(() {
          final index = _messages.indexWhere(
            (msg) => msg.id == optimisticMessageId,
          );
          if (index != -1) {
            _messages[index] = _messages[index].copyWith(
              id: apiMessage.id,
              mediaUrl: uploadedFile.url,
              imagePath: null,
              deliveryStatus: MessageDeliveryStatus.sent,
            );
          }
          _replyingToMessage = null;
        });

        print('✅ Media message updated with server data');
      } else {
        setState(() {
          final index = _messages.indexWhere(
            (msg) => msg.id == optimisticMessageId,
          );
          if (index != -1) {
            _messages[index] = _messages[index].copyWith(
              deliveryStatus: MessageDeliveryStatus.failed,
            );
          }
        });
        throw Exception(response.message ?? 'Failed to send message');
      }
    } catch (e, stackTrace) {
      print('❌ Error sending media message from bytes: $e');
      print('Stack trace: $stackTrace');

      setState(() {
        final index = _messages.indexWhere((msg) => msg.id.startsWith('temp_'));
        if (index != -1) {
          _messages[index] = _messages[index].copyWith(
            deliveryStatus: MessageDeliveryStatus.failed,
          );
        }
      });

      _showErrorSnackbar('Failed to send file: $e');
    }
  }

  void _sendMessage() async {
    // Get content from the Quill editor via MessageInput
    final hasText = _messageInputKey.currentState?.hasContent() ?? false;
    final hasLinkedContent = _currentLinkedContent.isNotEmpty;

    // Allow sending if there's text OR linked content
    if (!hasText && !hasLinkedContent) return;

    // Get HTML content from Quill editor
    final messageHtml = _messageInputKey.currentState?.getHtmlContent() ?? '';
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;

    // Play send sound
    _playMessageSentSound();

    // If we have a channel/conversation ID, send via API
    if ((widget.channelId != null || widget.conversationId != null) &&
        workspaceId != null) {
      await _sendMessageViaAPI(messageHtml, workspaceId);
    } else {
      // Fall back to local state for demo/AI mode
      _sendMessageLocal(messageHtml);
    }
  }

  /// Send message via API
  Future<void> _sendMessageViaAPI(
    String messageText,
    String workspaceId,
  ) async {
    print('📤 Sending message via API...');
    print('   Content: $messageText');
    print('   Content length: ${messageText.length}');
    print('   Contains @[: ${messageText.contains('@[')}');
    print('   Channel ID: ${widget.channelId}');
    print('   Conversation ID: ${widget.conversationId}');

    // Use tracked mentioned user IDs
    final mentionedUserIds = List<String>.from(_currentMentionedUserIds);
    print('   Mentioned user IDs: $mentionedUserIds');

    // Use tracked linked content
    final linkedContent = List<Map<String, dynamic>>.from(
      _currentLinkedContent,
    );
    print('   Linked content: $linkedContent');

    // Create optimistic message - show immediately in UI (like WhatsApp)
    final optimisticMessageId = 'temp_${DateTime.now().millisecondsSinceEpoch}';
    final currentUserAvatar = _getCurrentUserAvatarUrl();
    final optimisticMessage = ChatMessage(
      id: optimisticMessageId,
      text: messageText,
      isMe: true,
      timestamp: DateTime.now(),
      senderName: 'messages.you'.tr(),
      senderAvatarUrl: currentUserAvatar,
      replyToMessage: _replyingToMessage,
      deliveryStatus: MessageDeliveryStatus.sending, // Shows as "sending"
      linkedContent: linkedContent.isNotEmpty ? linkedContent : null,
    );

    // Add optimistic message to UI immediately (at the end, since reverse: false)
    setState(() {
      _messages.add(optimisticMessage); // Add at end of list (bottom of chat)
    });

    // Scroll to bottom to show new message
    _scrollToBottom();

    // Encrypt message
    final encrypted = await MessageEncryptionHelper.encryptMessageForSending(
      conversationId: widget.channelId ?? widget.conversationId ?? '',
      content: messageText,
      contentHtml: messageText,
    );

    // Create DTO with encryption fields
    final dto = SendMessageDto(
      content: encrypted['content'] ?? messageText,
      contentHtml: encrypted['content_html'],
      parentId: _replyingToMessage?.id,
      mentions: mentionedUserIds.isNotEmpty ? mentionedUserIds : null,
      linkedContent: linkedContent.isNotEmpty ? linkedContent : null,
      // E2EE fields
      encryptedContent: encrypted['encrypted_content'],
      encryptionMetadata: encrypted['encryption_metadata'],
      isEncrypted: encrypted['is_encrypted'],
    );

    // Clear input immediately for better UX
    _messageInputKey.currentState?.clearContent();
    setState(() {
      _replyingToMessage = null;
      _currentMentionedUserIds = []; // Clear mentions after sending
      _currentLinkedContent = []; // Clear linked content after sending
    });
    // Clear attached content in MessageInput widget
    _messageInputKey.currentState?.clearAttachedContent();

    try {
      ApiResponse<Message> response;

      if (widget.isChannel && widget.channelId != null) {
        print(
          '🌐 Sending to channel: /workspaces/$workspaceId/channels/${widget.channelId}/messages',
        );
        response = await _chatApiService.sendChannelMessage(
          workspaceId,
          widget.channelId!,
          dto,
        );
      } else if (widget.conversationId != null) {
        print(
          '🌐 Sending to conversation: /workspaces/$workspaceId/conversations/${widget.conversationId}/messages',
        );
        response = await _chatApiService.sendConversationMessage(
          workspaceId,
          widget.conversationId!,
          dto,
        );
      } else {
        print('❌ No valid channel or conversation ID');
        _showErrorSnackbar('Unable to send message');
        return;
      }

      print('📡 API Response - Success: ${response.success}');

      if (response.success && response.data != null) {
        final apiMessage = response.data!;
        print('✅ Message sent successfully: ${apiMessage.id}');

        // Update optimistic message with server ID and "sent" status
        setState(() {
          final index = _messages.indexWhere(
            (msg) => msg.id == optimisticMessageId,
          );
          if (index != -1) {
            _messages[index] = _messages[index].copyWith(
              id: apiMessage.id, // Update to real server ID
              deliveryStatus: MessageDeliveryStatus.sent, // Mark as sent
            );
          }
        });

        print('✅ Message updated with server ID: ${apiMessage.id}');

        // Share conversation key with participants (for encrypted messages)
        if (encrypted['is_encrypted'] == true &&
            !widget.isChannel &&
            widget.conversationId != null &&
            widget.recipientId != null) {
          print('🔑 Sharing conversation key with recipient...');
          KeyExchangeService().shareConversationKey(
            widget.conversationId!,
            [widget.recipientId!],
          ).catchError((error) {
            print('⚠️ Failed to share conversation key: $error');
            // Non-fatal, message was already sent
          });
        }
      } else {
        print('❌ Failed to send message: ${response.message}');

        // Mark message as failed
        setState(() {
          final index = _messages.indexWhere(
            (msg) => msg.id == optimisticMessageId,
          );
          if (index != -1) {
            _messages[index] = _messages[index].copyWith(
              deliveryStatus: MessageDeliveryStatus.failed,
            );
          }
        });

        _showErrorSnackbar(response.message ?? 'Failed to send message');
      }
    } catch (e, stackTrace) {
      print('❌ Error sending message: $e');
      print('Stack trace: $stackTrace');

      // Mark message as failed
      setState(() {
        final index = _messages.indexWhere(
          (msg) => msg.id == optimisticMessageId,
        );
        if (index != -1) {
          _messages[index] = _messages[index].copyWith(
            deliveryStatus: MessageDeliveryStatus.failed,
          );
        }
      });

      _showErrorSnackbar('Error sending message: $e');
    }
  }

  /// Send message locally (for demo/AI mode)
  void _sendMessageLocal(String messageText) {
    setState(() {
      _messages.add(
        ChatMessage(
          id: _generateMessageId(),
          text: messageText,
          isMe: true,
          timestamp: DateTime.now(),
          senderAvatarUrl: _getCurrentUserAvatarUrl(),
          replyToMessage: _replyingToMessage,
          replyToMessageId:
              _replyingToMessage != null
                  ? '${_replyingToMessage!.timestamp.millisecondsSinceEpoch}_${_replyingToMessage!.text.hashCode}'
                  : null,
        ),
      );
      _replyingToMessage = null;
    });

    _messageInputKey.currentState?.clearContent();
    _scrollToBottom();

    // Handle AI chat
    if (widget.isAIChat || _isAIMode) {
      setState(() {
        _isAITyping = true;
      });

      AIService.sendMessageMock(messageText)
          .then((aiResponse) {
            setState(() {
              _isAITyping = false;
              _messages.add(
                ChatMessage(
                  id: _generateMessageId(),
                  text: aiResponse,
                  isMe: false,
                  timestamp: DateTime.now(),
                  senderName: "AI Assistant",
                  isAI: true,
                ),
              );
            });
            _scrollToBottom();
          })
          .catchError((e) {
            setState(() {
              _isAITyping = false;
              _messages.add(
                ChatMessage(
                  id: _generateMessageId(),
                  text:
                      "Sorry, I'm having trouble responding right now. Please try again.",
                  isMe: false,
                  timestamp: DateTime.now(),
                  senderName: "AI Assistant",
                  isAI: true,
                ),
              );
            });
            _scrollToBottom();
          });
    }
  }

  /// Send a GIF message
  Future<void> _sendGifMessage(String gifUrl, String title) async {
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    final conversationId = widget.conversationId;
    final channelId = widget.channelId;

    if (workspaceId == null || (conversationId == null && channelId == null)) {
      _showErrorSnackbar('gif.send_failed'.tr());
      return;
    }

    try {
      // Create HTML content with the GIF image
      final htmlContent =
          '<img src="$gifUrl" alt="$title" class="chat-gif" loading="lazy" />';

      // Send the message with GIF
      if (conversationId != null) {
        await _chatApiService.sendConversationMessage(
          workspaceId,
          conversationId,
          SendMessageDto(
            content: 'GIF', // Plain text fallback
            contentHtml: htmlContent,
          ),
        );
      } else if (channelId != null) {
        await _chatApiService.sendChannelMessage(
          workspaceId,
          channelId,
          SendMessageDto(
            content: 'GIF', // Plain text fallback
            contentHtml: htmlContent,
          ),
        );
      }

      debugPrint('🎞️ [GIF] Sent GIF message: $gifUrl');
    } catch (e) {
      debugPrint('🎞️ [GIF] Failed to send GIF: $e');
      _showErrorSnackbar('gif.send_failed'.tr());
    }
  }

  /// Show error snackbar
  void _showErrorSnackbar(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: Colors.red,
          duration: const Duration(seconds: 3),
        ),
      );
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

  void _dismissKeyboard() {
    FocusScope.of(context).unfocus();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: true,
      onPopInvokedWithResult: (didPop, result) {
        _dismissKeyboard();
      },
      child: Scaffold(
        resizeToAvoidBottomInset: true, // Ensure keyboard pushes content up
        appBar: AppBar(
        title:
            _isSearching
                ? TextField(
                  controller: _searchController,
                  autofocus: true,
                  style: TextStyle(
                    color:
                        Theme.of(context).appBarTheme.foregroundColor ??
                        Theme.of(context).colorScheme.onSurface,
                  ),
                  decoration: InputDecoration(
                    hintText: 'messages.search_messages'.tr(),
                    hintStyle: TextStyle(
                      color: (Theme.of(context).appBarTheme.foregroundColor ??
                              Theme.of(context).colorScheme.onSurface)
                          .withValues(alpha: 0.7),
                    ),
                    border: InputBorder.none,
                    suffixIcon: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (_searchResultIndices.isNotEmpty)
                          Text(
                            '${_currentSearchIndex + 1}/${_searchResultIndices.length}',
                            style: TextStyle(
                              color: (Theme.of(
                                        context,
                                      ).appBarTheme.foregroundColor ??
                                      Theme.of(context).colorScheme.onSurface)
                                  .withValues(alpha: 0.7),
                              fontSize: 14,
                            ),
                          ),
                        IconButton(
                          icon: Icon(
                            Icons.keyboard_arrow_up,
                            color:
                                Theme.of(
                                  context,
                                ).appBarTheme.iconTheme?.color ??
                                Theme.of(context).iconTheme.color,
                          ),
                          onPressed:
                              _searchResultIndices.isNotEmpty
                                  ? _goToPreviousSearchResult
                                  : null,
                        ),
                        IconButton(
                          icon: Icon(
                            Icons.keyboard_arrow_down,
                            color:
                                Theme.of(
                                  context,
                                ).appBarTheme.iconTheme?.color ??
                                Theme.of(context).iconTheme.color,
                          ),
                          onPressed:
                              _searchResultIndices.isNotEmpty
                                  ? _goToNextSearchResult
                                  : null,
                        ),
                      ],
                    ),
                  ),
                  onChanged: _performSearch,
                )
                : InkWell(
                  onTap: () => _showRecipientProfile(),
                  borderRadius: BorderRadius.circular(8),
                  child: Row(
                    children: [
                      // Avatar with status indicator
                      Stack(
                        children: [
                          CircleAvatar(
                            radius: 20,
                            backgroundColor:
                                widget.avatarColor ??
                                (widget.isAIChat ? Colors.purple : Colors.blue),
                            backgroundImage:
                                !widget.isChannel &&
                                        !widget.isAIChat &&
                                        _getRecipientAvatarUrl() != null
                                    ? NetworkImage(_getRecipientAvatarUrl()!)
                                    : null,
                            child:
                                widget.isAIChat
                                    ? const Icon(
                                      Icons.smart_toy,
                                      color: Colors.white,
                                      size: 18,
                                    )
                                    : widget.isChannel
                                    ? Icon(
                                      widget.isPrivateChannel
                                          ? Icons.lock_outline
                                          : Icons.tag_outlined,
                                      color: Colors.white,
                                      size: 18,
                                    )
                                    : (_getRecipientAvatarUrl() == null)
                                    ? Text(
                                      widget.chatName.isNotEmpty
                                          ? widget.chatName
                                              .substring(0, 1)
                                              .toUpperCase()
                                          : '?',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    )
                                    : null,
                          ),
                          // Status indicator (only for direct messages)
                          if (!widget.isChannel && !widget.isAIChat)
                            Positioned(
                              right: 0,
                              bottom: 0,
                              child: Container(
                                width: 12,
                                height: 12,
                                decoration: BoxDecoration(
                                  color: _getStatusColor(
                                    _recipientPresence?.status ?? 'offline',
                                  ),
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color:
                                        Theme.of(
                                          context,
                                        ).appBarTheme.backgroundColor ??
                                        Theme.of(context).colorScheme.surface,
                                    width: 2,
                                  ),
                                ),
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
                              widget.chatName,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            if (!widget.isChannel && !widget.isAIChat)
                              Text(
                                _recipientPresence?.status.toLowerCase() ==
                                        'online'
                                    ? 'messages.online'.tr()
                                    : widget.chatSubtitle ??
                                        'messages.offline'.tr(),
                                style: Theme.of(
                                  context,
                                ).textTheme.bodySmall?.copyWith(
                                  color:
                                      _recipientPresence?.status
                                                  .toLowerCase() ==
                                              'online'
                                          ? Colors.green
                                          : Theme.of(
                                            context,
                                          ).colorScheme.onSurfaceVariant,
                                ),
                              )
                            else if (widget.chatSubtitle != null)
                              Text(
                                widget.chatSubtitle!,
                                style: Theme.of(
                                  context,
                                ).textTheme.bodySmall?.copyWith(
                                  color:
                                      Theme.of(
                                        context,
                                      ).colorScheme.onSurfaceVariant,
                                ),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            _dismissKeyboard();
            if (_isSearching) {
              setState(() {
                _isSearching = false;
                _searchController.clear();
                _searchResultIndices.clear();
                _currentSearchIndex = -1;
              });
            } else {
              Navigator.of(context).pop();
            }
          },
        ),
        actions:
            _isSearching
                ? [
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () {
                      setState(() {
                        _isSearching = false;
                        _searchController.clear();
                        _searchResultIndices.clear();
                        _currentSearchIndex = -1;
                      });
                    },
                  ),
                ]
                : [
                  // Selection mode toggle button
                  AIButton(
                    onPressed: _toggleSelectionMode,
                    tooltip:
                        _selectionMode
                            ? 'messages.exit_selection_mode'.tr()
                            : 'messages.select_messages'.tr(),
                  ),
                  IconButton(
                    icon: const Icon(Icons.videocam_outlined),
                    onPressed: _initiateVideoCall,
                    tooltip: 'messages.video_call'.tr(),
                  ),
                  IconButton(
                    icon: const Icon(Icons.call_outlined),
                    onPressed: _initiateAudioCall,
                    tooltip: 'messages.audio_call'.tr(),
                  ),
                  PopupMenuButton<String>(
                    icon: const Icon(Icons.more_vert),
                    tooltip: 'messages.more_options'.tr(),
                    onSelected: _handleMoreOption,
                    itemBuilder:
                        (context) => [
                          // TODO: Temporarily commented out AI Summary and Save Messages features
                          // const PopupMenuItem(
                          //   value: 'ai_summary',
                          //   child: Row(
                          //     children: [
                          //       Icon(Icons.auto_awesome_outlined),
                          //       SizedBox(width: 12),
                          //       Text('AI Summary'),
                          //     ],
                          //   ),
                          // ),
                          PopupMenuItem(
                            value: 'saved_messages',
                            child: Row(
                              children: [
                                const Icon(Icons.bookmark_outline),
                                const SizedBox(width: 12),
                                Text('messages.saved_messages'.tr()),
                              ],
                            ),
                          ),
                          const PopupMenuDivider(),
                          PopupMenuItem(
                            value: 'media_history',
                            child: Row(
                              children: [
                                const Icon(Icons.folder_outlined),
                                const SizedBox(width: 12),
                                Text('messages.media_files'.tr()),
                              ],
                            ),
                          ),
                          PopupMenuItem(
                            value: 'search_chat',
                            child: Row(
                              children: [
                                const Icon(Icons.search),
                                const SizedBox(width: 12),
                                Text('messages.search_chat'.tr()),
                              ],
                            ),
                          ),
                          PopupMenuItem(
                            value: 'scheduled_messages',
                            child: Row(
                              children: [
                                const Icon(Icons.schedule_send_outlined),
                                const SizedBox(width: 12),
                                Text('scheduled_message.view_scheduled'.tr()),
                              ],
                            ),
                          ),
                          if (widget.isChannel)
                            PopupMenuItem(
                              value: 'chat_settings',
                              child: Row(
                                children: [
                                  const Icon(Icons.settings_outlined),
                                  const SizedBox(width: 12),
                                  Text('messages.channel_settings'.tr()),
                                ],
                              ),
                            ),
                          if (!widget.isAIChat && widget.isChannel) ...[
                            PopupMenuItem(
                              value: 'add_members',
                              child: Row(
                                children: [
                                  const Icon(Icons.person_add_outlined),
                                  const SizedBox(width: 12),
                                  Text('messages.add_members'.tr()),
                                ],
                              ),
                            ),
                          ],
                          if (widget.isChannel) ...[
                            const PopupMenuDivider(),
                            PopupMenuItem(
                              value: 'leave_channel',
                              child: Row(
                                children: [
                                  const Icon(
                                    Icons.exit_to_app,
                                    color: Colors.orange,
                                  ),
                                  const SizedBox(width: 12),
                                  Text(
                                    'messages.leave_channel'.tr(),
                                    style: const TextStyle(
                                      color: Colors.orange,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            PopupMenuItem(
                              value: 'delete_channel',
                              child: Row(
                                children: [
                                  const Icon(
                                    Icons.delete_forever,
                                    color: Colors.red,
                                  ),
                                  const SizedBox(width: 12),
                                  Text(
                                    'messages.delete_channel'.tr(),
                                    style: const TextStyle(color: Colors.red),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ],
                  ),
                ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Selection Bar (shown when in selection mode with selected messages)
            if (_selectionMode && _selectedMessageIds.isNotEmpty)
              MessageSelectionBar(
                selectedCount: _selectedMessageIds.length,
                selectedMessages: _getSelectedMessages(),
                onClose: _exitSelectionMode,
                onDelete: _deleteSelectedMessages,
                onBookmark: _bookmarkSelectedMessages,
                onAIAction: _handleAIAction,
                isProcessing: _aiActionProcessing,
              ),
            // Pinned Messages Section
            if (_pinnedMessage != null) _buildPinnedMessagesSection(),
            Expanded(
              child: ListView.builder(
                controller: _scrollController,
                padding: const EdgeInsets.all(16),
                reverse: false, // Keep normal order
                keyboardDismissBehavior:
                    ScrollViewKeyboardDismissBehavior.onDrag,
                itemCount: _messages.length + (_isAITyping ? 1 : 0),
                itemBuilder: (context, index) {
                  if (index == _messages.length && _isAITyping) {
                    return const TypingIndicator();
                  }
                  final message = _messages[index];
                  final isSearchMatch = _searchResultIndices.contains(index);
                  final isCurrentSearchMatch =
                      _searchResultIndices.isNotEmpty &&
                      _currentSearchIndex >= 0 &&
                      _searchResultIndices[_currentSearchIndex] == index;

                  return Container(
                    decoration: BoxDecoration(
                      color:
                          isCurrentSearchMatch
                              ? Colors.yellow.withValues(alpha: 0.3)
                              : isSearchMatch
                              ? Colors.yellow.withValues(alpha: 0.1)
                              : null,
                      borderRadius: BorderRadius.circular(2),
                    ),
                    margin:
                        isSearchMatch
                            ? const EdgeInsets.symmetric(horizontal: 4)
                            : null,
                    child: MessageBubble(
                      message: message,
                      showSenderName: widget.isChannel && !message.isMe,
                      isChannel: widget.isChannel,
                      isBookmarked: message.isBookmarked,
                      isPinned: message.isPinned,
                      senderAvatarUrl:
                          !message.isMe
                              ? (message.senderAvatarUrl ??
                                  _getRecipientAvatarUrl())
                              : null,
                      currentUserAvatarUrl:
                          message.isMe
                              ? (message.senderAvatarUrl ??
                                  _getCurrentUserAvatarUrl())
                              : null,
                      onReact: _handleReaction,
                      onReply: _handleReply,
                      onMore: _handleMore,
                      onDelete: _deleteMessage,
                      onEdit: _editMessage,
                      onPin: (message) => _pinMessage(context, message),
                      onBookmark:
                          (message) => _bookmarkMessage(context, message),
                      scrollController: _scrollController,
                      // Selection mode props
                      isSelectionMode: _selectionMode,
                      isSelected: _selectedMessageIds.contains(message.id),
                      onSelect: () => _toggleMessageSelection(message.id),
                      onLongPressToSelect:
                          () => _enterSelectionModeWithMessage(message.id),
                      messages: _messages,
                      onShowFullScreenImage: _showFullScreenImage,
                      onDownloadMedia: _downloadMedia,
                      onShowMediaOptions: _showMediaOptions,
                      onDownloadFile: _downloadFile,
                      onOpenLinkedContent: _openLinkedContent,
                      // Inline editing props
                      isEditing: _editingMessageId == message.id,
                      editController:
                          _editingMessageId == message.id
                              ? _editController
                              : null,
                      editFocusNode:
                          _editingMessageId == message.id
                              ? _editFocusNode
                              : null,
                      onCancelEdit: _cancelEditing,
                      onSaveEdit: () => _saveEditedMessage(message),
                      onStartEdit: _startEditingMessage,
                      // Poll props
                      workspaceId:
                          WorkspaceService.instance.currentWorkspace?.id,
                      currentUserId: AuthService.instance.currentUser?.id,
                      onPollUpdated: _fetchMessages,
                    ),
                  );
                },
              ),
            ),
            MessageInput(
              key: _messageInputKey,
              controller: _messageController,
              onSend: _sendMessage,
              isAIMode: _isAIMode,
              chatName: widget.chatName,
              isChannel: widget.isChannel,
              channelId: widget.channelId,
              conversationId: widget.conversationId,
              onModeChanged: (bool aiMode) {
                setState(() {
                  _isAIMode = aiMode;
                });
              },
              onMediaSend: (path, type, description) {
                _sendMediaMessage(path, type, description);
              },
              onMediaSendBytes: (bytes, fileName, mimeType, type, description) {
                _sendMediaMessageFromBytes(
                  bytes,
                  fileName,
                  mimeType,
                  type,
                  description,
                );
              },
              replyingToMessage: _replyingToMessage,
              onCancelReply: _cancelReply,
              onScheduleMessage: _scheduleMessage,
              onShowScheduledMessages: _showScheduledMessagesPanel,
              onMentionsChanged: (mentionedUserIds) {
                setState(() {
                  _currentMentionedUserIds = mentionedUserIds;
                });
                debugPrint('Mentioned users: $mentionedUserIds');
              },
              onLinkedContentChanged: (linkedContent) {
                setState(() {
                  _currentLinkedContent = linkedContent;
                });
                debugPrint('Linked content: $linkedContent');
              },
              onGifSend: _sendGifMessage,
            ),
          ],
        ),
      ),
      ),
    );
  }

  void _handleReaction(ChatMessage message, String emoji) {
    // Find the message in the list
    final messageIndex = _messages.indexWhere((m) => m.id == message.id);
    if (messageIndex == -1) {
      debugPrint('❌ Message not found for reaction');
      return;
    }

    // Check if current user has already reacted with this emoji
    final reactionKey = '${message.id}:$emoji';
    final hasUserReacted = _userReactions.contains(reactionKey);

    // Get current reaction count
    final currentReactions = Map<String, int>.from(
      _messages[messageIndex].reactions,
    );
    final currentCount = currentReactions[emoji] ?? 0;

    // Optimistic update - toggle reaction locally
    if (hasUserReacted) {
      // User is removing their reaction
      if (currentCount <= 1) {
        currentReactions.remove(emoji);
      } else {
        currentReactions[emoji] = currentCount - 1;
      }
      _userReactions.remove(reactionKey);
    } else {
      // User is adding a reaction
      currentReactions[emoji] = currentCount + 1;
      _userReactions.add(reactionKey);
    }

    setState(() {
      _messages[messageIndex] = _messages[messageIndex].copyWith(
        reactions: currentReactions,
      );
    });

    // Use WebSocket to add/remove reaction (same as web frontend)
    // This ensures real-time sync with other clients
    if (hasUserReacted) {
      debugPrint(
        '📤 Removing reaction via WebSocket: $emoji from message: ${message.id}',
      );
      _socketService.removeReaction(messageId: message.id, emoji: emoji);
    } else {
      debugPrint(
        '📤 Adding reaction via WebSocket: $emoji to message: ${message.id}',
      );
      _socketService.addReaction(messageId: message.id, emoji: emoji);
    }
  }

  void _revertReaction(int messageIndex, String emoji, bool wasRemoving) {
    if (messageIndex >= 0 && messageIndex < _messages.length) {
      setState(() {
        final currentReactions = Map<String, int>.from(
          _messages[messageIndex].reactions,
        );
        if (wasRemoving) {
          // Was trying to remove, so add back
          currentReactions[emoji] = (currentReactions[emoji] ?? 0) + 1;
        } else {
          // Was trying to add, so remove
          final count = currentReactions[emoji] ?? 0;
          if (count <= 1) {
            currentReactions.remove(emoji);
          } else {
            currentReactions[emoji] = count - 1;
          }
        }
        _messages[messageIndex] = _messages[messageIndex].copyWith(
          reactions: currentReactions,
        );
      });
    }
  }

  void _handleReply(ChatMessage message) {
    setState(() {
      _replyingToMessage = message;
    });
    // Focus on the message input
    FocusScope.of(context).requestFocus(FocusNode());
  }

  void _cancelReply() {
    setState(() {
      _replyingToMessage = null;
    });
  }

  void _handleMore(ChatMessage message) {
    // This is handled in the MessageBubble widget itself
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text('More options')));
  }

  void _handleMoreOption(String option) {
    switch (option) {
      // TODO: Temporarily commented out AI Summary feature
      // case 'ai_summary':
      //   _showAISummaryDialog();
      //   break;
      case 'saved_messages':
        Navigator.push(
          context,
          MaterialPageRoute(
            builder:
                (context) => SavedMessagesScreen(
                  channelId: widget.isChannel ? widget.channelId : null,
                  conversationId:
                      !widget.isChannel && !widget.isAIChat
                          ? widget.conversationId
                          : null,
                  chatName: widget.chatName,
                ),
          ),
        );
        break;
      case 'media_history':
        showModalBottomSheet(
          context: context,
          builder: (context) => MediaHistorySheet(messages: _messages),
        );
        break;
      case 'search_chat':
        setState(() {
          _isSearching = true;
        });
        break;
      case 'scheduled_messages':
        _showScheduledMessagesPanel();
        break;
      case 'mute_notifications':
        _toggleNotifications();
        break;
      case 'chat_settings':
        _showChannelSettings(context);
        break;
      case 'add_members':
        _showAddMembersDialog();
        break;
      case 'leave_channel':
        _showLeaveChannelDialog();
        break;
      case 'delete_channel':
        _showDeleteChannelDialog();
        break;
    }
  }

  void _performSearch(String query) {
    if (query.isEmpty) {
      setState(() {
        _searchResultIndices.clear();
        _currentSearchIndex = -1;
      });
      return;
    }

    final results = <int>[];
    final searchQuery = query.toLowerCase();

    for (int i = 0; i < _messages.length; i++) {
      if (_messages[i].text.toLowerCase().contains(searchQuery)) {
        results.add(i);
      }
    }

    setState(() {
      _searchResultIndices = results;
      if (results.isNotEmpty) {
        _currentSearchIndex =
            results.length - 1; // Start with the most recent result
        _scrollToSearchResult();
      } else {
        _currentSearchIndex = -1;
      }
    });
  }

  void _goToNextSearchResult() {
    if (_searchResultIndices.isEmpty) return;

    setState(() {
      _currentSearchIndex =
          (_currentSearchIndex + 1) % _searchResultIndices.length;
    });
    _scrollToSearchResult();
  }

  void _goToPreviousSearchResult() {
    if (_searchResultIndices.isEmpty) return;

    setState(() {
      _currentSearchIndex =
          (_currentSearchIndex - 1 + _searchResultIndices.length) %
          _searchResultIndices.length;
    });
    _scrollToSearchResult();
  }

  void _scrollToSearchResult() {
    if (_currentSearchIndex < 0 ||
        _currentSearchIndex >= _searchResultIndices.length)
      return;

    final messageIndex = _searchResultIndices[_currentSearchIndex];
    final itemPosition = messageIndex * 80.0; // Approximate height per message

    _scrollController.animateTo(
      itemPosition,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
  }

  void _toggleNotifications() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('messages.notifications_muted'.tr()),
        action: SnackBarAction(
          label: 'messages.undo'.tr(),
          onPressed: () {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('messages.notifications_unmuted'.tr())),
            );
          },
        ),
      ),
    );
  }

  void _showChatSettings() {
    showModalBottomSheet(
      context: context,
      builder:
          (context) => Container(
            padding: const EdgeInsets.all(16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'messages.chat_settings'.tr(),
                  style: Theme.of(
                    context,
                  ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),
                ListTile(
                  leading: const Icon(Icons.wallpaper),
                  title: Text('messages.change_wallpaper'.tr()),
                  onTap: () {
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('messages.wallpaper_settings'.tr()),
                      ),
                    );
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.color_lens),
                  title: Text('messages.theme_color'.tr()),
                  onTap: () {
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('messages.theme_color_settings'.tr()),
                      ),
                    );
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.font_download),
                  title: Text('messages.font_size'.tr()),
                  onTap: () {
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('messages.font_size_settings'.tr()),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
    );
  }

  void _showAddMembersDialog() async {
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    final channelId = widget.channelId;

    if (workspaceId == null || channelId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('messages.workspace_channel_not_found'.tr()),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    // Show loading dialog
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(child: CircularProgressIndicator()),
    );

    try {
      // Fetch workspace members and current channel members in parallel
      final results = await Future.wait([
        _workspaceApiService.getMembers(workspaceId),
        _chatApiService.getChannelMembers(workspaceId, channelId),
      ]);

      final workspaceMembersResponse =
          results[0] as ApiResponse<List<WorkspaceMember>>;
      final channelMembersResponse =
          results[1] as ApiResponse<List<ChannelMember>>;

      if (!mounted) return;
      Navigator.pop(context); // Close loading dialog

      if (!workspaceMembersResponse.success ||
          workspaceMembersResponse.data == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              workspaceMembersResponse.message ??
                  'messages.failed_fetch_members'.tr(),
            ),
            backgroundColor: Colors.red,
          ),
        );
        return;
      }

      // Get current channel member IDs
      final currentMemberIds = <String>{};
      if (channelMembersResponse.success &&
          channelMembersResponse.data != null) {
        for (var member in channelMembersResponse.data!) {
          currentMemberIds.add(member.userId);
        }
      }

      // Filter out members who are already in the channel
      final availableMembers =
          workspaceMembersResponse.data!
              .where((member) => !currentMemberIds.contains(member.userId))
              .toList();

      if (availableMembers.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('messages.all_members_in_channel'.tr()),
            backgroundColor: Colors.orange,
          ),
        );
        return;
      }

      // Show member selection dialog
      showDialog(
        context: context,
        builder:
            (dialogContext) => _AddMembersDialog(
              availableMembers: availableMembers,
              onMembersSelected: (selectedMemberIds) async {
                if (selectedMemberIds.isEmpty) return;

                // Show loading
                showDialog(
                  context: context,
                  barrierDismissible: false,
                  builder:
                      (context) =>
                          const Center(child: CircularProgressIndicator()),
                );

                try {
                  // Get current member IDs and add new ones
                  final allMemberIds = [
                    ...currentMemberIds,
                    ...selectedMemberIds,
                  ];

                  final response = await _chatApiService.addChannelMembers(
                    workspaceId,
                    channelId,
                    allMemberIds,
                    isPrivate: widget.isPrivateChannel ?? true,
                  );

                  if (!mounted) return;
                  Navigator.pop(context); // Close loading

                  if (response.success) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          '${selectedMemberIds.length} ${'messages.add_member'.tr()}',
                        ),
                        backgroundColor: Colors.green,
                      ),
                    );
                  } else {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          response.message ??
                              'messages.failed_add_members'.tr(),
                        ),
                        backgroundColor: Colors.red,
                      ),
                    );
                  }
                } catch (e) {
                  if (!mounted) return;
                  Navigator.pop(context); // Close loading
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('messages.error'.tr(args: [e.toString()])),
                      backgroundColor: Colors.red,
                    ),
                  );
                }
              },
            ),
      );
    } catch (e) {
      if (!mounted) return;
      Navigator.pop(context); // Close loading dialog
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'messages.failed_load_members'.tr(args: [e.toString()]),
          ),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _showLeaveChannelDialog() {
    debugPrint('🔔 _showLeaveChannelDialog called');
    debugPrint('   Channel: ${widget.chatName}');
    debugPrint('   Channel ID: ${widget.channelId}');
    debugPrint('   Is Private: ${widget.isPrivateChannel}');

    // Save references before showing dialog to avoid "deactivated widget" errors
    final scaffoldMessenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);
    final channelName = widget.chatName;
    final channelId = widget.channelId;

    showDialog(
      context: context,
      builder:
          (dialogContext) => AlertDialog(
            title: Text('messages.leave_channel'.tr()),
            content: Text(
              'messages.leave_channel_confirm'.tr(args: [channelName]) +
                  ' ' +
                  'messages.leave_channel_info'.tr(),
            ),
            actions: [
              TextButton(
                onPressed: () {
                  debugPrint('❌ User clicked Cancel on leave dialog');
                  Navigator.pop(dialogContext);
                },
                child: Text('messages.cancel'.tr()),
              ),
              TextButton(
                onPressed: () async {
                  debugPrint('✅ User clicked Leave on dialog');
                  Navigator.pop(dialogContext); // Close dialog

                  // Show loading indicator
                  scaffoldMessenger.showSnackBar(
                    SnackBar(
                      content: Row(
                        children: [
                          const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Text('messages.leaving_channel'.tr()),
                        ],
                      ),
                      duration: const Duration(
                        seconds: 30,
                      ), // Long duration while waiting
                    ),
                  );

                  try {
                    // Get workspace ID
                    final workspaceId =
                        WorkspaceService.instance.currentWorkspace?.id;

                    if (workspaceId == null || channelId == null) {
                      throw Exception(
                        'messages.workspace_channel_missing'.tr(),
                      );
                    }

                    // Call API to leave channel
                    print('🚪 Leaving channel: $channelName ($channelId)');
                    final response = await _chatApiService.leaveChannel(
                      workspaceId,
                      channelId,
                    );

                    if (response.success) {
                      print('✅ Successfully left channel');

                      // Close loading snackbar
                      scaffoldMessenger.clearSnackBars();

                      // Show success message
                      scaffoldMessenger.showSnackBar(
                        SnackBar(
                          content: Text(
                            'messages.left_channel'.tr(args: [channelName]),
                          ),
                          backgroundColor: Colors.green,
                          duration: const Duration(seconds: 2),
                        ),
                      );

                      // Navigate back (socket event will handle this, but do it anyway)
                      if (navigator.canPop()) {
                        navigator.pop();
                      }
                    } else {
                      throw Exception(
                        response.message ??
                            'messages.failed_leave_channel'.tr(args: ['']),
                      );
                    }
                  } catch (e) {
                    print('❌ Error leaving channel: $e');

                    // Close loading snackbar
                    scaffoldMessenger.clearSnackBars();

                    // Show error message
                    scaffoldMessenger.showSnackBar(
                      SnackBar(
                        content: Text(
                          'messages.failed_leave_channel'.tr(
                            args: [e.toString()],
                          ),
                        ),
                        backgroundColor: Colors.red,
                        duration: const Duration(seconds: 4),
                      ),
                    );
                  }
                },
                style: TextButton.styleFrom(foregroundColor: Colors.orange),
                child: Text('messages.leave'.tr()),
              ),
            ],
          ),
    );
  }

  void _showDeleteChannelDialog() {
    // Save references before showing dialog to avoid "deactivated widget" errors
    final scaffoldMessenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);
    final channelName = widget.chatName;
    final channelId = widget.channelId;

    showDialog(
      context: context,
      builder:
          (dialogContext) => AlertDialog(
            title: Text('messages.delete_channel'.tr()),
            content: Text(
              'messages.delete_channel_confirm'.tr(args: [channelName]) +
                  ' ' +
                  'messages.delete_channel_warning'.tr(),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(dialogContext),
                child: Text('messages.cancel'.tr()),
              ),
              TextButton(
                onPressed: () async {
                  Navigator.pop(dialogContext); // Close dialog

                  // Show loading indicator
                  scaffoldMessenger.showSnackBar(
                    SnackBar(
                      content: Row(
                        children: [
                          const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Text('messages.deleting_channel'.tr()),
                        ],
                      ),
                      duration: const Duration(
                        seconds: 30,
                      ), // Long duration while waiting
                    ),
                  );

                  try {
                    // Get workspace ID
                    final workspaceId =
                        WorkspaceService.instance.currentWorkspace?.id;

                    if (workspaceId == null || channelId == null) {
                      throw Exception(
                        'messages.workspace_channel_missing'.tr(),
                      );
                    }

                    // Call API to delete channel
                    print('🗑️ Deleting channel: $channelName ($channelId)');
                    final response = await _chatApiService.deleteChannel(
                      workspaceId,
                      channelId,
                    );

                    if (response.success) {
                      print('✅ Channel deleted successfully');

                      // Close loading snackbar
                      scaffoldMessenger.clearSnackBars();

                      // Show success message
                      scaffoldMessenger.showSnackBar(
                        SnackBar(
                          content: Text(
                            'messages.channel_deleted'.tr(args: [channelName]),
                          ),
                          backgroundColor: Colors.green,
                          duration: const Duration(seconds: 2),
                        ),
                      );

                      // Navigate back
                      navigator.pop();
                    } else {
                      throw Exception(
                        response.message ??
                            'messages.failed_delete_channel'.tr(args: ['']),
                      );
                    }
                  } catch (e) {
                    print('❌ Error deleting channel: $e');

                    // Close loading snackbar
                    scaffoldMessenger.clearSnackBars();

                    // Show error message
                    scaffoldMessenger.showSnackBar(
                      SnackBar(
                        content: Text(
                          'messages.failed_delete_channel'.tr(
                            args: [e.toString()],
                          ),
                        ),
                        backgroundColor: Colors.red,
                        duration: const Duration(seconds: 4),
                      ),
                    );
                  }
                },
                style: TextButton.styleFrom(foregroundColor: Colors.red),
                child: Text('messages.delete'.tr()),
              ),
            ],
          ),
    );
  }

  void _showAISummaryDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder:
          (context) => AlertDialog(
            title: Row(
              children: [
                Icon(Icons.auto_awesome, color: Colors.teal),
                const SizedBox(width: 8),
                Text('messages.conversation_summary'.tr()),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Loading animation
                const CircularProgressIndicator(),
                const SizedBox(height: 16),
                Text(
                  'messages.generating_summary'.tr(),
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ],
            ),
          ),
    );

    // Simulate AI processing
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        Navigator.pop(context);
        _showAISummaryResult();
      }
    });
  }

  void _showAISummaryResult() {
    showDialog(
      context: context,
      builder:
          (context) => AlertDialog(
            title: Row(
              children: [
                Icon(Icons.auto_awesome, color: Colors.teal),
                const SizedBox(width: 8),
                Text('messages.conversation_summary'.tr()),
              ],
            ),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'messages.key_points'.tr(),
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  _buildSummaryPoint('• Project is progressing well'),
                  _buildSummaryPoint('• UI design has been completed'),
                  _buildSummaryPoint(
                    '• Mockups will be shared via shared drive',
                  ),
                  _buildSummaryPoint('• Review and feedback process initiated'),
                  const SizedBox(height: 16),
                  Text(
                    'messages.action_items'.tr(),
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  _buildSummaryPoint(
                    '• Upload mockups to shared drive',
                    isAction: true,
                  ),
                  _buildSummaryPoint(
                    '• Review mockups and provide feedback',
                    isAction: true,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Sentiment: Positive 😊',
                    style: Theme.of(
                      context,
                    ).textTheme.bodyMedium?.copyWith(color: Colors.green),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.pop(context);
                  // Copy to clipboard
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Summary copied to clipboard')),
                  );
                },
                child: const Text('Copy'),
              ),
              TextButton(
                onPressed: () {
                  Navigator.pop(context);
                  // Share summary
                  ScaffoldMessenger.of(
                    context,
                  ).showSnackBar(SnackBar(content: Text('Sharing summary...')));
                },
                child: const Text('Share'),
              ),
              ElevatedButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Done'),
              ),
            ],
          ),
    );
  }

  Widget _buildSummaryPoint(String text, {bool isAction = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (isAction)
            Icon(Icons.check_box_outline_blank, size: 16, color: Colors.teal),
          if (isAction) const SizedBox(width: 4),
          Expanded(
            child: Text(text, style: Theme.of(context).textTheme.bodyMedium),
          ),
        ],
      ),
    );
  }

  void _showSaveMessageDialog() {
    showDialog(
      context: context,
      builder:
          (context) => AlertDialog(
            title: Row(
              children: [
                Icon(Icons.bookmark, color: Colors.blue),
                const SizedBox(width: 8),
                const Text('Save Messages'),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Choose how to save your conversation:',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 16),
                _buildSaveOption(
                  context,
                  Icons.bookmark_add,
                  'Save to Bookmarks',
                  'Add important messages to bookmarks',
                  () {
                    Navigator.pop(context);
                    _showBookmarkSelection();
                  },
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
            ],
          ),
    );
  }

  Widget _buildSaveOption(
    BuildContext context,
    IconData icon,
    String title,
    String subtitle,
    VoidCallback onTap,
  ) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(2),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          border: Border.all(
            color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.3),
          ),
          borderRadius: BorderRadius.circular(2),
        ),
        child: Row(
          children: [
            Icon(icon, size: 28, color: Colors.blue),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right),
          ],
        ),
      ),
    );
  }

  void _showBookmarkSelection() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder:
          (context) => Container(
            height: MediaQuery.of(context).size.height * 0.7,
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Text(
                  'Select Messages to Bookmark',
                  style: Theme.of(
                    context,
                  ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),
                Expanded(
                  child: ListView.builder(
                    itemCount: _messages.length,
                    itemBuilder: (context, index) {
                      final message = _messages[index];
                      return CheckboxListTile(
                        value: false,
                        onChanged: (value) {
                          // Toggle selection
                        },
                        title: Text(
                          message.text,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        subtitle: Text(
                          _formatTimestamp(message.timestamp),
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      );
                    },
                  ),
                ),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Navigator.pop(context),
                        child: const Text('Cancel'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () {
                          Navigator.pop(context);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Messages saved to bookmarks'),
                            ),
                          );
                        },
                        child: const Text('Save Selected'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
    );
  }

  String _formatTimestamp(DateTime timestamp) {
    final now = DateTime.now();
    final difference = now.difference(timestamp);

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

  static String formatTimestampStatic(DateTime timestamp) {
    final now = DateTime.now();
    final difference = now.difference(timestamp);

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

  /// Show full screen image viewer
  void _showFullScreenImage(BuildContext context, String imageUrl) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder:
            (context) => FullScreenImageViewer(
              imageUrl: imageUrl,
              onDownload: () => _downloadMedia(imageUrl, MediaType.image),
            ),
      ),
    );
  }

  /// Show media options bottom sheet
  void _showMediaOptions(BuildContext context, String url, MediaType type) {
    showModalBottomSheet(
      context: context,
      builder:
          (context) => SafeArea(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                ListTile(
                  leading: const Icon(Icons.fullscreen),
                  title: Text(
                    type == MediaType.image ? 'View Full Screen' : 'View Video',
                  ),
                  onTap: () {
                    Navigator.pop(context);
                    if (type == MediaType.image) {
                      _showFullScreenImage(context, url);
                    }
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.download),
                  title: const Text('Download'),
                  onTap: () {
                    Navigator.pop(context);
                    _downloadMedia(url, type);
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.share),
                  title: const Text('Share'),
                  onTap: () {
                    Navigator.pop(context);
                    _shareMedia(url, type);
                  },
                ),
              ],
            ),
          ),
    );
  }

  /// Download media to device
  Future<void> _downloadMedia(String url, MediaType type) async {
    try {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              CircularProgressIndicator(),
              const SizedBox(width: 16),
              Text(
                'Downloading ${type == MediaType.image ? 'image' : 'video'}...',
              ),
            ],
          ),
        ),
      );

      // For local files, no need to download
      if (url.startsWith('/') || url.startsWith('file://')) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('File is already on device')));
        return;
      }

      // Download from network
      final dio = Dio();
      final tempDir = await getTemporaryDirectory();
      final fileName = url.split('/').last;
      final savePath = '${tempDir.path}/$fileName';

      await dio.download(url, savePath);

      // Save to gallery using Gal
      if (type == MediaType.image) {
        await Gal.putImage(savePath);
      } else if (type == MediaType.video) {
        await Gal.putVideo(savePath);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              '${type == MediaType.image ? 'Image' : 'Video'} saved to Gallery',
            ),
            duration: const Duration(seconds: 3),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Download failed: $e')));
      }
    }
  }

  /// Download file (documents, etc.)
  Future<void> _downloadFile(String url, String fileName) async {
    try {
      print('📥 Download started: url=$url, fileName=$fileName');

      // Validate and sanitize fileName
      String sanitizedFileName = fileName.trim();
      if (sanitizedFileName.isEmpty) {
        // Extract filename from URL if not provided
        sanitizedFileName = url.split('/').last;
        if (sanitizedFileName.isEmpty) {
          sanitizedFileName =
              'downloaded_file_${DateTime.now().millisecondsSinceEpoch}';
        }
      }

      // Remove any path separators from filename
      sanitizedFileName = sanitizedFileName.replaceAll(RegExp(r'[/\\]'), '_');

      // Remove any invalid characters
      sanitizedFileName = sanitizedFileName.replaceAll(
        RegExp(r'[<>:"|?*]'),
        '_',
      );

      print('📥 Sanitized fileName: $sanitizedFileName');

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              CircularProgressIndicator(),
              SizedBox(width: 16),
              Text('Downloading file...'),
            ],
          ),
        ),
      );

      // Get app's external storage directory (accessible without special permissions)
      final directory = await getExternalStorageDirectory();
      if (directory == null) {
        throw Exception('Storage not available');
      }

      print('📥 Storage directory: ${directory.path}');

      // Create a Downloads folder in the app's directory
      final downloadsDir = Directory('${directory.path}/Downloads');
      if (!await downloadsDir.exists()) {
        await downloadsDir.create(recursive: true);
        print('📥 Created Downloads directory');
      }

      final savePath = '${downloadsDir.path}/$sanitizedFileName';
      print('📥 Save path: $savePath');

      // For local files, copy them
      if (url.startsWith('/') || url.startsWith('file://')) {
        final sourceFile = File(
          url.startsWith('file://') ? url.substring(7) : url,
        );

        if (!await sourceFile.exists()) {
          throw Exception('File not found');
        }

        await sourceFile.copy(savePath);
      } else {
        // Download from network
        final dio = Dio();
        await dio.download(url, savePath);
      }

      print('📥 Download completed successfully!');

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('File saved: $sanitizedFileName'),
                Text(
                  'Location: App Files/Downloads',
                  style: TextStyle(fontSize: 11, color: Colors.white70),
                ),
              ],
            ),
            duration: const Duration(seconds: 4),
          ),
        );
      }
    } catch (e) {
      print('Download error: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Download failed: ${e.toString()}'),
            duration: const Duration(seconds: 4),
          ),
        );
      }
    }
  }

  /// Share media
  Future<void> _shareMedia(String url, MediaType type) async {
    try {
      if (url.startsWith('/') || url.startsWith('file://')) {
        final file = File(url.startsWith('file://') ? url.substring(7) : url);
        await Share.shareXFiles([XFile(file.path)]);
      } else {
        // Download first then share
        final dio = Dio();
        final tempDir = await getTemporaryDirectory();
        final fileName = url.split('/').last;
        final savePath = '${tempDir.path}/$fileName';

        await dio.download(url, savePath);
        await Share.shareXFiles([XFile(savePath)]);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Share failed: $e')));
      }
    }
  }

  @override
  void dispose() {
    // Notify NavigationService that user left chat screen
    NavigationService().leftChatScreen();
    debugPrint(
      '💬 ChatScreen: Notified NavigationService - User left chat screen',
    );

    // Remove keyboard observer
    WidgetsBinding.instance.removeObserver(this);

    // Clean up socket subscriptions
    _messageSubscription?.cancel();
    _videoCallSubscription?.cancel();
    _memberLeftSubscription?.cancel();
    _reactionSubscription?.cancel();
    _pinSubscription?.cancel();
    _bookmarkSubscription?.cancel();
    _readReceiptSubscription?.cancel();

    // Unsubscribe from socket channels
    if (widget.isChannel && widget.channelId != null) {
      _socketService.unsubscribeFromChannel(widget.channelId!);
    } else if (widget.conversationId != null) {
      _socketService.unsubscribeFromConversation(widget.conversationId!);
    }

    _messageController.dispose();
    _editController.dispose();
    _editFocusNode.dispose();
    _scrollController.dispose();
    _searchController.dispose();
    _bookmarkService.removeListener(_onBookmarkChanged);

    // Dispose audio players
    _sendSoundPlayer.dispose();
    _receiveSoundPlayer.dispose();

    super.dispose();
  }

  // Channel settings functionality
  void _showChannelSettings(BuildContext context) async {
    final channelId = widget.channelId;
    if (channelId == null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Channel ID not available')));
      return;
    }

    final result = await Navigator.push<Map<String, dynamic>>(
      context,
      MaterialPageRoute(
        builder:
            (context) => ChannelSettingsScreen(
              channelId: channelId,
              channelName: widget.chatName,
              channelDescription: widget.chatSubtitle,
              isPrivateChannel: widget.isPrivateChannel,
              notificationsEnabled: true,
              channelMuted: false,
            ),
      ),
    );

    if (result != null && mounted) {
      if (result['action'] == 'leave') {
        // Handle leave channel
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Left channel "${widget.chatName}"'),
            backgroundColor: Colors.orange,
          ),
        );
      } else if (result['action'] == 'delete') {
        // Handle delete channel
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Channel "${widget.chatName}" deleted'),
            backgroundColor: Colors.red,
          ),
        );
      } else {
        // Handle settings update
        _saveChannelSettings(
          context,
          result['channelName'],
          result['channelDescription'],
          result['isPrivateChannel'],
          result['notificationsEnabled'],
          result['channelMuted'],
        );
      }
    }
  }

  void _saveChannelSettings(
    BuildContext context,
    String channelName,
    String channelDesc,
    bool isPrivate,
    bool notifications,
    bool muted,
  ) {
    // Here you would save the settings to your data source
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle, color: Colors.white, size: 20),
            const SizedBox(width: 8),
            const Text('Channel settings saved'),
          ],
        ),
        backgroundColor: Colors.green,
      ),
    );
  }

  // Scheduled message functionality - using backend API
  Future<void> _scheduleMessage(String text, DateTime scheduledTime) async {
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('common.error'.tr()),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    final dto = CreateScheduledMessageDto(
      content: text,
      channelId: widget.channelId,
      conversationId: widget.conversationId,
      scheduledFor: scheduledTime,
    );

    final response = await _chatApiService.createScheduledMessage(
      workspaceId,
      dto,
    );

    if (response.isSuccess) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('scheduled_message.scheduled_success'.tr()),
            backgroundColor: Colors.green,
          ),
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

  /// Show the scheduled messages panel
  void _showScheduledMessagesPanel() {
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('common.error'.tr()),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    ScheduledMessagesPanel.show(
      context,
      workspaceId: workspaceId,
      channelId: widget.channelId,
      conversationId: widget.conversationId,
    );
  }

  /// Build linked content display widget (for notes, events, files, polls attached via /)
  Widget _buildLinkedContentDisplay(
    BuildContext context,
    List<Map<String, dynamic>> linkedContent,
    String messageId,
  ) {
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children:
            linkedContent.map((item) {
              final type = item['type'] as String? ?? 'file';
              final id = item['id'] as String? ?? '';
              final title =
                  item['title'] as String? ??
                  item['name'] as String? ??
                  'Untitled';

              // Handle poll type specially with PollMessageWidget
              if (type.toLowerCase() == 'poll') {
                return _buildPollWidget(context, item, messageId);
              }

              IconData icon;
              Color color;
              String typeLabel;

              switch (type.toLowerCase()) {
                case 'notes':
                case 'note':
                  icon = Icons.description_outlined;
                  color = Colors.blue;
                  typeLabel = 'NOTE';
                  break;
                case 'events':
                case 'event':
                  icon = Icons.event_outlined;
                  color = Colors.green;
                  typeLabel = 'EVENT';
                  break;
                case 'files':
                case 'file':
                default:
                  icon = Icons.insert_drive_file_outlined;
                  color = Colors.orange;
                  typeLabel = 'FILE';
                  break;
              }

              return Container(
                margin: const EdgeInsets.only(bottom: 4),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: color.withOpacity(0.2), width: 1),
                ),
                child: InkWell(
                  onTap: () => _openLinkedContent(type, id, title),
                  borderRadius: BorderRadius.circular(8),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 10,
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(icon, size: 18, color: color),
                        const SizedBox(width: 10),
                        Text(
                          typeLabel,
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: color,
                            letterSpacing: 0.5,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Flexible(
                          child: Text(
                            title,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                              color: Theme.of(context).colorScheme.onSurface,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Icon(
                          Icons.open_in_new,
                          size: 14,
                          color: Theme.of(
                            context,
                          ).colorScheme.onSurface.withOpacity(0.5),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }).toList(),
      ),
    );
  }

  /// Build poll widget for linked content
  Widget _buildPollWidget(
    BuildContext context,
    Map<String, dynamic> item,
    String messageId,
  ) {
    final workspaceService = WorkspaceService.instance;
    final authService = AuthService.instance;
    final workspaceId = workspaceService.currentWorkspace?.id ?? '';
    final userId = authService.currentUser?.id ?? '';
    final pollData = item['poll'] ?? item;
    final createdBy = pollData['createdBy'] ?? pollData['created_by'] ?? '';

    debugPrint(
      '🗳️ Building poll widget - messageId: $messageId, pollId: ${pollData['id']}, workspaceId: $workspaceId',
    );

    return PollMessageWidget(
      key: ValueKey('poll_${pollData['id'] ?? item['id']}'),
      messageId: messageId,
      workspaceId: workspaceId,
      pollData: item,
      currentUserId: userId,
      isCreator: createdBy == userId,
      onPollUpdated: () {
        // Refresh messages to get updated poll data
        _fetchMessages();
      },
    );
  }

  /// Open linked content (note, event, or file)
  void _openLinkedContent(String type, String id, String title) async {
    debugPrint('Opening linked content: type=$type, id=$id, title=$title');

    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('No workspace selected')));
      return;
    }

    switch (type.toLowerCase()) {
      case 'notes':
      case 'note':
        // Fetch the note first, then navigate to editor
        try {
          final response = await notes_api.NotesApiService().getNote(
            workspaceId,
            id,
          );
          if (response.success && response.data != null && mounted) {
            // Convert API Note to local Note
            final apiNote = response.data!;
            final localNote = local_note.Note(
              id: apiNote.id,
              parentId: apiNote.parentId,
              title: apiNote.title,
              description: '', // API Note doesn't have description
              content: apiNote.content ?? '',
              icon: '📝', // Default icon
              categoryId: apiNote.category ?? 'work',
              subcategory: '',
              keywords: apiNote.tags ?? [],
              isFavorite: apiNote.isFavorite,
              isTemplate: false,
              isDeleted: apiNote.deletedAt != null,
              createdBy: apiNote.authorId,
              collaborators: [],
              activities: [],
              createdAt: apiNote.createdAt,
              updatedAt: apiNote.updatedAt,
            );

            Navigator.of(context).push(
              MaterialPageRoute(
                builder:
                    (context) => NoteEditorScreen(
                      note: localNote,
                      initialMode: NoteEditorMode.edit,
                    ),
              ),
            );
          } else {
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Could not load note: $title')),
              );
            }
          }
        } catch (e) {
          debugPrint('Error loading note: $e');
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Error opening note: $title')),
            );
          }
        }
        break;
      case 'events':
      case 'event':
        // Navigate to calendar screen
        Navigator.of(
          context,
        ).push(MaterialPageRoute(builder: (context) => const CalendarScreen()));
        break;
      case 'files':
      case 'file':
        // Navigate to files screen
        Navigator.of(
          context,
        ).push(MaterialPageRoute(builder: (context) => const FilesScreen()));
        break;
      default:
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Unknown content type: $type')));
    }
  }

  // Bookmark message functionality - now uses API
  Future<void> _bookmarkMessage(
    BuildContext context,
    ChatMessage message,
  ) async {
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('No workspace selected')));
      return;
    }

    final isCurrentlyBookmarked = message.isBookmarked;

    // Optimistic update - immediately update UI by updating the message in _messages list
    setState(() {
      final index = _messages.indexWhere((m) => m.id == message.id);
      if (index != -1) {
        _messages[index] = _messages[index].copyWith(
          isBookmarked: !isCurrentlyBookmarked,
        );
      }
    });

    try {
      if (isCurrentlyBookmarked) {
        // Remove bookmark via API
        final response = await _chatApiService.removeBookmark(
          workspaceId,
          message.id,
        );
        if (response.success) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Bookmark removed'),
              duration: Duration(seconds: 1),
            ),
          );
        } else {
          // Revert on error
          setState(() {
            final index = _messages.indexWhere((m) => m.id == message.id);
            if (index != -1) {
              _messages[index] = _messages[index].copyWith(isBookmarked: true);
            }
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to remove bookmark: ${response.message}'),
            ),
          );
        }
      } else {
        // Add bookmark via API
        final response = await _chatApiService.bookmarkMessage(
          workspaceId,
          message.id,
        );
        if (response.success) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Message bookmarked'),
              duration: Duration(seconds: 1),
            ),
          );
        } else {
          // Revert on error
          setState(() {
            final index = _messages.indexWhere((m) => m.id == message.id);
            if (index != -1) {
              _messages[index] = _messages[index].copyWith(isBookmarked: false);
            }
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to bookmark message: ${response.message}'),
            ),
          );
        }
      }
    } catch (e) {
      // Revert on error
      setState(() {
        final index = _messages.indexWhere((m) => m.id == message.id);
        if (index != -1) {
          _messages[index] = _messages[index].copyWith(
            isBookmarked: isCurrentlyBookmarked,
          );
        }
      });
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }

  void _showBookmarkedMessages(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => SavedMessagesScreen()),
    );
  }

  // ===== MESSAGE SELECTION MODE METHODS =====

  void _toggleSelectionMode() {
    setState(() {
      _selectionMode = !_selectionMode;
      if (!_selectionMode) {
        _selectedMessageIds.clear();
      }
    });
  }

  void _toggleMessageSelection(String messageId) {
    setState(() {
      if (_selectedMessageIds.contains(messageId)) {
        _selectedMessageIds.remove(messageId);
      } else {
        _selectedMessageIds.add(messageId);
      }
    });
  }

  List<ChatMessage> _getSelectedMessages() {
    return _messages
        .where((msg) => _selectedMessageIds.contains(msg.id))
        .toList();
  }

  void _exitSelectionMode() {
    setState(() {
      _selectionMode = false;
      _selectedMessageIds.clear();
    });
  }

  /// Enter selection mode with a specific message already selected (for long press)
  void _enterSelectionModeWithMessage(String messageId) {
    setState(() {
      _selectionMode = true;
      _selectedMessageIds.clear();
      _selectedMessageIds.add(messageId);
    });
  }

  /// Delete all selected messages with confirmation
  Future<void> _deleteSelectedMessages() async {
    final selectedMessages = _getSelectedMessages();
    if (selectedMessages.isEmpty) return;

    // Check if user can delete these messages (only own messages)
    final currentUserId = AuthService.instance.currentUser?.id;
    final canDeleteAll = selectedMessages.every((msg) => msg.isMe);

    if (!canDeleteAll) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('You can only delete your own messages'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    // Show confirmation dialog
    final confirmed = await showDialog<bool>(
      context: context,
      builder:
          (context) => AlertDialog(
            title: const Text('Delete Messages'),
            content: Text(
              'Are you sure you want to delete ${selectedMessages.length} message${selectedMessages.length > 1 ? 's' : ''}?',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('Cancel'),
              ),
              TextButton(
                onPressed: () => Navigator.pop(context, true),
                style: TextButton.styleFrom(foregroundColor: Colors.red),
                child: const Text('Delete'),
              ),
            ],
          ),
    );

    if (confirmed != true) return;

    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('messages.no_workspace_selected'.tr()),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    int successCount = 0;
    int failCount = 0;

    // Delete each message
    for (final message in selectedMessages) {
      try {
        final response = await _chatApiService.deleteMessage(
          workspaceId,
          message.id,
        );
        if (response.success) {
          successCount++;
          // Remove from local state
          setState(() {
            _messages.removeWhere((msg) => msg.id == message.id);
          });
        } else {
          failCount++;
        }
      } catch (e) {
        failCount++;
        debugPrint('Error deleting message ${message.id}: $e');
      }
    }

    // Exit selection mode
    _exitSelectionMode();

    // Show result
    if (mounted) {
      if (failCount == 0) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              '$successCount message${successCount > 1 ? 's' : ''} deleted',
            ),
            duration: const Duration(seconds: 2),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Deleted $successCount, failed $failCount'),
            backgroundColor: Colors.orange,
          ),
        );
      }
    }
  }

  /// Bookmark all selected messages
  Future<void> _bookmarkSelectedMessages() async {
    final selectedMessages = _getSelectedMessages();
    if (selectedMessages.isEmpty) return;

    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('messages.no_workspace_selected'.tr()),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    int successCount = 0;
    int alreadyBookmarked = 0;

    for (final message in selectedMessages) {
      if (message.isBookmarked) {
        alreadyBookmarked++;
        continue;
      }

      try {
        final response = await _chatApiService.bookmarkMessage(
          workspaceId,
          message.id,
        );
        if (response.success) {
          successCount++;
          // Update local state
          final index = _messages.indexWhere((m) => m.id == message.id);
          if (index != -1) {
            setState(() {
              _messages[index] = _messages[index].copyWith(isBookmarked: true);
            });
          }
        }
      } catch (e) {
        debugPrint('Error bookmarking message ${message.id}: $e');
      }
    }

    // Exit selection mode
    _exitSelectionMode();

    // Show result
    if (mounted) {
      if (successCount > 0) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              '$successCount message${successCount > 1 ? 's' : ''} bookmarked',
            ),
            duration: const Duration(seconds: 2),
          ),
        );
      } else if (alreadyBookmarked == selectedMessages.length) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('All selected messages are already bookmarked'),
            duration: Duration(seconds: 2),
          ),
        );
      }
    }
  }

  Future<void> _handleAIAction(
    AIAction action, {
    String? language,
    String? customPrompt,
  }) async {
    final selectedMessages = _getSelectedMessages();
    if (selectedMessages.isEmpty) return;

    // Handle custom prompt - show dialog first
    if (action == AIAction.customPrompt && customPrompt == null) {
      final result = await showAIActionResultDialog(
        context: context,
        action: action,
        selectedMessages: selectedMessages,
      );

      if (result != null && result['action'] == 'submit_custom_prompt') {
        // Re-call with the prompt
        _handleAIAction(action, customPrompt: result['prompt']);
      }
      return;
    }

    // Handle copy formatted (no AI needed)
    if (action == AIAction.copyFormatted) {
      final formattedText = selectedMessages
          .map(
            (msg) =>
                '[${msg.senderName ?? "User"}] ${msg.text.replaceAll(RegExp(r'<[^>]*>'), '')}',
          )
          .join('\n\n');
      await Clipboard.setData(ClipboardData(text: formattedText));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${selectedMessages.length} messages copied')),
        );
      }
      _exitSelectionMode();
      return;
    }

    // Handle save bookmark (no AI needed)
    if (action == AIAction.saveBookmark) {
      final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
      if (workspaceId != null) {
        int bookmarked = 0;
        for (final msg in selectedMessages) {
          if (!msg.isBookmarked) {
            final response = await _chatApiService.bookmarkMessage(
              workspaceId,
              msg.id,
            );
            if (response.success) {
              bookmarked++;
              // Update local state
              final index = _messages.indexWhere((m) => m.id == msg.id);
              if (index != -1) {
                setState(() {
                  _messages[index] = _messages[index].copyWith(
                    isBookmarked: true,
                  );
                });
              }
            }
          }
        }
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('$bookmarked messages bookmarked')),
          );
        }
      }
      _exitSelectionMode();
      return;
    }

    // Show loading dialog
    setState(() => _aiActionProcessing = true);

    // Prepare context
    final messagesContext = selectedMessages
        .map(
          (msg) =>
              '${msg.senderName ?? "User"}: ${msg.text.replaceAll(RegExp(r'<[^>]*>'), '')}',
        )
        .join('\n');

    String? result;
    String? error;

    try {
      final aiService = AIService();

      switch (action) {
        case AIAction.summarize:
          result = await aiService.summarizeMessages(messagesContext);
          break;
        case AIAction.createNote:
          result = await aiService.createNoteFromMessages(messagesContext);
          break;
        case AIAction.translate:
          result = await aiService.translateMessages(
            messagesContext,
            language ?? 'en',
          );
          break;
        case AIAction.extractTasks:
          result = await aiService.extractTasksFromMessages(messagesContext);
          break;
        case AIAction.createEmail:
          result = await aiService.createEmailFromMessages(messagesContext);
          break;
        case AIAction.customPrompt:
          result = await aiService.customPrompt(
            messagesContext,
            customPrompt ?? '',
          );
          break;
        default:
          break;
      }
    } catch (e) {
      error = e.toString();
    }

    setState(() => _aiActionProcessing = false);

    if (!mounted) return;

    // Show result dialog
    await showAIActionResultDialog(
      context: context,
      action: action,
      selectedMessages: selectedMessages,
      result: result,
      error: error,
      onSaveAsNote: (title, content) async {
        // Save as note logic
        try {
          final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
          if (workspaceId != null) {
            final notesService = notes_api.NotesApiService();
            final noteDto = notes_api.CreateNoteDto(
              title: title,
              content: content,
            );
            await notesService.createNote(workspaceId, noteDto);
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Note saved successfully')),
              );
              Navigator.of(context).pop();
            }
          }
        } catch (e) {
          if (mounted) {
            ScaffoldMessenger.of(
              context,
            ).showSnackBar(SnackBar(content: Text('Failed to save note: $e')));
          }
        }
      },
    );

    _exitSelectionMode();
  }

  // ===== END MESSAGE SELECTION MODE METHODS =====

  Widget _buildPinnedMessagesSection() {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    if (_pinnedMessage == null) return const SizedBox.shrink();

    return Container(
      decoration: BoxDecoration(
        color: isDarkMode ? const Color(0xFF1A1F2A) : Colors.grey[50],
        border: Border(
          bottom: BorderSide(
            color: isDarkMode ? Colors.grey[800]! : Colors.grey[300]!,
            width: 1,
          ),
        ),
      ),
      child: Container(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Icon(Icons.push_pin, size: 16, color: AppTheme.infoLight),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      Text(
                        _pinnedMessage!.isMe
                            ? 'You'
                            : (_pinnedMessage!.senderName ?? 'User'),
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.infoLight,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '• ${_formatPinnedTimestamp(_pinnedMessage!.timestamp)}',
                        style: TextStyle(
                          fontSize: 10,
                          color:
                              isDarkMode ? Colors.grey[400] : Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _pinnedMessage!.text
                        .replaceAll(RegExp(r'<[^>]*>'), '')
                        .trim(),
                    style: TextStyle(
                      fontSize: 13,
                      color: isDarkMode ? Colors.grey[300] : Colors.grey[700],
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            IconButton(
              icon: Icon(
                Icons.close,
                size: 16,
                color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
              ),
              onPressed: () => _pinMessage(context, _pinnedMessage!),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
            ),
          ],
        ),
      ),
    );
  }

  String _formatPinnedTimestamp(DateTime timestamp) {
    final now = DateTime.now();
    final difference = now.difference(timestamp);

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

  // Edit message functionality - now uses inline editing instead of dialog
  void _showEditDialog(
    BuildContext context,
    ChatMessage message,
    Function(ChatMessage, String) onEdit,
  ) {
    // Use inline editing instead of dialog
    _startEditingMessage(message);
  }
}

class MessageAttachment {
  final String id;
  final String fileName;
  final String url;
  final String mimeType;
  final String fileSize;

  MessageAttachment({
    required this.id,
    required this.fileName,
    required this.url,
    required this.mimeType,
    required this.fileSize,
  });

  factory MessageAttachment.fromJson(Map<String, dynamic> json) {
    return MessageAttachment(
      id: json['id'] ?? '',
      fileName: json['fileName'] ?? json['filename'] ?? '',
      url: json['url'] ?? '',
      mimeType: json['mimeType'] ?? json['type'] ?? '',
      fileSize: json['fileSize'] ?? json['size'] ?? '0',
    );
  }
}

class ChatMessage {
  final String id;
  final String text;
  final bool isMe;
  final DateTime timestamp;
  final String? senderName;
  final String? senderAvatarUrl;
  final bool isAI;
  final String? imagePath;
  final MediaType? mediaType;
  final String? mediaUrl;
  final List<MessageAttachment>? attachments;
  final Map<String, int> reactions;
  final String? replyToMessageId;
  final ChatMessage? replyToMessage;
  final bool isEdited;
  final bool isPinned;
  final bool isBookmarked;
  final MessageDeliveryStatus deliveryStatus;
  final List<Map<String, dynamic>>? linkedContent; // For / attached content
  final int? _readByCount;

  /// Get read by count, defaults to 0 if null
  int get readByCount => _readByCount ?? 0;

  ChatMessage({
    required this.id,
    required this.text,
    required this.isMe,
    required this.timestamp,
    this.senderName,
    this.senderAvatarUrl,
    this.isAI = false,
    this.imagePath,
    this.mediaType,
    this.mediaUrl,
    this.attachments,
    this.reactions = const {},
    this.replyToMessageId,
    this.replyToMessage,
    this.isEdited = false,
    this.isPinned = false,
    this.isBookmarked = false,
    this.deliveryStatus = MessageDeliveryStatus.sent,
    this.linkedContent,
    int? readByCount,
  }) : _readByCount = readByCount ?? 0;

  ChatMessage copyWith({
    String? id,
    String? text,
    bool? isMe,
    DateTime? timestamp,
    String? senderName,
    String? senderAvatarUrl,
    bool? isAI,
    String? imagePath,
    MediaType? mediaType,
    String? mediaUrl,
    List<MessageAttachment>? attachments,
    Map<String, int>? reactions,
    String? replyToMessageId,
    ChatMessage? replyToMessage,
    bool? isEdited,
    bool? isPinned,
    bool? isBookmarked,
    MessageDeliveryStatus? deliveryStatus,
    List<Map<String, dynamic>>? linkedContent,
    int? readByCount,
  }) {
    return ChatMessage(
      id: id ?? this.id,
      text: text ?? this.text,
      isMe: isMe ?? this.isMe,
      timestamp: timestamp ?? this.timestamp,
      senderName: senderName ?? this.senderName,
      senderAvatarUrl: senderAvatarUrl ?? this.senderAvatarUrl,
      isAI: isAI ?? this.isAI,
      imagePath: imagePath ?? this.imagePath,
      mediaType: mediaType ?? this.mediaType,
      mediaUrl: mediaUrl ?? this.mediaUrl,
      attachments: attachments ?? this.attachments,
      reactions: reactions ?? this.reactions,
      replyToMessageId: replyToMessageId ?? this.replyToMessageId,
      replyToMessage: replyToMessage ?? this.replyToMessage,
      isEdited: isEdited ?? this.isEdited,
      isPinned: isPinned ?? this.isPinned,
      isBookmarked: isBookmarked ?? this.isBookmarked,
      deliveryStatus: deliveryStatus ?? this.deliveryStatus,
      linkedContent: linkedContent ?? this.linkedContent,
      readByCount: readByCount ?? _readByCount ?? 0,
    );
  }
}

class MessageBubble extends StatelessWidget {
  final ChatMessage message;
  final bool showSenderName;
  final bool isChannel;
  final bool isBookmarked;
  final bool isPinned;
  final String?
  senderAvatarUrl; // Avatar URL for the message sender (other user)
  final String? currentUserAvatarUrl; // Avatar URL for the current user (me)

  // Poll-related fields
  final String? workspaceId;
  final String? currentUserId;
  final VoidCallback? onPollUpdated;

  /// Parse and format mentions in message text
  /// Converts @[Name] format to [@Name](mention:Name) for markdown rendering
  /// Also handles @channel mentions
  /// This removes the square brackets and allows styling via markdown links
  static String _formatMentions(String text) {
    // First, handle @channel mentions (no brackets)
    text = text.replaceAll('@channel', '[@channel](mention:channel)');

    // Then, handle @[Name] pattern (Name can contain spaces and other characters)
    final mentionRegex = RegExp(r'@\[([^\]]+)\]');
    return text.replaceAllMapped(mentionRegex, (match) {
      final name = match.group(1) ?? '';
      // Convert to markdown link format for blue styling
      return '[@$name](mention:$name)';
    });
  }

  /// Strip mention brackets for plain text display (e.g., in reply previews)
  /// Converts @[Name] to @Name and keeps @channel as is
  static String _stripMentionBrackets(String text) {
    // @channel stays as-is (already in correct format)

    // Strip brackets from @[Name] mentions
    final mentionRegex = RegExp(r'@\[([^\]]+)\]');
    return text.replaceAllMapped(mentionRegex, (match) {
      final name = match.group(1) ?? '';
      return '@$name';
    });
  }

  /// Strip HTML tags from text (for messages that come with HTML formatting)
  static String _stripHtmlTags(String text) {
    // Remove HTML tags like <p>, </p>, <br>, etc.
    final htmlTagRegex = RegExp(r'<[^>]*>');
    String stripped = text.replaceAll(htmlTagRegex, '');
    // Decode common HTML entities
    stripped = stripped
        .replaceAll('&nbsp;', ' ')
        .replaceAll('&amp;', '&')
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll('&quot;', '"')
        .replaceAll('&#39;', "'");
    return stripped.trim();
  }

  /// Format mentions for HTML rendering
  /// Converts various mention formats to styled HTML spans for display
  /// Handles:
  /// - @channel mentions (plain text)
  /// - @[Name] format (from Flutter app)
  /// - <span class="mention-blot" data-mention="Name">@Name</span> format (from web Quill editor)
  /// - <span class="mention-highlight" data-mention="Name">@Name</span> format (from web)
  ///
  /// This method is public so it can be reused in other screens (saved_messages_screen, etc.)
  static String formatMentionsForHtml(String text) {
    // First, handle web's mention-blot class (from Quill editor)
    // Pattern: <span class="mention-blot" data-mention="Name" ...>@Name</span>
    // Convert to our .mention class format
    final mentionBlotRegex = RegExp(
      r'<span[^>]*class="mention-blot"[^>]*data-mention="([^"]+)"[^>]*>@?[^<]*</span>',
      caseSensitive: false,
    );
    text = text.replaceAllMapped(mentionBlotRegex, (match) {
      final name = match.group(1) ?? '';
      return '<span class="mention" style="color: #2196F3; font-weight: 500;">@$name</span>';
    });

    // Also handle mention-highlight class (another web format)
    // Pattern: <span class="mention-highlight" data-mention="Name" ...>@Name</span>
    final mentionHighlightRegex = RegExp(
      r'<span[^>]*class="mention-highlight"[^>]*data-mention="([^"]+)"[^>]*>@?[^<]*</span>',
      caseSensitive: false,
    );
    text = text.replaceAllMapped(mentionHighlightRegex, (match) {
      final name = match.group(1) ?? '';
      return '<span class="mention" style="color: #2196F3; font-weight: 500;">@$name</span>';
    });

    // Handle @channel mentions (plain text - no brackets)
    text = text.replaceAll(
      '@channel',
      '<span class="mention" style="color: #2196F3; font-weight: 500;">@channel</span>',
    );

    // Handle @[Name] pattern (from Flutter app - Name can contain spaces and other characters)
    final bracketMentionRegex = RegExp(r'@\[([^\]]+)\]');
    text = text.replaceAllMapped(bracketMentionRegex, (match) {
      final name = match.group(1) ?? '';
      return '<span class="mention" style="color: #2196F3; font-weight: 500;">@$name</span>';
    });

    return text;
  }

  /// Clean message text for display - strips HTML and mention brackets
  static String _cleanMessageText(String text) {
    String cleaned = _stripHtmlTags(text);
    cleaned = _stripMentionBrackets(cleaned);
    return cleaned;
  }

  /// Check if message text has actual content (not just empty HTML tags or whitespace)
  static bool _hasActualTextContent(String text) {
    if (text.isEmpty) return false;
    // Check if text contains images (GIFs, inline images)
    if (text.contains('<img') ||
        text.contains('giphy.com') ||
        text.contains('.gif')) {
      return true;
    }
    // Strip HTML tags and decode entities
    String stripped = _stripHtmlTags(text);
    // Remove all whitespace and check if anything remains
    stripped = stripped.replaceAll(RegExp(r'\s+'), '').trim();
    return stripped.isNotEmpty;
  }

  /// Build linked content display widget (for notes, events, files, polls attached via /)
  Widget _buildLinkedContentDisplay(
    BuildContext context,
    List<Map<String, dynamic>> linkedContent,
  ) {
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children:
            linkedContent.map((item) {
              final type = item['type'] as String? ?? 'file';
              final id = item['id'] as String? ?? '';
              final title =
                  item['title'] as String? ??
                  item['name'] as String? ??
                  'Untitled';

              // Handle poll type - use interactive PollMessageWidget
              if (type.toLowerCase() == 'poll') {
                // Use PollMessageWidget for interactive voting
                if (workspaceId != null && currentUserId != null) {
                  final pollData = item['poll'] ?? item;
                  final createdBy =
                      pollData['createdBy'] ?? pollData['created_by'] ?? '';

                  return PollMessageWidget(
                    key: ValueKey('poll_${pollData['id'] ?? item['id']}'),
                    messageId: message.id,
                    workspaceId: workspaceId!,
                    pollData: item,
                    currentUserId: currentUserId!,
                    isCreator: createdBy == currentUserId,
                    onPollUpdated: onPollUpdated,
                  );
                } else {
                  // Fallback to simple poll card if required data is not available
                  return _buildSimplePollCard(context, item);
                }
              }

              IconData icon;
              Color color;
              String typeLabel;

              switch (type.toLowerCase()) {
                case 'notes':
                case 'note':
                  icon = Icons.description_outlined;
                  color = Colors.blue;
                  typeLabel = 'NOTE';
                  break;
                case 'events':
                case 'event':
                  icon = Icons.event_outlined;
                  color = Colors.green;
                  typeLabel = 'EVENT';
                  break;
                case 'files':
                case 'file':
                default:
                  icon = Icons.insert_drive_file_outlined;
                  color = Colors.orange;
                  typeLabel = 'FILE';
                  break;
              }

              return GestureDetector(
                onTap: () {
                  if (onOpenLinkedContent != null) {
                    onOpenLinkedContent!(type, id, title);
                  }
                },
                child: Container(
                  margin: const EdgeInsets.only(bottom: 4),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: color.withOpacity(0.2), width: 1),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 10,
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(icon, size: 18, color: color),
                        const SizedBox(width: 10),
                        Text(
                          typeLabel,
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: color,
                            letterSpacing: 0.5,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Flexible(
                          child: Text(
                            title,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                              color: Theme.of(context).colorScheme.onSurface,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Icon(
                          Icons.open_in_new,
                          size: 14,
                          color: Theme.of(
                            context,
                          ).colorScheme.onSurface.withOpacity(0.5),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }).toList(),
      ),
    );
  }

  /// Build a simple poll card for display (without full interactivity)
  Widget _buildSimplePollCard(BuildContext context, Map<String, dynamic> item) {
    final pollData = item['poll'] ?? item;
    final question = pollData['question'] ?? item['title'] ?? 'Poll';
    final options = (pollData['options'] as List<dynamic>?) ?? [];
    final isOpen = pollData['isOpen'] ?? pollData['is_open'] ?? true;
    final totalVotes = pollData['totalVotes'] ?? pollData['total_votes'] ?? 0;
    final primaryColor = AppTheme.primaryLight;

    return Container(
      margin: const EdgeInsets.only(bottom: 4),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: primaryColor.withOpacity(0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: primaryColor.withOpacity(0.2), width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Poll header
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: primaryColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Icon(Icons.bar_chart, color: primaryColor, size: 16),
              ),
              const SizedBox(width: 8),
              Text(
                'poll.title'.tr(),
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                  color: primaryColor,
                ),
              ),
              const Spacer(),
              if (!isOpen)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.grey.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    'poll.closed'.tr(),
                    style: TextStyle(fontSize: 10, color: Colors.grey[600]),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),

          // Question
          Text(
            question,
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),

          // Options preview
          ...options.take(3).map((option) {
            final text = option['text'] ?? '';
            return Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Row(
                children: [
                  Container(
                    width: 16,
                    height: 16,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.grey[400]!),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    text,
                    style: TextStyle(fontSize: 13, color: Colors.grey[700]),
                  ),
                ],
              ),
            );
          }),

          if (options.length > 3)
            Text(
              '+${options.length - 3} more options',
              style: TextStyle(fontSize: 12, color: Colors.grey[500]),
            ),

          const SizedBox(height: 8),

          // Total votes
          Text(
            'poll.total_votes'.tr(args: [totalVotes.toString()]),
            style: TextStyle(fontSize: 11, color: Colors.grey[500]),
          ),
        ],
      ),
    );
  }

  final Function(ChatMessage, String)? onReact;
  final Function(ChatMessage)? onReply;
  final Function(ChatMessage)? onMore;
  final Function(ChatMessage)? onDelete;
  final Function(ChatMessage, String)? onEdit;
  final Function(ChatMessage)? onPin;
  final Function(ChatMessage)? onBookmark;
  final ScrollController? scrollController;
  final List<ChatMessage>? messages;
  final Function(BuildContext, String)? onShowFullScreenImage;
  final Function(String, MediaType)? onDownloadMedia;
  final Function(BuildContext, String, MediaType)? onShowMediaOptions;
  final Function(String, String)? onDownloadFile;
  final Function(String type, String id, String title)? onOpenLinkedContent;

  // Inline editing props
  final bool isEditing;
  final TextEditingController? editController;
  final FocusNode? editFocusNode;
  final VoidCallback? onCancelEdit;
  final VoidCallback? onSaveEdit;
  final Function(ChatMessage)? onStartEdit; // New callback to start editing

  // Selection mode props
  final bool isSelectionMode;
  final bool isSelected;
  final VoidCallback? onSelect;
  final VoidCallback? onLongPressToSelect; // Long press to enter selection mode

  const MessageBubble({
    super.key,
    required this.message,
    this.showSenderName = false,
    this.isChannel = false,
    this.isBookmarked = false,
    this.isPinned = false,
    this.senderAvatarUrl,
    this.currentUserAvatarUrl,
    this.onReact,
    this.onReply,
    this.onMore,
    this.onDelete,
    this.onEdit,
    this.onPin,
    this.onBookmark,
    this.scrollController,
    this.messages,
    this.onShowFullScreenImage,
    this.onDownloadMedia,
    this.onShowMediaOptions,
    this.onDownloadFile,
    this.onOpenLinkedContent,
    this.isEditing = false,
    this.editController,
    this.editFocusNode,
    this.onCancelEdit,
    this.onSaveEdit,
    this.onStartEdit,
    this.isSelectionMode = false,
    this.isSelected = false,
    this.onSelect,
    this.onLongPressToSelect,
    this.workspaceId,
    this.currentUserId,
    this.onPollUpdated,
  });

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: isSelectionMode ? onSelect : null,
      onLongPress: isSelectionMode ? null : onLongPressToSelect,
      behavior: HitTestBehavior.opaque,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
        decoration:
            isSelected
                ? BoxDecoration(
                  color:
                      isDarkMode
                          ? Colors.blue.withOpacity(0.15)
                          : Colors.blue.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(12),
                )
                : null,
        padding:
            isSelectionMode
                ? const EdgeInsets.symmetric(vertical: 4, horizontal: 4)
                : null,
        child: Row(
          mainAxisAlignment:
              message.isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Selection checkbox (shown when in selection mode)
            if (isSelectionMode) ...[
              GestureDetector(
                onTap: onSelect,
                child: Container(
                  width: 28,
                  height: 28,
                  margin: const EdgeInsets.only(right: 8, top: 4),
                  decoration: BoxDecoration(
                    color:
                        isSelected
                            ? Colors.blue.shade500
                            : (isDarkMode
                                ? Colors.grey.shade800
                                : Colors.white),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(
                      color:
                          isSelected
                              ? Colors.blue.shade500
                              : (isDarkMode
                                  ? Colors.grey.shade600
                                  : Colors.grey.shade300),
                      width: 2,
                    ),
                  ),
                  child:
                      isSelected
                          ? const Icon(
                            Icons.check,
                            size: 18,
                            color: Colors.white,
                          )
                          : null,
                ),
              ),
            ],
            // Avatar on left for received messages
            if (!message.isMe)
              CircleAvatar(
                radius: 18,
                backgroundColor:
                    message.senderName != null
                        ? Colors.primaries[message.senderName!.hashCode %
                            Colors.primaries.length]
                        : Colors.grey[400],
                backgroundImage:
                    senderAvatarUrl != null && senderAvatarUrl!.isNotEmpty
                        ? NetworkImage(senderAvatarUrl!)
                        : null,
                child:
                    senderAvatarUrl == null || senderAvatarUrl!.isEmpty
                        ? Text(
                          (message.senderName ?? 'U')[0].toUpperCase(),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                          ),
                        )
                        : null,
              ),
            if (!message.isMe) const SizedBox(width: 12),

            // Message content
            Flexible(
              child: Column(
                crossAxisAlignment:
                    message.isMe
                        ? CrossAxisAlignment.end
                        : CrossAxisAlignment.start,
                children: [
                  // Sender name, timestamp, and menu button
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        message.isMe
                            ? 'You'
                            : (message.senderName ?? 'Unknown User'),
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: isDarkMode ? Colors.white : Colors.black87,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _ChatScreenState.formatTimestampStatic(
                          message.timestamp,
                        ),
                        style: TextStyle(
                          color:
                              isDarkMode ? Colors.grey[400] : Colors.grey[600],
                          fontSize: 11,
                        ),
                      ),
                      if (message.isEdited) ...[
                        const SizedBox(width: 6),
                        Text(
                          '(edited)',
                          style: TextStyle(
                            color:
                                isDarkMode
                                    ? Colors.grey[500]
                                    : Colors.grey[500],
                            fontSize: 10,
                            fontStyle: FontStyle.italic,
                          ),
                        ),
                      ],
                      if (isPinned) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.amber.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.push_pin,
                                size: 12,
                                color: Colors.amber[700],
                              ),
                              const SizedBox(width: 4),
                              Text(
                                'Pinned',
                                style: TextStyle(
                                  color: Colors.amber[700],
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                      if (isBookmarked) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.blue.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.bookmark,
                                size: 12,
                                color: Colors.blue[700],
                              ),
                              const SizedBox(width: 4),
                              Text(
                                'Saved',
                                style: TextStyle(
                                  color: Colors.blue[700],
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                      // Three-dot menu button (hidden in selection mode)
                      if (!isSelectionMode) ...[
                        const SizedBox(width: 8),
                        GestureDetector(
                          onTapDown: (details) {
                            _showMessageActions(
                              context,
                              details.globalPosition,
                            );
                          },
                          child: Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 4,
                              vertical: 2,
                            ),
                            child: Icon(
                              Icons.more_vert,
                              size: 18,
                              color:
                                  isDarkMode
                                      ? Colors.grey[500]
                                      : Colors.grey[600],
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  // Only add spacing if there's message content to show
                  if (message.replyToMessage != null ||
                      message.mediaType != null ||
                      message.imagePath != null ||
                      _hasActualTextContent(message.text) ||
                      (message.linkedContent != null &&
                          message.linkedContent!.isNotEmpty))
                    const SizedBox(height: 4),

                  // Message bubble - only render if there's content inside
                  if (message.replyToMessage != null ||
                      message.mediaType != null ||
                      message.imagePath != null ||
                      _hasActualTextContent(message.text) ||
                      (message.linkedContent != null &&
                          message.linkedContent!.isNotEmpty))
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.transparent,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Column(
                        crossAxisAlignment:
                            message.isMe
                                ? CrossAxisAlignment.end
                                : CrossAxisAlignment.start,
                        children: [
                          // Show replied message if exists
                          if (message.replyToMessage != null)
                            GestureDetector(
                              onTap: () {
                                // Navigate to the original message
                                if (scrollController != null &&
                                    messages != null) {
                                  final originalIndex = messages!.indexWhere(
                                    (m) =>
                                        m.timestamp ==
                                            message.replyToMessage!.timestamp &&
                                        m.text == message.replyToMessage!.text,
                                  );
                                  if (originalIndex != -1) {
                                    scrollController!.animateTo(
                                      originalIndex *
                                          80.0, // Approximate message height
                                      duration: const Duration(
                                        milliseconds: 300,
                                      ),
                                      curve: Curves.easeInOut,
                                    );
                                  }
                                }
                              },
                              child: Container(
                                margin: const EdgeInsets.only(bottom: 8),
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color:
                                      message.isMe
                                          ? (Theme.of(context).brightness ==
                                                  Brightness.dark
                                              ? Colors.white.withValues(
                                                alpha: 0.1,
                                              )
                                              : Colors.black87.withValues(
                                                alpha: 0.1,
                                              ))
                                          : Theme.of(context)
                                              .colorScheme
                                              .onSurfaceVariant
                                              .withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(2),
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 3,
                                      height: 30,
                                      decoration: BoxDecoration(
                                        color:
                                            message.isMe
                                                ? (Theme.of(
                                                          context,
                                                        ).brightness ==
                                                        Brightness.dark
                                                    ? Colors.white.withValues(
                                                      alpha: 0.5,
                                                    )
                                                    : Colors.black87.withValues(
                                                      alpha: 0.5,
                                                    ))
                                                : Colors.blue,
                                        borderRadius: BorderRadius.circular(1),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            message
                                                    .replyToMessage!
                                                    .senderName ??
                                                (message.replyToMessage!.isMe
                                                    ? 'You'
                                                    : 'User'),
                                            style: TextStyle(
                                              color:
                                                  message.isMe
                                                      ? (Theme.of(
                                                                context,
                                                              ).brightness ==
                                                              Brightness.dark
                                                          ? Colors.white
                                                          : Colors.black87)
                                                      : Colors.blue,
                                              fontSize: 12,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                          Text(
                                            _cleanMessageText(
                                              message.replyToMessage!.text,
                                            ),
                                            maxLines: 2,
                                            overflow: TextOverflow.ellipsis,
                                            style: TextStyle(
                                              color:
                                                  message.isMe
                                                      ? (Theme.of(
                                                                context,
                                                              ).brightness ==
                                                              Brightness.dark
                                                          ? Colors.white
                                                              .withValues(
                                                                alpha: 0.8,
                                                              )
                                                          : Colors.black87
                                                              .withValues(
                                                                alpha: 0.8,
                                                              ))
                                                      : Theme.of(context)
                                                          .colorScheme
                                                          .onSurfaceVariant
                                                          .withValues(
                                                            alpha: 0.8,
                                                          ),
                                              fontSize: 13,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          if (message.mediaType != null ||
                              message.imagePath != null)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: _buildMediaWidget(context, message),
                            ),
                          if (_hasActualTextContent(message.text))
                            Column(
                              crossAxisAlignment:
                                  message.isMe
                                      ? CrossAxisAlignment.end
                                      : CrossAxisAlignment.start,
                              children: [
                                // Show TextField when editing, Html widget otherwise
                                if (isEditing &&
                                    editController != null &&
                                    editFocusNode != null)
                                  Container(
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 4,
                                    ),
                                    child: Column(
                                      children: [
                                        TextField(
                                          controller: editController,
                                          focusNode: editFocusNode,
                                          maxLines: null,
                                          style: const TextStyle(
                                            color: Colors.black,
                                            fontSize: 15,
                                          ),
                                          decoration: const InputDecoration(
                                            border: InputBorder.none,
                                            isDense: true,
                                            contentPadding: EdgeInsets.zero,
                                          ),
                                        ),
                                        const SizedBox(height: 8),
                                        Row(
                                          mainAxisAlignment:
                                              MainAxisAlignment.end,
                                          children: [
                                            TextButton(
                                              onPressed: onCancelEdit,
                                              child: const Text('Cancel'),
                                            ),
                                            const SizedBox(width: 8),
                                            ElevatedButton(
                                              onPressed: onSaveEdit,
                                              style: ElevatedButton.styleFrom(
                                                backgroundColor: Colors.blue,
                                                foregroundColor: Colors.white,
                                              ),
                                              child: const Text('Save'),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  )
                                else
                                  Html(
                                    data: formatMentionsForHtml(message.text),
                                    onLinkTap: (
                                      url,
                                      attributes,
                                      element,
                                    ) async {
                                      if (url != null) {
                                        final uri = Uri.tryParse(url);
                                        if (uri != null) {
                                          // Check if this is a Deskive video call link
                                          final isDeskiveCallLink =
                                              (uri.host == 'deskive.com' ||
                                                  uri.host ==
                                                      'www.deskive.com') &&
                                              uri.pathSegments.isNotEmpty &&
                                              uri.pathSegments[0] == 'call' &&
                                              uri.pathSegments.length >= 3;

                                          if (isDeskiveCallLink) {
                                            // Extract workspaceId and callId from URL
                                            // Format: https://deskive.com/call/{workspaceId}/{callId}
                                            final workspaceId =
                                                uri.pathSegments[1];
                                            final callId = uri.pathSegments[2];

                                            debugPrint(
                                              '🔗 [ChatScreen] Deskive call link detected!',
                                            );
                                            debugPrint(
                                              '🔗 [ChatScreen] Workspace ID: $workspaceId',
                                            );
                                            debugPrint(
                                              '🔗 [ChatScreen] Call ID: $callId',
                                            );

                                            // Navigate to VideoCallJoinScreen
                                            Navigator.of(context).push(
                                              MaterialPageRoute(
                                                builder:
                                                    (context) =>
                                                        VideoCallJoinScreen(
                                                          callId: callId,
                                                          workspaceId:
                                                              workspaceId,
                                                        ),
                                              ),
                                            );
                                          } else {
                                            // External link - open in browser
                                            try {
                                              await launchUrl(
                                                uri,
                                                mode:
                                                    LaunchMode
                                                        .externalApplication,
                                              );
                                            } catch (e) {
                                              debugPrint(
                                                'Could not launch $url: $e',
                                              );
                                            }
                                          }
                                        }
                                      }
                                    },
                                    style: {
                                      "body": Style(
                                        margin: Margins.zero,
                                        padding: HtmlPaddings.zero,
                                        color:
                                            message.isMe
                                                ? (Theme.of(
                                                          context,
                                                        ).brightness ==
                                                        Brightness.dark
                                                    ? Colors.white
                                                    : Colors.black87)
                                                : Theme.of(
                                                  context,
                                                ).colorScheme.onSurfaceVariant,
                                        fontSize: FontSize(15),
                                        fontWeight: FontWeight.w400,
                                        lineHeight: LineHeight(1.4),
                                        letterSpacing: 0.2,
                                        textAlign:
                                            message.isMe
                                                ? TextAlign.right
                                                : TextAlign.left,
                                      ),
                                      "p": Style(
                                        margin: Margins.zero,
                                        padding: HtmlPaddings.zero,
                                        textAlign:
                                            message.isMe
                                                ? TextAlign.right
                                                : TextAlign.left,
                                      ),
                                      "a": Style(
                                        color: Colors.blue,
                                        textDecoration: TextDecoration.none,
                                        fontWeight: FontWeight.w500,
                                      ),
                                      "strong": Style(
                                        fontWeight: FontWeight.bold,
                                      ),
                                      "b": Style(fontWeight: FontWeight.bold),
                                      "em": Style(fontStyle: FontStyle.italic),
                                      "i": Style(fontStyle: FontStyle.italic),
                                      "code": Style(
                                        backgroundColor:
                                            message.isMe
                                                ? Colors.black.withOpacity(0.2)
                                                : Colors.grey.withOpacity(0.2),
                                        fontFamily: 'monospace',
                                      ),
                                      "del": Style(
                                        textDecoration:
                                            TextDecoration.lineThrough,
                                      ),
                                      "s": Style(
                                        textDecoration:
                                            TextDecoration.lineThrough,
                                      ),
                                      "u": Style(
                                        textDecoration:
                                            TextDecoration.underline,
                                      ),
                                      "ul": Style(
                                        margin:
                                            message.isMe
                                                ? Margins.only(
                                                  right: 16,
                                                  top: 4,
                                                  bottom: 4,
                                                )
                                                : Margins.only(
                                                  left: 16,
                                                  top: 4,
                                                  bottom: 4,
                                                ),
                                        padding: HtmlPaddings.zero,
                                        textAlign:
                                            message.isMe
                                                ? TextAlign.right
                                                : TextAlign.left,
                                        listStylePosition:
                                            message.isMe
                                                ? ListStylePosition.inside
                                                : ListStylePosition.outside,
                                      ),
                                      "ol": Style(
                                        margin:
                                            message.isMe
                                                ? Margins.only(
                                                  right: 16,
                                                  top: 4,
                                                  bottom: 4,
                                                )
                                                : Margins.only(
                                                  left: 16,
                                                  top: 4,
                                                  bottom: 4,
                                                ),
                                        padding: HtmlPaddings.zero,
                                        textAlign:
                                            message.isMe
                                                ? TextAlign.right
                                                : TextAlign.left,
                                        listStylePosition:
                                            message.isMe
                                                ? ListStylePosition.inside
                                                : ListStylePosition.outside,
                                      ),
                                      "li": Style(
                                        margin: Margins.only(bottom: 2),
                                        textAlign:
                                            message.isMe
                                                ? TextAlign.right
                                                : TextAlign.left,
                                      ),
                                      "blockquote": Style(
                                        fontStyle: FontStyle.italic,
                                        backgroundColor:
                                            message.isMe
                                                ? Colors.black.withOpacity(0.1)
                                                : Colors.grey.withOpacity(0.1),
                                        border: Border(
                                          left: BorderSide(
                                            color:
                                                message.isMe
                                                    ? (Theme.of(
                                                              context,
                                                            ).brightness ==
                                                            Brightness.dark
                                                        ? Colors.white
                                                            .withOpacity(0.5)
                                                        : Colors.black87
                                                            .withOpacity(0.5))
                                                    : Colors.blue.withOpacity(
                                                      0.5,
                                                    ),
                                            width: 3,
                                          ),
                                        ),
                                      ),
                                      "pre": Style(
                                        backgroundColor:
                                            message.isMe
                                                ? Colors.black.withOpacity(0.3)
                                                : Colors.grey.withOpacity(0.2),
                                        padding: HtmlPaddings.all(8),
                                      ),
                                      ".mention": Style(
                                        color: Colors.blue,
                                        fontWeight: FontWeight.w500,
                                      ),
                                      "img": Style(
                                        display: Display.block,
                                        margin: Margins.symmetric(vertical: 4),
                                      ),
                                      ".chat-gif": Style(
                                        display: Display.block,
                                        margin: Margins.symmetric(vertical: 4),
                                      ),
                                    },
                                    extensions: [
                                      TagExtension(
                                        tagsToExtend: {"img"},
                                        builder: (extensionContext) {
                                          final src =
                                              extensionContext
                                                  .attributes['src'] ??
                                              '';
                                          if (src.isEmpty)
                                            return const SizedBox.shrink();

                                          // Check if it's a GIF
                                          final isGif =
                                              src.contains('.gif') ||
                                              src.contains('giphy.com') ||
                                              extensionContext
                                                      .attributes['class']
                                                      ?.contains('chat-gif') ==
                                                  true;

                                          return ClipRRect(
                                            borderRadius: BorderRadius.circular(
                                              8,
                                            ),
                                            child: ConstrainedBox(
                                              constraints: BoxConstraints(
                                                maxWidth: isGif ? 250 : 300,
                                                maxHeight: isGif ? 200 : 300,
                                              ),
                                              child: Image.network(
                                                src,
                                                fit: BoxFit.contain,
                                                loadingBuilder: (
                                                  context,
                                                  child,
                                                  loadingProgress,
                                                ) {
                                                  if (loadingProgress == null)
                                                    return child;
                                                  return Container(
                                                    width: 150,
                                                    height: 100,
                                                    decoration: BoxDecoration(
                                                      color: Colors.grey[300],
                                                      borderRadius:
                                                          BorderRadius.circular(
                                                            8,
                                                          ),
                                                    ),
                                                    child: Center(
                                                      child: CircularProgressIndicator(
                                                        value:
                                                            loadingProgress
                                                                        .expectedTotalBytes !=
                                                                    null
                                                                ? loadingProgress
                                                                        .cumulativeBytesLoaded /
                                                                    loadingProgress
                                                                        .expectedTotalBytes!
                                                                : null,
                                                        strokeWidth: 2,
                                                      ),
                                                    ),
                                                  );
                                                },
                                                errorBuilder: (
                                                  context,
                                                  error,
                                                  stackTrace,
                                                ) {
                                                  return Container(
                                                    width: 150,
                                                    height: 100,
                                                    decoration: BoxDecoration(
                                                      color: Colors.grey[300],
                                                      borderRadius:
                                                          BorderRadius.circular(
                                                            8,
                                                          ),
                                                    ),
                                                    child: const Center(
                                                      child: Icon(
                                                        Icons.broken_image,
                                                        color: Colors.grey,
                                                      ),
                                                    ),
                                                  );
                                                },
                                              ),
                                            ),
                                          );
                                        },
                                      ),
                                    ],
                                  ),
                              ],
                            ),
                        ],
                      ),
                    ),

                  // Show linked content (notes, events, files)
                  if (message.linkedContent != null &&
                      message.linkedContent!.isNotEmpty)
                    _buildLinkedContentDisplay(context, message.linkedContent!),

                  // Show reactions if any
                  if (message.reactions.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Wrap(
                        spacing: 4,
                        children:
                            message.reactions.entries.map((entry) {
                              return GestureDetector(
                                onTap: () => onReact?.call(message, entry.key),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 2,
                                  ),
                                  decoration: BoxDecoration(
                                    color:
                                        Theme.of(
                                          context,
                                        ).colorScheme.surfaceContainerHighest,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                      color: Theme.of(context)
                                          .colorScheme
                                          .outline
                                          .withValues(alpha: 0.2),
                                    ),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Text(
                                        entry.key,
                                        style: const TextStyle(fontSize: 14),
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        entry.value.toString(),
                                        style: Theme.of(
                                          context,
                                        ).textTheme.bodySmall?.copyWith(
                                          color:
                                              Theme.of(
                                                context,
                                              ).colorScheme.onSurfaceVariant,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            }).toList(),
                      ),
                    ),

                  // Show read receipt count (only for sent messages with readers)
                  if (message.isMe && message.readByCount > 0)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.done_all,
                            size: 14,
                            color: Theme.of(context).colorScheme.primary,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'Read by ${message.readByCount} ${message.readByCount == 1 ? 'person' : 'people'}',
                            style: Theme.of(
                              context,
                            ).textTheme.bodySmall?.copyWith(
                              fontSize: 11,
                              color:
                                  Theme.of(
                                    context,
                                  ).colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),

            // Avatar on right for sent messages
            if (message.isMe) const SizedBox(width: 12),
            if (message.isMe)
              CircleAvatar(
                radius: 18,
                backgroundColor: AppTheme.infoLight,
                backgroundImage:
                    currentUserAvatarUrl != null &&
                            currentUserAvatarUrl!.isNotEmpty
                        ? NetworkImage(currentUserAvatarUrl!)
                        : null,
                child:
                    currentUserAvatarUrl == null ||
                            currentUserAvatarUrl!.isEmpty
                        ? const Text(
                          'Y',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                          ),
                        )
                        : null,
              ),
          ],
        ),
      ),
    );
  }

  // Build delivery status icon (like WhatsApp checkmarks)
  static Widget _buildDeliveryStatusIcon(
    MessageDeliveryStatus status,
    BuildContext context,
  ) {
    IconData icon;
    Color color;

    switch (status) {
      case MessageDeliveryStatus.sending:
        // Clock icon for sending
        icon = Icons.access_time;
        color = Colors.grey.shade400;
        break;
      case MessageDeliveryStatus.sent:
        // Single checkmark for sent
        icon = Icons.check;
        color = Colors.grey.shade400;
        break;
      case MessageDeliveryStatus.delivered:
        // Double checkmark for delivered - GREEN like WhatsApp
        icon = Icons.done_all;
        color = Colors.green.shade600;
        break;
      case MessageDeliveryStatus.read:
        // Blue double checkmark for read
        icon = Icons.done_all;
        color = Colors.blue.shade400;
        break;
      case MessageDeliveryStatus.failed:
        // Error icon for failed
        icon = Icons.error_outline;
        color = Colors.red.shade400;
        break;
    }

    return Icon(icon, size: 14, color: color);
  }

  void _showMessageActions(BuildContext context, Offset tapPosition) {
    final size = MediaQuery.of(context).size;

    debugPrint(
      '🔍 Message Actions - isMe: ${message.isMe}, messageId: ${message.id}, text: "${message.text.substring(0, message.text.length > 30 ? 30 : message.text.length)}"',
    );

    // Build list of actions based on message ownership
    List<Widget> actions = [
      _buildCompactAction(context, Icons.add_reaction_outlined, 'React', () {
        Navigator.of(context).pop();
        _showReactionPicker(context, message);
      }),
      const SizedBox(width: 16),
      _buildCompactAction(context, Icons.reply_outlined, 'Reply', () {
        Navigator.of(context).pop();
        onReply?.call(message);
      }),
    ];

    // Add Edit and Delete for user's own messages
    if (message.isMe) {
      actions.addAll([
        const SizedBox(width: 16),
        _buildCompactAction(context, Icons.edit_outlined, 'Edit', () {
          Navigator.of(context).pop();
          if (onStartEdit != null) {
            onStartEdit!(message);
          }
        }),
        const SizedBox(width: 16),
        _buildCompactAction(context, Icons.delete_outline, 'Delete', () {
          Navigator.of(context).pop();
          if (onDelete != null) {
            onDelete!(message);
          }
        }, color: Colors.red),
      ]);
    }

    // Always show More option
    actions.addAll([
      const SizedBox(width: 16),
      _buildCompactAction(context, Icons.more_horiz, 'More', () {
        Navigator.of(context).pop();
        _showMoreOptions(context, message);
      }),
    ]);

    // Calculate popup width based on number of actions
    final actionCount =
        message.isMe
            ? 5
            : 3; // React, Reply, Edit, Delete, More OR React, Reply, More
    final popupWidth =
        (actionCount * 48.0) +
        ((actionCount - 1) * 16.0) +
        24.0; // icon width + spacing + padding

    // Adjust position to ensure popup stays within screen bounds
    double left =
        tapPosition.dx -
        (popupWidth / 2); // Center the popup horizontally on tap
    double top = tapPosition.dy - 60; // Show popup above the tap point

    // Keep popup within screen bounds
    if (left < 16) left = 16;
    if (left > size.width - popupWidth - 16)
      left = size.width - popupWidth - 16;
    if (top < 50) top = tapPosition.dy + 20; // Show below if too close to top

    final OverlayEntry overlayEntry = OverlayEntry(
      builder:
          (context) => Stack(
            children: [
              // Transparent background to capture taps
              Positioned.fill(
                child: GestureDetector(
                  onTap: () => Navigator.of(context).pop(),
                  child: Container(color: Colors.transparent),
                ),
              ),
              // Popup menu
              Positioned(
                left: left,
                top: top,
                child: Material(
                  elevation: 8,
                  borderRadius: BorderRadius.circular(2),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.surface,
                      borderRadius: BorderRadius.circular(2),
                      border: Border.all(
                        color: Theme.of(
                          context,
                        ).colorScheme.outline.withValues(alpha: 0.2),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: actions,
                    ),
                  ),
                ),
              ),
            ],
          ),
    );

    Navigator.of(context).push(
      PageRouteBuilder(
        opaque: false,
        pageBuilder:
            (context, animation, secondaryAnimation) =>
                overlayEntry.builder(context),
        transitionDuration: const Duration(milliseconds: 150),
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          return FadeTransition(
            opacity: animation,
            child: ScaleTransition(
              scale: Tween<double>(begin: 0.8, end: 1.0).animate(
                CurvedAnimation(parent: animation, curve: Curves.easeOutBack),
              ),
              child: child,
            ),
          );
        },
      ),
    );
  }

  Widget _buildCompactAction(
    BuildContext context,
    IconData icon,
    String label,
    VoidCallback onTap, {
    Color? color,
  }) {
    final actionColor = color ?? Colors.blue;
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: actionColor.withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: actionColor, size: 20),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              fontSize: 11,
              fontWeight: FontWeight.w500,
              color: actionColor,
            ),
          ),
        ],
      ),
    );
  }

  void _showMoreOptions(BuildContext context, ChatMessage message) {
    showDialog(
      context: context,
      builder:
          (context) => AlertDialog(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(5),
            ),
            contentPadding: const EdgeInsets.all(16),
            content: SizedBox(
              width: double.maxFinite,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'More Options',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 16),
                  _buildMoreOption(
                    context,
                    isPinned ? Icons.push_pin : Icons.push_pin_outlined,
                    isPinned ? 'Unpin message' : 'Pin message',
                    () {
                      if (onPin != null) onPin!(message);
                    },
                  ),
                  _buildMoreOption(
                    context,
                    isBookmarked ? Icons.bookmark : Icons.bookmark_border,
                    isBookmarked ? 'Remove bookmark' : 'Bookmark message',
                    () {
                      if (onBookmark != null) {
                        onBookmark!(message);
                      }
                    },
                  ),
                  // COMMENTED OUT - Copy link
                  // _buildMoreOption(context, Icons.link, 'Copy link', () {
                  //   _copyMessageLink(context, message);
                  // }),
                  // COMMENTED OUT - Copy message
                  // _buildMoreOption(context, Icons.copy, 'Copy message', () {
                  //   _copyMessage(context, message);
                  // }),
                  // COMMENTED OUT - AI summarize
                  // _buildMoreOption(context, Icons.auto_awesome, 'AI summarize', () {
                  //   _aiSummarize(context, message);
                  // }),
                ],
              ),
            ),
          ),
    );
  }

  Widget _buildMoreOption(
    BuildContext context,
    IconData icon,
    String title,
    VoidCallback onTap, {
    bool isDestructive = false,
  }) {
    return ListTile(
      dense: true,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      leading: Icon(
        icon,
        size: 20,
        color:
            isDestructive
                ? Colors.red
                : Theme.of(context).colorScheme.onSurface,
      ),
      title: Text(
        title,
        style: TextStyle(
          fontSize: 14,
          color:
              isDestructive
                  ? Colors.red
                  : Theme.of(context).colorScheme.onSurface,
        ),
      ),
      onTap: () {
        Navigator.pop(context);
        onTap();
      },
    );
  }

  // Forward message functionality
  void _forwardMessage(BuildContext context, ChatMessage message) {
    showDialog(
      context: context,
      builder:
          (context) => AlertDialog(
            title: Row(
              children: [
                Icon(Icons.forward, color: Colors.blue),
                const SizedBox(width: 8),
                const Text('Forward Message'),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Forward to:',
                  style: Theme.of(context).textTheme.labelLarge,
                ),
                const SizedBox(height: 16),
                ListTile(
                  leading: const CircleAvatar(child: Icon(Icons.person)),
                  title: const Text('John Doe'),
                  subtitle: const Text('Active now'),
                  onTap: () {
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Message forwarded to John Doe')),
                    );
                  },
                ),
                ListTile(
                  leading: const CircleAvatar(child: Icon(Icons.group)),
                  title: const Text('Team Chat'),
                  subtitle: const Text('5 members'),
                  onTap: () {
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Message forwarded to Team Chat')),
                    );
                  },
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
            ],
          ),
    );
  }

  // Copy message link functionality
  void _copyMessageLink(BuildContext context, ChatMessage message) {
    // Generate a unique message link
    final messageLink =
        'workspace://chat/message/${message.timestamp.millisecondsSinceEpoch}';

    Clipboard.setData(ClipboardData(text: messageLink));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(Icons.link, color: Colors.white, size: 20),
            SizedBox(width: 8),
            Text('Message link copied to clipboard'),
          ],
        ),
      ),
    );
  }

  // Copy message functionality
  void _copyMessage(BuildContext context, ChatMessage message) {
    String textToCopy = message.text;
    if (message.mediaType != null) {
      textToCopy =
          '${message.text}\n[Attachment: ${message.mediaType.toString().split('.').last}]';
    }

    Clipboard.setData(ClipboardData(text: textToCopy));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(Icons.copy, color: Colors.white, size: 20),
            SizedBox(width: 8),
            Text('Message copied to clipboard'),
          ],
        ),
        duration: Duration(seconds: 2),
      ),
    );
  }

  // AI summarize functionality
  void _aiSummarize(BuildContext context, ChatMessage message) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder:
          (context) => AlertDialog(
            title: Row(
              children: [
                Icon(Icons.smart_toy, color: Colors.blue),
                const SizedBox(width: 8),
                const Text('AI Summary'),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const LinearProgressIndicator(),
                const SizedBox(height: 16),
                const Text('Generating AI summary...'),
                const SizedBox(height: 8),
                Text(
                  'Original: "${message.text.length > 100 ? '${message.text.substring(0, 100)}...' : message.text}"',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
    );

    // Simulate AI processing
    Future.delayed(const Duration(seconds: 2), () {
      Navigator.pop(context);
      showDialog(
        context: context,
        builder:
            (context) => AlertDialog(
              title: Row(
                children: [
                  Icon(Icons.smart_toy, color: Colors.blue),
                  const SizedBox(width: 8),
                  const Text('AI Summary'),
                ],
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Summary:',
                    style: Theme.of(context).textTheme.labelLarge,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    message.text.length > 50
                        ? 'This message discusses ${message.text.split(' ').take(3).join(' ')}...'
                        : 'Brief message about: ${message.text}',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const Divider(height: 24),
                  Text(
                    'Key Points:',
                    style: Theme.of(context).textTheme.labelLarge,
                  ),
                  const SizedBox(height: 8),
                  const Text('• Main topic identified'),
                  const Text('• Important details highlighted'),
                  const Text('• Action items extracted'),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () {
                    Clipboard.setData(
                      ClipboardData(text: 'AI Summary: ${message.text}'),
                    );
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Summary copied to clipboard')),
                    );
                  },
                  child: const Text('Copy Summary'),
                ),
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Close'),
                ),
              ],
            ),
      );
    });
  }

  // Create note functionality
  void _createNote(BuildContext context, ChatMessage message) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder:
            (context) => NoteEditorScreen(
              initialMode: NoteEditorMode.create,
              templateData: {
                'title': '',
                'content': message.text,
                'icon': '📝',
              },
            ),
      ),
    );
  }

  // Create project functionality
  void _createProject(BuildContext context, ChatMessage message) {
    showCreateProjectDialog(context, initialMessage: message.text);
  }

  // Generate email functionality
  void _generateEmail(BuildContext context, ChatMessage message) {
    showDialog(
      context: context,
      builder:
          (context) => AlertDialog(
            title: Row(
              children: [
                Icon(Icons.email, color: Colors.blue),
                const SizedBox(width: 8),
                const Text('Generate Email'),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButtonFormField<String>(
                  decoration: const InputDecoration(
                    labelText: 'Email Type',
                    border: OutlineInputBorder(),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'formal', child: Text('Formal')),
                    DropdownMenuItem(
                      value: 'informal',
                      child: Text('Informal'),
                    ),
                    DropdownMenuItem(
                      value: 'followup',
                      child: Text('Follow-up'),
                    ),
                    DropdownMenuItem(value: 'reply', child: Text('Reply')),
                  ],
                  onChanged: (value) {},
                ),
                const SizedBox(height: 16),
                const TextField(
                  decoration: InputDecoration(
                    labelText: 'Recipient',
                    border: OutlineInputBorder(),
                    hintText: 'email@example.com',
                  ),
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.grey.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(2),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Based on:',
                        style: Theme.of(context).textTheme.labelSmall,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        message.text.length > 100
                            ? '${message.text.substring(0, 100)}...'
                            : message.text,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
              FilledButton(
                onPressed: () {
                  Navigator.pop(context);
                  // Show generated email preview
                  showDialog(
                    context: context,
                    builder:
                        (context) => AlertDialog(
                          title: const Text('Generated Email'),
                          content: SingleChildScrollView(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Subject: Follow-up on our discussion',
                                  style:
                                      Theme.of(context).textTheme.titleMedium,
                                ),
                                const Divider(),
                                const Text(
                                  'Dear [Recipient],\n\nI hope this email finds you well. I wanted to follow up on our recent discussion...\n\nBest regards,\n[Your name]',
                                ),
                              ],
                            ),
                          ),
                          actions: [
                            TextButton(
                              onPressed: () {
                                Clipboard.setData(
                                  const ClipboardData(
                                    text:
                                        'Subject: Follow-up on our discussion\n\nDear [Recipient],\n\nI hope this email finds you well...',
                                  ),
                                );
                                Navigator.pop(context);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text('Email copied to clipboard'),
                                  ),
                                );
                              },
                              child: const Text('Copy'),
                            ),
                            FilledButton(
                              onPressed: () => Navigator.pop(context),
                              child: const Text('Close'),
                            ),
                          ],
                        ),
                  );
                },
                child: const Text('Generate'),
              ),
            ],
          ),
    );
  }

  // Mute notifications functionality
  void _muteNotifications(BuildContext context, ChatMessage message) {
    showDialog(
      context: context,
      builder:
          (context) => AlertDialog(
            title: Row(
              children: [
                Icon(Icons.notifications_off, color: Colors.blue),
                const SizedBox(width: 8),
                const Text('Mute Notifications'),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'How long would you like to mute notifications for this conversation?',
                ),
                const SizedBox(height: 16),
                ListTile(
                  leading: const Icon(Icons.timer),
                  title: const Text('1 hour'),
                  onTap: () {
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Notifications muted for 1 hour')),
                    );
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.timer),
                  title: const Text('8 hours'),
                  onTap: () {
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Notifications muted for 8 hours'),
                      ),
                    );
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.timer),
                  title: const Text('24 hours'),
                  onTap: () {
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Notifications muted for 24 hours'),
                      ),
                    );
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.timer_off),
                  title: const Text('Until I turn it back on'),
                  onTap: () {
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: const Text('Notifications muted'),
                        action: SnackBarAction(
                          label: 'Unmute',
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('Notifications unmuted')),
                            );
                          },
                        ),
                      ),
                    );
                  },
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
            ],
          ),
    );
  }

  void _showReactionPicker(BuildContext context, ChatMessage message) {
    showDialog(
      context: context,
      builder:
          (context) => Dialog(
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                borderRadius: BorderRadius.circular(2),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'React to message',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 20),
                  // First row of reactions
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _buildReactionButton(context, '👍', message),
                      _buildReactionButton(context, '❤️', message),
                      _buildReactionButton(context, '😂', message),
                    ],
                  ),
                  const SizedBox(height: 16),
                  // Second row of reactions
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _buildReactionButton(context, '😮', message),
                      _buildReactionButton(context, '😢', message),
                      _buildReactionButton(context, '😡', message),
                    ],
                  ),
                  const SizedBox(height: 16),
                  // Cancel button
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Cancel'),
                  ),
                ],
              ),
            ),
          ),
    );
  }

  Widget _buildReactionButton(
    BuildContext context,
    String emoji,
    ChatMessage message,
  ) {
    return InkWell(
      onTap: () {
        Navigator.pop(context);
        onReact?.call(message, emoji);
      },
      borderRadius: BorderRadius.circular(2),
      child: Container(
        width: 50,
        height: 50,
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          shape: BoxShape.circle,
          border: Border.all(
            color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.2),
          ),
        ),
        child: Center(child: Text(emoji, style: const TextStyle(fontSize: 24))),
      ),
    );
  }

  Widget _buildMediaWidget(BuildContext context, ChatMessage message) {
    // Handle legacy imagePath
    if (message.imagePath != null && message.mediaType == null) {
      return _buildImageWidget(context, message.imagePath!);
    }

    // Handle media based on type
    switch (message.mediaType) {
      case MediaType.image:
        return _buildImageWidget(
          context,
          message.mediaUrl ?? message.imagePath ?? '',
        );
      case MediaType.video:
        return _buildVideoWidget(context, message.mediaUrl ?? '', message);
      case MediaType.audio:
        return _buildAudioWidget(context, message.mediaUrl ?? '', message);
      case MediaType.document:
        return _buildDocumentWidget(
          context,
          message.mediaUrl ?? '',
          message.text,
          message,
        );
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildImageWidget(BuildContext context, String url) {
    // Build full URL if it's a relative path
    String imageUrl = url;
    if (url.startsWith('/api/') || url.startsWith('/storage/')) {
      final baseUrl = ApiConfig.apiBaseUrl.replaceAll('/api/v1', '');
      imageUrl = '$baseUrl$url';
    }

    // Get auth token for authenticated requests
    final authToken = AuthService.instance.currentSession;
    final headers = <String, String>{};
    if (authToken != null && authToken.isNotEmpty) {
      headers['Authorization'] = 'Bearer $authToken';
    }

    return GestureDetector(
      onTap: () => onShowFullScreenImage?.call(context, imageUrl),
      onLongPress:
          () => onShowMediaOptions?.call(context, imageUrl, MediaType.image),
      child: Stack(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(2),
            child: Container(
              constraints: const BoxConstraints(maxWidth: 250, maxHeight: 300),
              child:
                  url.startsWith('/') || url.startsWith('file://')
                      ? Image.file(
                        File(
                          url.startsWith('file://') ? url.substring(7) : url,
                        ),
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) {
                          return Container(
                            width: 200,
                            height: 150,
                            decoration: BoxDecoration(
                              color:
                                  Theme.of(
                                    context,
                                  ).colorScheme.surfaceContainerHighest,
                              borderRadius: BorderRadius.circular(2),
                            ),
                            child: const Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.broken_image,
                                  size: 48,
                                  color: Colors.grey,
                                ),
                                SizedBox(height: 8),
                                Text(
                                  'Image not found',
                                  style: TextStyle(color: Colors.grey),
                                ),
                              ],
                            ),
                          );
                        },
                      )
                      : Image.network(
                        imageUrl,
                        fit: BoxFit.cover,
                        headers: headers.isNotEmpty ? headers : null,
                        errorBuilder: (context, error, stackTrace) {
                          debugPrint('❌ Image load error for URL: $imageUrl');
                          debugPrint('   Error: $error');
                          return Container(
                            width: 200,
                            height: 150,
                            decoration: BoxDecoration(
                              color:
                                  Theme.of(
                                    context,
                                  ).colorScheme.surfaceContainerHighest,
                              borderRadius: BorderRadius.circular(2),
                            ),
                            child: const Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.broken_image,
                                  size: 48,
                                  color: Colors.grey,
                                ),
                                SizedBox(height: 8),
                                Text(
                                  'Image not available',
                                  style: TextStyle(color: Colors.grey),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
            ),
          ),
          // Action buttons overlay
          Positioned(
            top: 4,
            right: 4,
            child: Row(
              children: [
                Container(
                  decoration: BoxDecoration(
                    color: Colors.black54,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: IconButton(
                    icon: const Icon(
                      Icons.fullscreen,
                      color: Colors.white,
                      size: 20,
                    ),
                    padding: const EdgeInsets.all(4),
                    constraints: const BoxConstraints(),
                    onPressed: () => onShowFullScreenImage?.call(context, url),
                  ),
                ),
                const SizedBox(width: 4),
                Container(
                  decoration: BoxDecoration(
                    color: Colors.black54,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: IconButton(
                    icon: const Icon(
                      Icons.download,
                      color: Colors.white,
                      size: 20,
                    ),
                    padding: const EdgeInsets.all(4),
                    constraints: const BoxConstraints(),
                    onPressed:
                        () => onDownloadMedia?.call(url, MediaType.image),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVideoWidget(
    BuildContext context,
    String url,
    ChatMessage message,
  ) {
    return GestureDetector(
      onLongPress:
          () => onShowMediaOptions?.call(context, url, MediaType.video),
      child: Stack(
        children: [
          VideoPlayerWidget(videoUrl: url, isMe: message.isMe),
          Positioned(
            top: 4,
            right: 4,
            child: Container(
              decoration: BoxDecoration(
                color: Colors.black54,
                borderRadius: BorderRadius.circular(20),
              ),
              child: IconButton(
                icon: const Icon(Icons.download, color: Colors.white, size: 20),
                padding: const EdgeInsets.all(4),
                constraints: const BoxConstraints(),
                onPressed: () => onDownloadMedia?.call(url, MediaType.video),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSimpleVideoThumbnail(
    BuildContext context,
    String url,
    ChatMessage message,
  ) {
    // Fallback video thumbnail when video player fails
    return GestureDetector(
      onTap: () {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Video: ${url.split('/').last}'),
            action: SnackBarAction(
              label: 'Open',
              onPressed: () {
                // Could implement external video player here
              },
            ),
          ),
        );
      },
      child: Container(
        width: 250,
        height: 140,
        decoration: BoxDecoration(
          color: Colors.grey[800],
          borderRadius: BorderRadius.circular(2),
          border: Border.all(color: Colors.grey[600]!),
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            const Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.play_circle_filled, size: 60, color: Colors.white70),
                SizedBox(height: 8),
                Text(
                  'Video File',
                  style: TextStyle(color: Colors.white70, fontSize: 14),
                ),
              ],
            ),
            Positioned(
              top: 8,
              right: 8,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.black54,
                  borderRadius: BorderRadius.circular(2),
                ),
                child: const Text(
                  'Video',
                  style: TextStyle(color: Colors.white, fontSize: 8),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAudioWidget(
    BuildContext context,
    String url,
    ChatMessage message,
  ) {
    return AudioPlayerWidget(audioUrl: url, isMe: message.isMe);
  }

  Widget _buildDocumentWidget(
    BuildContext context,
    String url,
    String fileName,
    ChatMessage message,
  ) {
    // Clean filename - remove emoji and size info if present
    String cleanFileName = fileName;
    if (fileName.contains('📎')) {
      cleanFileName = fileName.replaceAll('📎 ', '').split(' (').first;
    }

    // Extract file extension from cleaned fileName
    final extension =
        cleanFileName.contains('.')
            ? cleanFileName.split('.').last.toLowerCase()
            : 'file';
    IconData iconData;
    Color iconColor;

    switch (extension) {
      case 'pdf':
        iconData = Icons.picture_as_pdf;
        iconColor = Colors.red;
        break;
      case 'doc':
      case 'docx':
        iconData = Icons.description;
        iconColor = Colors.blue;
        break;
      case 'xls':
      case 'xlsx':
        iconData = Icons.table_chart;
        iconColor = Colors.green;
        break;
      case 'ppt':
      case 'pptx':
        iconData = Icons.slideshow;
        iconColor = Colors.orange;
        break;
      case 'zip':
      case 'rar':
      case '7z':
        iconData = Icons.folder_zip;
        iconColor = Colors.purple;
        break;
      case 'txt':
        iconData = Icons.text_snippet;
        iconColor = Colors.grey;
        break;
      case 'json':
      case 'xml':
        iconData = Icons.code;
        iconColor = Colors.teal;
        break;
      default:
        iconData = Icons.insert_drive_file;
        iconColor = Colors.grey;
    }

    // Get file size if file exists
    String fileSize = '';
    if (url.isNotEmpty && (url.startsWith('/') || url.startsWith('file://'))) {
      try {
        final file = File(url.startsWith('file://') ? url.substring(7) : url);
        if (file.existsSync()) {
          final size = file.lengthSync();
          fileSize = FileUtils.formatFileSize(size);
        }
      } catch (e) {
        // Ignore file size error
      }
    }

    return InkWell(
      onTap: () => onDownloadFile?.call(url, cleanFileName),
      onLongPress: () {
        showModalBottomSheet(
          context: context,
          builder:
              (context) => SafeArea(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    ListTile(
                      leading: const Icon(Icons.download),
                      title: const Text('Download'),
                      onTap: () {
                        Navigator.pop(context);
                        onDownloadFile?.call(url, cleanFileName);
                      },
                    ),
                    ListTile(
                      leading: const Icon(Icons.share),
                      title: const Text('Share'),
                      onTap: () async {
                        Navigator.pop(context);
                        try {
                          if (url.startsWith('/') ||
                              url.startsWith('file://')) {
                            final file = File(
                              url.startsWith('file://')
                                  ? url.substring(7)
                                  : url,
                            );
                            await Share.shareXFiles([XFile(file.path)]);
                          } else {
                            // Download first then share
                            final dio = Dio();
                            final tempDir = await getTemporaryDirectory();
                            final savePath = '${tempDir.path}/$cleanFileName';
                            await dio.download(url, savePath);
                            await Share.shareXFiles([XFile(savePath)]);
                          }
                        } catch (e) {
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('Share failed: $e')),
                            );
                          }
                        }
                      },
                    ),
                    ListTile(
                      leading: const Icon(Icons.info_outline),
                      title: const Text('File Info'),
                      onTap: () {
                        Navigator.pop(context);
                        showDialog(
                          context: context,
                          builder:
                              (context) => AlertDialog(
                                title: const Text('File Information'),
                                content: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Name: $cleanFileName',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    if (fileSize.isNotEmpty)
                                      Text('Size: $fileSize'),
                                    Text('Type: ${extension.toUpperCase()}'),
                                    const SizedBox(height: 8),
                                    Text(
                                      'Path: ${url.split('/').last}',
                                      style: const TextStyle(fontSize: 12),
                                    ),
                                  ],
                                ),
                                actions: [
                                  TextButton(
                                    onPressed: () => Navigator.pop(context),
                                    child: const Text('Close'),
                                  ),
                                ],
                              ),
                        );
                      },
                    ),
                  ],
                ),
              ),
        );
      },
      child: Container(
        constraints: const BoxConstraints(maxWidth: 250),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(2),
          border: Border.all(
            color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.2),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(iconData, color: iconColor, size: 40),
            const SizedBox(width: 12),
            Flexible(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    cleanFileName,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      // File type badge
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 3,
                        ),
                        decoration: BoxDecoration(
                          color: iconColor.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(
                            color: iconColor.withValues(alpha: 0.3),
                            width: 1,
                          ),
                        ),
                        child: Text(
                          extension.toUpperCase(),
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: iconColor,
                          ),
                        ),
                      ),
                      if (fileSize.isNotEmpty) ...[
                        const SizedBox(width: 8),
                        Text(
                          fileSize,
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Container(
              decoration: BoxDecoration(
                color: Theme.of(
                  context,
                ).colorScheme.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: IconButton(
                icon: Icon(
                  Icons.download,
                  size: 20,
                  color: Theme.of(context).colorScheme.primary,
                ),
                padding: const EdgeInsets.all(4),
                constraints: const BoxConstraints(),
                onPressed: () => onDownloadFile?.call(url, cleanFileName),
                tooltip: 'Download',
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class MessageInput extends StatefulWidget {
  final TextEditingController controller;
  final VoidCallback onSend;
  final bool isAIMode;
  final Function(bool) onModeChanged;
  final Function(String path, MediaType type, String? description)? onMediaSend;
  final Function(
    Uint8List bytes,
    String fileName,
    String mimeType,
    MediaType type,
    String? description,
  )?
  onMediaSendBytes;
  final ChatMessage? replyingToMessage;
  final VoidCallback? onCancelReply;
  final Function(String text, DateTime scheduledTime)? onScheduleMessage;
  final VoidCallback? onShowScheduledMessages;
  final String chatName;
  final bool isChannel;
  final String? channelId;
  final String? conversationId;
  final Function(List<String>)? onMentionsChanged;
  final Function(List<Map<String, dynamic>>)? onLinkedContentChanged;
  final Function(String gifUrl, String title)? onGifSend;

  const MessageInput({
    super.key,
    required this.controller,
    required this.onSend,
    required this.isAIMode,
    required this.onModeChanged,
    required this.chatName,
    this.isChannel = false,
    this.channelId,
    this.conversationId,
    this.onMediaSend,
    this.onMediaSendBytes,
    this.replyingToMessage,
    this.onCancelReply,
    this.onScheduleMessage,
    this.onShowScheduledMessages,
    this.onMentionsChanged,
    this.onLinkedContentChanged,
    this.onGifSend,
  });

  @override
  State<MessageInput> createState() => _MessageInputState();
}

class _MessageInputState extends State<MessageInput> {
  bool _showFormatting = false;

  // Quill editor controller for rich text
  late quill.QuillController _quillController;
  final FocusNode _quillFocusNode = FocusNode();

  // Audio recording states
  final FlutterSoundRecorder _audioRecorder = FlutterSoundRecorder();
  bool _isRecording = false;
  String? _recordingPath;
  Timer? _recordingTimer;
  int _recordingDuration = 0;
  bool _isRecorderInitialized = false;

  // Mention states
  List<ChannelMember> _channelMembers = [];
  List<ChannelMember> _filteredMembers = [];
  bool _showMentionSuggestions = false;
  String _mentionQuery = '';
  int _mentionStartPosition = -1;
  final List<String> _mentionedUserIds = [];
  final ChatApiService _chatApiService = ChatApiService();

  // Bot mention states
  final BotApiService _botApiService = BotApiService();
  List<Bot> _installedBots = [];
  List<Bot> _filteredBots = [];
  final List<String> _mentionedBotIds = [];

  // Slash command states (for / attachments)
  bool _showSlashCommandMenu = false;
  int _slashCommandStartPosition = -1;
  final List<Map<String, dynamic>> _attachedContent = [];

  // Data for slash command menu
  List<notes_api.Note> _availableNotes = [];
  List<event_model.CalendarEvent> _availableEvents = [];
  List<file_model.File> _availableFiles = [];
  bool _isLoadingSlashData = false;

  @override
  void initState() {
    super.initState();
    _quillController = quill.QuillController.basic();
    _quillController.addListener(_onQuillTextChanged);
    _initRecorder();
    _fetchChannelMembers();
    _fetchInstalledBots();
    _loadSlashCommandData();
  }

  /// Fetch installed bots for this channel/conversation
  Future<void> _fetchInstalledBots() async {
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) return;

    try {
      List<BotInstallation> installations = [];

      if (widget.isChannel && widget.channelId != null) {
        // Fetch bots installed in this channel
        final response = await _botApiService.getChannelBots(
          workspaceId,
          widget.channelId!,
        );
        if (response.success && response.data != null) {
          installations = response.data!;
        }
      } else if (widget.conversationId != null) {
        // Fetch bots installed in this conversation
        final response = await _botApiService.getConversationBots(
          workspaceId,
          widget.conversationId!,
        );
        if (response.success && response.data != null) {
          installations = response.data!;
        }
      }

      // Extract bot details from installations
      final List<Bot> bots = [];
      for (final installation in installations) {
        if (installation.bot != null && installation.isActive) {
          bots.add(installation.bot!);
        }
      }

      setState(() {
        _installedBots = bots;
      });

      debugPrint('Loaded ${_installedBots.length} installed bots for mention');
    } catch (e) {
      debugPrint('Error fetching installed bots: $e');
    }
  }

  /// Load notes, events, files for slash command menu
  Future<void> _loadSlashCommandData() async {
    if (_isLoadingSlashData) return;

    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) return;

    setState(() {
      _isLoadingSlashData = true;
    });

    try {
      // Load notes
      final notesResponse = await notes_api.NotesApiService().getNotes(
        workspaceId,
      );
      if (notesResponse.success && notesResponse.data != null) {
        _availableNotes = notesResponse.data!;
      }

      // Load events
      final calendarService = calendar_api.CalendarApiService();
      final now = DateTime.now();
      final eventsResponse = await calendarService.getEvents(
        workspaceId,
        startDate: now.subtract(const Duration(days: 30)).toIso8601String(),
        endDate: now.add(const Duration(days: 90)).toIso8601String(),
      );
      if (eventsResponse.success && eventsResponse.data != null) {
        // Convert API CalendarEvent to model CalendarEvent
        _availableEvents =
            eventsResponse.data!
                .map(
                  (e) => event_model.CalendarEvent(
                    id: e.id,
                    workspaceId: e.workspaceId,
                    title: e.title,
                    description: e.description,
                    startTime: e.startTime,
                    endTime: e.endTime,
                    allDay: e.isAllDay,
                    location: e.location,
                    organizerId: e.organizerId,
                    meetingUrl: e.meetingUrl,
                    isRecurring: e.isRecurring,
                  ),
                )
                .toList();
      }

      // Load files
      final filesResponse = await file_api.FileApiService().getFiles(
        workspaceId,
      );
      if (filesResponse.success && filesResponse.data != null) {
        // Convert API FileModel to model File
        _availableFiles =
            filesResponse.data!.data
                .map(
                  (f) => file_model.File(
                    id: f.id,
                    workspaceId: f.workspaceId,
                    name: f.name,
                    storagePath: f.url,
                    mimeType: f.mimeType,
                    size: f.size.toString(),
                    uploadedBy: f.uploadedBy,
                    parentFolderIds: f.folderId != null ? [f.folderId!] : [],
                    version: 1,
                    virusScanStatus: 'clean',
                    url: f.url,
                  ),
                )
                .toList();
      }

      debugPrint(
        'Loaded slash data: ${_availableNotes.length} notes, ${_availableEvents.length} events, ${_availableFiles.length} files',
      );
    } catch (e) {
      debugPrint('Error loading slash command data: $e');
    } finally {
      if (mounted) {
        setState(() {
          _isLoadingSlashData = false;
        });
      }
    }
  }

  Future<void> _initRecorder() async {
    await _audioRecorder.openRecorder();
    setState(() {
      _isRecorderInitialized = true;
    });
  }

  /// Fetch channel members if this is a channel
  Future<void> _fetchChannelMembers() async {
    if (!widget.isChannel || widget.channelId == null) return;

    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) return;

    try {
      final response = await _chatApiService.getChannelMembers(
        workspaceId,
        widget.channelId!,
      );

      if (response.success && response.data != null) {
        setState(() {
          _channelMembers = response.data!;
        });
      }
    } catch (e) {
      debugPrint('Error fetching channel members: $e');
    }
  }

  /// Get plain text from Quill document
  String _getQuillPlainText() {
    return _quillController.document.toPlainText().trim();
  }

  /// Get HTML content from Quill document
  String _getQuillHtmlContent() {
    final delta = _quillController.document.toDelta();
    // Use default converter options to generate proper HTML tags
    // This will generate <strong>, <em>, <u>, <s>, <a>, <ul>, <ol>, <li>, <blockquote>, <pre> etc.
    final converter = QuillDeltaToHtmlConverter(
      delta.toJson(),
      ConverterOptions(),
    );
    return converter.convert();
  }

  /// Detect @ mentions in text (for Quill editor)
  void _onQuillTextChanged() {
    try {
      final text = _getQuillPlainText();
      final cursorPosition = _quillController.selection.baseOffset;

      // Safety check: ensure cursor position is valid
      if (cursorPosition < 0 || text.isEmpty) {
        // Reset mention suggestions if text is invalid
        if (_showMentionSuggestions || _showSlashCommandMenu) {
          setState(() {
            _showMentionSuggestions = false;
            _filteredMembers = [];
            _mentionQuery = '';
            _mentionStartPosition = -1;
            _showSlashCommandMenu = false;
            _slashCommandStartPosition = -1;
          });
        }
        return;
      }

      // Use the minimum of cursor position and text length for safety
      final safePosition = cursorPosition.clamp(0, text.length);

      // Find the last @ before cursor
      int atPosition = -1;
      for (int i = safePosition - 1; i >= 0; i--) {
        if (text[i] == '@') {
          // Check if @ is at start or preceded by whitespace
          if (i == 0 || text[i - 1] == ' ' || text[i - 1] == '\n') {
            atPosition = i;
            break;
          }
        } else if (text[i] == ' ' || text[i] == '\n') {
          // Stop if we hit whitespace before finding @
          break;
        }
      }

      if (atPosition != -1 && atPosition < safePosition) {
        // Extract query after @
        final query =
            text.substring(atPosition + 1, safePosition).toLowerCase();

        // Get current user ID to exclude from suggestions
        final currentUserId = AuthService.instance.currentUser?.id;

        // Create list with @channel option first (if it matches query)
        final List<ChannelMember> filtered = [];

        // Add @channel mention option (notify everyone in channel)
        if ('channel'.contains(query) ||
            'everyone'.contains(query) ||
            'all'.contains(query)) {
          filtered.add(
            ChannelMember(
              userId: 'channel',
              email: 'channel@mention',
              name: 'channel',
              role: 'mention',
              joinedAt: DateTime.now(),
            ),
          );
        }

        // Filter regular members (exclude current user - can't mention yourself)
        final memberFiltered =
            _channelMembers.where((member) {
              // Exclude current user from mention suggestions
              if (currentUserId != null && member.userId == currentUserId) {
                return false;
              }
              final name = (member.name ?? member.email).toLowerCase();
              return name.contains(query);
            }).toList();

        filtered.addAll(memberFiltered);

        // Filter installed bots
        final botFiltered = _installedBots.where((bot) {
          final name = bot.effectiveDisplayName.toLowerCase();
          return name.contains(query);
        }).toList();

        setState(() {
          _showMentionSuggestions = filtered.isNotEmpty || botFiltered.isNotEmpty;
          _filteredMembers = filtered;
          _filteredBots = botFiltered;
          _mentionQuery = query;
          _mentionStartPosition = atPosition;
        });
      } else {
        setState(() {
          _showMentionSuggestions = false;
          _filteredMembers = [];
          _filteredBots = [];
          _mentionQuery = '';
          _mentionStartPosition = -1;
        });
      }

      // Check for / slash command (content mention)
      int slashPosition = -1;
      for (int i = safePosition - 1; i >= 0; i--) {
        if (text[i] == '/') {
          // Check if / is at start or preceded by whitespace
          if (i == 0 || text[i - 1] == ' ' || text[i - 1] == '\n') {
            slashPosition = i;
            break;
          }
        } else if (text[i] == ' ' || text[i] == '\n') {
          // Stop if we hit whitespace before finding /
          break;
        }
      }

      if (slashPosition != -1 &&
          slashPosition < safePosition &&
          !_showMentionSuggestions) {
        setState(() {
          _showSlashCommandMenu = true;
          _slashCommandStartPosition = slashPosition;
        });
      } else if (_showSlashCommandMenu && slashPosition == -1) {
        setState(() {
          _showSlashCommandMenu = false;
          _slashCommandStartPosition = -1;
        });
      }
    } catch (e) {
      // Silently handle any errors during text change processing
      debugPrint('Error in _onQuillTextChanged: $e');
    }
  }

  /// Handle content selection from slash command menu
  void _handleContentSelect(String id, String title, String type) {
    // Remove the "/" from input using Quill
    if (_slashCommandStartPosition != -1) {
      final cursorPos = _quillController.selection.baseOffset;
      final deleteLength = cursorPos - _slashCommandStartPosition;
      if (deleteLength > 0) {
        _quillController.replaceText(
          _slashCommandStartPosition,
          deleteLength,
          '',
          TextSelection.collapsed(offset: _slashCommandStartPosition),
        );
      }
    }

    // Add to attached content (avoid duplicates)
    if (!_attachedContent.any((c) => c['id'] == id && c['type'] == type)) {
      setState(() {
        _attachedContent.add({'id': id, 'title': title, 'type': type});
      });
      // Notify parent of linked content change
      widget.onLinkedContentChanged?.call(List.from(_attachedContent));
    }

    // Close menu
    setState(() {
      _showSlashCommandMenu = false;
      _slashCommandStartPosition = -1;
    });
  }

  /// Remove attached content
  void _removeAttachedContent(int index) {
    setState(() {
      _attachedContent.removeAt(index);
    });
    // Notify parent of linked content change
    widget.onLinkedContentChanged?.call(List.from(_attachedContent));
  }

  /// Clear attached content after send
  void clearAttachedContent() {
    setState(() {
      _attachedContent.clear();
    });
    widget.onLinkedContentChanged?.call([]);
  }

  /// Get current attached content
  List<Map<String, dynamic>> get attachedContent => List.from(_attachedContent);

  /// Get icon for content type
  IconData _getContentIcon(String type) {
    switch (type) {
      case 'notes':
        return Icons.description_outlined;
      case 'events':
        return Icons.event_outlined;
      case 'files':
        return Icons.insert_drive_file_outlined;
      default:
        return Icons.attach_file;
    }
  }

  /// Get color for content type
  Color _getContentColor(String type) {
    switch (type) {
      case 'notes':
        return Colors.blue;
      case 'events':
        return Colors.orange;
      case 'files':
        return Colors.purple;
      default:
        return Colors.grey;
    }
  }

  /// Insert mention when user selects a member
  void _insertMention(ChannelMember member) {
    // Handle @channel mention specially
    final isChannelMention = member.userId == 'channel';
    final memberName = member.name ?? member.email.split('@')[0];

    // Format: @channel for channel mention, @[Name] for regular mentions
    final mention = isChannelMention ? '@channel' : '@[$memberName]';

    debugPrint('=== INSERTING MENTION ===');
    debugPrint('Member name: $memberName');
    debugPrint('Is channel mention: $isChannelMention');
    debugPrint('Mention format: $mention');

    // Replace from @ to cursor with the mention using Quill
    final cursorPos = _quillController.selection.baseOffset;
    final deleteLength = cursorPos - _mentionStartPosition;

    if (deleteLength > 0) {
      _quillController.replaceText(
        _mentionStartPosition,
        deleteLength,
        '$mention ',
        TextSelection.collapsed(
          offset: _mentionStartPosition + mention.length + 1,
        ),
      );
    }

    debugPrint(
      'Mention position: $_mentionStartPosition to ${_mentionStartPosition + mention.length}',
    );

    // Track mentioned user ID (or 'channel' for @channel mentions)
    if (!_mentionedUserIds.contains(member.userId)) {
      _mentionedUserIds.add(member.userId);
      widget.onMentionsChanged?.call(_mentionedUserIds);
      debugPrint(
        'Added ${isChannelMention ? "channel" : "user ID"} to mentions: ${member.userId}',
      );
    }

    setState(() {
      _showMentionSuggestions = false;
      _filteredMembers = [];
      _filteredBots = [];
      _mentionQuery = '';
      _mentionStartPosition = -1;
    });

    debugPrint('=== END MENTION INSERT ===');
  }

  /// Insert bot mention when user selects a bot
  void _insertBotMention(Bot bot) {
    final botName = bot.effectiveDisplayName;
    final mention = '@[$botName]';

    debugPrint('=== INSERTING BOT MENTION ===');
    debugPrint('Bot name: $botName');
    debugPrint('Bot ID: ${bot.id}');
    debugPrint('Mention format: $mention');

    // Replace from @ to cursor with the mention using Quill
    final cursorPos = _quillController.selection.baseOffset;
    final deleteLength = cursorPos - _mentionStartPosition;

    if (deleteLength > 0) {
      _quillController.replaceText(
        _mentionStartPosition,
        deleteLength,
        '$mention ',
        TextSelection.collapsed(
          offset: _mentionStartPosition + mention.length + 1,
        ),
      );
    }

    debugPrint(
      'Mention position: $_mentionStartPosition to ${_mentionStartPosition + mention.length}',
    );

    // Track mentioned bot ID
    if (!_mentionedBotIds.contains(bot.id)) {
      _mentionedBotIds.add(bot.id);
      // Notify parent of bot mentions through a combined callback or separate
      debugPrint('Added bot ID to mentions: ${bot.id}');
    }

    setState(() {
      _showMentionSuggestions = false;
      _filteredMembers = [];
      _filteredBots = [];
      _mentionQuery = '';
      _mentionStartPosition = -1;
    });

    debugPrint('=== END BOT MENTION INSERT ===');
  }

  /// Get mentioned bot IDs
  List<String> get mentionedBotIds => List.from(_mentionedBotIds);

  /// Clear mentioned bot IDs after sending
  void clearMentionedBotIds() {
    _mentionedBotIds.clear();
  }

  @override
  void dispose() {
    _recordingTimer?.cancel();
    _audioRecorder.closeRecorder();
    _quillController.removeListener(_onQuillTextChanged);
    _quillController.dispose();
    _quillFocusNode.dispose();
    super.dispose();
  }

  /// Toggle inline format (bold, italic, underline, strikethrough)
  void _toggleQuillFormat(quill.Attribute attribute) {
    final isActive = _quillController.getSelectionStyle().containsKey(
      attribute.key,
    );
    _quillController.formatSelection(
      isActive ? quill.Attribute.clone(attribute, null) : attribute,
    );
  }

  /// Toggle block format (list, quote, code block)
  void _toggleQuillBlockFormat(quill.Attribute attribute) {
    final style = _quillController.getSelectionStyle();
    final isActive = style.containsKey(attribute.key);
    _quillController.formatSelection(
      isActive ? quill.Attribute.clone(attribute, null) : attribute,
    );
  }

  /// Clear the Quill editor content
  void _clearQuillContent() {
    _quillController.clear();
  }

  /// Get HTML content from the editor (for sending messages)
  String getHtmlContent() {
    return _getQuillHtmlContent();
  }

  /// Get plain text content from the editor
  String getPlainTextContent() {
    return _getQuillPlainText();
  }

  /// Check if the editor has content
  bool hasContent() {
    return _getQuillPlainText().isNotEmpty;
  }

  /// Clear the editor content (public method for parent to call)
  void clearContent() {
    _clearQuillContent();
  }

  /// Insert text at current position (for file attachments, etc.)
  void insertText(String text) {
    _quillController.replaceText(
      _quillController.selection.baseOffset,
      0,
      text,
      TextSelection.collapsed(
        offset: _quillController.selection.baseOffset + text.length,
      ),
    );
  }

  /// Set the editor content (replaces all content)
  void setContent(String text) {
    _quillController.clear();
    _quillController.document.insert(0, text);
  }

  /// Show dialog to insert a link
  void _showLinkDialog() {
    final textController = TextEditingController();
    final urlController = TextEditingController();

    // Get selected text if any
    final selection = _quillController.selection;
    if (selection.baseOffset != selection.extentOffset) {
      final selectedText = _quillController.document.toPlainText().substring(
        selection.baseOffset,
        selection.extentOffset,
      );
      textController.text = selectedText;
    }

    showDialog(
      context: context,
      builder:
          (context) => AlertDialog(
            title: const Text('Insert Link'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: textController,
                  decoration: const InputDecoration(
                    labelText: 'Text',
                    hintText: 'Link text',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: urlController,
                  decoration: const InputDecoration(
                    labelText: 'URL',
                    hintText: 'https://example.com',
                    border: OutlineInputBorder(),
                  ),
                  keyboardType: TextInputType.url,
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
              FilledButton(
                onPressed: () {
                  final text = textController.text.trim();
                  final url = urlController.text.trim();

                  if (text.isNotEmpty && url.isNotEmpty) {
                    try {
                      final selection = _quillController.selection;
                      var index = selection.baseOffset;
                      if (index < 0) {
                        index = _quillController.document.length - 1;
                        if (index < 0) index = 0;
                      }
                      final length =
                          (selection.extentOffset - selection.baseOffset).abs();

                      // Delete selected text if any
                      if (length > 0) {
                        _quillController.replaceText(index, length, '', null);
                      }

                      // Insert link text
                      _quillController.document.insert(index, text);

                      // Apply link attribute
                      _quillController.formatText(
                        index,
                        text.length,
                        quill.Attribute(
                          'link',
                          quill.AttributeScope.inline,
                          url,
                        ),
                      );

                      // Move cursor after the link
                      _quillController.updateSelection(
                        TextSelection.collapsed(offset: index + text.length),
                        quill.ChangeSource.local,
                      );
                    } catch (e) {
                      debugPrint('Error inserting link: $e');
                    }
                  }

                  Navigator.pop(context);
                },
                child: const Text('Insert'),
              ),
            ],
          ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        border: Border(
          top: BorderSide(
            color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.1),
          ),
        ),
      ),
      child: Column(
        children: [
          // Mention Suggestions
          if (_showMentionSuggestions && (_filteredMembers.isNotEmpty || _filteredBots.isNotEmpty))
            Container(
              constraints: const BoxConstraints(maxHeight: 250),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                border: Border.all(
                  color: Theme.of(
                    context,
                  ).colorScheme.outline.withValues(alpha: 0.2),
                ),
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(8),
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.1),
                    blurRadius: 8,
                    offset: const Offset(0, -2),
                  ),
                ],
              ),
              child: ListView(
                shrinkWrap: true,
                children: [
                  // Show members first
                  ..._filteredMembers.take(5).map((member) {
                    final isChannelMention = member.userId == 'channel';
                    final displayName = member.name ?? member.email.split('@')[0];

                    return ListTile(
                      dense: true,
                      leading: CircleAvatar(
                        radius: 16,
                        backgroundColor:
                            isChannelMention
                                ? Theme.of(
                                  context,
                                ).colorScheme.secondary.withValues(alpha: 0.2)
                                : Theme.of(
                                  context,
                                ).colorScheme.primary.withValues(alpha: 0.2),
                        child:
                            isChannelMention
                                ? Icon(
                                  Icons.campaign,
                                  size: 18,
                                  color: Theme.of(context).colorScheme.secondary,
                                )
                                : Text(
                                  displayName[0].toUpperCase(),
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: Theme.of(context).colorScheme.primary,
                                  ),
                                ),
                      ),
                      title: Text(
                        isChannelMention ? '@channel' : displayName,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight:
                              isChannelMention
                                  ? FontWeight.w700
                                  : FontWeight.w500,
                        ),
                      ),
                      subtitle: Text(
                        isChannelMention
                            ? 'Notify everyone in this channel'
                            : member.email,
                        style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                      ),
                      onTap: () => _insertMention(member),
                    );
                  }),
                  // Separator if both members and bots exist
                  if (_filteredMembers.isNotEmpty && _filteredBots.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                      child: Row(
                        children: [
                          Icon(
                            Icons.smart_toy,
                            size: 14,
                            color: Colors.teal.withValues(alpha: 0.7),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Bots',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: Colors.teal.withValues(alpha: 0.7),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Divider(
                              color: Colors.teal.withValues(alpha: 0.3),
                            ),
                          ),
                        ],
                      ),
                    ),
                  // Show bots
                  ..._filteredBots.take(3).map((bot) {
                    final botName = bot.effectiveDisplayName;

                    return ListTile(
                      dense: true,
                      leading: CircleAvatar(
                        radius: 16,
                        backgroundColor: Colors.teal.withValues(alpha: 0.2),
                        child: Icon(
                          Icons.smart_toy,
                          size: 18,
                          color: Colors.teal,
                        ),
                      ),
                      title: Text(
                        botName,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      subtitle: Text(
                        bot.botType.displayName,
                        style: TextStyle(fontSize: 12, color: Colors.teal[400]),
                      ),
                      trailing: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.teal.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text(
                          'BOT',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: Colors.teal,
                          ),
                        ),
                      ),
                      onTap: () => _insertBotMention(bot),
                    );
                  }),
                ],
              ),
            ),

          // Slash Command Menu (/ for attachments)
          if (_showSlashCommandMenu)
            SizedBox(
              height: 280, // Fixed height for the mention suggestions widget
              child: MentionSuggestionWidget(
                notes: _availableNotes,
                events: _availableEvents,
                files: _availableFiles,
                onNoteSelected: (note) {
                  _handleContentSelect(note.id, note.title, 'notes');
                },
                onEventSelected: (event) {
                  _handleContentSelect(event.id ?? '', event.title, 'events');
                },
                onFileSelected: (file) {
                  _handleContentSelect(file.id, file.name, 'files');
                },
                onClose: () {
                  setState(() {
                    _showSlashCommandMenu = false;
                    _slashCommandStartPosition = -1;
                  });
                },
              ),
            ),

          // Attached Content Preview
          if (_attachedContent.isNotEmpty)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Theme.of(
                  context,
                ).colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
                border: Border(
                  bottom: BorderSide(
                    color: Theme.of(
                      context,
                    ).colorScheme.outline.withValues(alpha: 0.1),
                  ),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.link,
                        size: 14,
                        color: Theme.of(
                          context,
                        ).colorScheme.onSurface.withValues(alpha: 0.6),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        'Linked content (${_attachedContent.length})',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: Theme.of(
                            context,
                          ).colorScheme.onSurface.withValues(alpha: 0.6),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children:
                        _attachedContent.asMap().entries.map((entry) {
                          final index = entry.key;
                          final item = entry.value;
                          final color = _getContentColor(item['type']);
                          return Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: color.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: color.withValues(alpha: 0.3),
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  _getContentIcon(item['type']),
                                  size: 14,
                                  color: color,
                                ),
                                const SizedBox(width: 6),
                                ConstrainedBox(
                                  constraints: const BoxConstraints(
                                    maxWidth: 120,
                                  ),
                                  child: Text(
                                    item['title'],
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w500,
                                      color:
                                          Theme.of(
                                            context,
                                          ).colorScheme.onSurface,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                const SizedBox(width: 4),
                                InkWell(
                                  onTap: () => _removeAttachedContent(index),
                                  borderRadius: BorderRadius.circular(10),
                                  child: Icon(
                                    Icons.close,
                                    size: 14,
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onSurface
                                        .withValues(alpha: 0.5),
                                  ),
                                ),
                              ],
                            ),
                          );
                        }).toList(),
                  ),
                ],
              ),
            ),

          // Reply Preview
          if (widget.replyingToMessage != null)
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surfaceContainerHighest,
                border: Border(
                  bottom: BorderSide(
                    color: Theme.of(
                      context,
                    ).colorScheme.outline.withValues(alpha: 0.1),
                  ),
                ),
              ),
              child: Row(
                children: [
                  Container(
                    width: 4,
                    height: 40,
                    decoration: BoxDecoration(
                      color: Colors.blue,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.replyingToMessage!.senderName ??
                              (widget.replyingToMessage!.isMe ? 'You' : 'User'),
                          style: TextStyle(
                            color: Colors.blue,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                        Text(
                          // Strip HTML tags from reply preview
                          widget.replyingToMessage!.text
                              .replaceAll(RegExp(r'<[^>]*>'), '')
                              .replaceAll('&nbsp;', ' ')
                              .trim(),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color:
                                Theme.of(context).colorScheme.onSurfaceVariant,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, size: 20),
                    onPressed: widget.onCancelReply,
                    visualDensity: VisualDensity.compact,
                  ),
                ],
              ),
            ),
          // Text Formatting Toolbar
          if (_showFormatting)
            Container(
              height: 45,
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surfaceContainerHighest,
                border: Border(
                  bottom: BorderSide(
                    color: Theme.of(
                      context,
                    ).colorScheme.outline.withValues(alpha: 0.1),
                  ),
                ),
              ),
              child: Row(
                children: [
                  // Scrollable formatting options using Quill toolbar
                  Expanded(
                    child: SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      child: Row(
                        children: [
                          // Bold
                          IconButton(
                            icon: const Icon(Icons.format_bold, size: 20),
                            padding: const EdgeInsets.all(8),
                            constraints: const BoxConstraints(),
                            onPressed: () {
                              _toggleQuillFormat(quill.Attribute.bold);
                            },
                            tooltip: 'Bold',
                          ),
                          // Italic
                          IconButton(
                            icon: const Icon(Icons.format_italic, size: 20),
                            padding: const EdgeInsets.all(8),
                            constraints: const BoxConstraints(),
                            onPressed: () {
                              _toggleQuillFormat(quill.Attribute.italic);
                            },
                            tooltip: 'Italic',
                          ),
                          // Underline
                          IconButton(
                            icon: const Icon(Icons.format_underline, size: 20),
                            padding: const EdgeInsets.all(8),
                            constraints: const BoxConstraints(),
                            onPressed: () {
                              _toggleQuillFormat(quill.Attribute.underline);
                            },
                            tooltip: 'Underline',
                          ),
                          // Strikethrough
                          IconButton(
                            icon: const Icon(Icons.strikethrough_s, size: 20),
                            padding: const EdgeInsets.all(8),
                            constraints: const BoxConstraints(),
                            onPressed: () {
                              _toggleQuillFormat(quill.Attribute.strikeThrough);
                            },
                            tooltip: 'Strikethrough',
                          ),
                          const SizedBox(width: 4),
                          // Bullet List
                          IconButton(
                            icon: const Icon(
                              Icons.format_list_bulleted,
                              size: 20,
                            ),
                            padding: const EdgeInsets.all(8),
                            constraints: const BoxConstraints(),
                            onPressed: () {
                              _toggleQuillBlockFormat(quill.Attribute.ul);
                            },
                            tooltip: 'Bullet list',
                          ),
                          // Ordered List
                          IconButton(
                            icon: const Icon(
                              Icons.format_list_numbered,
                              size: 20,
                            ),
                            padding: const EdgeInsets.all(8),
                            constraints: const BoxConstraints(),
                            onPressed: () {
                              _toggleQuillBlockFormat(quill.Attribute.ol);
                            },
                            tooltip: 'Numbered list',
                          ),
                          // Blockquote
                          IconButton(
                            icon: const Icon(Icons.format_quote, size: 20),
                            padding: const EdgeInsets.all(8),
                            constraints: const BoxConstraints(),
                            onPressed: () {
                              _toggleQuillBlockFormat(
                                quill.Attribute.blockQuote,
                              );
                            },
                            tooltip: 'Quote',
                          ),
                          // Code Block
                          IconButton(
                            icon: const Icon(Icons.code, size: 20),
                            padding: const EdgeInsets.all(8),
                            constraints: const BoxConstraints(),
                            onPressed: () {
                              _toggleQuillBlockFormat(
                                quill.Attribute.codeBlock,
                              );
                            },
                            tooltip: 'Code block',
                          ),
                          const SizedBox(width: 4),
                          // Link - COMMENTED OUT
                          // IconButton(
                          //   icon: const Icon(Icons.link, size: 20),
                          //   padding: const EdgeInsets.all(8),
                          //   constraints: const BoxConstraints(),
                          //   onPressed: () {
                          //     _showLinkDialog();
                          //   },
                          //   tooltip: 'Insert link',
                          // ),
                        ],
                      ),
                    ),
                  ),
                  // Close button - always visible
                  Container(
                    color:
                        Theme.of(context).colorScheme.surfaceContainerHighest,
                    child: IconButton(
                      icon: const Icon(Icons.close, size: 18),
                      padding: const EdgeInsets.all(8),
                      constraints: const BoxConstraints(),
                      onPressed: () {
                        setState(() {
                          _showFormatting = false;
                        });
                      },
                    ),
                  ),
                ],
              ),
            ),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              IconButton(
                icon: const Icon(Icons.add_circle_outline),
                iconSize: 26,
                padding: const EdgeInsets.all(4),
                constraints: const BoxConstraints(),
                onPressed: () {
                  _showAttachmentOptions();
                },
              ),
              Expanded(
                child: Container(
                  margin: const EdgeInsets.symmetric(
                    horizontal: 2,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color:
                        Theme.of(context).colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(2),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Expanded(
                        child: Container(
                          constraints: const BoxConstraints(
                            minHeight: 40,
                            maxHeight: 120,
                          ),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 8,
                          ),
                          child: quill.QuillEditor(
                            controller: _quillController,
                            focusNode: _quillFocusNode,
                            scrollController: ScrollController(),
                          ),
                        ),
                      ),
                      // Emoji button
                      IconButton(
                        icon: const Icon(Icons.emoji_emotions_outlined),
                        iconSize: 24,
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(
                          minWidth: 24,
                          minHeight: 28,
                        ),
                        onPressed: () {
                          _showEmojiPicker();
                        },
                      ),
                      // Text formatting button
                      IconButton(
                        icon: Icon(
                          Icons.text_format,
                          color: _showFormatting ? Colors.blue : null,
                        ),
                        iconSize: 24,
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(
                          minWidth: 24,
                          minHeight: 28,
                        ),
                        onPressed: () {
                          setState(() {
                            _showFormatting = !_showFormatting;
                          });
                        },
                      ),
                      // AI Mode Toggle - COMMENTED OUT
                      // Container(
                      //   height: 32,
                      //   width: 32,
                      //   margin: const EdgeInsets.only(right: 8, bottom: 8),
                      //   decoration: BoxDecoration(
                      //     color: widget.isAIMode
                      //         ? Colors.blue.withValues(alpha: 0.2)
                      //         : Colors.transparent,
                      //     borderRadius: BorderRadius.circular(2),
                      //     border: Border.all(
                      //       color: widget.isAIMode
                      //           ? Colors.blue
                      //           : Theme.of(context).colorScheme.outline.withValues(alpha: 0.3),
                      //       width: 1.5,
                      //     ),
                      //   ),
                      //   child: IconButton(
                      //     padding: EdgeInsets.zero,
                      //     icon: Icon(
                      //       Icons.auto_awesome,
                      //       size: 18,
                      //       color: widget.isAIMode
                      //           ? Colors.blue
                      //           : Theme.of(context).colorScheme.onSurfaceVariant,
                      //     ),
                      //     onPressed: () {
                      //       widget.onModeChanged(!widget.isAIMode);
                      //     },
                      //     tooltip: widget.isAIMode ? 'Switch to General Messages' : 'Switch to Ask AI',
                      //   ),
                      // ),
                    ],
                  ),
                ),
              ),
              GestureDetector(
                onTap: widget.onSend,
                onLongPress: () {
                  _showScheduleMessageDialog();
                },
                child: Container(
                  width: 48,
                  height: 48,
                  margin: const EdgeInsets.only(left: 4),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      colors: [Colors.teal.shade500, Colors.green.shade500],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.teal.withValues(alpha: 0.4),
                        blurRadius: 8,
                        spreadRadius: 1,
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.send_rounded,
                    color: Colors.white,
                    size: 22,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _showAttachmentOptions() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(5)),
      ),
      builder:
          (context) => Container(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(
                    color: Colors.grey[300],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                Text(
                  'messages.choose_attachment'.tr(),
                  style: Theme.of(
                    context,
                  ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _buildAttachmentOption(
                      context,
                      Icons.image,
                      'messages.image'.tr(),
                      Colors.orange,
                      () {
                        Navigator.pop(context);
                        _pickImage();
                      },
                    ),
                    _buildAttachmentOption(
                      context,
                      Icons.insert_drive_file,
                      'messages.files'.tr(),
                      Colors.blue,
                      () {
                        Navigator.pop(context);
                        _pickFile();
                      },
                    ),
                    _buildAttachmentOption(
                      context,
                      Icons.emoji_emotions,
                      'messages.emoji'.tr(),
                      Colors.amber,
                      () {
                        Navigator.pop(context);
                        _showEmojiPicker();
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _buildAttachmentOption(
                      context,
                      Icons.cloud,
                      'messages.google_drive'.tr(),
                      const Color(0xFF4285F4),
                      () {
                        Navigator.pop(context);
                        _pickFromGoogleDrive();
                      },
                    ),
                    _buildAttachmentOption(
                      context,
                      Icons.gif_box,
                      'gif.title'.tr(),
                      Colors.purple,
                      () {
                        Navigator.pop(context);
                        _showGifPicker();
                      },
                    ),
                    // Only show poll option in channels (not in direct messages)
                    if (widget.isChannel)
                      _buildAttachmentOption(
                        context,
                        Icons.poll,
                        'poll.create_poll'.tr(),
                        AppTheme.primaryLight,
                        () {
                          Navigator.pop(context);
                          _showPollCreator();
                        },
                      ),
                    // Show schedule button if not a channel (poll takes the spot in channels)
                    if (!widget.isChannel)
                      _buildAttachmentOption(
                        context,
                        Icons.schedule_send,
                        'scheduled_message.schedule'.tr(),
                        Colors.teal,
                        () {
                          Navigator.pop(context);
                          _showScheduleMessageDialog();
                        },
                      ),
                  ],
                ),
                // Third row only for channels - schedule button
                if (widget.isChannel) ...[
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildAttachmentOption(
                        context,
                        Icons.schedule_send,
                        'scheduled_message.schedule'.tr(),
                        Colors.teal,
                        () {
                          Navigator.pop(context);
                          _showScheduleMessageDialog();
                        },
                      ),
                      const SizedBox(width: 70), // Placeholder for balance
                      const SizedBox(width: 70), // Placeholder for balance
                    ],
                  ),
                ],
                // Voice and Video options commented out
                // Row(
                //   mainAxisAlignment: MainAxisAlignment.spaceAround,
                //   children: [
                //     _buildAttachmentOption(
                //       context,
                //       Icons.mic,
                //       'Audio',
                //       Colors.red,
                //       () {
                //         Navigator.pop(context);
                //         _startAudioRecording();
                //       },
                //     ),
                //     _buildAttachmentOption(
                //       context,
                //       Icons.videocam,
                //       'Video',
                //       Colors.green,
                //       () {
                //         Navigator.pop(context);
                //         _startVideoRecording();
                //       },
                //     ),
                //   ],
                // ),
                const SizedBox(height: 20),
              ],
            ),
          ),
    );
  }

  void _showPollCreator() {
    final authService = AuthService.instance;
    final userId = authService.currentUser?.id;

    if (userId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('poll.send_failed'.tr()),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    PollCreatorDialog.show(
      context: context,
      creatorId: userId,
      onCreatePoll: (linkedContent) {
        // Add poll to linked content which will be sent with the message
        if (widget.onLinkedContentChanged != null) {
          widget.onLinkedContentChanged!([linkedContent]);
        }
        // Set the poll question as message content
        final pollQuestion =
            linkedContent['poll']?['question'] ?? 'poll.title'.tr();
        widget.controller.text = pollQuestion;
        // Trigger send
        widget.onSend();
      },
    );
  }

  /// Show GIF picker and send selected GIF as a message
  void _showGifPicker() async {
    final gif = await GifPickerDialog.show(context);

    if (gif != null && mounted) {
      // Get the GIF URL - prefer fixed_height for consistent sizing
      final gifUrl =
          gif.images?.fixedHeight?.url ?? gif.images?.original?.url ?? '';

      if (gifUrl.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('gif.send_failed'.tr()),
            backgroundColor: Colors.red,
          ),
        );
        return;
      }

      // Send the GIF via callback
      if (widget.onGifSend != null) {
        widget.onGifSend!(gifUrl, gif.title ?? 'GIF');
      }
    }
  }

  /// Show schedule message dialog to pick a time for the message
  void _showScheduleMessageDialog() async {
    // Get current message text
    final messageText = _quillController.document.toPlainText().trim();

    if (messageText.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('scheduled_message.empty_message'.tr()),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    final scheduledTime = await ScheduleMessageDialog.show(context);

    if (scheduledTime != null && mounted) {
      // Call the onScheduleMessage callback if provided
      // Use plain text for display, not HTML
      if (widget.onScheduleMessage != null) {
        widget.onScheduleMessage!(messageText, scheduledTime);
        // Clear the editor
        _quillController.clear();

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('scheduled_message.scheduled_success'.tr()),
            backgroundColor: Colors.green,
          ),
        );
      }
    }
  }

  /// Show the scheduled messages panel (delegates to parent)
  void _showScheduledMessagesPanel() {
    widget.onShowScheduledMessages?.call();
  }

  /// Get HTML content from Quill editor
  String? _getHtmlFromQuill() {
    try {
      final delta = _quillController.document.toDelta();
      // Simple conversion - in production you'd use a proper delta to HTML converter
      final plainText = _quillController.document.toPlainText();
      return '<p>$plainText</p>';
    } catch (e) {
      return null;
    }
  }

  Widget _buildAttachmentOption(
    BuildContext context,
    IconData icon,
    String label,
    Color color,
    VoidCallback onTap,
  ) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(2),
      child: Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 30, color: color),
            ),
            const SizedBox(height: 8),
            Text(
              label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: Theme.of(context).textTheme.bodyMedium?.color,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _pickImage() async {
    try {
      // Show image source options
      if (!mounted) return;
      showDialog(
        context: context,
        builder:
            (context) => AlertDialog(
              title: const Text('Select Image'),
              content: const Text('Choose image source:'),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
                TextButton(
                  onPressed: () async {
                    Navigator.pop(context);

                    // Pick from gallery
                    final ImagePicker picker = ImagePicker();
                    final XFile? image = await picker.pickImage(
                      source: ImageSource.gallery,
                      imageQuality: 80,
                    );

                    if (image != null && mounted) {
                      File imageFile = File(image.path);
                      int fileSize = await imageFile.length();
                      String fileSizeStr = FileUtils.formatFileSize(fileSize);

                      // Show confirmation dialog
                      _showMediaConfirmDialog(
                        image.path,
                        image.name,
                        fileSizeStr,
                        MediaType.image,
                        '🖼️ Image ($fileSizeStr)',
                      );
                    }
                  },
                  child: const Text('Gallery'),
                ),
                TextButton(
                  onPressed: () async {
                    Navigator.pop(context);

                    // Take photo with camera
                    final ImagePicker picker = ImagePicker();
                    final XFile? image = await picker.pickImage(
                      source: ImageSource.camera,
                      imageQuality: 80,
                    );

                    if (image != null && mounted) {
                      File imageFile = File(image.path);
                      int fileSize = await imageFile.length();
                      String fileSizeStr = FileUtils.formatFileSize(fileSize);

                      // Show confirmation dialog
                      _showMediaConfirmDialog(
                        image.path,
                        'Photo',
                        fileSizeStr,
                        MediaType.image,
                        '🖼️ Photo ($fileSizeStr)',
                      );
                    }
                  },
                  child: const Text('Camera'),
                ),
              ],
            ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error selecting image: $e')));
      }
    }
  }

  /// Show confirmation dialog before sending media
  void _showMediaConfirmDialog(
    String filePath,
    String fileName,
    String fileSize,
    MediaType mediaType,
    String description,
  ) {
    if (!mounted) return;

    String typeLabel;
    switch (mediaType) {
      case MediaType.image:
        typeLabel = 'IMAGE';
        break;
      case MediaType.video:
        typeLabel = 'VIDEO';
        break;
      case MediaType.audio:
        typeLabel = 'AUDIO';
        break;
      case MediaType.document:
        typeLabel = 'DOCUMENT';
        break;
    }

    showDialog(
      context: context,
      builder:
          (dialogContext) => AlertDialog(
            title: Text('Send $typeLabel?'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('File: $fileName'),
                Text('Size: $fileSize'),
                Text('Type: $typeLabel'),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(dialogContext),
                child: const Text('Cancel'),
              ),
              TextButton(
                onPressed: () {
                  Navigator.pop(dialogContext);

                  // Send media message
                  if (widget.onMediaSend != null) {
                    widget.onMediaSend!(filePath, mediaType, description);
                  } else {
                    setContent(description);
                    widget.onSend();
                  }

                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Sending $fileName...')),
                    );
                  }
                },
                child: const Text('Send'),
              ),
            ],
          ),
    );
  }

  void _pickFile() async {
    try {
      // On iOS, don't use withData to avoid memory crashes with large files
      FilePickerResult? result = await FilePicker.platform.pickFiles(
        allowMultiple: false,
        type: FileType.any,
      );

      if (result == null || result.files.isEmpty) {
        // User cancelled the picker
        return;
      }

      final file = result.files.single;
      String? filePath = file.path;

      // On iOS, if path is null, try to get a cached copy
      if (filePath == null && Platform.isIOS) {
        debugPrint('iOS file path is null, file name: ${file.name}');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                'Could not access the selected file. Please try selecting from a different location.',
              ),
            ),
          );
        }
        return;
      }

      if (filePath == null || filePath.isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Could not access the selected file')),
          );
        }
        return;
      }

      // Verify file exists
      final fileExists = await File(filePath).exists();
      if (!fileExists) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('File not found or access denied')),
          );
        }
        return;
      }

      String fileName = file.name;
      int fileSize = file.size;

      // Convert file size to readable format
      String fileSizeStr = FileUtils.formatFileSize(fileSize);

      // Determine file type based on extension
      String extension = fileName.toLowerCase().split('.').last;
      MediaType mediaType;
      String emoji;

      if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].contains(extension)) {
        mediaType = MediaType.image;
        emoji = '🖼️';
      } else if ([
        'mp4',
        'avi',
        'mov',
        'mkv',
        'wmv',
        'flv',
      ].contains(extension)) {
        mediaType = MediaType.video;
        emoji = '🎥';
      } else if ([
        'mp3',
        'wav',
        'aac',
        'm4a',
        'flac',
        'ogg',
      ].contains(extension)) {
        mediaType = MediaType.audio;
        emoji = '🎵';
      } else {
        mediaType = MediaType.document;
        emoji = '📎';
      }

      // Show confirmation dialog
      if (!mounted) return;
      showDialog(
        context: context,
        builder:
            (context) => AlertDialog(
              title: const Text('Send File?'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('File: $fileName'),
                  Text('Size: $fileSizeStr'),
                  Text('Type: ${mediaType.name.toUpperCase()}'),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
                TextButton(
                  onPressed: () {
                    Navigator.pop(context);

                    // Send file as media message
                    if (widget.onMediaSend != null) {
                      // For documents, we want to pass just the filename in the text field
                      // and the description as a separate parameter
                      String description =
                          mediaType == MediaType.document
                              ? fileName
                              : '$emoji $fileName ($fileSizeStr)';
                      widget.onMediaSend!(filePath, mediaType, description);
                    } else {
                      // Fallback if onMediaSend is not provided
                      setContent('$emoji $fileName ($fileSizeStr)');
                      widget.onSend();
                    }

                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Sending $fileName...')),
                      );
                    }
                  },
                  child: const Text('Send'),
                ),
              ],
            ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error picking file: $e')));
      }
    }
  }

  /// Pick file from Google Drive
  void _pickFromGoogleDrive() async {
    debugPrint('📁 Opening Google Drive file picker...');
    try {
      final result = await GoogleDriveFilePicker.show(
        context: context,
        downloadFile: true,
      );

      if (result == null) {
        // User cancelled the picker
        debugPrint('📁 User cancelled Google Drive picker');
        return;
      }

      // Get file info from the result
      final driveFile = result.file;
      final localFile = result.localFile;
      final fileBytes = result.fileBytes;

      debugPrint('📁 File selected from Google Drive:');
      debugPrint('   Name: ${driveFile.name}');
      debugPrint('   ID: ${driveFile.id}');
      debugPrint('   MimeType: ${driveFile.mimeType}');
      debugPrint('   Size: ${driveFile.size}');
      debugPrint('   Local file: ${localFile?.path}');
      debugPrint('   File bytes: ${fileBytes?.length ?? 0} bytes');
      debugPrint('   Is Web: $kIsWeb');

      String fileName = driveFile.name;
      String? filePath;
      int fileSize;

      if (kIsWeb) {
        // On web, we have bytes instead of file path
        if (fileBytes == null || fileBytes.isEmpty) {
          debugPrint('❌ No file bytes from Google Drive picker (web)');
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Could not download the file from Google Drive'),
              ),
            );
          }
          return;
        }
        fileSize = fileBytes.length;
        debugPrint('📁 Web file bytes: $fileSize bytes');
      } else {
        // On mobile, we have local file path
        final localPath = localFile?.path;

        // If we don't have a local file, show an error
        if (localPath == null || localPath.isEmpty) {
          debugPrint('❌ No local file path from Google Drive picker');
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Could not download the file from Google Drive'),
              ),
            );
          }
          return;
        }

        filePath = localPath;

        // Verify file exists
        final localFileRef = File(localPath);
        final fileExists = await localFileRef.exists();
        if (!fileExists) {
          debugPrint('❌ Downloaded file not found at: $localPath');
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Downloaded file not found')),
            );
          }
          return;
        }

        // Get actual file size from local file
        fileSize = await localFileRef.length();
        debugPrint('📁 Local file size: $fileSize bytes');
      }

      // Convert file size to readable format
      String fileSizeStr = FileUtils.formatFileSize(fileSize);

      // Determine file type based on mime type or extension
      String mimeType = driveFile.mimeType;
      MediaType mediaType;
      String emoji;

      if (mimeType.startsWith('image/')) {
        mediaType = MediaType.image;
        emoji = '🖼️';
      } else if (mimeType.startsWith('video/')) {
        mediaType = MediaType.video;
        emoji = '🎥';
      } else if (mimeType.startsWith('audio/')) {
        mediaType = MediaType.audio;
        emoji = '🎵';
      } else {
        mediaType = MediaType.document;
        emoji = '📎';
      }

      // Show confirmation dialog
      if (!mounted) return;
      showDialog(
        context: context,
        builder:
            (context) => AlertDialog(
              title: Row(
                children: [
                  const Icon(Icons.cloud, color: Color(0xFF4285F4), size: 24),
                  const SizedBox(width: 8),
                  const Text('Send from Drive?'),
                ],
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('File: $fileName'),
                  Text('Size: $fileSizeStr'),
                  Text('Type: ${mediaType.name.toUpperCase()}'),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
                TextButton(
                  onPressed: () {
                    Navigator.pop(context);

                    String description =
                        mediaType == MediaType.document
                            ? fileName
                            : '$emoji $fileName ($fileSizeStr)';

                    // Send file as media message
                    if (kIsWeb) {
                      // On web, use bytes directly via onMediaSendBytes callback
                      if (widget.onMediaSendBytes != null &&
                          fileBytes != null) {
                        widget.onMediaSendBytes!(
                          fileBytes,
                          fileName,
                          mimeType,
                          mediaType,
                          description,
                        );
                      } else {
                        debugPrint(
                          '❌ onMediaSendBytes callback not available or no bytes',
                        );
                        ScaffoldMessenger.of(this.context).showSnackBar(
                          const SnackBar(
                            content: Text('Failed to send file on web'),
                          ),
                        );
                        return;
                      }
                    } else {
                      // On mobile, use file path
                      if (widget.onMediaSend != null && filePath != null) {
                        widget.onMediaSend!(filePath, mediaType, description);
                      } else {
                        // Fallback if onMediaSend is not provided
                        setContent('$emoji $fileName ($fileSizeStr)');
                        widget.onSend();
                      }
                    }

                    if (mounted) {
                      ScaffoldMessenger.of(this.context).showSnackBar(
                        SnackBar(
                          content: Text(
                            'Sending $fileName from Google Drive...',
                          ),
                        ),
                      );
                    }
                  },
                  child: const Text('Send'),
                ),
              ],
            ),
      );
    } catch (e) {
      debugPrint('❌ Error in _pickFromGoogleDrive: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error picking file from Google Drive: $e')),
        );
      }
    }
  }

  void _showEmojiPicker() {
    // List of common emojis as fallback
    final commonEmojis = [
      '😀',
      '😃',
      '😄',
      '😁',
      '😅',
      '😂',
      '🤣',
      '😊',
      '😇',
      '🙂',
      '🙃',
      '😉',
      '😌',
      '😍',
      '🥰',
      '😘',
      '😗',
      '😙',
      '😚',
      '😋',
      '😛',
      '😝',
      '😜',
      '🤪',
      '🤨',
      '🧐',
      '🤓',
      '😎',
      '🤩',
      '🥳',
      '😏',
      '😒',
      '😞',
      '😔',
      '😟',
      '😕',
      '🙁',
      '☹️',
      '😣',
      '😖',
      '😫',
      '😩',
      '🥺',
      '😢',
      '😭',
      '😤',
      '😠',
      '😡',
      '❤️',
      '🧡',
      '💛',
      '💚',
      '💙',
      '💜',
      '🖤',
      '🤍',
      '🤎',
      '💔',
      '❣️',
      '💕',
      '💞',
      '💓',
      '💗',
      '💖',
      '💘',
      '💝',
      '👍',
      '👎',
      '👌',
      '✌️',
      '🤞',
      '🤟',
      '🤘',
      '🤙',
      '👏',
      '🙌',
      '👐',
      '🤲',
      '🤝',
      '🙏',
      '✍️',
      '💪',
      '🦾',
      '🦿',
      '🎉',
      '🎊',
      '🎈',
      '🎁',
      '🎂',
      '🎄',
      '🎃',
      '🎆',
      '🎇',
      '🧨',
      '✨',
      '🎪',
    ];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder:
          (context) => Container(
            height: MediaQuery.of(context).size.height * 0.5,
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(20),
                topRight: Radius.circular(20),
              ),
            ),
            child: Column(
              children: [
                Container(
                  margin: const EdgeInsets.only(top: 8, bottom: 8),
                  width: 40,
                  height: 5,
                  decoration: BoxDecoration(
                    color: Colors.grey[400],
                    borderRadius: BorderRadius.circular(2.5),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(8.0),
                  child: Text(
                    'Select Emoji',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                // Always use the fallback grid for now to ensure it works
                Expanded(child: _buildFallbackEmojiGrid(commonEmojis)),
              ],
            ),
          ),
    );
  }

  void _insertEmoji(String emoji) {
    final selection = _quillController.selection;
    _quillController.replaceText(
      selection.baseOffset,
      selection.extentOffset - selection.baseOffset,
      emoji,
      TextSelection.collapsed(offset: selection.baseOffset + emoji.length),
    );
  }

  Widget _buildFallbackEmojiGrid(List<String> emojis) {
    return Padding(
      padding: const EdgeInsets.all(8.0),
      child: GridView.builder(
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 8,
          crossAxisSpacing: 8,
          mainAxisSpacing: 8,
        ),
        itemCount: emojis.length,
        itemBuilder: (context, index) {
          return InkWell(
            onTap: () {
              _insertEmoji(emojis[index]);
              Navigator.pop(context);
            },
            borderRadius: BorderRadius.circular(2),
            child: Container(
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(2),
              ),
              child: Center(
                child: Text(
                  emojis[index],
                  style: const TextStyle(fontSize: 24),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  void _startAudioRecording() async {
    if (!_isRecorderInitialized) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Audio recorder not ready')));
      return;
    }

    // Request microphone permission
    final micPermission = await Permission.microphone.request();

    if (micPermission.isGranted) {
      try {
        // Get temporary directory
        final tempDir = await getTemporaryDirectory();
        final timestamp = DateTime.now().millisecondsSinceEpoch;
        _recordingPath = '${tempDir.path}/audio_$timestamp.m4a';

        // Start recording
        await _audioRecorder.startRecorder(
          toFile: _recordingPath!,
          codec: Codec.aacMP4,
        );

        setState(() {
          _isRecording = true;
          _recordingDuration = 0;
        });

        // Start timer to track duration
        _recordingTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
          if (mounted) {
            setState(() {
              _recordingDuration++;
            });
          }
        });

        if (!mounted) return;

        // Show recording dialog
        showDialog(
          context: context,
          barrierDismissible: false,
          builder:
              (context) => StatefulBuilder(
                builder: (context, setDialogState) {
                  // Update dialog every second
                  Timer.periodic(const Duration(seconds: 1), (timer) {
                    if (!_isRecording) {
                      timer.cancel();
                    } else if (mounted) {
                      setDialogState(() {});
                    }
                  });

                  return AlertDialog(
                    title: const Text('Recording Audio'),
                    content: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.mic, size: 80, color: Colors.red[400]),
                        const SizedBox(height: 20),
                        Text(
                          _formatDuration(_recordingDuration),
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          'Tap Stop to finish recording',
                          style: TextStyle(
                            color: Colors.grey[600],
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                    actions: [
                      TextButton(
                        onPressed: () => _stopRecording(context),
                        child: const Text(
                          'Stop',
                          style: TextStyle(color: Colors.red),
                        ),
                      ),
                    ],
                  );
                },
              ),
        );
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error starting recording: $e')),
          );
        }
      }
    } else {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Microphone permission denied'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _stopRecording(BuildContext dialogContext) async {
    try {
      // Stop recording
      final path = await _audioRecorder.stopRecorder();
      _recordingTimer?.cancel();

      setState(() {
        _isRecording = false;
      });

      Navigator.pop(dialogContext);

      if (path != null && mounted) {
        // Get file info
        final duration = _recordingDuration;
        final durationStr = _formatDuration(duration);

        // Get file size
        File audioFile = File(path);
        int fileSize = await audioFile.length();
        String fileSizeStr = FileUtils.formatFileSize(fileSize);

        // Show confirmation dialog
        _showMediaConfirmDialog(
          path,
          'Voice message ($durationStr)',
          fileSizeStr,
          MediaType.audio,
          '🎤 Voice message ($durationStr)',
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error stopping recording: $e')));
      }
    }
  }

  String _formatDuration(int seconds) {
    final minutes = seconds ~/ 60;
    final remainingSeconds = seconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${remainingSeconds.toString().padLeft(2, '0')}';
  }

  void _startVideoRecording() async {
    try {
      // Request camera and microphone permissions
      final cameraPermission = await Permission.camera.request();
      final micPermission = await Permission.microphone.request();

      if (cameraPermission.isGranted && micPermission.isGranted) {
        final ImagePicker picker = ImagePicker();

        // Show options dialog
        if (!mounted) return;
        showDialog(
          context: context,
          builder:
              (context) => AlertDialog(
                title: const Text('Video Recording'),
                content: const Text('Choose an option:'),
                actions: [
                  TextButton(
                    onPressed: () async {
                      Navigator.pop(context);

                      // Record new video with specific quality settings for better compatibility
                      final XFile? video = await picker.pickVideo(
                        source: ImageSource.camera,
                        maxDuration: const Duration(minutes: 5),
                        preferredCameraDevice: CameraDevice.rear,
                      );

                      if (video != null && mounted) {
                        File videoFile = File(video.path);
                        int fileSize = await videoFile.length();
                        String fileSizeStr = FileUtils.formatFileSize(fileSize);

                        // Show confirmation dialog
                        _showMediaConfirmDialog(
                          video.path,
                          'Recorded Video',
                          fileSizeStr,
                          MediaType.video,
                          '🎥 Video ($fileSizeStr)',
                        );
                      }
                    },
                    child: const Text('Record New Video'),
                  ),
                  TextButton(
                    onPressed: () async {
                      Navigator.pop(context);

                      // Pick from gallery
                      final XFile? video = await picker.pickVideo(
                        source: ImageSource.gallery,
                      );

                      if (video != null && mounted) {
                        File videoFile = File(video.path);
                        int fileSize = await videoFile.length();
                        String fileSizeStr = FileUtils.formatFileSize(fileSize);

                        // Show confirmation dialog
                        _showMediaConfirmDialog(
                          video.path,
                          video.name,
                          fileSizeStr,
                          MediaType.video,
                          '🎥 Video ($fileSizeStr)',
                        );
                      }
                    },
                    child: const Text('Choose from Gallery'),
                  ),
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Cancel'),
                  ),
                ],
              ),
        );
      } else {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Camera and microphone permissions are required'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }
}

class TypingIndicator extends StatefulWidget {
  const TypingIndicator({super.key});

  @override
  State<TypingIndicator> createState() => _TypingIndicatorState();
}

class _TypingIndicatorState extends State<TypingIndicator>
    with TickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );
    _animation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeInOut),
    );
    _animationController.repeat(reverse: true);
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(2),
        ),
        child: AnimatedBuilder(
          animation: _animation,
          builder: (context, child) {
            return Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.smart_toy, size: 16, color: Colors.purple),
                const SizedBox(width: 8),
                Text(
                  'AI is typing',
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                    fontStyle: FontStyle.italic,
                  ),
                ),
                const SizedBox(width: 4),
                SizedBox(
                  width: 20,
                  child: Text(
                    '...',
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                      fontSize: 16,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class VideoPlayerWidget extends StatefulWidget {
  final String videoUrl;
  final bool isMe;

  const VideoPlayerWidget({
    super.key,
    required this.videoUrl,
    required this.isMe,
  });

  @override
  State<VideoPlayerWidget> createState() => _VideoPlayerWidgetState();
}

class _VideoPlayerWidgetState extends State<VideoPlayerWidget> {
  VideoPlayerController? _controller;
  bool _isPlaying = false;
  bool _isInitialized = false;
  bool _showControls = true;
  bool _hasError = false;
  String _errorMessage = '';
  Timer? _hideControlsTimer;

  @override
  void initState() {
    super.initState();
    _initializeVideoPlayer();
  }

  Future<void> _initializeVideoPlayer() async {
    try {
      print('VideoPlayer: Initializing video with URL: ${widget.videoUrl}');
      print('VideoPlayer: URL length: ${widget.videoUrl.length}');
      print(
        'VideoPlayer: URL starts with /: ${widget.videoUrl.startsWith('/')}',
      );

      // Check if file exists for local paths
      if (widget.videoUrl.startsWith('/')) {
        final file = File(widget.videoUrl);
        final exists = await file.exists();
        final fileSize = exists ? await file.length() : 0;
        print('VideoPlayer: Local file exists: $exists');
        print('VideoPlayer: File size: $fileSize bytes');
        print('VideoPlayer: File path: ${widget.videoUrl}');

        if (!exists) {
          throw Exception('Video file not found at path: ${widget.videoUrl}');
        }

        if (fileSize == 0) {
          throw Exception('Video file is empty: ${widget.videoUrl}');
        }

        // Check if file extension is supported
        final extension = widget.videoUrl.split('.').last.toLowerCase();
        print('VideoPlayer: File extension: $extension');
        if (!['mp4', 'mov', 'avi', 'mkv', '3gp', 'webm'].contains(extension)) {
          print('VideoPlayer: Warning - Unsupported video format: $extension');
        }

        print('VideoPlayer: Creating VideoPlayerController.file');
        _controller = VideoPlayerController.file(file);
      } else if (widget.videoUrl.startsWith('http')) {
        // If it's a URL
        print('VideoPlayer: Loading network video');
        _controller = VideoPlayerController.networkUrl(
          Uri.parse(widget.videoUrl),
        );
      } else {
        throw Exception('Invalid video URL format: ${widget.videoUrl}');
      }

      print('VideoPlayer: Starting initialization...');

      // Add timeout to initialization
      await _controller!.initialize().timeout(
        const Duration(seconds: 10),
        onTimeout: () {
          throw Exception('Video initialization timeout after 10 seconds');
        },
      );

      print('VideoPlayer: Initialization completed successfully');

      if (mounted) {
        setState(() {
          _isInitialized = true;
          _hasError = false;
        });

        print('VideoPlayer: Video duration: ${_controller!.value.duration}');
        print('VideoPlayer: Video size: ${_controller!.value.size}');
        print('VideoPlayer: Aspect ratio: ${_controller!.value.aspectRatio}');

        // Don't auto-play - wait for user to tap play button
        print('VideoPlayer: Ready to play (tap play button)');
      }

      // Listen to video state changes
      _controller!.addListener(() {
        if (mounted) {
          final isPlaying = _controller!.value.isPlaying;
          if (_isPlaying != isPlaying) {
            setState(() {
              _isPlaying = isPlaying;
            });
          }

          // Handle errors
          if (_controller!.value.hasError) {
            final error =
                _controller!.value.errorDescription ?? 'Unknown video error';
            print('VideoPlayer: Error occurred: $error');
            if (mounted) {
              setState(() {
                _hasError = true;
                _errorMessage = error;
                _isInitialized = false;
              });
            }
          }
        }
      });
    } catch (e) {
      print('VideoPlayer: Initialization failed: $e');
      if (mounted) {
        setState(() {
          _isInitialized = false;
          _hasError = true;
          _errorMessage = e.toString();
        });
      }
    }
  }

  @override
  void dispose() {
    _hideControlsTimer?.cancel();
    _controller?.dispose();
    super.dispose();
  }

  void _togglePlayPause() {
    if (_controller != null && _isInitialized) {
      setState(() {
        if (_isPlaying) {
          _controller!.pause();
        } else {
          _controller!.play();
        }
      });
      _showControlsTemporarily();
    }
  }

  void _showControlsTemporarily() {
    setState(() {
      _showControls = true;
    });

    _hideControlsTimer?.cancel();
    _hideControlsTimer = Timer(const Duration(seconds: 3), () {
      if (mounted && _isPlaying) {
        setState(() {
          _showControls = false;
        });
      }
    });
  }

  String _formatDuration(Duration duration) {
    String twoDigits(int n) => n.toString().padLeft(2, '0');
    final minutes = twoDigits(duration.inMinutes.remainder(60));
    final seconds = twoDigits(duration.inSeconds.remainder(60));
    return '$minutes:$seconds';
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final maxWidth = (screenWidth * 0.8).clamp(200.0, 300.0);
    final aspectRatio = _controller?.value.aspectRatio ?? 16 / 9;
    final videoHeight = (maxWidth / aspectRatio).clamp(120.0, 200.0);

    return Container(
      constraints: BoxConstraints(
        maxWidth: maxWidth,
        maxHeight: videoHeight + 20, // Add padding for controls
      ),
      decoration: BoxDecoration(
        color: Colors.black,
        borderRadius: BorderRadius.circular(2),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(2),
        child:
            _hasError
                ? Container(
                  width: maxWidth,
                  height: videoHeight,
                  decoration: BoxDecoration(
                    color: Colors.red.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(2),
                    border: Border.all(
                      color: Colors.red.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(
                        Icons.error_outline,
                        size: 32,
                        color: Colors.red,
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Video Error',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: Text(
                          _errorMessage,
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 10),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(height: 8),
                      ElevatedButton(
                        onPressed: () {
                          setState(() {
                            _hasError = false;
                            _isInitialized = false;
                          });
                          _initializeVideoPlayer();
                        },
                        style: ElevatedButton.styleFrom(
                          minimumSize: const Size(60, 30),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 4,
                          ),
                        ),
                        child: const Text(
                          'Retry',
                          style: TextStyle(fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                )
                : _isInitialized && _controller != null
                ? LayoutBuilder(
                  builder: (context, constraints) {
                    return GestureDetector(
                      onTap: _showControlsTemporarily,
                      child: SizedBox(
                        width: maxWidth,
                        height: videoHeight,
                        child: Stack(
                          alignment: Alignment.center,
                          children: [
                            // Video player with proper sizing
                            SizedBox(
                              width: maxWidth,
                              height: videoHeight,
                              child: FittedBox(
                                fit: BoxFit.cover,
                                child: SizedBox(
                                  width: _controller!.value.size.width,
                                  height: _controller!.value.size.height,
                                  child: VideoPlayer(_controller!),
                                ),
                              ),
                            ),
                            // Controls overlay
                            if (_showControls || !_isPlaying)
                              Container(
                                width: maxWidth,
                                height: videoHeight,
                                decoration: BoxDecoration(
                                  color: Colors.black45,
                                  borderRadius: BorderRadius.circular(2),
                                ),
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Container(
                                      decoration: BoxDecoration(
                                        color: Colors.blue,
                                        shape: BoxShape.circle,
                                      ),
                                      child: IconButton(
                                        onPressed: _togglePlayPause,
                                        icon: Icon(
                                          _isPlaying
                                              ? Icons.pause
                                              : Icons.play_arrow,
                                          color: Colors.white,
                                          size: 40,
                                        ),
                                      ),
                                    ),
                                    // Only show progress bar if duration is available
                                    if (_controller!.value.duration.inSeconds >
                                        0)
                                      Padding(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 12,
                                        ),
                                        child: Column(
                                          children: [
                                            // Progress bar
                                            SliderTheme(
                                              data: SliderTheme.of(
                                                context,
                                              ).copyWith(
                                                trackHeight: 2,
                                                thumbShape:
                                                    const RoundSliderThumbShape(
                                                      enabledThumbRadius: 6,
                                                    ),
                                                overlayShape:
                                                    const RoundSliderOverlayShape(
                                                      overlayRadius: 12,
                                                    ),
                                              ),
                                              child: Slider(
                                                value: _controller!
                                                    .value
                                                    .position
                                                    .inSeconds
                                                    .toDouble()
                                                    .clamp(
                                                      0.0,
                                                      _controller!
                                                          .value
                                                          .duration
                                                          .inSeconds
                                                          .toDouble(),
                                                    ),
                                                min: 0.0,
                                                max:
                                                    _controller!
                                                        .value
                                                        .duration
                                                        .inSeconds
                                                        .toDouble(),
                                                onChanged: (value) {
                                                  _controller!.seekTo(
                                                    Duration(
                                                      seconds: value.toInt(),
                                                    ),
                                                  );
                                                },
                                                activeColor: Colors.blue,
                                                inactiveColor: Colors.white54,
                                              ),
                                            ),
                                            // Time display
                                            Row(
                                              mainAxisAlignment:
                                                  MainAxisAlignment
                                                      .spaceBetween,
                                              children: [
                                                Text(
                                                  _formatDuration(
                                                    _controller!.value.position,
                                                  ),
                                                  style: const TextStyle(
                                                    color: Colors.white,
                                                    fontSize: 10,
                                                  ),
                                                ),
                                                Text(
                                                  _formatDuration(
                                                    _controller!.value.duration,
                                                  ),
                                                  style: const TextStyle(
                                                    color: Colors.white,
                                                    fontSize: 10,
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
                            // Video label
                            Positioned(
                              top: 4,
                              right: 4,
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 6,
                                  vertical: 2,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.black54,
                                  borderRadius: BorderRadius.circular(2),
                                ),
                                child: const Text(
                                  'Video',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 8,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                )
                : Container(
                  width: maxWidth,
                  height: videoHeight,
                  decoration: BoxDecoration(
                    color:
                        Theme.of(context).colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(2),
                  ),
                  child: const Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                      SizedBox(height: 8),
                      Text('Loading video...', style: TextStyle(fontSize: 12)),
                    ],
                  ),
                ),
      ),
    );
  }
}

class AudioPlayerWidget extends StatefulWidget {
  final String audioUrl;
  final bool isMe;

  const AudioPlayerWidget({
    super.key,
    required this.audioUrl,
    required this.isMe,
  });

  @override
  State<AudioPlayerWidget> createState() => _AudioPlayerWidgetState();
}

class _AudioPlayerWidgetState extends State<AudioPlayerWidget> {
  final AudioPlayer _audioPlayer = AudioPlayer();
  bool _isPlaying = false;
  Duration _duration = Duration.zero;
  Duration _position = Duration.zero;

  @override
  void initState() {
    super.initState();
    _setupAudioPlayer();
  }

  void _setupAudioPlayer() {
    // Listen to duration changes
    _audioPlayer.onDurationChanged.listen((duration) {
      if (mounted) {
        setState(() {
          _duration = duration;
        });
      }
    });

    // Listen to position changes
    _audioPlayer.onPositionChanged.listen((position) {
      if (mounted) {
        setState(() {
          _position = position;
        });
      }
    });

    // Listen to player state changes
    _audioPlayer.onPlayerComplete.listen((_) {
      if (mounted) {
        setState(() {
          _isPlaying = false;
          _position = Duration.zero;
        });
      }
    });
  }

  @override
  void dispose() {
    _audioPlayer.dispose();
    super.dispose();
  }

  Future<void> _togglePlayPause() async {
    try {
      if (_isPlaying) {
        await _audioPlayer.pause();
      } else {
        // If it's a local file path
        if (widget.audioUrl.startsWith('/')) {
          await _audioPlayer.play(DeviceFileSource(widget.audioUrl));
        } else {
          // If it's a URL
          await _audioPlayer.play(UrlSource(widget.audioUrl));
        }
      }

      setState(() {
        _isPlaying = !_isPlaying;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error playing audio: $e')));
      }
    }
  }

  String _formatDuration(Duration duration) {
    String twoDigits(int n) => n.toString().padLeft(2, '0');
    final minutes = twoDigits(duration.inMinutes.remainder(60));
    final seconds = twoDigits(duration.inSeconds.remainder(60));
    return '$minutes:$seconds';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: BoxConstraints(
        maxWidth: MediaQuery.of(context).size.width * 0.65,
      ),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(2),
      ),
      child: IntrinsicWidth(
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Play/Pause button
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.blue,
              ),
              child: IconButton(
                icon: Icon(
                  _isPlaying ? Icons.pause : Icons.play_arrow,
                  color: Colors.white,
                  size: 18,
                ),
                onPressed: _togglePlayPause,
                padding: EdgeInsets.zero,
              ),
            ),
            const SizedBox(width: 8),
            // Duration and progress
            Flexible(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'Voice Message',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    '${_formatDuration(_position)} / ${_formatDuration(_duration)}',
                    style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            // Progress bar
            Flexible(
              child: Container(
                height: 24,
                constraints: const BoxConstraints(minWidth: 60, maxWidth: 100),
                child: Center(
                  child: SizedBox(
                    height: 4,
                    child: LinearProgressIndicator(
                      value:
                          _duration.inMilliseconds > 0
                              ? _position.inMilliseconds /
                                  _duration.inMilliseconds
                              : 0.0,
                      backgroundColor: Colors.blue.withValues(alpha: 0.2),
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.blue),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class MediaHistorySheet extends StatefulWidget {
  final List<ChatMessage> messages;

  const MediaHistorySheet({super.key, required this.messages});

  @override
  State<MediaHistorySheet> createState() => _MediaHistorySheetState();
}

class _MediaHistorySheetState extends State<MediaHistorySheet> {
  MediaType _selectedType = MediaType.image;
  Map<MediaType, List<MediaItem>> _mediaItems = {};

  @override
  void initState() {
    super.initState();
    _extractAttachmentsFromMessages();
  }

  void _extractAttachmentsFromMessages() {
    final images = <MediaItem>[];
    final videos = <MediaItem>[];
    final audio = <MediaItem>[];
    final documents = <MediaItem>[];

    // Iterate through all messages and extract attachments
    for (var message in widget.messages) {
      if (message.attachments != null && message.attachments!.isNotEmpty) {
        for (var attachment in message.attachments!) {
          final mediaItem = MediaItem.fromAttachment(
            attachment,
            message.senderName,
            message.timestamp,
          );

          // Group by MIME type
          final mimeType = attachment.mimeType.toLowerCase();
          if (mimeType.startsWith('image/')) {
            images.add(mediaItem);
          } else if (mimeType.startsWith('video/')) {
            videos.add(mediaItem);
          } else if (mimeType.startsWith('audio/')) {
            audio.add(mediaItem);
          } else {
            documents.add(mediaItem);
          }
        }
      }
    }

    // Sort by date (newest first)
    images.sort((a, b) => b.date.compareTo(a.date));
    videos.sort((a, b) => b.date.compareTo(a.date));
    audio.sort((a, b) => b.date.compareTo(a.date));
    documents.sort((a, b) => b.date.compareTo(a.date));

    setState(() {
      _mediaItems = {
        MediaType.image: images,
        MediaType.video: videos,
        MediaType.audio: audio,
        MediaType.document: documents,
      };
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.7,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          Container(
            margin: const EdgeInsets.only(top: 8),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Theme.of(
                context,
              ).colorScheme.onSurfaceVariant.withValues(alpha: 0.4),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Text(
              'messages.media_files'.tr(),
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
            ),
          ),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                _buildFilterChip(
                  'messages.images'.tr(),
                  MediaType.image,
                  Icons.image,
                ),
                const SizedBox(width: 8),
                _buildFilterChip(
                  'messages.videos'.tr(),
                  MediaType.video,
                  Icons.videocam,
                ),
                const SizedBox(width: 8),
                _buildFilterChip(
                  'messages.audio'.tr(),
                  MediaType.audio,
                  Icons.audiotrack,
                ),
                const SizedBox(width: 8),
                _buildFilterChip(
                  'messages.documents'.tr(),
                  MediaType.document,
                  Icons.description,
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Expanded(
            child:
                (_mediaItems[_selectedType]?.isEmpty ?? true)
                    ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            _getIconForType(_selectedType),
                            size: 64,
                            color: Theme.of(context)
                                .colorScheme
                                .onSurfaceVariant
                                .withValues(alpha: 0.5),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'messages.no_files'.tr(
                              args: [
                                _getTypeLabel(_selectedType).toLowerCase(),
                              ],
                            ),
                            style: Theme.of(
                              context,
                            ).textTheme.bodyLarge?.copyWith(
                              color:
                                  Theme.of(
                                    context,
                                  ).colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    )
                    : ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: _mediaItems[_selectedType]?.length ?? 0,
                      itemBuilder: (context, index) {
                        final item = _mediaItems[_selectedType]![index];
                        return _buildMediaItem(item);
                      },
                    ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, MediaType type, IconData icon) {
    final isSelected = _selectedType == type;
    final count = _mediaItems[type]?.length ?? 0;

    return FilterChip(
      label: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16),
          const SizedBox(width: 4),
          Text('$label ($count)'),
        ],
      ),
      selected: isSelected,
      onSelected: (selected) {
        setState(() {
          _selectedType = type;
        });
      },
      backgroundColor: isSelected ? Colors.blue.withValues(alpha: 0.2) : null,
      selectedColor: Colors.blue.withValues(alpha: 0.2),
    );
  }

  Widget _buildMediaItem(MediaItem item) {
    // Determine media type from MIME type for proper icon display
    MediaType itemType;
    final mimeType = item.mimeType.toLowerCase();
    if (mimeType.startsWith('image/')) {
      itemType = MediaType.image;
    } else if (mimeType.startsWith('video/')) {
      itemType = MediaType.video;
    } else if (mimeType.startsWith('audio/')) {
      itemType = MediaType.audio;
    } else {
      itemType = MediaType.document;
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(2),
          ),
          child: Icon(
            itemType == MediaType.document
                ? _getFileTypeIcon(item.name)
                : itemType == MediaType.image
                ? _getImageTypeIcon(item.name)
                : itemType == MediaType.video
                ? _getVideoTypeIcon(item.name)
                : itemType == MediaType.audio
                ? _getAudioTypeIcon(item.name)
                : _getIconForType(itemType),
            color:
                itemType == MediaType.document
                    ? _getFileTypeColor(item.name)
                    : itemType == MediaType.image
                    ? _getImageTypeColor(item.name)
                    : itemType == MediaType.video
                    ? _getVideoTypeColor(item.name)
                    : itemType == MediaType.audio
                    ? _getAudioTypeColor(item.name)
                    : Colors.blue,
          ),
        ),
        title: Text(item.name, maxLines: 1, overflow: TextOverflow.ellipsis),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('${item.size} • ${_formatDate(item.date)}'),
            if (item.senderName != null)
              Text(
                'Shared by ${item.senderName}',
                style: TextStyle(
                  fontSize: 12,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
          ],
        ),
        trailing: IconButton(
          icon: const Icon(Icons.download_outlined),
          onPressed: () {
            // Open the file URL (this will trigger download in browser)
            // You can use url_launcher package for this
            print('Download file: ${item.url}');
            // TODO: Implement actual download using url_launcher or similar
          },
        ),
      ),
    );
  }

  IconData _getIconForType(MediaType type) {
    switch (type) {
      case MediaType.image:
        return Icons.image;
      case MediaType.video:
        return Icons.videocam;
      case MediaType.audio:
        return Icons.audiotrack;
      case MediaType.document:
        return Icons.description;
    }
  }

  String _getTypeLabel(MediaType type) {
    switch (type) {
      case MediaType.image:
        return 'messages.images'.tr();
      case MediaType.video:
        return 'messages.videos'.tr();
      case MediaType.audio:
        return 'messages.audio'.tr();
      case MediaType.document:
        return 'messages.documents'.tr();
    }
  }

  // Get file type specific icon based on file extension
  IconData _getFileTypeIcon(String fileName) {
    final extension = fileName.toLowerCase().split('.').last;

    switch (extension) {
      case 'pdf':
        return Icons.picture_as_pdf;
      case 'doc':
      case 'docx':
        return Icons.description;
      case 'xls':
      case 'xlsx':
        return Icons.table_chart;
      case 'ppt':
      case 'pptx':
        return Icons.slideshow;
      case 'txt':
        return Icons.text_snippet;
      case 'zip':
      case 'rar':
      case '7z':
        return Icons.archive;
      case 'csv':
        return Icons.grid_on;
      default:
        return Icons.insert_drive_file;
    }
  }

  // Get file type specific color based on file extension
  Color _getFileTypeColor(String fileName) {
    final extension = fileName.toLowerCase().split('.').last;

    switch (extension) {
      case 'pdf':
        return Colors.red;
      case 'doc':
      case 'docx':
        return Colors.blue;
      case 'xls':
      case 'xlsx':
      case 'csv':
        return Colors.green;
      case 'ppt':
      case 'pptx':
        return Colors.orange;
      case 'txt':
        return Colors.grey;
      case 'zip':
      case 'rar':
      case '7z':
        return Colors.purple;
      default:
        return Colors.blue;
    }
  }

  // Get image type specific icon based on file extension
  IconData _getImageTypeIcon(String fileName) {
    final extension = fileName.toLowerCase().split('.').last;

    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return Icons.image;
      case 'png':
        return Icons.image_outlined;
      case 'gif':
        return Icons.gif;
      case 'svg':
        return Icons.code;
      case 'webp':
        return Icons.web;
      case 'ico':
        return Icons.apps;
      case 'bmp':
        return Icons.wallpaper;
      case 'tiff':
      case 'tif':
        return Icons.photo_library;
      default:
        return Icons.image;
    }
  }

  // Get image type specific color based on file extension
  Color _getImageTypeColor(String fileName) {
    final extension = fileName.toLowerCase().split('.').last;

    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return Colors.blue;
      case 'png':
        return Colors.green;
      case 'gif':
        return Colors.orange;
      case 'svg':
        return Colors.purple;
      case 'webp':
        return Colors.teal;
      case 'ico':
        return Colors.indigo;
      case 'bmp':
        return Colors.brown;
      case 'tiff':
      case 'tif':
        return Colors.cyan;
      default:
        return Colors.blue;
    }
  }

  // Get video type specific icon based on file extension
  IconData _getVideoTypeIcon(String fileName) {
    final extension = fileName.toLowerCase().split('.').last;

    switch (extension) {
      case 'mp4':
        return Icons.video_file;
      case 'mov':
        return Icons.movie;
      case 'avi':
        return Icons.videocam;
      case 'mkv':
        return Icons.video_library;
      case 'webm':
        return Icons.web;
      case 'flv':
        return Icons.flash_on;
      case 'wmv':
        return Icons.video_settings;
      case '3gp':
        return Icons.smartphone;
      case 'm4v':
        return Icons.tablet_mac;
      default:
        return Icons.videocam;
    }
  }

  // Get video type specific color based on file extension
  Color _getVideoTypeColor(String fileName) {
    final extension = fileName.toLowerCase().split('.').last;

    switch (extension) {
      case 'mp4':
        return Colors.red;
      case 'mov':
        return Colors.blue;
      case 'avi':
        return Colors.green;
      case 'mkv':
        return Colors.purple;
      case 'webm':
        return Colors.teal;
      case 'flv':
        return Colors.orange;
      case 'wmv':
        return Colors.indigo;
      case '3gp':
        return Colors.brown;
      case 'm4v':
        return Colors.cyan;
      default:
        return Colors.red;
    }
  }

  // Get audio type specific icon based on file extension
  IconData _getAudioTypeIcon(String fileName) {
    final extension = fileName.toLowerCase().split('.').last;

    switch (extension) {
      case 'mp3':
        return Icons.music_note;
      case 'm4a':
      case 'aac':
        return Icons.audiotrack;
      case 'wav':
        return Icons.graphic_eq;
      case 'flac':
        return Icons.high_quality;
      case 'ogg':
        return Icons.audio_file;
      case 'wma':
        return Icons.library_music;
      case 'aiff':
        return Icons.music_video;
      case 'opus':
        return Icons.volume_up;
      case 'amr':
        return Icons.mic;
      default:
        return Icons.audiotrack;
    }
  }

  // Get audio type specific color based on file extension
  Color _getAudioTypeColor(String fileName) {
    final extension = fileName.toLowerCase().split('.').last;

    switch (extension) {
      case 'mp3':
        return Colors.orange;
      case 'm4a':
      case 'aac':
        return Colors.blue;
      case 'wav':
        return Colors.green;
      case 'flac':
        return Colors.purple;
      case 'ogg':
        return Colors.teal;
      case 'wma':
        return Colors.indigo;
      case 'aiff':
        return Colors.red;
      case 'opus':
        return Colors.cyan;
      case 'amr':
        return Colors.brown;
      default:
        return Colors.orange;
    }
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);

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
}

class MediaItem {
  final String id;
  final String name;
  final String size;
  final DateTime date;
  final String url;
  final String mimeType;
  final String? senderName;

  MediaItem({
    required this.id,
    required this.name,
    required this.size,
    required this.date,
    required this.url,
    required this.mimeType,
    this.senderName,
  });

  factory MediaItem.fromAttachment(
    MessageAttachment attachment,
    String? senderName,
    DateTime timestamp,
  ) {
    return MediaItem(
      id: attachment.id,
      name: attachment.fileName,
      size: attachment.fileSize,
      date: timestamp,
      url: attachment.url,
      mimeType: attachment.mimeType,
      senderName: senderName,
    );
  }
}

/// Full Screen Image Viewer with zoom and download
class FullScreenImageViewer extends StatefulWidget {
  final String imageUrl;
  final VoidCallback? onDownload;

  const FullScreenImageViewer({
    super.key,
    required this.imageUrl,
    this.onDownload,
  });

  @override
  State<FullScreenImageViewer> createState() => _FullScreenImageViewerState();
}

class _FullScreenImageViewerState extends State<FullScreenImageViewer> {
  final TransformationController _transformationController =
      TransformationController();

  @override
  void dispose() {
    _transformationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        leading: IconButton(
          icon: const Icon(Icons.close, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          if (widget.onDownload != null)
            IconButton(
              icon: const Icon(Icons.download, color: Colors.white),
              onPressed: () {
                widget.onDownload!();
                Navigator.pop(context);
              },
            ),
          IconButton(
            icon: const Icon(Icons.share, color: Colors.white),
            onPressed: () async {
              try {
                if (widget.imageUrl.startsWith('/') ||
                    widget.imageUrl.startsWith('file://')) {
                  final file = File(
                    widget.imageUrl.startsWith('file://')
                        ? widget.imageUrl.substring(7)
                        : widget.imageUrl,
                  );
                  await Share.shareXFiles([XFile(file.path)]);
                } else {
                  await Share.share(widget.imageUrl);
                }
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(
                    context,
                  ).showSnackBar(SnackBar(content: Text('Share failed: $e')));
                }
              }
            },
          ),
        ],
      ),
      body: Center(
        child: InteractiveViewer(
          transformationController: _transformationController,
          minScale: 0.5,
          maxScale: 4.0,
          child:
              widget.imageUrl.startsWith('/') ||
                      widget.imageUrl.startsWith('file://')
                  ? Image.file(
                    File(
                      widget.imageUrl.startsWith('file://')
                          ? widget.imageUrl.substring(7)
                          : widget.imageUrl,
                    ),
                    fit: BoxFit.contain,
                    errorBuilder: (context, error, stackTrace) {
                      return const Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.broken_image,
                              size: 64,
                              color: Colors.white54,
                            ),
                            SizedBox(height: 16),
                            Text(
                              'Image not found',
                              style: TextStyle(color: Colors.white54),
                            ),
                          ],
                        ),
                      );
                    },
                  )
                  : Image.network(
                    widget.imageUrl,
                    fit: BoxFit.contain,
                    loadingBuilder: (context, child, loadingProgress) {
                      if (loadingProgress == null) return child;
                      return Center(
                        child: CircularProgressIndicator(
                          value:
                              loadingProgress.expectedTotalBytes != null
                                  ? loadingProgress.cumulativeBytesLoaded /
                                      loadingProgress.expectedTotalBytes!
                                  : null,
                          color: Colors.white,
                        ),
                      );
                    },
                    errorBuilder: (context, error, stackTrace) {
                      return const Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.broken_image,
                              size: 64,
                              color: Colors.white54,
                            ),
                            SizedBox(height: 16),
                            Text(
                              'Image not available',
                              style: TextStyle(color: Colors.white54),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
        ),
      ),
    );
  }
}

/// Dialog widget for adding members to a private channel
class _AddMembersDialog extends StatefulWidget {
  final List<WorkspaceMember> availableMembers;
  final Function(List<String>) onMembersSelected;

  const _AddMembersDialog({
    required this.availableMembers,
    required this.onMembersSelected,
  });

  @override
  State<_AddMembersDialog> createState() => _AddMembersDialogState();
}

class _AddMembersDialogState extends State<_AddMembersDialog> {
  late TextEditingController _searchController;
  List<WorkspaceMember> _filteredMembers = [];
  Set<String> _selectedMemberIds = {};

  @override
  void initState() {
    super.initState();
    _searchController = TextEditingController();
    _filteredMembers = widget.availableMembers;
    _searchController.addListener(_filterMembers);
  }

  @override
  void dispose() {
    _searchController.removeListener(_filterMembers);
    _searchController.dispose();
    super.dispose();
  }

  void _filterMembers() {
    setState(() {
      if (_searchController.text.isEmpty) {
        _filteredMembers = widget.availableMembers;
      } else {
        final query = _searchController.text.toLowerCase();
        _filteredMembers =
            widget.availableMembers.where((member) {
              final name = (member.name ?? '').toLowerCase();
              final email = member.email.toLowerCase();
              return name.contains(query) || email.contains(query);
            }).toList();
      }
    });
  }

  void _toggleMemberSelection(String userId) {
    setState(() {
      if (_selectedMemberIds.contains(userId)) {
        _selectedMemberIds.remove(userId);
      } else {
        _selectedMemberIds.add(userId);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Row(
        children: [
          const Icon(Icons.person_add, size: 24),
          const SizedBox(width: 8),
          const Text('Add Members'),
        ],
      ),
      contentPadding: const EdgeInsets.fromLTRB(24, 20, 24, 0),
      content: SizedBox(
        width: double.maxFinite,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Search field
            TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search members...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon:
                    _searchController.text.isNotEmpty
                        ? IconButton(
                          icon: const Icon(Icons.clear),
                          onPressed: () {
                            _searchController.clear();
                          },
                        )
                        : null,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
              ),
              autofocus: true,
            ),
            const SizedBox(height: 8),

            // Selected count
            if (_selectedMemberIds.isNotEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(
                  vertical: 8,
                  horizontal: 12,
                ),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primaryContainer,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '${_selectedMemberIds.length} member(s) selected',
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onPrimaryContainer,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            const SizedBox(height: 8),

            // Members list
            Flexible(
              child: Container(
                constraints: const BoxConstraints(maxHeight: 300),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey.shade300),
                  borderRadius: BorderRadius.circular(8),
                ),
                child:
                    _filteredMembers.isEmpty
                        ? Center(
                          child: Padding(
                            padding: const EdgeInsets.all(24),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.search_off,
                                  size: 48,
                                  color: Colors.grey.shade400,
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'No members found',
                                  style: TextStyle(color: Colors.grey.shade600),
                                ),
                              ],
                            ),
                          ),
                        )
                        : ListView.builder(
                          shrinkWrap: true,
                          itemCount: _filteredMembers.length,
                          itemBuilder: (context, index) {
                            final member = _filteredMembers[index];
                            final userName =
                                member.name ?? member.email.split('@')[0];
                            final isSelected = _selectedMemberIds.contains(
                              member.userId,
                            );

                            return CheckboxListTile(
                              value: isSelected,
                              onChanged: (selected) {
                                _toggleMemberSelection(member.userId);
                              },
                              secondary: CircleAvatar(
                                backgroundColor:
                                    Theme.of(context).colorScheme.primary,
                                backgroundImage:
                                    member.avatar != null &&
                                            member.avatar!.isNotEmpty
                                        ? NetworkImage(member.avatar!)
                                        : null,
                                child:
                                    member.avatar == null ||
                                            member.avatar!.isEmpty
                                        ? Text(
                                          userName[0].toUpperCase(),
                                          style: const TextStyle(
                                            color: Colors.white,
                                          ),
                                        )
                                        : null,
                              ),
                              title: Text(
                                userName,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              subtitle: Text(
                                member.email,
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey.shade600,
                                ),
                              ),
                              dense: true,
                              controlAffinity: ListTileControlAffinity.trailing,
                            );
                          },
                        ),
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton.icon(
          onPressed:
              _selectedMemberIds.isEmpty
                  ? null
                  : () {
                    Navigator.pop(context);
                    widget.onMembersSelected(_selectedMemberIds.toList());
                  },
          icon: const Icon(Icons.add, size: 18),
          label: Text(
            _selectedMemberIds.isEmpty
                ? 'Add Members'
                : 'Add ${_selectedMemberIds.length} Member(s)',
          ),
        ),
      ],
    );
  }
}
