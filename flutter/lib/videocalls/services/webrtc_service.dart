import 'package:appatonce/appatonce.dart';
import 'package:flutter/foundation.dart';

/// AppAtOnce WebRTC Video Calling Service
/// This service provides all video calling functionality using AppAtOnce SDK
class WebRTCService {
  static WebRTCService? _instance;
  AppAtOnceClient? _client;
  VideoSession? _currentSession;
  JoinSessionResponse? _joinResponse;
  List<VideoParticipant> _participants = [];
  bool _isRecording = false;
  String? _recordingId;
  bool _isAudioEnabled = true;
  bool _isVideoEnabled = true;
  bool _isScreenSharing = false;

  // Private constructor
  WebRTCService._();

  // Singleton instance
  static WebRTCService get instance {
    _instance ??= WebRTCService._();
    return _instance!;
  }

  // Initialize the client
  Future<void> initialize(String apiKey) async {
    try {
      _client = AppAtOnceClient(apiKey: apiKey);
    } catch (e) {
      rethrow;
    }
  }

  // Check if client is initialized
  bool get isInitialized => _client != null;

  // Get current session
  VideoSession? get currentSession => _currentSession;

  // Get participants
  List<VideoParticipant> get participants => List.from(_participants);

  // Get recording status
  bool get isRecording => _isRecording;

  // Get audio status
  bool get isAudioEnabled => _isAudioEnabled;

  // Get video status
  bool get isVideoEnabled => _isVideoEnabled;

  // Get screen sharing status
  bool get isScreenSharing => _isScreenSharing;

  /// Create a new video session
  Future<VideoSession> createVideoSession({
    required String title,
    String? description,
    int maxParticipants = 10,
    VideoSessionType type = VideoSessionType.instant,
    DateTime? scheduledAt,
    bool enableRecording = true,
    bool enableTranscription = true,
    bool enableChat = true,
    bool enableScreenShare = true,
    bool enableVirtualBackground = false,
    bool waitingRoom = false,
    bool muteOnJoin = true,
    bool requirePermissionToUnmute = false,
  }) async {
    if (!isInitialized) {
      throw Exception('WebRTC service not initialized');
    }

    try {
      final session = await _client!.webrtc.createSession(
        CreateVideoSessionOptions(
          title: title,
          description: description ?? 'Video call session',
          type: type,
          maxParticipants: maxParticipants,
          scheduledAt: scheduledAt,
          settings: VideoSessionSettings(
            enableRecording: enableRecording,
            enableTranscription: enableTranscription,
            enableChat: enableChat,
            enableScreenShare: enableScreenShare,
            enableVirtualBackground: enableVirtualBackground,
            waitingRoom: waitingRoom,
            muteOnJoin: muteOnJoin,
            requirePermissionToUnmute: requirePermissionToUnmute,
          ),
          features: [
            if (enableRecording) 'recording',
            if (enableTranscription) 'transcription',
            if (enableChat) 'chat',
            if (enableScreenShare) 'screen-share',
          ],
        ),
      );

      _currentSession = session;
      return session;
    } catch (e) {
      rethrow;
    }
  }

  /// Join an existing video session
  Future<JoinSessionResponse> joinVideoSession(
    String sessionId, {
    required String userName,
    ParticipantRole role = ParticipantRole.participant,
    String? deviceType,
  }) async {
    if (!isInitialized) {
      throw Exception('WebRTC service not initialized');
    }

    try {
      // First get the session details
      final session = await _client!.webrtc.getSession(sessionId);
      _currentSession = session;

      // Join the session
      final joinResponse = await _client!.webrtc.joinSession(
        sessionId,
        JoinVideoSessionOptions(
          name: userName,
          role: role,
          deviceInfo: DeviceInfo(
            type: deviceType ?? 'mobile',
            browser: 'Flutter WebView',
            os: defaultTargetPlatform == TargetPlatform.iOS ? 'iOS' : 'Android',
            version: '1.0',
          ),
        ),
      );

      _joinResponse = joinResponse;

      // Start the video call with the connection ID
      await _client!.webrtc.startVideoCall(sessionId, joinResponse.connectionId);

      // Start polling for participants
      _startParticipantPolling();

      return joinResponse;
    } catch (e) {
      rethrow;
    }
  }

