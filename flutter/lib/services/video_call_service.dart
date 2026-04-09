import 'dart:async';
import 'package:flutter/foundation.dart';
import '../dao/video_call_dao.dart';
import '../models/videocalls/video_call_analytics.dart';
import '../models/videocalls/video_call.dart';
import '../services/auth_service.dart';
import '../services/video_call_socket_service.dart';

/// Video Call Service
/// Handles video call operations and analytics
class VideoCallService extends ChangeNotifier {
  static VideoCallService? _instance;
  static VideoCallService get instance =>
      _instance ??= VideoCallService._internal();

  VideoCallService._internal();

  late VideoCallDao _videoCallDao;
  bool _isInitialized = false;
  StreamSubscription? _participantJoinedSub;
  StreamSubscription? _participantLeftSub;

  // State
  VideoCallAnalytics? _analytics;
  bool _isLoadingAnalytics = false;
  List<VideoCall> _videoCalls = [];
  bool _isLoadingVideoCalls = false;
  String? _error;

  // Getters
  VideoCallAnalytics? get analytics => _analytics;
  bool get isLoadingAnalytics => _isLoadingAnalytics;
  List<VideoCall> get videoCalls => _videoCalls;
  bool get isLoadingVideoCalls => _isLoadingVideoCalls;
  String? get error => _error;

  /// Initialize the service with API configuration
  void initialize() {
    if (_isInitialized) return;

    _videoCallDao = VideoCallDao();
    _isInitialized = true;

    // Update token when auth changes
    AuthService.instance.addListener(_updateAuthToken);

    // Listen to WebSocket participant events for real-time participant count updates
    _setupWebSocketListeners();
  }

  /// Setup WebSocket listeners for real-time participant count updates
  void _setupWebSocketListeners() {
    try {
      // Listen to participant joined events
      _participantJoinedSub = VideoCallSocketService.instance.onParticipantJoined.listen((data) {
        _handleParticipantJoined(data);
      });

      // Listen to participant left events
      _participantLeftSub = VideoCallSocketService.instance.onParticipantLeft.listen((data) {
        _handleParticipantLeft(data);
      });

    } catch (e) {
    }
  }

  /// Handle participant joined event
  void _handleParticipantJoined(Map<String, dynamic> data) {
    final callId = data['callId'] as String?;
    if (callId == null) return;


    // Find the call and increment participant count
    final callIndex = _videoCalls.indexWhere((call) => call.id == callId);
    if (callIndex != -1) {
      final oldCall = _videoCalls[callIndex];
      final updatedCall = VideoCall(
        id: oldCall.id,
        workspaceId: oldCall.workspaceId,
        fluxezRoomId: oldCall.fluxezRoomId,
        title: oldCall.title,
        description: oldCall.description,
        hostUserId: oldCall.hostUserId,
        callType: oldCall.callType,
        isGroupCall: oldCall.isGroupCall,
        status: oldCall.status,
        isRecording: oldCall.isRecording,
        participantCount: oldCall.participantCount + 1, // Increment count
        invitees: oldCall.invitees,
        scheduledStartTime: oldCall.scheduledStartTime,
        scheduledEndTime: oldCall.scheduledEndTime,
        actualStartTime: oldCall.actualStartTime,
        actualEndTime: oldCall.actualEndTime,
        settings: oldCall.settings,
        metadata: oldCall.metadata,
        createdAt: oldCall.createdAt,
        updatedAt: oldCall.updatedAt,
      );

      _videoCalls[callIndex] = updatedCall;
      notifyListeners();
    }
  }

