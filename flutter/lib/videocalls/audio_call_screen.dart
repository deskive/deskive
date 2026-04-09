import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:livekit_client/livekit_client.dart';
import 'package:uuid/uuid.dart';
import '../utils/permissions_helper.dart';
import 'dart:async';
import 'dart:convert';
import 'dart:io';
import '../api/services/video_call_service.dart';
import '../services/video_call_socket_service.dart';
import '../services/auth_service.dart';
import '../api/base_api_client.dart';
import '../config/api_config.dart';
import '../models/video_call.dart';

/// Audio Call Screen - Microsoft Teams Style with LiveKit Integration
class AudioCallScreen extends StatefulWidget {
  final String? callId;
  final String? channelName;
  final bool isIncoming;
  final String? callerName;
  final String? callerAvatar;
  final List<String> participants;

  const AudioCallScreen({
    super.key,
    this.callId,
    this.channelName,
    this.isIncoming = false,
    this.callerName,
    this.callerAvatar,
    this.participants = const [],
  });

  @override
  State<AudioCallScreen> createState() => _AudioCallScreenState();
}

class _AudioCallScreenState extends State<AudioCallScreen> {
  // LiveKit
  Room? _room;
  LocalParticipant? _localParticipant;
  List<RemoteParticipant> _remoteParticipants = [];

  // Services
  late VideoCallService _apiService;
  late VideoCallSocketService _socketService;

  // State
  bool _isMicEnabled = true;
  bool _isSpeakerOn = true;
  bool _isChatVisible = false;
  bool _isRecording = false;
  bool _showAIPanel = false;
  bool _showMoreMenu = false;

  // Call state
  bool _callActive = false;
  bool _isInitializing = true;
  Duration _callDuration = const Duration();
  Timer? _timer;

  // Call info
  JoinCallResponse? _callResponse;
  CallParticipant? _myParticipant;

  // Chat state
  final TextEditingController _chatController = TextEditingController();
  final List<Map<String, dynamic>> _chatMessages = [];

  // Subscriptions
  StreamSubscription? _participantSubscription;
  StreamSubscription? _mediaSubscription;
  StreamSubscription? _chatSubscription;

  @override
  void initState() {
    super.initState();
    _initializeApp();
  }

  Future<void> _initializeApp() async {
    await _initializeServices();
    await _initializeAudioCall();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _participantSubscription?.cancel();
    _mediaSubscription?.cancel();
    _chatSubscription?.cancel();
    _chatController.dispose();
    _room?.dispose();
    super.dispose();
  }

  Future<void> _initializeServices() async {
    final baseClient = BaseApiClient.instance;
    _apiService = VideoCallService(baseClient);

    // Use the global singleton instance (already connected from main.dart)
    _socketService = VideoCallSocketService.instance;

    // The global instance is already connected, just verify
    if (!_socketService.isConnected) {
      await _socketService.connect();
    } else {
    }

    _listenToWebSocketEvents();
  }

  void _listenToWebSocketEvents() {
    _participantSubscription = _socketService.onParticipantJoined.listen((data) {
    });

    _participantSubscription = _socketService.onParticipantLeft.listen((data) {
    });

    _mediaSubscription = _socketService.onMediaUpdated.listen((data) {
    });

    // Listen for chat messages via WebSocket (for web compatibility)
    _chatSubscription = _socketService.onChatMessage.listen((data) {
      debugPrint('💬 [AudioCallScreen] Received chat message via WebSocket: $data');
      if (mounted) {
        final currentUserId = AuthService.instance.currentUser?.id;
        final senderId = data['senderId']?.toString();
        final messageId = data['id']?.toString();

        debugPrint('💬 [AudioCallScreen] currentUserId: $currentUserId, senderId: $senderId, messageId: $messageId');

        // Skip messages from self (already added optimistically) or duplicates
        if (senderId != null && currentUserId != null && senderId == currentUserId) {
          debugPrint('💬 [AudioCallScreen] Skipping own message from WebSocket (sender matches current user)');
          return;
        }

        // Check for duplicate message ID
        if (messageId != null && _chatMessages.any((m) => m['id'] == messageId)) {
          debugPrint('💬 [AudioCallScreen] Skipping duplicate message: $messageId');
          return;
        }

        debugPrint('💬 [AudioCallScreen] Adding message to chat list');
        setState(() {
          _chatMessages.add({
            'id': messageId ?? 'msg-${DateTime.now().millisecondsSinceEpoch}',
            'content': data['content'] ?? data['message'] ?? '',
            'sender': data['senderName'] ?? 'User',
            'senderId': senderId,
            'timestamp': DateTime.now(),
          });
        });
      }
    });
  }

