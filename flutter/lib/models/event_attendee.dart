enum AttendeeStatus { pending, accepted, declined, tentative }

class EventAttendee {
  final String? id;
  final String eventId;
  final String userId;
  final AttendeeStatus status;
  final DateTime? responseAt;
  final DateTime createdAt;
  
  // Additional fields for UI
  final String? userName;
  final String? userEmail;
  final String? userAvatar;

  EventAttendee({
    this.id,
    required this.eventId,
    required this.userId,
    this.status = AttendeeStatus.pending,
    this.responseAt,
    DateTime? createdAt,
    this.userName,
    this.userEmail,
    this.userAvatar,
  }) : createdAt = createdAt ?? DateTime.now();

  Map<String, dynamic> toMap() {
    return {
      if (id != null) 'id': id,
      'event_id': eventId,
      'user_id': userId,
      'status': status.name,
      'response_at': responseAt?.toIso8601String(),
      'created_at': createdAt.toIso8601String(),
    };
  }

  factory EventAttendee.fromMap(Map<String, dynamic> map) {
    return EventAttendee(
      id: map['id'],
      eventId: map['event_id'] ?? '',
      userId: map['user_id'] ?? '',
      status: _parseStatus(map['status']),
      responseAt: map['response_at'] != null
          ? DateTime.parse(map['response_at'])
          : null,
      createdAt: map['created_at'] != null
          ? DateTime.parse(map['created_at'])
          : DateTime.now(),
      userName: map['user_name'],
      userEmail: map['user_email'],
      userAvatar: map['user_avatar'],
    );
  }

  static AttendeeStatus _parseStatus(String? value) {
    switch (value) {
      case 'accepted':
        return AttendeeStatus.accepted;
      case 'declined':
        return AttendeeStatus.declined;
      case 'tentative':
        return AttendeeStatus.tentative;
      default:
        return AttendeeStatus.pending;
    }
  }

  EventAttendee copyWith({
    String? id,
    String? eventId,
    String? userId,
    AttendeeStatus? status,
    DateTime? responseAt,
    DateTime? createdAt,
    String? userName,
    String? userEmail,
    String? userAvatar,
  }) {
    return EventAttendee(
      id: id ?? this.id,
      eventId: eventId ?? this.eventId,
      userId: userId ?? this.userId,
      status: status ?? this.status,
      responseAt: responseAt ?? this.responseAt,
      createdAt: createdAt ?? this.createdAt,
      userName: userName ?? this.userName,
      userEmail: userEmail ?? this.userEmail,
      userAvatar: userAvatar ?? this.userAvatar,
    );
  }

  @override
  String toString() {
    return 'EventAttendee{id: $id, userId: $userId, status: $status}';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is EventAttendee && 
           other.id == id &&
           other.eventId == eventId &&
           other.userId == userId;
  }

  @override
  int get hashCode => Object.hash(id, eventId, userId);
}