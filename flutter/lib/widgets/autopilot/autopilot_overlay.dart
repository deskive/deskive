import 'package:flutter/material.dart';
import 'dart:math' as math;
import '../../screens/autopilot_screen.dart';
import '../../services/autopilot_service.dart';

/// AutoPilot floating action button that opens the chat panel
class AutoPilotButton extends StatefulWidget {
  final String workspaceId;
  final VoidCallback? onOpen;
  final String? module;

  const AutoPilotButton({
    super.key,
    required this.workspaceId,
    this.onOpen,
    this.module,
  });

  @override
  State<AutoPilotButton> createState() => _AutoPilotButtonState();
}

class _AutoPilotButtonState extends State<AutoPilotButton>
    with TickerProviderStateMixin {
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;
  late AnimationController _rotationController;
  late Animation<double> _rotationAnimation;

  @override
  void initState() {
    super.initState();

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 0.95, end: 1.05).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _rotationController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat();

    _rotationAnimation = Tween<double>(begin: 0, end: 2 * math.pi).animate(
      CurvedAnimation(parent: _rotationController, curve: Curves.linear),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _rotationController.dispose();
    super.dispose();
  }

  void _openAutoPilot() {
    widget.onOpen?.call();
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => AutoPilotScreen(initialModule: widget.module),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: Listenable.merge([_pulseAnimation, _rotationAnimation]),
      builder: (context, child) {
        return Transform.scale(
          scale: _pulseAnimation.value,
          child: GestureDetector(
            onTap: _openAutoPilot,
            child: Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: SweepGradient(
                  center: Alignment.center,
                  startAngle: 0,
                  endAngle: math.pi * 2,
                  transform: GradientRotation(_rotationAnimation.value),
                  colors: [
                    Colors.teal.shade400,
                    Colors.cyan.shade400,
                    Colors.green.shade400,
                    Colors.teal.shade500,
                    Colors.teal.shade400,
                  ],
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.teal.withValues(alpha: 0.4),
                    blurRadius: 12,
                    spreadRadius: 2,
                  ),
                ],
              ),
              padding: const EdgeInsets.all(3),
              child: Container(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(
                    colors: [
                      Colors.teal.shade700,
                      Colors.teal.shade600,
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: const Icon(
                  Icons.auto_fix_high,
                  color: Colors.white,
                  size: 28,
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

/// AutoPilot chat panel
class AutoPilotPanel extends StatefulWidget {
  final String workspaceId;

  const AutoPilotPanel({
    super.key,
    required this.workspaceId,
  });

  @override
  State<AutoPilotPanel> createState() => _AutoPilotPanelState();
}

class _AutoPilotPanelState extends State<AutoPilotPanel> {
  final AutoPilotService _autoPilotService = AutoPilotService();
  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final FocusNode _focusNode = FocusNode();

  bool _isLoading = false;
  bool _isInitialized = false;
  // ignore: unused_field
  List<AutoPilotCapability> _capabilities = [];

  @override
  void initState() {
    super.initState();
    _initialize();
  }

  Future<void> _initialize() async {
    await _autoPilotService.initialize();
    await _autoPilotService.createSession(widget.workspaceId);

    try {
      final capabilities = await _autoPilotService.getCapabilities();
      if (mounted) {
        setState(() {
          _capabilities = capabilities;
          _isInitialized = true;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isInitialized = true);
      }
    }
  }

  @override
  void dispose() {
    _textController.dispose();
    _scrollController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      Future.delayed(const Duration(milliseconds: 100), () {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      });
    }
  }

  Future<void> _sendCommand(String command) async {
    if (command.trim().isEmpty) return;

    _textController.clear();
    setState(() => _isLoading = true);
    _scrollToBottom();

    try {
      await _autoPilotService.executeCommand(
        command: command,
        workspaceId: widget.workspaceId,
      );
      _scrollToBottom();
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomPadding = MediaQuery.of(context).viewInsets.bottom;
    final screenHeight = MediaQuery.of(context).size.height;

    return Container(
      height: screenHeight * 0.85,
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          // Handle bar
          Container(
            margin: const EdgeInsets.only(top: 12),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey.shade400,
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          // Header
          _buildHeader(),

          // Divider
          Divider(color: Colors.grey.shade300, height: 1),

          // Chat messages
          Expanded(
            child: _isInitialized
                ? StreamBuilder<List<ConversationMessage>>(
                    stream: _autoPilotService.historyStream,
                    builder: (context, snapshot) {
                      final messages = snapshot.data ?? [];

                      if (messages.isEmpty) {
                        return _buildWelcomeScreen();
                      }

                      return ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.all(16),
                        itemCount: messages.length + (_isLoading ? 1 : 0),
                        itemBuilder: (context, index) {
                          if (_isLoading && index == messages.length) {
                            return _buildTypingIndicator();
                          }
                          return _buildMessageBubble(messages[index]);
                        },
                      );
                    },
                  )
                : const Center(
                    child: CircularProgressIndicator(
                      color: Colors.teal,
                    ),
                  ),
          ),

          // Input area
          _buildInputArea(bottomPadding),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(
                colors: [
                  Colors.teal.shade500,
                  Colors.green.shade500,
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: const Icon(
              Icons.auto_fix_high,
              color: Colors.white,
              size: 22,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'AutoPilot',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  'Your AI assistant for Deskive',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey.shade600,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              _autoPilotService.clearLocalHistory();
              _autoPilotService.createSession(widget.workspaceId);
              setState(() {});
            },
            tooltip: 'New conversation',
          ),
          IconButton(
            icon: const Icon(Icons.close),
            onPressed: () => Navigator.pop(context),
            tooltip: 'Close',
          ),
        ],
      ),
    );
  }

  Widget _buildWelcomeScreen() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 20),
          Center(
            child: Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  colors: [
                    Colors.teal.shade400,
                    Colors.green.shade400,
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.teal.withValues(alpha:0.3),
                    blurRadius: 20,
                    spreadRadius: 5,
                  ),
                ],
              ),
              child: const Icon(
                Icons.auto_fix_high,
                color: Colors.white,
                size: 40,
              ),
            ),
          ),
          const SizedBox(height: 24),
          const Center(
            child: Text(
              'Welcome to AutoPilot',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          const SizedBox(height: 8),
          Center(
            child: Text(
              'I can help you automate tasks across Deskive.\nJust tell me what you need!',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey.shade600,
              ),
            ),
          ),
          const SizedBox(height: 32),

          // Quick actions
          const Text(
            'Try these examples:',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),

          _buildQuickAction(
            icon: Icons.calendar_today,
            title: 'Schedule a meeting',
            example: 'Schedule a meeting with the team tomorrow at 2pm',
          ),
          _buildQuickAction(
            icon: Icons.task_alt,
            title: 'Create a task',
            example: 'Create a task to review the Q4 report',
          ),
          _buildQuickAction(
            icon: Icons.send,
            title: 'Send a message',
            example: 'Send a message to #general about the project update',
          ),
          _buildQuickAction(
            icon: Icons.search,
            title: 'Search files',
            example: 'Find all PDF files related to contracts',
          ),
          _buildQuickAction(
            icon: Icons.people,
            title: 'Workspace info',
            example: 'Who are the members of this workspace?',
          ),
        ],
      ),
    );
  }

  Widget _buildQuickAction({
    required IconData icon,
    required String title,
    required String example,
  }) {
    return GestureDetector(
      onTap: () => _sendCommand(example),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.grey.shade100,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade200),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: Colors.teal.withValues(alpha:0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                icon,
                color: Colors.teal.shade600,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                    ),
                  ),
                  Text(
                    example,
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade600,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            Icon(
              Icons.arrow_forward_ios,
              size: 14,
              color: Colors.grey.shade400,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMessageBubble(ConversationMessage message) {
    final isUser = message.isUser;

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        mainAxisAlignment:
            isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isUser) ...[
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  colors: [
                    Colors.teal.shade500,
                    Colors.green.shade500,
                  ],
                ),
              ),
              child: const Icon(
                Icons.auto_fix_high,
                color: Colors.white,
                size: 16,
              ),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Column(
              crossAxisAlignment:
                  isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isUser
                        ? Colors.teal.shade600
                        : Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(16).copyWith(
                      bottomRight: isUser ? const Radius.circular(4) : null,
                      bottomLeft: !isUser ? const Radius.circular(4) : null,
                    ),
                  ),
                  child: Text(
                    message.content,
                    style: TextStyle(
                      color: isUser ? Colors.white : Colors.black87,
                      fontSize: 14,
                    ),
                  ),
                ),

                // Show executed actions if any
                if (message.actions != null && message.actions!.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  ...message.actions!.map((action) => _buildActionBadge(action)),
                ],
              ],
            ),
          ),
          if (isUser) ...[
            const SizedBox(width: 8),
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.grey.shade300,
              ),
              child: Icon(
                Icons.person,
                color: Colors.grey.shade600,
                size: 18,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildActionBadge(ExecutedAction action) {
    return Container(
      margin: const EdgeInsets.only(bottom: 4),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: action.success
            ? Colors.green.shade50
            : Colors.red.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: action.success
              ? Colors.green.shade200
              : Colors.red.shade200,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            action.success ? Icons.check_circle : Icons.error,
            size: 14,
            color: action.success ? Colors.green.shade600 : Colors.red.shade600,
          ),
          const SizedBox(width: 6),
          Text(
            action.tool.replaceAll('_', ' '),
            style: TextStyle(
              fontSize: 12,
              color: action.success ? Colors.green.shade700 : Colors.red.shade700,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTypingIndicator() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(
                colors: [
                  Colors.teal.shade500,
                  Colors.green.shade500,
                ],
              ),
            ),
            child: const Icon(
              Icons.auto_fix_high,
              color: Colors.white,
              size: 16,
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              borderRadius: BorderRadius.circular(16).copyWith(
                bottomLeft: const Radius.circular(4),
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _buildDot(0),
                const SizedBox(width: 4),
                _buildDot(1),
                const SizedBox(width: 4),
                _buildDot(2),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDot(int index) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: Duration(milliseconds: 600 + (index * 200)),
      builder: (context, value, child) {
        return Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: Colors.grey.shade400,
          ),
        );
      },
    );
  }

  Widget _buildInputArea(double bottomPadding) {
    return Container(
      padding: EdgeInsets.fromLTRB(16, 12, 16, 12 + bottomPadding),
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha:0.05),
            blurRadius: 10,
            offset: const Offset(0, -5),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _textController,
              focusNode: _focusNode,
              decoration: InputDecoration(
                hintText: 'Ask AutoPilot anything...',
                hintStyle: TextStyle(color: Colors.grey.shade500),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                  borderSide: BorderSide(color: Colors.grey.shade300),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                  borderSide: BorderSide(color: Colors.grey.shade300),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                  borderSide: BorderSide(color: Colors.teal.shade400, width: 2),
                ),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 12,
                ),
                filled: true,
                fillColor: Colors.grey.shade50,
              ),
              textInputAction: TextInputAction.send,
              onSubmitted: _sendCommand,
              enabled: !_isLoading,
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: _isLoading
                ? null
                : () => _sendCommand(_textController.text),
            child: Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  colors: _isLoading
                      ? [Colors.grey.shade400, Colors.grey.shade500]
                      : [Colors.teal.shade500, Colors.green.shade500],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                boxShadow: _isLoading
                    ? null
                    : [
                        BoxShadow(
                          color: Colors.teal.withValues(alpha:0.3),
                          blurRadius: 8,
                          spreadRadius: 1,
                        ),
                      ],
              ),
              child: Icon(
                _isLoading ? Icons.hourglass_empty : Icons.send,
                color: Colors.white,
                size: 22,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