  /// Handle participant left event
  void _handleParticipantLeft(Map<String, dynamic> data) {
    final callId = data['callId'] as String?;
    if (callId == null) return;


    // Find the call and decrement participant count
    final callIndex = _videoCalls.indexWhere((call) => call.id == callId);
    if (callIndex != -1) {
      final oldCall = _videoCalls[callIndex];
      final updatedCall = VideoCall(
        id: oldCall.id,
        workspaceId: oldCall.workspaceId,
        fluxezRoomId: oldCall.fluxezRoomId,
        title: oldCall.title,
        description: oldCall.description,
        hostUserId: oldCall.hostUserId,
        callType: oldCall.callType,
        isGroupCall: oldCall.isGroupCall,
        status: oldCall.status,
        isRecording: oldCall.isRecording,
        participantCount: (oldCall.participantCount - 1).clamp(0, 999), // Decrement count (min 0)
        invitees: oldCall.invitees,
        scheduledStartTime: oldCall.scheduledStartTime,
        scheduledEndTime: oldCall.scheduledEndTime,
        actualStartTime: oldCall.actualStartTime,
        actualEndTime: oldCall.actualEndTime,
        settings: oldCall.settings,
        metadata: oldCall.metadata,
        createdAt: oldCall.createdAt,
        updatedAt: oldCall.updatedAt,
      );

      _videoCalls[callIndex] = updatedCall;
      notifyListeners();
    }
  }

  /// Update auth token in DAO
  void _updateAuthToken() {
    if (_isInitialized) {
      _videoCallDao = VideoCallDao();
    }
  }

  /// Fetch video call analytics for a workspace
  Future<void> fetchAnalytics(String workspaceId) async {
    if (!_isInitialized) {
      initialize();
    }

    _isLoadingAnalytics = true;
    _error = null;
    notifyListeners();

    try {
      final analytics = await _videoCallDao.getAnalytics(workspaceId);

      _analytics = analytics ?? VideoCallAnalytics.empty();
      _isLoadingAnalytics = false;

    } catch (e) {
      _error = 'Error fetching analytics: $e';
      _analytics = VideoCallAnalytics.empty();
      _isLoadingAnalytics = false;
    }

    notifyListeners();
  }

  /// Fetch all video calls for a workspace
  Future<void> fetchVideoCalls(String workspaceId) async {
    if (!_isInitialized) {
      initialize();
    }

    _isLoadingVideoCalls = true;
    _error = null;
    notifyListeners();

    try {
      final calls = await _videoCallDao.getVideoCalls(workspaceId);

      _videoCalls = calls;
      _isLoadingVideoCalls = false;

    } catch (e) {
      _error = 'Error fetching video calls: $e';
      _videoCalls = [];
      _isLoadingVideoCalls = false;
    }

    notifyListeners();
  }

  /// Get recent meetings (all meetings sorted by most recent)
  List<VideoCall> get recentMeetings {
    return _videoCalls.toList()
      ..sort((a, b) {
        // Sort by start time (most recent first)
        final aTime = a.actualStartTime ?? a.scheduledStartTime ?? a.createdAt;
        final bTime = b.actualStartTime ?? b.scheduledStartTime ?? b.createdAt;
        return DateTime.parse(bTime).compareTo(DateTime.parse(aTime));
      });
  }

  /// Get active meetings
  List<VideoCall> get activeMeetings {
    return _videoCalls.where((call) => call.isActive).toList();
  }

  /// Get scheduled meetings
  List<VideoCall> get scheduledMeetings {
    return _videoCalls
        .where((call) => call.isScheduled)
        .toList()
      ..sort((a, b) {
        final aTime = a.scheduledStartTime ?? a.createdAt;
        final bTime = b.scheduledStartTime ?? b.createdAt;
        return DateTime.parse(aTime).compareTo(DateTime.parse(bTime));
      });
  }

  /// Clear analytics data
  void clearAnalytics() {
    _analytics = null;
    _error = null;
    notifyListeners();
  }

  /// Clear video calls data
  void clearVideoCalls() {
    _videoCalls = [];
    _error = null;
    notifyListeners();
  }

