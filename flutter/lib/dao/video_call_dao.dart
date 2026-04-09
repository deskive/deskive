import '../models/videocalls/video_call_analytics.dart';
import '../models/videocalls/video_call.dart';
import '../models/videocalls/join_request.dart';
import 'base_dao_impl.dart';

/// Video Call DAO for handling video call API operations
class VideoCallDao extends BaseDaoImpl {
  VideoCallDao()
      : super(
          baseEndpoint: '/workspaces',
        );

  /// Get video call analytics for a workspace
  Future<VideoCallAnalytics?> getAnalytics(String workspaceId) async {
    try {
      final response = await get<Map<String, dynamic>>(
        '$workspaceId/video-calls/analytics',
      );

      return VideoCallAnalytics.fromJson(response);
    } catch (e) {
      return null;
    }
  }

  /// Get all video calls for a workspace
  Future<List<VideoCall>> getVideoCalls(String workspaceId) async {
    try {
      final response = await get<List<dynamic>>(
        '$workspaceId/video-calls',
      );

      if (response is List) {
        return response
            .map((json) => VideoCall.fromJson(json as Map<String, dynamic>))
            .toList();
      }

      return [];
    } catch (e) {
      return [];
    }
  }

  /// Create a new video call/meeting
  Future<VideoCall?> createVideoCall(
    String workspaceId,
    Map<String, dynamic> meetingData,
  ) async {
    try {

      final response = await post<Map<String, dynamic>>(
        '$workspaceId/video-calls/create',
        data: meetingData,
      );


      return VideoCall.fromJson(response);
    } catch (e) {
      rethrow;
    }
  }

  // ============================================
  // Join Request Management
  // ============================================

  /// Request to join a video call (for uninvited users)
  Future<Map<String, dynamic>> requestJoin(
    String callId,
    String displayName, {
    String? message,
  }) async {
    try {

      final response = await postDirect<Map<String, dynamic>>(
        '/video-calls/$callId/request-join',
        data: {
          'display_name': displayName,
          if (message != null && message.isNotEmpty) 'message': message,
        },
      );

      return response;
    } catch (e) {
      rethrow;
    }
  }

  /// Get pending join requests for a call (host only)
  Future<List<JoinRequest>> getJoinRequests(String callId) async {
    try {

      final response = await getDirect<List<dynamic>>(
        '/video-calls/$callId/join-requests',
      );

      if (response is List) {
        return response
            .map((json) => JoinRequest.fromJson(json as Map<String, dynamic>))
            .toList();
      }

      return [];
    } catch (e) {
      return [];
    }
  }

  /// Accept a join request (host only)
  Future<Map<String, dynamic>> acceptJoinRequest(
    String callId,
    String requestId,
  ) async {
    try {

      final response = await postDirect<Map<String, dynamic>>(
        '/video-calls/$callId/join-requests/$requestId/accept',
        data: {},
      );

      return response;
    } catch (e) {
      rethrow;
    }
  }

  /// Reject a join request (host only)
  Future<Map<String, dynamic>> rejectJoinRequest(
    String callId,
    String requestId,
  ) async {
    try {

      final response = await postDirect<Map<String, dynamic>>(
        '/video-calls/$callId/join-requests/$requestId/reject',
        data: {},
      );

      return response;
    } catch (e) {
      rethrow;
    }
  }

  /// Join a video call (for invited users)
  Future<Map<String, dynamic>> joinCall(
    String callId, {
    String? displayName,
  }) async {
    try {

      final response = await postDirect<Map<String, dynamic>>(
        '/video-calls/$callId/join',
        data: {
          if (displayName != null) 'display_name': displayName,
        },
      );

      return response;
    } catch (e) {
      rethrow;
    }
  }

  /// Get call details by ID
  Future<VideoCall?> getCallById(String callId) async {
    try {

      final response = await getDirect<Map<String, dynamic>>(
        '/video-calls/$callId',
      );

      return VideoCall.fromJson(response);
    } catch (e) {
      return null;
    }
  }

  /// Toggle pin status for a video call
  Future<Map<String, dynamic>> togglePin(String callId, bool pinned) async {
    try {
      final response = await patchDirect<Map<String, dynamic>>(
        '/video-calls/$callId/pin',
        data: {'pinned': pinned},
      );

      return response;
    } catch (e) {
      rethrow;
    }
  }
}
