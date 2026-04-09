import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'models/telegram_models.dart';
import 'services/telegram_service.dart';

/// Telegram messaging screen with chats and messages
class TelegramScreen extends StatefulWidget {
  const TelegramScreen({super.key});

  @override
  State<TelegramScreen> createState() => _TelegramScreenState();
}

class _TelegramScreenState extends State<TelegramScreen> {
  final TelegramService _telegramService = TelegramService.instance;
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  List<TelegramChat> _chats = [];
  List<TelegramMessage> _messages = [];
  TelegramChat? _selectedChat;
  TelegramBotInfo? _botInfo;

  bool _isLoadingChats = true;
  bool _isLoadingMessages = false;
  bool _isLoadingBotInfo = true;
  bool _isSending = false;
  bool _isRefreshing = false;
  String? _error;

  // Parse mode for message formatting
  String _parseMode = 'HTML'; // 'HTML' or 'Markdown'

  // Track last update ID for polling
  int? _lastUpdateId;

  @override
  void initState() {
    super.initState();
    _loadBotInfo();
    _loadChats();
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadBotInfo() async {
    setState(() {
      _isLoadingBotInfo = true;
    });

    try {
      final botInfo = await _telegramService.getMe();
      setState(() {
        _botInfo = botInfo;
        _isLoadingBotInfo = false;
      });
    } catch (e) {
      setState(() {
        _isLoadingBotInfo = false;
      });
      // Bot info loading error is not critical
    }
  }

  Future<void> _loadChats() async {
    setState(() {
      _isLoadingChats = true;
      _error = null;
    });

    try {
      final response = await _telegramService.listChats();
      setState(() {
        _chats = response.chats;
        _isLoadingChats = false;
      });

      // Auto-select first chat if available
      if (_chats.isNotEmpty && _selectedChat == null) {
        _selectChat(_chats.first);
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoadingChats = false;
      });
    }
  }

  Future<void> _selectChat(TelegramChat chat) async {
    setState(() {
      _selectedChat = chat;
      _messages = [];
      _isLoadingMessages = true;
    });

    try {
      // Get updates to fetch messages for this chat
      await _refreshUpdates();
      setState(() {
        _isLoadingMessages = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoadingMessages = false;
      });
    }
  }

