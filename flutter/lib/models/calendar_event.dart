import 'package:flutter/material.dart';
import 'event_attendee.dart';
import 'event_reminder.dart';

enum EventVisibility { private, public }
enum EventBusyStatus { busy, free, tentative }
enum EventPriority { lowest, low, normal, high, highest }
enum EventStatus { confirmed, tentative, cancelled }

/// Unified attachments model for calendar events
/// Supports both simple string arrays (for sending) and enriched objects (from API response)
class CalendarEventAttachments {
  final List<String> fileAttachment;
  final List<String> noteAttachment;
  final List<String> eventAttachment;

  // Enriched data (populated when receiving from API)
  final List<Map<String, dynamic>> fileAttachmentDetails;
  final List<Map<String, dynamic>> noteAttachmentDetails;
  final List<Map<String, dynamic>> eventAttachmentDetails;

  CalendarEventAttachments({
    List<String>? fileAttachment,
    List<String>? noteAttachment,
    List<String>? eventAttachment,
    List<Map<String, dynamic>>? fileAttachmentDetails,
    List<Map<String, dynamic>>? noteAttachmentDetails,
    List<Map<String, dynamic>>? eventAttachmentDetails,
  })  : fileAttachment = fileAttachment ?? [],
        noteAttachment = noteAttachment ?? [],
        eventAttachment = eventAttachment ?? [],
        fileAttachmentDetails = fileAttachmentDetails ?? [],
        noteAttachmentDetails = noteAttachmentDetails ?? [],
        eventAttachmentDetails = eventAttachmentDetails ?? [];

  factory CalendarEventAttachments.fromMap(Map<String, dynamic> map) {
    // Helper to extract IDs from either string array or object array
    List<String> extractIds(dynamic data) {
      if (data == null) return [];
      if (data is! List) return [];

      return data.map<String>((item) {
        if (item is String) return item;
        if (item is Map) return item['id']?.toString() ?? '';
        return '';
      }).where((id) => id.isNotEmpty).toList();
    }

    // Helper to extract full details if available
    List<Map<String, dynamic>> extractDetails(dynamic data) {
      if (data == null) return [];
      if (data is! List) return [];

      return data
          .where((item) => item is Map)
          .map<Map<String, dynamic>>((item) => Map<String, dynamic>.from(item as Map))
          .toList();
    }

    return CalendarEventAttachments(
      fileAttachment: extractIds(map['file_attachment']),
      noteAttachment: extractIds(map['note_attachment']),
      eventAttachment: extractIds(map['event_attachment']),
      fileAttachmentDetails: extractDetails(map['file_attachment']),
      noteAttachmentDetails: extractDetails(map['note_attachment']),
      eventAttachmentDetails: extractDetails(map['event_attachment']),
    );
  }

  Map<String, dynamic> toMap() => {
    'file_attachment': fileAttachment,
    'note_attachment': noteAttachment,
    'event_attachment': eventAttachment,
  };

  bool get isEmpty => fileAttachment.isEmpty && noteAttachment.isEmpty && eventAttachment.isEmpty;
  bool get isNotEmpty => !isEmpty;
}

class CalendarEvent {
  final String? id;
  final String workspaceId;
  final String? userId;
  final String title;
  final String? description;
  final DateTime startTime;
  final DateTime endTime;
  final bool allDay;
  final String? location;
  final String? organizerId;
  final String? categoryId;
  final List<Map<String, dynamic>> attendees;
  final CalendarEventAttachments? attachments;
  final Map<String, dynamic>? recurrenceRule;
  final bool isRecurring;
  final String? parentEventId;
  final String? meetingUrl;
  final EventVisibility visibility;
  final EventBusyStatus busyStatus;
  final EventPriority priority;
  final EventStatus status;
  final String? roomId;
  final String? lastModifiedBy;
  final Map<String, dynamic> collaborativeData;
  final DateTime createdAt;
  final DateTime updatedAt;

