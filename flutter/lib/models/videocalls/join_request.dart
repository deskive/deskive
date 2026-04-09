/// Join Request Model
/// Represents a request from a user to join a video call they weren't invited to

class JoinRequest {
  final String id;
  final String viseoCallId;
  final String userId;
  final String displayName;
  final String? message;
  final String? avatar;
  final String status; // 'pending', 'accepted', 'rejected'
  final String requestedAt;
  final String? respondedAt;
  final String? respondedBy;

  JoinRequest({
    required this.id,
    required this.viseoCallId,
    required this.userId,
    required this.displayName,
    this.message,
    this.avatar,
    required this.status,
    required this.requestedAt,
    this.respondedAt,
    this.respondedBy,
  });

  factory JoinRequest.fromJson(Map<String, dynamic> json) {
    return JoinRequest(
      id: json['id'] ?? '',
      viseoCallId: json['video_call_id'] ?? '',
      userId: json['user_id'] ?? '',
      displayName: json['display_name'] ?? 'Unknown',
      message: json['message'],
      avatar: json['avatar'],
      status: json['status'] ?? 'pending',
      requestedAt: json['requested_at'] ?? json['timestamp'] ?? DateTime.now().toIso8601String(),
      respondedAt: json['responded_at'],
      respondedBy: json['responded_by'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'video_call_id': viseoCallId,
      'user_id': userId,
      'display_name': displayName,
      'message': message,
      'avatar': avatar,
      'status': status,
      'requested_at': requestedAt,
      'responded_at': respondedAt,
      'responded_by': respondedBy,
    };
  }

  /// Create from WebSocket event data
  factory JoinRequest.fromSocketEvent(Map<String, dynamic> data) {
    final request = data['request'] as Map<String, dynamic>? ?? data;
    return JoinRequest(
      id: request['id'] ?? '',
      viseoCallId: data['call_id'] ?? request['video_call_id'] ?? '',
      userId: request['user_id'] ?? '',
      displayName: request['display_name'] ?? 'Unknown',
      message: request['message'],
      avatar: request['avatar'],
      status: 'pending',
      requestedAt: request['timestamp'] ?? request['requested_at'] ?? DateTime.now().toIso8601String(),
    );
  }

  @override
  String toString() {
    return 'JoinRequest(id: $id, userId: $userId, displayName: $displayName, status: $status)';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is JoinRequest && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;
}

/// Response when a join request is accepted
class JoinRequestAcceptedData {
  final String callId;
  final String requestId;
  final String message;

  JoinRequestAcceptedData({
    required this.callId,
    required this.requestId,
    required this.message,
  });

  factory JoinRequestAcceptedData.fromJson(Map<String, dynamic> json) {
    return JoinRequestAcceptedData(
      callId: json['call_id'] ?? '',
      requestId: json['request_id'] ?? '',
      message: json['message'] ?? 'Your request was accepted',
    );
  }
}

/// Response when a join request is rejected
class JoinRequestRejectedData {
  final String callId;
  final String requestId;
  final String message;

  JoinRequestRejectedData({
    required this.callId,
    required this.requestId,
    required this.message,
  });

  factory JoinRequestRejectedData.fromJson(Map<String, dynamic> json) {
    return JoinRequestRejectedData(
      callId: json['call_id'] ?? '',
      requestId: json['request_id'] ?? '',
      message: json['message'] ?? 'Your request was rejected',
    );
  }
}
