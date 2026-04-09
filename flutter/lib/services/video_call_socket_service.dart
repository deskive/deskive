import 'dart:async';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../models/video_call.dart';
import '../models/videocalls/join_request.dart';
import 'callkit_service.dart';
import 'socket_io_chat_service.dart';

/// Video Call WebSocket Service
/// Handles real-time events for video calls
class VideoCallSocketService {
  // Singleton pattern
  static VideoCallSocketService? _instance;
  static VideoCallSocketService get instance {
    if (_instance == null) {
      throw Exception('VideoCallSocketService not initialized. Call initialize() first.');
    }
    return _instance!;
  }

  IO.Socket? _socket;
  final String serverUrl;
  final String Function() getToken;

  // Event streams
  final _incomingCallController = StreamController<IncomingCallData>.broadcast();
  final _participantJoinedController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _participantLeftController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _mediaUpdatedController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _handRaisedController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _chatMessageController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _recordingStatusController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _connectionStatusController = StreamController<bool>.broadcast();
  final _callEndedController = StreamController<Map<String, dynamic>>.broadcast();

  // Join request event streams
  final _joinRequestNewController = StreamController<JoinRequest>.broadcast();
  final _joinRequestAcceptedController =
      StreamController<JoinRequestAcceptedData>.broadcast();
  final _joinRequestRejectedController =
      StreamController<JoinRequestRejectedData>.broadcast();

  // Public streams
  Stream<IncomingCallData> get onIncomingCall => _incomingCallController.stream;
  Stream<Map<String, dynamic>> get onParticipantJoined =>
      _participantJoinedController.stream;
  Stream<Map<String, dynamic>> get onParticipantLeft =>
      _participantLeftController.stream;
  Stream<Map<String, dynamic>> get onMediaUpdated =>
      _mediaUpdatedController.stream;
  Stream<Map<String, dynamic>> get onHandRaised => _handRaisedController.stream;
  Stream<Map<String, dynamic>> get onChatMessage =>
      _chatMessageController.stream;
  Stream<Map<String, dynamic>> get onRecordingStatus =>
      _recordingStatusController.stream;
  Stream<bool> get onConnectionStatus => _connectionStatusController.stream;
  Stream<Map<String, dynamic>> get onCallEnded => _callEndedController.stream;

  // Join request streams (for host and requester)
  Stream<JoinRequest> get onJoinRequestNew => _joinRequestNewController.stream;
  Stream<JoinRequestAcceptedData> get onJoinRequestAccepted =>
      _joinRequestAcceptedController.stream;
  Stream<JoinRequestRejectedData> get onJoinRequestRejected =>
      _joinRequestRejectedController.stream;

  VideoCallSocketService._({
    required this.serverUrl,
    required this.getToken,
  });

  /// Initialize the singleton instance
  static Future<void> initialize({
    required String serverUrl,
    required String Function() getToken,
  }) async {
    if (_instance != null) {
      _instance!.disconnect();
    }

    _instance = VideoCallSocketService._(
      serverUrl: serverUrl,
      getToken: getToken,
    );

    // Auto-connect
    await _instance!.connect();
  }

  /// Connect to video call WebSocket namespace
  Future<void> connect() async {
    if (_socket != null && _socket!.connected) {
      return;
    }


    // Get the token and log it (masked for security)
    final token = getToken();
    final tokenPreview = token.isNotEmpty
        ? '${token.substring(0, token.length > 20 ? 20 : token.length)}...'
        : 'EMPTY';

    if (token.isEmpty) {
    }

    final completer = Completer<void>();

    _socket = IO.io(
      '$serverUrl/video-calls',
      IO.OptionBuilder()
          .setTransports(['websocket'])
          .enableAutoConnect()
          .enableReconnection()
          .setReconnectionAttempts(5)
          .setReconnectionDelay(1000)
          .setAuth({'token': token})
          .build(),
    );

    // Wait for connection before proceeding
    _socket!.onConnect((_) {
      if (!completer.isCompleted) {
        completer.complete();
      }
    });

    _socket!.onConnectError((error) {
      if (!completer.isCompleted) {
        completer.completeError('Connection failed: $error');
      }
    });

    _setupEventListeners();

    // Wait for connection with timeout
    await completer.future.timeout(
      const Duration(seconds: 10),
      onTimeout: () {
        throw Exception('WebSocket connection timeout');
      },
    );
  }

