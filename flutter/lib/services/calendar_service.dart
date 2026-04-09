import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../models/calendar_event.dart';
import '../models/event_category.dart';
import '../models/event_attendee.dart';
import '../models/event_reminder.dart';
import '../api/services/calendar_api_service.dart' as calendar_api;
import '../api/base_api_client.dart';
import '../config/app_config.dart';
import 'app_at_once_service.dart';
import 'workspace_service.dart';

class CalendarService {
  static CalendarService? _instance;
  static CalendarService get instance => _instance ??= CalendarService._();

  CalendarService._();

  final AppAtOnceService _appAtOnceService = AppAtOnceService.instance;
  final WorkspaceService _workspaceService = WorkspaceService.instance;
  final calendar_api.CalendarApiService _calendarApiService = calendar_api.CalendarApiService();
  
  // Cache for events and categories
  List<CalendarEvent> _cachedEvents = [];
  List<EventCategory> _cachedCategories = [];
  DateTime? _lastFetchTime;
  
  // Create event categories table
  Future<void> createEventCategoriesTable() async {
    try {
      // TODO: Implement when AppAtOnce SDK supports table creation
    } catch (e) {
    }
  }
  
  // Create calendar events table
  Future<void> createCalendarEventsTable() async {
    try {
      // TODO: Implement when AppAtOnce SDK supports table creation
    } catch (e) {
    }
  }
  
  // Initialize all calendar tables
  Future<void> initializeTables() async {
    await createEventCategoriesTable();
    await createCalendarEventsTable();
    // Additional tables can be created as needed
  }
  
  // Fetch events from API
  Future<List<CalendarEvent>> getEvents({
    String? workspaceId,
    DateTime? startDate,
    DateTime? endDate,
    bool forceRefresh = false,
  }) async {
    try {
      // Use cache if available and fresh (within 5 minutes)
      if (!forceRefresh && 
          _cachedEvents.isNotEmpty && 
          _lastFetchTime != null &&
          DateTime.now().difference(_lastFetchTime!).inMinutes < 5) {
        return _filterEvents(_cachedEvents, startDate, endDate);
      }
      

      final workspaceToUse = workspaceId ?? _workspaceService.currentWorkspace?.id;
      if (workspaceToUse == null) {
        return [];
      }
      
      
      // Use CalendarApiService to fetch events
      final response = await _calendarApiService.getEvents(
        workspaceToUse,
        startDate: startDate?.toIso8601String(),
        endDate: endDate?.toIso8601String(),
      );
      
      if (response.success && response.data != null) {
        // Convert API response events to local model
        final List<CalendarEvent> events = response.data!.map((apiEvent) {
          return CalendarEvent(
            id: apiEvent.id,
            workspaceId: apiEvent.workspaceId,
            title: apiEvent.title,
            description: apiEvent.description,
            startTime: apiEvent.startTime,
            endTime: apiEvent.endTime,
            allDay: apiEvent.isAllDay,
            location: apiEvent.location,
            organizerId: apiEvent.organizerId,
            priority: _mapPriority(apiEvent.priority),
            createdAt: apiEvent.createdAt,
            updatedAt: apiEvent.updatedAt,
            attendees: apiEvent.attendees?.map((a) => {
              'userId': a.id,
              'email': a.email,
              'name': a.name ?? '',
              'status': a.status,
            }).toList() ?? [],
          );
        }).toList();
        
        // Update cache
        _cachedEvents = events;
        _lastFetchTime = DateTime.now();
        
        return events;
      } else {
        return [];
      }
      
    } catch (e) {
      return [];
    }
  }
  
  // Helper method to map API priority to local priority
  EventPriority _mapPriority(String? priority) {
    switch (priority?.toLowerCase()) {
      case 'lowest':
        return EventPriority.lowest;
      case 'low':
        return EventPriority.low;
      case 'high':
        return EventPriority.high;
      case 'highest':
        return EventPriority.highest;
      default:
        return EventPriority.normal;
    }
  }

  EventVisibility _mapVisibility(String? visibility) {
    switch (visibility?.toLowerCase()) {
      case 'public':
        return EventVisibility.public;
      default:
        return EventVisibility.private;
    }
  }

  EventStatus _mapStatus(String? status) {
    switch (status?.toLowerCase()) {
      case 'tentative':
        return EventStatus.tentative;
      case 'cancelled':
        return EventStatus.cancelled;
      default:
        return EventStatus.confirmed;
    }
  }