  // Additional fields for UI
  final List<EventAttendee>? attendeesList;
  final List<EventReminder>? reminders;

  // Google Calendar sync fields
  final bool syncedFromGoogle;
  final String? googleCalendarEventId;
  final String? googleCalendarHtmlLink;
  final String? googleCalendarName;
  final String? googleCalendarColor;

  /// Returns true if this event was synced from Google Calendar
  bool get isGoogleEvent => syncedFromGoogle == true;

  CalendarEvent({
    this.id,
    required this.workspaceId,
    this.userId,
    required this.title,
    this.description,
    required this.startTime,
    required this.endTime,
    this.allDay = false,
    this.location,
    this.organizerId,
    this.categoryId,
    this.attendees = const [],
    this.attachments,
    this.recurrenceRule,
    this.isRecurring = false,
    this.parentEventId,
    this.meetingUrl,
    this.visibility = EventVisibility.private,
    this.busyStatus = EventBusyStatus.busy,
    this.priority = EventPriority.normal,
    this.status = EventStatus.confirmed,
    this.roomId,
    this.lastModifiedBy,
    this.collaborativeData = const {},
    DateTime? createdAt,
    DateTime? updatedAt,
    this.attendeesList,
    this.reminders,
    // Google Calendar sync fields
    this.syncedFromGoogle = false,
    this.googleCalendarEventId,
    this.googleCalendarHtmlLink,
    this.googleCalendarName,
    this.googleCalendarColor,
  })  : createdAt = createdAt ?? DateTime.now(),
        updatedAt = updatedAt ?? DateTime.now();