  /// Setup all event listeners
  void _setupEventListeners() {
    // Connection events
    _socket!.onConnect((_) {
      debugPrint('✅ [VideoCallSocketService] Socket connected successfully');
      _connectionStatusController.add(true);
    });

    _socket!.onDisconnect((reason) {
      debugPrint('⚠️ [VideoCallSocketService] Socket disconnected: $reason');
      _connectionStatusController.add(false);
    });

    _socket!.onConnectError((error) {
      debugPrint('❌ [VideoCallSocketService] Socket connection error: $error');
      _connectionStatusController.add(false);
    });

    _socket!.onError((error) {
      debugPrint('❌ [VideoCallSocketService] Socket error: $error');
    });

    // Incoming call notification
    _socket!.on('call:incoming', (data) {
      try {
        final incomingCall = IncomingCallData.fromJson(data);

        // ⭐ IMPORTANT: Only emit to stream - IncomingCallManager will show the UI ⭐
        // When app is in FOREGROUND: IncomingCallManager shows app's incoming call UI
        // When app is in BACKGROUND/TERMINATED: FCM shows CallKit notification
        // This prevents duplicate notifications
        _incomingCallController.add(incomingCall);

        final appLifecycleState = WidgetsBinding.instance.lifecycleState;
        final isAppInForeground = appLifecycleState == AppLifecycleState.resumed;

        if (isAppInForeground) {
        } else {
        }
      } catch (e) {
      }
    });

    // Call cancelled event - when caller ends the call before callee answers
    _socket!.on('call:cancelled', (data) {
      debugPrint('📞 [VideoCallSocketService] Received call:cancelled event: $data');
      try {
        // Forward this event to SocketIOChatService's videoCallStream
        // so IncomingCallScreen can handle it
        if (data is Map<String, dynamic>) {
          final callId = data['callId'] ?? data['call_id'] ?? '';
          debugPrint('📞 [VideoCallSocketService] Call $callId was cancelled by caller');
          // Create a VideoCallEvent and add to SocketIOChatService
          SocketIOChatService.instance.handleExternalVideoCallEvent(data, 'cancelled');
        }
      } catch (e) {
        debugPrint('❌ [VideoCallSocketService] Error handling call:cancelled: $e');
      }
    });

    // Call ended event - when the call is terminated (e.g., other participant left 1:1 call)
    _socket!.on('call:ended', (data) {
      debugPrint('📞 [VideoCallSocketService] Received call:ended event: $data');
      try {
        if (data is Map<String, dynamic>) {
          final callId = data['callId'] ?? data['call_id'] ?? '';
          debugPrint('📞 [VideoCallSocketService] Call $callId has ended');
          _callEndedController.add(data);

          // Also forward to SocketIOChatService for IncomingCallScreen handling
          SocketIOChatService.instance.handleExternalVideoCallEvent(data, 'ended');

          // Dismiss CallKit on iOS
          if (Platform.isIOS && callId.toString().isNotEmpty) {
            debugPrint('📞 [VideoCallSocketService] Dismissing CallKit for ended call: $callId');
            CallKitService.instance.endCall(callId);
          }
        }
      } catch (e) {
        debugPrint('❌ [VideoCallSocketService] Error handling call:ended: $e');
      }
    });

    // Participant events
    _socket!.on('participant:joined', (data) {
      _participantJoinedController.add(data);
    });

    _socket!.on('participant:left', (data) {
      _participantLeftController.add(data);
    });

    _socket!.on('participant:disconnected', (data) {
      _participantLeftController.add(data);
    });

    _socket!.on('participant:media_updated', (data) {
      _mediaUpdatedController.add(data);
    });

    _socket!.on('participant:hand_updated', (data) {
      _handRaisedController.add(data);
    });

    _socket!.on('participant:quality_degraded', (data) {
      // Can emit this through a separate stream if needed
    });

    // Chat events
    _socket!.on('chat:message_received', (data) {
      _chatMessageController.add(data);
    });

    _socket!.on('chat:reaction_added', (data) {
      _chatMessageController.add(data);
    });

    // Recording events
    _socket!.on('recording:status', (data) {
      _recordingStatusController.add(data);
    });

    // ============================================
    // Join Request Events
    // ============================================

    // New join request (for host)
    _socket!.on('join-request:new', (data) {
      try {
        final joinRequest = JoinRequest.fromSocketEvent(data as Map<String, dynamic>);
        _joinRequestNewController.add(joinRequest);
      } catch (e) {
      }
    });

    // Join request accepted (for requester)
    _socket!.on('join-request:accepted', (data) {
      try {
        final acceptedData = JoinRequestAcceptedData.fromJson(data as Map<String, dynamic>);
        _joinRequestAcceptedController.add(acceptedData);
      } catch (e) {
      }
    });

    // Join request rejected (for requester)
    _socket!.on('join-request:rejected', (data) {
      try {
        final rejectedData = JoinRequestRejectedData.fromJson(data as Map<String, dynamic>);
        _joinRequestRejectedController.add(rejectedData);
      } catch (e) {
      }
    });
  }