  // Filter events by date range
  List<CalendarEvent> _filterEvents(
    List<CalendarEvent> events,
    DateTime? startDate,
    DateTime? endDate,
  ) {
    if (startDate == null && endDate == null) {
      return events;
    }
    
    return events.where((event) {
      if (startDate != null && event.endTime.isBefore(startDate)) {
        return false;
      }
      if (endDate != null && event.startTime.isAfter(endDate)) {
        return false;
      }
      return true;
    }).toList();
  }
  
  // Get events for a specific date
  Future<List<CalendarEvent>> getEventsForDate(DateTime date) async {
    final startOfDay = DateTime(date.year, date.month, date.day);
    final endOfDay = startOfDay.add(const Duration(days: 1));
    
    final allEvents = await getEvents(
      startDate: startOfDay,
      endDate: endOfDay,
    );
    
    return allEvents;
  }
  
  // Get events for a month
  Future<List<CalendarEvent>> getEventsForMonth(DateTime month) async {
    final startOfMonth = DateTime(month.year, month.month, 1);
    final endOfMonth = DateTime(month.year, month.month + 1, 0, 23, 59, 59);
    
    return getEvents(
      startDate: startOfMonth,
      endDate: endOfMonth,
    );
  }
  
  // Create a new event
  Future<CalendarEvent> createEvent(CalendarEvent event) async {
    try {

      final currentWorkspace = _workspaceService.currentWorkspace;
      if (currentWorkspace == null) {
        throw Exception('No workspace selected');
      }

      final workspaceId = currentWorkspace.id;

      // Convert local event to API DTO
      final createEventDto = calendar_api.CreateEventDto(
        title: event.title,
        description: event.description,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location,
        allDay: event.allDay,
        attendees: event.attendees
            .map((a) => a['id'] as String?)
            .where((id) => id != null)
            .cast<String>()
            .toList(),
        roomId: event.roomId,
        categoryId: event.categoryId,
        priority: event.priority.name,
        visibility: event.visibility.name,
        status: event.status.name,
        meetingUrl: event.meetingUrl,
        isRecurring: event.isRecurring,
        recurrenceRule: event.recurrenceRule,
      );

      // Use CalendarApiService to create event
      final response = await _calendarApiService.createEvent(workspaceId, createEventDto);

      if (response.success && response.data != null) {
        final apiEvent = response.data!;

        // Convert API CalendarEvent to local CalendarEvent model
        final createdEvent = CalendarEvent(
          id: apiEvent.id,
          workspaceId: apiEvent.workspaceId,
          userId: apiEvent.organizerId, // Use organizerId as userId
          title: apiEvent.title,
          description: apiEvent.description,
          startTime: apiEvent.startTime,
          endTime: apiEvent.endTime,
          allDay: apiEvent.isAllDay,
          location: apiEvent.location,
          organizerId: apiEvent.organizerId,
          categoryId: apiEvent.categoryId,
          roomId: apiEvent.meetingRoomId,
          meetingUrl: apiEvent.meetingUrl,
          visibility: _mapVisibility(apiEvent.visibility),
          priority: _mapPriority(apiEvent.priority),
          status: _mapStatus(apiEvent.status),
          isRecurring: apiEvent.isRecurring,
          recurrenceRule: apiEvent.recurrenceRule != null
              ? {'rule': apiEvent.recurrenceRule}
              : null,
          attendees: apiEvent.attendees?.map((a) => {
            'id': a.id,
            'email': a.email,
            'name': a.name ?? '',
            'status': a.status,
          }).toList() ?? [],
          createdAt: apiEvent.createdAt,
          updatedAt: apiEvent.updatedAt,
        );

        // Clear cache to force refresh
        _cachedEvents = [];

        return createdEvent;
      } else {
        throw Exception('Failed to create event: ${response.message}');
      }
    } catch (e) {
      throw e;
    }
  }
  
