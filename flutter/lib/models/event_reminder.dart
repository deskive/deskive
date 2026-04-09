enum ReminderNotificationType { email, push, sms }

/// Reminder type enum used by event_reminders widget
enum ReminderType { notification, email, popup }

class EventReminder {
  final String? id;
  final String eventId;
  final int reminderTime; // Minutes before event (alias: minutesBefore)
  final ReminderNotificationType notificationType;
  final ReminderType type; // Used by event_reminders widget
  final bool isActive;
  final String? message;
  final DateTime createdAt;

  EventReminder({
    this.id,
    required this.eventId,
    int? reminderTime,
    int? minutesBefore, // Alias for reminderTime
    this.notificationType = ReminderNotificationType.email,
    this.type = ReminderType.notification,
    this.isActive = true,
    this.message,
    DateTime? createdAt,
  })  : reminderTime = reminderTime ?? minutesBefore ?? 15,
        createdAt = createdAt ?? DateTime.now();

  /// Alias for reminderTime for compatibility with event_reminders widget
  int get minutesBefore => reminderTime;

  Map<String, dynamic> toMap() {
    return {
      if (id != null) 'id': id,
      'event_id': eventId,
      'reminder_time': reminderTime,
      'notification_type': notificationType.name,
      'type': type.name,
      'is_active': isActive,
      if (message != null) 'message': message,
      'created_at': createdAt.toIso8601String(),
    };
  }

  factory EventReminder.fromMap(Map<String, dynamic> map) {
    return EventReminder(
      id: map['id'],
      eventId: map['event_id'] ?? '',
      reminderTime: map['reminder_time'] ?? map['minutes_before'] ?? 15,
      notificationType: _parseNotificationType(map['notification_type']),
      type: _parseReminderType(map['type']),
      isActive: map['is_active'] ?? true,
      message: map['message'],
      createdAt: map['created_at'] != null
          ? DateTime.parse(map['created_at'])
          : DateTime.now(),
    );
  }

  static ReminderNotificationType _parseNotificationType(String? value) {
    switch (value) {
      case 'push':
        return ReminderNotificationType.push;
      case 'sms':
        return ReminderNotificationType.sms;
      default:
        return ReminderNotificationType.email;
    }
  }

  static ReminderType _parseReminderType(String? value) {
    switch (value) {
      case 'email':
        return ReminderType.email;
      case 'popup':
        return ReminderType.popup;
      default:
        return ReminderType.notification;
    }
  }

  EventReminder copyWith({
    String? id,
    String? eventId,
    int? reminderTime,
    int? minutesBefore,
    ReminderNotificationType? notificationType,
    ReminderType? type,
    bool? isActive,
    String? message,
    DateTime? createdAt,
  }) {
    return EventReminder(
      id: id ?? this.id,
      eventId: eventId ?? this.eventId,
      reminderTime: reminderTime ?? minutesBefore ?? this.reminderTime,
      notificationType: notificationType ?? this.notificationType,
      type: type ?? this.type,
      isActive: isActive ?? this.isActive,
      message: message ?? this.message,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  // Helper method to get human-readable reminder time
  String get displayTime {
    if (reminderTime < 60) {
      return '$reminderTime minutes';
    } else if (reminderTime < 1440) {
      final hours = reminderTime ~/ 60;
      return '$hours ${hours == 1 ? "hour" : "hours"}';
    } else {
      final days = reminderTime ~/ 1440;
      return '$days ${days == 1 ? "day" : "days"}';
    }
  }

  @override
  String toString() {
    return 'EventReminder{id: $id, eventId: $eventId, reminderTime: $reminderTime}';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is EventReminder &&
        other.id == id &&
        other.eventId == eventId;
  }

  @override
  int get hashCode => Object.hash(id, eventId);
}