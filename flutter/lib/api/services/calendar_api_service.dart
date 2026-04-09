import 'package:dio/dio.dart';
import '../base_api_client.dart';

/// DTO classes for Calendar operations
class CreateEventDto {
  final String title;
  final String? description;
  final DateTime startTime;
  final DateTime endTime;
  final String? location;
  final bool allDay;
  final String? roomId;
  final String? categoryId;
  final List<String>? attendees; // List of email addresses
  final EventAttachments? attachments; // Unified attachments object
  final List<String>? descriptionFileIds; // IDs of files/notes/events referenced in description
  final List<int>? reminders; // List of reminder minutes (e.g., [5, 15, 60])
  final String? meetingUrl;
  final String? visibility; // 'public', 'private'
  final String? priority; // 'low', 'normal', 'high', 'urgent'
  final String? status; // 'confirmed', 'tentative', 'cancelled'
  final bool isRecurring;
  final Map<String, dynamic>? recurrenceRule;
  final Map<String, dynamic>? metadata;

  CreateEventDto({
    required this.title,
    this.description,
    required this.startTime,
    required this.endTime,
    this.location,
    this.allDay = false,
    this.roomId,
    this.categoryId,
    this.attendees,
    this.attachments,
    this.descriptionFileIds,
    this.reminders,
    this.meetingUrl,
    this.visibility,
    this.priority,
    this.status,
    this.isRecurring = false,
    this.recurrenceRule,
    this.metadata,
  });

  Map<String, dynamic> toJson() => {
    'title': title,
    if (description != null) 'description': description,
    'start_time': startTime.toUtc().toIso8601String(),
    'end_time': endTime.toUtc().toIso8601String(),
    if (location != null) 'location': location,
    'all_day': allDay,
    if (roomId != null) 'room_id': roomId,
    if (categoryId != null) 'category_id': categoryId,
    if (attendees != null) 'attendees': attendees,
    if (attachments != null) 'attachments': attachments!.toJson(),
    if (descriptionFileIds != null && descriptionFileIds!.isNotEmpty) 'description_file_ids': descriptionFileIds,
    if (reminders != null) 'reminders': reminders,
    if (meetingUrl != null) 'meeting_url': meetingUrl,
    if (visibility != null) 'visibility': visibility,
    if (priority != null) 'priority': priority,
    if (status != null) 'status': status,
    'is_recurring': isRecurring,
    if (recurrenceRule != null) 'recurrence_rule': recurrenceRule,
    if (metadata != null) 'metadata': metadata,
  };
}

/// Unified attachments object for calendar events
/// Supports both simple string arrays (for sending) and enriched objects (from API response)
class EventAttachments {
  final List<String> fileAttachment;
  final List<String> noteAttachment;
  final List<String> eventAttachment;
  final List<Map<String, dynamic>> driveAttachment;

  // Enriched data (populated when receiving from API)
  final List<Map<String, dynamic>> fileAttachmentDetails;
  final List<Map<String, dynamic>> noteAttachmentDetails;
  final List<Map<String, dynamic>> eventAttachmentDetails;

  EventAttachments({
    List<String>? fileAttachment,
    List<String>? noteAttachment,
    List<String>? eventAttachment,
    List<Map<String, dynamic>>? driveAttachment,
    List<Map<String, dynamic>>? fileAttachmentDetails,
    List<Map<String, dynamic>>? noteAttachmentDetails,
    List<Map<String, dynamic>>? eventAttachmentDetails,
  })  : fileAttachment = fileAttachment ?? [],
        noteAttachment = noteAttachment ?? [],
        eventAttachment = eventAttachment ?? [],
        driveAttachment = driveAttachment ?? [],
        fileAttachmentDetails = fileAttachmentDetails ?? [],
        noteAttachmentDetails = noteAttachmentDetails ?? [],
        eventAttachmentDetails = eventAttachmentDetails ?? [];

  Map<String, dynamic> toJson() => {
    'file_attachment': fileAttachment,
    'note_attachment': noteAttachment,
    'event_attachment': eventAttachment,
    if (driveAttachment.isNotEmpty)
      'drive_attachment': driveAttachment.map((d) => {
        'id': d['id'],
        'title': d['title'],
        'driveFileUrl': d['driveFileUrl'],
        'driveThumbnailUrl': d['driveThumbnailUrl'],
        'driveMimeType': d['driveMimeType'],
        'driveFileSize': d['driveFileSize'],
      }).toList(),
  };

  factory EventAttachments.fromJson(Map<String, dynamic> json) {
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

    // Helper to extract drive attachments (array of objects with full metadata)
    List<Map<String, dynamic>> extractDriveAttachments(dynamic data) {
      if (data == null) return [];
      if (data is! List) return [];

      return data
          .whereType<Map>()
          .map<Map<String, dynamic>>((map) {
            return <String, dynamic>{
              'id': map['id']?.toString() ?? '',
              'title': map['title']?.toString() ?? '',
              'driveFileUrl': map['driveFileUrl']?.toString(),
              'driveThumbnailUrl': map['driveThumbnailUrl']?.toString(),
              'driveMimeType': map['driveMimeType']?.toString(),
              'driveFileSize': map['driveFileSize'],
            };
          })
          .where((d) => (d['id'] as String).isNotEmpty)
          .toList();
    }

    return EventAttachments(
      fileAttachment: extractIds(json['file_attachment']),
      noteAttachment: extractIds(json['note_attachment']),
      eventAttachment: extractIds(json['event_attachment']),
      driveAttachment: extractDriveAttachments(json['drive_attachment']),
      fileAttachmentDetails: extractDetails(json['file_attachment']),
      noteAttachmentDetails: extractDetails(json['note_attachment']),
      eventAttachmentDetails: extractDetails(json['event_attachment']),
    );
  }

  bool get isEmpty => fileAttachment.isEmpty && noteAttachment.isEmpty && eventAttachment.isEmpty && driveAttachment.isEmpty;
  bool get isNotEmpty => !isEmpty;
}

class UpdateEventDto {
  final String? title;
  final String? description;
  final DateTime? startTime;
  final DateTime? endTime;
  final String? location;
  final bool? allDay;
  final String? roomId;
  final String? categoryId;
  final List<String>? attendees;
  final EventAttachments? attachments;
  final List<String>? descriptionFileIds;
  final List<int>? reminders; // List of reminder minutes
  final String? meetingUrl;
  final String? visibility;
  final String? priority;
  final String? status;
  final bool? isRecurring;
  final Map<String, dynamic>? recurrenceRule;
  final Map<String, dynamic>? metadata;

  UpdateEventDto({
    this.title,
    this.description,
    this.startTime,
    this.endTime,
    this.location,
    this.allDay,
    this.roomId,
    this.categoryId,
    this.attendees,
    this.attachments,
    this.descriptionFileIds,
    this.reminders,
    this.meetingUrl,
    this.visibility,
    this.priority,
    this.status,
    this.isRecurring,
    this.recurrenceRule,
    this.metadata,
  });

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    if (title != null) map['title'] = title;
    if (description != null) map['description'] = description;
    if (startTime != null) map['start_time'] = startTime!.toUtc().toIso8601String();
    if (endTime != null) map['end_time'] = endTime!.toUtc().toIso8601String();
    if (location != null) map['location'] = location;
    if (allDay != null) map['all_day'] = allDay;
    if (roomId != null) map['room_id'] = roomId;
    if (categoryId != null) map['category_id'] = categoryId;
    if (attendees != null) map['attendees'] = attendees;
    if (attachments != null) map['attachments'] = attachments!.toJson();
    if (descriptionFileIds != null && descriptionFileIds!.isNotEmpty) map['description_file_ids'] = descriptionFileIds;
    if (reminders != null) map['reminders'] = reminders;
    if (meetingUrl != null) map['meeting_url'] = meetingUrl;
    if (visibility != null) map['visibility'] = visibility;
    if (priority != null) map['priority'] = priority;
    if (status != null) map['status'] = status;
    if (isRecurring != null) map['is_recurring'] = isRecurring;
    if (recurrenceRule != null) map['recurrence_rule'] = recurrenceRule;
    if (metadata != null) map['metadata'] = metadata;
    return map;
  }
}