  // Update an event
  Future<CalendarEvent> updateEvent(CalendarEvent event) async {
    try {
      
      final workspaceId = _workspaceService.currentWorkspace?.id;
      if (workspaceId == null || event.id == null) {
        throw Exception('No workspace ID or event ID available');
      }
      
      // Convert local event to API DTO
      final updateEventDto = calendar_api.UpdateEventDto(
        title: event.title,
        description: event.description,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location,
        allDay: event.allDay,
        attendees: event.attendees
            .map((a) => a['id'] as String?)
            .where((id) => id != null)
            .cast<String>()
            .toList(),
        roomId: event.roomId,
        priority: event.priority.name,
      );
      
      // Use CalendarApiService to update event
      final response = await _calendarApiService.updateEvent(
        workspaceId, 
        event.id!, 
        updateEventDto
      );
      
      if (response.success && response.data != null) {
        final apiEvent = response.data!;
        
        // Convert API response to local model
        final updatedEvent = CalendarEvent(
          id: apiEvent.id,
          workspaceId: apiEvent.workspaceId,
          title: apiEvent.title,
          description: apiEvent.description,
          startTime: apiEvent.startTime,
          endTime: apiEvent.endTime,
          allDay: apiEvent.isAllDay,
          location: apiEvent.location,
          organizerId: apiEvent.organizerId,
          priority: _mapPriority(apiEvent.priority),
          createdAt: apiEvent.createdAt,
          updatedAt: apiEvent.updatedAt,
          attendees: apiEvent.attendees?.map((a) => {
            'userId': a.id,
            'email': a.email,
            'name': a.name ?? '',
            'status': a.status,
          }).toList() ?? [],
        );
        
        // Clear cache to force refresh
        _cachedEvents = [];
        
        return updatedEvent;
      } else {
        throw Exception('Failed to update event: ${response.message}');
      }
    } catch (e) {
      throw e;
    }
  }
  
  // Delete an event
  Future<void> deleteEvent(String eventId) async {
    try {
      
      final workspaceId = _workspaceService.currentWorkspace?.id;
      if (workspaceId == null) {
        throw Exception('No workspace ID available');
      }
      
      // Use CalendarApiService to delete event
      final response = await _calendarApiService.deleteEvent(workspaceId, eventId);
      
      if (response.success) {
        
        // Clear cache to force refresh
        _cachedEvents = [];
      } else {
        throw Exception('Failed to delete event: ${response.message}');
      }
    } catch (e) {
      throw e;
    }
  }
  
  // Get event categories (using default categories for now)
  Future<List<EventCategory>> getEventCategories() async {
    try {
      if (_cachedCategories.isNotEmpty) {
        return _cachedCategories;
      }
      
      
      // For now, return default categories
      // TODO: Implement API endpoint for event categories in backend
      _cachedCategories = _getDefaultCategories();
      return _cachedCategories;
      
    } catch (e) {
      return _getDefaultCategories();
    }
  }
  
  // Create a new event category
  Future<EventCategory> createEventCategory(EventCategory category) async {
    try {
      
      final categoryData = category.toMap();
      
      // Make HTTP POST request
      final url = Uri.parse('https://104.198.46.104/data/event_categories');
      final headers = {
        'Content-Type': 'application/json',
        'x-api-key': AppConfig.appAtOnceApiKey,
      };
      
      final response = await http.post(
        url,
        headers: headers,
        body: json.encode(categoryData),
      );
      
      if (response.statusCode == 200 || response.statusCode == 201) {
        final responseData = json.decode(response.body);
        
        // Clear cache to force refresh
        _cachedCategories = [];
        
        return EventCategory.fromMap(responseData);
      } else {
        throw Exception('Failed to create event category: ${response.statusCode}');
      }
    } catch (e) {
      // For now, just return the category as is
      return category;
    }
  }

  // Get default categories
  List<EventCategory> _getDefaultCategories() {
    final workspaceId = _workspaceService.currentWorkspace?.id ?? '';
    final userId = '';
    
    return [
      EventCategory(
        id: '1',
        workspaceId: workspaceId,
        name: 'Meeting',
        color: '#2196F3',
        createdBy: userId,
      ),
      EventCategory(
        id: '2',
        workspaceId: workspaceId,
        name: 'Personal',
        color: '#4CAF50',
        createdBy: userId,
      ),
      EventCategory(
        id: '3',
        workspaceId: workspaceId,
        name: 'Work',
        color: '#FF9800',
        createdBy: userId,
      ),
      EventCategory(
        id: '4',
        workspaceId: workspaceId,
        name: 'Important',
        color: '#F44336',
        createdBy: userId,
      ),
    ];
  }
  

  // ==================== MEETING ROOM OPERATIONS ====================
  
