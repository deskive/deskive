import 'dart:async';
import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'chat_screen.dart';
import 'create_channel_dialog.dart';
import 'threads_screen.dart';
import 'saved_messages_screen.dart';
import 'drafts_screen.dart';
import '../api/services/chat_api_service.dart';
import '../api/services/workspace_api_service.dart';
import '../api/services/bot_api_service.dart';
import '../api/base_api_client.dart';
import '../services/workspace_service.dart';
import '../services/auth_service.dart';
import '../services/navigation_service.dart';
import '../services/workspace_management_service.dart';
import '../services/socket_io_chat_service.dart';
import '../dao/workspace_dao.dart';

class MessagesScreen extends StatefulWidget {
  const MessagesScreen({super.key});

  @override
  State<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends State<MessagesScreen> {
  bool _isStarredExpanded = true;
  bool _isChannelsExpanded = true;
  bool _isDirectMessagesExpanded = true;
  bool _isSearchActive = false;

  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  // API related - Channels
  final ChatApiService _chatApiService = ChatApiService();
  List<Channel> _channels = [];
  bool _isLoadingChannels = false;
  String? _channelsError;

  // Private channel search
  List<Channel> _searchedPrivateChannels = [];
  bool _isSearchingPrivateChannels = false;
  String? _privateChannelSearchError;

  // API related - Conversations & Members
  final WorkspaceApiService _workspaceApiService = WorkspaceApiService();
  final WorkspaceDao _workspaceDao = WorkspaceDao();
  final BotApiService _botApiService = BotApiService();
  List<Conversation> _conversations = [];
  Map<String, WorkspaceMember> _membersMap = {};
  Map<String, MemberPresence> _presenceMap = {}; // userId -> presence data
  Map<String, Bot> _botsMap = {}; // botId -> Bot for bot conversations
  bool _isLoadingConversations = false;
  String? _conversationsError;

  // WebSocket subscription for member:left events
  StreamSubscription<Map<String, dynamic>>? _memberLeftSubscription;

  // WebSocket subscriptions for unread count updates
  StreamSubscription<Map<String, dynamic>>? _workspaceMessageSubscription;
  StreamSubscription<Map<String, dynamic>>? _channelReadSubscription;
  StreamSubscription<Map<String, dynamic>>? _conversationReadSubscription;

  // Local tracking of unread counts (since Channel/Conversation models are immutable)
  Map<String, int> _channelUnreadCounts = {};
  Map<String, int> _conversationUnreadCounts = {};

  // Track the currently open chat ID (to avoid incrementing unread for open chat)
  String? _currentOpenChatId;

  @override
  void initState() {
    super.initState();

    // Notify NavigationService that user is on messages screen
    NavigationService().setOnMessagesScreen();

    _searchController.addListener(() {
      setState(() {
        _searchQuery = _searchController.text.toLowerCase();
      });
    });

    // Subscribe to member:left WebSocket events
    _memberLeftSubscription = SocketIOChatService.instance.memberLeftStream.listen((data) {

      final currentUserId = AuthService.instance.currentUser?.id;
      final eventUserId = data['userId'];
      final channelId = data['channelId'];
      final channelName = data['channelName'];


      // If the current user left the channel, remove it from the list
      if (currentUserId == eventUserId && channelId != null) {
        setState(() {
          _channels.removeWhere((channel) => channel.id == channelId);
          // Also remove from unread counts
          _channelUnreadCounts.remove(channelId);
        });

      } else {
      }
    });

    // Subscribe to workspace-wide new message events (for unread count updates)
    _workspaceMessageSubscription = SocketIOChatService.instance.workspaceMessageStream.listen((data) {
      final type = data['type'];
      final channelId = data['channelId'];
      final conversationId = data['conversationId'];

      // Only increment unread count if the chat is NOT currently open
      if (type == 'channel' && channelId != null && channelId != _currentOpenChatId) {
        setState(() {
          _channelUnreadCounts[channelId] = (_channelUnreadCounts[channelId] ?? 0) + 1;
        });
      } else if (type == 'conversation' && conversationId != null && conversationId != _currentOpenChatId) {
        setState(() {
          _conversationUnreadCounts[conversationId] = (_conversationUnreadCounts[conversationId] ?? 0) + 1;
        });
      }
    });

    // Subscribe to channel:read events (reset unread count)
    _channelReadSubscription = SocketIOChatService.instance.channelReadStream.listen((data) {
      final channelId = data['channelId'];
      if (channelId != null) {
        setState(() {
          _channelUnreadCounts[channelId] = 0;
        });
      }
    });

    // Subscribe to conversation:read events (reset unread count)
    _conversationReadSubscription = SocketIOChatService.instance.conversationReadStream.listen((data) {
      final conversationId = data['conversationId'];
      if (conversationId != null) {
        setState(() {
          _conversationUnreadCounts[conversationId] = 0;
        });
      }
    });

    // Fetch channels and conversations on init
    debugPrint('📡 [MessagesScreen] initState - calling _fetchChannels and _fetchConversationsAndMembers');
    _fetchChannels();
    _fetchConversationsAndMembers();
  }

  /// Refresh all data (pull-to-refresh)
  Future<void> _onRefresh() async {
    debugPrint('🔄 [MessagesScreen] Pull-to-refresh triggered');
    await Future.wait([
      _fetchChannels(),
      _fetchConversationsAndMembers(),
    ]);
    debugPrint('🔄 [MessagesScreen] Refresh complete');
  }

  @override
  void dispose() {
    // Notify NavigationService that user left messages screen
    NavigationService().leftMessagesScreen();

    // Cancel WebSocket subscriptions
    _memberLeftSubscription?.cancel();
    _workspaceMessageSubscription?.cancel();
    _channelReadSubscription?.cancel();
    _conversationReadSubscription?.cancel();

    _searchController.dispose();
    super.dispose();
  }

  /// Check if current user is the workspace owner
  bool get _isWorkspaceOwner {
    final currentUser = AuthService.instance.currentUser;
    final currentWorkspace = WorkspaceService.instance.currentWorkspace;

    if (currentUser?.id == null || currentWorkspace?.ownerId == null) {
      return false;
    }

    return currentUser!.id == currentWorkspace!.ownerId;
  }

  /// Check if current user can create channels (owner or admin)
  bool get _canCreateChannel {
    final currentUser = AuthService.instance.currentUser;
    final currentWorkspace = WorkspaceService.instance.currentWorkspace;

    if (currentUser?.id == null || currentWorkspace == null) {
      return false;
    }

    // Check if user is workspace owner
    if (currentUser!.id == currentWorkspace.ownerId) {
      return true;
    }

    // Check if user is admin from members map
    final currentMember = _membersMap[currentUser.id];
    if (currentMember?.role == 'admin' || currentMember?.role == 'owner') {
      return true;
    }

    return false;
  }
  
  /// Fetch channels from API
  Future<void> _fetchChannels() async {
    debugPrint('📡 [MessagesScreen] _fetchChannels called');

    final workspace = WorkspaceService.instance.currentWorkspace;
    final workspaceId = workspace?.id;

    debugPrint('📡 [MessagesScreen] Workspace: ${workspace?.name}, ID: $workspaceId');

    if (workspaceId == null) {
      debugPrint('❌ [MessagesScreen] No workspace selected');
      setState(() {
        _channelsError = 'No workspace selected';
      });
      return;
    }

    setState(() {
      _isLoadingChannels = true;
      _channelsError = null;
    });

    try {
      debugPrint('📡 [MessagesScreen] Calling getChannels API...');
      final response = await _chatApiService.getChannels(workspaceId);
      debugPrint('📡 [MessagesScreen] getChannels response: success=${response.success}, count=${response.data?.length}');


      if (response.success && response.data != null) {
        setState(() {
          _channels = response.data!;
          _isLoadingChannels = false;
        });

        // Fetch unread counts separately for each channel (like web frontend does)
        _fetchChannelUnreadCounts(workspaceId);
      } else {
        final errorMsg = response.message ?? 'Failed to load channels';
        setState(() {
          _channelsError = errorMsg;
          _isLoadingChannels = false;
        });
      }
    } catch (e, stackTrace) {
      setState(() {
        _channelsError = 'Error loading channels: $e';
        _isLoadingChannels = false;
      });
    }
  }

  /// Fetch unread counts for all channels separately
  Future<void> _fetchChannelUnreadCounts(String workspaceId) async {
    debugPrint('📊 [MessagesScreen] Fetching unread counts for ${_channels.length} channels...');

    for (var channel in _channels) {
      try {
        final response = await _chatApiService.getChannelUnreadCount(workspaceId, channel.id);
        if (response.success && response.data != null) {
          setState(() {
            _channelUnreadCounts[channel.id] = response.data!;
          });
          debugPrint('📊 [MessagesScreen] Channel "${channel.name}" unreadCount: ${response.data}');
        }
      } catch (e) {
        debugPrint('❌ [MessagesScreen] Error fetching unread count for channel ${channel.name}: $e');
      }
    }
  }

  /// Fetch unread counts for all conversations separately
  Future<void> _fetchConversationUnreadCounts(String workspaceId) async {
    debugPrint('📊 [MessagesScreen] Fetching unread counts for ${_conversations.length} conversations...');

    for (var conv in _conversations) {
      try {
        final response = await _chatApiService.getConversationUnreadCount(workspaceId, conv.id);
        if (response.success && response.data != null) {
          setState(() {
            _conversationUnreadCounts[conv.id] = response.data!;
          });
          debugPrint('📊 [MessagesScreen] Conversation "${conv.id}" unreadCount: ${response.data}');
        }
      } catch (e) {
        debugPrint('❌ [MessagesScreen] Error fetching unread count for conversation ${conv.id}: $e');
      }
    }
  }

  /// Fetch conversations and workspace members
  Future<void> _fetchConversationsAndMembers() async {
    debugPrint('📡 [MessagesScreen] _fetchConversationsAndMembers called');

    final workspace = WorkspaceService.instance.currentWorkspace;
    final workspaceId = workspace?.id;

    debugPrint('📡 [MessagesScreen] Workspace for conversations: ${workspace?.name}, ID: $workspaceId');

    if (workspaceId == null) {
      debugPrint('❌ [MessagesScreen] No workspace selected for conversations');
      setState(() {
        _conversationsError = 'No workspace selected';
      });
      return;
    }

    setState(() {
      _isLoadingConversations = true;
      _conversationsError = null;
    });

    try {
      // Fetch members, presence data, conversations, and bots in parallel
      final results = await Future.wait([
        _workspaceApiService.getMembers(workspaceId),
        _workspaceDao.getMembersPresence(workspaceId),
        _chatApiService.getConversations(workspaceId),
        _botApiService.getBots(workspaceId),
      ]);

      final membersResponse = results[0] as ApiResponse<List<WorkspaceMember>>;
      final presenceList = results[1] as List<MemberPresence>;
      final conversationsResponse = results[2] as ApiResponse<List<Conversation>>;
      final botsResponse = results[3] as ApiResponse<List<Bot>>;

      if (membersResponse.success && membersResponse.data != null) {
        _membersMap = {
          for (var member in membersResponse.data!) member.userId: member
        };
      }

      // Build bots map for bot conversation name resolution
      if (botsResponse.success && botsResponse.data != null) {
        _botsMap = {
          for (var bot in botsResponse.data!) bot.id: bot
        };
      }

      // Build presence map
      _presenceMap = {
        for (var presence in presenceList) presence.userId: presence
      };


      if (conversationsResponse.success && conversationsResponse.data != null) {
        debugPrint('📡 [MessagesScreen] getConversations response: success=true, count=${conversationsResponse.data!.length}');
        setState(() {
          _conversations = conversationsResponse.data!;
          _isLoadingConversations = false;
        });

        // Fetch unread counts separately for each conversation (like web frontend does)
        _fetchConversationUnreadCounts(workspaceId);
      } else {
        final errorMsg = conversationsResponse.message ?? 'Failed to load conversations';
        setState(() {
          _conversationsError = errorMsg;
          _isLoadingConversations = false;
        });
      }
    } catch (e, stackTrace) {
      setState(() {
        _conversationsError = 'Error loading conversations: $e';
        _isLoadingConversations = false;
      });
    }
  }

  /// Get participant name from conversation (excluding current user)
  String _getConversationName(Conversation conversation) {
    final currentUserId = AuthService.instance.currentUser?.id;

    if (conversation.type == 'group' && conversation.name != null) {
      return conversation.name!;
    }

    // For direct messages, find the other participant
    final otherParticipants = conversation.participants
        .where((participantId) => participantId != currentUserId)
        .toList();

    if (otherParticipants.isEmpty) {
      return 'Unknown User';
    }

    final otherUserId = otherParticipants.first;

    // For bot conversations, look up in bots map
    if (conversation.type == 'bot') {
      final bot = _botsMap[otherUserId];
      if (bot != null) {
        return bot.effectiveDisplayName;
      }
    }

    // Try member lookup first
    final member = _membersMap[otherUserId];
    if (member != null) {
      return member.name ?? member.email;
    }

    // Fallback: check if the participant is a bot (for backward compatibility)
    final bot = _botsMap[otherUserId];
    if (bot != null) {
      return bot.effectiveDisplayName;
    }

    return 'Unknown User';
  }

  /// Get participant avatar color
  Color _getParticipantColor(String userId) {
    final colorIndex = userId.hashCode % Colors.primaries.length;
    return Colors.primaries[colorIndex.abs()];
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

  /// Get avatar URL for a user from presence data, members map, or bots map
  String? _getAvatarUrl(String userId) {
    // First try presence map (has more up-to-date avatar)
    final presence = _presenceMap[userId];
    if (presence?.avatar != null && presence!.avatar!.isNotEmpty) {
      return presence.avatar;
    }
    // Fallback to members map
    final member = _membersMap[userId];
    if (member?.avatar != null) {
      return member!.avatar;
    }
    // Fallback to bots map for bot conversations
    final bot = _botsMap[userId];
    return bot?.avatarUrl;
  }

  /// Check if user is online
  bool _isUserOnline(String userId) {
    final presence = _presenceMap[userId];
    return presence?.status.toLowerCase() == 'online';
  }

  /// Get user status
  String _getUserStatus(String userId) {
    final presence = _presenceMap[userId];
    return presence?.status ?? 'offline';
  }


  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: _isSearchActive 
          ? Container(
              height: 40,
              decoration: BoxDecoration(
                color: Theme.of(context).brightness == Brightness.dark 
                  ? Colors.white.withValues(alpha: 0.1)
                  : Colors.black.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: TextField(
                controller: _searchController,
                decoration: InputDecoration(
                  hintText: 'messages.search_channels_users'.tr(),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  prefixIcon: Icon(
                    Icons.search, 
                    size: 20,
                    color: Theme.of(context).brightness == Brightness.dark 
                      ? Colors.white70 
                      : Colors.black54,
                  ),
                  hintStyle: TextStyle(
                    color: Theme.of(context).brightness == Brightness.dark 
                      ? Colors.white70 
                      : Colors.black54,
                    fontSize: 14,
                  ),
                ),
                style: TextStyle(
                  color: Theme.of(context).brightness == Brightness.dark 
                    ? Colors.white 
                    : Colors.black,
                  fontSize: 14,
                ),
                autofocus: true,
              ),
            )
          : Text('messages.title'.tr()),
        actions: [
          IconButton(
            icon: Icon(_isSearchActive ? Icons.close : Icons.search),
            onPressed: () {
              setState(() {
                _isSearchActive = !_isSearchActive;
                if (!_isSearchActive) {
                  _searchController.clear();
                  _searchQuery = '';
                }
              });
            },
          ),
          // Temporarily commented out - 3-dot menu
          // PopupMenuButton<String>(
          //   icon: const Icon(Icons.more_vert),
          //   onSelected: (value) {
          //     _handleMenuSelection(value);
          //   },
          //   itemBuilder: (BuildContext context) => [
          //     const PopupMenuItem<String>(
          //       value: 'threads',
          //       child: Row(
          //         children: [
          //           Icon(Icons.forum_outlined, size: 20),
          //           SizedBox(width: 12),
          //           Text('Threads'),
          //         ],
          //       ),
          //     ),
          //     const PopupMenuItem<String>(
          //       value: 'saved',
          //       child: Row(
          //         children: [
          //           Icon(Icons.bookmark_outline, size: 20),
          //           SizedBox(width: 12),
          //           Text('Saved Messages'),
          //         ],
          //       ),
          //     ),
          //     const PopupMenuItem<String>(
          //       value: 'drafts',
          //       child: Row(
          //         children: [
          //           Icon(Icons.drafts_outlined, size: 20),
          //           SizedBox(width: 12),
          //           Text('Drafts'),
          //         ],
          //       ),
          //     ),
          //   ],
          // ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _onRefresh,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            // Starred Section - only show if there are starred conversations
            if (_conversations.any((c) => c.isStarred))
              ExpansionTile(
              title: Row(
                children: [
                  Icon(Icons.star, color: Colors.orange),
                  const SizedBox(width: 12),
                  Text(
                    'messages.starred'.tr(),
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                ],
              ),
              initiallyExpanded: _isStarredExpanded,
              onExpansionChanged: (expanded) {
                setState(() {
                  _isStarredExpanded = expanded;
                });
              },
              shape: const Border(),
              collapsedShape: const Border(),
              children: [
                _buildStarredList(),
              ],
            ),
          
          // Channels Section
          ExpansionTile(
            title: Row(
              children: [
                Icon(Icons.tag_outlined, color: Theme.of(context).colorScheme.primary),
                const SizedBox(width: 12),
                Text(
                  'messages.channels'.tr(),
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                const Spacer(),
                // Create channel button (only for owners/admins)
                if (_canCreateChannel)
                  IconButton(
                    icon: const Icon(Icons.add, size: 20),
                    tooltip: 'messages.create_channel'.tr(),
                    onPressed: () => _showCreateChannelDialog(context),
                    padding: const EdgeInsets.all(4),
                    constraints: const BoxConstraints(),
                  ),
              ],
            ),
            initiallyExpanded: _isChannelsExpanded,
            onExpansionChanged: (expanded) {
              setState(() {
                _isChannelsExpanded = expanded;
              });
            },
            shape: const Border(),
            collapsedShape: const Border(),
            children: [
              _buildChannelsList(),
            ],
          ),
          
          // Direct Messages Section
          ExpansionTile(
            title: Row(
              children: [
                Icon(Icons.person_outline, color: Theme.of(context).colorScheme.primary),
                const SizedBox(width: 12),
                Text(
                  'messages.direct_message'.tr(),
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
              ],
            ),
            initiallyExpanded: _isDirectMessagesExpanded,
            onExpansionChanged: (expanded) {
              setState(() {
                _isDirectMessagesExpanded = expanded;
              });
            },
            shape: const Border(),
            collapsedShape: const Border(),
            children: [
              _buildDirectMessagesList(),
            ],
          ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showNewDirectMessageDialog(context),
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildStarredList() {
    // Get starred conversations
    final starredConversations = _conversations
        .where((c) => c.isStarred)
        .where((c) => _searchQuery.isEmpty ||
            _getConversationName(c).toLowerCase().contains(_searchQuery))
        .toList();

    if (starredConversations.isEmpty) {
      return Padding(
        padding: const EdgeInsets.all(16.0),
        child: Text(
          'messages.no_starred_conversations'.tr(),
          style: const TextStyle(fontStyle: FontStyle.italic),
          textAlign: TextAlign.center,
        ),
      );
    }

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: starredConversations.map((conversation) {
        final conversationName = _getConversationName(conversation);
        final currentUserId = AuthService.instance.currentUser?.id;
        final otherParticipants = conversation.participants
            .where((id) => id != currentUserId)
            .toList();
        final otherUserId = otherParticipants.isNotEmpty ? otherParticipants.first : '';
        final avatarColor = _getParticipantColor(otherUserId);
        final initials = conversationName.isNotEmpty
            ? conversationName.split(' ').map((e) => e.isNotEmpty ? e[0] : '').take(2).join().toUpperCase()
            : '?';

        // Get avatar URL and online status from presence data
        final avatarUrl = _getAvatarUrl(otherUserId);
        final isOnline = _isUserOnline(otherUserId);
        final userStatus = _getUserStatus(otherUserId);
        final statusColor = _getStatusColor(userStatus);

        return Container(
          margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 0),
          child: ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
            leading: Stack(
              children: [
                CircleAvatar(
                  radius: 18,
                  backgroundColor: avatarColor,
                  backgroundImage: avatarUrl != null && avatarUrl.isNotEmpty
                      ? NetworkImage(avatarUrl)
                      : null,
                  child: avatarUrl == null || avatarUrl.isEmpty
                      ? Text(
                          initials,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        )
                      : null,
                ),
                // Status indicator
                Positioned(
                  right: 0,
                  bottom: 0,
                  child: Container(
                    width: 12,
                    height: 12,
                    decoration: BoxDecoration(
                      color: statusColor,
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: Theme.of(context).scaffoldBackgroundColor,
                        width: 2,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            title: Text(
              conversationName,
              style: const TextStyle(
                fontWeight: FontWeight.w500,
              ),
            ),
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                GestureDetector(
                  onTap: () => _toggleConversationStar(conversation),
                  child: const Icon(
                    Icons.star,
                    color: Colors.orange,
                    size: 18,
                  ),
                ),
                if ((_conversationUnreadCounts[conversation.id] ?? 0) > 0) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.red,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      (_conversationUnreadCounts[conversation.id] ?? 0) > 99
                          ? '99+'
                          : '${_conversationUnreadCounts[conversation.id]}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ],
            ),
            onTap: () {
              // Reset unread count when opening the conversation
              setState(() {
                _conversationUnreadCounts[conversation.id] = 0;
              });
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => ChatScreen(
                    chatName: conversationName,
                    chatSubtitle: isOnline ? 'Online' : 'Last seen recently',
                    isChannel: false,
                    avatarColor: avatarColor,
                    conversationId: conversation.id,
                    recipientId: otherUserId,
                  ),
                ),
              );
            },
            onLongPress: () {
              _showConversationStarOptions(conversation);
            },
          ),
        );
      }).toList(),
    );
  }

  Widget _buildChannelsList() {
    // Show loading indicator
    if (_isLoadingChannels) {
      return const Padding(
        padding: EdgeInsets.all(16.0),
        child: Center(child: CircularProgressIndicator()),
      );
    }

    // Show error message
    if (_channelsError != null) {
      return Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Text(
              _channelsError!,
              style: TextStyle(color: Colors.red.shade700),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            TextButton.icon(
              onPressed: _fetchChannels,
              icon: const Icon(Icons.refresh),
              label: Text('messages.retry'.tr()),
            ),
          ],
        ),
      );
    }

    // Show empty state
    if (_channels.isEmpty) {
      return Padding(
        padding: const EdgeInsets.all(16.0),
        child: Text(
          'messages.no_channels_available'.tr(),
          style: const TextStyle(fontStyle: FontStyle.italic),
          textAlign: TextAlign.center,
        ),
      );
    }

    // Filter channels based on search query
    final filteredChannels = _searchQuery.isEmpty
        ? _channels
        : _channels.where((channel) =>
            channel.name.toLowerCase().contains(_searchQuery)).toList();

    if (filteredChannels.isEmpty && _searchQuery.isNotEmpty) {
      return Padding(
        padding: const EdgeInsets.all(16.0),
        child: Text(
          'messages.no_channels_match_search'.tr(),
          style: const TextStyle(fontStyle: FontStyle.italic),
          textAlign: TextAlign.center,
        ),
      );
    }

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: filteredChannels.map((channel) {
        final channelName = channel.name.startsWith('#') ? channel.name : '# ${channel.name}';
        final colorIndex = channel.id.hashCode % Colors.primaries.length;

        return Container(
          margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 0),
          child: ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
            leading: CircleAvatar(
              radius: 18,
              backgroundColor: Colors.primaries[colorIndex.abs()],
              child: Icon(
                channel.isPrivate ? Icons.lock_outline : Icons.tag_outlined,
                color: Colors.white,
                size: 16,
              ),
            ),
            title: Text(
              channelName,
              style: const TextStyle(
                fontWeight: FontWeight.w500,
              ),
            ),
            subtitle: channel.description != null && channel.description!.isNotEmpty
                ? Text(
                    channel.description!,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 12),
                  )
                : null,
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Unread count badge
                if ((_channelUnreadCounts[channel.id] ?? 0) > 0)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.red,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      (_channelUnreadCounts[channel.id] ?? 0) > 99
                          ? '99+'
                          : '${_channelUnreadCounts[channel.id]}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                if (channel.isPrivate) ...[
                  if ((_channelUnreadCounts[channel.id] ?? 0) > 0)
                    const SizedBox(width: 8),
                  const Icon(Icons.lock, size: 16, color: Colors.grey),
                ],
              ],
            ),
            onTap: () {
              // Reset unread count when opening the channel
              setState(() {
                _channelUnreadCounts[channel.id] = 0;
              });
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => ChatScreen(
                    chatName: channelName,
                    chatSubtitle: 'messages.members_count'.tr(args: ['${channel.memberCount}']),
                    isChannel: true,
                    isPrivateChannel: channel.isPrivate,
                    avatarColor: Colors.primaries[colorIndex.abs()],
                    channelId: channel.id,
                  ),
                ),
              );
            },
            // Long press for channels - no action for now (channel starring not implemented)
            onLongPress: null,
          ),
        );
      }).toList(),
    );
  }

  Widget _buildDirectMessagesList() {
    // Show loading indicator
    if (_isLoadingConversations) {
      return const Padding(
        padding: EdgeInsets.all(16.0),
        child: Center(child: CircularProgressIndicator()),
      );
    }

    // Show error message
    if (_conversationsError != null) {
      return Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Text(
              _conversationsError!,
              style: TextStyle(color: Colors.red.shade700),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            TextButton.icon(
              onPressed: _fetchConversationsAndMembers,
              icon: const Icon(Icons.refresh),
              label: Text('messages.retry'.tr()),
            ),
          ],
        ),
      );
    }

    // Show empty state
    if (_conversations.isEmpty) {
      return Padding(
        padding: const EdgeInsets.all(16.0),
        child: Text(
          'messages.no_conversations_yet'.tr(),
          style: const TextStyle(fontStyle: FontStyle.italic),
          textAlign: TextAlign.center,
        ),
      );
    }

    // Filter conversations based on search query
    var filteredConversations = _searchQuery.isEmpty
        ? _conversations
        : _conversations.where((conversation) {
            final name = _getConversationName(conversation);
            return name.toLowerCase().contains(_searchQuery);
          }).toList();

    // Sort: starred conversations first, then by lastMessageAt
    filteredConversations = List.from(filteredConversations)
      ..sort((a, b) {
        // Starred items first
        if (a.isStarred && !b.isStarred) return -1;
        if (!a.isStarred && b.isStarred) return 1;
        // Then by last message time (most recent first)
        final aTime = a.lastMessageAt ?? a.createdAt;
        final bTime = b.lastMessageAt ?? b.createdAt;
        return bTime.compareTo(aTime);
      });

    if (filteredConversations.isEmpty && _searchQuery.isNotEmpty) {
      return Padding(
        padding: const EdgeInsets.all(16.0),
        child: Text(
          'messages.no_conversations_match_search'.tr(),
          style: const TextStyle(fontStyle: FontStyle.italic),
          textAlign: TextAlign.center,
        ),
      );
    }

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: filteredConversations.map((conversation) {
        final conversationName = _getConversationName(conversation);
        final currentUserId = AuthService.instance.currentUser?.id;
        final otherParticipants = conversation.participants
            .where((id) => id != currentUserId)
            .toList();
        final otherUserId = otherParticipants.isNotEmpty ? otherParticipants.first : '';
        final avatarColor = _getParticipantColor(otherUserId);
        final initials = conversationName.split(' ').map((e) => e[0]).take(2).join().toUpperCase();

        // Get avatar URL and online status from presence data
        final avatarUrl = _getAvatarUrl(otherUserId);
        final isOnline = _isUserOnline(otherUserId);
        final userStatus = _getUserStatus(otherUserId);
        final statusColor = _getStatusColor(userStatus);

        return Container(
          margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 0),
          child: ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
            leading: Stack(
              children: [
                CircleAvatar(
                  radius: 18,
                  backgroundColor: avatarColor,
                  backgroundImage: avatarUrl != null && avatarUrl.isNotEmpty
                      ? NetworkImage(avatarUrl)
                      : null,
                  child: avatarUrl == null || avatarUrl.isEmpty
                      ? Text(
                          initials,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        )
                      : null,
                ),
                // Status indicator - always show
                Positioned(
                  right: 0,
                  bottom: 0,
                  child: Container(
                    width: 12,
                    height: 12,
                    decoration: BoxDecoration(
                      color: statusColor,
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: Theme.of(context).scaffoldBackgroundColor,
                        width: 2,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            title: Text(
              conversationName,
              style: const TextStyle(
                fontWeight: FontWeight.w500,
              ),
            ),
            subtitle: conversation.messageCount > 0
                ? Text(
                    '${conversation.messageCount} messages',
                    style: const TextStyle(fontSize: 12),
                  )
                : null,
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Star icon for starred conversations
                if (conversation.isStarred)
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: GestureDetector(
                      onTap: () => _toggleConversationStar(conversation),
                      child: const Icon(
                        Icons.star,
                        color: Colors.orange,
                        size: 18,
                      ),
                    ),
                  ),
                // Unread count badge
                if ((_conversationUnreadCounts[conversation.id] ?? 0) > 0)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.red,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      (_conversationUnreadCounts[conversation.id] ?? 0) > 99
                          ? '99+'
                          : '${_conversationUnreadCounts[conversation.id]}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
              ],
            ),
            onTap: () {
              // Reset unread count when opening the conversation
              setState(() {
                _conversationUnreadCounts[conversation.id] = 0;
              });
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => ChatScreen(
                    chatName: conversationName,
                    chatSubtitle: isOnline ? 'Online' : 'Last seen recently',
                    isChannel: false,
                    avatarColor: avatarColor,
                    conversationId: conversation.id,
                    recipientId: otherUserId, // Pass the recipient's user ID
                  ),
                ),
              );
            },
            onLongPress: () {
              _showConversationStarOptions(conversation);
            },
          ),
        );
      }).toList(),
    );
  }

  /// Toggle star status for a conversation
  Future<void> _toggleConversationStar(Conversation conversation) async {
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) return;

    try {
      if (conversation.isStarred) {
        final response = await _chatApiService.unstarConversation(
          workspaceId,
          conversation.id,
        );
        if (response.success) {
          setState(() {
            final index = _conversations.indexWhere((c) => c.id == conversation.id);
            if (index != -1) {
              _conversations[index] = _conversations[index].copyWith(
                isStarred: false,
                starredAt: null,
              );
            }
          });
        }
      } else {
        final response = await _chatApiService.starConversation(
          workspaceId,
          conversation.id,
        );
        if (response.success) {
          setState(() {
            final index = _conversations.indexWhere((c) => c.id == conversation.id);
            if (index != -1) {
              _conversations[index] = _conversations[index].copyWith(
                isStarred: true,
                starredAt: DateTime.now(),
              );
            }
          });
        }
      }
    } catch (e) {
      debugPrint('Error toggling star: $e');
    }
  }

  /// Show star options for a conversation (long press)
  void _showConversationStarOptions(Conversation conversation) {
    final conversationName = _getConversationName(conversation);

    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.symmetric(vertical: 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: Icon(conversation.isStarred ? Icons.star_border : Icons.star),
              title: Text(conversation.isStarred
                  ? 'messages.remove_from_starred'.tr()
                  : 'messages.add_to_starred'.tr()),
              onTap: () {
                Navigator.pop(context);
                _toggleConversationStar(conversation);
              },
            ),
            const Divider(height: 1),
            ListTile(
              leading: const Icon(Icons.delete_outline, color: Colors.red),
              title: Text(
                'messages.delete_conversation'.tr(),
                style: const TextStyle(color: Colors.red),
              ),
              onTap: () {
                Navigator.pop(context);
                _showDeleteConversationDialog(conversation, conversationName);
              },
            ),
          ],
        ),
      ),
    );
  }

  /// Show confirmation dialog for deleting a conversation
  void _showDeleteConversationDialog(Conversation conversation, String conversationName) {
    showDialog(
      context: context,
      builder: (dialogContext) {
        bool isDeleting = false;

        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: Text('messages.delete_conversation_title'.tr()),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('messages.delete_conversation_confirm'.tr(namedArgs: {'name': conversationName})),
                  const SizedBox(height: 8),
                  Text(
                    'messages.delete_conversation_warning'.tr(),
                    style: const TextStyle(color: Colors.red, fontSize: 12),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: isDeleting ? null : () => Navigator.pop(dialogContext),
                  child: Text('common.cancel'.tr()),
                ),
                TextButton(
                  onPressed: isDeleting
                      ? null
                      : () async {
                          setDialogState(() => isDeleting = true);

                          final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
                          if (workspaceId == null) {
                            Navigator.pop(dialogContext);
                            return;
                          }

                          final response = await _chatApiService.deleteConversation(
                            workspaceId,
                            conversation.id,
                          );

                          if (!mounted) return;

                          if (response.success) {
                            // Remove from local list
                            setState(() {
                              _conversations.removeWhere((c) => c.id == conversation.id);
                              _conversationUnreadCounts.remove(conversation.id);
                            });

                            Navigator.pop(dialogContext);

                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('messages.conversation_deleted'.tr(namedArgs: {'name': conversationName})),
                                backgroundColor: Colors.green,
                              ),
                            );
                          } else {
                            setDialogState(() => isDeleting = false);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(response.message ?? 'messages.delete_conversation_error'.tr()),
                                backgroundColor: Colors.red,
                              ),
                            );
                          }
                        },
                  style: TextButton.styleFrom(
                    foregroundColor: Colors.red,
                    backgroundColor: Colors.red.withValues(alpha: 0.1),
                  ),
                  child: isDeleting
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Text('common.delete'.tr()),
                ),
              ],
            );
          },
        );
      },
    );
  }

  String _getChannelName(int index) {
    final channels = [
      '# general',
      '# development',
      '# design',
      '# marketing',
      '# random',
      '# announcements',
      '# help',
      '# feedback',
    ];
    return channels[index % channels.length];
  }

  String _getInitials(int index) {
    final names = ['JD', 'AS', 'MB', 'KL', 'TR', 'PW', 'SJ', 'RL', 'DK', 'NP', 'BH', 'CF'];
    return names[index % names.length];
  }

  void _showCreateChannelDialog(BuildContext context) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => CreateChannelDialog(
        onChannelCreated: (name, description, isPublic, memberIds) async {
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

          try {
            // Create channel via API
            final response = await _chatApiService.createChannel(
              workspaceId,
              CreateChannelDto(
                name: name,
                description: description,
                type: 'channel',
                isPrivate: !isPublic,
                memberIds: memberIds.isNotEmpty ? memberIds : null, // Add members for private channels
              ),
            );

            if (response.success) {
              // Refresh channels list
              await _fetchChannels();

              // Show success message
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('messages.channel_created'.tr(args: [name])),
                    backgroundColor: Theme.of(context).colorScheme.primary,
                  ),
                );
              }
            } else {
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(response.message ?? 'messages.error_creating_channel'.tr(args: [''])),
                    backgroundColor: Colors.red,
                  ),
                );
              }
            }
          } catch (e) {
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('messages.error_creating_channel'.tr(args: [e.toString()])),
                  backgroundColor: Colors.red,
                ),
              );
            }
          }
        },
      ),
    );
  }


  void _handleMenuSelection(String value) {
    switch (value) {
      case 'threads':
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const ThreadsScreen()),
        );
        break;
      case 'saved':
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const SavedMessagesScreen()),
        );
        break;
      case 'drafts':
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const DraftsScreen()),
        );
        break;
    }
  }

  void _showNewDirectMessageDialog(BuildContext context) async {
    final workspace = WorkspaceService.instance.currentWorkspace;
    final authService = AuthService.instance;
    final currentUserId = authService.currentUser?.id;
    final workspaceId = workspace?.id;

    if (workspaceId == null || currentUserId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('messages.workspace_user_not_found'.tr()),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    // Show loading while fetching members, conversations, and bots
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(child: CircularProgressIndicator()),
    );

    try {
      // Fetch workspace members, conversations, and bots in parallel
      final botService = BotApiService();
      final results = await Future.wait([
        _workspaceApiService.getMembers(workspaceId),
        _chatApiService.getConversations(workspaceId),
        botService.getBots(workspaceId),
      ]);

      final membersResponse = results[0] as ApiResponse<List<WorkspaceMember>>;
      final conversationsResponse = results[1] as ApiResponse<List<Conversation>>;
      final botsResponse = results[2] as ApiResponse<List<Bot>>;

      if (!membersResponse.success || membersResponse.data == null) {
        if (!mounted) return;
        Navigator.pop(context); // Close loading dialog
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(membersResponse.message ?? 'Failed to fetch workspace members'),
            backgroundColor: Colors.red,
          ),
        );
        return;
      }

      // Extract user IDs from existing conversations
      final existingChatUserIds = <String>{};
      if (conversationsResponse.success && conversationsResponse.data != null) {
        for (var conv in conversationsResponse.data!) {
          // Add all participants except current user
          existingChatUserIds.addAll(
            conv.participants.where((p) => p != currentUserId),
          );
        }
      }

      if (!mounted) return;
      Navigator.pop(context); // Close loading dialog

      // Get workspace members (excluding current user and users with existing conversations)
      final members = membersResponse.data!
          .where((member) =>
              member.userId != currentUserId &&
              !existingChatUserIds.contains(member.userId))
          .toList();

      // Get active bots
      final activeBots = (botsResponse.success && botsResponse.data != null)
          ? botsResponse.data!.where((bot) => bot.status == BotStatus.active).toList()
          : <Bot>[];

      if (members.isEmpty && activeBots.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('messages.no_new_members'.tr()),
            backgroundColor: Colors.orange,
          ),
        );
        return;
      }

      // Show member and bot selection dialog
      await showDialog(
        context: context,
        builder: (dialogContext) => _MemberSelectionDialog(
          members: members,
          bots: activeBots,
          currentUserId: currentUserId,
          onMemberSelected: (member) async {
            final userName = member.name ?? member.email.split('@')[0];

            // Show loading dialog
            showDialog(
              context: context,
              barrierDismissible: false,
              builder: (context) => const Center(
                child: CircularProgressIndicator(),
              ),
            );

            try {
              final chatApi = ChatApiService();
              final workspace = WorkspaceService.instance.currentWorkspace;
              final workspaceId = workspace?.id;

              if (workspaceId == null || currentUserId == null) {
                throw Exception('Workspace or user not found');
              }


              // Try to create conversation with selected user
              final response = await chatApi.createConversation(
                workspaceId,
                CreateConversationDto(
                  participantIds: [member.userId],
                  type: 'direct',
                ),
              );

              if (response.data != null) {
              }

              if (!mounted) return;

              // Close loading dialog
              Navigator.pop(context);

              if (response.success && response.data != null) {
                // Navigate to chat screen with created conversation
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => ChatScreen(
                      chatName: userName,
                      chatSubtitle: member.email,
                      isChannel: false,
                      conversationId: response.data!.id,
                      recipientId: member.userId,
                    ),
                  ),
                );
              } else if (response.statusCode == 409) {
                // Conversation already exists - try to find it and navigate
                final conversationsResponse = await chatApi.getConversations(workspaceId);
                if (conversationsResponse.success && conversationsResponse.data != null) {
                  // Find conversation with this user
                  final existingConv = conversationsResponse.data!.firstWhere(
                    (conv) => conv.participants.any((p) => p == member.userId),
                    orElse: () => throw Exception('Conversation not found'),
                  );

                  if (!mounted) return;

                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => ChatScreen(
                        chatName: userName,
                        chatSubtitle: member.email,
                        isChannel: false,
                        conversationId: existingConv.id,
                        recipientId: member.userId,
                      ),
                    ),
                  );
                } else {
                  throw Exception('Failed to find existing conversation');
                }
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(response.message ?? 'messages.failed_create_conversation'.tr()),
                    backgroundColor: Colors.red,
                  ),
                );
              }
            } catch (e) {
              if (!mounted) return;
              Navigator.pop(context); // Close loading dialog
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('messages.error'.tr(args: [e.toString()])),
                  backgroundColor: Colors.red,
                ),
              );
            }
          },
          onBotSelected: (bot) async {
            final botName = bot.effectiveDisplayName;

            // Show loading dialog
            showDialog(
              context: context,
              barrierDismissible: false,
              builder: (context) => const Center(
                child: CircularProgressIndicator(),
              ),
            );

            try {
              final chatApi = ChatApiService();
              final workspace = WorkspaceService.instance.currentWorkspace;
              final workspaceId = workspace?.id;

              if (workspaceId == null) {
                throw Exception('Workspace not found');
              }

              // Create conversation with the bot
              final response = await chatApi.createConversation(
                workspaceId,
                CreateConversationDto(
                  participantIds: [bot.id],
                  type: 'bot',
                ),
              );

              if (!mounted) return;

              // Close loading dialog
              Navigator.pop(context);

              if (response.success && response.data != null) {
                // Navigate to chat screen with created conversation
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => ChatScreen(
                      chatName: botName,
                      chatSubtitle: bot.description ?? 'Bot',
                      isChannel: false,
                      conversationId: response.data!.id,
                      recipientId: bot.id,
                      isBot: true,
                    ),
                  ),
                );
              } else if (response.statusCode == 409) {
                // Conversation already exists - try to find it and navigate
                final conversationsResponse = await chatApi.getConversations(workspaceId);
                if (conversationsResponse.success && conversationsResponse.data != null) {
                  // Find conversation with this bot
                  final existingConv = conversationsResponse.data!.firstWhere(
                    (conv) => conv.participants.any((p) => p == bot.id),
                    orElse: () => throw Exception('Conversation not found'),
                  );

                  if (!mounted) return;

                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => ChatScreen(
                        chatName: botName,
                        chatSubtitle: bot.description ?? 'Bot',
                        isChannel: false,
                        conversationId: existingConv.id,
                        recipientId: bot.id,
                        isBot: true,
                      ),
                    ),
                  );
                } else {
                  throw Exception('Failed to find existing conversation');
                }
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(response.message ?? 'messages.failed_create_conversation'.tr()),
                    backgroundColor: Colors.red,
                  ),
                );
              }
            } catch (e) {
              if (!mounted) return;
              Navigator.pop(context); // Close loading dialog
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
          content: Text('messages.failed_load_members'.tr(args: [e.toString()])),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  /// Show private channel search dialog
  void _showPrivateChannelSearchDialog(BuildContext context) {
    final searchController = TextEditingController();
    bool isDialogMounted = true;

    showDialog(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) {
          return WillPopScope(
            onWillPop: () async {
              isDialogMounted = false;
              searchController.dispose();
              return true;
            },
            child: AlertDialog(
            title: Row(
              children: [
                const Icon(Icons.lock_outline, size: 24),
                const SizedBox(width: 8),
                Text('messages.search_private_channels'.tr()),
              ],
            ),
            contentPadding: const EdgeInsets.fromLTRB(24, 20, 24, 0),
            content: SizedBox(
              width: double.maxFinite,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Search input
                    TextField(
                      controller: searchController,
                      decoration: InputDecoration(
                        labelText: 'messages.channel_name'.tr(),
                        hintText: 'messages.type_channel_name'.tr(),
                        prefixIcon: const Icon(Icons.search),
                        suffixIcon: IconButton(
                          icon: const Icon(Icons.clear),
                          onPressed: () {
                            searchController.clear();
                            if (isDialogMounted) {
                              setDialogState(() {
                                _searchedPrivateChannels = [];
                                _privateChannelSearchError = null;
                              });
                            }
                          },
                        ),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      autofocus: true,
                      onSubmitted: (value) async {
                        if (value.trim().isEmpty) return;

                        final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
                        if (workspaceId == null) {
                          if (isDialogMounted) {
                            setDialogState(() {
                              _privateChannelSearchError = 'messages.no_workspace_selected'.tr();
                            });
                          }
                          return;
                        }

                        if (isDialogMounted) {
                          setDialogState(() {
                            _isSearchingPrivateChannels = true;
                            _privateChannelSearchError = null;
                          });
                        }

                        final response = await _chatApiService.searchPrivateChannels(
                          workspaceId,
                          value.trim(),
                        );

                        if (isDialogMounted) {
                          setDialogState(() {
                            _isSearchingPrivateChannels = false;
                            if (response.success && response.data != null) {
                              _searchedPrivateChannels = response.data!;
                              if (_searchedPrivateChannels.isEmpty) {
                                _privateChannelSearchError = 'messages.no_private_channels_found'.tr(args: [value.trim()]);
                              }
                            } else {
                              _privateChannelSearchError = response.message ?? 'messages.search_failed'.tr();
                              _searchedPrivateChannels = [];
                            }
                          });
                        }
                      },
                    ),
                    const SizedBox(height: 16),

                    // Search results
                    Container(
                      constraints: const BoxConstraints(
                        minHeight: 200,
                        maxHeight: 300,
                      ),
                      width: double.maxFinite,
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.grey.shade300),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: _isSearchingPrivateChannels
                          ? Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const CircularProgressIndicator(),
                                  const SizedBox(height: 16),
                                  Text('messages.searching_private_channels'.tr()),
                                ],
                              ),
                            )
                          : _privateChannelSearchError != null
                              ? Center(
                                  child: Padding(
                                    padding: const EdgeInsets.all(16.0),
                                    child: Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Icon(
                                          Icons.info_outline,
                                          size: 48,
                                          color: Colors.orange.shade700,
                                        ),
                                        const SizedBox(height: 16),
                                        Text(
                                          _privateChannelSearchError!,
                                          textAlign: TextAlign.center,
                                          style: TextStyle(
                                            color: Colors.orange.shade700,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                )
                              : _searchedPrivateChannels.isEmpty
                                  ? Center(
                                      child: Padding(
                                        padding: const EdgeInsets.all(16.0),
                                        child: Column(
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          children: [
                                            Icon(
                                              Icons.search,
                                              size: 48,
                                              color: Colors.grey.shade400,
                                            ),
                                            const SizedBox(height: 16),
                                            Text(
                                              'messages.search_for_private_channels'.tr(),
                                              style: TextStyle(
                                                color: Colors.grey.shade600,
                                              ),
                                            ),
                                            const SizedBox(height: 8),
                                            Text(
                                              'messages.type_channel_press_enter'.tr(),
                                              style: TextStyle(
                                                fontSize: 12,
                                                color: Colors.grey.shade500,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    )
                                  : ListView.builder(
                                      shrinkWrap: true,
                                      physics: const NeverScrollableScrollPhysics(),
                                      itemCount: _searchedPrivateChannels.length,
                                      itemBuilder: (context, index) {
                                        final channel = _searchedPrivateChannels[index];
                                        return ListTile(
                                          leading: CircleAvatar(
                                            backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                                            child: Icon(
                                              Icons.lock,
                                              color: Theme.of(context).colorScheme.primary,
                                              size: 20,
                                            ),
                                          ),
                                          title: Text('# ${channel.name}'),
                                          subtitle: Text(
                                            channel.description ?? 'messages.private_channel_subtitle'.tr(),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                          trailing: Icon(
                                            channel.isMember
                                              ? Icons.arrow_forward_ios
                                              : Icons.add_circle_outline,
                                            size: 16,
                                            color: channel.isMember
                                              ? null
                                              : Theme.of(context).colorScheme.primary,
                                          ),
                                          onTap: () {
                                            isDialogMounted = false;
                                            searchController.dispose();
                                            Navigator.pop(dialogContext);

                                            // Check if user is a member
                                            if (channel.isMember) {
                                              // User is a member, open chat
                                              Navigator.push(
                                                context,
                                                MaterialPageRoute(
                                                  builder: (context) => ChatScreen(
                                                    chatName: channel.name,
                                                    chatSubtitle: 'messages.members_count'.tr(args: ['${channel.memberCount ?? 0}']),
                                                    isChannel: true,
                                                    isPrivateChannel: channel.isPrivate,
                                                    channelId: channel.id,
                                                  ),
                                                ),
                                              );
                                            } else {
                                              // User is not a member, show join dialog
                                              _showJoinChannelDialog(context, channel);
                                            }
                                          },
                                        );
                                      },
                                    ),
                    ),
                  ],
                ),
              ),
            ),
            actions: [
              TextButton(
                onPressed: () {
                  isDialogMounted = false;
                  searchController.dispose();
                  Navigator.pop(dialogContext);
                },
                child: Text('messages.close'.tr()),
              ),
            ],
            ),
          );
        },
      ),
    );
  }

  /// Show join channel dialog for private channels
  void _showJoinChannelDialog(BuildContext context, Channel channel) {
    bool isJoining = false;

    showDialog(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) {
          return AlertDialog(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            contentPadding: const EdgeInsets.all(24),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Channel icon
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.primaryContainer,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.lock,
                    size: 48,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                ),
                const SizedBox(height: 24),

                // Channel name
                Text(
                  '# ${channel.name}',
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),

                // Private channel label
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.orange.shade100,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.lock,
                        size: 14,
                        color: Colors.orange.shade700,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        'messages.private_channel_label'.tr(),
                        style: TextStyle(
                          color: Colors.orange.shade700,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Channel info
                if (channel.description != null && channel.description!.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: Text(
                      channel.description!,
                      style: TextStyle(
                        color: Colors.grey.shade600,
                        fontSize: 14,
                      ),
                      textAlign: TextAlign.center,
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),

                // Member count
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.people,
                      size: 16,
                      color: Colors.grey.shade600,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      'messages.members_count'.tr(args: ['${channel.memberCount}']),
                      style: TextStyle(
                        color: Colors.grey.shade600,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Info message
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.blue.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: Colors.blue.shade200,
                      width: 1,
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.info_outline,
                        color: Colors.blue.shade700,
                        size: 20,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'messages.join_channel_info'.tr(),
                          style: TextStyle(
                            color: Colors.blue.shade900,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            actions: [
              // Cancel button
              TextButton(
                onPressed: isJoining ? null : () => Navigator.pop(dialogContext),
                child: Text('messages.cancel'.tr()),
              ),

              // Join button
              ElevatedButton.icon(
                onPressed: isJoining
                    ? null
                    : () async {
                        final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
                        if (workspaceId == null) {
                          Navigator.pop(dialogContext);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('messages.no_workspace_selected'.tr()),
                              backgroundColor: Colors.red,
                            ),
                          );
                          return;
                        }

                        setDialogState(() {
                          isJoining = true;
                        });

                        try {

                          final response = await _chatApiService.joinChannel(
                            workspaceId,
                            channel.id,
                          );

                          if (response.success) {

                            // Close the dialog
                            Navigator.pop(dialogContext);

                            // Show success message
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('messages.joined_channel'.tr(args: [channel.name])),
                                backgroundColor: Colors.green,
                                duration: const Duration(seconds: 2),
                              ),
                            );

                            // Refresh channels list
                            await _fetchChannels();

                            // Navigate to the channel chat
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => ChatScreen(
                                  chatName: channel.name,
                                  chatSubtitle: 'messages.members_count'.tr(args: ['${channel.memberCount}']),
                                  isChannel: true,
                                  isPrivateChannel: channel.isPrivate,
                                  channelId: channel.id,
                                ),
                              ),
                            );
                          } else {

                            setDialogState(() {
                              isJoining = false;
                            });

                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(response.message ?? 'messages.failed_join_channel'.tr()),
                                backgroundColor: Colors.red,
                              ),
                            );
                          }
                        } catch (e) {

                          setDialogState(() {
                            isJoining = false;
                          });

                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('messages.error'.tr(args: [e.toString()])),
                              backgroundColor: Colors.red,
                            ),
                          );
                        }
                      },
                icon: isJoining
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                    : const Icon(Icons.add_circle, size: 20),
                label: Text(isJoining ? 'messages.joining'.tr() : 'messages.join_channel_btn'.tr()),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Theme.of(context).colorScheme.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