  /// Leave the current video session
  Future<void> leaveVideoSession() async {
    if (!isInitialized || _currentSession == null) {
      return;
    }

    try {
      await _client!.webrtc.leaveSession(_currentSession!.id);
      
      // Reset state
      _currentSession = null;
      _joinResponse = null;
      _participants.clear();
      _isRecording = false;
      _recordingId = null;
      _isAudioEnabled = true;
      _isVideoEnabled = true;
      _isScreenSharing = false;

    } catch (e) {
      rethrow;
    }
  }

  /// Toggle audio (mute/unmute)
  Future<void> toggleAudio() async {
    if (!isInitialized || _currentSession == null || _joinResponse == null) {
      return;
    }

    try {
      _isAudioEnabled = !_isAudioEnabled;
      await _client!.webrtc.toggleMedia(
        _currentSession!.id,
        _joinResponse!.connectionId,
        'audio',
        _isAudioEnabled,
      );
    } catch (e) {
      // Revert state on error
      _isAudioEnabled = !_isAudioEnabled;
      rethrow;
    }
  }

  /// Toggle video (camera on/off)
  Future<void> toggleVideo() async {
    if (!isInitialized || _currentSession == null || _joinResponse == null) {
      return;
    }

    try {
      _isVideoEnabled = !_isVideoEnabled;
      await _client!.webrtc.toggleMedia(
        _currentSession!.id,
        _joinResponse!.connectionId,
        'video',
        _isVideoEnabled,
      );
    } catch (e) {
      // Revert state on error
      _isVideoEnabled = !_isVideoEnabled;
      rethrow;
    }
  }

  /// Start screen sharing
  Future<void> startScreenShare() async {
    if (!isInitialized || _currentSession == null || _joinResponse == null) {
      return;
    }

    try {
      await _client!.webrtc.startScreenShare(
        _currentSession!.id,
        _joinResponse!.connectionId,
      );
      _isScreenSharing = true;
    } catch (e) {
      rethrow;
    }
  }

  /// Stop screen sharing
  Future<void> stopScreenShare() async {
    if (!isInitialized || _currentSession == null || _joinResponse == null) {
      return;
    }

    try {
      await _client!.webrtc.stopScreenShare(
        _currentSession!.id,
        _joinResponse!.connectionId,
      );
      _isScreenSharing = false;
    } catch (e) {
      rethrow;
    }
  }

  /// Toggle screen sharing
  Future<void> toggleScreenShare() async {
    if (_isScreenSharing) {
      await stopScreenShare();
    } else {
      await startScreenShare();
    }
  }

  /// Start recording the session
  Future<VideoRecording> startRecording({
    bool audioOnly = false,
    bool videoOnly = false,
    String resolution = '1080p',
    int audioBitrate = 128000,
    int videoBitrate = 4000000,
  }) async {
    if (!isInitialized || _currentSession == null) {
      throw Exception('No active session');
    }

    try {
      final recording = await _client!.webrtc.startRecording(
        _currentSession!.id,
        StartRecordingOptions(
          audioOnly: audioOnly,
          videoOnly: videoOnly,
          resolution: resolution,
          audioBitrate: audioBitrate,
          videoBitrate: videoBitrate,
        ),
      );

      _isRecording = true;
      _recordingId = recording.recordingId;
      return recording;
    } catch (e) {
      rethrow;
    }
  }

  /// Stop recording the session
  Future<VideoRecording?> stopRecording() async {
    if (!isInitialized || _currentSession == null || _recordingId == null) {
      return null;
    }

    try {
      final recording = await _client!.webrtc.stopRecording(
        _currentSession!.id,
        _recordingId!,
      );

      _isRecording = false;
      _recordingId = null;
      return recording;
    } catch (e) {
      rethrow;
    }
  }

  /// Toggle recording
  Future<VideoRecording?> toggleRecording() async {
    if (_isRecording) {
      return await stopRecording();
    } else {
      return await startRecording();
    }
  }