  Future<void> _refreshUpdates() async {
    setState(() {
      _isRefreshing = true;
    });

    try {
      final response = await _telegramService.getUpdates(
        offset: _lastUpdateId != null ? _lastUpdateId! + 1 : null,
        limit: 100,
      );

      if (response.updates.isNotEmpty) {
        // Update last update ID
        _lastUpdateId = response.updates.last.updateId;

        // Extract messages from updates
        final newMessages = response.updates
            .where((update) => update.message != null)
            .map((update) => update.message!)
            .toList();

        setState(() {
          // Add new messages, filter by selected chat if one is selected
          if (_selectedChat != null) {
            final chatMessages = newMessages
                .where((msg) => msg.chatId == _selectedChat!.id)
                .toList();
            _messages = [..._messages, ...chatMessages];
          } else {
            _messages = [..._messages, ...newMessages];
          }
        });

        // Scroll to bottom after new messages
        _scrollToBottom();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to refresh updates: $e')),
        );
      }
    } finally {
      setState(() {
        _isRefreshing = false;
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

  Future<void> _sendMessage() async {
    if (_messageController.text.trim().isEmpty || _selectedChat == null) {
      return;
    }

    setState(() => _isSending = true);

    try {
      await _telegramService.sendMessage(
        chatId: _selectedChat!.id,
        text: _messageController.text.trim(),
        parseMode: _parseMode,
      );

      _messageController.clear();
      // Refresh to get the sent message
      await _refreshUpdates();
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

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            const _TelegramLogo(size: 28),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    _selectedChat?.displayName ?? 'Telegram',
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (_botInfo != null)
                    Text(
                      '@${_botInfo!.username ?? _botInfo!.firstName}',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurface.withOpacity(0.6),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          // Refresh button
          IconButton(
            icon: _isRefreshing
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.refresh),
            onPressed: _isRefreshing ? null : _refreshUpdates,
            tooltip: 'Refresh Updates',
          ),
          // Parse mode toggle
          PopupMenuButton<String>(
            icon: const Icon(Icons.text_format),
            tooltip: 'Message Format',
            onSelected: (value) {
              setState(() {
                _parseMode = value;
              });
            },
            itemBuilder: (context) => [
              PopupMenuItem(
                value: 'HTML',
                child: Row(
                  children: [
                    if (_parseMode == 'HTML')
                      const Icon(Icons.check, size: 18)
                    else
                      const SizedBox(width: 18),
                    const SizedBox(width: 8),
                    const Text('HTML'),
                  ],
                ),
              ),
              PopupMenuItem(
                value: 'Markdown',
                child: Row(
                  children: [
                    if (_parseMode == 'Markdown')
                      const Icon(Icons.check, size: 18)
                    else
                      const SizedBox(width: 18),
                    const SizedBox(width: 8),
                    const Text('Markdown'),
                  ],
                ),
              ),
            ],
          ),
          // Bot info button
          IconButton(
            icon: const Icon(Icons.smart_toy),
            onPressed: _botInfo != null ? () => _showBotInfoDialog() : null,
            tooltip: 'Bot Info',
          ),
        ],
      ),
      body: Row(
        children: [
          // Chats sidebar
          Container(
            width: 280,
            decoration: BoxDecoration(
              border: Border(
                right: BorderSide(
                  color: theme.dividerColor,
                ),
              ),
            ),
            child: Column(
              children: [
                // Bot info header
                _buildBotInfoHeader(),
                const Divider(height: 1),
                // Chats header
                Container(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Text(
                        'Chats',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const Spacer(),
                      if (_isLoadingChats)
                        const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                    ],
                  ),
                ),
                const Divider(height: 1),
                // Chats list
                Expanded(
                  child: _buildChatsList(),
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
                if (_selectedChat != null) _buildMessageInput(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBotInfoHeader() {
    final theme = Theme.of(context);

    if (_isLoadingBotInfo) {
      return Container(
        padding: const EdgeInsets.all(16),
        child: const Center(
          child: SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
        ),
      );
    }

    if (_botInfo == null) {
      return Container(
        padding: const EdgeInsets.all(16),
        child: Text(
          'Bot not connected',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.colorScheme.error,
          ),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          CircleAvatar(
            radius: 20,
            backgroundColor: theme.colorScheme.primaryContainer,
            child: const Icon(Icons.smart_toy, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _botInfo!.firstName,
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
                if (_botInfo!.username != null)
                  Text(
                    '@${_botInfo!.username}',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurface.withOpacity(0.6),
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.green.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              'Online',
              style: theme.textTheme.bodySmall?.copyWith(
                color: Colors.green,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChatsList() {
    if (_isLoadingChats && _chats.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null && _chats.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.error_outline,
                size: 48,
                color: Theme.of(context).colorScheme.error,
              ),
              const SizedBox(height: 16),
              Text(
                'Error loading chats',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              Text(
                _error!,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _loadChats,
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    if (_chats.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.chat_bubble_outline,
                size: 48,
                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.4),
              ),
              const SizedBox(height: 16),
              Text(
                'No chats yet',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              Text(
                'Start a conversation with your bot to see chats here',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withOpacity(0.6),
                    ),
              ),
            ],
          ),
        ),
      );
    }

    // Group chats by type
    final privateChats =
        _chats.where((c) => c.type == 'private').toList();
    final groupChats =
        _chats.where((c) => c.type == 'group' || c.type == 'supergroup').toList();
    final channels = _chats.where((c) => c.type == 'channel').toList();

    return ListView(
      children: [
        if (privateChats.isNotEmpty) ...[
          _buildChatSection('Private Chats', privateChats, Icons.person),
        ],
        if (groupChats.isNotEmpty) ...[
          _buildChatSection('Groups', groupChats, Icons.group),
        ],
        if (channels.isNotEmpty) ...[
          _buildChatSection('Channels', channels, Icons.campaign),
        ],
      ],
    );
  }

  Widget _buildChatSection(
      String title, List<TelegramChat> chats, IconData icon) {
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
        ...chats.map((chat) => _buildChatTile(chat, icon)),
      ],
    );
  }

  Widget _buildChatTile(TelegramChat chat, IconData icon) {
    final theme = Theme.of(context);
    final isSelected = _selectedChat?.id == chat.id;

    return ListTile(
      dense: true,
      selected: isSelected,
      selectedTileColor: theme.colorScheme.primaryContainer.withOpacity(0.3),
      leading: CircleAvatar(
        radius: 18,
        backgroundColor: isSelected
            ? theme.colorScheme.primary.withOpacity(0.2)
            : theme.colorScheme.surfaceContainerHighest,
        child: Icon(
          icon,
          size: 18,
          color: isSelected
              ? theme.colorScheme.primary
              : theme.colorScheme.onSurface.withOpacity(0.6),
        ),
      ),
      title: Text(
        chat.displayName,
        style: TextStyle(
          fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
        ),
        overflow: TextOverflow.ellipsis,
      ),
      subtitle: chat.username != null
          ? Text(
              '@${chat.username}',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurface.withOpacity(0.5),
              ),
              overflow: TextOverflow.ellipsis,
            )
          : null,
      onTap: () => _selectChat(chat),
    );
  }

  Widget _buildMessagesList() {
    if (_selectedChat == null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const _TelegramLogo(size: 64),
            const SizedBox(height: 16),
            Text(
              'Select a chat to view messages',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: Theme.of(context)
                        .colorScheme
                        .onSurface
                        .withOpacity(0.6),
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
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.chat_bubble_outline,
              size: 48,
              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.4),
            ),
            const SizedBox(height: 16),
            Text(
              'No messages yet',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: Theme.of(context)
                        .colorScheme
                        .onSurface
                        .withOpacity(0.6),
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              'Click refresh to get new messages',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context)
                        .colorScheme
                        .onSurface
                        .withOpacity(0.5),
                  ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.symmetric(vertical: 16),
      itemCount: _messages.length,
      itemBuilder: (context, index) {
        final message = _messages[index];
        return _buildMessageTile(message);
      },
    );
  }

  Widget _buildMessageTile(TelegramMessage message) {
    final theme = Theme.of(context);
    final timeFormat = DateFormat.jm();
    final dateFormat = DateFormat.MMMd();
    final isFromBot = message.from?.isBot ?? false;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Avatar
          CircleAvatar(
            radius: 18,
            backgroundColor: isFromBot
                ? theme.colorScheme.primaryContainer
                : theme.colorScheme.secondaryContainer,
            child: Icon(
              isFromBot ? Icons.smart_toy : Icons.person,
              size: 18,
              color: isFromBot
                  ? theme.colorScheme.onPrimaryContainer
                  : theme.colorScheme.onSecondaryContainer,
            ),
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
                      message.from?.fullName ?? 'Unknown',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    if (isFromBot)
                      Container(
                        margin: const EdgeInsets.only(left: 6),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primary.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          'BOT',
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: theme.colorScheme.primary,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    const SizedBox(width: 8),
                    Text(
                      '${dateFormat.format(message.timestamp)} at ${timeFormat.format(message.timestamp)}',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurface.withOpacity(0.5),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isFromBot
                        ? theme.colorScheme.primaryContainer.withOpacity(0.3)
                        : theme.colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    message.text ?? '[No text content]',
                    style: theme.textTheme.bodyMedium,
                  ),
                ),
              ],
            ),
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Parse mode indicator
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              children: [
                Icon(
                  Icons.code,
                  size: 14,
                  color: theme.colorScheme.onSurface.withOpacity(0.5),
                ),
                const SizedBox(width: 4),
                Text(
                  'Format: $_parseMode',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurface.withOpacity(0.5),
                  ),
                ),
              ],
            ),
          ),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _messageController,
                  decoration: InputDecoration(
                    hintText: 'Message ${_selectedChat?.displayName ?? ''}...',
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
                tooltip: 'Send Message',
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _showBotInfoDialog() {
    if (_botInfo == null) return;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            const _TelegramLogo(size: 24),
            const SizedBox(width: 12),
            const Text('Bot Information'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildInfoRow('Name', _botInfo!.firstName),
            if (_botInfo!.username != null)
              _buildInfoRow('Username', '@${_botInfo!.username}'),
            _buildInfoRow('ID', _botInfo!.id.toString()),
            _buildInfoRow('Is Bot', _botInfo!.isBot ? 'Yes' : 'No'),
            if (_botInfo!.canJoinGroups != null)
              _buildInfoRow(
                'Can Join Groups',
                _botInfo!.canJoinGroups! ? 'Yes' : 'No',
              ),
            if (_botInfo!.canReadAllGroupMessages != null)
              _buildInfoRow(
                'Can Read Group Messages',
                _botInfo!.canReadAllGroupMessages! ? 'Yes' : 'No',
              ),
            if (_botInfo!.supportsInlineQueries != null)
              _buildInfoRow(
                'Supports Inline Queries',
                _botInfo!.supportsInlineQueries! ? 'Yes' : 'No',
              ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 150,
            child: Text(
              label,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurface.withOpacity(0.6),
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: theme.textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Telegram logo widget
class _TelegramLogo extends StatelessWidget {
  final double size;

  const _TelegramLogo({this.size = 24});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _TelegramLogoPainter(),
      ),
    );
  }
}

class _TelegramLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..style = PaintingStyle.fill;

    // Telegram blue color
    const telegramBlue = Color(0xFF0088CC);

    // Draw circle background
    paint.color = telegramBlue;
    canvas.drawCircle(
      Offset(size.width / 2, size.height / 2),
      size.width / 2,
      paint,
    );

    // Draw paper plane icon
    paint.color = Colors.white;
    final path = Path();

    // Scale factor
    final scale = size.width / 24;

    // Paper plane shape (simplified)
    path.moveTo(5 * scale, 12 * scale);
    path.lineTo(19 * scale, 5 * scale);
    path.lineTo(14 * scale, 19 * scale);
    path.lineTo(12 * scale, 14 * scale);
    path.close();

    // Fold line
    path.moveTo(12 * scale, 14 * scale);
    path.lineTo(19 * scale, 5 * scale);
    path.lineTo(9 * scale, 11 * scale);

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
