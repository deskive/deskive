import 'package:dio/dio.dart';
import '../../config/api_config.dart';
import '../../config/app_config.dart';
import '../base_api_client.dart';

/// DTO for creating a video call
class CreateVideoCallDto {
  final String title;
  final String? description;
  final String callType; // 'video' or 'audio'
  final bool isGroupCall;
  final List<String> participantIds;
  final bool recordingEnabled;
  final String videoQuality; // 'sd', 'hd', 'fhd'
  final int maxParticipants;
  final String? scheduledStartTime;
  final String? scheduledEndTime;
  final bool e2eeEnabled;
  final bool lockOnJoin;

  CreateVideoCallDto({
    required this.title,
    this.description,
    this.callType = 'video',
    this.isGroupCall = false,
    required this.participantIds,
    this.recordingEnabled = false,
    this.videoQuality = 'hd',
    this.maxParticipants = 50,
    this.scheduledStartTime,
    this.scheduledEndTime,
    this.e2eeEnabled = false,
    this.lockOnJoin = false,
  });

  Map<String, dynamic> toJson() => {
        'title': title,
        if (description != null) 'description': description,
        'call_type': callType,
        'is_group_call': isGroupCall,
        'participant_ids': participantIds,
        'recording_enabled': recordingEnabled,
        'video_quality': videoQuality,
        'max_participants': maxParticipants,
        if (scheduledStartTime != null) 'scheduled_start_time': scheduledStartTime,
        if (scheduledEndTime != null) 'scheduled_end_time': scheduledEndTime,
        'e2ee_enabled': e2eeEnabled,
        'lock_on_join': lockOnJoin,
      };
}

/// Video Call model matching backend API response
class VideoCall {
  final String id;
  final String workspaceId;
  final String fluxezRoomId;
  final String title;
  final String? description;
  final String hostUserId;
  final String callType;
  final bool isGroupCall;
  final String status; // 'scheduled', 'active', 'ended'
  final bool isRecording;
  final DateTime? scheduledStartTime;
  final DateTime? scheduledEndTime;
  final DateTime? actualStartTime;
  final DateTime? actualEndTime;
  final Map<String, dynamic> settings; // Contains e2eeEnabled, lockOnJoin, videoQuality, maxParticipants
  final Map<String, dynamic>? metadata;
  final DateTime createdAt;
  final DateTime updatedAt;

  VideoCall({
    required this.id,
    required this.workspaceId,
    required this.fluxezRoomId,
    required this.title,
    this.description,
    required this.hostUserId,
    required this.callType,
    required this.isGroupCall,
    required this.status,
    required this.isRecording,
    this.scheduledStartTime,
    this.scheduledEndTime,
    this.actualStartTime,
    this.actualEndTime,
    required this.settings,
    this.metadata,
    required this.createdAt,
    required this.updatedAt,
  });

  factory VideoCall.fromJson(Map<String, dynamic> json) {
    return VideoCall(
      id: json['id'] ?? '',
      workspaceId: json['workspace_id'] ?? '',
      fluxezRoomId: json['fluxez_room_id'] ?? '',
      title: json['title'] ?? '',
      description: json['description'],
      hostUserId: json['host_user_id'] ?? '',
      callType: json['call_type'] ?? 'video',
      isGroupCall: json['is_group_call'] ?? false,
      status: json['status'] ?? 'scheduled',
      isRecording: json['is_recording'] ?? false,
      scheduledStartTime: json['scheduled_start_time'] != null
          ? DateTime.parse(json['scheduled_start_time'])
          : null,
      scheduledEndTime: json['scheduled_end_time'] != null
          ? DateTime.parse(json['scheduled_end_time'])
          : null,
      actualStartTime: json['actual_start_time'] != null
          ? DateTime.parse(json['actual_start_time'])
          : null,
      actualEndTime: json['actual_end_time'] != null
          ? DateTime.parse(json['actual_end_time'])
          : null,
      settings: json['settings'] ?? {},
      metadata: json['metadata'],
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'])
          : DateTime.now(),
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'])
          : DateTime.now(),
    );
  }
}

/// Service for video call API operations
class VideoCallApiService {
  final Dio _dio;

  VideoCallApiService() : _dio = Dio() {
    _dio.options.baseUrl = ApiConfig.apiBaseUrl;
    _dio.options.connectTimeout = const Duration(seconds: 30);
    _dio.options.receiveTimeout = const Duration(seconds: 30);

    // Add auth interceptor
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await AppConfig.getAccessToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (error, handler) {
          return handler.next(error);
        },
      ),
    );
  }

  /// Create a new video call
  Future<ApiResponse<VideoCall>> createVideoCall(
    String workspaceId,
    CreateVideoCallDto dto,
  ) async {
    try {

      final endpoint = '/workspaces/$workspaceId/video-calls/create';
      final fullUrl = '${_dio.options.baseUrl}$endpoint';

      final response = await _dio.post(
        endpoint,
        data: dto.toJson(),
      );


      if (response.statusCode == 200 || response.statusCode == 201) {
        final videoCall = VideoCall.fromJson(response.data);
        return ApiResponse.success(videoCall);
      } else {
        return ApiResponse.error('Failed to create video call');
      }
    } on DioException catch (e) {
      if (e.response != null) {
        return ApiResponse.error(
          e.response?.data['message'] ?? 'Failed to create video call',
        );
      }
      return ApiResponse.error(e.message ?? 'Network error');
    } catch (e) {
      return ApiResponse.error('An unexpected error occurred');
    }
  }

  /// Get video call details
  Future<ApiResponse<VideoCall>> getVideoCall(
    String workspaceId,
    String callId,
  ) async {
    try {
      final response = await _dio.get(
        '/workspaces/$workspaceId/video-calls/$callId',
      );

      if (response.statusCode == 200) {
        final videoCall = VideoCall.fromJson(response.data);
        return ApiResponse.success(videoCall);
      } else {
        return ApiResponse.error('Failed to get video call');
      }
    } on DioException catch (e) {
      return ApiResponse.error(
        e.response?.data['message'] ?? 'Failed to get video call',
      );
    } catch (e) {
      return ApiResponse.error('An unexpected error occurred');
    }
  }

  /// End a video call
  Future<ApiResponse<VideoCall>> endVideoCall(
    String workspaceId,
    String callId,
  ) async {
    try {

      final response = await _dio.post(
        '/workspaces/$workspaceId/video-calls/$callId/end',
      );

      if (response.statusCode == 200) {
        final videoCall = VideoCall.fromJson(response.data);
        return ApiResponse.success(videoCall);
      } else {
        return ApiResponse.error('Failed to end video call');
      }
    } on DioException catch (e) {
      return ApiResponse.error(
        e.response?.data['message'] ?? 'Failed to end video call',
      );
    } catch (e) {
      return ApiResponse.error('An unexpected error occurred');
    }
  }

  /// Join a video call
  Future<ApiResponse<VideoCall>> joinVideoCall(
    String workspaceId,
    String callId,
  ) async {
    try {

      final response = await _dio.post(
        '/workspaces/$workspaceId/video-calls/$callId/join',
      );

      if (response.statusCode == 200) {
        final videoCall = VideoCall.fromJson(response.data);
        return ApiResponse.success(videoCall);
      } else {
        return ApiResponse.error('Failed to join video call');
      }
    } on DioException catch (e) {
      return ApiResponse.error(
        e.response?.data['message'] ?? 'Failed to join video call',
      );
    } catch (e) {
      return ApiResponse.error('An unexpected error occurred');
    }
  }
}
