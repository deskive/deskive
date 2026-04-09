import 'package:flutter/material.dart';
import '../services/real_time_chat_service.dart';
import '../message/real_time_chat_list_screen.dart';
import '../message/real_time_chat_screen.dart';

/// Example implementation of real-time chat functionality
/// This demonstrates how to integrate the RealTimeChatService with your app
class RealTimeChatExample extends StatefulWidget {
  final String workspaceId;
  final String currentUserId;
  final String currentUserName;

  const RealTimeChatExample({
    super.key,
    required this.workspaceId,
    required this.currentUserId,
    required this.currentUserName,
  });

  @override
  State<RealTimeChatExample> createState() => _RealTimeChatExampleState();
}

class _RealTimeChatExampleState extends State<RealTimeChatExample> {
  final RealTimeChatService _chatService = RealTimeChatService.instance;
  bool _isInitialized = false;
  String _statusMessage = 'Initializing...';

  @override
  void initState() {
    super.initState();
    _initializeChat();
  }

  @override
  void dispose() {
    // The service will be disposed when the app closes
    // Individual subscriptions are managed by the screens
    super.dispose();
  }

  Future<void> _initializeChat() async {
    try {
      setState(() {
        _statusMessage = 'Connecting to real-time chat...';
      });

      await _chatService.initialize(
        workspaceId: widget.workspaceId,
        userId: widget.currentUserId,
        userName: widget.currentUserName,
      );

      setState(() {
        _isInitialized = true;
        _statusMessage = 'Connected successfully!';
      });

      // Optional: Set initial presence status
      await _chatService.updatePresenceStatus(
        status: UserPresenceStatus.online,
      );

    } catch (e) {
      setState(() {
        _statusMessage = 'Failed to connect: $e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_isInitialized) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Real-Time Chat'),
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(),
              const SizedBox(height: 16),
              Text(
                _statusMessage,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _initializeChat,
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    // Once initialized, show the chat list
    return RealTimeChatListScreen(
      workspaceId: widget.workspaceId,
      currentUserId: widget.currentUserId,
      currentUserName: widget.currentUserName,
    );
  }
}

/// Example of how to directly open a specific chat
class DirectChatExample extends StatelessWidget {
  final String workspaceId;
  final String currentUserId;
  final String currentUserName;
  final String chatId;
  final String chatName;
  final bool isChannel;

  const DirectChatExample({
    super.key,
    required this.workspaceId,
    required this.currentUserId,
    required this.currentUserName,
    required this.chatId,
    required this.chatName,
    required this.isChannel,
  });

  @override
  Widget build(BuildContext context) {
    return RealTimeChatScreen(
      chatId: chatId,
      chatName: chatName,
      isChannel: isChannel,
      workspaceId: workspaceId,
      currentUserId: currentUserId,
      currentUserName: currentUserName,
    );
  }
}

/// Example of how to listen to specific real-time events
class RealTimeEventsExample extends StatefulWidget {
  const RealTimeEventsExample({super.key});

  @override
  State<RealTimeEventsExample> createState() => _RealTimeEventsExampleState();
}

class _RealTimeEventsExampleState extends State<RealTimeEventsExample> {
  final RealTimeChatService _chatService = RealTimeChatService.instance;
  final List<String> _events = [];

  @override
  void initState() {
    super.initState();
    _listenToEvents();
  }

  void _listenToEvents() {
    // Listen to new messages
    _chatService.messageStream.listen((message) {
      setState(() {
        _events.insert(0, 
          '📨 New message in ${message.channelId ?? message.conversationId}: ${message.content}');
      });
    });

    // Listen to presence updates
    _chatService.presenceStream.listen((presence) {
      setState(() {
        _events.insert(0, 
          '👤 ${presence.userName} is now ${presence.status.name}');
      });
    });

    // Listen to typing indicators
    _chatService.typingStream.listen((typing) {
      setState(() {
        _events.insert(0, 
          '⌨️ ${typing.userName} is typing in ${typing.channelId}');
      });
    });

    // Listen to delivery status updates
    _chatService.deliveryStatusStream.listen((status) {
      setState(() {
        _events.insert(0, 
          '✅ Message status: ${status.name}');
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Real-Time Events'),
        actions: [
          IconButton(
            icon: const Icon(Icons.clear),
            onPressed: () {
              setState(() {
                _events.clear();
              });
            },
          ),
        ],
      ),
      body: _events.isEmpty
          ? const Center(
              child: Text('No events yet...'),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _events.length,
              itemBuilder: (context, index) {
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    title: Text(_events[index]),
                    subtitle: Text(DateTime.now().toString()),
                  ),
                );
              },
            ),
    );
  }
}

/// Example of how to manage user presence
class PresenceExample extends StatefulWidget {
  const PresenceExample({super.key});

  @override
  State<PresenceExample> createState() => _PresenceExampleState();
}

class _PresenceExampleState extends State<PresenceExample> {
  final RealTimeChatService _chatService = RealTimeChatService.instance;
  UserPresenceStatus _currentStatus = UserPresenceStatus.online;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Presence Management'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Current Status: ${_currentStatus.name}',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            
            // Status buttons
            Wrap(
              spacing: 8,
              children: UserPresenceStatus.values.map((status) {
                final isSelected = status == _currentStatus;
                return ChoiceChip(
                  label: Text(status.name),
                  selected: isSelected,
                  onSelected: (selected) {
                    if (selected) {
                      _updatePresence(status);
                    }
                  },
                );
              }).toList(),
            ),
            
            const SizedBox(height: 24),
            
            Text(
              'Online Users',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            
            // Display online users
            Expanded(
              child: StreamBuilder<UserPresence>(
                stream: _chatService.presenceStream,
                builder: (context, snapshot) {
                  final onlineUsers = _chatService.getAllUserPresences()
                      .where((p) => p.status == UserPresenceStatus.online)
                      .toList();
                  
                  if (onlineUsers.isEmpty) {
                    return const Center(
                      child: Text('No online users'),
                    );
                  }
                  
                  return ListView.builder(
                    itemCount: onlineUsers.length,
                    itemBuilder: (context, index) {
                      final user = onlineUsers[index];
                      return ListTile(
                        leading: CircleAvatar(
                          backgroundColor: Colors.green,
                          child: Text(
                            user.userName.isNotEmpty 
                                ? user.userName[0].toUpperCase()
                                : '?',
                            style: const TextStyle(color: Colors.white),
                          ),
                        ),
                        title: Text(user.userName),
                        subtitle: Text('Online since ${user.lastSeen}'),
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _updatePresence(UserPresenceStatus status) async {
    try {
      await _chatService.updatePresenceStatus(status: status);
      setState(() {
        _currentStatus = status;
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to update presence: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }
}