class CreateMeetingRoomDto {
  final String name;
  final String? description;
  final int capacity;
  final String location;
  final String? roomType; // 'conference', 'meeting', 'huddle', etc.
  final List<String>? equipment; // ['projector', 'whiteboard', 'video_conference', etc.]
  final List<String>? amenities; // ['coffee_machine', 'water', 'snacks', etc.]
  final String? bookingPolicy; // 'open', 'restricted', etc.
  final Map<String, dynamic>? workingHours;
  final Map<String, dynamic>? settings;

  CreateMeetingRoomDto({
    required this.name,
    this.description,
    required this.capacity,
    required this.location,
    this.roomType,
    this.equipment,
    this.amenities,
    this.bookingPolicy,
    this.workingHours,
    this.settings,
  });

  Map<String, dynamic> toJson() => {
    'name': name,
    if (description != null) 'description': description,
    'capacity': capacity,
    'location': location,
    if (roomType != null) 'room_type': roomType,
    if (equipment != null) 'equipment': equipment,
    if (amenities != null) 'amenities': amenities,
    if (bookingPolicy != null) 'booking_policy': bookingPolicy,
    if (workingHours != null) 'working_hours': workingHours,
    if (settings != null) 'settings': settings,
  };
}

class EventResponseDto {
  final String response; // 'accepted', 'declined', 'tentative'

  EventResponseDto({required this.response});

  Map<String, dynamic> toJson() => {'response': response};
}

class CreateEventCategoryDto {
  final String name;
  final String? description;
  final String color;
  final String? icon;

  CreateEventCategoryDto({
    required this.name,
    this.description,
    required this.color,
    this.icon,
  });

  Map<String, dynamic> toJson() => {
    'name': name,
    if (description != null) 'description': description,
    'color': color,
    if (icon != null) 'icon': icon,
  };
}

/// Model classes
class EventCategory {
  final String id;
  final String workspaceId;
  final String name;
  final String? description;
  final String color;
  final String? icon;
  final bool isDefault;
  final String createdBy;
  final DateTime createdAt;
  final DateTime updatedAt;

  EventCategory({
    required this.id,
    required this.workspaceId,
    required this.name,
    this.description,
    required this.color,
    this.icon,
    required this.isDefault,
    required this.createdBy,
    required this.createdAt,
    required this.updatedAt,
  });

  factory EventCategory.fromJson(Map<String, dynamic> json) {
    return EventCategory(
      id: json['id'],
      workspaceId: json['workspace_id'] ?? json['workspaceId'],
      name: json['name'],
      description: json['description'],
      color: json['color'],
      icon: json['icon'],
      isDefault: json['is_default'] ?? json['isDefault'] ?? false,
      createdBy: json['created_by'] ?? json['createdBy'],
      createdAt: DateTime.parse(json['created_at'] ?? json['createdAt']),
      updatedAt: DateTime.parse(json['updated_at'] ?? json['updatedAt']),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'workspace_id': workspaceId,
    'name': name,
    'description': description,
    'color': color,
    'icon': icon,
    'is_default': isDefault,
    'created_by': createdBy,
    'created_at': createdAt.toIso8601String(),
    'updated_at': updatedAt.toIso8601String(),
  };
}

class CalendarEvent {
  final String id;
  final String title;
  final String? description;
  final DateTime startTime;
  final DateTime endTime;
  final String? location;
  final bool isAllDay;
  final String organizerId;
  final String? organizerName;
  final String workspaceId;
  final String? meetingRoomId;
  final String? meetingRoomName;
  final String? categoryId;
  final String? meetingUrl;
  final String? visibility;
  final String? status;
  final bool isRecurring;
  final String? recurrenceRule;
  final String? priority;
  final List<EventAttendee>? attendees;
  final EventAttachments? attachments;
  final List<String>? descriptionFileIds;
  final Map<String, dynamic>? metadata;
  final DateTime createdAt;
  final DateTime updatedAt;
  // Google Calendar sync fields
  final bool syncedFromGoogle;
  final String? googleCalendarEventId;
  final String? googleCalendarHtmlLink;
  final String? googleCalendarName;
  final String? googleCalendarColor;

  CalendarEvent({
    required this.id,
    required this.title,
    this.description,
    required this.startTime,
    required this.endTime,
    this.location,
    required this.isAllDay,
    required this.organizerId,
    this.organizerName,
    required this.workspaceId,
    this.meetingRoomId,
    this.meetingRoomName,
    this.categoryId,
    this.meetingUrl,
    this.visibility,
    this.status,
    required this.isRecurring,
    this.recurrenceRule,
    this.priority,
    this.attendees,
    this.attachments,
    this.descriptionFileIds,
    this.metadata,
    required this.createdAt,
    required this.updatedAt,
    this.syncedFromGoogle = false,
    this.googleCalendarEventId,
    this.googleCalendarHtmlLink,
    this.googleCalendarName,
    this.googleCalendarColor,
  });