  /// Create a quick video/audio call
  Future<VideoCall> createCall({
    required String workspaceId,
    required String title,
    required String callType, // 'video' or 'audio'
    required bool isGroupCall,
    List<String>? participantIds,
  }) async {
    // Debug logging to verify what's being sent
    print('');
    print('╔══════════════════════════════════════════════════════════════╗');
    print('║  [VideoCallService] createCall DEBUG                         ║');
    print('╠══════════════════════════════════════════════════════════════╣');
    print('║  workspaceId: $workspaceId');
    print('║  title: $title');
    print('║  callType: $callType');
    print('║  isGroupCall: $isGroupCall');
    print('║  participantIds: $participantIds');
    print('║  participantIds length: ${participantIds?.length ?? 0}');
    print('╚══════════════════════════════════════════════════════════════╝');
    print('');

    if (!_isInitialized) {
      initialize();
    }

    final meetingData = {
      'title': title,
      'call_type': callType,
      'is_group_call': isGroupCall,
      if (participantIds != null && participantIds.isNotEmpty)
        'participant_ids': participantIds,
      'recording_enabled': false,
      'video_quality': 'hd',
      'max_participants': 50,
    };

    print('[VideoCallService] Final meetingData: $meetingData');

    try {
      final createdCall = await _videoCallDao.createVideoCall(
        workspaceId,
        meetingData,
      );

      if (createdCall == null) {
        throw Exception('Failed to create call - null response');
      }

      // Add to local list
      _videoCalls.add(createdCall);
      notifyListeners();

      return createdCall;
    } catch (e) {
      _error = 'Error creating call: $e';
      rethrow;
    }
  }

  /// Create a new video call/meeting
  Future<VideoCall?> createMeeting(
    String workspaceId,
    Map<String, dynamic> meetingData,
  ) async {

    if (!_isInitialized) {
      initialize();
    }

    try {
      final createdCall = await _videoCallDao.createVideoCall(
        workspaceId,
        meetingData,
      );

      if (createdCall != null) {
        // Add to local list
        _videoCalls.add(createdCall);
        notifyListeners();

      }

      return createdCall;
    } catch (e) {
      _error = 'Error creating meeting: $e';
      rethrow;
    }
  }

  /// Toggle pin status for a video call
  Future<bool> togglePin(String callId, bool pinned) async {
    if (!_isInitialized) {
      initialize();
    }

    try {
      await _videoCallDao.togglePin(callId, pinned);

      // Update the local list
      final callIndex = _videoCalls.indexWhere((call) => call.id == callId);
      if (callIndex != -1) {
        final oldCall = _videoCalls[callIndex];
        final updatedMetadata = Map<String, dynamic>.from(oldCall.metadata);
        updatedMetadata['pinned'] = pinned;

        final updatedCall = VideoCall(
          id: oldCall.id,
          workspaceId: oldCall.workspaceId,
          fluxezRoomId: oldCall.fluxezRoomId,
          title: oldCall.title,
          description: oldCall.description,
          hostUserId: oldCall.hostUserId,
          callType: oldCall.callType,
          isGroupCall: oldCall.isGroupCall,
          status: oldCall.status,
          isRecording: oldCall.isRecording,
          participantCount: oldCall.participantCount,
          invitees: oldCall.invitees,
          scheduledStartTime: oldCall.scheduledStartTime,
          scheduledEndTime: oldCall.scheduledEndTime,
          actualStartTime: oldCall.actualStartTime,
          actualEndTime: oldCall.actualEndTime,
          settings: oldCall.settings,
          metadata: updatedMetadata,
          createdAt: oldCall.createdAt,
          updatedAt: oldCall.updatedAt,
        );

        _videoCalls[callIndex] = updatedCall;
        notifyListeners();
      }

      return true;
    } catch (e) {
      _error = 'Error toggling pin: $e';
      return false;
    }
  }

  @override
  void dispose() {
    AuthService.instance.removeListener(_updateAuthToken);
    _participantJoinedSub?.cancel();
    _participantLeftSub?.cancel();
    super.dispose();
  }
}