  // ============================================
  // Emit Events (Client → Server)
  // ============================================

  /// Join a call room
  Future<void> joinCallRoom(String callId) async {
    if (_socket == null || !_socket!.connected) {
      await reconnectIfNeeded();

      // Check again after reconnect attempt
      if (_socket == null || !_socket!.connected) {
        return;
      }
    }

    // Use emitWithAck to verify room join was successful
    _socket!.emitWithAck('call:join', {'callId': callId}, ack: (response) {
      // Room join acknowledged by server
    });
  }

  /// Leave a call room
  Future<void> leaveCallRoom(String callId) async {
    if (_socket == null || !_socket!.connected) {
      return;
    }

    _socket!.emit('call:leave', {'callId': callId});
  }

  /// Decline an incoming call
  void declineCall({required String callId, required String callerUserId}) {
    if (_socket == null || !_socket!.connected) {
      return;
    }

    _socket!.emit('call:decline', {
      'callId': callId,
      'callerUserId': callerUserId,
    });
  }

  /// Accept an incoming call
  void acceptCall({required String callId}) {
    if (_socket == null || !_socket!.connected) {
      return;
    }

    _socket!.emit('call:accept', {
      'callId': callId,
    });
  }

  /// Toggle media (audio/video/screen)
  void toggleMedia({
    required String callId,
    required String participantId,
    required String mediaType, // 'audio' | 'video' | 'screen'
    required bool enabled,
  }) {
    if (_socket == null || !_socket!.connected) {
      return;
    }

    _socket!.emit('media:toggle', {
      'callId': callId,
      'participantId': participantId,
      'mediaType': mediaType,
      'enabled': enabled,
    });
  }

  /// Raise/lower hand
  void raiseHand({
    required String callId,
    required String participantId,
    required bool raised,
  }) {
    if (_socket == null || !_socket!.connected) {
      return;
    }

    _socket!.emit('hand:raise', {
      'callId': callId,
      'participantId': participantId,
      'raised': raised,
    });
  }

  /// Send chat message
  void sendChatMessage({
    required String callId,
    required String content,
    String? replyTo,
  }) {
    if (_socket == null || !_socket!.connected) {
      return;
    }

    final payload = {
      'callId': callId,
      'content': content,
      if (replyTo != null) 'replyTo': replyTo,
    };

    _socket!.emitWithAck('chat:message', payload, ack: (response) {
      // Message acknowledged by server
    });
  }

  /// Add chat reaction
  void addChatReaction({
    required String callId,
    required String messageId,
    required String emoji,
  }) {
    if (_socket == null || !_socket!.connected) {
      return;
    }

    _socket!.emit('chat:reaction', {
      'callId': callId,
      'messageId': messageId,
      'emoji': emoji,
    });
  }

  /// Update connection quality
  void updateQuality({
    required String callId,
    required String participantId,
    required String quality, // 'excellent' | 'good' | 'poor'
    Map<String, dynamic>? stats,
  }) {
    if (_socket == null || !_socket!.connected) {
      return;
    }

    _socket!.emit('quality:update', {
      'callId': callId,
      'participantId': participantId,
      'quality': quality,
      if (stats != null) 'stats': stats,
    });
  }

  /// Notify recording started
  void notifyRecordingStarted({
    required String callId,
    required String recordingId,
  }) {
    if (_socket == null || !_socket!.connected) {
      return;
    }

    _socket!.emit('recording:started', {
      'callId': callId,
      'recordingId': recordingId,
    });
  }

  /// Notify recording stopped
  void notifyRecordingStopped({
    required String callId,
    required String recordingId,
  }) {
    if (_socket == null || !_socket!.connected) {
      return;
    }

    _socket!.emit('recording:stopped', {
      'callId': callId,
      'recordingId': recordingId,
    });
  }

  // ============================================
  // Connection Management
  // ============================================

  /// Check if connected
  bool get isConnected => _socket != null && _socket!.connected;

  /// Reconnect if not connected (useful when app comes back to foreground)
  Future<void> reconnectIfNeeded() async {
    if (_socket != null && _socket!.connected) {
      return;
    }


    // Dispose old socket if exists
    if (_socket != null) {
      _socket!.dispose();
      _socket = null;
    }

    // Reconnect
    try {
      await connect();
    } catch (e) {
    }
  }

  /// Disconnect from WebSocket
  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
  }

  /// Dispose of all resources
  void dispose() {
    disconnect();
    _incomingCallController.close();
    _participantJoinedController.close();
    _participantLeftController.close();
    _mediaUpdatedController.close();
    _handRaisedController.close();
    _chatMessageController.close();
    _recordingStatusController.close();
    _connectionStatusController.close();
    _callEndedController.close();
  }
}
