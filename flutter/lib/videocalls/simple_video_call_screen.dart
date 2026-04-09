import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'dart:async';

/// Simple Video Call UI Screen - Microsoft Teams Style
/// Displays video call interface with controls - UI only, no LiveKit integration
class SimpleVideoCallScreen extends StatefulWidget {
  final String participantName;
  final bool isVideoCall;
  final List<String> participants;

  const SimpleVideoCallScreen({
    super.key,
    this.participantName = 'Anonymous',
    this.isVideoCall = true,
    this.participants = const [],
  });

  @override
  State<SimpleVideoCallScreen> createState() => _SimpleVideoCallScreenState();
}

class _SimpleVideoCallScreenState extends State<SimpleVideoCallScreen> {
  bool _isMicEnabled = true;
  bool _isCameraEnabled = true;
  bool _isSpeakerOn = true;
  bool _isOnHold = false;
  bool _isScreenSharing = false;
  bool _isChatVisible = false;
  bool _isRecording = false;
  bool _showAIPanel = false;
  bool _showMoreMenu = false;

  // Call duration timer
  Duration _callDuration = const Duration();
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _startCallTimer();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
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

  @override
  Widget build(BuildContext context) {
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

                // Main video area with participant
                Expanded(
                  child: _buildMainVideoArea(),
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

            // // AI Panel overlay (if visible)
            // if (_showAIPanel) _buildAIPanelOverlay(),
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
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.participantName,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                  overflow: TextOverflow.ellipsis,
                  maxLines: 1,
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
          ),

          const SizedBox(width: 8),

          // Action icons (message and participants)
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

  /// Main video area - shows avatar with colored ring
  Widget _buildMainVideoArea() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Avatar with colored ring
          Container(
            width: 130,
            height: 130,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(
                colors: [
                  Color(0xFF6264A7),
                  Color(0xFF8B8FD8),
                ],
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
                child: const Center(
                  child: Icon(
                    Icons.person,
                    size: 60,
                    color: Color(0xFF8E8E93),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 20),

          // Participant name
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Text(
              widget.participantName,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 20,
                fontWeight: FontWeight.w600,
              ),
              overflow: TextOverflow.ellipsis,
              maxLines: 1,
              textAlign: TextAlign.center,
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
                label: _isMicEnabled ? 'Mic on' : 'Mic off',
                onTap: () {
                  setState(() {
                    _isMicEnabled = !_isMicEnabled;
                  });
                },
                isActive: _isMicEnabled,
              ),
              _buildGridButton(
                icon: _isCameraEnabled ? Icons.videocam : Icons.videocam_off,
                label: _isCameraEnabled ? 'Video on' : 'Video off',
                onTap: () {
                  setState(() {
                    _isCameraEnabled = !_isCameraEnabled;
                  });
                },
                isActive: _isCameraEnabled,
              ),
              _buildGridButton(
                icon: _isSpeakerOn ? Icons.volume_up : Icons.volume_off,
                label: _isSpeakerOn ? 'Speaker' : 'Muted',
                onTap: () {
                  setState(() {
                    _isSpeakerOn = !_isSpeakerOn;
                  });
                },
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
                icon: Icons.pause,
                label: _isOnHold ? 'Resume' : 'Hold',
                onTap: () {
                  setState(() {
                    _isOnHold = !_isOnHold;
                  });
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(_isOnHold ? 'Call on hold' : 'Call resumed'),
                      duration: const Duration(seconds: 2),
                    ),
                  );
                },
                isActive: false,
              ),
              _buildGridButton(
                icon: Icons.phone_forwarded,
                label: 'videocalls.transfer'.tr(),
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('videocalls.transfer_call'.tr()),
                      duration: const Duration(seconds: 2),
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
              ? Border.all(
                  color: const Color(0xFF8E8E93),
                  width: 1.5,
                )
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
      onTap: () {
        setState(() {
          _showMoreMenu = false;
        });
      },
      child: Container(
        color: Colors.black.withOpacity(0.5),
        child: Column(
          children: [
            const Spacer(),
            GestureDetector(
              onTap: () {}, // Prevent closing when tapping menu
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
                    // Handle bar
                    Container(
                      margin: const EdgeInsets.only(top: 12, bottom: 8),
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: const Color(0xFF5A5A5A),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),

                    // Header
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
                            onPressed: () {
                              setState(() {
                                _showMoreMenu = false;
                              });
                            },
                          ),
                        ],
                      ),
                    ),

                    // Menu items
                    // _buildMoreMenuItem(
                    //   icon: _isRecording ? Icons.stop_circle : Icons.fiber_manual_record,
                    //   title: _isRecording ? 'Stop Recording' : 'Start Recording',
                    //   subtitle: _isRecording ? 'Recording in progress' : 'Record this call',
                    //   onTap: () {
                    //     setState(() {
                    //       _isRecording = !_isRecording;
                    //       _showMoreMenu = false;
                    //     });
                    //     ScaffoldMessenger.of(context).showSnackBar(
                    //       SnackBar(
                    //         content: Text(_isRecording ? 'Recording started' : 'Recording stopped'),
                    //         duration: const Duration(seconds: 2),
                    //         backgroundColor: _isRecording ? Colors.red : Colors.grey[700],
                    //       ),
                    //     );
                    //   },
                    //   iconColor: _isRecording ? Colors.red : const Color(0xFF8E8E93),
                    // ),

                    // _buildMoreMenuItem(
                    //   icon: Icons.upload,
                    //   title: _isScreenSharing ? 'Stop sharing' : 'Share screen',
                    //   subtitle: _isScreenSharing ? 'Currently sharing' : 'Share your screen',
                    //   onTap: () {
                    //     setState(() {
                    //       _isScreenSharing = !_isScreenSharing;
                    //       _showMoreMenu = false;
                    //     });
                    //     ScaffoldMessenger.of(context).showSnackBar(
                    //       SnackBar(
                    //         content: Text(_isScreenSharing
                    //             ? 'Screen sharing started'
                    //             : 'Screen sharing stopped'),
                    //         duration: const Duration(seconds: 2),
                    //       ),
                    //     );
                    //   },
                    //   iconColor: _isScreenSharing ? const Color(0xFF6264A7) : const Color(0xFF8E8E93),
                    // ),

                    // _buildMoreMenuItem(
                    //   icon: Icons.auto_awesome,
                    //   title: 'AI Features',
                    //   subtitle: 'Transcription, summary & more',
                    //   onTap: () {
                    //     setState(() {
                    //       _showAIPanel = true;
                    //       _showMoreMenu = false;
                    //     });
                    //   },
                    //   iconColor: const Color(0xFF6264A7),
                    // ),

                    _buildMoreMenuItem(
                      icon: Icons.settings,
                      title: 'Settings',
                      subtitle: 'Audio & video settings',
                      onTap: () {
                        setState(() {
                          _showMoreMenu = false;
                        });
                        _showSettingsBottomSheet();
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

  /// More menu item
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
              child: Icon(
                icon,
                color: iconColor,
                size: 24,
              ),
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
            const Icon(
              Icons.chevron_right,
              color: Color(0xFF8E8E93),
            ),
          ],
        ),
      ),
    );
  }

  /// Chat overlay panel
  Widget _buildChatOverlay() {
    return Positioned(
      right: 0,
      top: 0,
      bottom: 0,
      child: Container(
        width: 320,
        decoration: BoxDecoration(
          color: const Color(0xFF2C2C2E),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.3),
              blurRadius: 10,
              offset: const Offset(-2, 0),
            ),
          ],
        ),
        child: Column(
          children: [
            // Chat header
            Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                border: Border(
                  bottom: BorderSide(color: Color(0xFF3A3A3C)),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Chat',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white),
                    onPressed: () {
                      setState(() {
                        _isChatVisible = false;
                      });
                    },
                  ),
                ],
              ),
            ),

            // Chat messages
            const Expanded(
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.chat_bubble_outline,
                      color: Color(0xFF5A5A5A),
                      size: 48,
                    ),
                    SizedBox(height: 16),
                    Text(
                      'No messages yet',
                      style: TextStyle(
                        color: Color(0xFF8E8E93),
                        fontSize: 16,
                      ),
                    ),
                    SizedBox(height: 8),
                    Text(
                      'Start a conversation',
                      style: TextStyle(
                        color: Color(0xFF5A5A5A),
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Chat input
            Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                border: Border(
                  top: BorderSide(color: Color(0xFF3A3A3C)),
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      style: const TextStyle(color: Colors.white),
                      decoration: InputDecoration(
                        hintText: 'Type a message...',
                        hintStyle: const TextStyle(color: Color(0xFF8E8E93)),
                        filled: true,
                        fillColor: const Color(0xFF3A3A3C),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: BorderSide.none,
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 10,
                        ),
                      ),
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
                      onPressed: () {
                        // Send message (UI only)
                      },
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

  /// AI Panel overlay
  Widget _buildAIPanelOverlay() {
    return Positioned(
      right: 0,
      top: 0,
      bottom: 0,
      child: Container(
        width: 320,
        decoration: BoxDecoration(
          color: const Color(0xFF2C2C2E),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.3),
              blurRadius: 10,
              offset: const Offset(-2, 0),
            ),
          ],
        ),
        child: Column(
          children: [
            // AI Panel header
            Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                border: Border(
                  bottom: BorderSide(color: Color(0xFF3A3A3C)),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.auto_awesome, color: Color(0xFF6264A7), size: 24),
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
                    onPressed: () {
                      setState(() {
                        _showAIPanel = false;
                      });
                    },
                  ),
                ],
              ),
            ),

            // AI Features content
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  _buildAIFeatureCard(
                    icon: Icons.transcribe,
                    title: 'Live Transcription',
                    description: 'Real-time speech-to-text transcription',
                    enabled: _isRecording,
                  ),
                  const SizedBox(height: 12),
                  _buildAIFeatureCard(
                    icon: Icons.summarize,
                    title: 'Meeting Summary',
                    description: 'AI-generated meeting notes and action items',
                    enabled: _isRecording,
                  ),
                  const SizedBox(height: 12),
                  _buildAIFeatureCard(
                    icon: Icons.translate,
                    title: 'Translation',
                    description: 'Translate conversation to multiple languages',
                    enabled: _isRecording,
                  ),
                  const SizedBox(height: 12),
                  _buildAIFeatureCard(
                    icon: Icons.lightbulb_outline,
                    title: 'Smart Suggestions',
                    description: 'Get AI-powered insights during the call',
                    enabled: true,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// AI Feature card
  Widget _buildAIFeatureCard({
    required IconData icon,
    required String title,
    required String description,
    required bool enabled,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF3A3A3C),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: enabled
                  ? const Color(0xFF6264A7).withOpacity(0.2)
                  : const Color(0xFF5A5A5A),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              icon,
              color: enabled ? const Color(0xFF6264A7) : const Color(0xFF8E8E93),
              size: 24,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    color: enabled ? Colors.white : const Color(0xFF8E8E93),
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: const TextStyle(
                    color: Color(0xFF8E8E93),
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
          if (!enabled)
            const Padding(
              padding: EdgeInsets.only(left: 8),
              child: Chip(
                label: Text(
                  'Record to enable',
                  style: TextStyle(
                    color: Color(0xFF8E8E93),
                    fontSize: 11,
                  ),
                ),
                backgroundColor: Color(0xFF2C2C2E),
                padding: EdgeInsets.symmetric(horizontal: 6, vertical: 0),
              ),
            ),
        ],
      ),
    );
  }

  /// Show settings bottom sheet
  void _showSettingsBottomSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF2C2C2E),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Audio & Video Settings',
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 24),

            // Microphone
            ListTile(
              leading: const Icon(Icons.mic, color: Colors.white),
              title: const Text(
                'Microphone',
                style: TextStyle(color: Colors.white),
              ),
              subtitle: const Text(
                'Default Microphone',
                style: TextStyle(color: Color(0xFF8E8E93)),
              ),
              trailing: const Icon(Icons.chevron_right, color: Color(0xFF8E8E93)),
              onTap: () {
                Navigator.pop(context);
                _showMicrophoneOptions();
              },
            ),

            // Camera
            ListTile(
              leading: const Icon(Icons.videocam, color: Colors.white),
              title: const Text(
                'Camera',
                style: TextStyle(color: Colors.white),
              ),
              subtitle: const Text(
                'Front Camera',
                style: TextStyle(color: Color(0xFF8E8E93)),
              ),
              trailing: const Icon(Icons.chevron_right, color: Color(0xFF8E8E93)),
              onTap: () {
                Navigator.pop(context);
                _showCameraOptions();
              },
            ),

            // Speaker
            ListTile(
              leading: const Icon(Icons.volume_up, color: Colors.white),
              title: const Text(
                'Speaker',
                style: TextStyle(color: Colors.white),
              ),
              subtitle: const Text(
                'Default Speaker',
                style: TextStyle(color: Color(0xFF8E8E93)),
              ),
              trailing: const Icon(Icons.chevron_right, color: Color(0xFF8E8E93)),
              onTap: () => Navigator.pop(context),
            ),
          ],
        ),
      ),
    );
  }

  /// Show microphone options bottom sheet
  void _showMicrophoneOptions() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF2C2C2E),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Select Microphone',
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.mic, color: Colors.white),
              title: const Text(
                'Default Microphone',
                style: TextStyle(color: Colors.white),
              ),
              trailing: const Icon(Icons.check, color: Color(0xFF6264A7)),
              onTap: () => Navigator.pop(context),
            ),
            ListTile(
              leading: const Icon(Icons.headset_mic, color: Colors.white),
              title: const Text(
                'Bluetooth Headset',
                style: TextStyle(color: Colors.white),
              ),
              onTap: () => Navigator.pop(context),
            ),
          ],
        ),
      ),
    );
  }

  /// Show camera options bottom sheet
  void _showCameraOptions() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF2C2C2E),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Select Camera',
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.videocam, color: Colors.white),
              title: const Text(
                'Front Camera',
                style: TextStyle(color: Colors.white),
              ),
              trailing: const Icon(Icons.check, color: Color(0xFF6264A7)),
              onTap: () => Navigator.pop(context),
            ),
            ListTile(
              leading: const Icon(Icons.videocam, color: Colors.white),
              title: const Text(
                'Back Camera',
                style: TextStyle(color: Colors.white),
              ),
              onTap: () => Navigator.pop(context),
            ),
          ],
        ),
      ),
    );
  }

  /// Show leave confirmation dialog
  void _showLeaveConfirmation() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF2C2C2E),
        title: const Text(
          'Leave Call?',
          style: TextStyle(color: Colors.white),
        ),
        content: const Text(
          'Are you sure you want to leave this call?',
          style: TextStyle(color: Color(0xFF8E8E93)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text(
              'Cancel',
              style: TextStyle(color: Color(0xFF6264A7)),
            ),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context); // Close dialog
              Navigator.pop(context); // Close video call screen
            },
            child: const Text(
              'Leave',
              style: TextStyle(color: Color(0xFFC4314B)),
            ),
          ),
        ],
      ),
    );
  }
}