  Map<String, dynamic> toMap() {
    // Convert priority values for API compatibility
    String priorityValue = priority.name;
    if (priorityValue == 'normal') {
      priorityValue = 'medium';  // API uses 'medium' instead of 'normal'
    } else if (priorityValue == 'highest') {
      priorityValue = 'urgent';  // API uses 'urgent' instead of 'highest'
    }

    return {
      if (id != null) 'id': id,
      'workspace_id': workspaceId,
      'user_id': userId,
      'title': title,
      'description': description,
      'start_time': startTime.toUtc().toIso8601String(),
      'end_time': endTime.toUtc().toIso8601String(),
      'all_day': allDay,
      'location': location,
      'organizer_id': organizerId,
      'category_id': categoryId,
      'attendees': attendees,
      if (attachments != null) 'attachments': attachments!.toMap(),
      'recurrence_rule': recurrenceRule,
      'is_recurring': isRecurring,
      'parent_event_id': parentEventId,
      'meeting_url': meetingUrl,
      'visibility': visibility.name,
      'busy_status': busyStatus.name,
      'priority': priorityValue,
      'status': status.name,
      'room_id': roomId,
      'last_modified_by': lastModifiedBy,
      'collaborative_data': collaborativeData,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  factory CalendarEvent.fromMap(Map<String, dynamic> map) {
    // Handle both camelCase (from Google) and snake_case (from local DB)
    final startTimeStr = map['start_time'] ?? map['startTime'];
    final endTimeStr = map['end_time'] ?? map['endTime'];

    return CalendarEvent(
      id: map['id'],
      workspaceId: map['workspace_id'] ?? map['workspaceId'] ?? '',
      userId: map['user_id'] ?? map['userId'],
      title: map['title'] ?? '',
      description: map['description'],
      startTime: startTimeStr != null
          ? DateTime.parse(startTimeStr).toLocal()
          : DateTime.now(),
      endTime: endTimeStr != null
          ? DateTime.parse(endTimeStr).toLocal()
          : DateTime.now().add(const Duration(hours: 1)),
      allDay: map['all_day'] ?? map['allDay'] ?? false,
      location: map['location'],
      organizerId: map['organizer_id'] ?? map['organizerId'],
      categoryId: map['category_id'] ?? map['categoryId'],
      attendees: map['attendees'] is List
          ? (map['attendees'] as List).map((item) {
              // Handle both string format and map format
              if (item is String) {
                return {'email': item};
              } else if (item is Map) {
                return Map<String, dynamic>.from(item);
              }
              return <String, dynamic>{};
            }).toList()
          : [],
      attachments: map['attachments'] is Map
          ? CalendarEventAttachments.fromMap(Map<String, dynamic>.from(map['attachments']))
          : null,
      recurrenceRule: map['recurrence_rule'] ?? map['recurrenceRule'] is Map
          ? Map<String, dynamic>.from(map['recurrence_rule'] ?? map['recurrenceRule'])
          : null,
      isRecurring: map['is_recurring'] ?? map['isRecurring'] ?? false,
      parentEventId: map['parent_event_id'] ?? map['parentEventId'],
      meetingUrl: map['meeting_url'] ?? map['meetingUrl'],
      visibility: _parseVisibility(map['visibility']),
      busyStatus: _parseBusyStatus(map['busy_status'] ?? map['busyStatus']),
      priority: _parsePriority(map['priority']),
      status: _parseStatus(map['status']),
      roomId: map['room_id'] ?? map['roomId'],
      lastModifiedBy: map['last_modified_by'] ?? map['lastModifiedBy'],
      collaborativeData: map['collaborative_data'] ?? map['collaborativeData'] is Map
          ? Map<String, dynamic>.from(map['collaborative_data'] ?? map['collaborativeData'] ?? {})
          : {},
      createdAt: map['created_at'] != null
          ? DateTime.parse(map['created_at'])
          : map['createdAt'] != null
              ? DateTime.parse(map['createdAt'])
              : DateTime.now(),
      updatedAt: map['updated_at'] != null
          ? DateTime.parse(map['updated_at'])
          : map['updatedAt'] != null
              ? DateTime.parse(map['updatedAt'])
              : DateTime.now(),
      // Google Calendar sync fields
      syncedFromGoogle: map['synced_from_google'] ?? map['syncedFromGoogle'] ?? false,
      googleCalendarEventId: map['google_calendar_event_id'] ?? map['googleCalendarEventId'],
      googleCalendarHtmlLink: map['google_calendar_html_link'] ?? map['googleCalendarHtmlLink'],
      googleCalendarName: map['google_calendar_name'] ?? map['googleCalendarName'],
      googleCalendarColor: map['google_calendar_color'] ?? map['googleCalendarColor'],
    );
  }

  // Alias for API compatibility
  factory CalendarEvent.fromJson(Map<String, dynamic> json) => CalendarEvent.fromMap(json);

  static EventVisibility _parseVisibility(String? value) {
    switch (value) {
      case 'public':
        return EventVisibility.public;
      default:
        return EventVisibility.private;
    }
  }

  static EventBusyStatus _parseBusyStatus(String? value) {
    switch (value) {
      case 'free':
        return EventBusyStatus.free;
      case 'tentative':
        return EventBusyStatus.tentative;
      default:
        return EventBusyStatus.busy;
    }
  }

  static EventPriority _parsePriority(String? value) {
    EventPriority result;
    switch (value) {
      case 'lowest':
        result = EventPriority.lowest;
        break;
      case 'low':
        result = EventPriority.low;
        break;
      case 'medium':  // API uses 'medium'
      case 'normal':  // Model uses 'normal'
        result = EventPriority.normal;
        break;
      case 'high':
        result = EventPriority.high;
        break;
      case 'urgent':  // API uses 'urgent'
      case 'highest': // Model uses 'highest'
        result = EventPriority.highest;
        break;
      default:
        result = EventPriority.normal;
        break;
    }
    return result;
  }

  static EventStatus _parseStatus(String? value) {
    switch (value) {
      case 'tentative':
        return EventStatus.tentative;
      case 'cancelled':
        return EventStatus.cancelled;
      default:
        return EventStatus.confirmed;
    }
  }

  CalendarEvent copyWith({
    String? id,
    String? workspaceId,
    String? userId,
    String? title,
    String? description,
    DateTime? startTime,
    DateTime? endTime,
    bool? allDay,
    String? location,
    String? organizerId,
    String? categoryId,
    List<Map<String, dynamic>>? attendees,
    CalendarEventAttachments? attachments,
    Map<String, dynamic>? recurrenceRule,
    bool? isRecurring,
    String? parentEventId,
    String? meetingUrl,
    EventVisibility? visibility,
    EventBusyStatus? busyStatus,
    EventPriority? priority,
    EventStatus? status,
    String? roomId,
    String? lastModifiedBy,
    Map<String, dynamic>? collaborativeData,
    DateTime? createdAt,
    DateTime? updatedAt,
    List<EventAttendee>? attendeesList,
    List<EventReminder>? reminders,
    // Google Calendar sync fields
    bool? syncedFromGoogle,
    String? googleCalendarEventId,
    String? googleCalendarHtmlLink,
    String? googleCalendarName,
    String? googleCalendarColor,
  }) {
    return CalendarEvent(
      id: id ?? this.id,
      workspaceId: workspaceId ?? this.workspaceId,
      userId: userId ?? this.userId,
      title: title ?? this.title,
      description: description ?? this.description,
      startTime: startTime ?? this.startTime,
      endTime: endTime ?? this.endTime,
      allDay: allDay ?? this.allDay,
      location: location ?? this.location,
      organizerId: organizerId ?? this.organizerId,
      categoryId: categoryId ?? this.categoryId,
      attendees: attendees ?? this.attendees,
      attachments: attachments ?? this.attachments,
      recurrenceRule: recurrenceRule ?? this.recurrenceRule,
      isRecurring: isRecurring ?? this.isRecurring,
      parentEventId: parentEventId ?? this.parentEventId,
      meetingUrl: meetingUrl ?? this.meetingUrl,
      visibility: visibility ?? this.visibility,
      busyStatus: busyStatus ?? this.busyStatus,
      priority: priority ?? this.priority,
      status: status ?? this.status,
      roomId: roomId ?? this.roomId,
      lastModifiedBy: lastModifiedBy ?? this.lastModifiedBy,
      collaborativeData: collaborativeData ?? this.collaborativeData,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      attendeesList: attendeesList ?? this.attendeesList,
      reminders: reminders ?? this.reminders,
      // Google Calendar sync fields
      syncedFromGoogle: syncedFromGoogle ?? this.syncedFromGoogle,
      googleCalendarEventId: googleCalendarEventId ?? this.googleCalendarEventId,
      googleCalendarHtmlLink: googleCalendarHtmlLink ?? this.googleCalendarHtmlLink,
      googleCalendarName: googleCalendarName ?? this.googleCalendarName,
      googleCalendarColor: googleCalendarColor ?? this.googleCalendarColor,
    );
  }

  @override
  String toString() {
    return 'CalendarEvent{id: $id, title: $title, startTime: $startTime, endTime: $endTime}';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is CalendarEvent && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;

  // Helper methods
  Duration get duration => endTime.difference(startTime);
  
  bool get isMultiDay {
    return !allDay && 
           (endTime.difference(startTime).inDays > 0 ||
            endTime.day != startTime.day);
  }
  
  bool get isPast => endTime.isBefore(DateTime.now());
  
  bool get isOngoing {
    final now = DateTime.now();
    return startTime.isBefore(now) && endTime.isAfter(now);
  }
  
  bool get isFuture => startTime.isAfter(DateTime.now());
  
  // Backward compatibility properties for old UI code
  String get type => categoryId ?? 'general';
  Color get color {
    // Default colors based on priority or category
    switch (priority) {
      case EventPriority.highest:
        return Colors.red;
      case EventPriority.high:
        return Colors.orange;
      case EventPriority.normal:
        return Colors.blue;
      case EventPriority.low:
        return Colors.green;
      case EventPriority.lowest:
        return Colors.grey;
    }
  }
}