  /// Get meeting rooms
  // TODO: Add MeetingRoom model
  /* Future<List<MeetingRoom>> getMeetingRooms({
    bool? availableOnly,
    int? capacity,
  }) async {
    try {
      final workspaceId = _workspaceService.currentWorkspace?.id;
      if (workspaceId == null) {
        return [];
      }
      
      
      final response = await _calendarApiService.getMeetingRooms(
        workspaceId,
        availableOnly: availableOnly,
        capacity: capacity,
      );
      
      if (response.success && response.data != null) {
        return response.data!;
      } else {
        return [];
      }
    } catch (e) {
      return [];
    }
  }
  
  /// Create meeting room
  Future<MeetingRoom> createMeetingRoom({
    required String name,
    String? description,
    required int capacity,
    required String location,
    List<String>? amenities,
    Map<String, dynamic>? settings,
  }) async {
    try {
      final workspaceId = _workspaceService.currentWorkspace?.id;
      if (workspaceId == null) {
        throw Exception('No workspace ID available');
      }
      

      final createRoomDto = calendar_api.CreateMeetingRoomDto(
        name: name,
        description: description,
        capacity: capacity,
        location: location,
        amenities: amenities,
        settings: settings,
      );
      
      final response = await _calendarApiService.createMeetingRoom(
        workspaceId,
        createRoomDto,
      );
      
      if (response.success && response.data != null) {
        return response.data!;
      } else {
        throw Exception('Failed to create meeting room: ${response.message}');
      }
    } catch (e) {
      throw e;
    }
  }
  
  /// Get meeting room details
  Future<MeetingRoom?> getMeetingRoom(String roomId) async {
    try {
      final workspaceId = _workspaceService.currentWorkspace?.id;
      if (workspaceId == null) {
        return null;
      }
      
      final response = await _calendarApiService.getMeetingRoom(workspaceId, roomId);
      
      if (response.success && response.data != null) {
        return response.data!;
      } else {
        return null;
      }
    } catch (e) {
      return null;
    }
  }
  
  /// Update meeting room
  Future<MeetingRoom> updateMeetingRoom(
    String roomId,
    Map<String, dynamic> updateData,
  ) async {
    try {
      final workspaceId = _workspaceService.currentWorkspace?.id;
      if (workspaceId == null) {
        throw Exception('No workspace ID available');
      }
      
      
      final response = await _calendarApiService.updateMeetingRoom(
        workspaceId,
        roomId,
        updateData,
      );
      
      if (response.success && response.data != null) {
        return response.data!;
      } else {
        throw Exception('Failed to update meeting room: ${response.message}');
      }
    } catch (e) {
      throw e;
    }
  }
  
  /// Delete meeting room
  Future<void> deleteMeetingRoom(String roomId) async {
    try {
      final workspaceId = _workspaceService.currentWorkspace?.id;
      if (workspaceId == null) {
        throw Exception('No workspace ID available');
      }
      
      
      final response = await _calendarApiService.deleteMeetingRoom(workspaceId, roomId);
      
      if (response.success) {
      } else {
        throw Exception('Failed to delete meeting room: ${response.message}');
      }
    } catch (e) {
      throw e;
    }
  }
  
  /// Get room bookings
  Future<List<RoomBooking>> getRoomBookings(
    String roomId, {
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      final workspaceId = _workspaceService.currentWorkspace?.id;
      if (workspaceId == null) {
        return [];
      }
      
      final response = await _calendarApiService.getRoomBookings(
        workspaceId,
        roomId,
        startDate: startDate?.toIso8601String(),
        endDate: endDate?.toIso8601String(),
      );
      
      if (response.success && response.data != null) {
        return response.data!;
      } else {
        return [];
      }
    } catch (e) {
      return [];
    }
  } */

  /// Respond to event invitation
  Future<void> respondToEventInvitation(
    String eventId,
    String response, // 'accepted', 'declined', 'tentative'
  ) async {
    try {
      final workspaceId = _workspaceService.currentWorkspace?.id;
      if (workspaceId == null) {
        throw Exception('No workspace ID available');
      }
      

      final responseDto = calendar_api.EventResponseDto(response: response);
      
      final apiResponse = await _calendarApiService.respondToEvent(
        workspaceId,
        eventId,
        responseDto,
      );
      
      if (apiResponse.success) {
        
        // Clear cache to force refresh
        _cachedEvents = [];
      } else {
        throw Exception('Failed to respond to event: ${apiResponse.message}');
      }
    } catch (e) {
      throw e;
    }
  }
}