  factory CalendarEvent.fromJson(Map<String, dynamic> json) {
    // Parse attendees safely
    List<EventAttendee>? attendeesList;
    if (json['attendees'] != null && json['attendees'] is List) {
      final attendeesJson = json['attendees'] as List;
      attendeesList = attendeesJson
          .where((e) => e is Map<String, dynamic>)
          .map((e) => EventAttendee.fromJson(e as Map<String, dynamic>))
          .toList();
    }

    // Parse attachments (unified format)
    EventAttachments? attachmentsObj;
    if (json['attachments'] != null && json['attachments'] is Map) {
      attachmentsObj = EventAttachments.fromJson(Map<String, dynamic>.from(json['attachments']));
    }

    // Parse description file IDs
    List<String>? descriptionFileIdsList;
    if (json['description_file_ids'] != null && json['description_file_ids'] is List) {
      descriptionFileIdsList = List<String>.from(json['description_file_ids']);
    }

    return CalendarEvent(
      id: json['id'],
      title: json['title'],
      description: json['description'],
      startTime: DateTime.parse(json['startTime'] ?? json['start_time']).toLocal(),
      endTime: DateTime.parse(json['endTime'] ?? json['end_time']).toLocal(),
      location: json['location'],
      isAllDay: json['isAllDay'] ?? json['is_all_day'] ?? json['all_day'] ?? false,
      organizerId: json['organizerId'] ?? json['organizer_id'] ?? '',
      organizerName: json['organizerName'] ?? json['organizer_name'],
      workspaceId: json['workspaceId'] ?? json['workspace_id'],
      meetingRoomId: json['meetingRoomId'] ?? json['meeting_room_id'] ?? json['room_id'],
      meetingRoomName: json['meetingRoomName'] ?? json['meeting_room_name'],
      categoryId: json['categoryId'] ?? json['category_id'],
      meetingUrl: json['meetingUrl'] ?? json['meeting_url'],
      visibility: json['visibility'],
      status: json['status'],
      isRecurring: json['isRecurring'] ?? json['is_recurring'] ?? false,
      recurrenceRule: (json['recurrenceRule'] ?? json['recurrence_rule']) is String
          ? (json['recurrenceRule'] ?? json['recurrence_rule'])
          : null,
      priority: json['priority'],
      attendees: attendeesList,
      attachments: attachmentsObj,
      descriptionFileIds: descriptionFileIdsList,
      metadata: json['metadata'] != null && json['metadata'] is Map
          ? Map<String, dynamic>.from(json['metadata'])
          : null,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : json['created_at'] != null
              ? DateTime.parse(json['created_at'])
              : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'])
          : json['updated_at'] != null
              ? DateTime.parse(json['updated_at'])
              : DateTime.now(),
      // Google Calendar sync fields (camelCase or snake_case)
      syncedFromGoogle: json['syncedFromGoogle'] ?? json['synced_from_google'] ?? false,
      googleCalendarEventId: json['googleCalendarEventId'] ?? json['google_calendar_event_id'],
      googleCalendarHtmlLink: json['googleCalendarHtmlLink'] ?? json['google_calendar_html_link'],
      googleCalendarName: json['googleCalendarName'] ?? json['google_calendar_name'],
      googleCalendarColor: json['googleCalendarColor'] ?? json['google_calendar_color'],
    );
  }
}

class EventAttendee {
  final String id;
  final String email;
  final String? name;
  final String status; // 'pending', 'accepted', 'declined', 'tentative'

  EventAttendee({
    required this.id,
    required this.email,
    this.name,
    required this.status,
  });

  factory EventAttendee.fromJson(Map<String, dynamic> json) {
    return EventAttendee(
      id: json['id'] ?? json['user_id'] ?? '',
      email: json['email'] ?? '',
      name: json['name'] ?? json['full_name'],
      status: json['status'] ?? json['response'] ?? 'pending',
    );
  }
}

class MeetingRoom {
  final String id;
  final String name;
  final String? description;
  final int capacity;
  final String location;
  final String? roomType;
  final List<String>? equipment;
  final List<String>? amenities;
  final String status;
  final String? bookingPolicy;
  final Map<String, dynamic>? workingHours;
  final String workspaceId;
  final Map<String, dynamic>? settings;
  final DateTime createdAt;
  final DateTime updatedAt;

  MeetingRoom({
    required this.id,
    required this.name,
    this.description,
    required this.capacity,
    required this.location,
    this.roomType,
    this.equipment,
    this.amenities,
    required this.status,
    this.bookingPolicy,
    this.workingHours,
    required this.workspaceId,
    this.settings,
    required this.createdAt,
    required this.updatedAt,
  });

  factory MeetingRoom.fromJson(Map<String, dynamic> json) {
    return MeetingRoom(
      id: json['id'],
      name: json['name'],
      description: json['description'],
      capacity: json['capacity'],
      location: json['location'],
      roomType: json['room_type'] ?? json['roomType'],
      equipment: json['equipment'] != null ? List<String>.from(json['equipment']) : null,
      amenities: json['amenities'] != null ? List<String>.from(json['amenities']) : null,
      status: json['status'] ?? 'available',
      bookingPolicy: json['booking_policy'] ?? json['bookingPolicy'],
      workingHours: json['working_hours'] != null
          ? Map<String, dynamic>.from(json['working_hours'])
          : json['workingHours'] != null
              ? Map<String, dynamic>.from(json['workingHours'])
              : null,
      workspaceId: json['workspace_id'] ?? json['workspaceId'],
      settings: json['settings'] != null ? Map<String, dynamic>.from(json['settings']) : null,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'])
          : json['createdAt'] != null
              ? DateTime.parse(json['createdAt'])
              : DateTime.now(),
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'])
          : json['updatedAt'] != null
              ? DateTime.parse(json['updatedAt'])
              : DateTime.now(),
    );
  }

  // Helper to check if room is available
  bool get isAvailable => status == 'available';
}

class RoomBooking {
  final String id;
  final String eventId;
  final String roomId;
  final DateTime startTime;
  final DateTime endTime;
  final String status; // 'confirmed', 'cancelled'
  
  RoomBooking({
    required this.id,
    required this.eventId,
    required this.roomId,
    required this.startTime,
    required this.endTime,
    required this.status,
  });
  
  factory RoomBooking.fromJson(Map<String, dynamic> json) {
    return RoomBooking(
      id: json['id'],
      eventId: json['eventId'] ?? json['event_id'],
      roomId: json['roomId'] ?? json['room_id'],
      startTime: DateTime.parse(json['startTime'] ?? json['start_time']).toLocal(),
      endTime: DateTime.parse(json['endTime'] ?? json['end_time']).toLocal(),
      status: json['status'] ?? 'confirmed',
    );
  }
}

/// API service for calendar operations
class CalendarApiService {
  final BaseApiClient _apiClient;
  
  CalendarApiService({BaseApiClient? apiClient}) 
      : _apiClient = apiClient ?? BaseApiClient.instance;
  
  // ==================== EVENT OPERATIONS ====================
  
  /// Create a new event
  Future<ApiResponse<CalendarEvent>> createEvent(
    String workspaceId,
    CreateEventDto dto,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/calendar/events',
        data: dto.toJson(),
      );

      // Handle response format: {data: [{...}], count: 1} or {data: {...}} or direct object
      final responseData = response.data;
      Map<String, dynamic> eventData;

      if (responseData is Map) {
        if (responseData.containsKey('data')) {
          final data = responseData['data'];
          if (data is List && data.isNotEmpty) {
            // Backend returns: {data: [{...}], count: 1}
            eventData = data.first as Map<String, dynamic>;
          } else if (data is Map) {
            // Backend returns: {data: {...}}
            eventData = data as Map<String, dynamic>;
          } else {
            throw Exception('Unexpected data format in response');
          }
        } else {
          // Direct object response
          eventData = Map<String, dynamic>.from(responseData);
        }
      } else {
        throw Exception('Expected Map response, got ${responseData.runtimeType}');
      }

      return ApiResponse.success(
        CalendarEvent.fromJson(eventData),
        message: 'Event created successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      // Extract meaningful error message from response
      String errorMessage = e.message ?? 'Failed to create event';
      final responseData = e.response?.data;
      if (responseData is Map<String, dynamic>) {
        errorMessage = responseData['message'] ?? responseData['error'] ?? errorMessage;
      }
      // Don't pass raw response data to avoid type conflicts with ApiResponse<CalendarEvent>
      return ApiResponse.error(
        errorMessage,
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      return ApiResponse.error(
        'Failed to parse created event: $e',
        statusCode: null,
      );
    }
  }
  
