import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'models/slack_models.dart';
import 'services/slack_service.dart';

/// Slack messaging screen with channels and messages
class SlackScreen extends StatefulWidget {
  const SlackScreen({super.key});

  @override
  State<SlackScreen> createState() => _SlackScreenState();
}

class _SlackScreenState extends State<SlackScreen> {
  final SlackService _slackService = SlackService.instance;
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  List<SlackChannel> _channels = [];
  List<SlackMessage> _messages = [];
  Map<String, SlackUser> _users = {};
  SlackChannel? _selectedChannel;

  bool _isLoadingChannels = true;
  bool _isLoadingMessages = false;
  bool _isSending = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadChannels();
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadChannels() async {
    setState(() {
      _isLoadingChannels = true;
      _error = null;
    });

    try {
      final response = await _slackService.listChannels();
      setState(() {
        _channels = response.channels;
        _isLoadingChannels = false;
      });

      // Auto-select first channel if available
      if (_channels.isNotEmpty && _selectedChannel == null) {
        _selectChannel(_channels.first);
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoadingChannels = false;
      });
    }
  }

  Future<void> _selectChannel(SlackChannel channel) async {
    setState(() {
      _selectedChannel = channel;
      _messages = [];
      _isLoadingMessages = true;
    });

    try {
      final response = await _slackService.listMessages(
        channel: channel.id,
        limit: 50,
      );
      setState(() {
        _messages = response.messages.reversed.toList(); // Oldest first
        _isLoadingMessages = false;
      });

      // Load users for the messages
      _loadUsersForMessages();

      // Scroll to bottom
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scrollController.hasClients) {
          _scrollController.animateTo(
            _scrollController.position.maxScrollExtent,
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeOut,
          );
        }
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoadingMessages = false;
      });
    }
  }

  Future<void> _loadUsersForMessages() async {
    // Get unique user IDs from messages
    final userIds = _messages.map((m) => m.user).toSet();
    final unknownUserIds = userIds.where((id) => !_users.containsKey(id));

    for (final userId in unknownUserIds) {
      try {
        final user = await _slackService.getUser(userId);
        setState(() {
          _users[userId] = user;
        });
      } catch (e) {
        // Ignore errors for individual users
      }
    }
  }

  Future<void> _sendMessage() async {
    if (_messageController.text.trim().isEmpty || _selectedChannel == null) {
      return;
    }

    setState(() => _isSending = true);

    try {
      final response = await _slackService.sendMessage(
        channel: _selectedChannel!.id,
        text: _messageController.text.trim(),
      );

      if (response.ok) {
        _messageController.clear();
        // Reload messages
        _selectChannel(_selectedChannel!);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to send message: $e')),
        );
      }
    } finally {
      setState(() => _isSending = false);
    }
  }

  Future<void> _addReaction(SlackMessage message, String emoji) async {
    try {
      await _slackService.addReaction(
        channel: _selectedChannel!.id,
        timestamp: message.ts,
        name: emoji,
      );
      // Reload messages to show new reaction
      _selectChannel(_selectedChannel!);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to add reaction: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            const _SlackLogo(size: 28),
            const SizedBox(width: 12),
            Text(_selectedChannel?.name ?? 'Slack'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _selectedChannel != null
                ? () => _selectChannel(_selectedChannel!)
                : null,
            tooltip: 'Refresh',
          ),
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () => _showSearchDialog(),
            tooltip: 'Search',
          ),
        ],
      ),
      body: Row(
        children: [
          // Channels sidebar
          Container(
            width: 260,
            decoration: BoxDecoration(
              border: Border(
                right: BorderSide(
                  color: theme.dividerColor,
                ),
              ),
            ),
            child: Column(
              children: [
                // Channels header
                Container(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Text(
                        'Channels',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const Spacer(),
                      if (_isLoadingChannels)
                        const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                    ],
                  ),
                ),
                const Divider(height: 1),
                // Channels list
                Expanded(
                  child: _buildChannelsList(),
                ),
              ],
            ),
          ),
          // Messages area
          Expanded(
            child: Column(
              children: [
                // Messages list
                Expanded(
                  child: _buildMessagesList(),
                ),
                // Message input
                if (_selectedChannel != null) _buildMessageInput(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChannelsList() {
    if (_isLoadingChannels && _channels.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null && _channels.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('Error: $_error'),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadChannels,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    // Group channels
    final publicChannels = _channels.where((c) => !c.isPrivate && !c.isIm).toList();
    final privateChannels = _channels.where((c) => c.isPrivate && !c.isIm).toList();
    final directMessages = _channels.where((c) => c.isIm).toList();

    return ListView(
      children: [
        if (publicChannels.isNotEmpty) ...[
          _buildChannelSection('Channels', publicChannels, Icons.tag),
        ],
        if (privateChannels.isNotEmpty) ...[
          _buildChannelSection('Private Channels', privateChannels, Icons.lock),
        ],
        if (directMessages.isNotEmpty) ...[
          _buildChannelSection('Direct Messages', directMessages, Icons.person),
        ],
      ],
    );
  }

  Widget _buildChannelSection(String title, List<SlackChannel> channels, IconData icon) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Text(
            title,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurface.withOpacity(0.6),
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        ...channels.map((channel) => _buildChannelTile(channel, icon)),
      ],
    );
  }

  Widget _buildChannelTile(SlackChannel channel, IconData icon) {
    final theme = Theme.of(context);
    final isSelected = _selectedChannel?.id == channel.id;

    return ListTile(
      dense: true,
      selected: isSelected,
      selectedTileColor: theme.colorScheme.primaryContainer.withOpacity(0.3),
      leading: Icon(
        icon,
        size: 18,
        color: isSelected
            ? theme.colorScheme.primary
            : theme.colorScheme.onSurface.withOpacity(0.6),
      ),
      title: Text(
        channel.name,
        style: TextStyle(
          fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
        ),
        overflow: TextOverflow.ellipsis,
      ),
      onTap: () => _selectChannel(channel),
    );
  }

  Widget _buildMessagesList() {
    if (_selectedChannel == null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const _SlackLogo(size: 64),
            const SizedBox(height: 16),
            Text(
              'Select a channel to start messaging',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                  ),
            ),
          ],
        ),
      );
    }

    if (_isLoadingMessages) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_messages.isEmpty) {
      return Center(
        child: Text(
          'No messages yet',
          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
              ),
        ),
      );
    }

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.symmetric(vertical: 16),
      itemCount: _messages.length,
      itemBuilder: (context, index) {
        final message = _messages[index];
        final user = _users[message.user];
        return _buildMessageTile(message, user);
      },
    );
  }

  Widget _buildMessageTile(SlackMessage message, SlackUser? user) {
    final theme = Theme.of(context);
    final timeFormat = DateFormat.jm();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Avatar
          CircleAvatar(
            radius: 18,
            backgroundImage: user?.image != null ? NetworkImage(user!.image!) : null,
            child: user?.image == null
                ? Text(
                    (user?.bestName ?? message.user).substring(0, 1).toUpperCase(),
                    style: const TextStyle(fontSize: 14),
                  )
                : null,
          ),
          const SizedBox(width: 12),
          // Message content
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      user?.bestName ?? message.username ?? message.user,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      timeFormat.format(message.timestamp),
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurface.withOpacity(0.5),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(message.text),
                // Reactions
                if (message.reactions?.isNotEmpty ?? false) ...[
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 4,
                    runSpacing: 4,
                    children: message.reactions!.map((reaction) {
                      return Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.surfaceContainerHighest,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          ':${reaction.name}: ${reaction.count}',
                          style: theme.textTheme.bodySmall,
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ],
            ),
          ),
          // Actions
          PopupMenuButton<String>(
            icon: Icon(
              Icons.more_horiz,
              size: 18,
              color: theme.colorScheme.onSurface.withOpacity(0.5),
            ),
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'react',
                child: Row(
                  children: [
                    Icon(Icons.emoji_emotions_outlined, size: 18),
                    SizedBox(width: 8),
                    Text('Add reaction'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'reply',
                child: Row(
                  children: [
                    Icon(Icons.reply, size: 18),
                    SizedBox(width: 8),
                    Text('Reply in thread'),
                  ],
                ),
              ),
            ],
            onSelected: (value) {
              if (value == 'react') {
                _showReactionPicker(message);
              }
            },
          ),
        ],
      ),
    );
  }

  Widget _buildMessageInput() {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        border: Border(
          top: BorderSide(color: theme.dividerColor),
        ),
      ),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.add_circle_outline),
            onPressed: () {
              // TODO: Add attachments
            },
          ),
          Expanded(
            child: TextField(
              controller: _messageController,
              decoration: InputDecoration(
                hintText: 'Message #${_selectedChannel?.name ?? ''}',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
              ),
              maxLines: null,
              textInputAction: TextInputAction.send,
              onSubmitted: (_) => _sendMessage(),
            ),
          ),
          const SizedBox(width: 8),
          IconButton(
            icon: _isSending
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.send),
            onPressed: _isSending ? null : _sendMessage,
          ),
        ],
      ),
    );
  }

  void _showSearchDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Search Slack'),
        content: TextField(
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'Search messages...',
            prefixIcon: Icon(Icons.search),
          ),
          onSubmitted: (query) async {
            Navigator.of(context).pop();
            if (query.trim().isEmpty) return;

            try {
              final results = await _slackService.search(query: query);
              if (mounted) {
                // Show results
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      'Found ${(results['messages'] as Map?)?['total'] ?? 0} messages',
                    ),
                  ),
                );
              }
            } catch (e) {
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Search failed: $e')),
                );
              }
            }
          },
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
        ],
      ),
    );
  }

  void _showReactionPicker(SlackMessage message) {
    final emojis = [
      'thumbsup',
      'thumbsdown',
      'heart',
      'joy',
      'fire',
      'eyes',
      'rocket',
      'tada',
    ];

    showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Wrap(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                'Add Reaction',
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Wrap(
                spacing: 16,
                runSpacing: 16,
                children: emojis.map((emoji) {
                  return InkWell(
                    onTap: () {
                      Navigator.of(context).pop();
                      _addReaction(message, emoji);
                    },
                    borderRadius: BorderRadius.circular(8),
                    child: Padding(
                      padding: const EdgeInsets.all(8),
                      child: Text(
                        ':$emoji:',
                        style: const TextStyle(fontSize: 24),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Slack logo widget
class _SlackLogo extends StatelessWidget {
  final double size;

  const _SlackLogo({this.size = 24});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _SlackLogoPainter(),
      ),
    );
  }
}

class _SlackLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..style = PaintingStyle.fill;
    final unit = size.width / 5;

    // Colors
    const blue = Color(0xFF36C5F0);
    const green = Color(0xFF2EB67D);
    const yellow = Color(0xFFECB22E);
    const red = Color(0xFFE01E5A);

    // Top left (blue)
    paint.color = blue;
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(0, unit, unit, unit * 2),
        Radius.circular(unit / 2),
      ),
      paint,
    );
    canvas.drawCircle(Offset(unit / 2, unit / 2), unit / 2, paint);

    // Top right (green)
    paint.color = green;
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(unit * 2, 0, unit * 2, unit),
        Radius.circular(unit / 2),
      ),
      paint,
    );
    canvas.drawCircle(Offset(size.width - unit / 2, unit * 1.5), unit / 2, paint);

    // Bottom left (yellow)
    paint.color = yellow;
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(unit, size.height - unit * 3, unit, unit * 2),
        Radius.circular(unit / 2),
      ),
      paint,
    );
    canvas.drawCircle(Offset(unit / 2, size.height - unit * 1.5), unit / 2, paint);

    // Bottom right (red)
    paint.color = red;
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(unit * 2, size.height - unit, unit * 2, unit),
        Radius.circular(unit / 2),
      ),
      paint,
    );
    canvas.drawCircle(Offset(size.width - unit / 2, size.height - unit / 2), unit / 2, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
