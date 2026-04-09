import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:easy_localization/easy_localization.dart';
import 'dart:async';
import 'services/webrtc_service.dart';
import 'services/webrtc_config.dart';
import 'package:appatonce/appatonce.dart';

/// WebRTC Video Call Screen using AppAtOnce SDK
/// This screen provides full video calling functionality with AppAtOnce WebRTC
class WebRTCVideoCallScreen extends StatefulWidget {
  final String? sessionId;
  final List<String> participants;
  final String meetingType;
  final bool isIncoming;

  const WebRTCVideoCallScreen({
    super.key,
    this.sessionId,
    this.participants = const [],
    this.meetingType = 'Video Call',
    this.isIncoming = false,
  });

  @override
  State<WebRTCVideoCallScreen> createState() => _WebRTCVideoCallScreenState();
}

class _WebRTCVideoCallScreenState extends State<WebRTCVideoCallScreen>
    with WidgetsBindingObserver {
  late WebRTCService _webrtcService;
  Timer? _callTimer;
  int _callDurationSeconds = 0;
  bool _isConnected = false;
  bool _showParticipants = false;
  bool _showChat = false;
  String _callDuration = '00:00';
  
  // Chat functionality
  final List<ChatMessage> _chatMessages = [];
  final TextEditingController _chatController = TextEditingController();
  final ScrollController _chatScrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _webrtcService = WebRTCService.instance;
    _initializeCall();
    _startCallTimer();
  }

  @override
  void dispose() {
    _chatController.dispose();
    _chatScrollController.dispose();
    _callTimer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  Future<void> _initializeCall() async {
    try {
      if (!_webrtcService.isInitialized) {
        await _webrtcService.initialize(WebRTCConfig.apiKey);
      }

      if (widget.sessionId != null) {
        // Join existing session
        await _webrtcService.joinVideoSession(
          widget.sessionId!,
          userName: 'User', // This should come from user context
        );
      }

      setState(() {
        _isConnected = true;
      });

    } catch (e) {
      _showErrorDialog('Failed to connect to the call: $e');
    }
  }

  void _startCallTimer() {
    _callTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted) {
        setState(() {
          _callDurationSeconds++;
          final minutes = _callDurationSeconds ~/ 60;
          final seconds = _callDurationSeconds % 60;
          _callDuration = '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
        });
      }
    });
  }

  Future<void> _toggleAudio() async {
    try {
      await _webrtcService.toggleAudio();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_webrtcService.isAudioEnabled ? 'Microphone on' : 'Microphone muted'),
          duration: const Duration(seconds: 1),
        ),
      );
    } catch (e) {
      _showErrorDialog('Failed to toggle audio: $e');
    }
  }

  Future<void> _toggleVideo() async {
    try {
      await _webrtcService.toggleVideo();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_webrtcService.isVideoEnabled ? 'Camera on' : 'Camera off'),
          duration: const Duration(seconds: 1),
        ),
      );
    } catch (e) {
      _showErrorDialog('Failed to toggle video: $e');
    }
  }

  Future<void> _toggleScreenShare() async {
    try {
      await _webrtcService.toggleScreenShare();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_webrtcService.isScreenSharing ? 'Screen sharing started' : 'Screen sharing stopped'),
          duration: const Duration(seconds: 1),
        ),
      );
    } catch (e) {
      _showErrorDialog('Failed to toggle screen sharing: $e');
    }
  }

  Future<void> _toggleRecording() async {
    try {
      await _webrtcService.toggleRecording();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_webrtcService.isRecording ? 'Recording started' : 'Recording stopped'),
          duration: const Duration(seconds: 1),
        ),
      );
    } catch (e) {
      _showErrorDialog('Failed to toggle recording: $e');
    }
  }

  Future<void> _endCall() async {
    try {
      await _webrtcService.leaveVideoSession();
      if (mounted) {
        Navigator.pop(context);
      }
    } catch (e) {
      // Still navigate back even if there's an error
      if (mounted) {
        Navigator.pop(context);
      }
    }
  }

  void _sendChatMessage() {
    final message = _chatController.text.trim();
    if (message.isEmpty) return;

    try {
      _webrtcService.sendMessage(message);
      
      setState(() {
        _chatMessages.add(ChatMessage(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          sender: 'videocalls.you'.tr(),
          message: message,
          timestamp: DateTime.now(),
          isMe: true,
        ));
      });
      
      _chatController.clear();
      _scrollChatToBottom();
    } catch (e) {
      _showErrorDialog('Failed to send message: $e');
    }
  }

  void _scrollChatToBottom() {
    Future.delayed(const Duration(milliseconds: 100), () {
      if (_chatScrollController.hasClients) {
        _chatScrollController.animateTo(
          _chatScrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _showErrorDialog(String message) {
    if (!mounted) return;
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Error'),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('videocalls.ok'.tr()),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Stack(
          children: [
            // Main video area
            _buildVideoArea(),
            
            // Top bar with call info
            _buildTopBar(),
            
            // Participants panel (if shown)
            if (_showParticipants) _buildParticipantsPanel(),
            
            // Chat panel (if shown)
            if (_showChat) _buildChatPanel(),
            
            // Bottom control bar
            _buildControlBar(),
          ],
        ),
      ),
    );
  }

  Widget _buildVideoArea() {
    return Container(
      width: double.infinity,
      height: double.infinity,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
        ),
      ),
      child: _isConnected 
          ? _buildVideoGrid()
          : const Center(
              child: CircularProgressIndicator(color: Colors.white),
            ),
    );
  }

  Widget _buildVideoGrid() {
    final participants = _webrtcService.participants;
    final totalParticipants = participants.length + 1; // Include self
    
    if (totalParticipants == 1) {
      // Only self in call
      return _buildSingleVideoView();
    } else if (totalParticipants == 2) {
      // One-on-one call
      return _buildTwoPersonView(participants);
    } else {
      // Multi-person grid
      return _buildMultiPersonGrid(participants);
    }
  }

  Widget _buildSingleVideoView() {
    return Container(
      width: double.infinity,
      height: double.infinity,
      decoration: BoxDecoration(
        color: _webrtcService.isVideoEnabled ? Colors.black : Colors.grey[800],
        borderRadius: BorderRadius.circular(12),
      ),
      child: _webrtcService.isVideoEnabled
          ? _buildVideoFeed('self', true)
          : _buildAvatarView('videocalls.you'.tr(), true),
    );
  }

  Widget _buildTwoPersonView(List<VideoParticipant> participants) {
    return Column(
      children: [
        // Remote participant (main view)
        Expanded(
          flex: 3,
          child: Container(
            margin: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.grey[800],
              borderRadius: BorderRadius.circular(12),
            ),
            child: participants.isNotEmpty
                ? _buildVideoFeed(participants.first.identity, false)
                : _buildAvatarView('videocalls.participant'.tr(), false),
          ),
        ),
        // Self (small view)
        Expanded(
          flex: 1,
          child: Container(
            margin: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: _webrtcService.isVideoEnabled ? Colors.black : Colors.grey[800],
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.white, width: 2),
            ),
            child: _webrtcService.isVideoEnabled
                ? _buildVideoFeed('self', true)
                : _buildAvatarView('videocalls.you'.tr(), true),
          ),
        ),
      ],
    );
  }

  Widget _buildMultiPersonGrid(List<VideoParticipant> participants) {
    final allParticipants = ['self', ...participants.map((p) => p.identity)];
    
    return GridView.builder(
      padding: const EdgeInsets.all(8),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: allParticipants.length > 4 ? 3 : 2,
        childAspectRatio: WebRTCUIConfig.videoGridAspectRatio,
        crossAxisSpacing: WebRTCUIConfig.videoGridSpacing,
        mainAxisSpacing: WebRTCUIConfig.videoGridSpacing,
      ),
      itemCount: allParticipants.length,
      itemBuilder: (context, index) {
        final participantId = allParticipants[index];
        final isSelf = participantId == 'self';
        final participant = isSelf ? null : participants.firstWhere(
          (p) => p.identity == participantId,
          orElse: () => VideoParticipant(identity: participantId, name: 'Unknown'),
        );
        
        return Container(
          decoration: BoxDecoration(
            color: (isSelf && _webrtcService.isVideoEnabled) ? Colors.black : Colors.grey[800],
            borderRadius: BorderRadius.circular(12),
          ),
          child: Stack(
            children: [
              // Video feed or avatar
              if (isSelf && _webrtcService.isVideoEnabled)
                _buildVideoFeed(participantId, isSelf)
              else
                _buildAvatarView(
                  isSelf ? 'videocalls.you'.tr() : (participant?.name ?? participantId),
                  isSelf,
                ),
              
              // Participant name overlay
              Positioned(
                bottom: 8,
                left: 8,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.6),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    isSelf ? 'videocalls.you'.tr() : (participant?.name ?? participantId),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ),
              
              // Media status indicators
              if (isSelf) _buildMediaStatusIndicators(),
            ],
          ),
        );
      },
    );
  }

  Widget _buildVideoFeed(String participantId, bool isSelf) {
    // In a real implementation, this would show the actual video feed
    // For now, we'll show a simulated video with gradient
    return Container(
      width: double.infinity,
      height: double.infinity,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isSelf ? [
            Colors.blue.withOpacity(0.3),
            Colors.purple.withOpacity(0.3),
            Colors.teal.withOpacity(0.3),
          ] : [
            Colors.green.withOpacity(0.3),
            Colors.orange.withOpacity(0.3),
            Colors.pink.withOpacity(0.3),
          ],
        ),
      ),
      child: Center(
        child: Icon(
          Icons.videocam,
          color: Colors.white.withOpacity(0.3),
          size: 40,
        ),
      ),
    );
  }

  Widget _buildAvatarView(String name, bool isSelf) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          width: 60,
          height: 60,
          decoration: BoxDecoration(
            color: isSelf ? const Color(WebRTCUIConfig.primaryColor) : Colors.grey[600],
            borderRadius: BorderRadius.circular(30),
          ),
          child: Center(
            child: Text(
              name.isNotEmpty ? name[0].toUpperCase() : 'U',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          name,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 12,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  Widget _buildMediaStatusIndicators() {
    return Positioned(
      top: 8,
      right: 8,
      child: Column(
        children: [
          if (!_webrtcService.isAudioEnabled)
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: Colors.red.withOpacity(0.8),
                borderRadius: BorderRadius.circular(4),
              ),
              child: const Icon(
                Icons.mic_off,
                color: Colors.white,
                size: 12,
              ),
            ),
          if (_webrtcService.isRecording)
            Container(
              margin: const EdgeInsets.only(top: 4),
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: Colors.red,
                borderRadius: BorderRadius.circular(4),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 4,
                    height: 4,
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 4),
                  const Text(
                    'REC',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 8,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildTopBar() {
    return Positioned(
      top: 16,
      left: 16,
      right: 16,
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _getMeetingTypeLabel(widget.meetingType),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  '$_callDuration • ${'videocalls.participants_count'.tr(args: [(_webrtcService.participants.length + 1).toString()])}',
                  style: const TextStyle(
                    color: Colors.white70,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: () => setState(() => _showParticipants = !_showParticipants),
            icon: const Icon(Icons.people, color: Colors.white),
          ),
          IconButton(
            onPressed: () => setState(() => _showChat = !_showChat),
            icon: Stack(
              children: [
                const Icon(Icons.chat_bubble_outline, color: Colors.white),
                if (_chatMessages.isNotEmpty)
                  Positioned(
                    right: 0,
                    top: 0,
                    child: Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: Colors.red,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildParticipantsPanel() {
    return Positioned(
      top: 80,
      right: 16,
      child: Container(
        width: 250,
        height: 300,
        decoration: BoxDecoration(
          color: Colors.black.withOpacity(0.8),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Text(
                    'videocalls.participants'.tr(),
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    '${_webrtcService.participants.length + 1}',
                    style: const TextStyle(color: Colors.white70),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView.builder(
                itemCount: _webrtcService.participants.length + 1,
                itemBuilder: (context, index) {
                  if (index == 0) {
                    // Self
                    return _buildParticipantTile(
                      name: 'You (Host)',
                      isHost: true,
                      isMuted: !_webrtcService.isAudioEnabled,
                      hasVideo: _webrtcService.isVideoEnabled,
                    );
                  } else {
                    final participant = _webrtcService.participants[index - 1];
                    return _buildParticipantTile(
                      name: participant.name ?? participant.identity,
                      isHost: false,
                      isMuted: false, // TODO: Get actual mute status
                      hasVideo: true, // TODO: Get actual video status
                    );
                  }
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getMeetingTypeLabel(String meetingType) {
    switch (meetingType) {
      case 'Video Call':
        return 'videocalls.video_call'.tr();
      case 'Audio Call':
        return 'videocalls.audio_call'.tr();
      case 'Screen Share':
        return 'videocalls.screen_share'.tr();
      case 'Conference Call':
        return 'videocalls.conference_call'.tr();
      default:
        return meetingType;
    }
  }

  Widget _buildParticipantTile({
    required String name,
    required bool isHost,
    required bool isMuted,
    required bool hasVideo,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: const Color(WebRTCUIConfig.primaryColor),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Center(
              child: Text(
                name.isNotEmpty ? name[0].toUpperCase() : 'U',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                if (isHost)
                  const Text(
                    'Host',
                    style: TextStyle(
                      color: Colors.blue,
                      fontSize: 12,
                    ),
                  ),
              ],
            ),
          ),
          if (isMuted)
            const Icon(
              Icons.mic_off,
              color: Colors.red,
              size: 16,
            ),
          if (!hasVideo)
            const Icon(
              Icons.videocam_off,
              color: Colors.red,
              size: 16,
            ),
        ],
      ),
    );
  }

  Widget _buildChatPanel() {
    return Positioned(
      bottom: 120,
      right: 16,
      child: Container(
        width: 300,
        height: 400,
        decoration: BoxDecoration(
          color: Colors.black.withOpacity(0.8),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            // Chat header
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  const Text(
                    'Chat',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    onPressed: () => setState(() => _showChat = false),
                    icon: const Icon(Icons.close, color: Colors.white, size: 20),
                  ),
                ],
              ),
            ),
            
            // Chat messages
            Expanded(
              child: ListView.builder(
                controller: _chatScrollController,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: _chatMessages.length,
                itemBuilder: (context, index) {
                  final message = _chatMessages[index];
                  return _buildChatMessage(message);
                },
              ),
            ),
            
            // Chat input
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _chatController,
                      style: const TextStyle(color: Colors.white),
                      decoration: InputDecoration(
                        hintText: 'videocalls.type_a_message'.tr(),
                        hintStyle: TextStyle(color: Colors.white.withOpacity(0.5)),
                        filled: true,
                        fillColor: Colors.white.withOpacity(0.1),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide: BorderSide.none,
                        ),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      ),
                      onSubmitted: (_) => _sendChatMessage(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    onPressed: _sendChatMessage,
                    icon: const Icon(Icons.send, color: Colors.white),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildChatMessage(ChatMessage message) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Align(
        alignment: message.isMe ? Alignment.centerRight : Alignment.centerLeft,
        child: Container(
          constraints: const BoxConstraints(maxWidth: 200),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: message.isMe
                ? const Color(WebRTCUIConfig.primaryColor)
                : Colors.white.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              if (!message.isMe)
                Text(
                  message.sender,
                  style: const TextStyle(
                    color: Colors.white70,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              Text(
                message.message,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildControlBar() {
    return Positioned(
      bottom: 40,
      left: 16,
      right: 16,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          // Mute/Unmute
          _buildControlButton(
            icon: _webrtcService.isAudioEnabled ? Icons.mic : Icons.mic_off,
            onPressed: _toggleAudio,
            isActive: _webrtcService.isAudioEnabled,
            backgroundColor: _webrtcService.isAudioEnabled ? null : Colors.red,
          ),
          
          // Video On/Off
          _buildControlButton(
            icon: _webrtcService.isVideoEnabled ? Icons.videocam : Icons.videocam_off,
            onPressed: _toggleVideo,
            isActive: _webrtcService.isVideoEnabled,
            backgroundColor: _webrtcService.isVideoEnabled ? null : Colors.red,
          ),

          // // Screen Share
          // if (WebRTCFeatures.enableScreenShare)
          //   _buildControlButton(
          //     icon: _webrtcService.isScreenSharing ? Icons.stop_screen_share : Icons.screen_share,
          //     onPressed: _toggleScreenShare,
          //     isActive: true,
          //     backgroundColor: _webrtcService.isScreenSharing ? Colors.green : null,
          //   ),

          // // Recording
          // if (WebRTCFeatures.enableRecording)
          //   _buildControlButton(
          //     icon: _webrtcService.isRecording ? Icons.stop : Icons.fiber_manual_record,
          //     onPressed: _toggleRecording,
          //     isActive: true,
          //     backgroundColor: _webrtcService.isRecording ? Colors.red : null,
          //   ),

          // End Call
          _buildControlButton(
            icon: Icons.call_end,
            onPressed: _endCall,
            isActive: false,
            backgroundColor: Colors.red,
          ),
        ],
      ),
    );
  }

  Widget _buildControlButton({
    required IconData icon,
    required VoidCallback onPressed,
    required bool isActive,
    Color? backgroundColor,
  }) {
    return GestureDetector(
      onTap: onPressed,
      child: Container(
        width: WebRTCUIConfig.controlButtonSize,
        height: WebRTCUIConfig.controlButtonSize,
        decoration: BoxDecoration(
          color: backgroundColor ?? 
              (isActive ? Colors.white.withOpacity(0.2) : Colors.grey.withOpacity(0.3)),
          borderRadius: BorderRadius.circular(WebRTCUIConfig.controlButtonSize / 2),
        ),
        child: Icon(
          icon,
          color: Colors.white,
          size: 28,
        ),
      ),
    );
  }
}

/// Chat message model
class ChatMessage {
  final String id;
  final String sender;
  final String message;
  final DateTime timestamp;
  final bool isMe;

  ChatMessage({
    required this.id,
    required this.sender,
    required this.message,
    required this.timestamp,
    required this.isMe,
  });
}