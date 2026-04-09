import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'dart:async';
import '../services/real_time_chat_service.dart';
import '../api/services/chat_api_service.dart';
import '../widgets/presence_indicator.dart';
import 'real_time_chat_screen.dart';
import 'create_channel_dialog.dart';
import '../theme/app_theme.dart';

class ChatItem {
  final String id;
  final String name;
  final String? description;
  final bool isChannel;
  final DateTime? lastMessageAt;
  final String? lastMessageContent;
  final int unreadCount;
  final bool isOnline; // For direct messages
  final UserPresence? userPresence; // For direct messages

  ChatItem({
    required this.id,
    required this.name,
    this.description,
    required this.isChannel,
    this.lastMessageAt,
    this.lastMessageContent,
    this.unreadCount = 0,
    this.isOnline = false,
    this.userPresence,
  });

  factory ChatItem.fromChannel(Channel channel) {
    return ChatItem(
      id: channel.id,
      name: channel.name,
      description: channel.description,
      isChannel: true,
      lastMessageAt: channel.lastMessageAt,
      lastMessageContent: null, // TODO: Get last message content
      unreadCount: channel.unreadCount,
    );
  }

  factory ChatItem.fromConversation(Conversation conversation) {
    return ChatItem(
      id: conversation.id,
      name: conversation.name ?? 'messages.direct_message'.tr(),
      isChannel: false,
      lastMessageAt: conversation.lastMessageAt,
      lastMessageContent: null, // TODO: Get last message content
      unreadCount: conversation.unreadCount,
    );
  }
}

class RealTimeChatListScreen extends StatefulWidget {
  final String workspaceId;
  final String currentUserId;
  final String currentUserName;

  const RealTimeChatListScreen({
    super.key,
    required this.workspaceId,
    required this.currentUserId,
    required this.currentUserName,
  });

  @override
  State<RealTimeChatListScreen> createState() => _RealTimeChatListScreenState();
}