  /// Get events in workspace
  Future<ApiResponse<List<CalendarEvent>>> getEvents(
    String workspaceId, {
    String? startDate,
    String? endDate,
  }) async {
    try {
      final queryParameters = <String, dynamic>{};
      if (startDate != null) queryParameters['start_date'] = startDate;
      if (endDate != null) queryParameters['end_date'] = endDate;

      final response = await _apiClient.get(
        '/workspaces/$workspaceId/calendar/events',
        queryParameters: queryParameters,
      );

      // Handle different response formats
      final responseData = response.data;
      List<dynamic> eventsList;

      if (responseData is List) {
        // Direct array response
        eventsList = responseData;
      } else if (responseData is Map && responseData.containsKey('data')) {
        // Wrapped in data object: {data: [...]}
        final data = responseData['data'];
        if (data is List) {
          eventsList = data;
        } else {
          throw Exception('Expected data to be a list, but got ${data.runtimeType}');
        }
      } else if (responseData is String) {
        // Error: received string response
        throw Exception('Received string response instead of JSON: $responseData');
      } else {
        throw Exception('Unexpected response format: ${responseData.runtimeType}');
      }

      final events = eventsList
          .map((json) {
            if (json is Map<String, dynamic>) {
              return CalendarEvent.fromJson(json);
            } else if (json is String) {
              throw Exception('Event data is a string, expected Map: $json');
            } else {
              throw Exception('Invalid event data type: ${json.runtimeType}');
            }
          })
          .toList();

      return ApiResponse.success(
        events,
        message: 'Events retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get events',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    } catch (e) {
      return ApiResponse.error(
        'Failed to parse events: $e',
        statusCode: null,
        data: null,
      );
    }
  }

  /// Get upcoming events (matching frontend: calendarApi.getUpcomingEvents)
  /// Used for search to get Google Calendar events
  Future<ApiResponse<List<CalendarEvent>>> getUpcomingEvents(
    String workspaceId, {
    int days = 365,
  }) async {
    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/calendar/upcoming',
        queryParameters: {'days': days},
      );

      // Handle different response formats
      final responseData = response.data;
      List<dynamic> eventsList;

      if (responseData is List) {
        // Direct array response
        eventsList = responseData;
      } else if (responseData is Map && responseData.containsKey('data')) {
        // Wrapped in data object: {data: [...]}
        final data = responseData['data'];
        if (data is List) {
          eventsList = data;
        } else {
          throw Exception('Expected data to be a list, but got ${data.runtimeType}');
        }
      } else if (responseData is String) {
        // Error: received string response
        throw Exception('Received string response instead of JSON: $responseData');
      } else {
        throw Exception('Unexpected response format: ${responseData.runtimeType}');
      }

      final events = eventsList
          .map((json) {
            if (json is Map<String, dynamic>) {
              return CalendarEvent.fromJson(json);
            } else if (json is String) {
              throw Exception('Event data is a string, expected Map: $json');
            } else {
              throw Exception('Invalid event data type: ${json.runtimeType}');
            }
          })
          .toList();

      return ApiResponse.success(
        events,
        message: 'Upcoming events retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get upcoming events',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    } catch (e) {
      return ApiResponse.error(
        'Failed to parse upcoming events: $e',
        statusCode: null,
        data: null,
      );
    }
  }

  /// Get event details
  Future<ApiResponse<CalendarEvent>> getEvent(
    String workspaceId,
    String eventId,
  ) async {
    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/calendar/events/$eventId',
      );

      // Handle response format: {data: [{...}], count: 1} or {data: {...}} or direct object
      final responseData = response.data;
      Map<String, dynamic> eventData;

      if (responseData is Map) {
        if (responseData.containsKey('data')) {
          final data = responseData['data'];
          if (data is List && data.isNotEmpty) {
            // Backend returns: {data: [{...}], count: 1}
            eventData = data.first as Map<String, dynamic>;
          } else if (data is Map) {
            // Backend returns: {data: {...}}
            eventData = data as Map<String, dynamic>;
          } else {
            throw Exception('Unexpected data format in response');
          }
        } else {
          // Direct object response
          eventData = Map<String, dynamic>.from(responseData);
        }
      } else {
        throw Exception('Expected Map response, got ${responseData.runtimeType}');
      }

      return ApiResponse.success(
        CalendarEvent.fromJson(eventData),
        message: 'Event retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get event',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    } catch (e) {
      return ApiResponse.error(
        'Failed to parse event: $e',
        statusCode: null,
        data: null,
      );
    }
  }
  
