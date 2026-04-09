import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter_html/flutter_html.dart';
import 'package:easy_localization/easy_localization.dart';
import '../models/calendar_event.dart';
import '../services/calendar_service.dart';
import '../services/workspace_service.dart';
import '../services/auth_service.dart';
import '../api/services/calendar_api_service.dart' as api;
import '../api/services/ai_api_service.dart';
import '../api/base_api_client.dart';
import '../config/app_config.dart';
import 'calendar_screen.dart';
import 'calendar_analytics_screen.dart';
import '../videocalls/schedule_meeting_screen.dart';
import 'ai_time_suggestions_screen.dart';
import 'edit_event_screen.dart';
import 'create_event_screen.dart';
import 'smart_event_creator_screen.dart';
import 'ai_calendar_assistant.dart';
import '../theme/app_theme.dart';
import '../widgets/ai_button.dart';

class CalendarDetailsScreen extends StatefulWidget {
  final DateTime selectedDate;
  final List<CalendarEvent> events;
  final Function(DateTime)? onDateChanged;

  const CalendarDetailsScreen({
    super.key,
    required this.selectedDate,
    required this.events,
    this.onDateChanged,
  });

  @override
  State<CalendarDetailsScreen> createState() => _CalendarDetailsScreenState();
}

class _CalendarDetailsScreenState extends State<CalendarDetailsScreen> {
  final ScrollController _timelineController = ScrollController();
  final CalendarService _calendarService = CalendarService.instance;
  final api.CalendarApiService _calendarApi = api.CalendarApiService();
  final WorkspaceService _workspaceService = WorkspaceService.instance;
  final AIApiService _aiService = AIApiService();

  // API Data
  List<api.EventCategory> _categories = [];
  List<api.MeetingRoom> _meetingRooms = [];
  Map<String, List<api.RoomBooking>> _roomBookings = {}; // roomId -> bookings
  bool _isLoadingCategories = false;
  bool _isLoadingRooms = false;

  // Drag and Drop State
  CalendarEvent? _draggingEvent;
  bool _isDragging = false;

  // Create Event Dialog State
  String? _selectedCategoryId;
  String? _selectedMeetingRoomId;
  String _selectedPriority = 'normal';
  bool _isAllDayEvent = false;
  bool _isPrivateEvent = false;
  DateTime _startDate = DateTime.now();
  DateTime _endDate = DateTime.now();
  TimeOfDay _startTime = const TimeOfDay(hour: 9, minute: 0);
  TimeOfDay _endTime = const TimeOfDay(hour: 10, minute: 0);
  
  // Form controllers
  final TextEditingController _titleController = TextEditingController();
  final TextEditingController _descriptionController = TextEditingController();
  final TextEditingController _locationController = TextEditingController();
  final TextEditingController _tagController = TextEditingController();
  final List<String> _tags = [];
  
  // Current view state
  String _currentView = 'Day';

  // Local selected date (for immediate UI updates)
  late DateTime _localSelectedDate;
  
  // Filter state
  Set<String> _selectedCategories = <String>{}; // Start with empty set to show all events
  Set<String> _selectedPriorities = {'low', 'medium', 'high', 'urgent'}; // API format values
  Set<String> _selectedStatuses = {'Confirmed', 'Tentative', 'Cancelled', 'Pending'};
  bool _showAllDayEvents = true;
  bool _showRecurringEvents = true;
  bool _showDeclinedEvents = false;
  bool _showCancelledEvents = false;
  bool _showPrivateEvents = true;
  List<String> _selectedTags = [];
  DateTime? _filterStartDate;
  DateTime? _filterEndDate;

  // Agenda view specific filters
  String? _agendaSelectedCategoryId; // null means "All categories"
  String? _agendaSelectedPriority; // null means "All priorities"

  // Timeline view state
  String _timelineViewMode = 'Day'; // Day, Week, Month
  String _timelinePeriod = '2 Weeks'; // Time period selector

  // Search state
  final TextEditingController _searchController = TextEditingController();
  bool _isSearchActive = false;
  String _searchQuery = '';
  