/// Separate StatefulWidget for member selection dialog
/// This properly manages TextEditingController lifecycle
class _MemberSelectionDialog extends StatefulWidget {
  final List<WorkspaceMember> members;
  final List<Bot> bots;
  final String? currentUserId;
  final Function(WorkspaceMember) onMemberSelected;
  final Function(Bot) onBotSelected;

  const _MemberSelectionDialog({
    required this.members,
    required this.bots,
    required this.currentUserId,
    required this.onMemberSelected,
    required this.onBotSelected,
  });

  @override
  State<_MemberSelectionDialog> createState() => _MemberSelectionDialogState();
}

class _MemberSelectionDialogState extends State<_MemberSelectionDialog> {
  late final TextEditingController _searchController;
  List<WorkspaceMember> _filteredMembers = [];
  List<Bot> _filteredBots = [];

  @override
  void initState() {
    super.initState();
    _searchController = TextEditingController();
    _filteredMembers = widget.members;
    _filteredBots = widget.bots;
    _searchController.addListener(_filterItems);
  }

  @override
  void dispose() {
    _searchController.removeListener(_filterItems);
    _searchController.dispose();
    super.dispose();
  }

  void _filterItems() {
    setState(() {
      if (_searchController.text.isEmpty) {
        _filteredMembers = widget.members;
        _filteredBots = widget.bots;
      } else {
        final query = _searchController.text.toLowerCase();
        _filteredMembers = widget.members.where((member) {
          final name = (member.name ?? '').toLowerCase();
          final email = member.email.toLowerCase();
          return name.contains(query) || email.contains(query);
        }).toList();
        _filteredBots = widget.bots.where((bot) {
          final name = bot.effectiveDisplayName.toLowerCase();
          final description = (bot.description ?? '').toLowerCase();
          return name.contains(query) || description.contains(query);
        }).toList();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final hasMembers = _filteredMembers.isNotEmpty;
    final hasBots = _filteredBots.isNotEmpty;
    final isEmpty = !hasMembers && !hasBots;

    return AlertDialog(
      title: Text('messages.new_direct_message'.tr()),
      contentPadding: const EdgeInsets.fromLTRB(24, 20, 24, 0),
      content: SizedBox(
        width: double.maxFinite,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _searchController,
              decoration: InputDecoration(
                labelText: 'messages.search_users'.tr(),
                hintText: 'messages.type_name_email'.tr(),
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              autofocus: true,
            ),
            const SizedBox(height: 16),
            Flexible(
              child: Container(
                constraints: const BoxConstraints(maxHeight: 350),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey.shade300),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: isEmpty
                    ? Center(
                        child: Text('messages.no_members_found'.tr()),
                      )
                    : ListView(
                        shrinkWrap: true,
                        children: [
                          // Bots section
                          if (hasBots) ...[
                            Padding(
                              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                              child: Row(
                                children: [
                                  Icon(Icons.smart_toy, size: 16, color: Colors.grey.shade600),
                                  const SizedBox(width: 8),
                                  Text(
                                    'bots.title'.tr(),
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: Colors.grey.shade600,
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            ..._filteredBots.map((bot) => _buildBotTile(bot)),
                          ],
                          // Members section
                          if (hasMembers) ...[
                            Padding(
                              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                              child: Row(
                                children: [
                                  Icon(Icons.people, size: 16, color: Colors.grey.shade600),
                                  const SizedBox(width: 8),
                                  Text(
                                    'messages.members'.tr(),
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: Colors.grey.shade600,
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            ..._filteredMembers.map((member) => _buildMemberTile(member)),
                          ],
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
          child: Text('messages.cancel'.tr()),
        ),
      ],
    );
  }

  Widget _buildBotTile(Bot bot) {
    final botName = bot.effectiveDisplayName;
    return ListTile(
      leading: CircleAvatar(
        backgroundColor: Colors.indigo.shade100,
        child: Icon(
          Icons.smart_toy,
          color: Colors.indigo.shade700,
          size: 20,
        ),
      ),
      title: Text(botName),
      subtitle: Text(
        '@${botName.toLowerCase().replaceAll(' ', '-')}.bot',
        style: TextStyle(color: Colors.indigo.shade400),
      ),
      trailing: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: Colors.indigo.shade50,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          'Bot',
          style: TextStyle(
            fontSize: 11,
            color: Colors.indigo.shade700,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
      onTap: () {
        Navigator.pop(context);
        widget.onBotSelected(bot);
      },
    );
  }

  Widget _buildMemberTile(WorkspaceMember member) {
    final userName = member.name ?? member.email.split('@')[0];
    return ListTile(
      leading: CircleAvatar(
        backgroundColor: Theme.of(context).primaryColor,
        child: Text(
          userName[0].toUpperCase(),
          style: const TextStyle(color: Colors.white),
        ),
      ),
      title: Text(userName),
      subtitle: Text(member.email),
      onTap: () {
        Navigator.pop(context);
        widget.onMemberSelected(member);
      },
    );
  }
}