  Future<void> _initializeAudioCall() async {

    try {
      await _requestPermissions();

      // Call join API (backend will get display name from user profile)
      _callResponse = await _apiService.joinCall(widget.callId!);

      _myParticipant = _callResponse!.participant;

      await _socketService.joinCallRoom(widget.callId!);
      await _connectToLiveKit();

      setState(() {
        _isInitializing = false;
        _callActive = true;
      });

      _startCallTimer();

    } catch (e) {
      _showError('Failed to join call: $e');
      if (mounted) {
        Navigator.pop(context);
      }
    }
  }

  Future<void> _requestPermissions() async {
    // Check if already granted - if so, skip entirely
    final alreadyGranted = await PermissionsHelper.checkPermission(PermissionType.audioCall);
    if (alreadyGranted) {
      debugPrint('✅ Audio call permission already granted');
      return;
    }

    // Only request if not already granted
    final canProceed = await PermissionsHelper.ensurePermission(
      context,
      PermissionType.audioCall,
    );

    if (!canProceed) {
      throw Exception('Microphone permission is required for audio calls');
    }
  }

  Future<void> _connectToLiveKit() async {
    _room = Room();
    _setupRoomListeners();

    await _room!.connect(
      _callResponse!.roomUrl,
      _callResponse!.token,
      roomOptions: const RoomOptions(
        adaptiveStream: true,
        dynacast: true,
      ),
    );

    setState(() {
      _localParticipant = _room!.localParticipant;
    });

    // Enable microphone only (audio call)
    await _localParticipant?.setMicrophoneEnabled(true);
  }

  void _setupRoomListeners() {
    _room!.addListener(() {
      if (mounted) {
        setState(() {
          _remoteParticipants = _room!.remoteParticipants.values.toList();
        });
      }
    });

    // Listen for data messages (chat) from LiveKit
    _room!.createListener().on((event) {
      if (event is DataReceivedEvent) {

        try {
          final data = event.data;
          final participant = event.participant;
          final topic = event.topic;

          // Decode the message
          final message = String.fromCharCodes(data);

          // Parse JSON message
          final messageData = jsonDecode(message);

          setState(() {
            _chatMessages.add({
              'id': messageData['id'] ?? 'msg-${DateTime.now().millisecondsSinceEpoch}',
              'content': messageData['content'] ?? messageData['message'] ?? message,
              'sender': participant?.name ?? participant?.identity ?? 'User',
              'senderId': participant?.identity,
              'timestamp': DateTime.now(),
            });
          });

        } catch (e) {
        }
      }
    });
  }

