import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:livekit_client/livekit_client.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:uuid/uuid.dart';
import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/services.dart';
import 'package:wakelock_plus/wakelock_plus.dart';
import '../api/services/video_call_service.dart';
import '../services/video_call_socket_service.dart';
import '../services/auth_service.dart';
import '../services/pip_manager.dart';
import '../services/call_overlay_service.dart';
import '../api/base_api_client.dart';
import '../config/api_config.dart';
import '../config/env_config.dart';
import '../models/video_call.dart';
import '../models/videocalls/join_request.dart';
import '../dao/video_call_dao.dart';
import '../services/workspace_service.dart';
import '../services/callkit_service.dart';
import 'widgets/join_request_notification.dart';
import 'widgets/invite_people_bottom_sheet.dart';
import 'screen_capture_manager.dart';

/// Video Call Screen - Microsoft Teams Style with LiveKit Integration
class VideoCallScreen extends StatefulWidget {
  final String? callId;
  final String? channelName;
  final bool isIncoming;
  final String? callerName;
  final String? callerAvatar;
  final List<String> participants;
  final bool isAudioOnly;
  final bool? initialMicEnabled;
  final Room? existingRoom; // For resuming from floating bubble
  final bool isJoinViaLink; // For joining via deep link

  const VideoCallScreen({
    super.key,
    this.callId,
    this.channelName,
    this.isIncoming = false,
    this.callerName,
    this.callerAvatar,
    this.participants = const [],
    this.isAudioOnly = false,
    this.initialMicEnabled,
    this.existingRoom,
    this.isJoinViaLink = false,
  });

  @override
  State<VideoCallScreen> createState() => _VideoCallScreenState();
}

class _VideoCallScreenState extends State<VideoCallScreen> with WidgetsBindingObserver {
  // LiveKit
  Room? _room;
  LocalParticipant? _localParticipant;
  List<RemoteParticipant> _remoteParticipants = [];

  // Services
  late VideoCallService _apiService;
  late VideoCallSocketService _socketService;

  // State
  bool _isMicEnabled = true;
  bool _isCameraEnabled = true;
  bool _isSpeakerOn = true;
  bool _isScreenSharing = false; // Current user's screen share state
  bool _isChatVisible = false;
  LocalVideoTrack? _screenShareTrack; // Direct reference to screen share video track
  bool _isRecording = false;
  bool _showAIPanel = false;
  bool _showMoreMenu = false;
  bool _isFrontCamera = true;
  bool _showParticipantsList = false;
  bool _showBlackScreen = false;

  // Call state
  bool _callActive = false;
  bool _isInitializing = true;
  Duration _callDuration = const Duration();
  Timer? _timer;

  // Chat state
  final TextEditingController _chatController = TextEditingController();
  final List<Map<String, dynamic>> _chatMessages = [];

  // Call info
  JoinCallResponse? _callResponse;
  CallParticipant? _myParticipant;
  String? _currentUserAvatar;

  // Subscriptions
  StreamSubscription? _participantSubscription;
  StreamSubscription? _mediaSubscription;
  StreamSubscription? _pipModeSubscription;
  StreamSubscription? _joinRequestNewSubscription;
  StreamSubscription? _joinRequestAcceptedSubscription;
  StreamSubscription? _joinRequestRejectedSubscription;
  StreamSubscription? _chatMessageSubscription;
  StreamSubscription? _callEndedSubscription;

  // PiP mode state
  bool _isInPipMode = false;

  // Expanded/focused participant view
  Map<String, dynamic>? _expandedParticipant;

  // Join requests (for host)
  List<JoinRequest> _joinRequests = [];
  final VideoCallDao _videoCallDao = VideoCallDao();

  @override
  void initState() {
    super.initState();
    // Set camera off for audio-only calls
    if (widget.isAudioOnly) {
      _isCameraEnabled = false;
    }
    // Set mic state if provided
    if (widget.initialMicEnabled != null) {
      _isMicEnabled = widget.initialMicEnabled!;
    }
    // Add lifecycle observer
    WidgetsBinding.instance.addObserver(this);
    // Enable wake lock
    WakelockPlus.enable();
    // Initialize PiP manager
    PipManager.initialize();
    // Listen to PiP mode changes
    _pipModeSubscription = PipManager.pipModeStream.listen((isInPipMode) {
      setState(() {
        _isInPipMode = isInPipMode;
      });
    });

    // NOTE: Auto-PiP is enabled AFTER call is connected to prevent PiP
    // from triggering when permission dialogs appear

    // Check if resuming from floating bubble
    if (widget.existingRoom != null) {
      _resumeExistingCall(); // Don't await in initState
    } else {
      _initializeApp();
    }
  }