  @override
  void initState() {
    super.initState();
    _localSelectedDate = widget.selectedDate;
    // Load categories and meeting rooms from API
    _loadCategories();
    _loadMeetingRooms();
    // Auto scroll to current time
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final currentHour = DateTime.now().hour;
      final scrollPosition = (currentHour - 3) * 80.0; // 80px per hour, start 3 hours before
      if (scrollPosition > 0) {
        _timelineController.animateTo(
          scrollPosition,
          duration: const Duration(milliseconds: 500),
          curve: Curves.easeInOut,
        );
      }
    });
  }

  /// Refresh events from API
  Future<void> _refreshEvents() async {
    try {
      final currentWorkspace = _workspaceService.currentWorkspace;
      if (currentWorkspace == null) return;

      // Calculate start and end dates for current month
      final startOfMonth = DateTime(_localSelectedDate.year, _localSelectedDate.month, 1);
      final endOfMonth = DateTime(_localSelectedDate.year, _localSelectedDate.month + 1, 0, 23, 59, 59);

      final eventsResponse = await _calendarApi.getEvents(
        currentWorkspace.id,
        startDate: startOfMonth.toIso8601String(),
        endDate: endOfMonth.toIso8601String(),
      );

      if (eventsResponse.isSuccess && eventsResponse.data != null) {
        setState(() {
          // Clear and reload events
          widget.events.clear();
          for (var apiEvent in eventsResponse.data!) {
            try {
              final event = CalendarEvent(
                id: apiEvent.id,
                workspaceId: apiEvent.workspaceId,
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
                visibility: apiEvent.visibility == 'public'
                    ? EventVisibility.public
                    : EventVisibility.private,
                busyStatus: EventBusyStatus.busy,
                priority: _parseEventPriority(apiEvent.priority),
                status: _parseEventStatus(apiEvent.status),
                isRecurring: apiEvent.isRecurring,
                recurrenceRule: apiEvent.recurrenceRule != null && apiEvent.recurrenceRule!.isNotEmpty
                    ? {'rule': apiEvent.recurrenceRule}
                    : null,
                attendees: apiEvent.attendees?.map((a) => {
                  'id': a.id,
                  'email': a.email,
                  'name': a.name,
                  'status': a.status,
                }).toList() ?? [],
                attachments: apiEvent.attachments != null
                    ? CalendarEventAttachments(
                        fileAttachment: apiEvent.attachments!.fileAttachment,
                        noteAttachment: apiEvent.attachments!.noteAttachment,
                        eventAttachment: apiEvent.attachments!.eventAttachment,
                      )
                    : null,
              );
              widget.events.add(event);
            } catch (e) {
              debugPrint('Error parsing event: $e');
            }
          }
        });
      }
    } catch (e) {
      debugPrint('Error refreshing events: $e');
    }
  }

  EventPriority _parseEventPriority(String? priority) {
    switch (priority?.toLowerCase()) {
      case 'lowest':
        return EventPriority.lowest;
      case 'low':
        return EventPriority.low;
      case 'normal':
        return EventPriority.normal;
      case 'high':
        return EventPriority.high;
      case 'highest':
        return EventPriority.highest;
      default:
        return EventPriority.normal;
    }
  }

  EventStatus _parseEventStatus(String? status) {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return EventStatus.confirmed;
      case 'tentative':
        return EventStatus.tentative;
      case 'cancelled':
        return EventStatus.cancelled;
      default:
        return EventStatus.confirmed;
    }
  }

  Future<void> _loadCategories() async {
    setState(() => _isLoadingCategories = true);

    try {
      final currentWorkspace = _workspaceService.currentWorkspace;
      if (currentWorkspace == null) {
        setState(() => _isLoadingCategories = false);
        return;
      }

      final response = await _calendarApi.getEventCategories(currentWorkspace.id);

      if (response.isSuccess && response.data != null) {
        setState(() {
          _categories = response.data!;
          _isLoadingCategories = false;
        });
      } else {
        setState(() => _isLoadingCategories = false);
      }
    } catch (e) {
      setState(() => _isLoadingCategories = false);
    }
  }

  Future<void> _loadMeetingRooms() async {
    setState(() => _isLoadingRooms = true);

    try {
      final currentWorkspace = _workspaceService.currentWorkspace;
      if (currentWorkspace == null) {
        setState(() => _isLoadingRooms = false);
        return;
      }


      // Fetch rooms with timeout
      final response = await _calendarApi.getMeetingRooms(currentWorkspace.id)
          .timeout(const Duration(seconds: 10), onTimeout: () {
        return ApiResponse.error('Request timed out');
      });

      if (response.isSuccess && response.data != null) {
        final rooms = response.data!;

        // Show rooms immediately, then load bookings
        setState(() {
          _meetingRooms = rooms;
          _roomBookings = {}; // Start with empty bookings
        });

        // Fetch bookings for all rooms in parallel with individual error handling
        final bookingsFutures = rooms.map((room) async {
          try {
            final bookingsResponse = await _calendarApi.getRoomBookings(
              currentWorkspace.id,
              room.id,
            ).timeout(const Duration(seconds: 5), onTimeout: () {
              return ApiResponse.error('Request timed out');
            });

            if (bookingsResponse.isSuccess && bookingsResponse.data != null) {
              return MapEntry(room.id, bookingsResponse.data!);
            } else {
              return MapEntry(room.id, <api.RoomBooking>[]);
            }
          } catch (e) {
            return MapEntry(room.id, <api.RoomBooking>[]);
          }
        });

        // Wait for all booking requests to complete
        final bookingsEntries = await Future.wait(bookingsFutures);
        final bookingsMap = Map.fromEntries(bookingsEntries);

        // Update with bookings
        setState(() {
          _roomBookings = bookingsMap;
          _isLoadingRooms = false;
        });
      } else {
        setState(() => _isLoadingRooms = false);
      }
    } catch (e, stackTrace) {
      setState(() => _isLoadingRooms = false);
    }
  }

  /// Determine room status based on current bookings (all times in local timezone)
  Map<String, dynamic> _getRoomStatus(String roomId) {
    final bookings = _roomBookings[roomId] ?? [];
    final now = DateTime.now(); // Local time


    // Debug: Print all bookings for this room
    for (var i = 0; i < bookings.length; i++) {
      final booking = bookings[i];
      final startLocal = booking.startTime.toLocal();
      final endLocal = booking.endTime.toLocal();
    }

    // Find current booking
    final currentBooking = bookings.firstWhere(
      (booking) {
        // Ensure we're comparing local times
        final startLocal = booking.startTime.toLocal();
        final endLocal = booking.endTime.toLocal();

        // Check if current time is within the booking window (inclusive of start, exclusive of end)
        // This means: start <= now < end
        final isCurrent = booking.status == 'confirmed' &&
            (startLocal.isBefore(now) || startLocal.isAtSameMomentAs(now)) &&
            endLocal.isAfter(now);

        if (isCurrent) {
        }

        return isCurrent;
      },
      orElse: () => api.RoomBooking(
        id: '',
        eventId: '',
        roomId: '',
        startTime: DateTime(2000),
        endTime: DateTime(2000),
        status: '',
      ),
    );

    // Room is currently occupied
    if (currentBooking.id.isNotEmpty) {
      final endLocal = currentBooking.endTime.toLocal();
      final endTimeStr = _formatTime(endLocal);
      final minutesUntilFree = endLocal.difference(now).inMinutes;

      String statusText = 'Occupied until $endTimeStr';


      return {
        'status': statusText,
        'isAvailable': false,
        'endTime': endLocal,
      };
    }

    // Find next upcoming booking
    final upcomingBookings = bookings
        .where((booking) {
          final startLocal = booking.startTime.toLocal();
          return booking.status == 'confirmed' && startLocal.isAfter(now);
        })
        .toList()
      ..sort((a, b) => a.startTime.compareTo(b.startTime));

    if (upcomingBookings.isNotEmpty) {
      final nextBooking = upcomingBookings.first;
      final startLocal = nextBooking.startTime.toLocal();
      final startTimeStr = _formatTime(startLocal);
      final minutesUntilBooked = startLocal.difference(now).inMinutes;

      String statusText = 'Available until $startTimeStr';


      return {
        'status': statusText,
        'isAvailable': true,
        'startTime': startLocal,
      };
    }

    // Room is completely available
    return {
      'status': 'Available',
      'isAvailable': true,
    };
  }

  @override
  void dispose() {
    _timelineController.dispose();
    _titleController.dispose();
    _descriptionController.dispose();
    _locationController.dispose();
    _tagController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _generateEventDescriptions() async {
    // Check if title is provided
    if (_titleController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('calendar.enter_title_first'.tr()),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    // Show loading dialog
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        backgroundColor: surfaceColor,
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(color: AppTheme.infoLight),
            const SizedBox(height: 16),
            Text(
              'Generating descriptions...',
              style: TextStyle(color: textColor),
            ),
          ],
        ),
      ),
    );

    try {
      // Call AI API
      final response = await _aiService.generateEventDescriptions(_titleController.text.trim());

      // Close loading dialog
      if (!mounted) return;
      Navigator.pop(context);

      if (response.success && response.data.generatedText.isNotEmpty) {
        // Parse the descriptions (separated by "---")
        // Backend handles sanitization - just split and filter empty
        final fullText = response.data.generatedText;
        final descriptions = fullText
            .split('---')
            .map((d) => d.trim())
            .where((d) => d.isNotEmpty)
            .toList();

        if (descriptions.isEmpty) {
          throw Exception('No descriptions generated');
        }

        // Show selection dialog
        _showDescriptionSelectionDialog(descriptions);
      } else {
        throw Exception(response.error ?? 'Failed to generate descriptions');
      }
    } catch (e) {
      // Close loading dialog if still open
      if (mounted && Navigator.canPop(context)) {
        Navigator.pop(context);
      }

      // Show error
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('calendar.failed_generate_descriptions'.tr(args: ['$e'])),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _showDescriptionSelectionDialog(List<String> descriptions) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: surfaceColor,
        title: Text(
          'Select a Description',
          style: TextStyle(color: textColor, fontWeight: FontWeight.w600),
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: descriptions.asMap().entries.map((entry) {
              final index = entry.key;
              final description = entry.value;
              return Container(
                margin: const EdgeInsets.only(bottom: 16),
                child: InkWell(
                  onTap: () {
                    _descriptionController.text = description;
                    Navigator.pop(context);
                  },
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      border: Border.all(color: borderColor),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppTheme.infoLight.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                'Option ${index + 1}',
                                style: TextStyle(
                                  color: AppTheme.infoLight,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Text(
                          description,
                          style: TextStyle(
                            color: textColor,
                            fontSize: 14,
                            height: 1.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('common.cancel'.tr(), style: TextStyle(color: subtitleColor)),
          ),
        ],
      ),
    );
  }

  void _handleViewChange(String view) {
    // Handle view switching logic - the UI will update automatically via _buildCurrentView
    // No additional logic needed as the view switching is handled by setState in the dropdown
  }

  // Theme-aware color getters
  Color get backgroundColor => Theme.of(context).brightness == Brightness.dark 
      ? const Color(0xFF0F1419) 
      : Colors.grey[50]!;
      
  Color get surfaceColor => Theme.of(context).brightness == Brightness.dark 
      ? const Color(0xFF1A1F26) 
      : Colors.white;
      
  Color get cardColor => Theme.of(context).brightness == Brightness.dark 
      ? const Color(0xFF2D3748) 
      : Colors.grey[100]!;
      
  Color get borderColor => Theme.of(context).brightness == Brightness.dark 
      ? const Color(0xFF2D3748) 
      : Colors.grey[300]!;
      
  Color get textColor => Theme.of(context).brightness == Brightness.dark 
      ? Colors.white 
      : Colors.black87;
      
  Color get subtitleColor => Theme.of(context).brightness == Brightness.dark 
      ? Colors.grey[400]! 
      : Colors.grey[600]!;
      
  Color get primaryColor => context.primaryColor;
      
  Color get timelineHourColor => Theme.of(context).brightness == Brightness.dark 
      ? Colors.grey[800]! 
      : Colors.grey[200]!;

  @override
  Widget build(BuildContext context) {
    final dateEvents = widget.events.where((event) {
      // Date filter
      bool dateMatch = event.startTime.year == _localSelectedDate.year &&
                      event.startTime.month == _localSelectedDate.month &&
                      event.startTime.day == _localSelectedDate.day;

      if (!dateMatch) return false;

      // Category filter (for agenda view, use the specific dropdown selection)
      if (_currentView == 'Agenda') {
        if (_agendaSelectedCategoryId != null && event.categoryId != _agendaSelectedCategoryId) {
          return false;
        }
      } else {
        // For other views, use the general category filter
        if (_selectedCategories.isNotEmpty && event.categoryId != null && !_selectedCategories.contains(event.categoryId)) {
          return false;
        }
      }

      // Priority filter
      if (_currentView == 'Agenda') {
        if (_agendaSelectedPriority != null) {
          // Convert model enum to API format for comparison
          final eventPriorityName = event.priority.name;
          String eventPriorityApi = eventPriorityName;

          if (eventPriorityName == 'normal') {
            eventPriorityApi = 'medium';
          } else if (eventPriorityName == 'highest') {
            eventPriorityApi = 'urgent';
          }


          if (eventPriorityApi != _agendaSelectedPriority) {
            return false;
          }
        }
      } else {
        // For other views, use the general priority filter with mapping
        final eventPriorityName = event.priority.name;

        // Map the event priority to API format for comparison
        String eventPriorityApi = eventPriorityName;
        if (eventPriorityName == 'normal') {
          eventPriorityApi = 'medium';
        } else if (eventPriorityName == 'highest') {
          eventPriorityApi = 'urgent';
        }

        final hasMatch = _selectedPriorities.contains(eventPriorityName) ||
                        _selectedPriorities.contains(eventPriorityApi);

        if (!hasMatch) {
          return false;
        }
      }

      // Date range filter
      if (_filterStartDate != null && event.startTime.isBefore(_filterStartDate!)) {
        return false;
      }
      if (_filterEndDate != null && event.startTime.isAfter(_filterEndDate!)) {
        return false;
      }

      // All-day events filter
      if (!_showAllDayEvents && event.allDay) {
        return false;
      }

      // Search filter
      if (_searchQuery.isNotEmpty) {
        final query = _searchQuery.toLowerCase();
        final titleMatch = event.title.toLowerCase().contains(query);
        final descriptionMatch = (event.description ?? '').toLowerCase().contains(query);
        final locationMatch = (event.location ?? '').toLowerCase().contains(query);

        if (!titleMatch && !descriptionMatch && !locationMatch) {
          return false;
        }
      }

      return true;
    }).toList();

    return Scaffold(
      backgroundColor: backgroundColor,
      appBar: _buildAppBar(),
      body: Column(
        children: [
          // Menu Item Bar
          _buildMenuBar(),
          
          // Date Header - Full Width
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: backgroundColor,
              border: Border(
                bottom: BorderSide(color: borderColor, width: 1),
              ),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Text(
                  '${_localSelectedDate.day}',
                  style: TextStyle(
                    color: textColor,
                    fontSize: 48,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        _getDayName(_localSelectedDate.weekday),
                        style: TextStyle(
                          color: textColor,
                          fontSize: 24,
                          fontWeight: FontWeight.w600,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        '${_getMonthName(_localSelectedDate.month)} ${_localSelectedDate.year}',
                        style: TextStyle(
                          color: subtitleColor,
                          fontSize: 16,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Search Results Count (when searching)
          if (_isSearchActive && _searchQuery.isNotEmpty) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: backgroundColor,
                border: Border(bottom: BorderSide(color: borderColor.withValues(alpha: 0.3))),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline, color: subtitleColor, size: 16),
                  const SizedBox(width: 8),
                  Text(
                    dateEvents.isEmpty 
                        ? 'No events found for "$_searchQuery"'
                        : '${dateEvents.length} event${dateEvents.length == 1 ? '' : 's'} found for "$_searchQuery"',
                    style: TextStyle(
                      color: subtitleColor,
                      fontSize: 14,
                    ),
                  ),
                  const Spacer(),
                  if (dateEvents.isNotEmpty)
                    TextButton(
                      onPressed: () {
                        setState(() {
                          _isSearchActive = false;
                          _searchController.clear();
                          _searchQuery = '';
                        });
                      },
                      child: Text(
                        'calendar.clear_search'.tr(),
                        style: TextStyle(
                          color: context.primaryColor,
                          fontSize: 12,
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ],
          
          // Main Content - Full Width
          Expanded(
            child: _buildCurrentView(dateEvents),
          ),
        ],
      ),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      backgroundColor: backgroundColor,
      elevation: 0,
      leading: IconButton(
        icon: Icon(Icons.arrow_back, color: textColor),
        onPressed: () => Navigator.pop(context),
      ),
      title: _isSearchActive
          ? TextField(
              controller: _searchController,
              style: TextStyle(color: textColor),
              decoration: InputDecoration(
                hintText: 'calendar.search_events'.tr(),
                hintStyle: TextStyle(color: subtitleColor),
                border: InputBorder.none,
                contentPadding: EdgeInsets.zero,
              ),
              onChanged: (value) {
                setState(() {
                  _searchQuery = value;
                });
              },
              autofocus: true,
            )
          : null,
      actions: [
        AIButton(
          onPressed: () {
            showAICalendarAssistant(
              context: context,
              onEventsChanged: () {
                // Refresh events from API
                _refreshEvents();
              },
            );
          },
        ),
        if (_isSearchActive && _searchQuery.isNotEmpty)
          IconButton(
            icon: Icon(Icons.clear, color: textColor),
            onPressed: () {
              setState(() {
                _searchController.clear();
                _searchQuery = '';
              });
            },
            tooltip: 'Clear search',
          ),
        IconButton(
          icon: Icon(
            _isSearchActive ? Icons.search_off : Icons.search,
            color: _isSearchActive ? context.primaryColor : textColor,
          ),
          onPressed: () {
            setState(() {
              _isSearchActive = !_isSearchActive;
              if (!_isSearchActive) {
                _searchController.clear();
                _searchQuery = '';
              }
            });
          },
          tooltip: _isSearchActive ? 'Close search' : 'Search events',
        ),
        PopupMenuButton<String>(
          icon: Icon(Icons.more_vert, color: textColor),
          onSelected: (value) {
            switch (value) {
              case 'schedule':
                _showTodaysSchedule();
                break;
              case 'upcoming':
                _showUpcomingEvents();
                break;
              case 'rooms':
                _showMeetingRooms();
                break;
              case 'actions':
                _showActionsMenu();
                break;
              // case 'settings':
              //   ScaffoldMessenger.of(context).showSnackBar(
              //     SnackBar(content: Text('Settings feature coming soon')),
              //   );
              //   break;
              // case 'refresh':
              //   ScaffoldMessenger.of(context).showSnackBar(
              //     SnackBar(content: Text('Calendar refreshed')),
              //   );
              //   break;
            }
          },
          itemBuilder: (context) => [
            PopupMenuItem(
              value: 'schedule',
              child: Row(
                children: [
                  const Icon(Icons.schedule),
                  const SizedBox(width: 8),
                  Text('calendar.todays_schedule'.tr()),
                ],
              ),
            ),
            PopupMenuItem(
              value: 'upcoming',
              child: Row(
                children: [
                  const Icon(Icons.upcoming),
                  const SizedBox(width: 8),
                  Text('calendar.upcoming_events'.tr()),
                ],
              ),
            ),
            PopupMenuItem(
              value: 'rooms',
              child: Row(
                children: [
                  const Icon(Icons.meeting_room),
                  const SizedBox(width: 8),
                  Text('calendar.meeting_rooms'.tr()),
                ],
              ),
            ),
            PopupMenuItem(
              value: 'actions',
              child: Row(
                children: [
                  const Icon(Icons.flash_on),
                  const SizedBox(width: 8),
                  Text('calendar.quick_actions'.tr()),
                ],
              ),
            ),
            // const PopupMenuDivider(),
            // const PopupMenuItem(
            //   value: 'refresh',
            //   child: Row(
            //     children: [
            //       Icon(Icons.refresh),
            //       SizedBox(width: 8),
            //       Text('Refresh'),
            //     ],
            //   ),
            // ),
            // const PopupMenuItem(
            //   value: 'settings',
            //   child: Row(
            //     children: [
            //       Icon(Icons.settings),
            //       SizedBox(width: 8),
            //       Text('Settings'),
            //     ],
            //   ),
            // ),
          ],
        ),
      ],
    );
  }

  Widget _buildMenuBar() {
    return Container(
      height: 56,
      decoration: BoxDecoration(
        color: backgroundColor,
        border: Border(
          bottom: BorderSide(color: borderColor, width: 1),
        ),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            const SizedBox(width: 8),
            PopupMenuButton<String>(
              icon: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(_getViewLabel(_currentView), style: TextStyle(color: textColor, fontSize: 14)),
                  const SizedBox(width: 2),
                  Icon(Icons.arrow_drop_down, color: textColor, size: 16),
                ],
              ),
              onSelected: (value) {
                setState(() {
                  _currentView = value;
                });
                _handleViewChange(value);
              },
              itemBuilder: (context) => [
                PopupMenuItem(
                  value: 'Day',
                  child: Row(
                    children: [
                      Icon(Icons.today, size: 16, color: _currentView == 'Day' ? context.primaryColor : null),
                      const SizedBox(width: 8),
                      Text('calendar.view_day'.tr(), style: TextStyle(color: _currentView == 'Day' ? context.primaryColor : null)),
                    ],
                  ),
                ),
                PopupMenuItem(
                  value: 'Week',
                  child: Row(
                    children: [
                      Icon(Icons.view_week, size: 16, color: _currentView == 'Week' ? context.primaryColor : null),
                      const SizedBox(width: 8),
                      Text('calendar.view_week'.tr(), style: TextStyle(color: _currentView == 'Week' ? context.primaryColor : null)),
                    ],
                  ),
                ),
                PopupMenuItem(
                  value: 'Month',
                  child: Row(
                    children: [
                      Icon(Icons.calendar_month, size: 16, color: _currentView == 'Month' ? context.primaryColor : null),
                      const SizedBox(width: 8),
                      Text('calendar.view_month'.tr(), style: TextStyle(color: _currentView == 'Month' ? context.primaryColor : null)),
                    ],
                  ),
                ),
                PopupMenuItem(
                  value: 'Year',
                  child: Row(
                    children: [
                      Icon(Icons.calendar_view_month, size: 16, color: _currentView == 'Year' ? context.primaryColor : null),
                      const SizedBox(width: 8),
                      Text('calendar.view_year'.tr(), style: TextStyle(color: _currentView == 'Year' ? context.primaryColor : null)),
                    ],
                  ),
                ),
                PopupMenuItem(
                  value: 'Agenda',
                  child: Row(
                    children: [
                      Icon(Icons.list_alt, size: 16, color: _currentView == 'Agenda' ? context.primaryColor : null),
                      const SizedBox(width: 8),
                      Text('calendar.view_agenda'.tr(), style: TextStyle(color: _currentView == 'Agenda' ? context.primaryColor : null)),
                    ],
                  ),
                ),
                PopupMenuItem(
                  value: 'Timeline',
                  child: Row(
                    children: [
                      Icon(Icons.timeline, size: 16, color: _currentView == 'Timeline' ? context.primaryColor : null),
                      const SizedBox(width: 8),
                      Text('calendar.view_timeline'.tr(), style: TextStyle(color: _currentView == 'Timeline' ? context.primaryColor : null)),
                    ],
                  ),
                ),
              ],
            ),
            IconButton(
              icon: Icon(Icons.schedule, color: textColor, size: 20),
              onPressed: () async {
                final result = await Navigator.push<CalendarEvent>(
                  context,
                  MaterialPageRoute(
                    builder: (context) => ScheduleMeetingScreen(selectedDate: _localSelectedDate),
                  ),
                );
                
                // If an event was created, save it to database and add to calendar
                if (result != null && mounted) {
                  try {
                    final savedEvent = await _calendarService.createEvent(result);
                    setState(() {
                      widget.events.add(savedEvent);
                    });
                  } catch (e) {
                    // Still add to local list for immediate UI update
                    setState(() {
                      widget.events.add(result);
                    });
                  }
                  
                  // Show success message with event details
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('calendar.event_scheduled_successfully'.tr(args: [result.title])),
                      backgroundColor: context.primaryColor,
                      action: SnackBarAction(
                        label: 'View',
                        textColor: Colors.white,
                        onPressed: () {
                          // Navigate to the date if it's different from current selected date
                          if (result.startTime.year == _localSelectedDate.year &&
                              result.startTime.month == _localSelectedDate.month &&
                              result.startTime.day == _localSelectedDate.day) {
                            // Same day - scroll to the event time
                            final eventHour = result.startTime.hour;
                            final scrollPosition = (eventHour - 3) * 80.0;
                            if (scrollPosition > 0) {
                              _timelineController.animateTo(
                                scrollPosition,
                                duration: const Duration(milliseconds: 500),
                                curve: Curves.easeInOut,
                              );
                            }
                          }
                        },
                      ),
                    ),
                    );
                  }
                }
              },
              tooltip: 'calendar.schedule_meeting_tooltip'.tr(),
            ),
            IconButton(
              icon: Icon(Icons.analytics, color: textColor, size: 20),
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => CalendarAnalyticsScreen(
                      events: widget.events,
                    ),
                  ),
                );
              },
              tooltip: 'calendar.analytics_tooltip'.tr(),
            ),
            Stack(
              children: [
                IconButton(
                  icon: Icon(Icons.filter_list, color: textColor, size: 20),
                  onPressed: _showFilterDialog,
                  tooltip: 'calendar.filters_tooltip'.tr(),
                ),
                if (_hasActiveFilters())
                  Positioned(
                    right: 8,
                    top: 8,
                    child: Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: context.primaryColor,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(width: 8),
            IconButton(
              icon: Icon(Icons.auto_awesome, color: textColor, size: 20),
              onPressed: () async {
                final result = await _showAIScheduleDialog();
                if (result != null && mounted) {
                  try {
                    final savedEvent = await _calendarService.createEvent(result);
                    setState(() {
                      widget.events.add(savedEvent);
                    });
                  } catch (e) {
                    // Still add to local list for immediate UI update
                    setState(() {
                      widget.events.add(result);
                    });
                  }
                  
                  // Show success message with event details
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('calendar.event_created_successfully'.tr(args: [result.title])),
                      backgroundColor: context.primaryColor,
                      action: SnackBarAction(
                        label: 'View',
                        textColor: Colors.white,
                        onPressed: () {
                          // Scroll to the event time if it's today
                          final eventHour = result.startTime.hour;
                          final scrollPosition = (eventHour - 3) * 80.0;
                          if (scrollPosition > 0) {
                            _timelineController.animateTo(
                              scrollPosition,
                              duration: const Duration(milliseconds: 500),
                              curve: Curves.easeInOut,
                            );
                          }
                        },
                      ),
                    ),
                    );
                  }
                }
              },
              tooltip: 'AI Schedule',
            ),
            const SizedBox(width: 8),
            Container(
              height: 32,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [context.primaryColor, Color(0xFF8B6BFF)],
                ),
                borderRadius: BorderRadius.circular(5),
              ),
              child: ElevatedButton(
                onPressed: _showCreateEventDialog,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 0),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(5),
                  ),
                ),
                child: Text(
                  'calendar.new_event_btn'.tr(),
                  style: TextStyle(color: Colors.white, fontSize: 13),
                ),
              ),
            ),
            PopupMenuButton<String>(
              icon: Icon(Icons.more_horiz, color: textColor, size: 20),
              onSelected: (value) {
                // switch (value) {
                //   case 'import':
                //     _showImportCalendar();
                //     break;
                // }
              },
              itemBuilder: (context) => [
                // const PopupMenuItem(
                //   value: 'import',
                //   child: Row(
                //     children: [
                //       Icon(Icons.file_download),
                //       SizedBox(width: 8),
                //       Text('Import Calendar from Device'),
                //     ],
                //   ),
                // ),
              ],
            ),
            const SizedBox(width: 8),
          ],
        ),
      ),
    );
  }

  Widget _buildCurrentView(List<CalendarEvent> dateEvents) {
    switch (_currentView) {
      case 'Day':
        return _buildDayView(dateEvents);
      case 'Week':
        return _buildWeekView(dateEvents);
      case 'Month':
        return _buildMonthView(dateEvents);
      case 'Year':
        return _buildYearView(dateEvents);
      case 'Agenda':
        return _buildAgendaView(dateEvents);
      case 'Timeline':
        return _buildTimelineView(dateEvents);
      default:
        return _buildTimelineView(dateEvents);
    }
  }

  Widget _buildDayView(List<CalendarEvent> dateEvents) {
    // Day view - traditional daily calendar with hours and events spanning horizontally
    final now = DateTime.now();
    final isToday = _localSelectedDate.year == now.year &&
                    _localSelectedDate.month == now.month &&
                    _localSelectedDate.day == now.day;

    final weekdayName = [
      'calendar.weekday_monday'.tr(),
      'calendar.weekday_tuesday'.tr(),
      'calendar.weekday_wednesday'.tr(),
      'calendar.weekday_thursday'.tr(),
      'calendar.weekday_friday'.tr(),
      'calendar.weekday_saturday'.tr(),
      'calendar.weekday_sunday'.tr(),
    ][_localSelectedDate.weekday - 1];
    final monthName = [
      'calendar.month_january'.tr(),
      'calendar.month_february'.tr(),
      'calendar.month_march'.tr(),
      'calendar.month_april'.tr(),
      'calendar.month_may'.tr(),
      'calendar.month_june'.tr(),
      'calendar.month_july'.tr(),
      'calendar.month_august'.tr(),
      'calendar.month_september'.tr(),
      'calendar.month_october'.tr(),
      'calendar.month_november'.tr(),
      'calendar.month_december'.tr(),
    ][_localSelectedDate.month - 1];

    return Container(
      color: backgroundColor,
      child: Column(
        children: [
          // Time slots with events
          Expanded(
            child: ListView.builder(
              controller: _timelineController,
              itemCount: 24, // 24 hours
              itemBuilder: (context, hourIndex) {
                final hour = hourIndex;
                final isCurrentHour = now.hour == hour && isToday;

                // Format hour
                String hourString;
                if (hour == 0) {
                  hourString = '12 AM';
                } else if (hour < 12) {
                  hourString = '$hour AM';
                } else if (hour == 12) {
                  hourString = '12 PM';
                } else {
                  hourString = '${hour - 12} PM';
                }

                // Find events that start or overlap this hour
                final eventsAtThisHour = dateEvents.where((event) {
                  return event.startTime.hour == hour;
                }).toList();

                return Container(
                  decoration: BoxDecoration(
                    border: Border(
                      bottom: BorderSide(color: borderColor.withValues(alpha: 0.2)),
                    ),
                    color: isCurrentHour ? surfaceColor.withValues(alpha: 0.5) : null,
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Time label
                      Container(
                        width: 80,
                        padding: const EdgeInsets.only(top: 8, right: 12),
                        child: Text(
                          hourString,
                          textAlign: TextAlign.right,
                          style: TextStyle(
                            color: subtitleColor,
                            fontSize: 12,
                          ),
                        ),
                      ),

                      // Events area
                      Expanded(
                        child: DragTarget<CalendarEvent>(
                          onWillAccept: (data) => data != null,
                          onAccept: (event) {
                            _handleEventDropInDay(event, hour);
                          },
                          builder: (context, candidateData, rejectedData) {
                            final isDragOver = candidateData.isNotEmpty;
                            return Container(
                              constraints: const BoxConstraints(minHeight: 80),
                              padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
                              decoration: isDragOver
                                  ? BoxDecoration(
                                      color: primaryColor.withValues(alpha: 0.1),
                                      border: Border(
                                        left: BorderSide(
                                          color: primaryColor,
                                          width: 2,
                                        ),
                                      ),
                                    )
                                  : null,
                              child: eventsAtThisHour.isEmpty
                                  ? const SizedBox()
                                  : Column(
                                      crossAxisAlignment: CrossAxisAlignment.stretch,
                                      children: eventsAtThisHour.map((event) {
                                        return Draggable<CalendarEvent>(
                                          data: event,
                                          feedback: Material(
                                            color: Colors.transparent,
                                            child: Opacity(
                                              opacity: 0.8,
                                              child: Container(
                                                width: 300,
                                                margin: const EdgeInsets.only(bottom: 8),
                                                padding: const EdgeInsets.all(12),
                                                decoration: BoxDecoration(
                                                  color: _getCategoryColor(event).withValues(alpha: 0.15),
                                                  border: Border(
                                                    left: BorderSide(
                                                      color: _getCategoryColor(event),
                                                      width: 4,
                                                    ),
                                                  ),
                                                  borderRadius: BorderRadius.circular(4),
                                                  boxShadow: [
                                                    BoxShadow(
                                                      color: Colors.black.withValues(alpha: 0.3),
                                                      blurRadius: 8,
                                                      offset: const Offset(0, 4),
                                                    ),
                                                  ],
                                                ),
                                                child: Text(
                                                  event.title,
                                                  style: TextStyle(
                                                    color: textColor,
                                                    fontSize: 16,
                                                    fontWeight: FontWeight.w600,
                                                  ),
                                                ),
                                              ),
                                            ),
                                          ),
                                          childWhenDragging: Opacity(
                                            opacity: 0.3,
                                            child: Container(
                                              margin: const EdgeInsets.only(bottom: 8),
                                              padding: const EdgeInsets.all(12),
                                              decoration: BoxDecoration(
                                                color: _getCategoryColor(event).withValues(alpha: 0.15),
                                                border: Border(
                                                  left: BorderSide(
                                                    color: _getCategoryColor(event),
                                                    width: 4,
                                                  ),
                                                ),
                                                borderRadius: BorderRadius.circular(4),
                                              ),
                                              child: Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Row(
                                                    children: [
                                                      Icon(
                                                        Icons.access_time,
                                                        size: 14,
                                                        color: subtitleColor,
                                                      ),
                                                      const SizedBox(width: 4),
                                                      Text(
                                                        '${_formatTime(event.startTime)} - ${_formatTime(event.endTime)}',
                                                        style: TextStyle(
                                                          color: subtitleColor,
                                                          fontSize: 12,
                                                        ),
                                                      ),
                                                    ],
                                                  ),
                                                  const SizedBox(height: 6),
                                                  Text(
                                                    event.title,
                                                    style: TextStyle(
                                                      color: textColor,
                                                      fontSize: 16,
                                                      fontWeight: FontWeight.w600,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ),
                                          ),
                                          child: GestureDetector(
                                            onTap: () => _showEditEventScreen(event),
                                            child: Container(
                                              margin: const EdgeInsets.only(bottom: 8),
                                              padding: const EdgeInsets.all(12),
                                              decoration: BoxDecoration(
                                                color: _getCategoryColor(event).withValues(alpha: 0.15),
                                                border: Border(
                                                  left: BorderSide(
                                                    color: _getCategoryColor(event),
                                                    width: 4,
                                                  ),
                                                ),
                                                borderRadius: BorderRadius.circular(4),
                                              ),
                                              child: Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Row(
                                                    children: [
                                                      Icon(
                                                        Icons.access_time,
                                                        size: 14,
                                                        color: subtitleColor,
                                                      ),
                                                      const SizedBox(width: 4),
                                                      Text(
                                                        '${_formatTime(event.startTime)} - ${_formatTime(event.endTime)}',
                                                        style: TextStyle(
                                                          color: subtitleColor,
                                                          fontSize: 12,
                                                        ),
                                                      ),
                                                    ],
                                                  ),
                                                  const SizedBox(height: 6),
                                                  Text(
                                                    event.title,
                                                    style: TextStyle(
                                                      color: textColor,
                                                      fontSize: 16,
                                                      fontWeight: FontWeight.w600,
                                                    ),
                                                  ),
                                                  if (event.description != null && event.description!.isNotEmpty) ...[
                                                    const SizedBox(height: 4),
                                                    Html(
                                                      data: event.description!,
                                                      style: {
                                                        "body": Style(
                                                          margin: Margins.zero,
                                                          padding: HtmlPaddings.zero,
                                                          color: subtitleColor,
                                                          fontSize: FontSize(14),
                                                          maxLines: 2,
                                                          textOverflow: TextOverflow.ellipsis,
                                                        ),
                                                        "p": Style(
                                                          margin: Margins.zero,
                                                          padding: HtmlPaddings.zero,
                                                        ),
                                                      },
                                                    ),
                                                  ],
                                                  if (event.location != null && event.location!.isNotEmpty) ...[
                                                    const SizedBox(height: 4),
                                                    Row(
                                                      children: [
                                                        Icon(
                                                          Icons.location_on,
                                                          size: 14,
                                                          color: subtitleColor,
                                                        ),
                                                        const SizedBox(width: 4),
                                                        Expanded(
                                                          child: Text(
                                                            event.location!,
                                                            style: TextStyle(
                                                              color: subtitleColor,
                                                              fontSize: 12,
                                                            ),
                                                            maxLines: 1,
                                                            overflow: TextOverflow.ellipsis,
                                                          ),
                                                        ),
                                                      ],
                                                    ),
                                                  ],
                                                ],
                                              ),
                                            ),
                                          ),
                                        );
                                      }).toList(),
                                    ),
                            );
                          },
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWeekView(List<CalendarEvent> dateEvents) {
    // Week view - show 7 days in columns like Google Calendar
    final weekStart = _localSelectedDate.subtract(Duration(days: _localSelectedDate.weekday - 1));
    
    return Container(
      color: backgroundColor,
      child: Column(
        children: [
          // Week header with days
          Container(
            height: 60,
            decoration: BoxDecoration(
              color: surfaceColor,
              border: Border(bottom: BorderSide(color: borderColor)),
            ),
            child: Row(
              children: [
                // Time zone label
                Container(
                  width: 60,
                  padding: const EdgeInsets.all(8),
                  child: Center(
                    child: Text(
                      'GMT',
                      style: TextStyle(
                        color: subtitleColor,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ),
                // Days header
                ...List.generate(7, (index) {
                  final date = weekStart.add(Duration(days: index));
                  final isToday = _isToday(date);
                  final isSelected = date.day == _localSelectedDate.day && date.month == _localSelectedDate.month;
                  
                  return Expanded(
                    child: Container(
                      decoration: BoxDecoration(
                        border: Border(left: BorderSide(color: borderColor, width: 0.5)),
                        color: isSelected ? context.primaryColor.withValues(alpha: 0.1) : null,
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            [
                              'calendar.weekday_sun'.tr(),
                              'calendar.weekday_mon'.tr(),
                              'calendar.weekday_tue'.tr(),
                              'calendar.weekday_wed'.tr(),
                              'calendar.weekday_thu'.tr(),
                              'calendar.weekday_fri'.tr(),
                              'calendar.weekday_sat'.tr(),
                            ][index],
                            style: TextStyle(
                              color: isToday ? context.primaryColor : subtitleColor,
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: isToday ? context.primaryColor : Colors.transparent,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              '${date.day}',
                              style: TextStyle(
                                color: isToday 
                                    ? Colors.white 
                                    : isSelected 
                                        ? context.primaryColor 
                                        : textColor,
                                fontSize: 16,
                                fontWeight: isToday || isSelected ? FontWeight.bold : FontWeight.normal,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }),
              ],
            ),
          ),
          // Week content with time slots
          Expanded(
            child: SingleChildScrollView(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Time column
                  SizedBox(
                    width: 60,
                    child: Column(
                      children: List.generate(24, (hourIndex) {
                        return Container(
                          height: 80,
                          decoration: BoxDecoration(
                            border: Border(bottom: BorderSide(color: borderColor.withValues(alpha: 0.3))),
                          ),
                          child: Center(
                            child: Text(
                              hourIndex == 0 
                                  ? '12 AM'
                                  : hourIndex < 12 
                                      ? '$hourIndex AM'
                                      : hourIndex == 12
                                          ? '12 PM'
                                          : '${hourIndex - 12} PM',
                              style: TextStyle(
                                color: subtitleColor,
                                fontSize: 11,
                              ),
                            ),
                          ),
                        );
                      }),
                    ),
                  ),
                  // Days columns
                  ...List.generate(7, (dayIndex) {
                    final date = weekStart.add(Duration(days: dayIndex));
                    final dayEvents = _getEventsForDay(date);
                    
                    return Expanded(
                      child: Container(
                        decoration: BoxDecoration(
                          border: Border(left: BorderSide(color: borderColor, width: 0.5)),
                        ),
                        child: Column(
                          children: List.generate(24, (hourIndex) {
                            // Check if there are events at this hour
                            final hourEvents = dayEvents.where((event) =>
                              event.startTime.hour <= hourIndex && event.endTime.hour > hourIndex
                            ).toList();

                            return DragTarget<CalendarEvent>(
                              onWillAccept: (data) => data != null,
                              onAccept: (event) {
                                _handleEventDropWeek(event, date, hourIndex);
                              },
                              builder: (context, candidateData, rejectedData) {
                                final isDragOver = candidateData.isNotEmpty;
                                return Container(
                                  height: 80,
                                  decoration: BoxDecoration(
                                    border: Border(bottom: BorderSide(color: borderColor.withValues(alpha: 0.3))),
                                    color: isDragOver ? context.primaryColor.withOpacity(0.1) : null,
                                  ),
                                  child: Stack(
                                    children: [
                                      // Event blocks
                                      ...hourEvents.asMap().entries.map((entry) {
                                    final event = entry.value;
                                    final eventIndex = entry.key;
                                    
                                    // Calculate event position and size
                                    final startMinute = event.startTime.hour == hourIndex ? event.startTime.minute : 0;
                                    final endMinute = event.endTime.hour == hourIndex ? event.endTime.minute : 60;
                                    final topOffset = (startMinute / 60) * 80;
                                    final height = ((endMinute - startMinute) / 60) * 80;

                                    final weekEventWidget = Container(
                                      padding: const EdgeInsets.all(4),
                                      decoration: BoxDecoration(
                                        color: event.color.withValues(alpha: 0.2),
                                        borderRadius: BorderRadius.circular(4),
                                        border: Border.all(
                                          color: _draggingEvent?.id == event.id ? Colors.white : event.color,
                                          width: 1,
                                        ),
                                      ),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            event.title,
                                            style: TextStyle(
                                              color: event.color,
                                              fontSize: 10,
                                              fontWeight: FontWeight.bold,
                                            ),
                                            overflow: TextOverflow.ellipsis,
                                            maxLines: 1,
                                          ),
                                          if (height > 30) // Show time only if there's space
                                            Text(
                                              _formatTime(event.startTime),
                                              style: TextStyle(
                                                color: event.color.withValues(alpha: 0.8),
                                                fontSize: 8,
                                              ),
                                            ),
                                        ],
                                      ),
                                    );

                                    return Positioned(
                                      top: topOffset,
                                      left: 2 + (eventIndex * 2), // Slight offset for multiple events
                                      right: 2,
                                      height: height.clamp(20.0, 80.0), // Minimum height of 20
                                      child: LongPressDraggable<CalendarEvent>(
                                        data: event,
                                        feedback: Material(
                                          elevation: 6,
                                          borderRadius: BorderRadius.circular(4),
                                          child: Opacity(
                                            opacity: 0.8,
                                            child: SizedBox(
                                              width: 150,
                                              height: height.clamp(20.0, 80.0),
                                              child: weekEventWidget,
                                            ),
                                          ),
                                        ),
                                        childWhenDragging: Opacity(
                                          opacity: 0.3,
                                          child: weekEventWidget,
                                        ),
                                        onDragStarted: () {
                                          setState(() {
                                            _draggingEvent = event;
                                            _isDragging = true;
                                          });
                                          HapticFeedback.mediumImpact();
                                        },
                                        onDragEnd: (details) {
                                          setState(() {
                                            _draggingEvent = null;
                                            _isDragging = false;
                                          });
                                        },
                                        child: GestureDetector(
                                          onTap: () => _showEditEventScreen(event),
                                          child: weekEventWidget,
                                        ),
                                      ),
                                    );
                                  }),
                                ],
                              ),
                            );
                              },
                            );
                          }),
                        ),
                      ),
                    );
                  }),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMonthView(List<CalendarEvent> dateEvents) {
    // Month view - calendar grid like Google Calendar
    return Container(
      color: backgroundColor,
      child: Column(
        children: [
          // Days of week header
          Container(
            height: 50,
            decoration: BoxDecoration(
              color: surfaceColor,
              border: Border(bottom: BorderSide(color: borderColor)),
            ),
            child: Row(
              children: [
                'calendar.weekday_sun'.tr(),
                'calendar.weekday_mon'.tr(),
                'calendar.weekday_tue'.tr(),
                'calendar.weekday_wed'.tr(),
                'calendar.weekday_thu'.tr(),
                'calendar.weekday_fri'.tr(),
                'calendar.weekday_sat'.tr(),
              ].map((day) {
                return Expanded(
                  child: Container(
                    decoration: BoxDecoration(
                      border: Border(right: BorderSide(color: borderColor, width: 0.5)),
                    ),
                    child: Center(
                      child: Text(
                        day,
                        style: TextStyle(
                          color: subtitleColor,
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          // Calendar grid
          Expanded(
            child: GridView.builder(
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 7,
                childAspectRatio: 0.85, // Much taller cells to accommodate more events
              ),
              itemCount: 42, // 6 weeks * 7 days
              itemBuilder: (context, index) {
                final day = _getDayForIndex(index);
                final dayEvents = _getEventsForDay(day);
                final isToday = _isToday(day);
                final isCurrentMonth = day.month == _localSelectedDate.month;
                final isSelected = day.day == _localSelectedDate.day && day.month == _localSelectedDate.month;
                
                return Container(
                  decoration: BoxDecoration(
                    color: backgroundColor,
                    border: Border(
                      right: BorderSide(color: borderColor, width: 0.5),
                      bottom: BorderSide(color: borderColor, width: 0.5),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Date number header
                      Container(
                        height: 30,
                        padding: const EdgeInsets.all(4),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.start,
                          children: [
                            Container(
                              width: 24,
                              height: 24,
                              decoration: BoxDecoration(
                                color: isToday ? context.primaryColor : Colors.transparent,
                                shape: BoxShape.circle,
                              ),
                              child: Center(
                                child: Text(
                                  '${day.day}',
                                  style: TextStyle(
                                    color: isToday 
                                        ? Colors.white
                                        : isSelected 
                                            ? context.primaryColor
                                            : isCurrentMonth
                                                ? textColor
                                                : subtitleColor,
                                    fontWeight: isToday || isSelected ? FontWeight.bold : FontWeight.normal,
                                    fontSize: 12,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      // Events area
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 2),
                          child: dayEvents.isEmpty
                              ? const SizedBox.shrink()
                              : LayoutBuilder(
                                  builder: (context, constraints) {
                                    // Calculate how many events can fit
                                    final availableHeight = constraints.maxHeight;
                                    final eventHeight = 18.0; // Event height + margin
                                    final maxVisibleEvents = (availableHeight / eventHeight).floor();
                                    final eventsToShow = dayEvents.length > maxVisibleEvents 
                                        ? maxVisibleEvents - 1  // Reserve space for "+X more"
                                        : dayEvents.length;
                                    
                                    return Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        // Show visible events
                                        ...dayEvents.take(eventsToShow).map((event) {
                                          return GestureDetector(
                                            onTap: () => _showEditEventScreen(event),
                                            child: Container(
                                              width: double.infinity,
                                              height: 16,
                                              margin: const EdgeInsets.only(bottom: 2),
                                              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                              decoration: BoxDecoration(
                                                color: event.color.withValues(alpha: 0.2),
                                                borderRadius: BorderRadius.circular(3),
                                                border: Border.all(color: event.color, width: 1),
                                              ),
                                              child: Text(
                                                event.title,
                                                style: TextStyle(
                                                  color: event.color,
                                                  fontSize: 9,
                                                  fontWeight: FontWeight.w500,
                                                ),
                                                overflow: TextOverflow.ellipsis,
                                                maxLines: 1,
                                              ),
                                            ),
                                          );
                                        }),
                                        // Show "+X more" if there are more events
                                        if (dayEvents.length > eventsToShow)
                                          Container(
                                            width: double.infinity,
                                            height: 14,
                                            margin: const EdgeInsets.only(top: 2),
                                            child: Text(
                                              '+${dayEvents.length - eventsToShow} more',
                                              style: TextStyle(
                                                color: subtitleColor,
                                                fontSize: 8,
                                                fontWeight: FontWeight.w500,
                                              ),
                                              textAlign: TextAlign.center,
                                            ),
                                          ),
                                      ],
                                    );
                                  },
                                ),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildYearView(List<CalendarEvent> dateEvents) {
    // Year view - 12 month grid
    return Container(
      color: backgroundColor,
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Year header
          Container(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                IconButton(
                  icon: Icon(Icons.chevron_left, color: textColor),
                  onPressed: () {
                    // Previous year logic would go here
                  },
                ),
                Text(
                  '${_localSelectedDate.year}',
                  style: TextStyle(
                    color: textColor,
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                IconButton(
                  icon: Icon(Icons.chevron_right, color: textColor),
                  onPressed: () {
                    // Next year logic would go here
                  },
                ),
              ],
            ),
          ),
          // 12 months grid
          Expanded(
            child: GridView.builder(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 1.0,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
              ),
              itemCount: 12,
              itemBuilder: (context, monthIndex) {
                final month = monthIndex + 1;
                final isCurrentMonth = month == _localSelectedDate.month;
                
                return Container(
                  decoration: BoxDecoration(
                    color: surfaceColor,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: isCurrentMonth ? context.primaryColor : borderColor,
                      width: isCurrentMonth ? 2 : 1,
                    ),
                  ),
                  child: Column(
                    children: [
                      // Month name
                      Container(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: Text(
                          _getMonthName(month),
                          style: TextStyle(
                            color: isCurrentMonth ? context.primaryColor : textColor,
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                      ),
                      // Mini calendar
                      Expanded(
                        child: GridView.builder(
                          physics: const NeverScrollableScrollPhysics(),
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 7,
                            childAspectRatio: 1.0,
                          ),
                          itemCount: DateTime(_localSelectedDate.year, month + 1, 0).day, // Actual days in month
                          itemBuilder: (context, dayIndex) {
                            final day = dayIndex + 1;

                            final currentDate = DateTime(_localSelectedDate.year, month, day);
                            final dayEvents = _getEventsForDay(currentDate);
                            final isToday = _localSelectedDate.month == month && 
                                           _localSelectedDate.day == day;
                            final isSelected = _localSelectedDate.year == currentDate.year &&
                                             _localSelectedDate.month == currentDate.month &&
                                             _localSelectedDate.day == currentDate.day;
                            
                            return GestureDetector(
                              onTap: () {
                                // Update local selected date immediately for immediate UI feedback
                                setState(() {
                                  _localSelectedDate = currentDate;
                                  _currentView = 'Day';
                                });
                                
                                // Update selected date and notify parent
                                widget.onDateChanged?.call(currentDate);
                                
                                // Show feedback with event count
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(
                                      dayEvents.isEmpty 
                                        ? 'No events on ${currentDate.day}/${currentDate.month}/${currentDate.year}'
                                        : '${dayEvents.length} event${dayEvents.length == 1 ? '' : 's'} on ${currentDate.day}/${currentDate.month}/${currentDate.year}'
                                    ),
                                    duration: const Duration(seconds: 2),
                                  ),
                                );
                              },
                              child: Container(
                                margin: const EdgeInsets.all(0.5),
                                decoration: BoxDecoration(
                                  color: isSelected ? context.primaryColor : 
                                         dayEvents.isNotEmpty ? context.primaryColor.withValues(alpha: 0.1) : null,
                                  borderRadius: BorderRadius.circular(2),
                                  border: isToday && !isSelected ? Border.all(
                                    color: context.primaryColor,
                                    width: 1,
                                  ) : null,
                                ),
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Text(
                                      '$day',
                                      style: TextStyle(
                                        color: isSelected ? Colors.white : 
                                               isToday ? context.primaryColor : subtitleColor,
                                        fontSize: 7,
                                        fontWeight: isSelected || isToday ? FontWeight.bold : FontWeight.normal,
                                      ),
                                    ),
                                    if (dayEvents.isNotEmpty)
                                      Container(
                                        margin: const EdgeInsets.only(top: 1),
                                        padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 0.5),
                                        decoration: BoxDecoration(
                                          color: isSelected ? Colors.white.withValues(alpha: 0.8) : context.primaryColor,
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Text(
                                          '${dayEvents.length}',
                                          style: TextStyle(
                                            color: isSelected ? context.primaryColor : Colors.white,
                                            fontSize: 5,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAgendaView(List<CalendarEvent> dateEvents) {
    // Check if the selected date is today
    final now = DateTime.now();
    final isToday = _localSelectedDate.year == now.year &&
                    _localSelectedDate.month == now.month &&
                    _localSelectedDate.day == now.day;

    // Format the date header
    final weekdayNames = [
      'calendar.day_monday'.tr(),
      'calendar.day_tuesday'.tr(),
      'calendar.day_wednesday'.tr(),
      'calendar.day_thursday'.tr(),
      'calendar.day_friday'.tr(),
      'calendar.day_saturday'.tr(),
      'calendar.day_sunday'.tr()
    ];
    final monthNames = [
      'calendar.month_january'.tr(),
      'calendar.month_february'.tr(),
      'calendar.month_march'.tr(),
      'calendar.month_april'.tr(),
      'calendar.month_may'.tr(),
      'calendar.month_june'.tr(),
      'calendar.month_july'.tr(),
      'calendar.month_august'.tr(),
      'calendar.month_september'.tr(),
      'calendar.month_october'.tr(),
      'calendar.month_november'.tr(),
      'calendar.month_december'.tr()
    ];
    final weekday = weekdayNames[_localSelectedDate.weekday - 1];
    final month = monthNames[_localSelectedDate.month - 1];
    final dateHeader = '$weekday, $month ${_localSelectedDate.day}';

    return Container(
      color: backgroundColor,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Filter dropdowns
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: surfaceColor,
              border: Border(bottom: BorderSide(color: borderColor)),
            ),
            child: Row(
              children: [
                // Category filter dropdown
                Expanded(
                  child: Container(
                    height: 40,
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: backgroundColor,
                      border: Border.all(color: borderColor),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: _isLoadingCategories
                        ? Center(
                            child: SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: primaryColor,
                              ),
                            ),
                          )
                        : DropdownButtonHideUnderline(
                            child: DropdownButton<String?>(
                              value: _agendaSelectedCategoryId,
                              hint: Text(
                                'All categories',
                                style: TextStyle(color: textColor, fontSize: 14),
                              ),
                              isExpanded: true,
                              icon: Icon(Icons.arrow_drop_down, color: subtitleColor),
                              items: [
                                DropdownMenuItem<String?>(
                                  value: null,
                                  child: Text('calendar.all_categories'.tr(), style: TextStyle(color: textColor)),
                                ),
                                ..._categories.map((category) => DropdownMenuItem<String?>(
                                  value: category.id,
                                  child: Row(
                                    children: [
                                      Container(
                                        width: 12,
                                        height: 12,
                                        decoration: BoxDecoration(
                                          color: Color(int.parse(category.color.replaceFirst('#', '0xFF'))),
                                          shape: BoxShape.circle,
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Text(category.name, style: TextStyle(color: textColor)),
                                    ],
                                  ),
                                )),
                              ],
                              onChanged: (value) {
                                setState(() {
                                  _agendaSelectedCategoryId = value;
                                });
                              },
                            ),
                          ),
                  ),
                ),
                const SizedBox(width: 12),
                // Priority filter dropdown
                Expanded(
                  child: Container(
                    height: 40,
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: backgroundColor,
                      border: Border.all(color: borderColor),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String?>(
                        value: _agendaSelectedPriority,
                        hint: Text(
                          'calendar.all_priorities'.tr(),
                          style: TextStyle(color: textColor, fontSize: 14),
                        ),
                        isExpanded: true,
                        icon: Icon(Icons.arrow_drop_down, color: subtitleColor),
                        items: [
                          DropdownMenuItem<String?>(
                            value: null,
                            child: Text('calendar.all_priorities'.tr(), style: TextStyle(color: textColor)),
                          ),
                          DropdownMenuItem<String?>(
                            value: 'low',
                            child: Text('calendar.priority_low'.tr(), style: TextStyle(color: textColor)),
                          ),
                          DropdownMenuItem<String?>(
                            value: 'medium',
                            child: Text('calendar.priority_normal'.tr(), style: TextStyle(color: textColor)),
                          ),
                          DropdownMenuItem<String?>(
                            value: 'high',
                            child: Text('calendar.priority_high'.tr(), style: TextStyle(color: textColor)),
                          ),
                          DropdownMenuItem<String?>(
                            value: 'urgent',
                            child: Text('common.urgent'.tr(), style: TextStyle(color: textColor)),
                          ),
                        ],
                        onChanged: (value) {
                          setState(() {
                            _agendaSelectedPriority = value;
                          });
                        },
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Date header with event count
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.centerLeft,
                end: Alignment.centerRight,
                colors: [
                  const Color(0xFF6B46F5),
                  const Color(0xFF9D5EFF),
                ],
              ),
              borderRadius: const BorderRadius.only(
                bottomLeft: Radius.circular(8),
                bottomRight: Radius.circular(8),
              ),
            ),
            child: Row(
              children: [
                const Icon(Icons.calendar_today, color: Colors.white, size: 20),
                const SizedBox(width: 8),
                Text(
                  dateHeader,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(width: 8),
                if (isToday)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Text(
                      'Today',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                const Spacer(),
                Text(
                  '${dateEvents.length} event${dateEvents.length != 1 ? 's' : ''}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),

          // Events list
          Expanded(
            child: dateEvents.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.event_busy, color: subtitleColor, size: 64),
                        const SizedBox(height: 16),
                        Text(
                          'No events scheduled',
                          style: TextStyle(color: textColor, fontSize: 18),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Create an event to get started',
                          style: TextStyle(color: subtitleColor, fontSize: 14),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: dateEvents.length,
                    itemBuilder: (context, index) {
                      final event = dateEvents[index];
                      final duration = _formatDuration(event.startTime, event.endTime);

                      return GestureDetector(
                        onTap: () => _showEditEventScreen(event),
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: surfaceColor,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: borderColor.withValues(alpha: 0.3)),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Time and duration column
                              SizedBox(
                                width: 80,
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Icon(Icons.access_time, color: subtitleColor, size: 14),
                                        const SizedBox(width: 4),
                                      ],
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      _formatTime(event.startTime),
                                      style: TextStyle(
                                        color: textColor,
                                        fontSize: 13,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                    Text(
                                      _formatTime(event.endTime),
                                      style: TextStyle(
                                        color: textColor,
                                        fontSize: 13,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      duration,
                                      style: TextStyle(
                                        color: subtitleColor,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ],
                                ),
                              ),

                              const SizedBox(width: 16),

                              // Event details
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      event.title,
                                      style: TextStyle(
                                        color: textColor,
                                        fontSize: 16,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                    if (event.description != null && event.description!.isNotEmpty) ...[
                                      const SizedBox(height: 4),
                                      Html(
                                        data: event.description!,
                                        style: {
                                          "body": Style(
                                            margin: Margins.zero,
                                            padding: HtmlPaddings.zero,
                                            color: subtitleColor,
                                            fontSize: FontSize(14),
                                            maxLines: 2,
                                            textOverflow: TextOverflow.ellipsis,
                                          ),
                                          "p": Style(
                                            margin: Margins.zero,
                                            padding: HtmlPaddings.zero,
                                          ),
                                        },
                                      ),
                                    ],
                                    if (event.location != null && event.location!.isNotEmpty) ...[
                                      const SizedBox(height: 4),
                                      Row(
                                        children: [
                                          Icon(Icons.location_on, color: subtitleColor, size: 14),
                                          const SizedBox(width: 4),
                                          Expanded(
                                            child: Text(
                                              event.location!,
                                              style: TextStyle(
                                                color: subtitleColor,
                                                fontSize: 13,
                                              ),
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ],
                                ),
                              ),

                              const SizedBox(width: 16),

                              // Color indicator
                              Container(
                                width: 8,
                                height: 8,
                                decoration: BoxDecoration(
                                  color: _getCategoryColor(event),
                                  shape: BoxShape.circle,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildTimelineView(List<CalendarEvent> dateEvents) {
    // Calculate date range based on selected period
    DateTime startDate;
    DateTime endDate;

    switch (_timelinePeriod) {
      case '1 Week':
        startDate = _localSelectedDate.subtract(Duration(days: _localSelectedDate.weekday - 1));
        endDate = startDate.add(const Duration(days: 6));
        break;
      case '2 Weeks':
        startDate = _localSelectedDate.subtract(Duration(days: _localSelectedDate.weekday - 1));
        endDate = startDate.add(const Duration(days: 13));
        break;
      case '1 Month':
        startDate = DateTime(_localSelectedDate.year, _localSelectedDate.month, 1);
        endDate = DateTime(_localSelectedDate.year, _localSelectedDate.month + 1, 0);
        break;
      case '3 Months':
        startDate = DateTime(_localSelectedDate.year, _localSelectedDate.month, 1);
        endDate = DateTime(_localSelectedDate.year, _localSelectedDate.month + 3, 0);
        break;
      default:
        startDate = _localSelectedDate.subtract(Duration(days: _localSelectedDate.weekday - 1));
        endDate = startDate.add(const Duration(days: 13));
    }

    // Generate list of dates for the period
    final dates = <DateTime>[];
    DateTime currentDate = startDate;
    while (currentDate.isBefore(endDate) || currentDate.isAtSameMomentAs(endDate)) {
      dates.add(currentDate);
      currentDate = currentDate.add(const Duration(days: 1));
    }

    // Group events by category
    final eventsByCategory = <String, List<CalendarEvent>>{};
    for (final event in widget.events) {
      // Filter events within the date range
      if (event.startTime.isAfter(startDate.subtract(const Duration(days: 1))) &&
          event.startTime.isBefore(endDate.add(const Duration(days: 1)))) {
        final categoryId = event.categoryId ?? 'uncategorized';
        eventsByCategory.putIfAbsent(categoryId, () => []).add(event);
      }
    }

    // Get all categories to show as columns
    final allCategories = [..._categories];

    // Adjust date column width based on view mode
    final double dateColumnWidth = _timelineViewMode == 'Day' ? 120.0 : (_timelineViewMode == 'Week' ? 80.0 : 60.0);

    return Container(
      color: backgroundColor,
      child: Column(
        children: [
          // Timeline navigation bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: surfaceColor,
              border: Border(bottom: BorderSide(color: borderColor.withValues(alpha: 0.5))),
            ),
            child: Row(
              children: [
                // Time period selector
                Icon(Icons.access_time, color: subtitleColor, size: 18),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    border: Border.all(color: borderColor),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _timelinePeriod,
                      isDense: true,
                      icon: Icon(Icons.arrow_drop_down, color: subtitleColor, size: 20),
                      style: TextStyle(color: textColor, fontSize: 14),
                      items: [
                        DropdownMenuItem(value: '1 Week', child: Text('1 Week')),
                        DropdownMenuItem(value: '2 Weeks', child: Text('2 Weeks')),
                        DropdownMenuItem(value: '1 Month', child: Text('1 Month')),
                        DropdownMenuItem(value: '3 Months', child: Text('3 Months')),
                      ],
                      onChanged: (value) {
                        if (value != null) {
                          setState(() => _timelinePeriod = value);
                        }
                      },
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                // View mode buttons
                Container(
                  decoration: BoxDecoration(
                    border: Border.all(color: borderColor),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Row(
                    children: [
                      _buildTimelineViewButton('Day'),
                      _buildTimelineViewButton('Week'),
                      _buildTimelineViewButton('Month'),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Header with categories as columns
          Container(
            decoration: BoxDecoration(
              color: surfaceColor,
              border: Border(bottom: BorderSide(color: borderColor)),
            ),
            child: Row(
              children: [
                // Date column header
                Container(
                  width: dateColumnWidth,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    border: Border(right: BorderSide(color: borderColor)),
                  ),
                  child: Text(
                    'Date',
                    style: TextStyle(
                      color: textColor,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                // Category columns
                Expanded(
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        ...allCategories.map((category) {
                          final categoryEvents = eventsByCategory[category.id] ?? [];
                          return Container(
                            width: 150,
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              border: Border(
                                left: BorderSide(color: borderColor.withValues(alpha: 0.3)),
                              ),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 10,
                                  height: 10,
                                  decoration: BoxDecoration(
                                    color: Color(int.parse(category.color.replaceFirst('#', '0xFF'))),
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    category.name,
                                    style: TextStyle(
                                      color: textColor,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                Text(
                                  '${categoryEvents.length}',
                                  style: TextStyle(
                                    color: subtitleColor,
                                    fontSize: 10,
                                  ),
                                ),
                              ],
                            ),
                          );
                        }),
                        // Uncategorized column
                        if (eventsByCategory['uncategorized']?.isNotEmpty ?? false)
                          Container(
                            width: 150,
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              border: Border(
                                left: BorderSide(color: borderColor.withValues(alpha: 0.3)),
                              ),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 10,
                                  height: 10,
                                  decoration: BoxDecoration(
                                    color: Colors.grey,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    'Uncategorized',
                                    style: TextStyle(
                                      color: textColor,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                Text(
                                  '${eventsByCategory['uncategorized']?.length ?? 0}',
                                  style: TextStyle(
                                    color: subtitleColor,
                                    fontSize: 10,
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Date rows going vertically
          Expanded(
            child: ListView.builder(
              controller: _timelineController,
              itemCount: dates.length,
              itemBuilder: (context, dateIndex) {
                final date = dates[dateIndex];
                final now = DateTime.now();
                final isToday = date.year == now.year &&
                    date.month == now.month &&
                    date.day == now.day;

                // Format date based on view mode
                String dateString;
                if (_timelineViewMode == 'Day') {
                  // Day view: Show weekday name and date (e.g., "Mon, Oct 27")
                  final weekdayNames = [
                    'calendar.day_mon_short'.tr(),
                    'calendar.day_tue_short'.tr(),
                    'calendar.day_wed_short'.tr(),
                    'calendar.day_thu_short'.tr(),
                    'calendar.day_fri_short'.tr(),
                    'calendar.day_sat_short'.tr(),
                    'calendar.day_sun_short'.tr()
                  ];
                  final monthNames = [
                    'calendar.month_jan_short'.tr(),
                    'calendar.month_feb_short'.tr(),
                    'calendar.month_mar_short'.tr(),
                    'calendar.month_apr_short'.tr(),
                    'calendar.month_may_short'.tr(),
                    'calendar.month_jun_short'.tr(),
                    'calendar.month_jul_short'.tr(),
                    'calendar.month_aug_short'.tr(),
                    'calendar.month_sep_short'.tr(),
                    'calendar.month_oct_short'.tr(),
                    'calendar.month_nov_short'.tr(),
                    'calendar.month_dec_short'.tr()
                  ];
                  final weekdayName = weekdayNames[date.weekday - 1];
                  final monthName = monthNames[date.month - 1];
                  dateString = '$weekdayName, $monthName ${date.day}';
                } else if (_timelineViewMode == 'Week') {
                  // Week view: Show month number and date (e.g., "10/27")
                  dateString = '${date.month}/${date.day}';
                } else {
                  // Month view: Show only day number (e.g., "27")
                  dateString = '${date.day}';
                }

                return Container(
                  height: 80,
                  decoration: BoxDecoration(
                    border: Border(
                      bottom: BorderSide(color: borderColor.withValues(alpha: 0.3)),
                    ),
                    color: isToday ? surfaceColor : null,
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Date label
                      Container(
                        width: dateColumnWidth,
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          border: Border(right: BorderSide(color: borderColor)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              dateString,
                              style: TextStyle(
                                color: isToday ? primaryColor : textColor,
                                fontSize: 13,
                                fontWeight: isToday ? FontWeight.w600 : FontWeight.w500,
                              ),
                            ),
                            if (isToday)
                              Container(
                                margin: const EdgeInsets.only(top: 4),
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: primaryColor,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: const Text(
                                  'Today',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                      // Category columns with events
                      Expanded(
                        child: SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: Row(
                            children: [
                              ...allCategories.map((category) {
                                final categoryEvents = eventsByCategory[category.id] ?? [];
                                final eventsOnThisDay = categoryEvents.where((event) {
                                  return event.startTime.year == date.year &&
                                         event.startTime.month == date.month &&
                                         event.startTime.day == date.day;
                                }).toList();

                                return Container(
                                  width: 150,
                                  decoration: BoxDecoration(
                                    border: Border(
                                      left: BorderSide(color: borderColor.withValues(alpha: 0.3)),
                                    ),
                                  ),
                                  child: eventsOnThisDay.isEmpty
                                      ? const SizedBox()
                                      : Padding(
                                          padding: const EdgeInsets.all(4),
                                          child: SingleChildScrollView(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              mainAxisSize: MainAxisSize.min,
                                              children: eventsOnThisDay.map((event) {
                                                return GestureDetector(
                                                  onTap: () => _showEditEventScreen(event),
                                                  child: Container(
                                                    margin: const EdgeInsets.only(bottom: 4),
                                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                                                    decoration: BoxDecoration(
                                                      color: _getCategoryColor(event).withValues(alpha: 0.2),
                                                      border: Border.all(
                                                        color: _getCategoryColor(event),
                                                        width: 1.5,
                                                      ),
                                                      borderRadius: BorderRadius.circular(4),
                                                    ),
                                                    child: Column(
                                                      crossAxisAlignment: CrossAxisAlignment.start,
                                                      children: [
                                                        Text(
                                                          event.title,
                                                          style: TextStyle(
                                                            color: textColor,
                                                            fontSize: 11,
                                                            fontWeight: FontWeight.w600,
                                                          ),
                                                          overflow: TextOverflow.ellipsis,
                                                          maxLines: 1,
                                                        ),
                                                        const SizedBox(height: 2),
                                                        Text(
                                                          '${_formatTime(event.startTime)} - ${_formatTime(event.endTime)}',
                                                          style: TextStyle(
                                                            color: subtitleColor,
                                                            fontSize: 9,
                                                          ),
                                                        ),
                                                      ],
                                                    ),
                                                  ),
                                                );
                                              }).toList(),
                                            ),
                                          ),
                                        ),
                                );
                              }),
                              // Uncategorized column
                              if (eventsByCategory['uncategorized']?.isNotEmpty ?? false)
                                Container(
                                  width: 150,
                                  decoration: BoxDecoration(
                                    border: Border(
                                      left: BorderSide(color: borderColor.withValues(alpha: 0.3)),
                                    ),
                                  ),
                                  child: () {
                                    final uncategorizedEvents = eventsByCategory['uncategorized'] ?? [];
                                    final eventsOnThisDay = uncategorizedEvents.where((event) {
                                      return event.startTime.year == date.year &&
                                             event.startTime.month == date.month &&
                                             event.startTime.day == date.day;
                                    }).toList();

                                    return eventsOnThisDay.isEmpty
                                        ? const SizedBox()
                                        : Padding(
                                            padding: const EdgeInsets.all(4),
                                            child: SingleChildScrollView(
                                              child: Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                mainAxisSize: MainAxisSize.min,
                                                children: eventsOnThisDay.map((event) {
                                                  return GestureDetector(
                                                    onTap: () => _showEditEventScreen(event),
                                                    child: Container(
                                                      margin: const EdgeInsets.only(bottom: 4),
                                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                                                      decoration: BoxDecoration(
                                                        color: Colors.grey.withValues(alpha: 0.2),
                                                        border: Border.all(
                                                          color: Colors.grey,
                                                          width: 1.5,
                                                        ),
                                                        borderRadius: BorderRadius.circular(4),
                                                      ),
                                                      child: Column(
                                                        crossAxisAlignment: CrossAxisAlignment.start,
                                                        children: [
                                                          Text(
                                                            event.title,
                                                            style: TextStyle(
                                                              color: textColor,
                                                              fontSize: 11,
                                                              fontWeight: FontWeight.w600,
                                                            ),
                                                            overflow: TextOverflow.ellipsis,
                                                            maxLines: 1,
                                                          ),
                                                          const SizedBox(height: 2),
                                                          Text(
                                                            '${_formatTime(event.startTime)} - ${_formatTime(event.endTime)}',
                                                            style: TextStyle(
                                                              color: subtitleColor,
                                                              fontSize: 9,
                                                            ),
                                                          ),
                                                        ],
                                                      ),
                                                    ),
                                                  );
                                                }).toList(),
                                              ),
                                            ),
                                          );
                                  }(),
                                ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTimeSlot(int hour, List<CalendarEvent> events, bool isCurrentHour) {
    final timeString = _formatHour(hour);
    // Show events that START during this hour (to avoid duplicates)
    final eventsAtThisHour = events.where((event) {
      return event.startTime.hour == hour;
    }).toList();

    return Container(
      height: 80,
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(color: timelineHourColor, width: 0.5),
        ),
        color: isCurrentHour ? surfaceColor : null,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Time Label
          Container(
            width: 80,
            padding: const EdgeInsets.all(8),
            child: Text(
              timeString,
              style: TextStyle(
                color: subtitleColor,
                fontSize: 12,
              ),
            ),
          ),

          // Events Column with DragTarget
          Expanded(
            child: DragTarget<CalendarEvent>(
              onWillAccept: (data) => data != null,
              onAccept: (event) {
                _handleEventDrop(event, hour);
              },
              builder: (context, candidateData, rejectedData) {
                final isDragOver = candidateData.isNotEmpty;
                return Container(
                  color: isDragOver ? context.primaryColor.withOpacity(0.1) : null,
                  child: Stack(
                    children: [
                      ...eventsAtThisHour.map((event) => _buildTimelineEvent(event)),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTimelineEvent(CalendarEvent event) {
    final duration = event.endTime.difference(event.startTime).inMinutes;
    final calculatedHeight = (duration / 60) * 80.0; // 80px per hour
    // Constrain height to fit within the time slot (80px - 16px for padding)
    final height = calculatedHeight.clamp(0.0, 64.0);

    final eventWidget = Container(
      height: height,
      decoration: BoxDecoration(
        color: event.color,
        borderRadius: BorderRadius.circular(5),
        border: Border.all(
          color: _draggingEvent?.id == event.id
              ? Colors.white
              : event.color,
          width: 2,
        ),
      ),
      padding: const EdgeInsets.all(8),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              event.title,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 14,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            if (height > 30) ...[
              const SizedBox(height: 2),
              Text(
                '${_formatTime(event.startTime)} - ${_formatTime(event.endTime)}',
                style: const TextStyle(
                  color: Colors.white70,
                  fontSize: 11,
                ),
              ),
            ],
            if (height > 50) ...[
              const SizedBox(height: 2),
              Html(
                data: event.description ?? '<p>No description</p>',
                style: {
                  "body": Style(
                    margin: Margins.zero,
                    padding: HtmlPaddings.zero,
                    color: Colors.white70,
                    fontSize: FontSize(11),
                    maxLines: 2,
                    textOverflow: TextOverflow.ellipsis,
                  ),
                  "p": Style(
                    margin: Margins.zero,
                    padding: HtmlPaddings.zero,
                  ),
                },
              ),
            ],
          ],
        ),
      ),
    );

    return Positioned(
      top: 8,
      left: 8,
      right: 8,
      child: LongPressDraggable<CalendarEvent>(
        data: event,
        feedback: Material(
          elevation: 6,
          borderRadius: BorderRadius.circular(5),
          child: Opacity(
            opacity: 0.8,
            child: SizedBox(
              width: 300,
              child: eventWidget,
            ),
          ),
        ),
        childWhenDragging: Opacity(
          opacity: 0.3,
          child: eventWidget,
        ),
        onDragStarted: () {
          setState(() {
            _draggingEvent = event;
            _isDragging = true;
          });
          HapticFeedback.mediumImpact();
        },
        onDragEnd: (details) {
          setState(() {
            _draggingEvent = null;
            _isDragging = false;
          });
        },
        child: GestureDetector(
          onTap: () => _showEditEventScreen(event),
          child: eventWidget,
        ),
      ),
    );
  }

  // Check if current user is the organizer of the event
  bool _isEventOrganizer(CalendarEvent event) {
    final currentUser = AuthService.instance.currentUser;
    if (currentUser == null || event.organizerId == null) {
      return false;
    }
    return currentUser.id == event.organizerId;
  }

  void _showEditEventScreen(CalendarEvent event) async {
    if (!mounted) return;

    // Check if current user is the organizer
    if (!_isEventOrganizer(event)) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('calendar.only_organizer_can_edit'.tr()),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    try {
      final result = await Navigator.push<CalendarEvent>(
        context,
        MaterialPageRoute(
          builder: (context) => EditEventScreen(
            event: event,
            onEventUpdated: (updatedEvent) {
              if (mounted) {
                final index = widget.events.indexWhere((e) => e.id == event.id);
                if (index != -1) {
                  setState(() {
                    widget.events[index] = updatedEvent;
                  });
                }
              }
            },
            onEventDeleted: () {
              if (mounted) {
                setState(() {
                  widget.events.removeWhere((e) => e.id == event.id);
                });
              }
            },
          ),
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error opening event editor: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _handleEventDrop(CalendarEvent event, int targetHour) async {
    if (!mounted) return;

    try {
      // Calculate the time difference
      final originalHour = event.startTime.hour;
      final hourDiff = targetHour - originalHour;

      // Calculate new start and end times
      final newStartTime = event.startTime.add(Duration(hours: hourDiff));
      final newEndTime = event.endTime.add(Duration(hours: hourDiff));

      // Show loading indicator
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                ),
              ),
              SizedBox(width: 12),
              Text('calendar.updating_event'.tr()),
            ],
          ),
          duration: Duration(seconds: 2),
        ),
      );

      // Get current workspace
      final currentWorkspace = _workspaceService.currentWorkspace;
      if (currentWorkspace == null) {
        throw Exception('No workspace selected');
      }

      if (event.id == null) {
        throw Exception('Event ID is null');
      }

      // Prepare update DTO
      final updateDto = api.UpdateEventDto(
        title: event.title,
        description: event.description,
        startTime: newStartTime,
        endTime: newEndTime,
        location: event.location,
        allDay: event.allDay,
        categoryId: event.categoryId,
        roomId: event.roomId,
      );

      // Call update API
      final response = await _calendarApi.updateEvent(
        currentWorkspace.id,
        event.id!,
        updateDto,
      );

      if (!mounted) return;

      if (response.isSuccess && response.data != null) {
        // Update the event in the list optimistically
        final index = widget.events.indexWhere((e) => e.id == event.id);
        if (index != -1) {
          setState(() {
            widget.events[index] = CalendarEvent(
              id: response.data!.id,
              workspaceId: response.data!.workspaceId,
              title: response.data!.title,
              description: response.data!.description,
              startTime: response.data!.startTime,
              endTime: response.data!.endTime,
              categoryId: response.data!.categoryId,
              location: response.data!.location,
              allDay: response.data!.isAllDay,
              organizerId: response.data!.organizerId,
              roomId: response.data!.meetingRoomId,
              meetingUrl: response.data!.meetingUrl,
            );
          });
        }

        // Show success message
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Event moved to ${_formatTime(newStartTime)} - ${_formatTime(newEndTime)}',
            ),
            backgroundColor: Colors.green,
            action: SnackBarAction(
              label: 'Undo',
              textColor: Colors.white,
              onPressed: () {
                // Undo by moving back to original time
                _handleEventDrop(widget.events[index], originalHour);
              },
            ),
          ),
        );

        // Provide haptic feedback
        HapticFeedback.lightImpact();
      } else {
        throw Exception(response.message ?? 'Failed to update event');
      }
    } catch (e) {
      if (!mounted) return;

      // Show error message
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('calendar.failed_move_event'.tr(args: ['$e'])),
          backgroundColor: Colors.red,
          action: SnackBarAction(
            label: 'Retry',
            textColor: Colors.white,
            onPressed: () {
              _handleEventDrop(event, targetHour);
            },
          ),
        ),
      );

      // Provide error haptic feedback
      HapticFeedback.heavyImpact();
    }
  }

  Future<void> _handleEventDropWeek(CalendarEvent event, DateTime targetDate, int targetHour) async {
    if (!mounted) return;

    try {
      // Calculate the time and date difference
      final newStartTime = DateTime(
        targetDate.year,
        targetDate.month,
        targetDate.day,
        targetHour,
        event.startTime.minute,
      );

      // Calculate duration and new end time
      final duration = event.endTime.difference(event.startTime);
      final newEndTime = newStartTime.add(duration);

      // Show loading indicator
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                ),
              ),
              SizedBox(width: 12),
              Text('calendar.updating_event'.tr()),
            ],
          ),
          duration: Duration(seconds: 2),
        ),
      );

      // Get current workspace
      final currentWorkspace = _workspaceService.currentWorkspace;
      if (currentWorkspace == null) {
        throw Exception('No workspace selected');
      }

      if (event.id == null) {
        throw Exception('Event ID is null');
      }

      // Prepare update DTO
      final updateDto = api.UpdateEventDto(
        title: event.title,
        description: event.description,
        startTime: newStartTime,
        endTime: newEndTime,
        location: event.location,
        allDay: event.allDay,
        categoryId: event.categoryId,
        roomId: event.roomId,
      );

      // Call update API
      final response = await _calendarApi.updateEvent(
        currentWorkspace.id,
        event.id!,
        updateDto,
      );

      if (!mounted) return;

      if (response.isSuccess && response.data != null) {
        // Update the event in the list optimistically
        final index = widget.events.indexWhere((e) => e.id == event.id);
        if (index != -1) {
          setState(() {
            widget.events[index] = CalendarEvent(
              id: response.data!.id,
              workspaceId: response.data!.workspaceId,
              title: response.data!.title,
              description: response.data!.description,
              startTime: response.data!.startTime,
              endTime: response.data!.endTime,
              categoryId: response.data!.categoryId,
              location: response.data!.location,
              allDay: response.data!.isAllDay,
              organizerId: response.data!.organizerId,
              roomId: response.data!.meetingRoomId,
              meetingUrl: response.data!.meetingUrl,
            );
          });
        }

        // Format day name
        final dayNames = [
          'calendar.day_sunday'.tr(),
          'calendar.day_monday'.tr(),
          'calendar.day_tuesday'.tr(),
          'calendar.day_wednesday'.tr(),
          'calendar.day_thursday'.tr(),
          'calendar.day_friday'.tr(),
          'calendar.day_saturday'.tr()
        ];
        final dayName = dayNames[targetDate.weekday % 7];

        // Show success message
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'calendar.event_moved_to'.tr(args: ['$dayName ${_formatTime(newStartTime)} - ${_formatTime(newEndTime)}']),
            ),
            backgroundColor: Colors.green,
            action: SnackBarAction(
              label: 'Undo',
              textColor: Colors.white,
              onPressed: () {
                // Undo by moving back to original time and date
                _handleEventDropWeek(
                  widget.events[index],
                  event.startTime,
                  event.startTime.hour,
                );
              },
            ),
          ),
        );

        // Provide haptic feedback
        HapticFeedback.lightImpact();
      } else {
        throw Exception(response.message ?? 'Failed to update event');
      }
    } catch (e) {
      if (!mounted) return;

      // Show error message
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('calendar.failed_move_event'.tr(args: ['$e'])),
          backgroundColor: Colors.red,
          action: SnackBarAction(
            label: 'Retry',
            textColor: Colors.white,
            onPressed: () {
              _handleEventDropWeek(event, targetDate, targetHour);
            },
          ),
        ),
      );

      // Provide error haptic feedback
      HapticFeedback.heavyImpact();
    }
  }

  Widget _buildSidebar(List<CalendarEvent> dateEvents) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Today's Events
        if (dateEvents.isNotEmpty) ...[
          Container(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ...dateEvents.take(3).map((event) => _buildSidebarEvent(event)),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildSidebarEvent(CalendarEvent event) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(5),
        border: Border.all(color: event.color, width: 2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: event.color,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  event.title,
                  style: TextStyle(
                    color: textColor,
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            '${_formatTime(event.startTime)} - ${_formatTime(event.endTime)}',
            style: TextStyle(
              color: subtitleColor,
              fontSize: 12,
            ),
          ),
          if (event.attendees.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              '${event.attendees.length} attendees',
              style: TextStyle(
                color: subtitleColor,
                fontSize: 11,
              ),
            ),
          ],
        ],
      ),
    );
  }


  String _formatHour(int hour) {
    if (hour == 0) return '12 AM';
    if (hour < 12) return '$hour AM';
    if (hour == 12) return '12 PM';
    return '${hour - 12} PM';
  }
  

  void _showImportCalendar() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('calendar.import_calendar_coming_soon'.tr())),
    );
  }

  void _showTodaysSchedule() {
    final today = DateTime.now();
    final dateEvents = widget.events.where((event) {
      return event.startTime.year == today.year &&
             event.startTime.month == today.month &&
             event.startTime.day == today.day;
    }).toList()
      ..sort((a, b) => a.startTime.compareTo(b.startTime));

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(5)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        minChildSize: 0.3,
        maxChildSize: 0.9,
        expand: false,
        builder: (context, scrollController) => Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: surfaceColor,
            borderRadius: BorderRadius.vertical(top: Radius.circular(5)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    "Today's Schedule",
                    style: TextStyle(
                      color: textColor,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  IconButton(
                    icon: Icon(Icons.close, color: textColor),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                '${dateEvents.length} event${dateEvents.length != 1 ? 's' : ''} today',
                style: TextStyle(
                  color: subtitleColor,
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 16),
              Expanded(
                child: dateEvents.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.event_busy,
                              size: 64,
                              color: subtitleColor,
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'No events scheduled for today',
                              style: TextStyle(
                                color: subtitleColor,
                                fontSize: 16,
                              ),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        controller: scrollController,
                        itemCount: dateEvents.length,
                        itemBuilder: (context, index) {
                          return _buildScheduleEventCard(dateEvents[index]);
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showUpcomingEvents() {
    // Get upcoming events from today onwards
    final now = DateTime.now();
    final upcomingEvents = widget.events.where((event) {
      return event.startTime.isAfter(now) ||
             (event.startTime.isBefore(now) && event.endTime.isAfter(now));
    }).toList()
      ..sort((a, b) => a.startTime.compareTo(b.startTime));

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(5)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        minChildSize: 0.3,
        maxChildSize: 0.9,
        expand: false,
        builder: (context, scrollController) => Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: surfaceColor,
            borderRadius: BorderRadius.vertical(top: Radius.circular(5)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'calendar.upcoming_events'.tr(),
                    style: TextStyle(
                      color: textColor,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  IconButton(
                    icon: Icon(Icons.close, color: textColor),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                '${upcomingEvents.length} events',
                style: TextStyle(
                  color: subtitleColor,
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 16),
              Expanded(
                child: upcomingEvents.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.event_busy,
                              size: 64,
                              color: subtitleColor,
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'No upcoming events',
                              style: TextStyle(
                                color: subtitleColor,
                                fontSize: 16,
                              ),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        controller: scrollController,
                        itemCount: upcomingEvents.length,
                        itemBuilder: (context, index) {
                          final event = upcomingEvents[index];
                          return _buildUpcomingEventCard(event);
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildUpcomingEventCard(CalendarEvent event) {
    final isOngoing = event.startTime.isBefore(DateTime.now()) &&
                      event.endTime.isAfter(DateTime.now());
    final daysUntil = event.startTime.difference(DateTime.now()).inDays;

    String timeUntil;
    if (isOngoing) {
      timeUntil = 'calendar.ongoing'.tr();
    } else if (daysUntil == 0) {
      timeUntil = 'calendar.today'.tr();
    } else if (daysUntil == 1) {
      timeUntil = 'calendar.tomorrow'.tr();
    } else if (daysUntil < 7) {
      timeUntil = 'calendar.in_days'.tr(args: ['$daysUntil']);
    } else {
      final weeksUntil = (daysUntil / 7).floor();
      timeUntil = 'calendar.in_weeks'.tr(args: ['$weeksUntil']);
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 4,
                height: 40,
                decoration: BoxDecoration(
                  color: isOngoing ? Colors.green : context.primaryColor,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      event.title,
                      style: TextStyle(
                        color: textColor,
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _formatEventDateTime(event),
                      style: TextStyle(
                        color: subtitleColor,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: isOngoing
                      ? Colors.green.withOpacity(0.1)
                      : context.primaryColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  timeUntil,
                  style: TextStyle(
                    color: isOngoing ? Colors.green : context.primaryColor,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          if (event.description != null && event.description!.isNotEmpty) ...[
            const SizedBox(height: 12),
            Html(
              data: event.description!,
              style: {
                "body": Style(
                  margin: Margins.zero,
                  padding: HtmlPaddings.zero,
                  color: subtitleColor,
                  fontSize: FontSize(14),
                  maxLines: 2,
                  textOverflow: TextOverflow.ellipsis,
                ),
                "p": Style(
                  margin: Margins.zero,
                  padding: HtmlPaddings.zero,
                ),
              },
            ),
          ],
          if (event.location != null && event.location!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.location_on, size: 14, color: subtitleColor),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    event.location!,
                    style: TextStyle(
                      color: subtitleColor,
                      fontSize: 13,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  String _formatEventDateTime(CalendarEvent event) {
    final dateFormat = '${event.startTime.month}/${event.startTime.day}/${event.startTime.year}';
    if (event.allDay) {
      return '$dateFormat (All day)';
    }
    final startTime = _formatTime(event.startTime);
    final endTime = _formatTime(event.endTime);
    return '$dateFormat • $startTime - $endTime';
  }

  void _showMeetingRooms() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(5)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        minChildSize: 0.3,
        maxChildSize: 0.9,
        expand: false,
        builder: (context, scrollController) => Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: surfaceColor,
            borderRadius: BorderRadius.vertical(top: Radius.circular(5)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'calendar.meeting_rooms'.tr(),
                    style: TextStyle(
                      color: textColor,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  IconButton(
                    icon: Icon(Icons.close, color: textColor),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Expanded(
                child: _isLoadingRooms
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            CircularProgressIndicator(color: primaryColor),
                            const SizedBox(height: 16),
                            Text(
                              'Loading meeting rooms...',
                              style: TextStyle(color: subtitleColor),
                            ),
                          ],
                        ),
                      )
                    : _meetingRooms.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.meeting_room_outlined,
                                  size: 64,
                                  color: subtitleColor,
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  'No meeting rooms available',
                                  style: TextStyle(
                                    color: textColor,
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'Create meeting rooms in workspace settings',
                                  style: TextStyle(
                                    color: subtitleColor,
                                    fontSize: 14,
                                  ),
                                ),
                              ],
                            ),
                          )
                        : ListView(
                            controller: scrollController,
                            children: _meetingRooms.map((room) {
                              // Get real-time status from bookings
                              final roomStatus = _getRoomStatus(room.id);
                              final isAvailable = roomStatus['isAvailable'] as bool;
                              final statusText = roomStatus['status'] as String;
                              final capacityText = '${room.capacity} people capacity';

                              return _buildDetailedMeetingRoom(
                                room.name,
                                statusText,
                                isAvailable,
                                capacityText,
                              );
                            }).toList(),
                          ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showActionsMenu() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(5)),
      ),
      builder: (context) => Container(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.7,
        ),
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: surfaceColor,
          borderRadius: BorderRadius.vertical(top: Radius.circular(5)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'calendar.quick_actions'.tr(),
                  style: TextStyle(
                    color: textColor,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                IconButton(
                  icon: Icon(Icons.close, color: textColor),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Flexible(
              child: SingleChildScrollView(
                child: Column(
                  children: [
                    _buildActionMenuItem(Icons.auto_awesome, 'calendar.smart_event_menu'.tr(), 'calendar.ai_powered_creation'.tr()),
                    _buildActionMenuItem(Icons.add, 'calendar.new_event_menu'.tr(), 'calendar.create_calendar_event'.tr()),
                    // _buildActionMenuItem(Icons.video_call, 'Quick Meeting', 'Start an instant meeting'),
                    // _buildActionMenuItem(Icons.people, 'Invite People', 'Send calendar invitations'),
                    _buildActionMenuItem(Icons.analytics, 'calendar.view_analytics_menu'.tr(), 'calendar.calendar_insights'.tr()),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildScheduleEventCard(CalendarEvent event) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(5),
        border: Border.all(color: event.color, width: 2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(
                  color: event.color,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  event.title,
                  style: TextStyle(
                    color: textColor,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            '${_formatTime(event.startTime)} - ${_formatTime(event.endTime)}',
            style: TextStyle(
              color: subtitleColor,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 4),
          Html(
            data: event.description ?? '<p>No description</p>',
            style: {
              "body": Style(
                margin: Margins.zero,
                padding: HtmlPaddings.zero,
                color: subtitleColor,
                fontSize: FontSize(14),
                maxLines: 3,
                textOverflow: TextOverflow.ellipsis,
              ),
              "p": Style(
                margin: Margins.zero,
                padding: HtmlPaddings.zero,
              ),
            },
          ),
          if (event.attendees.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              '${event.attendees.length} attendees',
              style: TextStyle(
                color: Colors.grey[400],
                fontSize: 12,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildDetailedMeetingRoom(String name, String status, bool isAvailable, String capacity) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(5),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isAvailable ? Colors.green.withValues(alpha: 0.2) : Colors.red.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(5),
            ),
            child: Icon(
              Icons.meeting_room,
              color: isAvailable ? Colors.green : Colors.red,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: TextStyle(
                    color: textColor,
                    fontWeight: FontWeight.w600,
                    fontSize: 16,
                  ),
                ),
                Text(
                  status,
                  style: TextStyle(
                    color: subtitleColor,
                    fontSize: 14,
                  ),
                ),
                Text(
                  capacity,
                  style: TextStyle(
                    color: subtitleColor,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: isAvailable ? Colors.green : Colors.red,
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              isAvailable ? 'Free' : 'Busy',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionMenuItem(IconData icon, String title, String description) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: () {
          Navigator.pop(context);
          if (title == 'New Event') {
            _showCreateEventDialog();
          } else if (title == 'Smart Event') {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => const SmartEventCreatorScreen(),
              ),
            );
          } else if (title == 'Quick Meeting') {
            _showQuickMeetingDialog();
          } else if (title == 'View Analytics') {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => CalendarAnalyticsScreen(
                  events: widget.events,
                ),
              ),
            );
          } else if (title == 'Invite People') {
            _showInvitePeopleDialog();
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('$title feature coming soon')),
            );
          }
        },
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: cardColor,
            borderRadius: BorderRadius.circular(5),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primaryContainer,
                  borderRadius: BorderRadius.circular(5),
                ),
                child: Icon(icon, color: Theme.of(context).colorScheme.primary),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        color: textColor,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      description,
                      style: TextStyle(
                        color: subtitleColor,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right, color: subtitleColor),
            ],
          ),
        ),
      ),
    );
  }


  void _showCreateEventDialog() async {
    if (!mounted) return;

    try {
      await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => CreateEventScreen(
            onEventCreated: (newEvent) {
              if (mounted) {
                setState(() {
                  widget.events.add(newEvent);
                });
              }
            },
          ),
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error opening create event screen: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _OLD_showCreateEventDialog() {
    // Reset dialog state
    _selectedCategoryId = null;
    _selectedMeetingRoomId = null;
    _selectedPriority = 'normal';
    _isAllDayEvent = false;
    _isPrivateEvent = false;
    _startDate = _localSelectedDate;
    _endDate = _localSelectedDate;
    _startTime = const TimeOfDay(hour: 9, minute: 0);
    _endTime = const TimeOfDay(hour: 10, minute: 0);
    _titleController.clear();
    _descriptionController.clear();
    _locationController.clear();
    _tagController.clear();
    _tags.clear();
    
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => StatefulBuilder(
        builder: (context, dialogSetState) => Dialog(
          backgroundColor: Colors.transparent,
          child: Container(
            width: MediaQuery.of(context).size.width * 0.9,
            height: MediaQuery.of(context).size.height * 0.85,
            decoration: BoxDecoration(
              color: backgroundColor,
              borderRadius: BorderRadius.circular(8),
            ),
            child: DefaultTabController(
              length: 4,
              child: Column(
                children: [
                  // Header with title and close button
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      border: Border(
                        bottom: BorderSide(color: borderColor, width: 1),
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Create New Event',
                          style: TextStyle(
                            color: textColor,
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        IconButton(
                          icon: Icon(Icons.close, color: textColor),
                          onPressed: () => Navigator.pop(context),
                        ),
                      ],
                    ),
                  ),
                  
                  // Tab Bar
                  Container(
                    decoration: BoxDecoration(
                      border: Border(
                        bottom: BorderSide(color: borderColor, width: 1),
                      ),
                    ),
                    child: TabBar(
                      isScrollable: true,
                      tabAlignment: TabAlignment.start,
                      labelColor: textColor,
                      unselectedLabelColor: subtitleColor,
                      indicatorColor: context.primaryColor,
                      tabs: const [
                        Tab(text: 'Details'),
                        Tab(text: 'Attendees'),
                        Tab(text: 'Reminders'),
                        Tab(text: 'Recurrence'),
                      ],
                    ),
                  ),
                  
                  // Tab Content
                  Expanded(
                    child: TabBarView(
                      children: [
                        _buildDetailsTab(dialogSetState),
                        _buildAttendeesTab(),
                        _buildRemindersTab(),
                        _buildRecurrenceTab(),
                      ],
                    ),
                  ),
                  
                  // Bottom Actions
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      border: Border(
                        top: BorderSide(color: borderColor, width: 1),
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        TextButton(
                          onPressed: () => Navigator.pop(context),
                          style: TextButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                          ),
                          child: Text(
                            'Cancel',
                            style: TextStyle(color: subtitleColor),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Container(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [context.primaryColor, Color(0xFF8B6BFF)],
                            ),
                            borderRadius: BorderRadius.circular(5),
                          ),
                          child: ElevatedButton(
                            onPressed: () async {
                              if (_titleController.text.isEmpty) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text('calendar.please_enter_event_title'.tr())),
                                );
                                return;
                              }
                              
                              // Create the new event
                              final DateTime startDateTime = DateTime(
                                _startDate.year,
                                _startDate.month,
                                _startDate.day,
                                _isAllDayEvent ? 0 : _startTime.hour,
                                _isAllDayEvent ? 0 : _startTime.minute,
                              );
                              
                              final DateTime endDateTime = DateTime(
                                _endDate.year,
                                _endDate.month,
                                _endDate.day,
                                _isAllDayEvent ? 23 : _endTime.hour,
                                _isAllDayEvent ? 59 : _endTime.minute,
                              );
                              
                              // Get current workspace ID
                              final currentWorkspace = _workspaceService.currentWorkspace;
                              if (currentWorkspace == null) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text('calendar.no_workspace_selected'.tr())),
                                );
                                return;
                              }

                              final newEvent = CalendarEvent(
                                id: null, // Let the database generate the ID
                                workspaceId: currentWorkspace.id,
                                userId: await AppConfig.getCurrentUserId(),
                                title: _titleController.text,
                                description: _descriptionController.text.isEmpty
                                    ? null
                                    : _descriptionController.text,
                                startTime: startDateTime,
                                endTime: endDateTime,
                                categoryId: _selectedCategoryId,
                                roomId: _selectedMeetingRoomId,
                                priority: _parsePriority(_selectedPriority),
                                allDay: _isAllDayEvent,
                                visibility: _isPrivateEvent ? EventVisibility.private : EventVisibility.public,
                                status: EventStatus.confirmed,
                                attendees: _tags.map((tag) => {'name': tag}).toList(),
                              );
                              
                              // Save event to database and add to list
                              try {
                                final savedEvent = await _calendarService.createEvent(newEvent);
                                setState(() {
                                  widget.events.add(savedEvent);
                                });
                              } catch (e) {
                                // Still add to local list for immediate UI update
                                setState(() {
                                  widget.events.add(newEvent);
                                });
                              }
                              
                              if (mounted) {
                                Navigator.pop(context);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text('Event "${_titleController.text}" created successfully')),
                                );
                              }
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.transparent,
                              shadowColor: Colors.transparent,
                              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                            ),
                            child: const Text(
                              'Create Event',
                              style: TextStyle(color: Colors.white),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  String _getDayName(int weekday) {
    final days = [
      'calendar.day_monday'.tr(),
      'calendar.day_tuesday'.tr(),
      'calendar.day_wednesday'.tr(),
      'calendar.day_thursday'.tr(),
      'calendar.day_friday'.tr(),
      'calendar.day_saturday'.tr(),
      'calendar.day_sunday'.tr()
    ];
    return days[weekday - 1];
  }

  String _getMonthName(int month) {
    final months = [
      'calendar.month_january'.tr(),
      'calendar.month_february'.tr(),
      'calendar.month_march'.tr(),
      'calendar.month_april'.tr(),
      'calendar.month_may'.tr(),
      'calendar.month_june'.tr(),
      'calendar.month_july'.tr(),
      'calendar.month_august'.tr(),
      'calendar.month_september'.tr(),
      'calendar.month_october'.tr(),
      'calendar.month_november'.tr(),
      'calendar.month_december'.tr()
    ];
    return months[month - 1];
  }

  bool _hasActiveFilters() {
    // Check if any filters are different from default
    bool hasModifiedCategories = _selectedCategories.isNotEmpty;

    bool hasModifiedPriorities = !(_selectedPriorities.length == 4 &&
        _selectedPriorities.contains('low') &&
        _selectedPriorities.contains('medium') &&
        _selectedPriorities.contains('high') &&
        _selectedPriorities.contains('urgent'));
    
    bool hasModifiedStatuses = !(_selectedStatuses.length == 4 &&
        _selectedStatuses.contains('Confirmed') &&
        _selectedStatuses.contains('Tentative') &&
        _selectedStatuses.contains('Cancelled') &&
        _selectedStatuses.contains('Pending'));
    
    return hasModifiedCategories || 
           hasModifiedPriorities || 
           hasModifiedStatuses ||
           !_showAllDayEvents ||
           !_showRecurringEvents ||
           _filterStartDate != null ||
           _filterEndDate != null;
  }

  bool _isToday([DateTime? day]) {
    final now = DateTime.now();
    final targetDate = day ?? _localSelectedDate;
    return targetDate.year == now.year &&
           targetDate.month == now.month &&
           targetDate.day == now.day;
  }

  String _getDateTitle() {
    if (_isToday()) {
      return 'Today';
    }
    
    final now = DateTime.now();
    final yesterday = now.subtract(const Duration(days: 1));
    final tomorrow = now.add(const Duration(days: 1));
    
    if (_localSelectedDate.year == yesterday.year &&
        _localSelectedDate.month == yesterday.month &&
        _localSelectedDate.day == yesterday.day) {
      return 'Yesterday';
    }
    
    if (_localSelectedDate.year == tomorrow.year &&
        _localSelectedDate.month == tomorrow.month &&
        _localSelectedDate.day == tomorrow.day) {
      return 'Tomorrow';
    }
    
    return _getDayName(_localSelectedDate.weekday);
  }

  String _getDateBadge() {
    if (_isToday()) {
      return 'Today';
    }
    
    final now = DateTime.now();
    final yesterday = now.subtract(const Duration(days: 1));
    final tomorrow = now.add(const Duration(days: 1));
    
    if (_localSelectedDate.year == yesterday.year &&
        _localSelectedDate.month == yesterday.month &&
        _localSelectedDate.day == yesterday.day) {
      return 'Yesterday';
    }
    
    if (_localSelectedDate.year == tomorrow.year &&
        _localSelectedDate.month == tomorrow.month &&
        _localSelectedDate.day == tomorrow.day) {
      return 'Tomorrow';
    }
    
    return '${_localSelectedDate.month}/${_localSelectedDate.day}';
  }

  String _getViewLabel(String view) {
    switch (view) {
      case 'Day':
        return 'calendar.view_day'.tr();
      case 'Week':
        return 'calendar.view_week'.tr();
      case 'Month':
        return 'calendar.view_month'.tr();
      case 'Year':
        return 'calendar.view_year'.tr();
      case 'Agenda':
        return 'calendar.view_agenda'.tr();
      case 'Timeline':
        return 'calendar.view_timeline'.tr();
      default:
        return view;
    }
  }

  String _formatTime(DateTime time) {
    int hour = time.hour;
    final minute = time.minute.toString().padLeft(2, '0');
    final period = hour >= 12 ? 'PM' : 'AM';
    
    // Debug: Print original time for troubleshooting
    if (hour == 9 || hour == 14 || hour == 12) { // Team Standup, Project Review, Lunch times
    }
    
    // Convert to 12-hour format
    if (hour == 0) {
      hour = 12;
    } else if (hour > 12) {
      hour = hour - 12;
    }
    
    return '$hour:$minute $period';
  }

  String _formatDuration(DateTime start, DateTime end) {
    final duration = end.difference(start);
    final hours = duration.inHours;
    final minutes = duration.inMinutes % 60;

    if (hours > 0 && minutes > 0) {
      return '${hours}h ${minutes}m';
    } else if (hours > 0) {
      return '${hours}h';
    } else {
      return '${minutes}m';
    }
  }

  Color _getCategoryColor(CalendarEvent event) {
    if (event.categoryId != null && _categories.isNotEmpty) {
      try {
        final category = _categories.firstWhere(
          (c) => c.id == event.categoryId,
          orElse: () {
            // Try to find default category
            try {
              return _categories.firstWhere((c) => c.isDefault);
            } catch (e) {
              // Return first category if no default
              return _categories.first;
            }
          },
        );

        return Color(int.parse(category.color.replaceFirst('#', '0xFF')));
      } catch (e) {
      }
    }

    // Fallback to priority-based color
    return event.color;
  }

  void _handleEventDropInDay(CalendarEvent event, int newHour) async {
    // Calculate the duration of the event
    final duration = event.endTime.difference(event.startTime);

    // Create new start time with the new hour but same date
    final newStartTime = DateTime(
      _localSelectedDate.year,
      _localSelectedDate.month,
      _localSelectedDate.day,
      newHour,
      event.startTime.minute,
    );

    // Calculate new end time maintaining the duration
    final newEndTime = newStartTime.add(duration);

    // Update the event in UI immediately (optimistic update)
    setState(() {
      final eventIndex = widget.events.indexWhere((e) => e.id == event.id);
      if (eventIndex != -1) {
        widget.events[eventIndex] = event.copyWith(
          startTime: newStartTime,
          endTime: newEndTime,
        );
      }
    });

    // Show loading message
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
              ),
            ),
            const SizedBox(width: 12),
            Text('Updating event to ${_formatTime(newStartTime)}...'),
          ],
        ),
        duration: const Duration(seconds: 30),
        behavior: SnackBarBehavior.floating,
      ),
    );

    // Call API to update event
    try {
      final workspaceId = event.workspaceId;
      final eventId = event.id;

      if (workspaceId == null || eventId == null) {
        throw Exception('Missing workspace ID or event ID');
      }

      final updateDto = api.UpdateEventDto(
        startTime: newStartTime,
        endTime: newEndTime,
      );

      final response = await _calendarApi.updateEvent(
        workspaceId,
        eventId,
        updateDto,
      );

      // Hide loading message
      ScaffoldMessenger.of(context).hideCurrentSnackBar();

      if (response.isSuccess && response.data != null) {
        // Update event with the confirmed times from API response
        final apiEvent = response.data!;

        setState(() {
          final eventIndex = widget.events.indexWhere((e) => e.id == event.id);
          if (eventIndex != -1) {
            // Use copyWith to update only the times, keeping all other data
            widget.events[eventIndex] = widget.events[eventIndex].copyWith(
              startTime: apiEvent.startTime,
              endTime: apiEvent.endTime,
              updatedAt: apiEvent.updatedAt,
            );
          }
        });

        // Show success message
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                Icon(Icons.check_circle, color: Colors.white, size: 20),
                const SizedBox(width: 12),
                Text('Event moved to ${_formatTime(newStartTime)}'),
              ],
            ),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 2),
            behavior: SnackBarBehavior.floating,
          ),
        );
      } else {
        throw Exception(response.message ?? 'Failed to update event');
      }
    } catch (e) {
      // Hide loading message
      ScaffoldMessenger.of(context).hideCurrentSnackBar();

      // Revert the change in UI
      setState(() {
        final eventIndex = widget.events.indexWhere((e) => e.id == event.id);
        if (eventIndex != -1) {
          widget.events[eventIndex] = event; // Restore original event
        }
      });

      // Show error message
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              Icon(Icons.error_outline, color: Colors.white, size: 20),
              const SizedBox(width: 12),
              Expanded(
                child: Text('Failed to update event: ${e.toString()}'),
              ),
            ],
          ),
          backgroundColor: Colors.red,
          duration: const Duration(seconds: 4),
          behavior: SnackBarBehavior.floating,
          action: SnackBarAction(
            label: 'Retry',
            textColor: Colors.white,
            onPressed: () {
              _handleEventDropInDay(event, newHour);
            },
          ),
        ),
      );
    }
  }

  DateTime _getDayForIndex(int index) {
    final firstDayOfMonth = DateTime(_localSelectedDate.year, _localSelectedDate.month, 1);
    final firstDayWeekday = firstDayOfMonth.weekday;
    final startDate = firstDayOfMonth.subtract(Duration(days: firstDayWeekday - 1));
    return startDate.add(Duration(days: index));
  }

  List<CalendarEvent> _getEventsForDay(DateTime day) {
    return widget.events.where((event) {
      return event.startTime.year == day.year &&
             event.startTime.month == day.month &&
             event.startTime.day == day.day;
    }).toList();
  }

  Widget _buildDetailsTab(StateSetter dialogSetState) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Title',
            style: TextStyle(color: textColor, fontSize: 16, fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _titleController,
            style: TextStyle(color: textColor),
            decoration: InputDecoration(
              hintText: 'calendar.event_title_hint'.tr(),
              hintStyle: TextStyle(color: subtitleColor),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(color: borderColor),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(color: borderColor),
              ),
              contentPadding: const EdgeInsets.all(12),
            ),
          ),
          
          const SizedBox(height: 20),
          Row(
            children: [
              Text(
                'Description',
                style: TextStyle(color: textColor, fontSize: 16, fontWeight: FontWeight.w500),
              ),
              const SizedBox(width: 8),
              InkWell(
                onTap: () => _generateEventDescriptions(),
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: AppTheme.infoLight.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.auto_awesome,
                    size: 18,
                    color: AppTheme.infoLight,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _descriptionController,
            style: TextStyle(color: textColor),
            maxLines: 4,
            decoration: InputDecoration(
              hintText: 'calendar.event_description_hint'.tr(),
              hintStyle: TextStyle(color: subtitleColor),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(color: borderColor),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(color: borderColor),
              ),
              contentPadding: const EdgeInsets.all(12),
            ),
          ),
          
          const SizedBox(height: 20),
          Text(
            'Category',
            style: TextStyle(color: textColor, fontSize: 16, fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 8),
          _isLoadingCategories
              ? Container(
                  height: 48,
                  decoration: BoxDecoration(
                    border: Border.all(color: borderColor),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Center(
                    child: SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  ),
                )
              : DropdownButtonFormField<String>(
                  value: _selectedCategoryId,
                  isExpanded: true,
                  hint: Text('calendar.select_category'.tr(), style: TextStyle(color: subtitleColor)),
                  decoration: InputDecoration(
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide(color: borderColor),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide(color: borderColor),
                    ),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  ),
                  dropdownColor: surfaceColor,
                  items: _categories
                      .map((category) => DropdownMenuItem(
                            value: category.id,
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  category.icon ?? '📁',
                                  style: const TextStyle(fontSize: 16),
                                ),
                                const SizedBox(width: 8),
                                Flexible(
                                  child: Text(
                                    category.name,
                                    style: TextStyle(color: textColor),
                                    overflow: TextOverflow.ellipsis,
                                    maxLines: 1,
                                  ),
                                ),
                              ],
                            ),
                          ))
                      .toList(),
                  onChanged: (value) {
                    if (value != null) {
                      dialogSetState(() {
                        _selectedCategoryId = value;
                      });
                    }
                  },
                ),

          const SizedBox(height: 20),
          Text(
            'Priority',
            style: TextStyle(color: textColor, fontSize: 16, fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            value: _selectedPriority,
            isExpanded: true,
            decoration: InputDecoration(
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(color: borderColor),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(color: borderColor),
              ),
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            ),
            dropdownColor: surfaceColor,
            items: [
              DropdownMenuItem(
                value: 'low',
                child: Text('calendar.priority_low'.tr(), style: TextStyle(color: textColor)),
              ),
              DropdownMenuItem(
                value: 'normal',
                child: Text('calendar.priority_normal'.tr(), style: TextStyle(color: textColor)),
              ),
              DropdownMenuItem(
                value: 'high',
                child: Text('calendar.priority_high'.tr(), style: TextStyle(color: textColor)),
              ),
              DropdownMenuItem(
                value: 'urgent',
                child: Text('common.urgent'.tr(), style: TextStyle(color: textColor)),
              ),
            ],
            onChanged: (value) {
              if (value != null) {
                dialogSetState(() {
                  _selectedPriority = value;
                });
              }
            },
          ),

          const SizedBox(height: 20),
          Text(
            'Meeting Room (Optional)',
            style: TextStyle(color: textColor, fontSize: 16, fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 8),
          _isLoadingRooms
              ? Container(
                  height: 48,
                  decoration: BoxDecoration(
                    border: Border.all(color: borderColor),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Center(
                    child: SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  ),
                )
              : DropdownButtonFormField<String>(
                  value: _selectedMeetingRoomId,
                  isExpanded: true,
                  hint: Text('calendar.select_meeting_room'.tr(), style: TextStyle(color: subtitleColor)),
                  decoration: InputDecoration(
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide(color: borderColor),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide(color: borderColor),
                    ),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  ),
                  dropdownColor: surfaceColor,
                  items: _meetingRooms
                      .where((room) {
                        // Only show available rooms
                        final roomStatus = _getRoomStatus(room.id);
                        return roomStatus['isAvailable'] as bool;
                      })
                      .map((room) {
                        final roomStatus = _getRoomStatus(room.id);
                        final statusText = roomStatus['status'] as String;
                        return DropdownMenuItem(
                          value: room.id,
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.meeting_room, size: 16, color: Colors.green),
                              const SizedBox(width: 8),
                              Flexible(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      '${room.name} (${room.capacity} people)',
                                      style: TextStyle(color: textColor, fontWeight: FontWeight.w500),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    Text(
                                      statusText,
                                      style: TextStyle(color: Colors.green, fontSize: 12),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        );
                      })
                      .toList(),
                  onChanged: (value) {
                    dialogSetState(() {
                      _selectedMeetingRoomId = value;
                    });
                  },
                ),

          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: cardColor,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: borderColor),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'All Day Event',
                        style: TextStyle(color: textColor, fontSize: 16, fontWeight: FontWeight.w500),
                      ),
                      Text(
                        'This event lasts the entire day',
                        style: TextStyle(color: subtitleColor, fontSize: 14),
                      ),
                    ],
                  ),
                ),
                Switch(
                  value: _isAllDayEvent,
                  onChanged: (value) {
                    dialogSetState(() {
                      _isAllDayEvent = value;
                    });
                  },
                  activeColor: context.primaryColor,
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Start Date',
                      style: TextStyle(color: textColor, fontSize: 16, fontWeight: FontWeight.w500),
                    ),
                    const SizedBox(height: 8),
                    InkWell(
                      onTap: () async {
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: _startDate,
                          firstDate: DateTime(2020),
                          lastDate: DateTime(2030),
                        );
                        if (picked != null) {
                          dialogSetState(() {
                            _startDate = picked;
                          });
                        }
                      },
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        decoration: BoxDecoration(
                          border: Border.all(color: borderColor),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          '${_startDate.month.toString().padLeft(2, '0')}/${_startDate.day.toString().padLeft(2, '0')}/${_startDate.year}',
                          style: TextStyle(color: textColor),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'End Date',
                      style: TextStyle(color: textColor, fontSize: 16, fontWeight: FontWeight.w500),
                    ),
                    const SizedBox(height: 8),
                    InkWell(
                      onTap: () async {
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: _endDate,
                          firstDate: DateTime(2020),
                          lastDate: DateTime(2030),
                        );
                        if (picked != null) {
                          dialogSetState(() {
                            _endDate = picked;
                          });
                        }
                      },
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        decoration: BoxDecoration(
                          border: Border.all(color: borderColor),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          '${_endDate.month.toString().padLeft(2, '0')}/${_endDate.day.toString().padLeft(2, '0')}/${_endDate.year}',
                          style: TextStyle(color: textColor),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Start Time',
                      style: TextStyle(color: textColor, fontSize: 16, fontWeight: FontWeight.w500),
                    ),
                    const SizedBox(height: 8),
                    InkWell(
                      onTap: _isAllDayEvent ? null : () async {
                        final picked = await showTimePicker(
                          context: context,
                          initialTime: _startTime,
                        );
                        if (picked != null) {
                          dialogSetState(() {
                            _startTime = picked;
                          });
                        }
                      },
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        decoration: BoxDecoration(
                          border: Border.all(color: borderColor),
                          borderRadius: BorderRadius.circular(8),
                          color: _isAllDayEvent ? cardColor : null,
                        ),
                        child: Text(
                          _isAllDayEvent ? 'All Day' : _startTime.format(context),
                          style: TextStyle(
                            color: _isAllDayEvent ? subtitleColor : textColor,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'End Time',
                      style: TextStyle(color: textColor, fontSize: 16, fontWeight: FontWeight.w500),
                    ),
                    const SizedBox(height: 8),
                    InkWell(
                      onTap: _isAllDayEvent ? null : () async {
                        final picked = await showTimePicker(
                          context: context,
                          initialTime: _endTime,
                        );
                        if (picked != null) {
                          dialogSetState(() {
                            _endTime = picked;
                          });
                        }
                      },
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        decoration: BoxDecoration(
                          border: Border.all(color: borderColor),
                          borderRadius: BorderRadius.circular(8),
                          color: _isAllDayEvent ? cardColor : null,
                        ),
                        child: Text(
                          _isAllDayEvent ? 'All Day' : _endTime.format(context),
                          style: TextStyle(
                            color: _isAllDayEvent ? subtitleColor : textColor,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 20),
          Text(
            'Location',
            style: TextStyle(color: textColor, fontSize: 16, fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _locationController,
            style: TextStyle(color: textColor),
            decoration: InputDecoration(
              hintText: 'calendar.event_location'.tr(),
              hintStyle: TextStyle(color: subtitleColor),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(color: borderColor),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(color: borderColor),
              ),
              contentPadding: const EdgeInsets.all(12),
            ),
          ),
          
          const SizedBox(height: 20),
          Text(
            'Tags',
            style: TextStyle(color: textColor, fontSize: 16, fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: TextField(
                  style: TextStyle(color: textColor),
                  decoration: InputDecoration(
                    hintText: 'calendar.add_tag'.tr(),
                    hintStyle: TextStyle(color: subtitleColor),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide(color: borderColor),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide(color: borderColor),
                    ),
                    contentPadding: const EdgeInsets.all(12),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                decoration: BoxDecoration(
                  color: context.primaryColor,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: TextButton(
                  onPressed: () {},
                  child: const Text(
                    'Add',
                    style: TextStyle(color: Colors.white),
                  ),
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: cardColor,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: borderColor),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Private Event',
                        style: TextStyle(color: textColor, fontSize: 16, fontWeight: FontWeight.w500),
                      ),
                      Text(
                        'Hide event details from others',
                        style: TextStyle(color: subtitleColor, fontSize: 14),
                      ),
                    ],
                  ),
                ),
                Switch(
                  value: _isPrivateEvent,
                  onChanged: (value) {
                    dialogSetState(() {
                      _isPrivateEvent = value;
                    });
                  },
                  activeColor: context.primaryColor,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAttendeesTab() {
    return Container(
      alignment: Alignment.center,
      child: Text(
        'Attendees tab content coming soon',
        style: TextStyle(color: textColor),
      ),
    );
  }

  Widget _buildRemindersTab() {
    return Container(
      alignment: Alignment.center,
      child: Text(
        'Reminders tab content coming soon',
        style: TextStyle(color: textColor),
      ),
    );
  }

  Widget _buildRecurrenceTab() {
    return Container(
      alignment: Alignment.center,
      child: Text(
        'Recurrence tab content coming soon',
        style: TextStyle(color: textColor),
      ),
    );
  }

  void _showSmartEventDialog() {
    bool isVoiceMode = true;
    bool isRecording = false;
    final TextEditingController promptController = TextEditingController();
    
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => Dialog(
          backgroundColor: backgroundColor,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(5),
          ),
          child: Container(
            width: MediaQuery.of(context).size.width * 0.9,
            constraints: BoxConstraints(
              maxWidth: 600,
              maxHeight: MediaQuery.of(context).size.height * 0.8,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Header
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: surfaceColor,
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(5),
                      topRight: Radius.circular(5),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.auto_awesome,
                        color: primaryColor,
                        size: 24,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Smart Event Creation',
                          style: TextStyle(
                            color: textColor,
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton(
                        icon: Icon(Icons.close, color: textColor),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                ),
                
                // Mode Selection
                Container(
                  padding: const EdgeInsets.all(20),
                  child: Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => isVoiceMode = true),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            decoration: BoxDecoration(
                              color: isVoiceMode ? primaryColor : Colors.transparent,
                              border: Border.all(
                                color: isVoiceMode ? primaryColor : borderColor,
                              ),
                              borderRadius: BorderRadius.circular(5),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.mic,
                                  color: isVoiceMode ? Colors.white : textColor,
                                  size: 20,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  'Voice Input',
                                  style: TextStyle(
                                    color: isVoiceMode ? Colors.white : textColor,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => isVoiceMode = false),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            decoration: BoxDecoration(
                              color: !isVoiceMode ? primaryColor : Colors.transparent,
                              border: Border.all(
                                color: !isVoiceMode ? primaryColor : borderColor,
                              ),
                              borderRadius: BorderRadius.circular(5),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.text_fields,
                                  color: !isVoiceMode ? Colors.white : textColor,
                                  size: 20,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  'Text Prompt',
                                  style: TextStyle(
                                    color: !isVoiceMode ? Colors.white : textColor,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                
                // Content Area
                Flexible(
                  child: SingleChildScrollView(
                    child: Container(
                      padding: const EdgeInsets.all(20),
                      child: isVoiceMode 
                        ? _buildVoiceInputContent(isRecording, setState)
                        : _buildTextPromptContent(promptController),
                    ),
                  ),
                ),
                
                // Footer
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    border: Border(
                      top: BorderSide(color: borderColor),
                    ),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () {
                            if (isVoiceMode) {
                              // Handle voice input submission
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('calendar.voice_recognition_coming_soon'.tr()),
                                  backgroundColor: Colors.orange,
                                ),
                              );
                            } else {
                              // For text mode, just close since Parse button handles the parsing
                              Navigator.pop(context);
                            }
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: primaryColor,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(5),
                            ),
                          ),
                          child: const Text(
                            'Create Event',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      TextButton(
                        onPressed: () => Navigator.pop(context),
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                        ),
                        child: Text(
                          'Cancel',
                          style: TextStyle(
                            color: textColor,
                            fontSize: 16,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
  
  Widget _buildVoiceInputContent(bool isRecording, StateSetter setState) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const SizedBox(height: 20),
        GestureDetector(
          onTap: () {
            setState(() {
              // Toggle recording state
              // In a real app, this would start/stop voice recording
            });
          },
          child: Container(
            width: 120,
            height: 120,
            decoration: BoxDecoration(
              color: primaryColor.withValues(alpha: 0.1),
              shape: BoxShape.circle,
              border: Border.all(
                color: primaryColor,
                width: 3,
              ),
            ),
            child: Center(
              child: Icon(
                Icons.mic,
                size: 48,
                color: primaryColor,
              ),
            ),
          ),
        ),
        const SizedBox(height: 24),
        Text(
          'Click to start voice input',
          style: TextStyle(
            color: textColor.withValues(alpha: 0.7),
            fontSize: 16,
          ),
        ),
        const SizedBox(height: 40),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: surfaceColor,
            borderRadius: BorderRadius.circular(5),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Try saying:',
                style: TextStyle(
                  color: textColor.withValues(alpha: 0.5),
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 12),
              ...[
                '"Create a meeting with John at 7 PM on July 5th"',
                '"Schedule a project review at 2 PM tomorrow"',
                '"Book a call with the marketing team on Monday at 10 AM"',
                '"Plan a team lunch on Friday at 12:30 PM"',
              ].map((example) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(
                  example,
                  style: TextStyle(
                    color: textColor.withValues(alpha: 0.7),
                    fontSize: 14,
                  ),
                ),
              )),
            ],
          ),
        ),
      ],
    );
  }
  
  Widget _buildTextPromptContent(TextEditingController controller) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Event Description',
          style: TextStyle(
            color: textColor,
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: controller,
          maxLines: 6,
          style: TextStyle(color: textColor),
          decoration: InputDecoration(
            hintText: 'calendar.describe_event_hint'.tr(),
            hintStyle: TextStyle(
              color: textColor.withValues(alpha: 0.5),
            ),
            filled: true,
            fillColor: surfaceColor,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(5),
              borderSide: BorderSide(color: borderColor),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(5),
              borderSide: BorderSide(color: borderColor),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(5),
              borderSide: BorderSide(color: primaryColor),
            ),
            contentPadding: const EdgeInsets.all(16),
          ),
        ),
        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: () {
              if (controller.text.trim().isNotEmpty) {
                // Parse the text prompt and create event
                _parseAndCreateEvent(controller.text.trim());
                Navigator.pop(context);
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: primaryColor,
              padding: const EdgeInsets.symmetric(vertical: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(5),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.auto_awesome,
                  color: Colors.white,
                  size: 20,
                ),
                const SizedBox(width: 8),
                const Text(
                  'Parse Event Details',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 20),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: surfaceColor,
            borderRadius: BorderRadius.circular(5),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Example prompts:',
                style: TextStyle(
                  color: textColor.withValues(alpha: 0.7),
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 12),
              ...[
                '"Create a meeting with John at 7 PM on July 5th"',
                '"Schedule a project review at 2 PM tomorrow in Conference Room A"',
                '"Book a call with the marketing team on Monday at 10 AM"',
                '"Plan a team lunch on Friday at 12:30 PM at the restaurant"',
                '"Set up a standup meeting on July 10th at 9 AM"',
              ].map((example) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Text(
                  example,
                  style: TextStyle(
                    color: textColor.withValues(alpha: 0.6),
                    fontSize: 14,
                  ),
                ),
              )),
            ],
          ),
        ),
      ],
    );
  }
  
  void _parseAndCreateEvent(String prompt) {
    // Simple parsing logic - in a real app, this would use NLP/AI
    String title = 'New Event';
    DateTime eventDate = DateTime.now();
    TimeOfDay eventTime = TimeOfDay.now();
    
    // Extract basic information from the prompt
    final lowerPrompt = prompt.toLowerCase();
    
    // Try to extract title and participants
    if (lowerPrompt.contains('meeting')) {
      title = 'Meeting';
      // Extract person names (simple pattern matching)
      final withRegex = RegExp(r'with\s+(\w+)', caseSensitive: false);
      final withMatch = withRegex.firstMatch(prompt);
      if (withMatch != null) {
        title = 'Meeting with ${withMatch.group(1)}';
      }
    } else if (lowerPrompt.contains('call')) {
      title = 'Call';
      final withRegex = RegExp(r'with\s+(\w+)', caseSensitive: false);
      final withMatch = withRegex.firstMatch(prompt);
      if (withMatch != null) {
        title = 'Call with ${withMatch.group(1)}';
      }
    } else if (lowerPrompt.contains('review')) {
      title = 'Review';
      if (lowerPrompt.contains('project')) {
        title = 'Project Review';
      } else if (lowerPrompt.contains('code')) {
        title = 'Code Review';
      }
    } else if (lowerPrompt.contains('lunch')) {
      title = 'Lunch';
      if (lowerPrompt.contains('team')) {
        title = 'Team Lunch';
      }
    } else if (lowerPrompt.contains('presentation')) {
      title = 'Presentation';
    } else if (lowerPrompt.contains('interview')) {
      title = 'Interview';
    }
    
    // Extract time
    final timeRegex = RegExp(r'(\d{1,2})\s*(:\s*\d{2})?\s*(am|pm)', caseSensitive: false);
    final timeMatch = timeRegex.firstMatch(lowerPrompt);
    if (timeMatch != null) {
      int hour = int.parse(timeMatch.group(1)!);
      final isPM = timeMatch.group(3)?.toLowerCase() == 'pm';
      if (isPM && hour != 12) hour += 12;
      if (!isPM && hour == 12) hour = 0;
      eventTime = TimeOfDay(hour: hour, minute: 0);
    }
    
    // Extract date
    if (lowerPrompt.contains('tomorrow')) {
      eventDate = DateTime.now().add(const Duration(days: 1));
    } else if (lowerPrompt.contains('monday')) {
      eventDate = _getNextWeekday(DateTime.monday);
    } else if (lowerPrompt.contains('tuesday')) {
      eventDate = _getNextWeekday(DateTime.tuesday);
    } else if (lowerPrompt.contains('wednesday')) {
      eventDate = _getNextWeekday(DateTime.wednesday);
    } else if (lowerPrompt.contains('thursday')) {
      eventDate = _getNextWeekday(DateTime.thursday);
    } else if (lowerPrompt.contains('friday')) {
      eventDate = _getNextWeekday(DateTime.friday);
    }
    
    // Extract duration if mentioned
    int durationHours = 1; // default duration
    if (lowerPrompt.contains('hour')) {
      final hourRegex = RegExp(r'(\d+)\s*hour', caseSensitive: false);
      final hourMatch = hourRegex.firstMatch(lowerPrompt);
      if (hourMatch != null) {
        durationHours = int.tryParse(hourMatch.group(1)!) ?? 1;
      }
    } else if (lowerPrompt.contains('30 min') || lowerPrompt.contains('half hour')) {
      durationHours = 0;
      _endTime = TimeOfDay(hour: eventTime.hour, minute: (eventTime.minute + 30) % 60);
      if (eventTime.minute + 30 >= 60) {
        _endTime = TimeOfDay(hour: (eventTime.hour + 1) % 24, minute: _endTime.minute);
      }
    }
    
    // Update controllers and show create event dialog
    _titleController.text = title;
    _descriptionController.text = 'Created from: "$prompt"';
    _startDate = eventDate;
    _startTime = eventTime;
    if (durationHours > 0) {
      _endTime = TimeOfDay(hour: (eventTime.hour + durationHours) % 24, minute: eventTime.minute);
    }
    
    _showCreateEventDialog();
  }
  
  DateTime _getNextWeekday(int weekday) {
    DateTime date = DateTime.now();
    while (date.weekday != weekday) {
      date = date.add(const Duration(days: 1));
    }
    return date;
  }

  EventPriority _parsePriority(String priority) {
    switch (priority.toLowerCase()) {
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

  void _showFilterDialog() {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: backgroundColor,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        child: Container(
          width: 400,
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.8,
          ),
          child: StatefulBuilder(
            builder: (context, filterSetState) {
              return Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Header
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      border: Border(
                        bottom: BorderSide(color: borderColor),
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'calendar.filter_events'.tr(),
                          style: TextStyle(
                            color: textColor,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        IconButton(
                          icon: Icon(Icons.close, color: textColor),
                          onPressed: () => Navigator.pop(context),
                        ),
                      ],
                    ),
                  ),
                  // Content
                  Flexible(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Categories Section
                          _buildCheckboxFilterSection(
                            'calendar.categories'.tr(),
                            _categories.map((category) => _buildCategoryCheckbox(
                              category.name,
                              category.id,
                              category.color,
                              _selectedCategories,
                              filterSetState,
                            )).toList(),
                          ),
                          const SizedBox(height: 24),

                          // Priorities Section
                          _buildCheckboxFilterSection(
                            'calendar.priorities'.tr(),
                            [
                              _buildCheckbox('calendar.priority_low'.tr(), 'low', _selectedPriorities, filterSetState),
                              _buildCheckbox('calendar.priority_normal'.tr(), 'medium', _selectedPriorities, filterSetState),
                              _buildCheckbox('calendar.priority_high'.tr(), 'high', _selectedPriorities, filterSetState),
                              _buildCheckbox('calendar.priority_urgent'.tr(), 'urgent', _selectedPriorities, filterSetState),
                            ],
                          ),
                          const SizedBox(height: 24),

                          // Status Section
                          _buildCheckboxFilterSection(
                            'calendar.status'.tr(),
                            [
                              _buildCheckbox('calendar.status_confirmed'.tr(), 'Confirmed', _selectedStatuses, filterSetState),
                              _buildCheckbox('calendar.status_tentative'.tr(), 'Tentative', _selectedStatuses, filterSetState),
                              _buildCheckbox('calendar.status_cancelled'.tr(), 'Cancelled', _selectedStatuses, filterSetState),
                              _buildCheckbox('calendar.status_pending'.tr(), 'Pending', _selectedStatuses, filterSetState),
                            ],
                          ),
                          const SizedBox(height: 24),

                          // Tags Section
                          Text(
                            'calendar.tags'.tr(),
                            style: TextStyle(
                              color: textColor,
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 12),
                          TextField(
                            style: TextStyle(color: textColor),
                            decoration: InputDecoration(
                              hintText: 'calendar.add_tag_filter'.tr(),
                              hintStyle: TextStyle(color: subtitleColor),
                              filled: true,
                              fillColor: surfaceColor,
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide: BorderSide(color: borderColor),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide: BorderSide(color: borderColor),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide: BorderSide(color: primaryColor),
                              ),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                            ),
                          ),
                          const SizedBox(height: 24),

                          // Display Options
                          Text(
                            'calendar.display_options'.tr(),
                            style: TextStyle(
                              color: textColor,
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 12),
                          _buildToggleOption('Show declined events', _showDeclinedEvents, (value) {
                            filterSetState(() {
                              _showDeclinedEvents = value;
                            });
                          }),
                          const SizedBox(height: 8),
                          _buildToggleOption('Show cancelled events', _showCancelledEvents, (value) {
                            filterSetState(() {
                              _showCancelledEvents = value;
                            });
                          }),
                          const SizedBox(height: 8),
                          _buildToggleOption('Show private events', _showPrivateEvents, (value) {
                            filterSetState(() {
                              _showPrivateEvents = value;
                            });
                          }),
                          const SizedBox(height: 24),

                          // Date Range
                          Text(
                            'calendar.date_range'.tr(),
                            style: TextStyle(
                              color: textColor,
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'calendar.from_date'.tr(),
                                      style: TextStyle(
                                        color: textColor,
                                        fontSize: 14,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    _buildDateField('', _filterStartDate, (date) {
                                      filterSetState(() {
                                        _filterStartDate = date;
                                      });
                                    }),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'calendar.to_date'.tr(),
                                      style: TextStyle(
                                        color: textColor,
                                        fontSize: 14,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    _buildDateField('', _filterEndDate, (date) {
                                      filterSetState(() {
                                        _filterEndDate = date;
                                      });
                                    }),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  // Footer
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      border: Border(
                        top: BorderSide(color: borderColor),
                      ),
                    ),
                    child: Row(
                      children: [
                        TextButton(
                          onPressed: () {
                            filterSetState(() {
                              // Reset all filters
                              _selectedCategories = <String>{}; // Reset to show all events
                              _selectedPriorities = {'low', 'medium', 'high', 'urgent'}; // API format values
                              _selectedStatuses = {'Confirmed', 'Tentative', 'Cancelled', 'Pending'};
                              _showAllDayEvents = true;
                              _showRecurringEvents = true;
                              _showDeclinedEvents = false;
                              _showCancelledEvents = false;
                              _showPrivateEvents = true;
                              _selectedTags = [];
                              _filterStartDate = null;
                              _filterEndDate = null;
                            });
                          },
                          child: Text(
                            'calendar.reset'.tr(),
                            style: TextStyle(color: subtitleColor),
                          ),
                        ),
                        const Spacer(),
                        TextButton(
                          onPressed: () => Navigator.pop(context),
                          child: Text(
                            'common.cancel'.tr(),
                            style: TextStyle(color: subtitleColor),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [context.primaryColor, const Color(0xFF8B6BFF)],
                            ),
                            borderRadius: BorderRadius.circular(5),
                          ),
                          child: ElevatedButton(
                            onPressed: () {
                              // Apply filters and close dialog
                              setState(() {
                                // The state is already updated via filterSetState
                              });
                              Navigator.pop(context);
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.transparent,
                              shadowColor: Colors.transparent,
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(5),
                              ),
                            ),
                            child: Text(
                              'calendar.apply'.tr(),
                              style: TextStyle(color: Colors.white),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildCheckboxFilterSection(String title, List<Widget> children) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: TextStyle(
            color: textColor,
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        Column(
          children: children,
        ),
      ],
    );
  }

  Widget _buildCheckbox(String label, String value, Set<String> selectedSet, StateSetter setState) {
    final isSelected = selectedSet.contains(value);
    return InkWell(
      onTap: () {
        setState(() {
          if (isSelected) {
            selectedSet.remove(value);
          } else {
            selectedSet.add(value);
          }
        });
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          children: [
            Checkbox(
              value: isSelected,
              onChanged: (selected) {
                setState(() {
                  if (selected == true) {
                    selectedSet.add(value);
                  } else {
                    selectedSet.remove(value);
                  }
                });
              },
              activeColor: context.primaryColor,
            ),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(color: textColor, fontSize: 14),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoryCheckbox(String label, String value, String colorHex, Set<String> selectedSet, StateSetter setState) {
    final isSelected = selectedSet.contains(value);
    // Parse color from hex string
    Color categoryColor;
    try {
      categoryColor = Color(int.parse(colorHex.replaceAll('#', '0xFF')));
    } catch (e) {
      categoryColor = Colors.grey;
    }

    return InkWell(
      onTap: () {
        setState(() {
          if (isSelected) {
            selectedSet.remove(value);
          } else {
            selectedSet.add(value);
          }
        });
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          children: [
            Checkbox(
              value: isSelected,
              onChanged: (selected) {
                setState(() {
                  if (selected == true) {
                    selectedSet.add(value);
                  } else {
                    selectedSet.remove(value);
                  }
                });
              },
              activeColor: context.primaryColor,
            ),
            const SizedBox(width: 8),
            Container(
              width: 12,
              height: 12,
              decoration: BoxDecoration(
                color: categoryColor,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(color: textColor, fontSize: 14),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterSection(String title, List<Widget> children) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: TextStyle(
            color: textColor,
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: children,
        ),
      ],
    );
  }

  Widget _buildFilterChip(String label, String value, Set<String> selectedSet, StateSetter setState) {
    final isSelected = selectedSet.contains(value);
    return FilterChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (selected) {
        setState(() {
          if (selected) {
            selectedSet.add(value);
          } else {
            selectedSet.remove(value);
          }
        });
      },
      selectedColor: context.primaryColor.withValues(alpha: 0.2),
      backgroundColor: cardColor,
      side: BorderSide(
        color: isSelected ? context.primaryColor : borderColor,
      ),
      labelStyle: TextStyle(
        color: isSelected ? context.primaryColor : textColor,
      ),
      showCheckmark: false,
    );
  }

  Widget _buildToggleOption(String label, bool value, Function(bool) onChanged) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(color: textColor),
        ),
        Switch(
          value: value,
          onChanged: onChanged,
          activeColor: context.primaryColor,
        ),
      ],
    );
  }

  Widget _buildDateField(String label, DateTime? date, Function(DateTime?) onChanged) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (label.isNotEmpty) ...[
          Text(
            label,
            style: TextStyle(color: subtitleColor, fontSize: 12),
          ),
          const SizedBox(height: 4),
        ],
        InkWell(
          onTap: () async {
            final picked = await showDatePicker(
              context: context,
              initialDate: date ?? DateTime.now(),
              firstDate: DateTime(2020),
              lastDate: DateTime(2030),
            );
            if (picked != null) {
              onChanged(picked);
            }
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            decoration: BoxDecoration(
              border: Border.all(color: borderColor),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  date != null
                    ? '${date.month.toString().padLeft(2, '0')}/${date.day.toString().padLeft(2, '0')}/${date.year}'
                    : 'mm/dd/yyyy',
                  style: TextStyle(
                    color: date != null ? textColor : subtitleColor,
                  ),
                ),
                Icon(Icons.calendar_today, size: 16, color: subtitleColor),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildTimelineViewButton(String label) {
    final isSelected = _timelineViewMode == label;
    return InkWell(
      onTap: () {
        setState(() {
          _timelineViewMode = label;
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? primaryColor : null,
          border: Border(
            right: label != 'Month' ? BorderSide(color: borderColor) : BorderSide.none,
          ),
          borderRadius: label == 'Day'
              ? const BorderRadius.only(
                  topLeft: Radius.circular(5),
                  bottomLeft: Radius.circular(5),
                )
              : label == 'Month'
                  ? const BorderRadius.only(
                      topRight: Radius.circular(5),
                      bottomRight: Radius.circular(5),
                    )
                  : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (label == 'Day')
              Icon(
                Icons.circle,
                size: 12,
                color: isSelected ? Colors.white : subtitleColor,
              ),
            if (label == 'Week')
              Icon(
                Icons.view_week,
                size: 12,
                color: isSelected ? Colors.white : subtitleColor,
              ),
            if (label == 'Month')
              Icon(
                Icons.calendar_view_month,
                size: 12,
                color: isSelected ? Colors.white : subtitleColor,
              ),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? Colors.white : textColor,
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showQuickMeetingDialog() {
    String selectedPlatform = 'Google Meet';
    String meetingTitle = 'Quick Meeting';
    String duration = '30 minutes';
    String description = '';
    String meetingLink = 'https://meet.google.com/n166y19ub3aixlvzjy73';
    
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => Dialog(
          backgroundColor: backgroundColor,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(5),
          ),
          child: Container(
            width: MediaQuery.of(context).size.width * 0.9,
            constraints: BoxConstraints(
              maxWidth: 600,
              maxHeight: MediaQuery.of(context).size.height * 0.9,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Header
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: surfaceColor,
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(5),
                      topRight: Radius.circular(5),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.video_call,
                        color: primaryColor,
                        size: 24,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Quick Meeting',
                          style: TextStyle(
                            color: textColor,
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      IconButton(
                        icon: Icon(Icons.close, color: textColor),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                ),
                
                // Content
                Flexible(
                  child: SingleChildScrollView(
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Platform Selection
                          Text(
                            'Choose Meeting Platform',
                            style: TextStyle(
                              color: textColor,
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: GestureDetector(
                                  onTap: () {
                                    setState(() {
                                      selectedPlatform = 'Google Meet';
                                      meetingLink = 'https://meet.google.com/n166y19ub3aixlvzjy73';
                                    });
                                  },
                                  child: Container(
                                    padding: const EdgeInsets.all(8),
                                    decoration: BoxDecoration(
                                      color: selectedPlatform == 'Google Meet' ? primaryColor : surfaceColor,
                                      borderRadius: BorderRadius.circular(5),
                                      border: Border.all(
                                        color: selectedPlatform == 'Google Meet' ? primaryColor : borderColor,
                                      ),
                                    ),
                                    child: Row(
                                      children: [
                                        Container(
                                          width: 20,
                                          height: 20,
                                          decoration: BoxDecoration(
                                            color: selectedPlatform == 'Google Meet' ? Colors.white : primaryColor,
                                            borderRadius: BorderRadius.circular(3),
                                          ),
                                          child: Icon(
                                            Icons.video_call,
                                            color: selectedPlatform == 'Google Meet' ? primaryColor : Colors.white,
                                            size: 12,
                                          ),
                                        ),
                                        const SizedBox(width: 6),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                'Google Meet',
                                                style: TextStyle(
                                                  color: selectedPlatform == 'Google Meet' ? Colors.white : textColor,
                                                  fontSize: 11,
                                                  fontWeight: FontWeight.w600,
                                                ),
                                              ),
                                              Text(
                                                'Free with Google account',
                                                style: TextStyle(
                                                  color: selectedPlatform == 'Google Meet' ? Colors.white70 : subtitleColor,
                                                  fontSize: 9,
                                                ),
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: GestureDetector(
                                  onTap: () {
                                    setState(() {
                                      selectedPlatform = 'Zoom';
                                      meetingLink = 'https://zoom.us/j/123456789';
                                    });
                                  },
                                  child: Container(
                                    padding: const EdgeInsets.all(8),
                                    decoration: BoxDecoration(
                                      color: selectedPlatform == 'Zoom' ? primaryColor : surfaceColor,
                                      borderRadius: BorderRadius.circular(5),
                                      border: Border.all(
                                        color: selectedPlatform == 'Zoom' ? primaryColor : borderColor,
                                      ),
                                    ),
                                    child: Row(
                                      children: [
                                        Container(
                                          width: 20,
                                          height: 20,
                                          decoration: BoxDecoration(
                                            color: selectedPlatform == 'Zoom' ? Colors.white : primaryColor,
                                            borderRadius: BorderRadius.circular(3),
                                          ),
                                          child: Icon(
                                            Icons.video_call,
                                            color: selectedPlatform == 'Zoom' ? primaryColor : Colors.white,
                                            size: 12,
                                          ),
                                        ),
                                        const SizedBox(width: 6),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                'Zoom',
                                                style: TextStyle(
                                                  color: selectedPlatform == 'Zoom' ? Colors.white : textColor,
                                                  fontSize: 11,
                                                  fontWeight: FontWeight.w600,
                                                ),
                                              ),
                                              Text(
                                                'Requires Zoom account',
                                                style: TextStyle(
                                                  color: selectedPlatform == 'Zoom' ? Colors.white70 : subtitleColor,
                                                  fontSize: 9,
                                                ),
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          
                          const SizedBox(height: 24),
                          
                          // Meeting Title and Duration
                          Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Meeting Title',
                                      style: TextStyle(
                                        color: textColor,
                                        fontSize: 14,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    TextField(
                                      style: TextStyle(color: textColor),
                                      decoration: InputDecoration(
                                        hintText: 'calendar.quick_meeting'.tr(),
                                        hintStyle: TextStyle(color: subtitleColor),
                                        filled: true,
                                        fillColor: surfaceColor,
                                        border: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(5),
                                          borderSide: BorderSide(color: borderColor),
                                        ),
                                        enabledBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(5),
                                          borderSide: BorderSide(color: borderColor),
                                        ),
                                        focusedBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(5),
                                          borderSide: BorderSide(color: primaryColor),
                                        ),
                                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                      ),
                                      onChanged: (value) => meetingTitle = value,
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Duration (minutes)',
                                      style: TextStyle(
                                        color: textColor,
                                        fontSize: 14,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    DropdownButtonFormField<String>(
                                      value: duration,
                                      dropdownColor: surfaceColor,
                                      style: TextStyle(color: textColor),
                                      decoration: InputDecoration(
                                        filled: true,
                                        fillColor: surfaceColor,
                                        border: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(5),
                                          borderSide: BorderSide(color: borderColor),
                                        ),
                                        enabledBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(5),
                                          borderSide: BorderSide(color: borderColor),
                                        ),
                                        focusedBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(5),
                                          borderSide: BorderSide(color: primaryColor),
                                        ),
                                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                      ),
                                      items: ['15 minutes', '30 minutes', '45 minutes', '60 minutes', '90 minutes', '120 minutes']
                                          .map((String value) => DropdownMenuItem<String>(
                                                value: value,
                                                child: Text(value, style: TextStyle(color: textColor)),
                                              ))
                                          .toList(),
                                      onChanged: (value) => setState(() => duration = value!),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          
                          const SizedBox(height: 20),
                          
                          // Description
                          Text(
                            'Description (Optional)',
                            style: TextStyle(
                              color: textColor,
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 8),
                          TextField(
                            maxLines: 3,
                            style: TextStyle(color: textColor),
                            decoration: InputDecoration(
                              hintText: 'calendar.meeting_agenda_hint'.tr(),
                              hintStyle: TextStyle(color: subtitleColor),
                              filled: true,
                              fillColor: surfaceColor,
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(5),
                                borderSide: BorderSide(color: borderColor),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(5),
                                borderSide: BorderSide(color: borderColor),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(5),
                                borderSide: BorderSide(color: primaryColor),
                              ),
                              contentPadding: const EdgeInsets.all(12),
                            ),
                            onChanged: (value) => description = value,
                          ),
                          
                          const SizedBox(height: 12),
                          Text(
                            'Type @ followed by keywords to search and insert notes from /notes',
                            style: TextStyle(
                              color: subtitleColor,
                              fontSize: 12,
                            ),
                          ),
                          
                          const SizedBox(height: 20),
                          
                          // Meeting Link
                          Text(
                            'Meeting Link',
                            style: TextStyle(
                              color: textColor,
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: surfaceColor,
                              borderRadius: BorderRadius.circular(5),
                              border: Border.all(color: borderColor),
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    meetingLink,
                                    style: TextStyle(
                                      color: textColor,
                                      fontSize: 14,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                TextButton(
                                  onPressed: () {
                                    // Copy to clipboard
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(content: Text('calendar.link_copied'.tr())),
                                    );
                                  },
                                  child: Text(
                                    'Copy',
                                    style: TextStyle(color: primaryColor),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          
                          const SizedBox(height: 20),
                          
                          // Team Members
                          Text(
                            'Invite Team Members',
                            style: TextStyle(
                              color: textColor,
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Expanded(
                                child: TextButton(
                                  onPressed: () {},
                                  style: TextButton.styleFrom(
                                    backgroundColor: primaryColor.withValues(alpha: 0.1),
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                  ),
                                  child: Text(
                                    'Select All Online',
                                    style: TextStyle(color: primaryColor),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: TextButton(
                                  onPressed: () {},
                                  style: TextButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                  ),
                                  child: Text(
                                    'Deselect All',
                                    style: TextStyle(color: subtitleColor),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          
                          const SizedBox(height: 12),
                          
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.orange.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(5),
                              border: Border.all(color: Colors.orange.withValues(alpha: 0.3)),
                            ),
                            child: Row(
                              children: [
                                Icon(Icons.warning, color: Colors.orange, size: 20),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Using demo team members',
                                        style: TextStyle(
                                          color: Colors.orange,
                                          fontSize: 14,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                      Text(
                                        'Connect to messenger system for real team members from /messages route',
                                        style: TextStyle(
                                          color: Colors.orange.withValues(alpha: 0.8),
                                          fontSize: 12,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          
                          const SizedBox(height: 12),
                          
                          TextField(
                            style: TextStyle(color: textColor),
                            decoration: InputDecoration(
                              hintText: 'calendar.mention_team_hint'.tr(),
                              hintStyle: TextStyle(color: subtitleColor),
                              filled: true,
                              fillColor: surfaceColor,
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(5),
                                borderSide: BorderSide(color: borderColor),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(5),
                                borderSide: BorderSide(color: borderColor),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(5),
                                borderSide: BorderSide(color: primaryColor),
                              ),
                              contentPadding: const EdgeInsets.all(12),
                            ),
                          ),
                          
                          const SizedBox(height: 12),
                          Text(
                            'Type @ followed by a name to mention team members',
                            style: TextStyle(
                              color: subtitleColor,
                              fontSize: 12,
                            ),
                          ),
                          
                          const SizedBox(height: 20),
                          
                          // Invitation Options
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: surfaceColor,
                              borderRadius: BorderRadius.circular(5),
                              border: Border.all(color: borderColor),
                            ),
                            child: Row(
                              children: [
                                Icon(Icons.send, color: primaryColor, size: 20),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    'Send Invite to Messages',
                                    style: TextStyle(
                                      color: textColor,
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                                Text(
                                  'Use @ mentions',
                                  style: TextStyle(
                                    color: subtitleColor,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          
                          const SizedBox(height: 20),
                          
                          // Meeting Summary
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: surfaceColor,
                              borderRadius: BorderRadius.circular(5),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Icon(Icons.calendar_today, color: primaryColor, size: 20),
                                    const SizedBox(width: 8),
                                    Text(
                                      'Meeting Summary',
                                      style: TextStyle(
                                        color: textColor,
                                        fontSize: 16,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text('calendar.platform_label'.tr(), style: TextStyle(color: subtitleColor, fontSize: 14)),
                                    Text(selectedPlatform, style: TextStyle(color: textColor, fontSize: 14, fontWeight: FontWeight.w600)),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text('calendar.duration_label'.tr(), style: TextStyle(color: subtitleColor, fontSize: 14)),
                                    Text(duration, style: TextStyle(color: textColor, fontSize: 14, fontWeight: FontWeight.w600)),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text('Start Time:', style: TextStyle(color: subtitleColor, fontSize: 14)),
                                    Text('11:12 AM', style: TextStyle(color: textColor, fontSize: 14, fontWeight: FontWeight.w600)),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text('End Time:', style: TextStyle(color: subtitleColor, fontSize: 14)),
                                    Text('11:42 AM', style: TextStyle(color: textColor, fontSize: 14, fontWeight: FontWeight.w600)),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                
                // Footer
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    border: Border(
                      top: BorderSide(color: borderColor),
                    ),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () async {
                            // Start the meeting immediately by opening the meeting link
                            Navigator.pop(context);
                            
                            try {
                              final Uri url = Uri.parse(meetingLink);
                              if (await canLaunchUrl(url)) {
                                await launchUrl(url, mode: LaunchMode.externalApplication);
                                if (mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text('Opening $selectedPlatform meeting...'),
                                      backgroundColor: Colors.green,
                                    ),
                                  );
                                }
                              } else {
                                if (mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text('Could not open $selectedPlatform meeting link'),
                                      backgroundColor: Colors.red,
                                    ),
                                  );
                                }
                              }
                            } catch (e) {
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text('Error opening meeting: ${e.toString()}'),
                                    backgroundColor: Colors.red,
                                  ),
                                );
                              }
                            }
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: primaryColor,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(5),
                            ),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.video_call, color: Colors.white, size: 16),
                              const SizedBox(width: 6),
                              const Text(
                                'Start Meeting Now',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      TextButton(
                        onPressed: () => Navigator.pop(context),
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                        ),
                        child: Text(
                          'Cancel',
                          style: TextStyle(
                            color: textColor,
                            fontSize: 14,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showInvitePeopleDialog() {
    final TextEditingController emailController = TextEditingController();
    
    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        child: Container(
          width: 500,
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: backgroundColor,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Invite People to Calendar',
                    style: TextStyle(
                      color: textColor,
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  IconButton(
                    icon: Icon(Icons.close, color: textColor),
                    onPressed: () => Navigator.pop(context),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              
              // Email Input
              Text(
                'Email addresses',
                style: TextStyle(
                  color: textColor,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: emailController,
                style: TextStyle(color: textColor, fontSize: 14),
                decoration: InputDecoration(
                  hintText: 'calendar.email_list_hint'.tr(),
                  hintStyle: TextStyle(color: subtitleColor, fontSize: 14),
                  filled: true,
                  fillColor: surfaceColor,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(6),
                    borderSide: BorderSide(color: borderColor),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(6),
                    borderSide: BorderSide(color: borderColor),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(6),
                    borderSide: BorderSide(color: context.primaryColor),
                  ),
                  contentPadding: const EdgeInsets.all(16),
                ),
                maxLines: 2,
              ),
              const SizedBox(height: 8),
              Text(
                'Enter multiple email addresses separated by commas',
                style: TextStyle(
                  color: subtitleColor,
                  fontSize: 12,
                ),
              ),
              const SizedBox(height: 24),
              
              // Invitation Info
              Text(
                'Invitation includes:',
                style: TextStyle(
                  color: textColor,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 8),
              _buildInvitationFeature('Access to view your calendar'),
              _buildInvitationFeature('Ability to see free/busy times'),
              _buildInvitationFeature('Meeting requests and updates'),
              const SizedBox(height: 32),
              
              // Action Buttons
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: Text(
                      'Cancel',
                      style: TextStyle(color: subtitleColor),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [context.primaryColor, Color(0xFF8B6BFF)],
                      ),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.pop(context);
                        _sendInvitations(emailController.text);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.transparent,
                        shadowColor: Colors.transparent,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(6),
                        ),
                      ),
                      child: const Text(
                        'Send Invitations',
                        style: TextStyle(color: Colors.white, fontSize: 14),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInvitationFeature(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 4,
            decoration: BoxDecoration(
              color: context.primaryColor,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 8),
          Text(
            text,
            style: TextStyle(
              color: subtitleColor,
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }

  void _sendInvitations(String emailText) {
    if (emailText.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Please enter at least one email address'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    final emails = emailText.split(',').map((e) => e.trim()).where((e) => e.isNotEmpty).toList();
    
    // Show success message
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Calendar invitations sent to ${emails.length} recipients'),
        backgroundColor: const Color(0xFF00C853),
      ),
    );
  }

  Future<CalendarEvent?> _showAIScheduleDialog() async {
    final TextEditingController titleController = TextEditingController();
    final TextEditingController descriptionController = TextEditingController();
    final TextEditingController durationController = TextEditingController(text: '60');
    final TextEditingController attendeesController = TextEditingController();
    final TextEditingController locationController = TextEditingController();
    
    String selectedPriority = 'normal';
    String selectedTimePreference = 'Morning (9 AM - 12 PM)';
    bool isTitleValid = false;
    
    bool isGeneratingAI = false; // Local state for AI generation

    final result = await showDialog<CalendarEvent>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => Dialog(
          backgroundColor: Colors.transparent,
          child: Container(
            width: MediaQuery.of(context).size.width * 0.9,
            constraints: const BoxConstraints(maxWidth: 500),
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: backgroundColor,
              borderRadius: BorderRadius.circular(8),
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Smart Scheduling Assistant',
                              style: TextStyle(
                                color: textColor,
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 4),
                            Wrap(
                              spacing: 8,
                              crossAxisAlignment: WrapCrossAlignment.center,
                              children: [
                                Icon(Icons.auto_awesome, color: context.primaryColor, size: 14),
                                Text(
                                  'AI Assistant',
                                  style: TextStyle(
                                    color: context.primaryColor,
                                    fontSize: 12,
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                  decoration: BoxDecoration(
                                    color: context.primaryColor.withValues(alpha: 0.2),
                                    borderRadius: BorderRadius.circular(3),
                                  ),
                                  child: Text(
                                    'Beta',
                                    style: TextStyle(
                                      color: context.primaryColor,
                                      fontSize: 9,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: Icon(Icons.close, color: textColor, size: 20),
                        onPressed: () => Navigator.pop(context),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  
                  // Event Title
                  Text(
                    'Event Title',
                    style: TextStyle(
                      color: textColor,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: titleController,
                    style: TextStyle(color: textColor, fontSize: 14),
                    onChanged: (value) {
                      setDialogState(() {
                        isTitleValid = value.trim().isNotEmpty;
                      });
                    },
                    decoration: InputDecoration(
                      hintText: 'calendar.schedule_prompt_hint'.tr(),
                      hintStyle: TextStyle(color: subtitleColor, fontSize: 14),
                      filled: true,
                      fillColor: surfaceColor,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(6),
                        borderSide: BorderSide(color: borderColor),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(6),
                        borderSide: BorderSide(color: borderColor),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(6),
                        borderSide: BorderSide(color: context.primaryColor),
                      ),
                      contentPadding: const EdgeInsets.all(16),
                    ),
                  ),
                  const SizedBox(height: 16),
                  
                  // Description
                  Text(
                    'Description (Optional)',
                    style: TextStyle(
                      color: textColor,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: descriptionController,
                    style: TextStyle(color: textColor, fontSize: 14),
                    maxLines: 3,
                    decoration: InputDecoration(
                      hintText: 'calendar.additional_details_hint'.tr(),
                      hintStyle: TextStyle(color: subtitleColor, fontSize: 14),
                      filled: true,
                      fillColor: surfaceColor,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(6),
                        borderSide: BorderSide(color: borderColor),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(6),
                        borderSide: BorderSide(color: borderColor),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(6),
                        borderSide: BorderSide(color: context.primaryColor),
                      ),
                      contentPadding: const EdgeInsets.all(16),
                      suffixIcon: Container(
                        margin: const EdgeInsets.all(8),
                        child: isGeneratingAI
                            ? _BreathingAIIcon()
                            : IconButton(
                                icon: Icon(Icons.auto_awesome, color: context.primaryColor, size: 16),
                                onPressed: () async {
                                  // Check if title is provided
                                  if (titleController.text.trim().isEmpty) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text('calendar.enter_title_first'.tr()),
                                        backgroundColor: Colors.orange,
                                      ),
                                    );
                                    return;
                                  }

                                  // Start breathing animation
                                  setDialogState(() {
                                    isGeneratingAI = true;
                                  });

                                  try {
                                    // Call AI API
                                    final response = await _aiService.generateEventDescriptions(titleController.text.trim());

                                    // Stop breathing animation
                                    setDialogState(() {
                                      isGeneratingAI = false;
                                    });

                                    if (response.success && response.data.generatedText.isNotEmpty) {
                                // Parse the descriptions
                                final fullText = response.data.generatedText;

                                // Debug: Print the full response

                                // Split by --- or by numbered descriptions
                                List<String> descriptions = [];

                                // Try splitting by ---
                                if (fullText.contains('---')) {
                                  descriptions = fullText
                                      .split('---')
                                      .map((d) => d.trim())
                                      .where((d) => d.isNotEmpty)
                                      .toList();
                                }
                                // If no --- separators, try splitting by **Description N:**
                                else if (fullText.contains('**Description')) {
                                  final pattern = RegExp(r'\*\*Description \d+:\*\*\s*(.+?)(?=\*\*Description \d+:\*\*|$)', dotAll: true);
                                  final matches = pattern.allMatches(fullText);
                                  descriptions = matches.map((m) => m.group(1)?.trim() ?? '').where((d) => d.isNotEmpty).toList();
                                }
                                // Otherwise just use the whole text as one description
                                else {
                                  descriptions = [fullText];
                                }

                                // Backend handles sanitization - just filter empty descriptions
                                descriptions = descriptions.map((d) => d.trim()).where((d) => d.isNotEmpty).toList();

                                for (int i = 0; i < descriptions.length; i++) {
                                }

                                if (descriptions.isEmpty) {
                                  throw Exception('No descriptions generated');
                                }

                                // Show selection dialog with stateful widget for selection feedback
                                final selectedDescription = await showDialog<String>(
                                  context: context,
                                  builder: (dialogContext) => StatefulBuilder(
                                    builder: (statefulContext, setDialogState) {
                                      int? hoveredIndex;

                                      return AlertDialog(
                                        backgroundColor: surfaceColor,
                                        title: Text(
                                          'Select a Description',
                                          style: TextStyle(color: textColor, fontWeight: FontWeight.w600),
                                        ),
                                        content: Container(
                                          width: MediaQuery.of(context).size.width * 0.8,
                                          constraints: BoxConstraints(maxHeight: 500),
                                          child: SingleChildScrollView(
                                            child: Column(
                                              mainAxisSize: MainAxisSize.min,
                                              children: descriptions.asMap().entries.map((entry) {
                                                final index = entry.key;
                                                final description = entry.value;

                                                return MouseRegion(
                                                  onEnter: (_) => setDialogState(() => hoveredIndex = index),
                                                  onExit: (_) => setDialogState(() => hoveredIndex = null),
                                                  child: Container(
                                                    margin: const EdgeInsets.only(bottom: 16),
                                                    child: Material(
                                                      color: Colors.transparent,
                                                      child: InkWell(
                                                        onTap: () {
                                                          Navigator.pop(dialogContext, description);
                                                        },
                                                        borderRadius: BorderRadius.circular(8),
                                                        child: Container(
                                                          padding: const EdgeInsets.all(16),
                                                          decoration: BoxDecoration(
                                                            border: Border.all(
                                                              color: hoveredIndex == index
                                                                  ? AppTheme.infoLight
                                                                  : borderColor,
                                                              width: hoveredIndex == index ? 2 : 1,
                                                            ),
                                                            borderRadius: BorderRadius.circular(8),
                                                            color: hoveredIndex == index
                                                                ? AppTheme.infoLight.withValues(alpha: 0.05)
                                                                : Colors.transparent,
                                                          ),
                                                          child: Column(
                                                            crossAxisAlignment: CrossAxisAlignment.start,
                                                            children: [
                                                              Row(
                                                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                                children: [
                                                                  Container(
                                                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                                                    decoration: BoxDecoration(
                                                                      color: AppTheme.infoLight.withValues(alpha: 0.1),
                                                                      borderRadius: BorderRadius.circular(4),
                                                                    ),
                                                                    child: Text(
                                                                      'Option ${index + 1}',
                                                                      style: TextStyle(
                                                                        color: AppTheme.infoLight,
                                                                        fontSize: 12,
                                                                        fontWeight: FontWeight.w600,
                                                                      ),
                                                                    ),
                                                                  ),
                                                                  Icon(
                                                                    Icons.check_circle_outline,
                                                                    color: hoveredIndex == index
                                                                        ? AppTheme.infoLight
                                                                        : subtitleColor.withValues(alpha: 0.3),
                                                                    size: 20,
                                                                  ),
                                                                ],
                                                              ),
                                                              const SizedBox(height: 12),
                                                              Text(
                                                                description,
                                                                style: TextStyle(
                                                                  color: textColor,
                                                                  fontSize: 14,
                                                                  height: 1.5,
                                                                ),
                                                              ),
                                                            ],
                                                          ),
                                                        ),
                                                      ),
                                                    ),
                                                  ),
                                                );
                                              }).toList(),
                                            ),
                                          ),
                                        ),
                                        actions: [
                                          TextButton(
                                            onPressed: () => Navigator.pop(dialogContext),
                                            child: Text('common.cancel'.tr(), style: TextStyle(color: subtitleColor)),
                                          ),
                                        ],
                                      );
                                    },
                                  ),
                                );

                                // Update description if selected
                                if (selectedDescription != null && selectedDescription.isNotEmpty) {
                                  setDialogState(() {
                                    descriptionController.text = selectedDescription;
                                  });
                                }
                              } else {
                                throw Exception(response.error ?? 'Failed to generate descriptions');
                              }
                            } catch (e) {
                              // Stop breathing animation
                              setDialogState(() {
                                isGeneratingAI = false;
                              });

                              // Show error
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('calendar.failed_generate_descriptions'.tr(args: ['$e'])),
                                  backgroundColor: Colors.red,
                                ),
                              );
                            }
                          },
                          tooltip: 'AI Suggest',
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  
                  // Duration and Priority
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Duration (minutes)',
                              style: TextStyle(
                                color: textColor,
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const SizedBox(height: 8),
                            TextField(
                              controller: durationController,
                              style: TextStyle(color: textColor, fontSize: 14),
                              keyboardType: TextInputType.number,
                              decoration: InputDecoration(
                                filled: true,
                                fillColor: surfaceColor,
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(6),
                                  borderSide: BorderSide(color: borderColor),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(6),
                                  borderSide: BorderSide(color: borderColor),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(6),
                                  borderSide: BorderSide(color: context.primaryColor),
                                ),
                                contentPadding: const EdgeInsets.all(16),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Priority',
                              style: TextStyle(
                                color: textColor,
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12),
                              decoration: BoxDecoration(
                                color: surfaceColor,
                                border: Border.all(color: borderColor),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: DropdownButtonHideUnderline(
                                child: DropdownButton<String>(
                                  value: selectedPriority,
                                  isExpanded: true,
                                  items: [
                                    DropdownMenuItem(
                                      value: 'low',
                                      child: Text('Low', style: TextStyle(color: textColor, fontSize: 14)),
                                    ),
                                    DropdownMenuItem(
                                      value: 'normal',
                                      child: Text('Normal', style: TextStyle(color: textColor, fontSize: 14)),
                                    ),
                                    DropdownMenuItem(
                                      value: 'high',
                                      child: Text('High', style: TextStyle(color: textColor, fontSize: 14)),
                                    ),
                                    DropdownMenuItem(
                                      value: 'urgent',
                                      child: Text('Urgent', style: TextStyle(color: textColor, fontSize: 14)),
                                    ),
                                  ],
                                  onChanged: (value) {
                                    setDialogState(() {
                                      selectedPriority = value!;
                                    });
                                  },
                                  dropdownColor: surfaceColor,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  
                  // Attendees
                  Text(
                    'Attendees',
                    style: TextStyle(
                      color: textColor,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: attendeesController,
                          style: TextStyle(color: textColor, fontSize: 14),
                          decoration: InputDecoration(
                            hintText: 'calendar.email_address'.tr(),
                            hintStyle: TextStyle(color: subtitleColor, fontSize: 14),
                            filled: true,
                            fillColor: surfaceColor,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(6),
                              borderSide: BorderSide(color: borderColor),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(6),
                              borderSide: BorderSide(color: borderColor),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(6),
                              borderSide: BorderSide(color: context.primaryColor),
                            ),
                            contentPadding: const EdgeInsets.all(16),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        height: 48,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [context.primaryColor, Color(0xFF8B6BFF)],
                          ),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: ElevatedButton(
                          onPressed: () {},
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.transparent,
                            shadowColor: Colors.transparent,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(6),
                            ),
                          ),
                          child: const Text(
                            'Add',
                            style: TextStyle(color: Colors.white, fontSize: 14),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  
                  // Location
                  Text(
                    'Location (Optional)',
                    style: TextStyle(
                      color: textColor,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: locationController,
                    style: TextStyle(color: textColor, fontSize: 14),
                    decoration: InputDecoration(
                      hintText: 'calendar.location_hint_full'.tr(),
                      hintStyle: TextStyle(color: subtitleColor, fontSize: 14),
                      filled: true,
                      fillColor: surfaceColor,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(6),
                        borderSide: BorderSide(color: borderColor),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(6),
                        borderSide: BorderSide(color: borderColor),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(6),
                        borderSide: BorderSide(color: context.primaryColor),
                      ),
                      contentPadding: const EdgeInsets.all(16),
                    ),
                  ),
                  const SizedBox(height: 24),
                  
                  // Scheduling Preferences
                  Text(
                    'Scheduling Preferences',
                    style: TextStyle(
                      color: textColor,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 16),
                  
                  // Preferred Time of Day
                  Text(
                    'Preferred Time of Day',
                    style: TextStyle(
                      color: textColor,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: surfaceColor,
                      border: Border.all(color: borderColor),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: selectedTimePreference,
                        isExpanded: true,
                        items: ['Morning (9 AM - 12 PM)', 'Afternoon (12 PM - 6 PM)', 'Evening (6 PM - 9 PM)']
                            .map((time) => DropdownMenuItem(
                                  value: time,
                                  child: Text(
                                    time,
                                    style: TextStyle(color: textColor, fontSize: 14),
                                  ),
                                ))
                            .toList(),
                        onChanged: (value) {
                          setDialogState(() {
                            selectedTimePreference = value!;
                          });
                        },
                        dropdownColor: surfaceColor,
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),
                  
                  // Action Buttons
                  Row(
                    children: [
                      Expanded(
                        child: TextButton(
                          onPressed: () => Navigator.pop(context),
                          child: Text(
                            'Cancel',
                            style: TextStyle(color: subtitleColor),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        flex: 2,
                        child: Container(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [context.primaryColor, Color(0xFF8B6BFF)],
                            ),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: ElevatedButton.icon(
                            onPressed: !isTitleValid ? null : () async {
                              // Get current workspace
                              final currentWorkspace = _workspaceService.currentWorkspace;
                              if (currentWorkspace == null) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text('No workspace selected'),
                                    backgroundColor: Colors.red,
                                  ),
                                );
                                return;
                              }

                              // Show loading indicator
                              showDialog(
                                context: context,
                                barrierDismissible: false,
                                builder: (loadingContext) => AlertDialog(
                                  backgroundColor: surfaceColor,
                                  content: Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      CircularProgressIndicator(color: AppTheme.infoLight),
                                      const SizedBox(height: 16),
                                      Text(
                                        'Finding optimal times...',
                                        style: TextStyle(color: textColor),
                                      ),
                                    ],
                                  ),
                                ),
                              );

                              try {
                                // Parse time preference
                                String timePreferenceValue = 'morning';
                                if (selectedTimePreference.contains('Afternoon')) {
                                  timePreferenceValue = 'afternoon';
                                } else if (selectedTimePreference.contains('Evening')) {
                                  timePreferenceValue = 'evening';
                                }

                                // Parse attendees
                                List<String>? attendeesList;
                                if (attendeesController.text.isNotEmpty) {
                                  attendeesList = attendeesController.text
                                      .split(',')
                                      .map((e) => e.trim())
                                      .where((e) => e.isNotEmpty)
                                      .toList();
                                }

                                // Create request DTO
                                final dto = api.ScheduleSuggestionDto(
                                  title: titleController.text.trim(),
                                  description: descriptionController.text.trim().isEmpty
                                      ? null
                                      : descriptionController.text.trim(),
                                  duration: int.tryParse(durationController.text) ?? 60,
                                  priority: selectedPriority,
                                  attendees: attendeesList,
                                  location: locationController.text.trim().isEmpty
                                      ? null
                                      : locationController.text.trim(),
                                  timePreference: timePreferenceValue,
                                  lookAheadDays: 7,
                                  includeWeekends: false,
                                );

                                // Call API
                                final response = await _calendarApi.getScheduleSuggestions(
                                  currentWorkspace.id,
                                  dto,
                                );

                                // Close loading dialog
                                if (context.mounted) Navigator.pop(context);

                                if (response.isSuccess && response.data != null) {
                                  // Navigate to suggestions screen with results
                                  final result = await Navigator.push<CalendarEvent>(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) => AITimeSuggestionsScreen(
                                        eventTitle: titleController.text,
                                        description: descriptionController.text,
                                        duration: int.tryParse(durationController.text) ?? 60,
                                        priority: selectedPriority,
                                        timePreference: selectedTimePreference,
                                        selectedDate: _localSelectedDate,
                                        suggestions: response.data!.suggestions,
                                        location: locationController.text.trim().isEmpty
                                            ? null
                                            : locationController.text.trim(),
                                        attendees: attendeesList,
                                      ),
                                    ),
                                  );

                                  // If an event was created, close dialog and return it
                                  if (result != null && context.mounted) {
                                    Navigator.pop(context, result);
                                  }
                                } else {
                                  // Show error
                                  throw Exception(response.message ?? 'Failed to get suggestions');
                                }
                              } catch (e) {
                                // Close loading dialog if still open
                                if (context.mounted && Navigator.canPop(context)) {
                                  Navigator.pop(context);
                                }

                                // Show error
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text('Failed to find times: $e'),
                                      backgroundColor: Colors.red,
                                    ),
                                  );
                                }
                              }
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.transparent,
                              shadowColor: Colors.transparent,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(6),
                              ),
                            ),
                            icon: const Icon(Icons.auto_awesome, color: Colors.white, size: 14),
                            label: const Text(
                              'Find Times',
                              style: TextStyle(color: Colors.white, fontSize: 13),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
    
    return result;
  }
}

// Breathing AI Icon Widget
class _BreathingAIIcon extends StatefulWidget {
  @override
  _BreathingAIIconState createState() => _BreathingAIIconState();
}

class _BreathingAIIconState extends State<_BreathingAIIcon> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    );

    _animation = Tween<double>(begin: 0.6, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: Curves.easeInOut,
      ),
    );

    // Start repeating animation
    _controller.repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Transform.scale(
          scale: _animation.value,
          child: Opacity(
            opacity: _animation.value,
            child: Icon(
              Icons.auto_awesome,
              color: context.primaryColor,
              size: 16,
            ),
          ),
        );
      },
    );
  }
}