  void _startCallTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        _callDuration = Duration(seconds: _callDuration.inSeconds + 1);
      });
    });
  }

  String _formatDuration(Duration duration) {
    String twoDigits(int n) => n.toString().padLeft(2, '0');
    String hours = twoDigits(duration.inHours);
    String minutes = twoDigits(duration.inMinutes.remainder(60));
    String seconds = twoDigits(duration.inSeconds.remainder(60));

    if (duration.inHours > 0) {
      return "$hours:$minutes:$seconds";
    }
    return "$minutes:$seconds";
  }

  Future<void> _toggleMic() async {
    setState(() {
      _isMicEnabled = !_isMicEnabled;
    });

    await _localParticipant?.setMicrophoneEnabled(_isMicEnabled);

    if (_myParticipant != null) {
      _socketService.toggleMedia(
        callId: widget.callId!,
        participantId: _myParticipant!.id,
        mediaType: 'audio',
        enabled: _isMicEnabled,
      );
    }
  }

  Future<void> _toggleSpeaker() async {
    setState(() {
      _isSpeakerOn = !_isSpeakerOn;
    });

    try {
      // Use Hardware API to control speakerphone
      await Hardware.instance.setSpeakerphoneOn(_isSpeakerOn);
    } catch (e) {
    }
  }

  void _showError(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _endCall() async {

    _timer?.cancel();
    await _room?.disconnect();
    await _room?.dispose();

    if (widget.callId != null) {
      await _socketService.leaveCallRoom(widget.callId!);
    }

    try {
      if (widget.callId != null) {
        await _apiService.leaveCall(widget.callId!);
      }
    } catch (e) {
    }

    if (mounted) {
      Navigator.of(context).pop('ended');
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isInitializing) {
      return Scaffold(
        backgroundColor: const Color(0xFF1C1C1E),
        body: const Center(
          child: CircularProgressIndicator(color: Colors.white),
        ),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFF1C1C1E),
      body: SafeArea(
        child: Stack(
          children: [
            // Main content
            Column(
              children: [
                // Top header
                _buildTopHeader(),

                // Main audio area with participant avatar
                Expanded(
                  child: _buildMainAudioArea(),
                ),

                // Control buttons grid
                _buildControlsGrid(),

                const SizedBox(height: 16),

                // End call button
                _buildEndCallButton(),

                const SizedBox(height: 24),
              ],
            ),

            // More options menu overlay
            if (_showMoreMenu) _buildMoreOptionsMenu(),

            // Chat overlay (if visible)
            if (_isChatVisible) _buildChatOverlay(),

            // AI Panel overlay (if visible)
            if (_showAIPanel) _buildAIPanelOverlay(),

            // Participants list (top-left corner)
            _buildParticipantsList(),
          ],
        ),
      ),
    );
  }

  /// Top header with back button, name, and call duration
  Widget _buildTopHeader() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          // Back button
          GestureDetector(
            onTap: () => _showLeaveConfirmation(),
            child: Container(
              padding: const EdgeInsets.all(8),
              child: const Icon(
                Icons.arrow_back,
                color: Colors.white,
                size: 24,
              ),
            ),
          ),
          const SizedBox(width: 12),

          // Caller info
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                widget.callerName ?? widget.channelName ?? 'Audio Call',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
              Text(
                _formatDuration(_callDuration),
                style: const TextStyle(
                  color: Color(0xFF8E8E93),
                  fontSize: 13,
                ),
              ),
            ],
          ),

          const Spacer(),

          // Action icons
          IconButton(
            icon: const Icon(Icons.chat_bubble_outline, color: Colors.white),
            onPressed: () {
              setState(() {
                _isChatVisible = !_isChatVisible;
              });
            },
          ),
          IconButton(
            icon: const Icon(Icons.person_add_outlined, color: Colors.white),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('videocalls.invite_participants'.tr()),
                  duration: Duration(seconds: 2),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  /// Main audio area - shows avatar with audio waves animation
  Widget _buildMainAudioArea() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Avatar with gradient ring (audio waves effect)
          Container(
            width: 130,
            height: 130,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(
                colors: [Color(0xFF6264A7), Color(0xFF8B8FD8)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF6264A7).withOpacity(0.3),
                  blurRadius: 20,
                  spreadRadius: 5,
                ),
              ],
            ),
            child: Padding(
              padding: const EdgeInsets.all(4),
              child: Container(
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: Color(0xFF3A3A3C),
                ),
                child: Center(
                  child: widget.callerAvatar != null
                      ? Text(
                          widget.callerAvatar!,
                          style: const TextStyle(fontSize: 60, color: Colors.white),
                        )
                      : const Icon(Icons.person, size: 60, color: Color(0xFF8E8E93)),
                ),
              ),
            ),
          ),
          const SizedBox(height: 20),

          // Caller name
          Text(
            widget.callerName ?? widget.channelName ?? 'Audio Call',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),

          // Connection status
          Text(
            _callActive ? 'Connected' : 'Connecting...',
            style: const TextStyle(
              color: Color(0xFF8E8E93),
              fontSize: 14,
            ),
          ),

          // Participants count
          if (_remoteParticipants.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.people,
                    color: Color(0xFF8E8E93),
                    size: 16,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    '${_remoteParticipants.length + 1} participant${_remoteParticipants.length + 1 > 1 ? 's' : ''}',
                    style: const TextStyle(
                      color: Color(0xFF8E8E93),
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  /// Controls grid (2 rows x 3 columns)
  Widget _buildControlsGrid() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          // First row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _buildGridButton(
                icon: _isMicEnabled ? Icons.mic : Icons.mic_off,
                label: _isMicEnabled ? 'videocalls.mic_on'.tr() : 'videocalls.mic_off'.tr(),
                onTap: _toggleMic,
                isActive: _isMicEnabled,
              ),
              _buildGridButton(
                icon: Icons.dialpad,
                label: 'videocalls.dialpad'.tr(),
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('videocalls.dialpad'.tr()),
                      duration: Duration(seconds: 2),
                    ),
                  );
                },
                isActive: false,
              ),
              _buildGridButton(
                icon: _isSpeakerOn ? Icons.volume_up : Icons.phone_in_talk,
                label: _isSpeakerOn ? 'videocalls.loudspeaker'.tr() : 'videocalls.earpiece'.tr(),
                onTap: _toggleSpeaker,
                isActive: _isSpeakerOn,
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Second row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _buildGridButton(
                icon: Icons.phone_forwarded,
                label: 'videocalls.transfer'.tr(),
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('videocalls.transfer_call'.tr()),
                      duration: Duration(seconds: 2),
                    ),
                  );
                },
                isActive: false,
              ),
              _buildGridButton(
                icon: Icons.more_horiz,
                label: 'videocalls.more'.tr(),
                onTap: () {
                  setState(() {
                    _showMoreMenu = !_showMoreMenu;
                  });
                },
                isActive: false,
                showBorder: true,
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// Grid button (Teams style)
  Widget _buildGridButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    required bool isActive,
    bool showBorder = false,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 100,
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: const Color(0xFF2C2C2E),
          borderRadius: BorderRadius.circular(8),
          border: showBorder
              ? Border.all(color: const Color(0xFF8E8E93), width: 1.5)
              : null,
        ),
        child: Column(
          children: [
            Icon(
              icon,
              color: isActive ? Colors.white : const Color(0xFF8E8E93),
              size: 28,
            ),
            const SizedBox(height: 8),
            Text(
              label,
              style: TextStyle(
                color: isActive ? Colors.white : const Color(0xFF8E8E93),
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// End call button
  Widget _buildEndCallButton() {
    return GestureDetector(
      onTap: () => _showLeaveConfirmation(),
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 24),
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: const Color(0xFFC4314B),
          borderRadius: BorderRadius.circular(8),
        ),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.call_end, color: Colors.white, size: 24),
            SizedBox(width: 12),
            Text(
              'End call',
              style: TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// More options menu (bottom sheet style)
  Widget _buildMoreOptionsMenu() {
    return GestureDetector(
      onTap: () => setState(() => _showMoreMenu = false),
      child: Container(
        color: Colors.black.withOpacity(0.5),
        child: Column(
          children: [
            const Spacer(),
            GestureDetector(
              onTap: () {},
              child: Container(
                decoration: const BoxDecoration(
                  color: Color(0xFF2C2C2E),
                  borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(20),
                    topRight: Radius.circular(20),
                  ),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      margin: const EdgeInsets.only(top: 12, bottom: 8),
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: const Color(0xFF5A5A5A),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'videocalls.more_options'.tr(),
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close, color: Colors.white),
                            onPressed: () => setState(() => _showMoreMenu = false),
                          ),
                        ],
                      ),
                    ),
                    _buildMoreMenuItem(
                      icon: _isRecording ? Icons.stop_circle : Icons.fiber_manual_record,
                      title: _isRecording ? 'Stop Recording' : 'Start Recording',
                      subtitle: _isRecording ? 'Recording in progress' : 'Record this call',
                      onTap: () {
                        setState(() {
                          _isRecording = !_isRecording;
                          _showMoreMenu = false;
                        });
                      },
                      iconColor: _isRecording ? Colors.red : const Color(0xFF8E8E93),
                    ),
                    _buildMoreMenuItem(
                      icon: Icons.auto_awesome,
                      title: 'videocalls.ai_features'.tr(),
                      subtitle: 'videocalls.ai_features_subtitle'.tr(),
                      onTap: () {
                        setState(() {
                          _showAIPanel = true;
                          _showMoreMenu = false;
                        });
                      },
                      iconColor: const Color(0xFF6264A7),
                    ),
                    _buildMoreMenuItem(
                      icon: Icons.settings,
                      title: 'videocalls.settings'.tr(),
                      subtitle: 'videocalls.audio_settings'.tr(),
                      onTap: () {
                        setState(() {
                          _showMoreMenu = false;
                        });
                      },
                      iconColor: const Color(0xFF8E8E93),
                    ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMoreMenuItem({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    required Color iconColor,
  }) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF3A3A3C),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: iconColor, size: 24),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      color: Color(0xFF8E8E93),
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: Color(0xFF8E8E93)),
          ],
        ),
      ),
    );
  }

  Widget _buildChatOverlay() {
    return Positioned(
      right: 0,
      top: 0,
      bottom: 0,
      child: Container(
        width: 320,
        color: const Color(0xFF2C2C2E),
        child: Column(
          children: [
            // Chat header
            Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                border: Border(bottom: BorderSide(color: Color(0xFF3A3A3C))),
              ),
              child: Row(
                children: [
                  const Icon(Icons.chat_bubble_outline, color: Colors.white, size: 20),
                  const SizedBox(width: 8),
                  const Text(
                    'Chat',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white, size: 20),
                    onPressed: () => setState(() => _isChatVisible = false),
                  ),
                ],
              ),
            ),

            // Messages list
            Expanded(
              child: _chatMessages.isEmpty
                  ? const Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.chat_bubble_outline, color: Color(0xFF5A5A5A), size: 48),
                          SizedBox(height: 12),
                          Text(
                            'No messages yet',
                            style: TextStyle(color: Color(0xFF8E8E93), fontSize: 14),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _chatMessages.length,
                      itemBuilder: (context, index) {
                        final message = _chatMessages[index];
                        final isMe = message['sender'] == 'me';
                        return _buildChatMessage(message, isMe);
                      },
                    ),
            ),

            // Chat input
            Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                border: Border(top: BorderSide(color: Color(0xFF3A3A3C))),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _chatController,
                      style: const TextStyle(color: Colors.white),
                      decoration: InputDecoration(
                        hintText: 'videocalls.type_a_message'.tr(),
                        hintStyle: const TextStyle(color: Color(0xFF8E8E93)),
                        filled: true,
                        fillColor: const Color(0xFF3A3A3C),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(20),
                          borderSide: BorderSide.none,
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 10,
                        ),
                      ),
                      onSubmitted: (_) => _sendChatMessage(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    decoration: const BoxDecoration(
                      color: Color(0xFF6264A7),
                      shape: BoxShape.circle,
                    ),
                    child: IconButton(
                      icon: const Icon(Icons.send, color: Colors.white, size: 20),
                      onPressed: _sendChatMessage,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildChatMessage(Map<String, dynamic> message, bool isMe) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Align(
        alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
        child: Column(
          crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            if (!isMe)
              Padding(
                padding: const EdgeInsets.only(bottom: 4, left: 4),
                child: Text(
                  message['sender'],
                  style: const TextStyle(
                    color: Color(0xFF8E8E93),
                    fontSize: 12,
                  ),
                ),
              ),
            Container(
              constraints: const BoxConstraints(maxWidth: 240),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: isMe ? const Color(0xFF6264A7) : const Color(0xFF3A3A3C),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                message['content'],
                style: const TextStyle(color: Colors.white),
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(top: 4, left: 4, right: 4),
              child: Text(
                _formatMessageTime(message['timestamp']),
                style: const TextStyle(
                  color: Color(0xFF5A5A5A),
                  fontSize: 11,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _sendChatMessage() async {
    final message = _chatController.text.trim();
    if (message.isEmpty) return;

    final currentUserId = AuthService.instance.currentUser?.id;
    final messageId = const Uuid().v4();

    debugPrint('💬 [AudioCallScreen] _sendChatMessage called');
    debugPrint('💬 [AudioCallScreen] currentUserId: $currentUserId');
    debugPrint('💬 [AudioCallScreen] messageId: $messageId');
    debugPrint('💬 [AudioCallScreen] callId: ${widget.callId}');
    debugPrint('💬 [AudioCallScreen] socketConnected: ${_socketService.isConnected}');

    // Add message to local list (optimistic UI update)
    setState(() {
      _chatMessages.add({
        'id': messageId,
        'content': message,
        'sender': 'me',
        'senderId': currentUserId,
        'timestamp': DateTime.now(),
      });
    });

    // Send via WebSocket (for web compatibility)
    if (widget.callId != null) {
      debugPrint('💬 [AudioCallScreen] Sending chat via WebSocket...');
      try {
        _socketService.sendChatMessage(
          callId: widget.callId!,
          content: message,
        );
        debugPrint('💬 [AudioCallScreen] Chat message sent successfully via WebSocket');
      } catch (e) {
        debugPrint('❌ [AudioCallScreen] WebSocket chat send failed: $e');
      }
    } else {
      debugPrint('❌ [AudioCallScreen] Cannot send chat - callId is null');
    }

    // Clear input
    _chatController.clear();
  }

  String _formatMessageTime(DateTime timestamp) {
    final now = DateTime.now();
    final difference = now.difference(timestamp);

    if (difference.inSeconds < 60) {
      return 'Just now';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else {
      final hours = timestamp.hour.toString().padLeft(2, '0');
      final minutes = timestamp.minute.toString().padLeft(2, '0');
      return '$hours:$minutes';
    }
  }

  Widget _buildAIPanelOverlay() {
    return Positioned(
      right: 0,
      top: 0,
      bottom: 0,
      child: Container(
        width: 320,
        color: const Color(0xFF2C2C2E),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.auto_awesome, color: Color(0xFF6264A7)),
                      SizedBox(width: 8),
                      Text(
                        'AI Features',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white),
                    onPressed: () => setState(() => _showAIPanel = false),
                  ),
                ],
              ),
            ),
            const Expanded(
              child: Center(
                child: Text(
                  'AI features available',
                  style: TextStyle(color: Color(0xFF8E8E93)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Build participants list overlay (top-left corner)
  Widget _buildParticipantsList() {
    // Combine local and remote participants
    final allParticipants = <Map<String, dynamic>>[];

    // Add local participant (current user)
    if (_localParticipant != null) {
      allParticipants.add({
        'name': _myParticipant?.displayName ?? 'videocalls.you'.tr(),
        'isLocal': true,
        'isMuted': !_isMicEnabled,
      });
    }

    // Add remote participants
    for (var participant in _remoteParticipants) {
      allParticipants.add({
        'name': participant.name ?? participant.identity ?? 'videocalls.participant'.tr(),
        'isLocal': false,
        'isMuted': participant.isMicrophoneEnabled() == false,
      });
    }

    if (allParticipants.isEmpty) {
      return const SizedBox.shrink();
    }

    return Positioned(
      top: 80,
      left: 16,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 200),
        decoration: BoxDecoration(
          color: Colors.black.withOpacity(0.6),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white.withOpacity(0.1)),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.people,
                  color: Colors.white,
                  size: 16,
                ),
                const SizedBox(width: 6),
                Text(
                  'videocalls.participants_count'.tr(args: [allParticipants.length.toString()]),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            const Divider(color: Colors.white24, height: 1),
            const SizedBox(height: 8),

            // Participant list
            ...allParticipants.map((participant) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Mic status icon
                    Icon(
                      participant['isMuted']
                          ? Icons.mic_off
                          : Icons.mic,
                      size: 14,
                      color: participant['isMuted']
                          ? Colors.red
                          : Colors.green,
                    ),
                    const SizedBox(width: 8),
                    // Participant name
                    Flexible(
                      child: Text(
                        participant['name'],
                        style: TextStyle(
                          color: participant['isLocal']
                              ? const Color(0xFF6264A7)
                              : Colors.white,
                          fontSize: 13,
                          fontWeight: participant['isLocal']
                              ? FontWeight.w600
                              : FontWeight.w400,
                        ),
                        overflow: TextOverflow.ellipsis,
                        maxLines: 1,
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ],
        ),
      ),
    );
  }

  void _showLeaveConfirmation() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF2C2C2E),
        title: Text('videocalls.leave_call_question'.tr(), style: const TextStyle(color: Colors.white)),
        content: const Text(
          'Are you sure you want to leave this call?',
          style: TextStyle(color: Color(0xFF8E8E93)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('common.cancel'.tr(), style: const TextStyle(color: Color(0xFF6264A7))),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _endCall();
            },
            child: Text('videocalls.leave'.tr(), style: const TextStyle(color: Color(0xFFC4314B))),
          ),
        ],
      ),
    );
  }
}
