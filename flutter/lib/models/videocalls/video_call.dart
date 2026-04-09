/// Video Call Model
class VideoCall {
  final String id;
  final String workspaceId;
  final String fluxezRoomId;
  final String title;
  final String description;
  final String hostUserId;
  final String callType; // video, audio
  final bool isGroupCall;
  final String status; // active, ended, scheduled
  final bool isRecording;
  final int participantCount; // Number of participants in the call
  final List<String>? invitees; // List of user IDs invited to the call
  final String? scheduledStartTime;
  final String? scheduledEndTime;
  final String? actualStartTime;
  final String? actualEndTime;
  final Map<String, dynamic> settings;
  final Map<String, dynamic> metadata;
  final String createdAt;
  final String updatedAt;

  VideoCall({
    required this.id,
    required this.workspaceId,
    required this.fluxezRoomId,
    required this.title,
    required this.description,
    required this.hostUserId,
    required this.callType,
    required this.isGroupCall,
    required this.status,
    required this.isRecording,
    required this.participantCount,
    this.invitees,
    this.scheduledStartTime,
    this.scheduledEndTime,
    this.actualStartTime,
    this.actualEndTime,
    required this.settings,
    required this.metadata,
    required this.createdAt,
    required this.updatedAt,
  });

  factory VideoCall.fromJson(Map<String, dynamic> json) {
    return VideoCall(
      id: json['id'] as String,
      workspaceId: json['workspace_id'] as String,
      fluxezRoomId: json['fluxez_room_id'] as String,
      title: json['title'] as String,
      description: json['description'] as String? ?? '',
      hostUserId: json['host_user_id'] as String,
      callType: json['call_type'] as String,
      isGroupCall: json['is_group_call'] as bool? ?? false,
      status: json['status'] as String,
      isRecording: json['is_recording'] as bool? ?? false,
      participantCount: json['participant_count'] as int? ?? 0,
      invitees: json['invitees'] != null
          ? List<String>.from(json['invitees'] as List)
          : null,
      scheduledStartTime: json['scheduled_start_time'] as String?,
      scheduledEndTime: json['scheduled_end_time'] as String?,
      actualStartTime: json['actual_start_time'] as String?,
      actualEndTime: json['actual_end_time'] as String?,
      settings: json['settings'] as Map<String, dynamic>? ?? {},
      metadata: json['metadata'] as Map<String, dynamic>? ?? {},
      createdAt: json['created_at'] as String,
      updatedAt: json['updated_at'] as String,
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
      'participant_count': participantCount,
      'invitees': invitees,
      'scheduled_start_time': scheduledStartTime,
      'scheduled_end_time': scheduledEndTime,
      'actual_start_time': actualStartTime,
      'actual_end_time': actualEndTime,
      'settings': settings,
      'metadata': metadata,
      'created_at': createdAt,
      'updated_at': updatedAt,
    };
  }

  /// Calculate duration in seconds if call has ended
  int? get durationSeconds {
    if (actualStartTime != null && actualEndTime != null) {
      final start = DateTime.parse(actualStartTime!);
      final end = DateTime.parse(actualEndTime!);
      return end.difference(start).inSeconds;
    }
    return null;
  }

  /// Get formatted duration
  String get formattedDuration {
    final duration = durationSeconds;
    if (duration == null) return 'Ongoing';

    final hours = duration ~/ 3600;
    final minutes = (duration % 3600) ~/ 60;

    if (hours > 0) {
      return '${hours}h ${minutes}m';
    } else if (minutes > 0) {
      return '${minutes}m';
    } else {
      return '${duration}s';
    }
  }

  /// Check if call is currently active
  bool get isActive => status == 'active';

  /// Check if call has ended
  bool get hasEnded => status == 'ended';

  /// Check if call is scheduled
  bool get isScheduled => status == 'scheduled';

  /// Get formatted date (MM/DD/YYYY) in local time
  String get formattedDate {
    final utcDateTime = actualStartTime != null
        ? DateTime.parse(actualStartTime!)
        : (scheduledStartTime != null
            ? DateTime.parse(scheduledStartTime!)
            : DateTime.parse(createdAt));

    // Convert UTC to local time
    final localDateTime = utcDateTime.toLocal();

    return '${localDateTime.month.toString().padLeft(2, '0')}/${localDateTime.day.toString().padLeft(2, '0')}/${localDateTime.year}';
  }

  /// Get formatted time (h:mm:ss AM/PM) in local time
  String get formattedTime {
    final utcDateTime = actualStartTime != null
        ? DateTime.parse(actualStartTime!)
        : (scheduledStartTime != null
            ? DateTime.parse(scheduledStartTime!)
            : DateTime.parse(createdAt));

    // Convert UTC to local time
    final localDateTime = utcDateTime.toLocal();

    final hour = localDateTime.hour;
    final minute = localDateTime.minute.toString().padLeft(2, '0');
    final second = localDateTime.second.toString().padLeft(2, '0');
    final period = hour >= 12 ? 'PM' : 'AM';
    final displayHour = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);

    return '$displayHour:$minute:$second $period';
  }
}