  /// Send a message to the session
  Future<void> sendMessage(String message, {List<String>? targetIdentities}) async {
    if (!isInitialized || _currentSession == null) {
      return;
    }

    try {
      await _client!.webrtc.sendMessage(
        _currentSession!.id,
        {
          'type': targetIdentities != null ? 'private' : 'chat',
          'text': message,
          'timestamp': DateTime.now().toIso8601String(),
        },
        targetIdentities: targetIdentities,
      );
    } catch (e) {
      rethrow;
    }
  }

  /// Get session analytics
  Future<VideoAnalytics?> getSessionAnalytics() async {
    if (!isInitialized || _currentSession == null) {
      return null;
    }

    try {
      final analytics = await _client!.webrtc.getAnalytics(_currentSession!.id);
      return analytics;
    } catch (e) {
      rethrow;
    }
  }

  /// Generate transcripts for the session
  Future<List<VideoTranscript>> generateTranscripts({
    String language = 'en',
    String? translateTo,
    bool includeSpeakerLabels = true,
  }) async {
    if (!isInitialized || _currentSession == null) {
      return [];
    }

    try {
      final transcripts = await _client!.webrtc.generateTranscript(
        _currentSession!.id,
        GenerateTranscriptOptions(
          language: language,
          translateTo: translateTo,
          includeSpeakerLabels: includeSpeakerLabels,
        ),
      );
      return transcripts;
    } catch (e) {
      rethrow;
    }
  }

  /// List active sessions
  Future<List<VideoSession>> listActiveSessions({
    int limit = 10,
    int offset = 0,
  }) async {
    if (!isInitialized) {
      return [];
    }

    try {
      final response = await _client!.webrtc.listSessions(
        VideoSessionFilters(
          status: VideoSessionStatus.active,
          limit: limit,
          offset: offset,
        ),
      );
      return response.sessions;
    } catch (e) {
      rethrow;
    }
  }

  /// Update participant permissions
  Future<void> updateParticipantPermissions(
    String participantIdentity, {
    bool canPublish = true,
    bool canSubscribe = true,
    bool canPublishData = true,
    List<String> canPublishSources = const ['camera', 'microphone', 'screen'],
  }) async {
    if (!isInitialized || _currentSession == null) {
      return;
    }

    try {
      await _client!.webrtc.updateParticipantPermissions(
        _currentSession!.id,
        participantIdentity,
        UpdateParticipantPermissions(
          canPublish: canPublish,
          canSubscribe: canSubscribe,
          canPublishData: canPublishData,
          canPublishSources: canPublishSources,
        ),
      );
    } catch (e) {
      rethrow;
    }
  }

  /// Start polling for participants
  void _startParticipantPolling() {
    _pollParticipants();
  }

  /// Poll for participants periodically
  Future<void> _pollParticipants() async {
    if (_currentSession == null) return;

    try {
      final updatedParticipants = await _client!.webrtc.getParticipants(
        _currentSession!.id,
      );

      _participants = updatedParticipants;

      // Continue polling if session is active
      if (_currentSession?.status == 'active') {
        Future.delayed(const Duration(seconds: 5), _pollParticipants);
      }
    } catch (e) {
    }
  }

  /// Dispose the service
  Future<void> dispose() async {
    try {
      await leaveVideoSession();
      await _client?.dispose();
      _client = null;
      _instance = null;
    } catch (e) {
    }
  }
}

/// Extension methods for better usability
extension WebRTCServiceExtension on WebRTCService {
  /// Create and join a quick meeting
  Future<VideoSession> createAndJoinQuickMeeting({
    required String title,
    required String userName,
    List<String> invitedParticipants = const [],
  }) async {
    final session = await createVideoSession(
      title: title,
      maxParticipants: invitedParticipants.length + 1,
      enableRecording: true,
      enableChat: true,
      enableScreenShare: true,
    );

    await joinVideoSession(
      session.id,
      userName: userName,
      role: ParticipantRole.host,
    );

    return session;
  }

  /// Check if user can perform actions
  bool get canControlMedia => _currentSession != null && _joinResponse != null;
  
  /// Get session duration if available
  String get sessionDuration {
    if (_currentSession?.createdAt == null) return '00:00';
    
    final duration = DateTime.now().difference(_currentSession!.createdAt);
    final minutes = duration.inMinutes;
    final seconds = duration.inSeconds % 60;
    
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }
}