class _RealTimeChatListScreenState extends State<RealTimeChatListScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final RealTimeChatService _realTimeChatService = RealTimeChatService.instance;
  final ChatApiService _chatApiService = ChatApiService();

  // State management
  bool _isLoading = true;
  final List<ChatItem> _channels = [];
  final List<ChatItem> _conversations = [];

  // Stream subscriptions
  StreamSubscription<RealtimeMessage>? _messageSubscription;
  StreamSubscription<UserPresence>? _presenceSubscription;

  // Search
  bool _isSearching = false;
  final TextEditingController _searchController = TextEditingController();
  List<ChatItem> _filteredChannels = [];
  List<ChatItem> _filteredConversations = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _initializeRealTimeChat();
    _setupStreamSubscriptions();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    _messageSubscription?.cancel();
    _presenceSubscription?.cancel();
    super.dispose();
  }

  Future<void> _initializeRealTimeChat() async {
    try {
      // Initialize the real-time chat service
      await _realTimeChatService.initialize(
        workspaceId: widget.workspaceId,
        userId: widget.currentUserId,
        userName: widget.currentUserName,
      );

      // Load channels and conversations
      await _loadChannelsAndConversations();

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
    // Listen for new messages to update last message and unread counts
    _messageSubscription = _realTimeChatService.messageStream.listen(
      (message) {
        _updateChatWithNewMessage(message);
      },
      onError: (error) {
      },
    );

    // Listen for presence updates
    _presenceSubscription = _realTimeChatService.presenceStream.listen(
      (presence) {
        _updateChatWithPresence(presence);
      },
      onError: (error) {
      },
    );
  }

  Future<void> _loadChannelsAndConversations() async {
    try {
      // Load channels
      final channelsResponse = await _chatApiService.getChannels(widget.workspaceId);
      if (channelsResponse.isSuccess && channelsResponse.data != null) {
        final channels = channelsResponse.data!
            .map((channel) => ChatItem.fromChannel(channel))
            .toList();
        
        setState(() {
          _channels.clear();
          _channels.addAll(channels);
          _filteredChannels = List.from(_channels);
        });
      }

      // Load conversations
      final conversationsResponse = await _chatApiService.getConversations(widget.workspaceId);
      if (conversationsResponse.isSuccess && conversationsResponse.data != null) {
        final conversations = conversationsResponse.data!
            .map((conversation) => ChatItem.fromConversation(conversation))
            .toList();
        
        setState(() {
          _conversations.clear();
          _conversations.addAll(conversations);
          _filteredConversations = List.from(_conversations);
        });
      }
    } catch (e) {
      _showErrorSnackBar('messages.error'.tr(args: [e.toString()]));
    }
  }

  void _updateChatWithNewMessage(RealtimeMessage message) {
    if (mounted) {
      setState(() {
        // Update channels
        final channelIndex = _channels.indexWhere((c) => c.id == message.channelId);
        if (channelIndex != -1) {
          final channel = _channels[channelIndex];
          _channels[channelIndex] = ChatItem(
            id: channel.id,
            name: channel.name,
            description: channel.description,
            isChannel: channel.isChannel,
            lastMessageAt: message.createdAt,
            lastMessageContent: message.content,
            unreadCount: message.senderId != widget.currentUserId 
                ? channel.unreadCount + 1 
                : channel.unreadCount,
            isOnline: channel.isOnline,
            userPresence: channel.userPresence,
          );
        }

        // Update conversations
        final conversationIndex = _conversations.indexWhere((c) => c.id == message.conversationId);
        if (conversationIndex != -1) {
          final conversation = _conversations[conversationIndex];
          _conversations[conversationIndex] = ChatItem(
            id: conversation.id,
            name: conversation.name,
            description: conversation.description,
            isChannel: conversation.isChannel,
            lastMessageAt: message.createdAt,
            lastMessageContent: message.content,
            unreadCount: message.senderId != widget.currentUserId 
                ? conversation.unreadCount + 1 
                : conversation.unreadCount,
            isOnline: conversation.isOnline,
            userPresence: conversation.userPresence,
          );
        }

        // Re-sort by last message time
        _channels.sort((a, b) => (b.lastMessageAt ?? DateTime(1970))
            .compareTo(a.lastMessageAt ?? DateTime(1970)));
        _conversations.sort((a, b) => (b.lastMessageAt ?? DateTime(1970))
            .compareTo(a.lastMessageAt ?? DateTime(1970)));

        // Update filtered lists if searching
        if (_isSearching) {
          _performSearch(_searchController.text);
        } else {
          _filteredChannels = List.from(_channels);
          _filteredConversations = List.from(_conversations);
        }
      });
    }
  }

  void _updateChatWithPresence(UserPresence presence) {
    if (mounted) {
      setState(() {
        // Update conversation presence (for direct messages)
        for (int i = 0; i < _conversations.length; i++) {
          final conversation = _conversations[i];
          if (conversation.id == presence.userId || 
              (conversation.name == presence.userName && !conversation.isChannel)) {
            _conversations[i] = ChatItem(
              id: conversation.id,
              name: conversation.name,
              description: conversation.description,
              isChannel: conversation.isChannel,
              lastMessageAt: conversation.lastMessageAt,
              lastMessageContent: conversation.lastMessageContent,
              unreadCount: conversation.unreadCount,
              isOnline: presence.status == UserPresenceStatus.online,
              userPresence: presence,
            );
          }
        }

        // Update filtered lists if searching
        if (_isSearching) {
          _performSearch(_searchController.text);
        } else {
          _filteredConversations = List.from(_conversations);
        }
      });
    }
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

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: context.backgroundColor,
      appBar: _buildAppBar(context, isDarkMode),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _buildChatList(context, isDarkMode),
      floatingActionButton: _buildFloatingActionButton(context),
    );
  }

  PreferredSizeWidget _buildAppBar(BuildContext context, bool isDarkMode) {
    return AppBar(
      backgroundColor: context.cardColor,
      elevation: 1,
      title: _isSearching
          ? TextField(
              controller: _searchController,
              autofocus: true,
              decoration: InputDecoration(
                hintText: 'messages.search_channels_messages'.tr(),
                border: InputBorder.none,
              ),
              style: TextStyle(
                color: isDarkMode ? Colors.white : Colors.black,
              ),
              onChanged: _performSearch,
            )
          : Text(
              'messages.chats'.tr(),
              style: TextStyle(
                color: isDarkMode ? Colors.white : Colors.black,
                fontWeight: FontWeight.w600,
              ),
            ),
      actions: [
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
              value: 'refresh',
              child: Row(
                children: [
                  const Icon(Icons.refresh),
                  const SizedBox(width: 8),
                  Text('messages.refresh'.tr()),
                ],
              ),
            ),
            PopupMenuItem(
              value: 'mark_all_read',
              child: Row(
                children: [
                  const Icon(Icons.mark_email_read),
                  const SizedBox(width: 8),
                  Text('messages.mark_all_read'.tr()),
                ],
              ),
            ),
          ],
        ),
      ],
      bottom: TabBar(
        controller: _tabController,
        indicatorColor: AppTheme.infoLight,
        labelColor: AppTheme.infoLight,
        unselectedLabelColor: isDarkMode ? Colors.grey[400] : Colors.grey[600],
        tabs: [
          Tab(text: 'messages.channel'.tr()),
          Tab(text: 'messages.direct_message'.tr()),
        ],
      ),
    );
  }

  Widget _buildChatList(BuildContext context, bool isDarkMode) {
    return TabBarView(
      controller: _tabController,
      children: [
        // Channels tab
        _buildChannelsList(isDarkMode),
        
        // Direct messages tab
        _buildConversationsList(isDarkMode),
      ],
    );
  }

  Widget _buildChannelsList(bool isDarkMode) {
    final channels = _isSearching ? _filteredChannels : _channels;

    if (channels.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.forum_outlined,
              size: 64,
              color: isDarkMode ? Colors.grey[600] : Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              _isSearching ? 'messages.no_channels_found'.tr() : 'messages.no_channels_yet'.tr(),
              style: TextStyle(
                fontSize: 18,
                color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _isSearching
                  ? 'messages.try_different_search'.tr()
                  : 'messages.create_channel_to_start'.tr(),
              style: TextStyle(
                fontSize: 14,
                color: isDarkMode ? Colors.grey[500] : Colors.grey[500],
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadChannelsAndConversations,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(vertical: 8),
        itemCount: channels.length,
        itemBuilder: (context, index) {
          final channel = channels[index];
          return _buildChatTile(channel, isDarkMode);
        },
      ),
    );
  }

  Widget _buildConversationsList(bool isDarkMode) {
    final conversations = _isSearching ? _filteredConversations : _conversations;

    if (conversations.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.chat_bubble_outline,
              size: 64,
              color: isDarkMode ? Colors.grey[600] : Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              _isSearching ? 'messages.no_conversations_found'.tr() : 'messages.no_conversations_yet'.tr(),
              style: TextStyle(
                fontSize: 18,
                color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _isSearching
                  ? 'messages.try_different_search'.tr()
                  : 'messages.start_conversation_hint'.tr(),
              style: TextStyle(
                fontSize: 14,
                color: isDarkMode ? Colors.grey[500] : Colors.grey[500],
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadChannelsAndConversations,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(vertical: 8),
        itemCount: conversations.length,
        itemBuilder: (context, index) {
          final conversation = conversations[index];
          return _buildChatTile(conversation, isDarkMode);
        },
      ),
    );
  }

  Widget _buildChatTile(ChatItem chatItem, bool isDarkMode) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      leading: Stack(
        children: [
          CircleAvatar(
            radius: 24,
            backgroundColor: chatItem.isChannel 
                ? AppTheme.infoLight
                : Colors.green,
            child: chatItem.isChannel
                ? const Icon(Icons.tag, color: Colors.white, size: 20)
                : Text(
                    chatItem.name.isNotEmpty ? chatItem.name[0].toUpperCase() : '?',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
          ),
          // Presence indicator for direct messages
          if (!chatItem.isChannel && chatItem.userPresence != null)
            Positioned(
              right: 0,
              bottom: 0,
              child: PresenceIndicator(
                userId: chatItem.id,
                presence: chatItem.userPresence,
                size: 14,
              ),
            ),
        ],
      ),
      title: Row(
        children: [
          Expanded(
            child: Text(
              chatItem.isChannel ? '#${chatItem.name}' : chatItem.name,
              style: TextStyle(
                color: isDarkMode ? Colors.white : Colors.black,
                fontWeight: FontWeight.w600,
                fontSize: 16,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          if (chatItem.unreadCount > 0)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: AppTheme.infoLight,
                borderRadius: BorderRadius.circular(10),
              ),
              constraints: const BoxConstraints(minWidth: 20),
              child: Text(
                chatItem.unreadCount > 99 ? '99+' : chatItem.unreadCount.toString(),
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
            ),
        ],
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (chatItem.description != null) ...[
            Text(
              chatItem.description!,
              style: TextStyle(
                color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
                fontSize: 12,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 2),
          ],
          if (chatItem.lastMessageContent != null) ...[
            Text(
              chatItem.lastMessageContent!,
              style: TextStyle(
                color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
                fontSize: 14,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 2),
          ],
          if (chatItem.lastMessageAt != null)
            Text(
              _formatTime(chatItem.lastMessageAt!),
              style: TextStyle(
                color: isDarkMode ? Colors.grey[500] : Colors.grey[500],
                fontSize: 12,
              ),
            ),
        ],
      ),
      onTap: () => _openChat(chatItem),
    );
  }

  Widget _buildFloatingActionButton(BuildContext context) {
    return FloatingActionButton(
      onPressed: _showCreateOptions,
      backgroundColor: AppTheme.infoLight,
      child: const Icon(Icons.add, color: Colors.white),
    );
  }

  void _openChat(ChatItem chatItem) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => RealTimeChatScreen(
          chatId: chatItem.id,
          chatName: chatItem.name,
          chatSubtitle: chatItem.description,
          isChannel: chatItem.isChannel,
          workspaceId: widget.workspaceId,
          currentUserId: widget.currentUserId,
          currentUserName: widget.currentUserName,
        ),
      ),
    ).then((_) {
      // Mark chat as read when returning
      _markChatAsRead(chatItem);
    });
  }

  void _markChatAsRead(ChatItem chatItem) {
    if (chatItem.unreadCount > 0) {
      setState(() {
        final targetList = chatItem.isChannel ? _channels : _conversations;
        final index = targetList.indexWhere((c) => c.id == chatItem.id);
        if (index != -1) {
          targetList[index] = ChatItem(
            id: chatItem.id,
            name: chatItem.name,
            description: chatItem.description,
            isChannel: chatItem.isChannel,
            lastMessageAt: chatItem.lastMessageAt,
            lastMessageContent: chatItem.lastMessageContent,
            unreadCount: 0,
            isOnline: chatItem.isOnline,
            userPresence: chatItem.userPresence,
          );
        }
      });

      // Update read status on server
      if (chatItem.isChannel) {
        _realTimeChatService.markChannelAsRead(chatItem.id);
      }
    }
  }

  void _toggleSearch() {
    setState(() {
      _isSearching = !_isSearching;
      if (!_isSearching) {
        _searchController.clear();
        _filteredChannels = List.from(_channels);
        _filteredConversations = List.from(_conversations);
      }
    });
  }

  void _performSearch(String query) {
    if (query.isEmpty) {
      setState(() {
        _filteredChannels = List.from(_channels);
        _filteredConversations = List.from(_conversations);
      });
      return;
    }

    final lowerQuery = query.toLowerCase();

    setState(() {
      _filteredChannels = _channels.where((channel) {
        return channel.name.toLowerCase().contains(lowerQuery) ||
               (channel.description?.toLowerCase().contains(lowerQuery) ?? false) ||
               (channel.lastMessageContent?.toLowerCase().contains(lowerQuery) ?? false);
      }).toList();

      _filteredConversations = _conversations.where((conversation) {
        return conversation.name.toLowerCase().contains(lowerQuery) ||
               (conversation.lastMessageContent?.toLowerCase().contains(lowerQuery) ?? false);
      }).toList();
    });
  }

  void _showCreateOptions() {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.tag),
              title: Text('messages.create_channel'.tr()),
              onTap: () {
                Navigator.pop(context);
                _showCreateChannelDialog();
              },
            ),
            ListTile(
              leading: const Icon(Icons.person_add),
              title: Text('messages.start_conversation'.tr()),
              onTap: () {
                Navigator.pop(context);
                _showStartConversationDialog();
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showCreateChannelDialog() {
    showDialog(
      context: context,
      builder: (context) => CreateChannelDialog(
        onChannelCreated: (name, description, isPublic, memberIds) {
          _createChannel(name, description, isPublic, memberIds);
        },
      ),
    );
  }

  Future<void> _createChannel(String name, String description, bool isPublic, List<String> memberIds) async {
    try {
      final dto = CreateChannelDto(
        name: name,
        description: description.isEmpty ? null : description,
        type: 'channel',
        isPrivate: !isPublic,
        memberIds: memberIds.isNotEmpty ? memberIds : null,
      );

      final response = await _chatApiService.createChannel(widget.workspaceId, dto);
      
      if (response.isSuccess && response.data != null) {
        final chatItem = ChatItem.fromChannel(response.data!);
        setState(() {
          _channels.insert(0, chatItem);
          _filteredChannels = List.from(_channels);
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('messages.channel_created'.tr(args: [name])),
            backgroundColor: Colors.green,
          ),
        );

        // Open the new channel
        _openChat(chatItem);
      } else {
        _showErrorSnackBar(response.message ?? 'messages.error_creating_channel'.tr(args: ['']));
      }
    } catch (e) {
      _showErrorSnackBar('messages.error_creating_channel'.tr(args: [e.toString()]));
    }
  }

  void _showStartConversationDialog() {
    // TODO: Implement start conversation dialog
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('messages.start_conversation'.tr()),
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
      case 'refresh':
        _loadChannelsAndConversations();
        break;
      case 'mark_all_read':
        _markAllAsRead();
        break;
    }
  }

  void _markAllAsRead() {
    setState(() {
      // Mark all channels as read
      for (int i = 0; i < _channels.length; i++) {
        final channel = _channels[i];
        _channels[i] = ChatItem(
          id: channel.id,
          name: channel.name,
          description: channel.description,
          isChannel: channel.isChannel,
          lastMessageAt: channel.lastMessageAt,
          lastMessageContent: channel.lastMessageContent,
          unreadCount: 0,
          isOnline: channel.isOnline,
          userPresence: channel.userPresence,
        );
      }

      // Mark all conversations as read
      for (int i = 0; i < _conversations.length; i++) {
        final conversation = _conversations[i];
        _conversations[i] = ChatItem(
          id: conversation.id,
          name: conversation.name,
          description: conversation.description,
          isChannel: conversation.isChannel,
          lastMessageAt: conversation.lastMessageAt,
          lastMessageContent: conversation.lastMessageContent,
          unreadCount: 0,
          isOnline: conversation.isOnline,
          userPresence: conversation.userPresence,
        );
      }

      // Update filtered lists
      _filteredChannels = List.from(_channels);
      _filteredConversations = List.from(_conversations);
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('messages.all_chats_marked_read'.tr()),
        backgroundColor: Colors.green,
      ),
    );
  }

  String _formatTime(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inDays > 0) {
      if (difference.inDays == 1) {
        return 'Yesterday';
      } else if (difference.inDays < 7) {
        return '${difference.inDays} days ago';
      } else {
        return '${dateTime.day}/${dateTime.month}';
      }
    } else if (difference.inHours > 0) {
      return '${difference.inHours}h ago';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes}m ago';
    } else {
      return 'Just now';
    }
  }
}