  /// Resume existing call from floating bubble
  Future<void> _resumeExistingCall() async {

    // Initialize services first
    await _initializeServices();

    _room = widget.existingRoom;
    _localParticipant = _room?.localParticipant;
    _remoteParticipants = _room?.remoteParticipants.values.toList() ?? [];
    _callActive = true;
    _isInitializing = false;

    // Restore screen share state if active
    if (_localParticipant != null) {
      final screenSharePublication = _localParticipant!.trackPublications.values
          .where((pub) => pub.source == TrackSource.screenShareVideo)
          .firstOrNull;

      if (screenSharePublication != null && screenSharePublication.track != null) {
        _screenShareTrack = screenSharePublication.track as LocalVideoTrack?;
        _isScreenSharing = _screenShareTrack != null && !_screenShareTrack!.muted;
        debugPrint('[VideoCall] Restored screen share state: $_isScreenSharing');
      }

      // Also restore camera and mic state from room
      final cameraPublication = _localParticipant!.videoTrackPublications
          .where((pub) => pub.source == TrackSource.camera)
          .firstOrNull;
      final micPublication = _localParticipant!.audioTrackPublications
          .where((pub) => pub.source == TrackSource.microphone)
          .firstOrNull;

      if (cameraPublication != null) {
        _isCameraEnabled = cameraPublication.track != null && !cameraPublication.muted;
      }
      if (micPublication != null) {
        _isMicEnabled = micPublication.track != null && !micPublication.muted;
      }
    }

    // Update UI with restored state
    if (mounted) {
      setState(() {});
    }

    // Enable auto-PiP for resumed call
    PipManager.enableAutoPip(true);

    // Start call timer
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted) {
        setState(() {
          _callDuration = Duration(seconds: _callDuration.inSeconds + 1);
        });
      }
    });

    // Listen for participant changes
    _room?.createListener().on<ParticipantConnectedEvent>((event) {
      if (mounted) {
        setState(() {
          _remoteParticipants = _room!.remoteParticipants.values.toList();
        });
      }
    });

    _room?.createListener().on<ParticipantDisconnectedEvent>((event) {
      if (mounted) {
        setState(() {
          _remoteParticipants = _room!.remoteParticipants.values.toList();
        });
      }
    });

    setState(() {});

    // Join the WebSocket room for this call
    if (widget.callId != null) {
      await _socketService.joinCallRoom(widget.callId!);
    }

    // Fetch any pending join requests (for host)
    _fetchPendingJoinRequests();
  }

  Future<void> _initializeApp() async {
    await _initializeServices();
    await _initializeVideoCall();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _chatController.dispose();
    _participantSubscription?.cancel();
    _mediaSubscription?.cancel();
    _pipModeSubscription?.cancel();
    _joinRequestNewSubscription?.cancel();
    _joinRequestAcceptedSubscription?.cancel();
    _joinRequestRejectedSubscription?.cancel();
    _chatMessageSubscription?.cancel();
    _callEndedSubscription?.cancel();

    // Only dispose room if NOT in PiP mode AND floating bubble is not showing
    // When in PiP or floating bubble, keep the call running
    if (!_isInPipMode && !CallOverlayService.instance.isVisible) {
      _room?.dispose();
      // Disable wake lock only when call actually ends
      WakelockPlus.disable();
      // Disable auto-PiP when call ends
      PipManager.enableAutoPip(false);
      // Stop screen capture foreground service if running
      if (Platform.isAndroid && _isScreenSharing) {
        ScreenCaptureManager.stopForegroundService();
      }
    }

    // Remove lifecycle observer
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    super.didChangeAppLifecycleState(state);
    // Auto-PiP is now handled by onUserLeaveHint in MainActivity
  }

  Future<void> _initializeServices() async {
    // Initialize API service (instant - no await needed)
    _apiService = VideoCallService(BaseApiClient.instance);

    // Use global singleton (already connected from main.dart)
    _socketService = VideoCallSocketService.instance;

    // Connect WebSocket only if not already connected
    if (!_socketService.isConnected) {
      await _socketService.connect();
    }

    // Setup listeners and get user avatar (instant operations)
    _listenToWebSocketEvents();
    _currentUserAvatar = AuthService.instance.currentUser?.avatarUrl;
  }

  void _listenToWebSocketEvents() {
    _participantSubscription = _socketService.onParticipantJoined.listen((data) {
      // Participant joined
    });

    _participantSubscription = _socketService.onParticipantLeft.listen((data) {
      // Participant left
    });

    _mediaSubscription = _socketService.onMediaUpdated.listen((data) {
      // Media updated
    });

    // Listen for chat messages via WebSocket (for web compatibility)
    _chatMessageSubscription = _socketService.onChatMessage.listen((data) {
      if (mounted) {
        final currentUserId = AuthService.instance.currentUser?.id;
        final senderId = data['senderId']?.toString();
        final messageId = data['id']?.toString();

        // Skip messages from self (already added optimistically) or duplicates
        if (senderId != null && currentUserId != null && senderId == currentUserId) {
          return;
        }

        // Check for duplicate message ID
        if (messageId != null && _chatMessages.any((m) => m['id'] == messageId)) {
          return;
        }

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

    // Listen for call:ended event to close the screen when the other party ends the call
    _callEndedSubscription = _socketService.onCallEnded.listen((data) {
      final eventCallId = data['callId'] ?? data['call_id'] ?? '';
      if (eventCallId == widget.callId && mounted) {
        // Show a brief message and close the screen
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('videocalls.call_ended'.tr()),
            backgroundColor: Colors.orange,
            duration: Duration(seconds: 2),
          ),
        );
        // Disconnect and close
        _room?.disconnect();
        Navigator.of(context).pop('ended');
      }
    });

    // Listen for join requests (host will receive these)
    _joinRequestNewSubscription = _socketService.onJoinRequestNew.listen(
      (request) {

        if (mounted) {
          setState(() {
            // Avoid duplicates
            if (!_joinRequests.any((r) => r.id == request.id)) {
              _joinRequests.add(request);
            } else {
            }
          });

          // Show snackbar notification
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('videocalls.wants_to_join_call'.tr(args: [request.displayName])),
              backgroundColor: Colors.blue,
              duration: const Duration(seconds: 3),
            ),
          );
        } else {
        }
      },
      onError: (error) {
      },
      onDone: () {
      },
    );

    // Listen for accepted requests (to remove from list)
    _joinRequestAcceptedSubscription = _socketService.onJoinRequestAccepted.listen((data) {

      if (mounted) {
        setState(() {
          _joinRequests.removeWhere((r) => r.id == data.requestId);
        });
      }
    });

    // Listen for rejected requests (to remove from list)
    _joinRequestRejectedSubscription = _socketService.onJoinRequestRejected.listen((data) {

      if (mounted) {
        setState(() {
          _joinRequests.removeWhere((r) => r.id == data.requestId);
        });
      }
    });
  }

  Future<void> _initializeVideoCall() async {
    print('');
    print('╔══════════════════════════════════════════════════════════════╗');
    print('║  [VideoCallScreen] _initializeVideoCall STARTED              ║');
    print('║  CODE VERSION: 2024-12-09-v3 (iOS LiveKit native audio)      ║');
    print('╚══════════════════════════════════════════════════════════════╝');
    print('[VideoCallScreen] callId: ${widget.callId}');
    print('[VideoCallScreen] isIncoming: ${widget.isIncoming}');
    print('[VideoCallScreen] isAudioOnly: ${widget.isAudioOnly}');
    print('[VideoCallScreen] Platform.isIOS: ${Platform.isIOS}');
    print('[VideoCallScreen] channelName: ${widget.channelName}');
    print('[VideoCallScreen] participants: ${widget.participants}');

    try {
      // NOTE: For iOS outgoing calls, we let LiveKit handle audio session natively.
      // CallKit is NOT needed for outgoing calls - it's only needed for incoming calls
      // to show the system call UI. Using CallKit for outgoing calls can conflict with
      // LiveKit's automatic audio session management.
      //
      // For incoming calls on iOS, CallKit is already handled by the IncomingCallScreen
      // which shows the call UI and configures audio before navigating here.
      print('[VideoCallScreen] iOS outgoing: letting LiveKit handle audio session natively');

      // Step 1: Request permissions (required first)
      print('[VideoCallScreen] Step 1: Requesting permissions...');
      await _requestPermissions();
      print('[VideoCallScreen] Step 1: Permissions granted');

      // Step 2: Join call via API (required to get LiveKit token)
      print('[VideoCallScreen] Step 2: Calling joinCall API...');
      _callResponse = await _apiService.joinCall(widget.callId!);
      print('[VideoCallScreen] Step 2: joinCall API success');
      print('[VideoCallScreen] roomUrl: ${_callResponse!.roomUrl}');
      print('[VideoCallScreen] token length: ${_callResponse!.token.length}');
      _myParticipant = _callResponse!.participant;

      // Step 3: Run WebSocket join and LiveKit connect IN PARALLEL for speed
      print('[VideoCallScreen] Step 3: Connecting to WebSocket and LiveKit...');
      await Future.wait([
        _socketService.joinCallRoom(widget.callId!),
        _connectToLiveKit(),
      ]);
      print('[VideoCallScreen] Step 3: WebSocket and LiveKit connected');

      setState(() {
        _isInitializing = false;
        _callActive = true;
      });

      // Enable auto-PiP now that call is connected (after permissions granted)
      PipManager.enableAutoPip(true);

      _startCallTimer();
      print('[VideoCallScreen] Call successfully initialized and active');

      // Fetch any pending join requests (for host) - non-blocking
      _fetchPendingJoinRequests();

    } catch (e, stackTrace) {
      print('[VideoCallScreen] ERROR during initialization: $e');
      print('[VideoCallScreen] Stack trace: $stackTrace');

      // Show user-friendly error message based on error type
      String errorMessage = 'Failed to join call';
      final errorString = e.toString().toLowerCase();

      if (errorString.contains('mediaconnectexception') ||
          errorString.contains('timed out') ||
          errorString.contains('peerconnection')) {
        errorMessage = 'Call ended or unavailable';
      } else if (errorString.contains('network') ||
          errorString.contains('socket') ||
          errorString.contains('connection refused')) {
        errorMessage = 'Network connection failed';
      } else if (errorString.contains('403') ||
          errorString.contains('unauthorized') ||
          errorString.contains('not invited')) {
        errorMessage = 'Not authorized to join this call';
      } else if (errorString.contains('404') || errorString.contains('not found')) {
        errorMessage = 'Call not found';
      }

      print('[VideoCallScreen] Showing error message: $errorMessage');

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(errorMessage),
            backgroundColor: Colors.orange,
          ),
        );
        Navigator.pop(context);
      }
    }
  }

  Future<void> _requestPermissions() async {
    print('[VideoCallScreen] _requestPermissions started');
    final permissions = [Permission.camera, Permission.microphone];

    // Check if already granted first (faster path)
    final cameraStatus = await Permission.camera.status;
    final micStatus = await Permission.microphone.status;
    print('[VideoCallScreen] Current permissions - camera: $cameraStatus, mic: $micStatus');

    if (cameraStatus.isGranted && micStatus.isGranted) {
      print('[VideoCallScreen] Permissions already granted');
      return; // Already granted, skip request dialog
    }

    print('[VideoCallScreen] Requesting permissions...');
    final statuses = await permissions.request();
    print('[VideoCallScreen] Permission results - camera: ${statuses[Permission.camera]}, mic: ${statuses[Permission.microphone]}');

    if (statuses[Permission.camera] != PermissionStatus.granted ||
        statuses[Permission.microphone] != PermissionStatus.granted) {
      print('[VideoCallScreen] Permissions denied!');
      throw Exception('Camera and microphone permissions are required');
    }
    print('[VideoCallScreen] _requestPermissions completed successfully');
  }

  Future<void> _connectToLiveKit() async {
    print('[VideoCallScreen] _connectToLiveKit started');
    print('[VideoCallScreen] Creating Room instance...');
    _room = Room();
    _setupRoomListeners();

    print('[VideoCallScreen] Connecting to LiveKit...');
    print('[VideoCallScreen] roomUrl: ${_callResponse!.roomUrl}');
    await _room!.connect(
      _callResponse!.roomUrl,
      _callResponse!.token,
      roomOptions: const RoomOptions(
        adaptiveStream: true,
        dynacast: true,
      ),
    );
    print('[VideoCallScreen] LiveKit connected successfully');

    // On iOS, explicitly set speaker on after connection to ensure proper audio routing
    // This helps with iOS audio session management
    if (Platform.isIOS) {
      print('[VideoCallScreen] iOS: Setting speaker on for proper audio routing');
      try {
        await _room!.setSpeakerOn(_isSpeakerOn);
        print('[VideoCallScreen] iOS: Speaker set to $_isSpeakerOn');
      } catch (e) {
        print('[VideoCallScreen] iOS: Error setting speaker: $e');
      }
    }

    setState(() {
      _localParticipant = _room!.localParticipant;
    });

    print('[VideoCallScreen] Setting camera enabled: $_isCameraEnabled');
    await _localParticipant?.setCameraEnabled(_isCameraEnabled);
    print('[VideoCallScreen] Setting microphone enabled: $_isMicEnabled');
    await _localParticipant?.setMicrophoneEnabled(_isMicEnabled);
    print('[VideoCallScreen] _connectToLiveKit completed');
  }

  void _setupRoomListeners() {
    _room!.addListener(() {
      if (mounted) {
        setState(() {
          _remoteParticipants = _room!.remoteParticipants.values.toList();
        });
      }
    });

    // Listen for track mute/unmute and other events
    _room!.createListener().on((event) {
      if (event is TrackMutedEvent || event is TrackUnmutedEvent) {
        // Update UI when any track is muted/unmuted
        if (mounted) {
          setState(() {
            // Force rebuild to show/hide video properly
            _remoteParticipants = _room!.remoteParticipants.values.toList();
          });
        }
      } else if (event is DataReceivedEvent) {

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

  Future<void> _toggleCamera() async {
    setState(() {
      _isCameraEnabled = !_isCameraEnabled;
    });

    await _localParticipant?.setCameraEnabled(_isCameraEnabled);

    if (_myParticipant != null) {
      _socketService.toggleMedia(
        callId: widget.callId!,
        participantId: _myParticipant!.id,
        mediaType: 'video',
        enabled: _isCameraEnabled,
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

  Future<void> _switchCamera() async {
    try {
      // Show black screen overlay during switch
      setState(() => _showBlackScreen = true);

      final localVideoTrack = _localParticipant?.videoTrackPublications.firstOrNull?.track;
      if (localVideoTrack is LocalVideoTrack) {
        // Switch camera position
        final newPosition = _isFrontCamera ? CameraPosition.back : CameraPosition.front;
        await localVideoTrack.setCameraPosition(newPosition);

        // Update state
        if (mounted) {
          setState(() {
            _isFrontCamera = !_isFrontCamera;
          });
        }
      }

      // Hide black screen
      setState(() => _showBlackScreen = false);
    } catch (e) {
      setState(() => _showBlackScreen = false);
    }
  }

  /// Toggle screen sharing
  Future<void> _toggleScreenShare() async {
    if (_localParticipant == null) {
      _showError('Cannot share screen: not connected');
      return;
    }

    if (_isScreenSharing) {
      // Stop screen sharing
      await _stopScreenShare();
    } else {
      // Start screen sharing directly (native system dialog will show)
      await _startScreenShare();
    }
  }

  /// COMMENTED OUT: Custom screen share selection dialog
  /// Now using native system dialog only
  /*
  Future<void> _showScreenSharePermissionDialog() async {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    final dialogBg = isDarkMode ? const Color(0xFF2C2C2E) : Colors.white;
    final titleColor = isDarkMode ? Colors.white : Colors.black87;
    final contentColor = isDarkMode ? const Color(0xFF8E8E93) : Colors.black54;
    final selectedCardBg = const Color(0xFF6264A7);

    String selectedOption = 'entire_screen'; // Default: 'entire_screen' or 'this_screen'

    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
        backgroundColor: dialogBg,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
        ),
        contentPadding: const EdgeInsets.all(24),
        content: SizedBox(
          width: MediaQuery.of(context).size.width * 0.85,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header with icon and title
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF6264A7), Color(0xFF8B8FD8)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF6264A7).withOpacity(0.3),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.screen_share_rounded,
                      color: Colors.white,
                      size: 32,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Share Your Screen',
                          style: TextStyle(
                            color: titleColor,
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Choose what to share',
                          style: TextStyle(
                            color: contentColor,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Single colorful gradient card with dropdown
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF6264A7), Color(0xFF8B8FD8)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(18),
                  boxShadow: [
                    BoxShadow(
                      color: selectedCardBg.withOpacity(0.35),
                      blurRadius: 20,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        // Icon
                        Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: const Icon(
                            Icons.cast_rounded,
                            color: Colors.white,
                            size: 28,
                          ),
                        ),
                        const SizedBox(width: 16),
                        // Text content
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Screen Selection',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 17,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              SizedBox(height: 4),
                              Text(
                                'Select screen to share',
                                style: TextStyle(
                                  color: Colors.white70,
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                        ),
                        // Checkmark icon
                        Container(
                          padding: const EdgeInsets.all(6),
                          decoration: const BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.check_rounded,
                            color: Color(0xFF6264A7),
                            size: 18,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Dropdown selector
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: Colors.white.withOpacity(0.3),
                          width: 1.5,
                        ),
                      ),
                      child: DropdownButton<String>(
                        value: selectedOption,
                        isExpanded: true,
                        underline: const SizedBox(),
                        dropdownColor: const Color(0xFF6264A7),
                        icon: const Icon(Icons.arrow_drop_down, color: Colors.white),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                        ),
                        items: [
                          DropdownMenuItem(
                            value: 'entire_screen',
                            child: Row(
                              children: [
                                const Icon(Icons.smartphone_rounded, color: Colors.white, size: 20),
                                const SizedBox(width: 12),
                                Text('videocalls.entire_screen'.tr()),
                              ],
                            ),
                          ),
                          DropdownMenuItem(
                            value: 'this_screen',
                            child: Row(
                              children: [
                                const Icon(Icons.screenshot_rounded, color: Colors.white, size: 20),
                                const SizedBox(width: 12),
                                Text('videocalls.this_screen'.tr()),
                              ],
                            ),
                          ),
                        ],
                        onChanged: (String? newValue) {
                          if (newValue != null) {
                            setState(() {
                              selectedOption = newValue;
                            });
                          }
                        },
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Info box
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.orange.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: Colors.orange.withOpacity(0.3),
                    width: 1.5,
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.orange.withOpacity(0.2),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.privacy_tip_rounded,
                        color: Colors.orange,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'videocalls.privacy_notice'.tr(),
                            style: TextStyle(
                              color: isDarkMode ? Colors.white : Colors.black87,
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'videocalls.all_participants_see_content'.tr(),
                            style: TextStyle(
                              color: contentColor,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Action buttons
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => Navigator.pop(context, false),
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: Text(
                      'Cancel',
                      style: TextStyle(
                        color: contentColor,
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: () => Navigator.pop(context, true),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF6264A7),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 0,
                      shadowColor: const Color(0xFF6264A7).withOpacity(0.4),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.play_arrow_rounded, size: 20),
                        SizedBox(width: 6),
                        Text(
                          'Start Sharing',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        ),
      ),
    );

    if (result == true && mounted) {
      await _startScreenShare();
    }
  }
  */

  /// Start screen sharing using LiveKit's createScreenShareTrack API
  /// This approach is recommended for Android 14+ compatibility
  Future<void> _startScreenShare() async {
    // Safety check - must be connected to room
    if (_room == null || _localParticipant == null) {
      _showError('Cannot share screen: not connected to room');
      return;
    }

    try {
      // Disable auto-PiP before requesting screen share permission
      // This prevents the app from entering PiP mode when the system permission dialog appears
      await PipManager.enableAutoPip(false);

      // On Android 14+ (SDK 34+), we MUST have a foreground service with
      // FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION running BEFORE LiveKit requests permission.
      // We start our foreground service first, then let LiveKit handle the MediaProjection
      // permission request. This results in only ONE permission dialog (from LiveKit).
      if (Platform.isAndroid) {
        debugPrint('Starting foreground service for Android 14+ screen capture');
        final serviceStarted = await ScreenCaptureManager.startForegroundService();
        if (!serviceStarted) {
          await PipManager.enableAutoPip(true);
          debugPrint('Warning: Failed to start foreground service, but continuing...');
          // Don't return - LiveKit might still work with flutter_webrtc's built-in service
        } else {
          debugPrint('Foreground service started successfully');
        }
      }

      // Show loading indicator
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  ),
                ),
                const SizedBox(width: 12),
                Text('videocalls.preparing_screen_share'.tr()),
              ],
            ),
            duration: const Duration(seconds: 3),
            backgroundColor: const Color(0xFF6264A7),
          ),
        );
      }

      // Create screen share track using LiveKit's API
      // This will open the system media projection permission dialog
      // IMPORTANT: This must be called from a foreground UI context (button press)
      //
      // For iOS: We MUST use the Broadcast Extension to allow screen sharing
      // outside the app. This enables screen capture even when the app is in
      // the background or when viewing other apps.
      // NOTE: App Group is configured in Runner.entitlements and BroadcastExtension.entitlements
      final screenShareOptions = Platform.isIOS
          ? const ScreenShareCaptureOptions(
              useiOSBroadcastExtension: true,
              maxFrameRate: 15.0,
              params: VideoParametersPresets.screenShareH1080FPS15,
            )
          : const ScreenShareCaptureOptions(
              maxFrameRate: 15.0,
              params: VideoParametersPresets.screenShareH1080FPS15,
            );

      _screenShareTrack = await LocalVideoTrack.createScreenShareTrack(
        screenShareOptions,
      );

      if (_screenShareTrack == null) {
        throw Exception('Screen share track creation failed - user may have denied permission');
      }

      // Publish the screen share track to the room
      await _localParticipant!.publishVideoTrack(
        _screenShareTrack!,
        publishOptions: VideoPublishOptions(
          screenShareEncoding: VideoEncoding(
            maxBitrate: 1500 * 1000, // 1.5 Mbps
            maxFramerate: 15,
          ),
        ),
      );

      if (mounted) {
        setState(() {
          _isScreenSharing = true;
        });
      }

      // Notify via WebSocket
      if (_myParticipant != null && widget.callId != null) {
        _socketService.toggleMedia(
          callId: widget.callId!,
          participantId: _myParticipant!.id,
          mediaType: 'screen',
          enabled: true,
        );
      }

      // Re-enable auto-PiP after screen share is successfully started
      await PipManager.enableAutoPip(true);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.screen_share,
                    color: Colors.green,
                    size: 16,
                  ),
                ),
                const SizedBox(width: 12),
                Text('videocalls.screen_sharing_started'.tr()),
              ],
            ),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } catch (e, stackTrace) {
      // Re-enable auto-PiP even if screen share failed
      await PipManager.enableAutoPip(true);

      // Clean up track if it was created but publish failed
      if (_screenShareTrack != null) {
        try {
          await _screenShareTrack!.stop();
        } catch (_) {}
        _screenShareTrack = null;
      }

      // Stop the foreground service on error
      if (Platform.isAndroid) {
        await ScreenCaptureManager.stopForegroundService();
      }

      String errorMessage = 'Failed to start screen sharing';
      String errorDetails = '';
      final errorString = e.toString().toLowerCase();

      if (errorString.contains('timeout') || errorString.contains('emulator')) {
        errorMessage = 'Screen sharing not available';
        errorDetails = 'Screen sharing may not work in Android emulators. Please try on a real device.';
      } else if (errorString.contains('permission') || errorString.contains('denied')) {
        errorMessage = 'Permission denied';
        errorDetails = 'Please grant screen capture permission to share your screen.';
      } else if (errorString.contains('not supported') || errorString.contains('unsupported')) {
        errorMessage = 'Not supported';
        errorDetails = 'Screen sharing is not supported on this device.';
      } else if (errorString.contains('foreground')) {
        errorMessage = 'Foreground service required';
        errorDetails = 'Screen sharing requires app to be in foreground. Please try again.';
      } else {
        errorDetails = e.toString();
      }

      // Revert state on error
      if (mounted) {
        setState(() {
          _isScreenSharing = false;
          _screenShareTrack = null;
        });

        // Show detailed error dialog
        _showScreenShareErrorDialog(errorMessage, errorDetails);
      }
    }
  }

  /// Stop screen sharing - unpublish and stop the track
  Future<void> _stopScreenShare() async {
    try {
      // Stop the screen share track and unpublish
      if (_screenShareTrack != null) {
        await _screenShareTrack!.stop();
      }
      // Use setScreenShareEnabled(false) to properly unpublish
      if (_localParticipant != null) {
        await _localParticipant!.setScreenShareEnabled(false);
      }
      _screenShareTrack = null;

      // Stop the foreground service on Android
      if (Platform.isAndroid) {
        await ScreenCaptureManager.stopForegroundService();
      }

      if (mounted) {
        setState(() {
          _isScreenSharing = false;
        });
      }

      // Notify via WebSocket
      if (_myParticipant != null && widget.callId != null) {
        _socketService.toggleMedia(
          callId: widget.callId!,
          participantId: _myParticipant!.id,
          mediaType: 'screen',
          enabled: false,
        );
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.stop_screen_share, color: Colors.white, size: 20),
                const SizedBox(width: 12),
                Text('videocalls.screen_sharing_stopped'.tr()),
              ],
            ),
            backgroundColor: Colors.orange,
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      // Clean up track even if unpublish fails
      if (_screenShareTrack != null) {
        try {
          await _screenShareTrack!.stop();
        } catch (_) {}
      }
      _screenShareTrack = null;

      // Also stop foreground service on error
      if (Platform.isAndroid) {
        await ScreenCaptureManager.stopForegroundService();
      }

      // Ensure state is reset even if stop fails
      if (mounted) {
        setState(() {
          _isScreenSharing = false;
        });
      }
    }
  }

  /// Show attractive error dialog for screen share failures
  void _showScreenShareErrorDialog(String title, String details) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    final dialogBg = isDarkMode ? const Color(0xFF2C2C2E) : Colors.white;
    final titleColor = isDarkMode ? Colors.white : Colors.black87;
    final contentColor = isDarkMode ? const Color(0xFF8E8E93) : Colors.black54;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: dialogBg,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.red.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(
                Icons.error_outline,
                color: Colors.red,
                size: 28,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                title,
                style: TextStyle(
                  color: titleColor,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              details,
              style: TextStyle(
                color: contentColor,
                fontSize: 15,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.blue.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: Colors.blue.withOpacity(0.3),
                  width: 1,
                ),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.lightbulb_outline,
                    color: Colors.blue,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Screen sharing works best on physical devices',
                      style: TextStyle(
                        color: contentColor,
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
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF6264A7),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              elevation: 0,
            ),
            child: const Text(
              'Got it',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
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

  /// Show the invite people modal
  Future<void> _showInvitePeopleModal() async {
    if (widget.callId == null) {
      _showError('No call ID available');
      return;
    }

    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) {
      _showError('No workspace selected');
      return;
    }

    // Get existing invitees from call response if available
    List<String>? existingInvitees;
    if (_callResponse != null) {
      // The host is already in the call, add them to existing invitees
      final hostId = _callResponse!.call?.hostUserId;
      if (hostId != null) {
        existingInvitees = [hostId];
      }
    }

    await InvitePeopleBottomSheet.show(
      context,
      callId: widget.callId!,
      workspaceId: workspaceId,
      existingInvitees: existingInvitees,
    );
  }

  /// Copy the join link to clipboard
  Future<void> _copyJoinLink() async {
    if (widget.callId == null) {
      _showError('No call ID available');
      return;
    }

    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) {
      _showError('No workspace selected');
      return;
    }

    // Generate the join link in the same format as web: /call/{workspaceId}/{callId}
    final joinLink = '${EnvConfig.webAppUrl}/call/$workspaceId/${widget.callId}';

    try {
      await Clipboard.setData(ClipboardData(text: joinLink));

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                Icon(Icons.check_circle, color: Colors.white, size: 20),
                SizedBox(width: 8),
                Expanded(
                  child: Text('videocalls.join_link_copied'.tr()),
                ),
              ],
            ),
            backgroundColor: Color(0xFF6264A7),
            duration: Duration(seconds: 2),
          ),
        );
      }

    } catch (e) {
      _showError('videocalls.failed_copy_link'.tr());
    }
  }

  /// Fetch pending join requests (for host)
  Future<void> _fetchPendingJoinRequests() async {

    if (widget.callId == null) {
      return;
    }

    try {

      final requests = await _videoCallDao.getJoinRequests(widget.callId!);

      for (var r in requests) {
      }

      if (mounted) {
        setState(() {
          _joinRequests = requests;
        });

        if (requests.isNotEmpty) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('videocalls.pending_join_requests'.tr(args: [requests.length.toString()])),
              backgroundColor: Colors.blue,
            ),
          );
        }
      }
    } catch (e, stackTrace) {
    }
  }

  /// Handle accepting a join request
  Future<void> _handleAcceptRequest(String requestId) async {
    if (widget.callId == null) return;

    try {

      await _videoCallDao.acceptJoinRequest(widget.callId!, requestId);

      if (mounted) {
        setState(() {
          _joinRequests.removeWhere((r) => r.id == requestId);
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('videocalls.join_request_accepted'.tr()),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('videocalls.failed_accept_request'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// Handle rejecting a join request
  Future<void> _handleRejectRequest(String requestId) async {
    if (widget.callId == null) return;

    try {

      await _videoCallDao.rejectJoinRequest(widget.callId!, requestId);

      if (mounted) {
        setState(() {
          _joinRequests.removeWhere((r) => r.id == requestId);
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('videocalls.join_request_rejected'.tr()),
            backgroundColor: Colors.orange,
          ),
        );
      }
    } catch (e) {

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('videocalls.failed_reject_request'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _endCall() async {
    print('[VideoCallScreen] _endCall called');

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
      print('[VideoCallScreen] Error leaving call via API: $e');
    }

    // End CallKit call on iOS (only for incoming calls - we don't use CallKit for outgoing)
    if (Platform.isIOS && widget.isIncoming && widget.callId != null) {
      print('[VideoCallScreen] Ending CallKit call on iOS (incoming call)');
      await CallKitService.instance.endCall(widget.callId!);
    }

    if (mounted) {
      Navigator.of(context).pop('ended');
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    if (_isInitializing) {
      return Scaffold(
        backgroundColor: isDarkMode ? const Color(0xFF1C1C1E) : const Color(0xFFF5F5F5),
        body: Center(
          child: CircularProgressIndicator(
            color: isDarkMode ? Colors.white : const Color(0xFF6264A7),
          ),
        ),
      );
    }

    // Show simplified UI in PiP mode
    if (_isInPipMode) {
      return _buildPipView(isDarkMode);
    }

    return _buildFullScreenView(isDarkMode);
  }

  Widget _buildFullScreenView(bool isDarkMode) {
    return PopScope(
      canPop: _isInPipMode, // Allow navigation when in PiP mode
      onPopInvoked: (didPop) async {
        if (!didPop && !_isInPipMode) {
          // Not in PiP mode - enter PiP mode on back press
          await _handleBackButton();
        }
      },
      child: Scaffold(
        backgroundColor: isDarkMode ? const Color(0xFF1C1C1E) : const Color(0xFFF5F5F5),
        body: SafeArea(
        child: Stack(
          children: [
            // Main content
            Column(
              children: [
                // Top header
                _buildTopHeader(isDarkMode),

                // Main video area with participant
                Expanded(
                  child: _buildMainVideoArea(isDarkMode),
                ),

                // Control buttons grid
                _buildControlsGrid(isDarkMode),

                const SizedBox(height: 8),

                // End call button
                _buildEndCallButton(isDarkMode),

                const SizedBox(height: 12),
              ],
            ),

            // Local video preview removed - now shown in main grid

            // More options menu overlay
            if (_showMoreMenu) _buildMoreOptionsMenu(isDarkMode),

            // Chat overlay (if visible)
            if (_isChatVisible) _buildChatOverlay(isDarkMode),

            // // AI Panel overlay (if visible)
            // if (_showAIPanel) _buildAIPanelOverlay(isDarkMode),

            // Participants list (shown when button clicked)
            if (_showParticipantsList) _buildParticipantsList(isDarkMode),

            // Join request notifications (for host)
            Builder(
              builder: (context) {
                if (_joinRequests.isNotEmpty) {
                  return JoinRequestList(
                    requests: _joinRequests,
                    onAccept: _handleAcceptRequest,
                    onReject: _handleRejectRequest,
                  );
                }
                return const SizedBox.shrink();
              },
            ),
          ],
        ),
      ),
      ),
    );
  }

  /// Top header with back button, name, and call duration
  Widget _buildTopHeader(bool isDarkMode) {
    final textColor = isDarkMode ? Colors.white : Colors.black87;
    final subtextColor = isDarkMode ? const Color(0xFF8E8E93) : Colors.black54;
    final iconColor = isDarkMode ? Colors.white : Colors.black87;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          // Back button
          GestureDetector(
            onTap: () => _handleBackButton(),
            child: Container(
              padding: const EdgeInsets.all(8),
              child: Icon(
                Icons.arrow_back,
                color: iconColor,
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
                widget.callerName ?? widget.channelName ?? 'videocalls.video_call'.tr(),
                style: TextStyle(
                  color: textColor,
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
              Text(
                _formatDuration(_callDuration),
                style: TextStyle(
                  color: subtextColor,
                  fontSize: 13,
                ),
              ),
            ],
          ),

          const Spacer(),

          // Action icons
          IconButton(
            icon: Icon(Icons.chat_bubble_outline, color: iconColor),
            onPressed: () {
              setState(() {
                _isChatVisible = !_isChatVisible;
              });
            },
          ),
          IconButton(
            icon: Icon(
              _showParticipantsList ? Icons.people : Icons.people_outline,
              color: iconColor,
            ),
            onPressed: () {
              setState(() {
                _showParticipantsList = !_showParticipantsList;
              });
            },
          ),
        ],
      ),
    );
  }

  /// Main video area - shows LiveKit video grid for all participants
  Widget _buildMainVideoArea(bool isDarkMode) {
    // Show expanded video view if a participant is selected
    if (_expandedParticipant != null) {
      return _buildExpandedVideoView(isDarkMode);
    }

    // Collect all participants (local + remote)
    final allParticipants = <Map<String, dynamic>>[];

    // Add local participant
    if (_localParticipant != null) {
      // If local user is screen sharing, show screen share track
      if (_isScreenSharing && _screenShareTrack != null) {
        allParticipants.add({
          'participant': _localParticipant,
          'videoTrack': _screenShareTrack, // Already a LocalVideoTrack
          'isLocal': true,
          'name': '${_myParticipant?.displayName ?? 'videocalls.you'.tr()} (${'videocalls.screen'.tr()})',
          'isCameraEnabled': true,
          'avatar': null,
          'isScreenShare': true,
        });
      } else {
        // Show regular camera video
        final localVideoTrack = _localParticipant!.videoTrackPublications.firstOrNull?.track;
        allParticipants.add({
          'participant': _localParticipant,
          'videoTrack': localVideoTrack,
          'isLocal': true,
          'name': _myParticipant?.displayName ?? 'videocalls.you'.tr(),
          'isCameraEnabled': _isCameraEnabled,
          'avatar': _currentUserAvatar,
          'isScreenShare': false,
        });
      }
    }

    // Add remote participants
    for (var remoteParticipant in _remoteParticipants) {
      // Check for screen share track first (screen share takes priority)
      final screenSharePublication = remoteParticipant.trackPublications.values
          .whereType<RemoteTrackPublication<RemoteVideoTrack>>()
          .where((pub) => pub.source == TrackSource.screenShareVideo)
          .firstOrNull;
      final screenShareTrack = screenSharePublication?.track;

      // If screen sharing, show screen share track
      if (screenShareTrack != null && !screenShareTrack.muted && screenSharePublication?.subscribed == true) {
        allParticipants.add({
          'participant': remoteParticipant,
          'videoTrack': screenShareTrack,
          'isLocal': false,
          'name': '${remoteParticipant.name ?? remoteParticipant.identity ?? 'videocalls.participant'.tr()} (${'videocalls.screen'.tr()})',
          'isCameraEnabled': true, // Screen share is always "enabled" when present
          'avatar': null,
          'isScreenShare': true,
        });
        continue; // Skip adding regular video for this participant
      }

      // Otherwise show regular video track
      final videoPublication = remoteParticipant.videoTrackPublications.firstOrNull;
      final videoTrack = videoPublication?.track;

      // Check if video is actually enabled (not muted and subscribed)
      final isVideoEnabled = videoTrack != null &&
                            !videoTrack.muted &&
                            videoPublication?.subscribed == true;

      // Try to get avatar from participant metadata or use callerAvatar for incoming calls
      String? participantAvatar;
      try {
        final metadata = remoteParticipant.metadata;
        if (metadata != null && metadata.isNotEmpty) {
          final metadataJson = jsonDecode(metadata);
          participantAvatar = metadataJson['avatar'] ?? metadataJson['avatarUrl'];
        }
      } catch (e) {
        // Ignore metadata parsing errors
      }
      // Fallback to callerAvatar for single remote participant (1-on-1 call)
      if (participantAvatar == null && _remoteParticipants.length == 1) {
        participantAvatar = widget.callerAvatar;
      }

      allParticipants.add({
        'participant': remoteParticipant,
        'videoTrack': videoTrack,
        'isLocal': false,
        'name': remoteParticipant.name ?? remoteParticipant.identity ?? 'videocalls.participant'.tr(),
        'isCameraEnabled': isVideoEnabled,
        'avatar': participantAvatar,
        'isScreenShare': false,
      });
    }

    // If no participants, show placeholder
    if (allParticipants.isEmpty) {
      return _buildAvatarPlaceholder(
        widget.callerName ?? 'Waiting...',
        isDarkMode,
        avatarUrl: widget.callerAvatar,
      );
    }

    return Padding(
      padding: const EdgeInsets.all(8),
      child: _buildDynamicParticipantGrid(allParticipants, isDarkMode),
    );
  }

  /// Build dynamic grid based on participant count
  Widget _buildDynamicParticipantGrid(List<Map<String, dynamic>> participants, bool isDarkMode) {
    final int count = participants.length;

    // Calculate rows layout
    List<List<Map<String, dynamic>>> rows = [];

    if (count == 1) {
      // 1 user: full screen
      rows.add(participants);
    } else if (count == 2) {
      // 2 users: 2 rows (stacked vertically)
      rows.add(participants.sublist(0, 1));
      rows.add(participants.sublist(1, 2));
    } else if (count == 3) {
      // 3 users: first row with 2, second row with 1
      rows.add(participants.sublist(0, 2));
      rows.add(participants.sublist(2, 3));
    } else if (count == 4) {
      // 4 users: 2 rows with 2 columns each
      rows.add(participants.sublist(0, 2));
      rows.add(participants.sublist(2, 4));
    } else if (count == 5) {
      // 5 users: first row with 2, second row with 2, third row with 1
      rows.add(participants.sublist(0, 2));
      rows.add(participants.sublist(2, 4));
      rows.add(participants.sublist(4, 5));
    } else if (count == 6) {
      // 6 users: 2 rows with 3 columns each
      rows.add(participants.sublist(0, 3));
      rows.add(participants.sublist(3, 6));
    } else {
      // 7+ users: 3 columns per row with last row handling remainder
      int index = 0;
      while (index < count) {
        int remaining = count - index;
        int itemsInRow = remaining >= 3 ? 3 : remaining;
        rows.add(participants.sublist(index, index + itemsInRow));
        index += itemsInRow;
      }
    }

    return Column(
      children: rows.asMap().entries.map((entry) {
        return Expanded(
          child: _buildParticipantRow(entry.value, isDarkMode),
        );
      }).toList(),
    );
  }

  /// Build a row of participants
  Widget _buildParticipantRow(List<Map<String, dynamic>> rowParticipants, bool isDarkMode) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: rowParticipants.map((participant) {
          return Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: _buildParticipantTile(participant, isDarkMode),
            ),
          );
        }).toList(),
      ),
    );
  }

  /// Build individual participant tile
  Widget _buildParticipantTile(Map<String, dynamic> participantData, bool isDarkMode) {
    final videoTrack = participantData['videoTrack'];
    final isLocal = participantData['isLocal'] as bool;
    final name = participantData['name'] as String;
    final isCameraEnabled = participantData['isCameraEnabled'] as bool;
    final avatar = participantData['avatar'] as String?;
    final isScreenShare = participantData['isScreenShare'] as bool? ?? false;

    // Video container should always be dark for proper video display
    // Only the border color changes based on theme
    // Screen share gets a special green border
    final borderColor = isScreenShare
        ? Colors.green
        : (isLocal
            ? const Color(0xFF6264A7)
            : (isDarkMode ? Colors.white.withOpacity(0.2) : Colors.black.withOpacity(0.15)));

    return Container(
      decoration: BoxDecoration(
        // Always use dark background for video tiles - essential for video rendering
        color: const Color(0xFF1C1C1E),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: borderColor,
          width: isLocal ? 2 : 1,
        ),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Stack(
          fit: StackFit.expand,
          children: [
            // Dark background layer to ensure video is visible
            Container(color: Colors.black),

            // Video track or avatar
            // Use 'contain' for screen share to show entire screen without cropping
            // Use 'cover' for camera video to fill the tile
            // For local screen share, show a message instead of the actual screen (to avoid recursive view)
            if (isLocal && isScreenShare)
              _buildScreenSharingPlaceholder()
            else if (videoTrack != null && isCameraEnabled)
              videoTrack is LocalVideoTrack
                  ? VideoTrackRenderer(
                      videoTrack,
                      fit: isScreenShare ? VideoViewFit.contain : VideoViewFit.cover,
                    )
                  : videoTrack is RemoteVideoTrack
                      ? VideoTrackRenderer(
                          videoTrack,
                          fit: isScreenShare ? VideoViewFit.contain : VideoViewFit.cover,
                        )
                      : _buildAvatarPlaceholder(name, isDarkMode, avatarUrl: avatar)
            else
              _buildAvatarPlaceholder(name, isDarkMode, avatarUrl: avatar),

            // Name badge at bottom-left corner (compact)
            Positioned(
              bottom: 8,
              left: 8,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                constraints: const BoxConstraints(maxWidth: 150),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.7),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  name,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                  ),
                  overflow: TextOverflow.ellipsis,
                  maxLines: 1,
                ),
              ),
            ),

            // Black screen overlay during camera switch (local video only)
            if (isLocal && _showBlackScreen)
              Container(
                color: Colors.black,
              ),

            // Camera off indicator (center of tile)
            if (!isCameraEnabled)
              Center(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.7),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.videocam_off,
                    color: Colors.white,
                    size: 32,
                  ),
                ),
              ),

            // Screen share indicator (top-left)
            if (isScreenShare)
              Positioned(
                top: 8,
                left: 8,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.green,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.screen_share,
                        color: Colors.white,
                        size: 14,
                      ),
                      SizedBox(width: 4),
                      Text(
                        'Screen',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

            // Mic muted indicator (top-right)
            if ((isLocal && !_isMicEnabled) ||
                (!isLocal && participantData['participant'] is RemoteParticipant &&
                    (participantData['participant'] as RemoteParticipant).isMicrophoneEnabled() == false))
              Positioned(
                top: 8,
                right: 8,
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: const BoxDecoration(
                    color: Colors.red,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.mic_off,
                    color: Colors.white,
                    size: 16,
                  ),
                ),
              ),

            // Fullscreen button (bottom-right) - only show if video is enabled
            if (videoTrack != null && isCameraEnabled)
              Positioned(
                bottom: 8,
                right: 8,
                child: GestureDetector(
                  onTap: () => _showFullscreenVideo(participantData, isDarkMode),
                  child: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.6),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Icon(
                      Icons.fullscreen,
                      color: Colors.white,
                      size: 20,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  /// Show expanded video view for a participant (within call screen)
  void _showFullscreenVideo(Map<String, dynamic> participantData, bool isDarkMode) {
    final videoTrack = participantData['videoTrack'];
    if (videoTrack == null) return;

    setState(() {
      _expandedParticipant = participantData;
    });
  }

  /// Close expanded video view
  void _closeExpandedVideo() {
    setState(() {
      _expandedParticipant = null;
    });
  }

  /// Build expanded video view (shown within call screen, above participants grid)
  Widget _buildExpandedVideoView(bool isDarkMode) {
    if (_expandedParticipant == null) return const SizedBox.shrink();

    final videoTrack = _expandedParticipant!['videoTrack'];
    final name = _expandedParticipant!['name'] as String;
    final isScreenShare = _expandedParticipant!['isScreenShare'] as bool? ?? false;
    final avatar = _expandedParticipant!['avatar'] as String?;
    final isLocal = _expandedParticipant!['isLocal'] as bool? ?? false;

    return Container(
      color: Colors.black,
      child: Stack(
        fit: StackFit.expand,
        children: [
          // Video track
          GestureDetector(
            onTap: _closeExpandedVideo,
            child: Center(
              child: (isLocal && isScreenShare)
                  ? _buildScreenSharingPlaceholder()
                  : videoTrack is LocalVideoTrack
                      ? VideoTrackRenderer(
                          videoTrack,
                          fit: VideoViewFit.contain,
                        )
                      : videoTrack is RemoteVideoTrack
                          ? VideoTrackRenderer(
                              videoTrack,
                              fit: VideoViewFit.contain,
                            )
                          : _buildAvatarPlaceholder(name, isDarkMode, avatarUrl: avatar),
            ),
          ),

          // Close button (top-right)
          Positioned(
            top: 12,
            right: 12,
            child: GestureDetector(
              onTap: _closeExpandedVideo,
              child: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.6),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.fullscreen_exit,
                  color: Colors.white,
                  size: 24,
                ),
              ),
            ),
          ),

          // Participant name (top-left)
          Positioned(
            top: 12,
            left: 12,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.6),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (isScreenShare) ...[
                    const Icon(
                      Icons.screen_share,
                      color: Colors.green,
                      size: 16,
                    ),
                    const SizedBox(width: 6),
                  ],
                  Text(
                    name,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Tap to minimize hint (bottom center)
          Positioned(
            bottom: 12,
            left: 0,
            right: 0,
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.4),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Text(
                  'Tap to minimize',
                  style: TextStyle(
                    color: Colors.white60,
                    fontSize: 11,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Build placeholder for local screen sharing (instead of showing recursive screen)
  Widget _buildScreenSharingPlaceholder() {
    return Container(
      color: const Color(0xFF1C1C1E),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.green.withOpacity(0.2),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.screen_share,
                color: Colors.green,
                size: 40,
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'You are sharing\nyour screen',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.white,
                fontSize: 14,
                fontWeight: FontWeight.w500,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Others can see your screen',
              style: TextStyle(
                color: Colors.white.withOpacity(0.6),
                fontSize: 11,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Build avatar placeholder when video is not available
  Widget _buildAvatarPlaceholder(String name, bool isDarkMode, {String? avatarUrl}) {
    final innerCircleColor = isDarkMode ? const Color(0xFF3A3A3C) : const Color(0xFFE0E0E0);
    final textColor = isDarkMode ? Colors.white : Colors.black87;

    return LayoutBuilder(
      builder: (context, constraints) {
        // Calculate avatar size based on available height (leave room for name)
        final maxAvatarSize = (constraints.maxHeight - 20).clamp(40.0, 80.0);
        final avatarSize = maxAvatarSize;
        final fontSize = (avatarSize / 2).clamp(16.0, 40.0);

        return Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: avatarSize,
                height: avatarSize,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: avatarUrl == null || avatarUrl.isEmpty
                      ? LinearGradient(
                          colors: [Color(0xFF6264A7), Color(0xFF8B8FD8)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        )
                      : null,
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF6264A7).withOpacity(0.3),
                      blurRadius: 20,
                      spreadRadius: 5,
                    ),
                  ],
                ),
                child: avatarUrl != null && avatarUrl.isNotEmpty
                    ? CircleAvatar(
                        radius: avatarSize / 2,
                        backgroundImage: NetworkImage(avatarUrl),
                        backgroundColor: innerCircleColor,
                        onBackgroundImageError: (_, __) {},
                        child: null,
                      )
                    : Padding(
                        padding: const EdgeInsets.all(4),
                        child: Container(
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: innerCircleColor,
                          ),
                          child: Center(
                            child: Text(
                              name.isNotEmpty ? name[0].toUpperCase() : '?',
                              style: TextStyle(
                                fontSize: fontSize,
                                color: Colors.white,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                      ),
              ),
              const SizedBox(height: 4),
              Text(
                name,
                style: TextStyle(
                  color: textColor,
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        );
      },
    );
  }

  /// Controls grid - compact single row
  Widget _buildControlsGrid(bool isDarkMode) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _buildGridButton(
              icon: _isMicEnabled ? Icons.mic : Icons.mic_off,
              label: 'videocalls.mic'.tr(),
              onTap: _toggleMic,
              isActive: _isMicEnabled,
              isDarkMode: isDarkMode,
            ),
            const SizedBox(width: 8),
            _buildGridButton(
              icon: _isCameraEnabled ? Icons.videocam : Icons.videocam_off,
              label: 'videocalls.video'.tr(),
              onTap: _toggleCamera,
              isActive: _isCameraEnabled,
              isDarkMode: isDarkMode,
            ),
            const SizedBox(width: 8),
            _buildGridButton(
              icon: _isSpeakerOn ? Icons.volume_up : Icons.phone_in_talk,
              label: 'videocalls.speaker'.tr(),
              onTap: _toggleSpeaker,
              isActive: _isSpeakerOn,
              isDarkMode: isDarkMode,
            ),
            const SizedBox(width: 8),
            _buildGridButton(
              icon: Icons.switch_camera,
              label: 'videocalls.flip'.tr(),
              onTap: _switchCamera,
              isActive: false,
              isDarkMode: isDarkMode,
            ),
            const SizedBox(width: 8),
            _buildGridButton(
              icon: _isScreenSharing ? Icons.stop_screen_share : Icons.screen_share,
              label: 'videocalls.share'.tr(),
              onTap: _toggleScreenShare,
              isActive: _isScreenSharing,
              isDarkMode: isDarkMode,
            ),
            const SizedBox(width: 8),
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
              isDarkMode: isDarkMode,
            ),
          ],
        ),
      ),
    );
  }

  /// Grid button (Compact style)
  Widget _buildGridButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    required bool isActive,
    required bool isDarkMode,
    bool showBorder = false,
  }) {
    final buttonBg = isDarkMode ? const Color(0xFF2C2C2E) : Colors.white;
    final activeColor = isDarkMode ? Colors.white : Colors.black87;
    final inactiveColor = isDarkMode ? const Color(0xFF8E8E93) : Colors.black54;
    final borderColor = isDarkMode ? const Color(0xFF8E8E93) : Colors.black26;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 65,
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
        decoration: BoxDecoration(
          color: buttonBg,
          borderRadius: BorderRadius.circular(8),
          border: showBorder
              ? Border.all(color: borderColor, width: 1.5)
              : null,
          boxShadow: isDarkMode
              ? null
              : [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              color: isActive ? activeColor : inactiveColor,
              size: 22,
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                color: isActive ? activeColor : inactiveColor,
                fontSize: 10,
                fontWeight: FontWeight.w500,
              ),
              overflow: TextOverflow.ellipsis,
              maxLines: 1,
            ),
          ],
        ),
      ),
    );
  }

  /// End call button
  Widget _buildEndCallButton(bool isDarkMode) {
    return GestureDetector(
      onTap: () => _showLeaveConfirmation(isDarkMode),
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 24),
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
        decoration: BoxDecoration(
          color: const Color(0xFFC4314B),
          borderRadius: BorderRadius.circular(8),
        ),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.call_end, color: Colors.white, size: 20),
            SizedBox(width: 8),
            Text(
              'End call',
              style: TextStyle(
                color: Colors.white,
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// More options menu (bottom sheet style)
  Widget _buildMoreOptionsMenu(bool isDarkMode) {
    final sheetBg = isDarkMode ? const Color(0xFF2C2C2E) : Colors.white;
    final handleColor = isDarkMode ? const Color(0xFF5A5A5A) : Colors.grey.shade300;
    final textColor = isDarkMode ? Colors.white : Colors.black87;
    final iconColor = isDarkMode ? Colors.white : Colors.black87;

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
                decoration: BoxDecoration(
                  color: sheetBg,
                  borderRadius: const BorderRadius.only(
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
                        color: handleColor,
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
                              color: textColor,
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          IconButton(
                            icon: Icon(Icons.close, color: iconColor),
                            onPressed: () => setState(() => _showMoreMenu = false),
                          ),
                        ],
                      ),
                    ),
                    _buildMoreMenuItem(
                      icon: Icons.person_add,
                      title: 'videocalls.invite_people'.tr(),
                      subtitle: 'videocalls.invite_workspace_members'.tr(),
                      onTap: () {
                        setState(() => _showMoreMenu = false);
                        _showInvitePeopleModal();
                      },
                      iconColor: const Color(0xFF6264A7),
                      isDarkMode: isDarkMode,
                    ),
                    _buildMoreMenuItem(
                      icon: Icons.link,
                      title: 'videocalls.copy_join_link'.tr(),
                      subtitle: 'videocalls.share_link_invite_others'.tr(),
                      onTap: () {
                        setState(() => _showMoreMenu = false);
                        _copyJoinLink();
                      },
                      iconColor: const Color(0xFF6264A7),
                      isDarkMode: isDarkMode,
                    ),
                    // _buildMoreMenuItem(
                    //   icon: _isRecording ? Icons.stop_circle : Icons.fiber_manual_record,
                    //   title: _isRecording ? 'Stop Recording' : 'Start Recording',
                    //   subtitle: _isRecording ? 'Recording in progress' : 'Record this call',
                    //   onTap: () {
                    //     setState(() {
                    //       _isRecording = !_isRecording;
                    //       _showMoreMenu = false;
                    //     });
                    //   },
                    //   iconColor: _isRecording ? Colors.red : (isDarkMode ? const Color(0xFF8E8E93) : Colors.grey),
                    //   isDarkMode: isDarkMode,
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
                    //   isDarkMode: isDarkMode,
                    // ),
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
    required bool isDarkMode,
  }) {
    final iconBgColor = isDarkMode ? const Color(0xFF3A3A3C) : const Color(0xFFF0F0F0);
    final titleColor = isDarkMode ? Colors.white : Colors.black87;
    final subtitleColor = isDarkMode ? const Color(0xFF8E8E93) : Colors.black54;
    final chevronColor = isDarkMode ? const Color(0xFF8E8E93) : Colors.black38;

    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: iconBgColor,
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
                    style: TextStyle(
                      color: titleColor,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(
                      color: subtitleColor,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
            Icon(Icons.chevron_right, color: chevronColor),
          ],
        ),
      ),
    );
  }

  Widget _buildChatOverlay(bool isDarkMode) {
    final panelBg = isDarkMode ? const Color(0xFF2C2C2E) : Colors.white;
    final borderColor = isDarkMode ? const Color(0xFF3A3A3C) : Colors.grey.shade200;
    final textColor = isDarkMode ? Colors.white : Colors.black87;
    final hintColor = isDarkMode ? const Color(0xFF8E8E93) : Colors.black45;
    final inputBg = isDarkMode ? const Color(0xFF3A3A3C) : const Color(0xFFF5F5F5);
    final emptyIconColor = isDarkMode ? const Color(0xFF5A5A5A) : Colors.grey.shade400;

    return Positioned(
      right: 0,
      top: 0,
      bottom: 0,
      child: Container(
        width: 320,
        decoration: BoxDecoration(
          color: panelBg,
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
              decoration: BoxDecoration(
                border: Border(bottom: BorderSide(color: borderColor)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.chat_bubble, color: Color(0xFF6264A7), size: 20),
                      const SizedBox(width: 8),
                      Text(
                        'Chat',
                        style: TextStyle(
                          color: textColor,
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  IconButton(
                    icon: Icon(Icons.close, color: textColor),
                    onPressed: () => setState(() => _isChatVisible = false),
                  ),
                ],
              ),
            ),

            // Chat messages
            Expanded(
              child: _chatMessages.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.chat_bubble_outline,
                            color: emptyIconColor,
                            size: 48,
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'No messages yet',
                            style: TextStyle(
                              color: hintColor,
                              fontSize: 16,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Start a conversation',
                            style: TextStyle(
                              color: emptyIconColor,
                              fontSize: 14,
                            ),
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
                        return _buildChatMessage(message, isMe, isDarkMode);
                      },
                    ),
            ),

            // Chat input
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                border: Border(top: BorderSide(color: borderColor)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _chatController,
                      style: TextStyle(color: textColor),
                      decoration: InputDecoration(
                        hintText: 'videocalls.type_message'.tr(),
                        hintStyle: TextStyle(color: hintColor),
                        filled: true,
                        fillColor: inputBg,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
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

  Widget _buildChatMessage(Map<String, dynamic> message, bool isMe, bool isDarkMode) {
    final senderColor = isDarkMode ? const Color(0xFF8E8E93) : Colors.black54;
    final otherMsgBg = isDarkMode ? const Color(0xFF3A3A3C) : const Color(0xFFE8E8E8);
    final otherMsgTextColor = isDarkMode ? Colors.white : Colors.black87;
    final timeColor = isDarkMode ? const Color(0xFF5A5A5A) : Colors.black38;

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
                  style: TextStyle(
                    color: senderColor,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            Container(
              constraints: const BoxConstraints(maxWidth: 240),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: isMe ? const Color(0xFF6264A7) : otherMsgBg,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                message['content'],
                style: TextStyle(
                  color: isMe ? Colors.white : otherMsgTextColor,
                  fontSize: 14,
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(top: 4, left: 4, right: 4),
              child: Text(
                _formatMessageTime(message['timestamp']),
                style: TextStyle(
                  color: timeColor,
                  fontSize: 11,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatMessageTime(DateTime timestamp) {
    final now = DateTime.now();
    final diff = now.difference(timestamp);

    if (diff.inMinutes < 1) {
      return 'Just now';
    } else if (diff.inHours < 1) {
      return '${diff.inMinutes}m ago';
    } else {
      return '${timestamp.hour}:${timestamp.minute.toString().padLeft(2, '0')}';
    }
  }

  void _sendChatMessage() async {
    final message = _chatController.text.trim();
    if (message.isEmpty) return;

    final currentUserId = AuthService.instance.currentUser?.id;
    final messageId = const Uuid().v4();

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

    // Send via WebSocket
    if (widget.callId != null) {
      try {
        _socketService.sendChatMessage(
          callId: widget.callId!,
          content: message,
        );
      } catch (e) {
        // Handle send error silently
      }
    }

    // Clear input
    _chatController.clear();
  }

  Widget _buildAIPanelOverlay(bool isDarkMode) {
    final panelBg = isDarkMode ? const Color(0xFF2C2C2E) : Colors.white;
    final textColor = isDarkMode ? Colors.white : Colors.black87;
    final hintColor = isDarkMode ? const Color(0xFF8E8E93) : Colors.black54;

    return Positioned(
      right: 0,
      top: 0,
      bottom: 0,
      child: Container(
        width: 320,
        color: panelBg,
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.auto_awesome, color: Color(0xFF6264A7)),
                      const SizedBox(width: 8),
                      Text(
                        'AI Features',
                        style: TextStyle(
                          color: textColor,
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  IconButton(
                    icon: Icon(Icons.close, color: textColor),
                    onPressed: () => setState(() => _showAIPanel = false),
                  ),
                ],
              ),
            ),
            Expanded(
              child: Center(
                child: Text(
                  'AI features available',
                  style: TextStyle(color: hintColor),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Local video preview (floating in corner) - always mirrored for front camera
  Widget _buildLocalVideoPreview() {
    final localVideoTrack = _localParticipant?.videoTrackPublications.firstOrNull?.track;

    if (localVideoTrack == null || localVideoTrack is! LocalVideoTrack) {
      return const SizedBox.shrink();
    }

    return Positioned(
      top: 80,
      right: 16,
      child: GestureDetector(
        onTap: () {
          // Optional: Allow user to swap main and preview videos
        },
        child: Container(
          width: 120,
          height: 160,
          decoration: BoxDecoration(
            color: Colors.black,  // Add solid background
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFF6264A7), width: 2),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.5),
                blurRadius: 12,
                spreadRadius: 2,
              ),
            ],
          ),
          clipBehavior: Clip.hardEdge,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: Container(
              color: Colors.black,
              child: VideoTrackRenderer(
                localVideoTrack,
                fit: VideoViewFit.cover,
              ),
            ),
          ),
        ),
      ),
    );
  }

  /// Build participants list overlay (top-left corner)
  Widget _buildParticipantsList(bool isDarkMode) {
    final containerBg = isDarkMode ? const Color(0xFF2C2C2E) : Colors.white;
    final borderColor = isDarkMode ? Colors.white.withOpacity(0.1) : Colors.black.withOpacity(0.1);
    final textColor = isDarkMode ? Colors.white : Colors.black87;
    final closeIconColor = isDarkMode ? const Color(0xFF8E8E93) : Colors.black45;
    final dividerColor = isDarkMode ? Colors.white24 : Colors.black12;

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
        constraints: const BoxConstraints(maxWidth: 250),
        decoration: BoxDecoration(
          color: containerBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: borderColor),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.3),
              blurRadius: 10,
              spreadRadius: 2,
            ),
          ],
        ),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header with close button
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.people,
                  color: Color(0xFF6264A7),
                  size: 18,
                ),
                const SizedBox(width: 8),
                Text(
                  'videocalls.participants_count'.tr(args: [allParticipants.length.toString()]),
                  style: TextStyle(
                    color: textColor,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(width: 8),
                InkWell(
                  onTap: () => setState(() => _showParticipantsList = false),
                  child: Icon(
                    Icons.close,
                    color: closeIconColor,
                    size: 18,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Divider(color: dividerColor, height: 1),
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
                              : textColor,
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

  /// Build Picture-in-Picture view (simplified floating UI)
  /// Note: PiP view stays dark for better contrast even in light mode
  Widget _buildPipView(bool isDarkMode) {
    // Check for screen share first (prioritize screen share over camera)
    VideoTrack? screenShareTrack;
    String screenSharerName = '';
    bool isViewingScreenShare = false;

    for (var remoteParticipant in _remoteParticipants) {
      final screenSharePublication = remoteParticipant.trackPublications.values
          .whereType<RemoteTrackPublication<RemoteVideoTrack>>()
          .where((pub) => pub.source == TrackSource.screenShareVideo)
          .firstOrNull;

      if (screenSharePublication != null &&
          screenSharePublication.track != null &&
          !screenSharePublication.track!.muted &&
          screenSharePublication.subscribed == true) {
        screenShareTrack = screenSharePublication.track;
        screenSharerName = '${remoteParticipant.name ?? remoteParticipant.identity ?? 'Participant'} (Screen)';
        isViewingScreenShare = true;
        break;
      }
    }

    // Get the first remote participant or show local view
    final remoteParticipant = _remoteParticipants.firstOrNull;

    VideoTrack? videoTrack;
    String participantName = 'videocalls.you'.tr();
    bool isCameraEnabled = false;

    // Use screen share if available, otherwise use camera
    if (isViewingScreenShare && screenShareTrack != null) {
      videoTrack = screenShareTrack;
      participantName = screenSharerName;
      isCameraEnabled = true;
    } else if (remoteParticipant != null) {
      // Show remote participant camera
      final videoPublication = remoteParticipant.videoTrackPublications.firstOrNull;
      videoTrack = videoPublication?.track as VideoTrack?;
      participantName = remoteParticipant.name ?? remoteParticipant.identity ?? 'Participant';
      isCameraEnabled = videoTrack != null &&
                       !videoTrack.muted &&
                       videoPublication?.subscribed == true;
    } else if (_localParticipant != null) {
      // Show local participant
      videoTrack = _localParticipant?.videoTrackPublications.firstOrNull?.track as VideoTrack?;
      participantName = 'videocalls.you'.tr();
      isCameraEnabled = _isCameraEnabled && videoTrack != null;
    }

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Video or avatar placeholder
          // Use 'contain' for screen share to show full screen, 'cover' for camera
          if (videoTrack != null && isCameraEnabled)
            VideoTrackRenderer(
              videoTrack,
              fit: isViewingScreenShare ? VideoViewFit.contain : VideoViewFit.cover,
            )
          else
            Container(
              color: const Color(0xFF1C1C1E),
              child: Center(
                child: widget.callerAvatar != null && widget.callerAvatar!.isNotEmpty
                    ? CircleAvatar(
                        radius: 40,
                        backgroundImage: NetworkImage(widget.callerAvatar!),
                        backgroundColor: const Color(0xFF3A3A3C),
                      )
                    : Container(
                        width: 80,
                        height: 80,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: LinearGradient(
                            colors: [Color(0xFF6264A7), Color(0xFF8B8FD8)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                        ),
                        child: Center(
                          child: Text(
                            participantName.isNotEmpty
                                ? participantName.substring(0, 1).toUpperCase()
                                : 'C',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 32,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
              ),
            ),

          // Screen share indicator (top-left) - only when viewing screen share
          if (isViewingScreenShare)
            Positioned(
              top: 8,
              left: 8,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                decoration: BoxDecoration(
                  color: Colors.green,
                  borderRadius: BorderRadius.circular(4),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.screen_share,
                      color: Colors.white,
                      size: 12,
                    ),
                    SizedBox(width: 4),
                    Text(
                      'Screen',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),

          // Name badge at bottom
          Positioned(
            bottom: 8,
            left: 8,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.6),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                participantName,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),

          // Mic status indicator
          if (!_isMicEnabled)
            Positioned(
              top: 8,
              right: 8,
              child: Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: Colors.red.withOpacity(0.8),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.mic_off,
                  color: Colors.white,
                  size: 16,
                ),
              ),
            ),

          // Self-preview (local camera) - only show when NOT viewing screen share
          // Hide during screen share to avoid blocking the shared screen content
          if (!isViewingScreenShare &&
              _localParticipant?.videoTrackPublications.isNotEmpty == true &&
              remoteParticipant != null)
            Positioned(
              top: 8,
              left: 8,
              child: Container(
                width: 50,
                height: 75,
                decoration: BoxDecoration(
                  color: Colors.black,
                  border: Border.all(color: Colors.white.withOpacity(0.5), width: 1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(5),
                  child: Builder(
                    builder: (context) {
                      final localVideoTrack = _localParticipant
                          ?.videoTrackPublications.firstOrNull?.track as VideoTrack?;
                      if (localVideoTrack != null && !localVideoTrack.muted) {
                        return VideoTrackRenderer(localVideoTrack, fit: VideoViewFit.cover);
                      }
                      return Container(
                        color: const Color(0xFF1C1C1E),
                        child: const Icon(
                          Icons.person,
                          color: Colors.white38,
                          size: 24,
                        ),
                      );
                    },
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  /// Handle back button - Show floating bubble and navigate back
  Future<void> _handleBackButton() async {
    if (_room == null || !mounted) return;

    final currentRoom = _room;

    // Disable auto-PiP while floating bubble is active
    PipManager.enableAutoPip(false);

    // Show floating bubble overlay
    CallOverlayService.instance.showBubble(
      context,
      room: currentRoom!,
      callId: widget.callId ?? '',
      callerName: widget.callerName ?? widget.channelName,
      micEnabled: _isMicEnabled,
      cameraEnabled: _isCameraEnabled,
      onTap: (bubbleContext) {
        // Bubble tapped - open video call screen with existing room
        Navigator.of(bubbleContext).push(
          MaterialPageRoute(
            builder: (context) => VideoCallScreen(
              callId: widget.callId,
              channelName: widget.channelName,
              callerName: widget.callerName,
              callerAvatar: widget.callerAvatar,
              isIncoming: widget.isIncoming,
              participants: widget.participants,
              isAudioOnly: widget.isAudioOnly,
              initialMicEnabled: _isMicEnabled,
              existingRoom: currentRoom,
            ),
          ),
        ).then((_) {
        });
      },
    );

    // Navigate back to previous screen
    if (mounted) {
      Navigator.of(context).pop();
    }
  }

  void _showLeaveConfirmation(bool isDarkMode) {
    final dialogBg = isDarkMode ? const Color(0xFF2C2C2E) : Colors.white;
    final titleColor = isDarkMode ? Colors.white : Colors.black87;
    final contentColor = isDarkMode ? const Color(0xFF8E8E93) : Colors.black54;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: dialogBg,
        title: Text('videocalls.leave_call_question'.tr(), style: TextStyle(color: titleColor)),
        content: Text(
          'videocalls.leave_call_confirm'.tr(),
          style: TextStyle(color: contentColor),
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
