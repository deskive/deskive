/// Video Call Models for Deskive
/// Matches backend API structure

class VideoCall {
  final String id;
  final String workspaceId;
  final String fluxezRoomId;
  final String title;
  final String? description;
  final String hostUserId;
  final String callType; // 'audio' or 'video'
  final bool isGroupCall;
  final String status; // 'scheduled', 'active', 'ended', 'cancelled'
  final bool isRecording;
  final DateTime? scheduledStartTime;
  final DateTime? scheduledEndTime;
  final DateTime? actualStartTime;
  final DateTime? actualEndTime;
  final Map<String, dynamic>? settings;
  final Map<String, dynamic>? metadata;
  final DateTime createdAt;
  final DateTime updatedAt;
  final List<CallParticipant>? participants;
  final FluxezRoom? fluxezRoom;

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
    this.settings,
    this.metadata,
    required this.createdAt,
    required this.updatedAt,
    this.participants,
    this.fluxezRoom,
  });

  factory VideoCall.fromJson(Map<String, dynamic> json) {
    return VideoCall(
      id: json['id'],
      workspaceId: json['workspace_id'],
      fluxezRoomId: json['fluxez_room_id'],
      title: json['title'],
      description: json['description'],
      hostUserId: json['host_user_id'],
      callType: json['call_type'],
      isGroupCall: json['is_group_call'],
      status: json['status'],
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
      settings: json['settings'],
      metadata: json['metadata'],
      createdAt: DateTime.parse(json['created_at']),
      updatedAt: DateTime.parse(json['updated_at']),
      participants: json['participants'] != null
          ? (json['participants'] as List)
              .map((p) => CallParticipant.fromJson(p))
              .toList()
          : null,
      fluxezRoom: json['fluxez_room'] != null
          ? FluxezRoom.fromJson(json['fluxez_room'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'workspace_id': workspaceId,
      'fluxez_room_id': fluxezRoomId,
      'title': title,
      'description': description,
      'host_user_id': hostUserId,
      'call_type': callType,
      'is_group_call': isGroupCall,
      'status': status,
      'is_recording': isRecording,
      'scheduled_start_time': scheduledStartTime?.toIso8601String(),
      'scheduled_end_time': scheduledEndTime?.toIso8601String(),
      'actual_start_time': actualStartTime?.toIso8601String(),
      'actual_end_time': actualEndTime?.toIso8601String(),
      'settings': settings,
      'metadata': metadata,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }
}

class FluxezRoom {
  final String id;
  final String name;
  final String status;
  final int maxParticipants;
  final int currentParticipants;
  final String? joinUrl;
  final String? embedUrl;

  FluxezRoom({
    required this.id,
    required this.name,
    required this.status,
    required this.maxParticipants,
    required this.currentParticipants,
    this.joinUrl,
    this.embedUrl,
  });

  factory FluxezRoom.fromJson(Map<String, dynamic> json) {
    return FluxezRoom(
      id: json['id'] ?? json['roomId'] ?? '',
      name: json['name'] ?? json['roomName'] ?? '',
      status: json['status'] ?? 'active',
      maxParticipants: json['maxParticipants'] ?? 50,
      currentParticipants: json['currentParticipants'] ?? 0,
      joinUrl: json['joinUrl'],
      embedUrl: json['embedUrl'],
    );
  }
}

class CallParticipant {
  final String id;
  final String? videoCallId;
  final String userId;
  final String? fluxezParticipantId;
  final String? displayName;
  final String role; // 'host' or 'participant'
  final DateTime? joinedAt;
  final DateTime? leftAt;
  final int? durationSeconds;
  final bool isAudioMuted;
  final bool isVideoMuted;
  final bool isScreenSharing;
  final bool isHandRaised;
  final String? connectionQuality;
  final Map<String, dynamic>? metadata;
  final DateTime? createdAt;

  CallParticipant({
    required this.id,
    this.videoCallId,
    required this.userId,
    this.fluxezParticipantId,
    this.displayName,
    required this.role,
    this.joinedAt,
    this.leftAt,
    this.durationSeconds,
    this.isAudioMuted = false,
    this.isVideoMuted = false,
    this.isScreenSharing = false,
    this.isHandRaised = false,
    this.connectionQuality,
    this.metadata,
    this.createdAt,
  });

  factory CallParticipant.fromJson(Map<String, dynamic> json) {
    return CallParticipant(
      id: json['id'],
      videoCallId: json['video_call_id'],
      userId: json['user_id'],
      fluxezParticipantId: json['fluxez_participant_id'],
      displayName: json['display_name'],
      role: json['role'] ?? 'participant',
      joinedAt: json['joined_at'] != null
          ? DateTime.parse(json['joined_at'])
          : null,
      leftAt: json['left_at'] != null ? DateTime.parse(json['left_at']) : null,
      durationSeconds: json['duration_seconds'],
      isAudioMuted: json['is_audio_muted'] ?? false,
      isVideoMuted: json['is_video_muted'] ?? false,
      isScreenSharing: json['is_screen_sharing'] ?? false,
      isHandRaised: json['is_hand_raised'] ?? false,
      connectionQuality: json['connection_quality'],
      metadata: json['metadata'],
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'video_call_id': videoCallId,
      'user_id': userId,
      'fluxez_participant_id': fluxezParticipantId,
      'display_name': displayName,
      'role': role,
      'joined_at': joinedAt?.toIso8601String(),
      'left_at': leftAt?.toIso8601String(),
      'duration_seconds': durationSeconds,
      'is_audio_muted': isAudioMuted,
      'is_video_muted': isVideoMuted,
      'is_screen_sharing': isScreenSharing,
      'is_hand_raised': isHandRaised,
      'connection_quality': connectionQuality,
      'metadata': metadata,
      'created_at': createdAt?.toIso8601String(),
    };
  }

  CallParticipant copyWith({
    bool? isAudioMuted,
    bool? isVideoMuted,
    bool? isScreenSharing,
    bool? isHandRaised,
    String? connectionQuality,
  }) {
    return CallParticipant(
      id: id,
      videoCallId: videoCallId,
      userId: userId,
      fluxezParticipantId: fluxezParticipantId,
      displayName: displayName,
      role: role,
      joinedAt: joinedAt,
      leftAt: leftAt,
      durationSeconds: durationSeconds,
      isAudioMuted: isAudioMuted ?? this.isAudioMuted,
      isVideoMuted: isVideoMuted ?? this.isVideoMuted,
      isScreenSharing: isScreenSharing ?? this.isScreenSharing,
      isHandRaised: isHandRaised ?? this.isHandRaised,
      connectionQuality: connectionQuality ?? this.connectionQuality,
      metadata: metadata,
      createdAt: createdAt,
    );
  }
}

class CreateCallRequest {
  final String title;
  final String? description;
  final String callType; // 'audio' or 'video'
  final bool isGroupCall;
  final List<String>? participantIds;
  final bool recordingEnabled;
  final String videoQuality; // 'low', 'medium', 'high', 'hd', '4k'
  final int maxParticipants;
  final DateTime? scheduledStartTime;
  final DateTime? scheduledEndTime;
  final bool e2eeEnabled;
  final bool lockOnJoin;
  final Map<String, dynamic>? metadata;

  CreateCallRequest({
    required this.title,
    this.description,
    required this.callType,
    this.isGroupCall = false,
    this.participantIds,
    this.recordingEnabled = false,
    this.videoQuality = 'hd',
    this.maxParticipants = 50,
    this.scheduledStartTime,
    this.scheduledEndTime,
    this.e2eeEnabled = false,
    this.lockOnJoin = false,
    this.metadata,
  });

  Map<String, dynamic> toJson() {
    return {
      'title': title,
      if (description != null) 'description': description,
      'call_type': callType,
      'is_group_call': isGroupCall,
      if (participantIds != null) 'participant_ids': participantIds,
      'recording_enabled': recordingEnabled,
      'video_quality': videoQuality,
      'max_participants': maxParticipants,
      if (scheduledStartTime != null)
        'scheduled_start_time': scheduledStartTime!.toIso8601String(),
      if (scheduledEndTime != null)
        'scheduled_end_time': scheduledEndTime!.toIso8601String(),
      'e2ee_enabled': e2eeEnabled,
      'lock_on_join': lockOnJoin,
      if (metadata != null) 'metadata': metadata,
    };
  }
}

class JoinCallRequest {
  final String? displayName;
  final Map<String, dynamic>? metadata;

  JoinCallRequest({
    this.displayName,
    this.metadata,
  });

  Map<String, dynamic> toJson() {
    return {
      if (displayName != null) 'display_name': displayName,
      if (metadata != null) 'metadata': metadata,
    };
  }
}

class JoinCallResponse {
  final String token;
  final String roomUrl;
  final String roomName;
  final CallParticipant participant;
  final CallInfo call;

  JoinCallResponse({
    required this.token,
    required this.roomUrl,
    required this.roomName,
    required this.participant,
    required this.call,
  });

  factory JoinCallResponse.fromJson(Map<String, dynamic> json) {
    return JoinCallResponse(
      token: json['token'],
      roomUrl: json['room_url'],
      roomName: json['room_name'],
      participant: CallParticipant.fromJson(json['participant']),
      call: CallInfo.fromJson(json['call']),
    );
  }
}

class CallInfo {
  final String id;
  final String title;
  final String callType;
  final bool isGroupCall;
  final String hostUserId;

  CallInfo({
    required this.id,
    required this.title,
    required this.callType,
    required this.isGroupCall,
    required this.hostUserId,
  });

  factory CallInfo.fromJson(Map<String, dynamic> json) {
    return CallInfo(
      id: json['id'],
      title: json['title'],
      callType: json['call_type'],
      isGroupCall: json['is_group_call'],
      hostUserId: json['host_user_id'],
    );
  }
}

class CallRecording {
  final String id;
  final String videoCallId;
  final String fluxezRecordingId;
  final String? recordingUrl;
  final String? transcriptUrl;
  final int durationSeconds;
  final int fileSizeBytes;
  final String status; // 'recording', 'processing', 'completed', 'failed'
  final DateTime? startedAt;
  final DateTime? completedAt;
  final Map<String, dynamic>? metadata;
  final DateTime createdAt;

  CallRecording({
    required this.id,
    required this.videoCallId,
    required this.fluxezRecordingId,
    this.recordingUrl,
    this.transcriptUrl,
    required this.durationSeconds,
    required this.fileSizeBytes,
    required this.status,
    this.startedAt,
    this.completedAt,
    this.metadata,
    required this.createdAt,
  });

  factory CallRecording.fromJson(Map<String, dynamic> json) {
    return CallRecording(
      id: json['id'],
      videoCallId: json['video_call_id'],
      fluxezRecordingId: json['fluxez_recording_id'],
      recordingUrl: json['recording_url'],
      transcriptUrl: json['transcript_url'],
      durationSeconds: json['duration_seconds'] ?? 0,
      fileSizeBytes: json['file_size_bytes'] ?? 0,
      status: json['status'],
      startedAt: json['started_at'] != null
          ? DateTime.parse(json['started_at'])
          : null,
      completedAt: json['completed_at'] != null
          ? DateTime.parse(json['completed_at'])
          : null,
      metadata: json['metadata'],
      createdAt: DateTime.parse(json['created_at']),
    );
  }
}

class IncomingCallData {
  final String callId;
  final String callType;
  final bool isGroupCall;
  final CallerInfo from;
  final List<String>? participantIds;
  final DateTime timestamp;

  IncomingCallData({
    required this.callId,
    required this.callType,
    required this.isGroupCall,
    required this.from,
    this.participantIds,
    required this.timestamp,
  });

  factory IncomingCallData.fromJson(Map<String, dynamic> json) {
    return IncomingCallData(
      callId: json['callId'],
      callType: json['callType'],
      isGroupCall: json['isGroupCall'],
      from: CallerInfo.fromJson(json['from']),
      participantIds: json['participants'] != null
          ? List<String>.from(json['participants'])
          : null,
      timestamp: DateTime.parse(json['timestamp']),
    );
  }
}

class CallerInfo {
  final String id;
  final String name;
  final String? avatar;

  CallerInfo({
    required this.id,
    required this.name,
    this.avatar,
  });

  factory CallerInfo.fromJson(Map<String, dynamic> json) {
    return CallerInfo(
      id: json['id'],
      name: json['name'],
      avatar: json['avatar'],
    );
  }
}
