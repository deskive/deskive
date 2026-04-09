import 'package:dio/dio.dart';
import '../../models/video_call.dart';
import '../base_api_client.dart';

/// Video Call API Service
/// Handles all video call related API calls to Deskive backend
class VideoCallService {
  final BaseApiClient apiClient;

  VideoCallService(this.apiClient);

  // ============================================
  // Call Management
  // ============================================

  /// Get all video calls in a workspace
  Future<List<VideoCall>> getCalls(
    String workspaceId, {
    String? status,
    String? callType,
    int? limit,
    int? offset,
  }) async {
    try {
      final queryParams = <String, dynamic>{};
      if (status != null) queryParams['status'] = status;
      if (callType != null) queryParams['call_type'] = callType;
      if (limit != null) queryParams['limit'] = limit;
      if (offset != null) queryParams['offset'] = offset;

      final response = await apiClient.get(
        '/workspaces/$workspaceId/video-calls',
        queryParameters: queryParams,
      );

      return (response.data as List)
          .map((json) => VideoCall.fromJson(json))
          .toList();
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Get a single video call by ID
  Future<VideoCall> getCall(String callId) async {
    try {
      final response = await apiClient.get('/video-calls/$callId');
      return VideoCall.fromJson(response.data);
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Create a new video call
  Future<VideoCall> createCall(
    String workspaceId,
    CreateCallRequest request,
  ) async {
    try {
      final response = await apiClient.post(
        '/workspaces/$workspaceId/video-calls/create',
        data: request.toJson(),
      );

      return VideoCall.fromJson(response.data);
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Join a video call and get LiveKit token
  Future<JoinCallResponse> joinCall(
    String callId, {
    String? displayName,
    Map<String, dynamic>? metadata,
  }) async {
    print('[VideoCallApiService] joinCall called for callId: $callId');
    try {
      final request = JoinCallRequest(
        displayName: displayName,
        metadata: metadata,
      );
      print('[VideoCallApiService] Making POST request to /video-calls/$callId/join');

      final response = await apiClient.post(
        '/video-calls/$callId/join',
        data: request.toJson(),
      );
      print('[VideoCallApiService] Got response: ${response.statusCode}');
      print('[VideoCallApiService] Response data keys: ${response.data?.keys}');

      final joinResponse = JoinCallResponse.fromJson(response.data);
      print('[VideoCallApiService] Parsed JoinCallResponse - roomUrl: ${joinResponse.roomUrl}');
      return joinResponse;
    } catch (e) {
      print('[VideoCallApiService] ERROR in joinCall: $e');
      throw _handleError(e);
    }
  }

  /// Leave a video call
  Future<Map<String, dynamic>> leaveCall(String callId) async {
    try {
      final response = await apiClient.post('/video-calls/$callId/leave');
      return response.data;
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// End a video call (host only)
  Future<Map<String, dynamic>> endCall(String callId) async {
    try {
      final response = await apiClient.post('/video-calls/$callId/end');
      return response.data;
    } catch (e) {
      throw _handleError(e);
    }
  }

  // ============================================
  // Participant Management
  // ============================================

  /// Get all participants in a call
  Future<List<CallParticipant>> getParticipants(String callId) async {
    try {
      final response = await apiClient.get('/video-calls/$callId/participants');
      return (response.data as List)
          .map((json) => CallParticipant.fromJson(json))
          .toList();
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Update participant state (mute/unmute, video on/off, etc.)
  Future<void> updateParticipant(
    String callId,
    String participantId, {
    bool? isAudioMuted,
    bool? isVideoMuted,
    bool? isScreenSharing,
    bool? isHandRaised,
    String? connectionQuality,
  }) async {
    try {
      final data = <String, dynamic>{};
      if (isAudioMuted != null) data['is_audio_muted'] = isAudioMuted;
      if (isVideoMuted != null) data['is_video_muted'] = isVideoMuted;
      if (isScreenSharing != null) data['is_screen_sharing'] = isScreenSharing;
      if (isHandRaised != null) data['is_hand_raised'] = isHandRaised;
      if (connectionQuality != null) {
        data['connection_quality'] = connectionQuality;
      }

      await apiClient.post(
        '/video-calls/$callId/participants/$participantId',
        data: data,
      );
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Invite participants to a call
  Future<Map<String, dynamic>> inviteParticipants(
    String callId,
    List<String> userIds,
  ) async {
    try {
      final response = await apiClient.post(
        '/video-calls/$callId/invite',
        data: {'user_ids': userIds},
      );
      return response.data;
    } catch (e) {
      throw _handleError(e);
    }
  }

  // ============================================
  // Recording Management
  // ============================================

  /// Start recording a call
  Future<CallRecording> startRecording(
    String callId, {
    bool transcriptionEnabled = false,
    bool audioOnly = false,
  }) async {
    try {
      final response = await apiClient.post(
        '/video-calls/$callId/recording/start',
        data: {
          'transcription_enabled': transcriptionEnabled,
          'audio_only': audioOnly,
        },
      );

      return CallRecording.fromJson(response.data);
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Stop recording a call
  Future<Map<String, dynamic>> stopRecording(
    String callId,
    String recordingId,
  ) async {
    try {
      final response = await apiClient.post(
        '/video-calls/$callId/recording/$recordingId/stop',
      );
      return response.data;
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Get all recordings for a call
  Future<List<CallRecording>> getRecordings(String callId) async {
    try {
      final response = await apiClient.get('/video-calls/$callId/recordings');
      return (response.data as List)
          .map((json) => CallRecording.fromJson(json))
          .toList();
    } catch (e) {
      throw _handleError(e);
    }
  }

  // ============================================
  // AI Features
  // ============================================

  /// Transcribe a recording using AI
  Future<Map<String, dynamic>> transcribeRecording(
    String callId,
    String recordingId,
  ) async {
    try {
      final response = await apiClient.post(
        '/video-calls/$callId/recordings/$recordingId/transcribe',
      );
      return response.data;
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Translate a recording transcript
  Future<Map<String, dynamic>> translateRecording(
    String callId,
    String recordingId,
    String targetLanguage,
  ) async {
    try {
      final response = await apiClient.post(
        '/video-calls/$callId/recordings/$recordingId/translate',
        data: {'target_language': targetLanguage},
      );
      return response.data;
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Generate meeting summary/notes from transcript
  Future<Map<String, dynamic>> summarizeRecording(
    String callId,
    String recordingId,
  ) async {
    try {
      final response = await apiClient.post(
        '/video-calls/$callId/recordings/$recordingId/summarize',
      );
      return response.data;
    } catch (e) {
      throw _handleError(e);
    }
  }

  // ============================================
  // Analytics
  // ============================================

  /// Get video call analytics for a workspace
  Future<Map<String, dynamic>> getAnalytics(String workspaceId) async {
    try {
      final response = await apiClient.get(
        '/workspaces/$workspaceId/video-calls/analytics',
      );
      return response.data;
    } catch (e) {
      throw _handleError(e);
    }
  }

  // ============================================
  // Error Handling
  // ============================================

  Exception _handleError(dynamic error) {
    if (error is DioException) {
      if (error.response != null) {
        final statusCode = error.response!.statusCode;
        final message = error.response!.data['message'] ?? error.message;

        switch (statusCode) {
          case 400:
            return Exception('Bad request: $message');
          case 401:
            return Exception('Unauthorized: Please login again');
          case 403:
            return Exception('Forbidden: $message');
          case 404:
            return Exception('Not found: $message');
          case 500:
            return Exception('Server error: $message');
          default:
            return Exception(message);
        }
      }
      return Exception('Network error: ${error.message}');
    }
    return Exception('Unknown error: $error');
  }
}
