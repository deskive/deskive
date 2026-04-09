import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:easy_localization/easy_localization.dart';
import 'dart:async';
import 'dart:io' show Platform;
import '../services/socket_io_chat_service.dart';
import '../services/video_call_socket_service.dart';
import '../services/callkit_service.dart';
import 'video_call_screen.dart';
import 'package:flutter_ringtone_player/flutter_ringtone_player.dart';
import 'package:vibration/vibration.dart';
import 'package:audioplayers/audioplayers.dart';

/// Incoming Call Screen - Full screen overlay for incoming video calls
class IncomingCallScreen extends StatefulWidget {
  final String callId;
  final String callerName;
  final String? callerAvatar;
  final String? callerUserId;
  final bool isVideoCall;

  const IncomingCallScreen({
    super.key,
    required this.callId,
    required this.callerName,
    this.callerAvatar,
    this.callerUserId,
    this.isVideoCall = true,
  });

  @override
  State<IncomingCallScreen> createState() => _IncomingCallScreenState();
}

class _IncomingCallScreenState extends State<IncomingCallScreen>
    with SingleTickerProviderStateMixin {
  final SocketIOChatService _socketService = SocketIOChatService.instance;
  final VideoCallSocketService _videoCallService = VideoCallSocketService.instance;
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;
  Timer? _autoRejectTimer;
  Timer? _vibrationTimer;
  StreamSubscription<VideoCallEvent>? _callEventSubscription;

  // AudioPlayer for iOS (flutter_ringtone_player looping doesn't work on iOS)
  AudioPlayer? _iosAudioPlayer;

  // Media control states
  bool _isMicEnabled = true;
  bool _isCameraEnabled = true;

  @override
  void initState() {
    super.initState();

    // Set camera off by default for audio calls
    if (!widget.isVideoCall) {
      _isCameraEnabled = false;
    }

    // Start playing ringtone
    _startRingtone();

    // Pulse animation for ringing effect
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.1).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    // Auto-reject after 60 seconds
    _autoRejectTimer = Timer(const Duration(seconds: 60), () {
      if (mounted) {
        _rejectCall();
      }
    });

    // Listen for call cancelled by caller
    _listenForCallEvents();
  }

  void _startRingtone() async {
    try {
      if (Platform.isIOS) {
        // iOS: Use AudioPlayer with native looping support
        // flutter_ringtone_player looping doesn't work on iOS
        _iosAudioPlayer = AudioPlayer();

        // Set to loop mode - this uses native iOS audio looping
        await _iosAudioPlayer!.setReleaseMode(ReleaseMode.loop);

        // Set volume
        await _iosAudioPlayer!.setVolume(1.0);

        // Play the default ringtone asset
        // Using a bundled ringtone sound file for iOS
        await _iosAudioPlayer!.play(
          AssetSource('sounds/ringtone.mp3'),
        );

        debugPrint('📞 [IncomingCallScreen] Started iOS ringtone with AudioPlayer looping');
      } else {
        // Android: flutter_ringtone_player looping works fine
        FlutterRingtonePlayer().playRingtone(
          looping: true,
          volume: 1.0,
          asAlarm: false,
        );

        debugPrint('📞 [IncomingCallScreen] Started Android ringtone with FlutterRingtonePlayer');
      }

      // Start vibration pattern
      _startVibration();
    } catch (e) {
      debugPrint('❌ [IncomingCallScreen] Error starting ringtone: $e');
      // Fallback: try flutter_ringtone_player anyway
      try {
        FlutterRingtonePlayer().playRingtone(
          looping: true,
          volume: 1.0,
          asAlarm: Platform.isIOS,
        );
      } catch (_) {}
    }
  }

  void _stopRingtone() {
    try {
      // Stop iOS AudioPlayer if it's playing
      if (Platform.isIOS && _iosAudioPlayer != null) {
        _iosAudioPlayer!.stop();
        _iosAudioPlayer!.dispose();
        _iosAudioPlayer = null;
        debugPrint('📞 [IncomingCallScreen] Stopped iOS AudioPlayer ringtone');
      }

      // Also stop flutter_ringtone_player (for Android or fallback)
      FlutterRingtonePlayer().stop();

      // Stop vibration
      _stopVibration();
    } catch (e) {
      debugPrint('❌ [IncomingCallScreen] Error stopping ringtone: $e');
    }
  }

  void _startVibration() async {
    try {
      // Check if device has vibration support
      final hasVibrator = await Vibration.hasVibrator();
      if (hasVibrator == true) {
        // Vibration pattern: vibrate for 1000ms, pause for 500ms, repeat
        // Pattern: [delay, vibrate, pause, vibrate, pause, ...]
        final pattern = [0, 1000, 500, 1000, 500];

        // Start repeating vibration pattern
        _vibrationTimer = Timer.periodic(const Duration(milliseconds: 3000), (timer) async {
          await Vibration.vibrate(pattern: pattern);
        });

        // Start first vibration immediately
        await Vibration.vibrate(pattern: pattern);
      } else {
      }
    } catch (e) {
    }
  }

  void _stopVibration() {
    try {
      _vibrationTimer?.cancel();
      _vibrationTimer = null;
      Vibration.cancel();
    } catch (e) {
    }
  }

  void _listenForCallEvents() {
    _callEventSubscription?.cancel();
    debugPrint('📞 [IncomingCallScreen] Listening for call events for callId: ${widget.callId}');
    _callEventSubscription = _socketService.videoCallStream.listen((event) {
      debugPrint('📞 [IncomingCallScreen] Received VideoCallEvent - callId: ${event.callId}, type: ${event.type}, widget.callId: ${widget.callId}');
      if (event.callId == widget.callId) {
        debugPrint('📞 [IncomingCallScreen] CallId matches! Checking event type...');
        if (event.type == VideoCallEventType.cancelled ||
            event.type == VideoCallEventType.ended) {
          debugPrint('📞 [IncomingCallScreen] Event is cancelled/ended, closing screen');
          if (mounted) {
            // Stop ringtone and vibration before closing the screen
            _stopRingtone();

            // Also dismiss CallKit on iOS (in case it's also showing)
            if (Platform.isIOS) {
              debugPrint('📞 [IncomingCallScreen] Dismissing CallKit on iOS');
              CallKitService.instance.endCall(widget.callId);
            }

            Navigator.of(context).pop('cancelled');
          }
        }
      }
    });
  }

  Future<void> _acceptCall() async {

    // Stop ringtone
    _stopRingtone();

    // Send accept event via VideoCallSocketService
    _videoCallService.acceptCall(callId: widget.callId);

    if (mounted) {
      // Navigate to video call screen with caller's user ID for WebRTC signaling
      // and initial media states
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (context) => VideoCallScreen(
            callId: widget.callId,
            channelName: widget.callerName,
            callerName: widget.callerName,
            callerAvatar: widget.callerAvatar,
            isIncoming: true,
            participants: widget.callerUserId != null ? [widget.callerUserId!] : [],
            isAudioOnly: !_isCameraEnabled, // Pass camera state
            initialMicEnabled: _isMicEnabled, // Pass mic state
          ),
        ),
      );
    }
  }

  Future<void> _rejectCall() async {

    // Stop ringtone
    _stopRingtone();

    // Send decline event via VideoCallSocketService (same as CallKit decline)
    _videoCallService.declineCall(
      callId: widget.callId,
      callerUserId: widget.callerUserId ?? '',
    );

    if (mounted) {
      Navigator.of(context).pop('rejected');
    }
  }

  @override
  void dispose() {
    _callEventSubscription?.cancel();
    _stopRingtone();
    _stopVibration();
    _pulseController.dispose();
    _autoRejectTimer?.cancel();
    _vibrationTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final screenHeight = MediaQuery.of(context).size.height;
    final screenWidth = MediaQuery.of(context).size.width;
    final isSmallScreen = screenHeight < 700;

    // Responsive sizes based on screen height
    final avatarSize = isSmallScreen ? screenHeight * 0.15 : screenHeight * 0.17;
    final avatarFontSize = avatarSize * 0.4;
    final nameFontSize = isSmallScreen ? 24.0 : 32.0;
    final horizontalPadding = screenWidth * 0.08;
    final actionButtonSize = isSmallScreen ? 60.0 : 70.0;

    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Container(
          color: Colors.black,
          child: Column(
            children: [
              // Top section - Call info (flexible to take available space)
              Expanded(
                flex: 5,
                child: Padding(
                  padding: EdgeInsets.symmetric(horizontal: horizontalPadding),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        widget.isVideoCall ? 'Incoming Video Call' : 'Incoming Call',
                        style: TextStyle(
                          color: Colors.white70,
                          fontSize: isSmallScreen ? 14 : 16,
                          fontWeight: FontWeight.w300,
                        ),
                      ),
                      SizedBox(height: screenHeight * 0.03),
                      // Caller Avatar with pulse animation
                      AnimatedBuilder(
                        animation: _pulseAnimation,
                        builder: (context, child) {
                          return Transform.scale(
                            scale: _pulseAnimation.value,
                            child: Container(
                              width: avatarSize,
                              height: avatarSize,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: Colors.white24,
                                  width: 3,
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.blue.withValues(alpha: 0.3),
                                    blurRadius: 20,
                                    spreadRadius: 5,
                                  ),
                                ],
                              ),
                              child: CircleAvatar(
                                radius: avatarSize / 2 - 3,
                                backgroundColor: Colors.blue.shade700,
                                backgroundImage: widget.callerAvatar != null && widget.callerAvatar!.isNotEmpty
                                    ? NetworkImage(widget.callerAvatar!)
                                    : null,
                                child: widget.callerAvatar == null || widget.callerAvatar!.isEmpty
                                    ? Text(
                                        widget.callerName.isNotEmpty
                                            ? widget.callerName.substring(0, 1).toUpperCase()
                                            : '?',
                                        style: TextStyle(
                                          fontSize: avatarFontSize,
                                          color: Colors.white,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      )
                                    : null,
                              ),
                            ),
                          );
                        },
                      ),
                      SizedBox(height: screenHeight * 0.025),
                      // Caller Name
                      Text(
                        widget.callerName,
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: nameFontSize,
                          fontWeight: FontWeight.bold,
                        ),
                        textAlign: TextAlign.center,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      SizedBox(height: screenHeight * 0.01),
                      // Ringing text
                      Text(
                        'Ringing...',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.6),
                          fontSize: isSmallScreen ? 14 : 16,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Media controls (mic and camera)
              Expanded(
                flex: 1,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Mic toggle
                    _buildMediaButton(
                      icon: _isMicEnabled ? Icons.mic : Icons.mic_off,
                      label: _isMicEnabled ? 'Mic On' : 'Mic Off',
                      isEnabled: _isMicEnabled,
                      isSmallScreen: isSmallScreen,
                      onPressed: () {
                        setState(() {
                          _isMicEnabled = !_isMicEnabled;
                        });
                      },
                    ),
                    SizedBox(width: screenWidth * 0.08),
                    // Camera toggle (only for video calls)
                    if (widget.isVideoCall)
                      _buildMediaButton(
                        icon: _isCameraEnabled ? Icons.videocam : Icons.videocam_off,
                        label: _isCameraEnabled ? 'Cam On' : 'Cam Off',
                        isEnabled: _isCameraEnabled,
                        isSmallScreen: isSmallScreen,
                        onPressed: () {
                          setState(() {
                            _isCameraEnabled = !_isCameraEnabled;
                          });
                        },
                      ),
                  ],
                ),
              ),

              // Bottom section - Action buttons
              Expanded(
                flex: 2,
                child: Padding(
                  padding: EdgeInsets.symmetric(
                    horizontal: horizontalPadding,
                    vertical: screenHeight * 0.02,
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      // Reject button
                      _buildActionButton(
                        icon: Icons.call_end,
                        label: 'videocalls.decline'.tr(),
                        color: Colors.red,
                        onPressed: _rejectCall,
                        buttonSize: actionButtonSize,
                        isSmallScreen: isSmallScreen,
                      ),
                      // Accept button
                      _buildActionButton(
                        icon: widget.isVideoCall ? Icons.videocam : Icons.call,
                        label: 'videocalls.accept'.tr(),
                        color: Colors.green,
                        onPressed: _acceptCall,
                        buttonSize: actionButtonSize,
                        isSmallScreen: isSmallScreen,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildActionButton({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onPressed,
    required double buttonSize,
    required bool isSmallScreen,
  }) {
    final iconSize = isSmallScreen ? 28.0 : 32.0;
    final labelFontSize = isSmallScreen ? 12.0 : 14.0;
    final spacing = isSmallScreen ? 8.0 : 12.0;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Material(
          color: color,
          shape: const CircleBorder(),
          elevation: 8,
          child: InkWell(
            onTap: onPressed,
            customBorder: const CircleBorder(),
            child: Container(
              width: buttonSize,
              height: buttonSize,
              alignment: Alignment.center,
              child: Icon(
                icon,
                color: Colors.white,
                size: iconSize,
              ),
            ),
          ),
        ),
        SizedBox(height: spacing),
        Text(
          label,
          style: TextStyle(
            color: Colors.white,
            fontSize: labelFontSize,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  Widget _buildMediaButton({
    required IconData icon,
    required String label,
    required bool isEnabled,
    required bool isSmallScreen,
    required VoidCallback onPressed,
  }) {
    final buttonSize = isSmallScreen ? 50.0 : 60.0;
    final iconSize = isSmallScreen ? 24.0 : 28.0;
    final labelFontSize = isSmallScreen ? 10.0 : 12.0;
    final spacing = isSmallScreen ? 4.0 : 8.0;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Material(
          color: isEnabled ? Colors.white.withValues(alpha: 0.2) : Colors.red.withValues(alpha: 0.3),
          shape: const CircleBorder(),
          child: InkWell(
            onTap: onPressed,
            customBorder: const CircleBorder(),
            child: Container(
              width: buttonSize,
              height: buttonSize,
              alignment: Alignment.center,
              child: Icon(
                icon,
                color: Colors.white,
                size: iconSize,
              ),
            ),
          ),
        ),
        SizedBox(height: spacing),
        Text(
          label,
          style: TextStyle(
            color: Colors.white70,
            fontSize: labelFontSize,
            fontWeight: FontWeight.w400,
          ),
        ),
      ],
    );
  }
}