  /// Update an event
  Future<ApiResponse<CalendarEvent>> updateEvent(
    String workspaceId,
    String eventId,
    UpdateEventDto dto,
  ) async {
    try {
      final response = await _apiClient.patch(
        '/workspaces/$workspaceId/calendar/events/$eventId',
        data: dto.toJson(),
      );

      // Handle response format: {data: [{...}], count: 1} or direct object
      final responseData = response.data;
      Map<String, dynamic> eventData;

      if (responseData is Map) {
        if (responseData.containsKey('data')) {
          final data = responseData['data'];
          if (data is List && data.isNotEmpty) {
            // Backend returns: {data: [{...}], count: 1}
            eventData = data.first as Map<String, dynamic>;
          } else if (data is Map) {
            // Backend returns: {data: {...}}
            eventData = data as Map<String, dynamic>;
          } else {
            throw Exception('Unexpected data format in response');
          }
        } else {
          // Direct object response
          eventData = Map<String, dynamic>.from(responseData);
        }
      } else {
        throw Exception('Expected Map response, got ${responseData.runtimeType}');
      }

      return ApiResponse.success(
        CalendarEvent.fromJson(eventData),
        message: 'Event updated successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to update event',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    } catch (e) {
      return ApiResponse.error(
        'Failed to parse updated event: $e',
        statusCode: null,
        data: null,
      );
    }
  }
  
  /// Delete an event
  Future<ApiResponse<void>> deleteEvent(
    String workspaceId,
    String eventId,
  ) async {
    try {
      final response = await _apiClient.delete(
        '/workspaces/$workspaceId/calendar/events/$eventId',
      );
      
      return ApiResponse.success(
        null,
        message: 'Event deleted successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to delete event',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Duplicate an event
  /// Creates a copy of the event with the same details
  Future<ApiResponse<CalendarEvent>> duplicateEvent(
    String workspaceId,
    String eventId,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/calendar/events/$eventId/duplicate',
        data: {},
      );

      if (response.data is Map<String, dynamic>) {
        final event = CalendarEvent.fromJson(response.data);
        return ApiResponse.success(
          event,
          message: 'Event duplicated successfully',
          statusCode: response.statusCode,
        );
      }

      return ApiResponse.error('Invalid response format');
    } on DioException catch (e) {
      return ApiResponse.error(
        e.response?.data?['message'] ?? e.message ?? 'Failed to duplicate event',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Respond to event invitation
  Future<ApiResponse<void>> respondToEvent(
    String workspaceId,
    String eventId,
    EventResponseDto dto,
  ) async {
    try {
      final response = await _apiClient.put(
        '/workspaces/$workspaceId/calendar/events/$eventId/respond',
        data: dto.toJson(),
      );
      
      return ApiResponse.success(
        null,
        message: 'Response recorded successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to respond to event',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  // ==================== MEETING ROOM OPERATIONS ====================
  
  /// Create a new meeting room
  Future<ApiResponse<MeetingRoom>> createMeetingRoom(
    String workspaceId,
    CreateMeetingRoomDto dto,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/calendar/rooms',
        data: dto.toJson(),
      );

      // Handle response format: {data: [{...}], count: 1} or {data: {...}} or direct object
      final responseData = response.data;
      Map<String, dynamic> roomData;

      if (responseData is Map) {
        if (responseData.containsKey('data')) {
          final data = responseData['data'];
          if (data is List && data.isNotEmpty) {
            roomData = data.first as Map<String, dynamic>;
          } else if (data is Map) {
            roomData = data as Map<String, dynamic>;
          } else {
            throw Exception('Unexpected data format in response');
          }
        } else {
          roomData = Map<String, dynamic>.from(responseData);
        }
      } else {
        throw Exception('Expected Map response, got ${responseData.runtimeType}');
      }

      return ApiResponse.success(
        MeetingRoom.fromJson(roomData),
        message: 'Meeting room created successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to create meeting room',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    } catch (e) {
      return ApiResponse.error(
        'Failed to parse created meeting room: $e',
        statusCode: null,
        data: null,
      );
    }
  }
  
  /// Get meeting rooms
  Future<ApiResponse<List<MeetingRoom>>> getMeetingRooms(
    String workspaceId, {
    bool? availableOnly,
    int? capacity,
  }) async {
    try {
      final queryParameters = <String, dynamic>{};
      if (availableOnly != null) queryParameters['available_only'] = availableOnly;
      if (capacity != null) queryParameters['capacity'] = capacity;

      final response = await _apiClient.get(
        '/workspaces/$workspaceId/calendar/rooms',
        queryParameters: queryParameters,
      );

      // Handle different response formats
      final responseData = response.data;
      List<dynamic> roomsList;

      if (responseData is List) {
        roomsList = responseData;
      } else if (responseData is Map && responseData.containsKey('data')) {
        final data = responseData['data'];
        if (data is List) {
          roomsList = data;
        } else {
          throw Exception('Expected data to be a list, but got ${data.runtimeType}');
        }
      } else {
        throw Exception('Unexpected response format: ${responseData.runtimeType}');
      }

      final rooms = roomsList
          .map((json) {
            if (json is Map<String, dynamic>) {
              return MeetingRoom.fromJson(json);
            } else {
              throw Exception('Invalid room data type: ${json.runtimeType}');
            }
          })
          .toList();

      return ApiResponse.success(
        rooms,
        message: 'Meeting rooms retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get meeting rooms',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    } catch (e) {
      return ApiResponse.error(
        'Failed to parse meeting rooms: $e',
        statusCode: null,
        data: null,
      );
    }
  }
  
  /// Get meeting room details
  Future<ApiResponse<MeetingRoom>> getMeetingRoom(
    String workspaceId,
    String roomId,
  ) async {
    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/calendar/rooms/$roomId',
      );

      // Handle response format: {data: [{...}], count: 1} or {data: {...}} or direct object
      final responseData = response.data;
      Map<String, dynamic> roomData;

      if (responseData is Map) {
        if (responseData.containsKey('data')) {
          final data = responseData['data'];
          if (data is List && data.isNotEmpty) {
            roomData = data.first as Map<String, dynamic>;
          } else if (data is Map) {
            roomData = data as Map<String, dynamic>;
          } else {
            throw Exception('Unexpected data format in response');
          }
        } else {
          roomData = Map<String, dynamic>.from(responseData);
        }
      } else {
        throw Exception('Expected Map response, got ${responseData.runtimeType}');
      }

      return ApiResponse.success(
        MeetingRoom.fromJson(roomData),
        message: 'Meeting room retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get meeting room',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    } catch (e) {
      return ApiResponse.error(
        'Failed to parse meeting room: $e',
        statusCode: null,
        data: null,
      );
    }
  }
  
  /// Update meeting room
  Future<ApiResponse<MeetingRoom>> updateMeetingRoom(
    String workspaceId,
    String roomId,
    Map<String, dynamic> updateData,
  ) async {
    try {
      final response = await _apiClient.patch(
        '/workspaces/$workspaceId/calendar/rooms/$roomId',
        data: updateData,
      );

      // Handle response format: {data: [{...}], count: 1} or {data: {...}} or direct object
      final responseData = response.data;
      Map<String, dynamic> roomData;

      if (responseData is Map) {
        if (responseData.containsKey('data')) {
          final data = responseData['data'];
          if (data is List && data.isNotEmpty) {
            roomData = data.first as Map<String, dynamic>;
          } else if (data is Map) {
            roomData = data as Map<String, dynamic>;
          } else {
            throw Exception('Unexpected data format in response');
          }
        } else {
          roomData = Map<String, dynamic>.from(responseData);
        }
      } else {
        throw Exception('Expected Map response, got ${responseData.runtimeType}');
      }

      return ApiResponse.success(
        MeetingRoom.fromJson(roomData),
        message: 'Meeting room updated successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to update meeting room',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    } catch (e) {
      return ApiResponse.error(
        'Failed to parse updated meeting room: $e',
        statusCode: null,
        data: null,
      );
    }
  }
  
  /// Delete meeting room
  Future<ApiResponse<void>> deleteMeetingRoom(
    String workspaceId,
    String roomId,
  ) async {
    try {
      final response = await _apiClient.delete(
        '/workspaces/$workspaceId/calendar/rooms/$roomId',
      );
      
      return ApiResponse.success(
        null,
        message: 'Meeting room deleted successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to delete meeting room',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Get room bookings
  Future<ApiResponse<List<RoomBooking>>> getRoomBookings(
    String workspaceId,
    String roomId, {
    String? startDate,
    String? endDate,
  }) async {
    try {
      final queryParameters = <String, dynamic>{};
      if (startDate != null) queryParameters['start_date'] = startDate;
      if (endDate != null) queryParameters['end_date'] = endDate;

      final response = await _apiClient.get(
        '/workspaces/$workspaceId/calendar/rooms/$roomId/bookings',
        queryParameters: queryParameters,
      );

      // Handle different response formats
      final responseData = response.data;
      List<dynamic> bookingsList;

      if (responseData is List) {
        bookingsList = responseData;
      } else if (responseData is Map && responseData.containsKey('data')) {
        final data = responseData['data'];
        if (data is List) {
          bookingsList = data;
        } else {
          throw Exception('Expected data to be a list, but got ${data.runtimeType}');
        }
      } else {
        throw Exception('Unexpected response format: ${responseData.runtimeType}');
      }

      final bookings = bookingsList
          .map((json) {
            if (json is Map<String, dynamic>) {
              return RoomBooking.fromJson(json);
            } else {
              throw Exception('Invalid booking data type: ${json.runtimeType}');
            }
          })
          .toList();

      return ApiResponse.success(
        bookings,
        message: 'Room bookings retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get room bookings',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    } catch (e) {
      return ApiResponse.error(
        'Failed to parse room bookings: $e',
        statusCode: null,
        data: null,
      );
    }
  }

  // ==================== EVENT CATEGORY OPERATIONS ====================

  /// Get event categories
  Future<ApiResponse<List<EventCategory>>> getEventCategories(
    String workspaceId,
  ) async {
    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/calendar/categories',
      );

      // Handle different response formats
      final responseData = response.data;
      List<dynamic> categoriesList;

      if (responseData is List) {
        // Direct array response
        categoriesList = responseData;
      } else if (responseData is Map && responseData.containsKey('data')) {
        // Wrapped in data object: {data: [...]}
        final data = responseData['data'];
        if (data is List) {
          categoriesList = data;
        } else {
          throw Exception('Expected data to be a list, but got ${data.runtimeType}');
        }
      } else if (responseData is String) {
        // Error: received string response
        throw Exception('Received string response instead of JSON: $responseData');
      } else {
        throw Exception('Unexpected response format: ${responseData.runtimeType}');
      }

      final categories = categoriesList
          .map((json) {
            if (json is Map<String, dynamic>) {
              return EventCategory.fromJson(json);
            } else {
              throw Exception('Invalid category data type: ${json.runtimeType}');
            }
          })
          .toList();

      return ApiResponse.success(
        categories,
        message: 'Event categories retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get event categories',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    } catch (e) {
      return ApiResponse.error(
        'Failed to parse event categories: $e',
        statusCode: null,
        data: null,
      );
    }
  }

  /// Create a new event category
  Future<ApiResponse<EventCategory>> createEventCategory(
    String workspaceId,
    CreateEventCategoryDto dto,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/calendar/categories',
        data: dto.toJson(),
      );

      // Handle response format: {data: [{...}], count: 1} or {data: {...}} or direct object
      final responseData = response.data;
      Map<String, dynamic> categoryData;

      if (responseData is Map) {
        if (responseData.containsKey('data')) {
          final data = responseData['data'];
          if (data is List && data.isNotEmpty) {
            categoryData = data.first as Map<String, dynamic>;
          } else if (data is Map) {
            categoryData = data as Map<String, dynamic>;
          } else {
            throw Exception('Unexpected data format in response');
          }
        } else {
          categoryData = Map<String, dynamic>.from(responseData);
        }
      } else {
        throw Exception('Expected Map response, got ${responseData.runtimeType}');
      }

      return ApiResponse.success(
        EventCategory.fromJson(categoryData),
        message: 'Event category created successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to create event category',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    } catch (e) {
      return ApiResponse.error(
        'Failed to parse created event category: $e',
        statusCode: null,
        data: null,
      );
    }
  }

  /// Update event category
  Future<ApiResponse<EventCategory>> updateEventCategory(
    String workspaceId,
    String categoryId,
    Map<String, dynamic> updateData,
  ) async {
    try {
      final response = await _apiClient.patch(
        '/workspaces/$workspaceId/calendar/categories/$categoryId',
        data: updateData,
      );

      // Handle response format: {data: [{...}], count: 1} or {data: {...}} or direct object
      final responseData = response.data;
      Map<String, dynamic> categoryData;

      if (responseData is Map) {
        if (responseData.containsKey('data')) {
          final data = responseData['data'];
          if (data is List && data.isNotEmpty) {
            categoryData = data.first as Map<String, dynamic>;
          } else if (data is Map) {
            categoryData = data as Map<String, dynamic>;
          } else {
            throw Exception('Unexpected data format in response');
          }
        } else {
          categoryData = Map<String, dynamic>.from(responseData);
        }
      } else {
        throw Exception('Expected Map response, got ${responseData.runtimeType}');
      }

      return ApiResponse.success(
        EventCategory.fromJson(categoryData),
        message: 'Event category updated successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to update event category',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    } catch (e) {
      return ApiResponse.error(
        'Failed to parse updated event category: $e',
        statusCode: null,
        data: null,
      );
    }
  }

  /// Delete event category
  Future<ApiResponse<void>> deleteEventCategory(
    String workspaceId,
    String categoryId,
  ) async {
    try {
      final response = await _apiClient.delete(
        '/workspaces/$workspaceId/calendar/categories/$categoryId',
      );

      return ApiResponse.success(
        null,
        message: 'Event category deleted successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to delete event category',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Get dashboard stats
  Future<ApiResponse<DashboardStats>> getDashboardStats(
    String workspaceId, {
    String period = 'week',
  }) async {
    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/calendar/dashboard-stats',
        queryParameters: {'period': period},
      );

      // Handle response - backend may return data directly or wrapped in 'data' field
      Map<String, dynamic> responseData;
      if (response.data is Map<String, dynamic>) {
        final data = response.data as Map<String, dynamic>;
        // Check if data is wrapped in a 'data' field
        if (data.containsKey('overview')) {
          // Direct response format
          responseData = data;
        } else if (data.containsKey('data') && data['data'] is Map<String, dynamic>) {
          // Wrapped response format
          responseData = data['data'] as Map<String, dynamic>;
        } else {
          responseData = data;
        }
      } else {
        throw Exception('Invalid response format: expected Map<String, dynamic>');
      }

      return ApiResponse.success(
        DashboardStats.fromJson(responseData),
        message: 'Dashboard stats retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to fetch dashboard stats',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    } catch (e) {
      return ApiResponse.error(
        'Failed to parse dashboard stats: $e',
        statusCode: null,
        data: null,
      );
    }
  }

  /// Get AI schedule suggestions
  Future<ApiResponse<ScheduleSuggestionsResponse>> getScheduleSuggestions(
    String workspaceId,
    ScheduleSuggestionDto dto,
  ) async {
    try {

      final response = await _apiClient.post(
        '/workspaces/$workspaceId/calendar/ai/schedule-suggestions',
        data: dto.toJson(),
      );


      return ApiResponse.success(
        ScheduleSuggestionsResponse.fromJson(response.data as Map<String, dynamic>),
        message: 'Schedule suggestions retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to fetch schedule suggestions',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    } catch (e) {
      return ApiResponse.error(
        'Failed to parse schedule suggestions: $e',
        statusCode: null,
        data: null,
      );
    }
  }

  // ==================== AI SMART SCHEDULE OPERATIONS ====================

  /// Get AI-powered smart schedule suggestions with natural language processing
  Future<ApiResponse<SmartScheduleResponse>> getSmartScheduleSuggestions(
    String workspaceId,
    SmartScheduleRequestDto dto,
  ) async {
    try {

      final response = await _apiClient.post(
        '/workspaces/$workspaceId/calendar/ai/smart-schedule',
        data: dto.toJson(),
      );


      return ApiResponse.success(
        SmartScheduleResponse.fromJson(response.data as Map<String, dynamic>),
        message: 'Smart schedule suggestions retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to fetch smart schedule suggestions',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    } catch (e) {
      return ApiResponse.error(
        'Failed to parse smart schedule suggestions: $e',
        statusCode: null,
        data: null,
      );
    }
  }
}

/// Dashboard Stats Models
class DashboardStats {
  final DashboardOverview overview;
  final List<WeeklyActivity> weeklyActivity;
  final List<HourlyDistribution> hourlyDistribution;
  final List<CategoryStat> categoryStats;
  final List<PriorityStat> priorityStats;

  DashboardStats({
    required this.overview,
    required this.weeklyActivity,
    required this.hourlyDistribution,
    required this.categoryStats,
    required this.priorityStats,
  });

  factory DashboardStats.fromJson(Map<String, dynamic> json) {
    return DashboardStats(
      overview: DashboardOverview.fromJson(
        (json['overview'] as Map<String, dynamic>?) ?? {},
      ),
      weeklyActivity: ((json['weeklyActivity'] as List?) ?? [])
          .map((e) => WeeklyActivity.fromJson(e as Map<String, dynamic>))
          .toList(),
      hourlyDistribution: ((json['hourlyDistribution'] as List?) ?? [])
          .map((e) => HourlyDistribution.fromJson(e as Map<String, dynamic>))
          .toList(),
      categoryStats: ((json['categoryStats'] as List?) ?? [])
          .map((e) => CategoryStat.fromJson(e as Map<String, dynamic>))
          .toList(),
      priorityStats: ((json['priorityStats'] as List?) ?? [])
          .map((e) => PriorityStat.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class DashboardOverview {
  final int totalEvents;
  final int totalEventTime;
  final int timeUtilization;
  final int unscheduledTime;
  final String period;
  final String timeRange;
  final String utilizationComparison;
  final String availabilityNote;

  DashboardOverview({
    required this.totalEvents,
    required this.totalEventTime,
    required this.timeUtilization,
    required this.unscheduledTime,
    required this.period,
    required this.timeRange,
    required this.utilizationComparison,
    required this.availabilityNote,
  });

  factory DashboardOverview.fromJson(Map<String, dynamic> json) {
    return DashboardOverview(
      totalEvents: (json['totalEvents'] as num?)?.toInt() ?? 0,
      totalEventTime: (json['totalEventTime'] as num?)?.toInt() ?? 0,
      timeUtilization: (json['timeUtilization'] as num?)?.toInt() ?? 0,
      unscheduledTime: (json['unscheduledTime'] as num?)?.toInt() ?? 0,
      period: json['period'] as String? ?? '',
      timeRange: json['timeRange'] as String? ?? '',
      utilizationComparison: json['utilizationComparison'] as String? ?? '',
      availabilityNote: json['availabilityNote'] as String? ?? '',
    );
  }
}

class WeeklyActivity {
  final String day;
  final int events;
  final int hours;

  WeeklyActivity({
    required this.day,
    required this.events,
    required this.hours,
  });

  factory WeeklyActivity.fromJson(Map<String, dynamic> json) {
    return WeeklyActivity(
      day: json['day'] as String? ?? '',
      events: (json['events'] as num?)?.toInt() ?? 0,
      hours: (json['hours'] as num?)?.toInt() ?? 0,
    );
  }
}

class HourlyDistribution {
  final int hour;
  final int eventCount;
  final double percentage;

  HourlyDistribution({
    required this.hour,
    required this.eventCount,
    required this.percentage,
  });

  factory HourlyDistribution.fromJson(Map<String, dynamic> json) {
    return HourlyDistribution(
      hour: (json['hour'] as num?)?.toInt() ?? 0,
      eventCount: (json['eventCount'] as num?)?.toInt() ?? 0,
      percentage: (json['percentage'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class CategoryStat {
  final String name;
  final int totalTime;
  final int eventCount;
  final int percentage;
  final String color;

  CategoryStat({
    required this.name,
    required this.totalTime,
    required this.eventCount,
    required this.percentage,
    required this.color,
  });

  factory CategoryStat.fromJson(Map<String, dynamic> json) {
    return CategoryStat(
      name: json['name'] as String? ?? '',
      totalTime: (json['totalTime'] as num?)?.toInt() ?? 0,
      eventCount: (json['eventCount'] as num?)?.toInt() ?? 0,
      percentage: (json['percentage'] as num?)?.toInt() ?? 0,
      color: json['color'] as String? ?? 'blue',
    );
  }
}

class PriorityStat {
  final String priority;
  final int eventCount;
  final int totalTime;
  final String color;
  final int percentage;

  PriorityStat({
    required this.priority,
    required this.eventCount,
    required this.totalTime,
    required this.color,
    required this.percentage,
  });

  factory PriorityStat.fromJson(Map<String, dynamic> json) {
    return PriorityStat(
      priority: json['priority'] as String? ?? '',
      eventCount: (json['eventCount'] as num?)?.toInt() ?? 0,
      totalTime: (json['totalTime'] as num?)?.toInt() ?? 0,
      color: json['color'] as String? ?? 'grey',
      percentage: (json['percentage'] as num?)?.toInt() ?? 0,
    );
  }
}

/// Schedule Suggestion Request DTO
class ScheduleSuggestionDto {
  final String title;
  final String? description;
  final int duration;
  final String? priority;
  final List<String>? attendees;
  final String? location;
  final String? timePreference;
  final int? lookAheadDays;
  final bool? includeWeekends;

  ScheduleSuggestionDto({
    required this.title,
    this.description,
    required this.duration,
    this.priority,
    this.attendees,
    this.location,
    this.timePreference,
    this.lookAheadDays,
    this.includeWeekends,
  });

  Map<String, dynamic> toJson() => {
    'title': title,
    if (description != null) 'description': description,
    'duration': duration,
    if (priority != null) 'priority': priority,
    if (attendees != null) 'attendees': attendees,
    if (location != null) 'location': location,
    if (timePreference != null) 'timePreference': timePreference,
    if (lookAheadDays != null) 'lookAheadDays': lookAheadDays,
    if (includeWeekends != null) 'includeWeekends': includeWeekends,
  };
}

/// Meeting Room Info Model
class MeetingRoomInfo {
  final String id;
  final String name;
  final int capacity;
  final List<String> equipment;

  MeetingRoomInfo({
    required this.id,
    required this.name,
    required this.capacity,
    required this.equipment,
  });

  factory MeetingRoomInfo.fromJson(Map<String, dynamic> json) {
    return MeetingRoomInfo(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      capacity: json['capacity'] ?? 0,
      equipment: json['equipment'] != null ? List<String>.from(json['equipment']) : [],
    );
  }
}

/// Time Suggestion Model
class TimeSuggestion {
  final DateTime startTime;
  final DateTime endTime;
  final int confidence;
  final String reason;
  final List<String> considerations;
  final List<MeetingRoomInfo> availableRooms;

  TimeSuggestion({
    required this.startTime,
    required this.endTime,
    required this.confidence,
    required this.reason,
    required this.considerations,
    required this.availableRooms,
  });

  factory TimeSuggestion.fromJson(Map<String, dynamic> json) {
    return TimeSuggestion(
      startTime: DateTime.parse(json['startTime'] ?? json['start_time']),
      endTime: DateTime.parse(json['endTime'] ?? json['end_time']),
      confidence: json['confidence'] ?? json['score'] ?? 0,
      reason: json['reason'] ?? json['reasoning'] ?? '',
      considerations: json['considerations'] != null
          ? List<String>.from(json['considerations'])
          : [],
      availableRooms: json['availableRooms'] != null
          ? (json['availableRooms'] as List).map((r) => MeetingRoomInfo.fromJson(r)).toList()
          : [],
    );
  }
}

/// Schedule Suggestions Response
class ScheduleSuggestionsResponse {
  final List<TimeSuggestion> suggestions;
  final String? message;

  ScheduleSuggestionsResponse({
    required this.suggestions,
    this.message,
  });

  factory ScheduleSuggestionsResponse.fromJson(Map<String, dynamic> json) {
    final suggestionsList = json['suggestions'] as List?;
    return ScheduleSuggestionsResponse(
      suggestions: suggestionsList != null
          ? suggestionsList.map((s) => TimeSuggestion.fromJson(s)).toList()
          : [],
      message: json['message'],
    );
  }
}

// ==================== SMART SCHEDULE MODELS ====================

/// Smart Schedule Request DTO
class SmartScheduleRequestDto {
  final String prompt;
  final String? context;
  final int? maxLookAheadDays;
  final bool? includeWeekends;
  final String? timezone;
  final String? additionalNotes;

  SmartScheduleRequestDto({
    required this.prompt,
    this.context,
    this.maxLookAheadDays,
    this.includeWeekends,
    this.timezone,
    this.additionalNotes,
  });

  Map<String, dynamic> toJson() => {
    'prompt': prompt,
    if (context != null) 'context': context,
    if (maxLookAheadDays != null) 'maxLookAheadDays': maxLookAheadDays,
    if (includeWeekends != null) 'includeWeekends': includeWeekends,
    if (timezone != null) 'timezone': timezone,
    if (additionalNotes != null) 'additionalNotes': additionalNotes,
  };
}

/// Smart Schedule Response
class SmartScheduleResponse {
  final bool success;
  final String interpretation;
  final ExtractedEventInfo extractedInfo;
  final List<SmartScheduleSuggestion> suggestions;
  final List<String> insights;
  final List<String> missingInfo;
  final List<String> clarifyingQuestions;
  final List<String> alternatives;
  final List<String> followUpSuggestions;

  SmartScheduleResponse({
    required this.success,
    required this.interpretation,
    required this.extractedInfo,
    required this.suggestions,
    required this.insights,
    required this.missingInfo,
    required this.clarifyingQuestions,
    required this.alternatives,
    required this.followUpSuggestions,
  });

  factory SmartScheduleResponse.fromJson(Map<String, dynamic> json) {
    return SmartScheduleResponse(
      success: json['success'] ?? false,
      interpretation: json['interpretation'] ?? '',
      extractedInfo: ExtractedEventInfo.fromJson(json['extractedInfo'] ?? {}),
      suggestions: (json['suggestions'] as List?)
          ?.map((s) => SmartScheduleSuggestion.fromJson(s))
          .toList() ?? [],
      insights: (json['insights'] as List?)?.cast<String>() ?? [],
      missingInfo: (json['missingInfo'] as List?)?.cast<String>() ?? [],
      clarifyingQuestions: (json['clarifyingQuestions'] as List?)?.cast<String>() ?? [],
      alternatives: (json['alternatives'] as List?)?.cast<String>() ?? [],
      followUpSuggestions: (json['followUpSuggestions'] as List?)?.cast<String>() ?? [],
    );
  }
}

/// Extracted Event Information
class ExtractedEventInfo {
  final String title;
  final String description;
  final int estimatedDuration;
  final String priority;
  final List<String> attendees;
  final String? preferredLocation;
  final List<String> timePreferences;
  final List<String> requirements;
  final List<String> constraints;
  final int confidence;

  ExtractedEventInfo({
    required this.title,
    required this.description,
    required this.estimatedDuration,
    required this.priority,
    required this.attendees,
    this.preferredLocation,
    required this.timePreferences,
    required this.requirements,
    required this.constraints,
    required this.confidence,
  });

  factory ExtractedEventInfo.fromJson(Map<String, dynamic> json) {
    return ExtractedEventInfo(
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      estimatedDuration: json['estimatedDuration'] ?? 60,
      priority: json['priority'] ?? 'normal',
      attendees: (json['attendees'] as List?)?.cast<String>() ?? [],
      preferredLocation: json['preferredLocation'],
      timePreferences: (json['timePreferences'] as List?)?.cast<String>() ?? [],
      requirements: (json['requirements'] as List?)?.cast<String>() ?? [],
      constraints: (json['constraints'] as List?)?.cast<String>() ?? [],
      confidence: json['confidence'] ?? 0,
    );
  }
}

/// Smart Schedule Suggestion
class SmartScheduleSuggestion {
  final DateTime startTime;
  final DateTime endTime;
  final int confidence;
  final String reasoning;
  final int promptMatchScore;
  final List<String> considerations;
  final RecommendedRoom? recommendedRoom;
  final List<AlternativeRoom> alternativeRooms;

  SmartScheduleSuggestion({
    required this.startTime,
    required this.endTime,
    required this.confidence,
    required this.reasoning,
    required this.promptMatchScore,
    required this.considerations,
    this.recommendedRoom,
    required this.alternativeRooms,
  });

  factory SmartScheduleSuggestion.fromJson(Map<String, dynamic> json) {
    return SmartScheduleSuggestion(
      startTime: DateTime.parse(json['startTime']),
      endTime: DateTime.parse(json['endTime']),
      confidence: json['confidence'] ?? 0,
      reasoning: json['reasoning'] ?? '',
      promptMatchScore: json['promptMatchScore'] ?? 0,
      considerations: (json['considerations'] as List?)?.cast<String>() ?? [],
      recommendedRoom: json['recommendedRoom'] != null
          ? RecommendedRoom.fromJson(json['recommendedRoom'])
          : null,
      alternativeRooms: (json['alternativeRooms'] as List?)
          ?.map((r) => AlternativeRoom.fromJson(r))
          .toList() ?? [],
    );
  }
}

/// Recommended Room
class RecommendedRoom {
  final String id;
  final String name;
  final int capacity;
  final List<String> equipment;
  final String whyRecommended;

  RecommendedRoom({
    required this.id,
    required this.name,
    required this.capacity,
    required this.equipment,
    required this.whyRecommended,
  });

  factory RecommendedRoom.fromJson(Map<String, dynamic> json) {
    return RecommendedRoom(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      capacity: json['capacity'] ?? 0,
      equipment: (json['equipment'] as List?)?.cast<String>() ?? [],
      whyRecommended: json['whyRecommended'] ?? '',
    );
  }
}

/// Alternative Room
class AlternativeRoom {
  final String id;
  final String name;
  final int capacity;
  final List<String> equipment;
  final String note;

  AlternativeRoom({
    required this.id,
    required this.name,
    required this.capacity,
    required this.equipment,
    required this.note,
  });

  factory AlternativeRoom.fromJson(Map<String, dynamic> json) {
    return AlternativeRoom(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      capacity: json['capacity'] ?? 0,
      equipment: (json['equipment'] as List?)?.cast<String>() ?? [],
      note: json['note'] ?? '',
    );
  }
}

/// Calendar Agent Response
class CalendarAgentResponse {
  final bool success;
  final String action; // 'create', 'update', 'delete', 'batch_create', etc.
  final String message;
  final dynamic data;
  final String? error;

  CalendarAgentResponse({
    required this.success,
    required this.action,
    required this.message,
    this.data,
    this.error,
  });

  factory CalendarAgentResponse.fromJson(Map<String, dynamic> json) {
    return CalendarAgentResponse(
      success: json['success'] ?? false,
      action: json['action'] ?? 'unknown',
      message: json['message'] ?? '',
      data: json['data'],
      error: json['error'],
    );
  }
}

extension CalendarAIAgent on CalendarApiService {
  /// Process AI agent command for calendar operations
  /// Uses the Calendar AI Agent endpoint to handle natural language commands
  Future<ApiResponse<CalendarAgentResponse>> processCalendarAgentCommand(
    String workspaceId,
    String prompt, {
    String? timezone,
  }) async {
    try {
      // Get user's timezone if not provided
      final userTimezone = timezone ?? DateTime.now().timeZoneName;

      final response = await _apiClient.post(
        '/workspaces/$workspaceId/calendar/agent',
        data: {
          'prompt': prompt,
          'timezone': userTimezone,
        },
      );

      // Handle response
      final responseData = response.data;
      Map<String, dynamic> agentData;

      if (responseData is Map) {
        agentData = Map<String, dynamic>.from(responseData);
      } else {
        throw Exception('Expected Map response, got ${responseData.runtimeType}');
      }

      return ApiResponse.success(
        CalendarAgentResponse.fromJson(agentData),
        message: 'Agent command processed',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to process agent command',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    } catch (e) {
      return ApiResponse.error(
        'Failed to parse agent response: $e',
        statusCode: null,
        data: null,
      );
    }
  }
}