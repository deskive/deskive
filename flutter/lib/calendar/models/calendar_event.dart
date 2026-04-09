import 'package:flutter/material.dart';

/// A simplified CalendarEvent model for UI display in calendar screens.
/// This is separate from the main CalendarEvent model in lib/models/calendar_event.dart
/// which is used for API communication.
class CalendarEvent {
  final String? id;
  final String title;
  final String? description;
  final DateTime startTime;
  final DateTime endTime;
  final String type;
  final Color color;
  final List<String> attendees;
  final bool allDay;
  final String? location;
  final String? workspaceId;

  CalendarEvent({
    this.id,
    required this.title,
    this.description,
    required this.startTime,
    required this.endTime,
    this.type = 'general',
    this.color = Colors.blue,
    this.attendees = const [],
    this.allDay = false,
    this.location,
    this.workspaceId,
  });

  /// Create a copy with modified fields
  CalendarEvent copyWith({
    String? id,
    String? title,
    String? description,
    DateTime? startTime,
    DateTime? endTime,
    String? type,
    Color? color,
    List<String>? attendees,
    bool? allDay,
    String? location,
    String? workspaceId,
  }) {
    return CalendarEvent(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      startTime: startTime ?? this.startTime,
      endTime: endTime ?? this.endTime,
      type: type ?? this.type,
      color: color ?? this.color,
      attendees: attendees ?? this.attendees,
      allDay: allDay ?? this.allDay,
      location: location ?? this.location,
      workspaceId: workspaceId ?? this.workspaceId,
    );
  }

  /// Duration of the event
  Duration get duration => endTime.difference(startTime);

  /// Check if event spans multiple days
  bool get isMultiDay {
    return !allDay &&
        (endTime.difference(startTime).inDays > 0 ||
            endTime.day != startTime.day);
  }

  /// Check if event is in the past
  bool get isPast => endTime.isBefore(DateTime.now());

  /// Check if event is currently ongoing
  bool get isOngoing {
    final now = DateTime.now();
    return startTime.isBefore(now) && endTime.isAfter(now);
  }

  /// Check if event is in the future
  bool get isFuture => startTime.isAfter(DateTime.now());

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is CalendarEvent && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() {
    return 'CalendarEvent{id: $id, title: $title, startTime: $startTime, endTime: $endTime}';
  }
}
