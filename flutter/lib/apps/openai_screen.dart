import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'models/openai_models.dart';
import 'services/openai_service.dart';

/// OpenAI chat and completion screen
class OpenAIScreen extends StatefulWidget {
  const OpenAIScreen({super.key});

  @override
  State<OpenAIScreen> createState() => _OpenAIScreenState();
}

class _OpenAIScreenState extends State<OpenAIScreen> {
  final OpenAIService _openAIService = OpenAIService.instance;
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  // Chat state
  List<OpenAIChatMessage> _messages = [];
  int _totalTokensUsed = 0;

  // Model state
  List<OpenAIModel> _models = [];
  String _selectedModel = 'gpt-4';

  // Settings
  double _temperature = 0.7;
  int _maxTokens = 1024;
  bool _isChatMode = true;

  // Loading states
  bool _isLoadingModels = true;
  bool _isSending = false;
  bool _isCheckingConnection = true;
  String? _error;

  // Connection state
  OpenAIConnection? _connection;

  @override
  void initState() {
    super.initState();
    _initializeScreen();
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _initializeScreen() async {
    await _checkConnection();
    if (_connection != null) {
      await _loadModels();
    }
  }

  Future<void> _checkConnection() async {
    setState(() {
      _isCheckingConnection = true;
      _error = null;
    });

    try {
      final connection = await _openAIService.getConnection();
      setState(() {
        _connection = connection;
        _isCheckingConnection = false;
        if (connection?.model != null) {
          _selectedModel = connection!.model!;
        }
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isCheckingConnection = false;
      });
    }
  }

  Future<void> _loadModels() async {
    setState(() {
      _isLoadingModels = true;
    });

    try {
      final response = await _openAIService.listModels();
      setState(() {
        _models = response.models;
        _isLoadingModels = false;
        // Set default model if available
        if (_models.isNotEmpty && !_models.any((m) => m.id == _selectedModel)) {
          _selectedModel = _models.first.id;
        }
      });
    } catch (e) {
      setState(() {
        _isLoadingModels = false;
        // Use default models if API fails
        _models = [
          OpenAIModel(id: 'gpt-4', name: 'GPT-4'),
          OpenAIModel(id: 'gpt-4-turbo', name: 'GPT-4 Turbo'),
          OpenAIModel(id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo'),
        ];
      });
    }
  }

  Future<void> _sendMessage() async {
    if (_messageController.text.trim().isEmpty) return;

    final userMessage = _messageController.text.trim();
    _messageController.clear();

    setState(() {
      _isSending = true;
      _error = null;
    });

    try {
      if (_isChatMode) {
        // Add user message to the list
        final userChatMessage = OpenAIChatMessage(
          role: 'user',
          content: userMessage,
        );
        setState(() {
          _messages = [..._messages, userChatMessage];
        });

        // Scroll to bottom
        _scrollToBottom();

        // Send chat request
        final response = await _openAIService.chat(
          messages: _messages,
          model: _selectedModel,
          maxTokens: _maxTokens,
          temperature: _temperature,
        );

        setState(() {
          _messages = [..._messages, response.message];
          if (response.usage != null) {
            _totalTokensUsed += response.usage!.totalTokens;
          }
          _isSending = false;
        });
      } else {
        // Completion mode - add prompt as user message for display
        final userChatMessage = OpenAIChatMessage(
          role: 'user',
          content: userMessage,
        );
        setState(() {
          _messages = [..._messages, userChatMessage];
        });

        // Scroll to bottom
        _scrollToBottom();

        // Send completion request
        final response = await _openAIService.completion(
          prompt: userMessage,
          model: _selectedModel,
          maxTokens: _maxTokens,
          temperature: _temperature,
        );

        // Add completion response as assistant message
        final assistantMessage = OpenAIChatMessage(
          role: 'assistant',
          content: response.text,
        );

        setState(() {
          _messages = [..._messages, assistantMessage];
          if (response.usage != null) {
            _totalTokensUsed += response.usage!.totalTokens;
          }
          _isSending = false;
        });
      }

      // Scroll to bottom after response
      _scrollToBottom();
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isSending = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to send message: $e'),
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
      }
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

  void _clearConversation() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clear Conversation'),
        content:
            const Text('Are you sure you want to clear all messages? This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              setState(() {
                _messages = [];
                _totalTokensUsed = 0;
              });
            },
            child: const Text('Clear'),
          ),
        ],
      ),
    );
  }

  void _showSettingsDialog() {
    double tempTemperature = _temperature;
    int tempMaxTokens = _maxTokens;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Settings'),
          content: SizedBox(
            width: 400,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Temperature slider
                Text(
                  'Temperature: ${tempTemperature.toStringAsFixed(2)}',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 4),
                Text(
                  'Controls randomness. Lower values are more deterministic.',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6),
                      ),
                ),
                Slider(
                  value: tempTemperature,
                  min: 0.0,
                  max: 2.0,
                  divisions: 40,
                  label: tempTemperature.toStringAsFixed(2),
                  onChanged: (value) {
                    setDialogState(() => tempTemperature = value);
                  },
                ),
                const SizedBox(height: 16),
                // Max tokens slider
                Text(
                  'Max Tokens: $tempMaxTokens',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 4),
                Text(
                  'Maximum length of the generated response.',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6),
                      ),
                ),
                Slider(
                  value: tempMaxTokens.toDouble(),
                  min: 100,
                  max: 4096,
                  divisions: 40,
                  label: tempMaxTokens.toString(),
                  onChanged: (value) {
                    setDialogState(() => tempMaxTokens = value.toInt());
                  },
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () {
                setState(() {
                  _temperature = tempTemperature;
                  _maxTokens = tempMaxTokens;
                });
                Navigator.of(context).pop();
              },
              child: const Text('Apply'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            const _OpenAILogo(size: 28),
            const SizedBox(width: 12),
            const Text('OpenAI'),
            if (_totalTokensUsed > 0) ...[
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '$_totalTokensUsed tokens',
                  style: theme.textTheme.bodySmall,
                ),
              ),
            ],
          ],
        ),
        actions: [
          // Mode toggle
          Tooltip(
            message: _isChatMode ? 'Chat Mode' : 'Completion Mode',
            child: IconButton(
              icon: Icon(_isChatMode ? Icons.chat : Icons.text_fields),
              onPressed: () {
                setState(() {
                  _isChatMode = !_isChatMode;
                });
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      'Switched to ${_isChatMode ? 'Chat' : 'Completion'} mode',
                    ),
                    duration: const Duration(seconds: 2),
                  ),
                );
              },
            ),
          ),
          // Settings
          IconButton(
            icon: const Icon(Icons.tune),
            onPressed: _showSettingsDialog,
            tooltip: 'Settings',
          ),
          // Clear conversation
          IconButton(
            icon: const Icon(Icons.delete_outline),
            onPressed: _messages.isEmpty ? null : _clearConversation,
            tooltip: 'Clear Conversation',
          ),
        ],
      ),
      body: _isCheckingConnection
          ? const Center(child: CircularProgressIndicator())
          : _connection == null
              ? _buildNotConnectedView()
              : Column(
                  children: [
                    // Model selector bar
                    _buildModelSelector(),
                    // Error banner
                    if (_error != null) _buildErrorBanner(),
                    // Messages list
                    Expanded(child: _buildMessagesList()),
                    // Input area
                    _buildInputArea(),
                  ],
                ),
    );
  }

  Widget _buildNotConnectedView() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const _OpenAILogo(size: 64),
          const SizedBox(height: 24),
          Text(
            'OpenAI Not Connected',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          Text(
            'Please connect your OpenAI API key in the settings.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6),
                ),
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: _checkConnection,
            icon: const Icon(Icons.refresh),
            label: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Widget _buildModelSelector() {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(color: theme.dividerColor),
        ),
      ),
      child: Row(
        children: [
          Text(
            'Model:',
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(width: 12),
          _isLoadingModels
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : DropdownButton<String>(
                  value: _selectedModel,
                  underline: const SizedBox(),
                  items: _models.map((model) {
                    return DropdownMenuItem(
                      value: model.id,
                      child: Text(model.displayName),
                    );
                  }).toList(),
                  onChanged: (value) {
                    if (value != null) {
                      setState(() => _selectedModel = value);
                    }
                  },
                ),
          const Spacer(),
          // Mode indicator
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: _isChatMode
                  ? theme.colorScheme.primaryContainer
                  : theme.colorScheme.secondaryContainer,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Text(
              _isChatMode ? 'Chat' : 'Completion',
              style: theme.textTheme.bodySmall?.copyWith(
                color: _isChatMode
                    ? theme.colorScheme.onPrimaryContainer
                    : theme.colorScheme.onSecondaryContainer,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorBanner() {
    final theme = Theme.of(context);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      color: theme.colorScheme.errorContainer,
      child: Row(
        children: [
          Icon(
            Icons.error_outline,
            size: 18,
            color: theme.colorScheme.onErrorContainer,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              _error!,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onErrorContainer,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          IconButton(
            icon: Icon(
              Icons.close,
              size: 18,
              color: theme.colorScheme.onErrorContainer,
            ),
            onPressed: () => setState(() => _error = null),
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
          ),
        ],
      ),
    );
  }

  Widget _buildMessagesList() {
    if (_messages.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              _isChatMode ? Icons.chat_bubble_outline : Icons.text_snippet_outlined,
              size: 64,
              color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.3),
            ),
            const SizedBox(height: 16),
            Text(
              _isChatMode
                  ? 'Start a conversation with AI'
                  : 'Enter a prompt to generate text',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6),
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              'Using $_selectedModel',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.4),
                  ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.symmetric(vertical: 16),
      itemCount: _messages.length + (_isSending ? 1 : 0),
      itemBuilder: (context, index) {
        if (index == _messages.length && _isSending) {
          return _buildLoadingMessage();
        }
        return _buildMessageTile(_messages[index]);
      },
    );
  }

  Widget _buildMessageTile(OpenAIChatMessage message) {
    final theme = Theme.of(context);
    final isUser = message.role == 'user';

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Avatar
          CircleAvatar(
            radius: 18,
            backgroundColor:
                isUser ? theme.colorScheme.primary : theme.colorScheme.secondary,
            child: Icon(
              isUser ? Icons.person : Icons.smart_toy,
              size: 20,
              color: isUser
                  ? theme.colorScheme.onPrimary
                  : theme.colorScheme.onSecondary,
            ),
          ),
          const SizedBox(width: 12),
          // Message content
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isUser ? 'You' : 'Assistant',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isUser
                        ? theme.colorScheme.primaryContainer.withValues(alpha: 0.5)
                        : theme.colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: SelectableText(
                    message.content,
                    style: theme.textTheme.bodyMedium,
                  ),
                ),
              ],
            ),
          ),
          // Copy button
          IconButton(
            icon: Icon(
              Icons.copy,
              size: 18,
              color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
            ),
            onPressed: () {
              // Copy to clipboard
              _copyToClipboard(message.content);
            },
            tooltip: 'Copy',
          ),
        ],
      ),
    );
  }

  Widget _buildLoadingMessage() {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 18,
            backgroundColor: theme.colorScheme.secondary,
            child: Icon(
              Icons.smart_toy,
              size: 20,
              color: theme.colorScheme.onSecondary,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Assistant',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: theme.colorScheme.primary,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Thinking...',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInputArea() {
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
          Expanded(
            child: TextField(
              controller: _messageController,
              decoration: InputDecoration(
                hintText: _isChatMode
                    ? 'Type a message...'
                    : 'Enter your prompt...',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                ),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 12,
                ),
              ),
              maxLines: null,
              textInputAction: TextInputAction.send,
              onSubmitted: (_) => _sendMessage(),
              enabled: !_isSending,
            ),
          ),
          const SizedBox(width: 8),
          FloatingActionButton(
            onPressed: _isSending ? null : _sendMessage,
            mini: true,
            child: _isSending
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Icon(Icons.send),
          ),
        ],
      ),
    );
  }

  void _copyToClipboard(String text) {
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Copied to clipboard'),
        duration: Duration(seconds: 2),
      ),
    );
  }
}

/// OpenAI logo widget
class _OpenAILogo extends StatelessWidget {
  final double size;

  const _OpenAILogo({this.size = 24});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _OpenAILogoPainter(),
      ),
    );
  }
}

class _OpenAILogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF10A37F) // OpenAI green
      ..style = PaintingStyle.stroke
      ..strokeWidth = size.width * 0.08
      ..strokeCap = StrokeCap.round;

    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width * 0.35;

    // Draw hexagon-like shape (simplified OpenAI logo)
    final path = Path();
    const sides = 6;
    final angle = math.pi * 2 / sides;

    for (int i = 0; i < sides; i++) {
      final x = center.dx + radius * math.cos(angle * i - math.pi / 2);
      final y = center.dy + radius * math.sin(angle * i - math.pi / 2);
      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    path.close();

    canvas.drawPath(path, paint);

    // Draw inner circle
    paint.style = PaintingStyle.fill;
    canvas.drawCircle(center, radius * 0.3, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
