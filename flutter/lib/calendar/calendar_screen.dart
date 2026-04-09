import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'dart:async';
import 'dart:math' as math;
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:easy_localization/easy_localization.dart';
import '../utils/file_download_helper.dart';

// Conditional imports for non-web platforms
import 'dart:io' if (dart.library.html) '../utils/web_file_stub.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'calendar_details_screen.dart';
import 'meeting_room_booking_screen.dart';
import 'calendar_analytics_screen.dart';
import 'create_event_screen.dart';
import 'smart_event_creator_screen.dart';
import 'ai_calendar_assistant.dart';
import 'calendar_import_modal.dart';
import '../models/calendar_event.dart';
import '../api/services/calendar_api_service.dart' as api;
import '../services/workspace_service.dart';
import '../services/analytics_service.dart';
import '../theme/app_theme.dart';
import '../widgets/ai_button.dart';
import '../api/services/google_calendar_service.dart';
import '../models/google_calendar_connection.dart';
import 'calendar_settings_screen.dart';

class CalendarScreen extends StatefulWidget {
  const CalendarScreen({super.key});

  @override
  State<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends State<CalendarScreen> {
  DateTime _selectedDate = DateTime.now();
  DateTime _currentTime = DateTime.now();
  Timer? _timeUpdateTimer;

  // Calendar Settings
  bool _showWeekends = true;
  bool _use24HourFormat = false;
  bool _showWeekNumbers = false;
  bool _defaultEventReminders = true;
  bool _conflictAlerts = true;

  // Services
  final api.CalendarApiService _calendarApi = api.CalendarApiService();
  final WorkspaceService _workspaceService = WorkspaceService.instance;
  final GoogleCalendarService _googleCalendarService = GoogleCalendarService.instance;

  // Data
  List<CalendarEvent> _events = [];
  List<api.EventCategory> _categories = [];
  bool _isLoading = false;
  String? _error;

  // Google Calendar Integration
  GoogleCalendarConnection? _googleCalendarConnection;
  bool _isGoogleCalendarLoading = false;
  bool _isGoogleCalendarSyncing = false;

  // Selected month events cache
  Map<DateTime, List<CalendarEvent>> _monthEventsCache = {};

  @override
  void initState() {
    super.initState();
    AnalyticsService.instance.logScreenView(screenName: 'CalendarScreen');
    _initializeMockData();
    _loadGoogleCalendarConnection();
    // Update time every minute
    _timeUpdateTimer = Timer.periodic(const Duration(minutes: 1), (timer) {
      setState(() {
        _currentTime = DateTime.now();
      });
    });
  }

  /// Load Google Calendar connection status
  Future<void> _loadGoogleCalendarConnection() async {
    final workspaceId = _workspaceService.currentWorkspace?.id;
    if (workspaceId == null) return;

    setState(() => _isGoogleCalendarLoading = true);

    try {
      final response = await _googleCalendarService.getConnection(workspaceId);
      if (mounted) {
        setState(() {
          _googleCalendarConnection = response.data;
          _isGoogleCalendarLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isGoogleCalendarLoading = false);
      }
    }
  }

  /// Sync Google Calendar events
  Future<void> _syncGoogleCalendar() async {
    final workspaceId = _workspaceService.currentWorkspace?.id;
    if (workspaceId == null) return;

    setState(() => _isGoogleCalendarSyncing = true);

    try {
      final response = await _googleCalendarService.syncCalendar(workspaceId);
      if (mounted) {
        if (response.isSuccess && response.data != null) {
          final result = response.data!;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('google_calendar.sync_complete'.tr(args: [
                result.synced.toString(),
                result.deleted.toString(),
              ])),
              backgroundColor: Colors.green,
            ),
          );
          // Refresh calendar events and connection
          await _loadEvents();
          await _loadGoogleCalendarConnection();
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(response.message ?? 'Failed to sync'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to sync: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isGoogleCalendarSyncing = false);
      }
    }
  }

  Future<void> _initializeMockData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      // Get current workspace
      final currentWorkspace = _workspaceService.currentWorkspace;
      if (currentWorkspace == null) {
        throw Exception('calendar.no_workspace_selected'.tr());
      }

      // Load categories from API
      final categoriesResponse = await _calendarApi.getEventCategories(
        currentWorkspace.id,
      );

      if (categoriesResponse.isSuccess && categoriesResponse.data != null) {
        setState(() {
          _categories = categoriesResponse.data!;
        });

        // Load events for current month
        await _loadEvents();

        setState(() {
          _isLoading = false;
        });
      } else {
        throw Exception(categoriesResponse.message);
      }
    } catch (e) {
      setState(() {
        _error = 'Failed to load calendar data: $e';
        _isLoading = false;
        _categories = [];
        _events = [];
      });
    }
  }

  Future<void> _loadEvents() async {
    try {
      final currentWorkspace = _workspaceService.currentWorkspace;
      if (currentWorkspace == null) {
        return;
      }

      // Calculate start and end dates for current month
      final startOfMonth = DateTime(_selectedDate.year, _selectedDate.month, 1);
      final endOfMonth = DateTime(_selectedDate.year, _selectedDate.month + 1, 0, 23, 59, 59);


      final eventsResponse = await _calendarApi.getEvents(
        currentWorkspace.id,
        startDate: startOfMonth.toIso8601String(),
        endDate: endOfMonth.toIso8601String(),
      );

      if (eventsResponse.isSuccess && eventsResponse.data != null) {
        setState(() {
          // Convert API events to model events with error handling
          _events = [];
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
                        fileAttachmentDetails: apiEvent.attachments!.fileAttachmentDetails,
                        noteAttachmentDetails: apiEvent.attachments!.noteAttachmentDetails,
                        eventAttachmentDetails: apiEvent.attachments!.eventAttachmentDetails,
                      )
                    : null,
                collaborativeData: apiEvent.metadata is Map
                    ? Map<String, dynamic>.from(apiEvent.metadata as Map)
                    : {},
                createdAt: apiEvent.createdAt,
                updatedAt: apiEvent.updatedAt,
              );
              _events.add(event);
            } catch (e, stackTrace) {
              debugPrint('❌ Error parsing event ${apiEvent.id}: $e');
              debugPrint('Stack trace: $stackTrace');
            }
          }
          debugPrint('📅 Loaded ${_events.length} events from API (total in response: ${eventsResponse.data!.length})');
        });

        // Cache events by date
        _cacheEventsByDate(_events);

      } else {
        debugPrint('❌ Events response failed or null: ${eventsResponse.message}');
        setState(() {
          _events = [];
        });
      }
    } catch (e, stackTrace) {
      debugPrint('❌ Error loading events: $e');
      debugPrint('Stack trace: $stackTrace');
      setState(() {
        _events = [];
      });
    }
  }
  
  void _cacheEventsByDate(List<CalendarEvent> events) {
    _monthEventsCache.clear();
    for (final event in events) {
      final dateKey = DateTime(event.startTime.year, event.startTime.month, event.startTime.day);
      _monthEventsCache[dateKey] = (_monthEventsCache[dateKey] ?? [])..add(event);
    }
  }
  
  Future<void> _refreshEvents() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      // Fetch fresh events from backend
      await _loadEvents();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('calendar.calendar_refreshed'.tr()),
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Failed to refresh events: $e';
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('calendar.refresh_failed'.tr(args: ['$e'])),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  void _showImportModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => CalendarImportModal(
        onImportComplete: () {
          _loadEvents();
        },
      ),
    );
  }

  @override
  void dispose() {
    _timeUpdateTimer?.cancel();
    super.dispose();
  }

  // Helper methods to parse API strings to enums
  EventBusyStatus _parseBusyStatus(String? value) {
    switch (value) {
      case 'free':
        return EventBusyStatus.free;
      case 'tentative':
        return EventBusyStatus.tentative;
      default:
        return EventBusyStatus.busy;
    }
  }

  EventPriority _parseEventPriority(String? value) {
    switch (value) {
      case 'lowest':
        return EventPriority.lowest;
      case 'low':
        return EventPriority.low;
      case 'high':
        return EventPriority.high;
      case 'highest':
      case 'urgent':
        return EventPriority.highest;
      default:
        return EventPriority.normal;
    }
  }

  EventStatus _parseEventStatus(String? value) {
    switch (value) {
      case 'tentative':
        return EventStatus.tentative;
      case 'cancelled':
        return EventStatus.cancelled;
      default:
        return EventStatus.confirmed;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        leadingWidth: 32,
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Analytics Button
            SizedBox(
              width: 32,
              child: IconButton(
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                icon: const Icon(Icons.analytics_outlined, size: 22),
                tooltip: 'calendar.analytics_tooltip'.tr(),
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => CalendarAnalyticsScreen(
                        events: _events,
                      ),
                    ),
                  );
                },
              ),
            ),
            // Create Event Button (compact)
            ElevatedButton.icon(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => CreateEventScreen(
                      onEventCreated: (event) {
                        setState(() {
                          _events.add(event);
                        });
                        _cacheEventsByDate([event]);
                      },
                    ),
                  ),
                );
              },
              icon: const Icon(Icons.add, size: 14),
              label: Text(
                'calendar.create_event'.tr(),
                style: const TextStyle(fontSize: 11),
                overflow: TextOverflow.ellipsis,
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: context.primaryColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                minimumSize: const Size(0, 28),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(6),
                ),
                elevation: 0,
              ),
            ),
          ],
        ),
        actions: [
          // Day Progress Indicator
          DayProgressIndicator(currentTime: _currentTime),
          const SizedBox(width: 4),
          AIButton(
            label: 'AI',
            onPressed: () {
              showAICalendarAssistant(
                context: context,
                onEventsChanged: () {
                  _loadEvents();
                },
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.file_download_outlined),
            tooltip: 'calendar_import.title'.tr(),
            onPressed: _showImportModal,
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _refreshEvents,
          ),
        ],
      ),
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          'calendar.error_loading_calendar'.tr(),
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        const SizedBox(height: 8),
                        Text(_error!),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () {
                            setState(() {
                              _error = null;
                              _isLoading = false;
                            });
                          },
                          child: Text('calendar.dismiss'.tr()),
                        ),
                      ],
                    ),
                  )
                : _buildCalendarView(),
      ),
    );
  }

  Widget _buildEmptyCalendarView() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.calendar_today_outlined,
            size: 64,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
          const SizedBox(height: 16),
          Text(
            'calendar.no_calendar_events'.tr(),
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'calendar.no_events_database'.tr(),
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'calendar.create_events_hint'.tr(),
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildCalendarView() {
    return SingleChildScrollView(
      child: Column(
        children: [
          // Calendar Header
          Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            border: Border(
              bottom: BorderSide(
                color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.2),
              ),
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              IconButton(
                icon: const Icon(Icons.chevron_left),
                onPressed: () {
                  setState(() {
                    _selectedDate = DateTime(_selectedDate.year, _selectedDate.month - 1);
                  });
                  _loadEvents();
                },
              ),
              Text(
                '${_getMonthName(_selectedDate.month)} ${_selectedDate.year}',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              IconButton(
                icon: const Icon(Icons.chevron_right),
                onPressed: () {
                  setState(() {
                    _selectedDate = DateTime(_selectedDate.year, _selectedDate.month + 1);
                  });
                  _loadEvents();
                },
              ),
            ],
          ),
        ),
        
        // Calendar Grid
        SizedBox(
          height: 340,
          child: GridView.builder(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 7,
              childAspectRatio: 1.2,
              crossAxisSpacing: 8,
              mainAxisSpacing: 8,
            ),
            itemCount: 42, // 6 weeks * 7 days
            itemBuilder: (context, index) {
              final day = _getDayForIndex(index);
              final hasEvents = _getEventsForDay(day).isNotEmpty;
              final isToday = _isToday(day);
              final isCurrentMonth = day.month == _selectedDate.month;
              
              return GestureDetector(
                onTap: () async {
                  setState(() {
                    _selectedDate = day;
                  });
                  await Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => CalendarDetailsScreen(
                        selectedDate: day,
                        events: _events,
                        onDateChanged: (DateTime newDate) {
                          setState(() {
                            _selectedDate = newDate;
                          });
                        },
                      ),
                    ),
                  );
                  
                  // Refresh the calendar view after returning
                  setState(() {});
                },
                child: Container(
                  decoration: BoxDecoration(
                    color: isToday
                        ? Theme.of(context).colorScheme.primary
                        : isCurrentMonth
                            ? Theme.of(context).colorScheme.surface
                            : Theme.of(context).colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(5),
                    border: _selectedDate.day == day.day && _selectedDate.month == day.month
                        ? Border.all(color: Theme.of(context).colorScheme.primary, width: 2)
                        : hasEvents
                            ? Border.all(color: Colors.green, width: 2)
                            : null,
                    boxShadow: hasEvents
                        ? [
                            BoxShadow(
                              color: Colors.green.withOpacity(0.5),
                              blurRadius: 8,
                              spreadRadius: 0,
                            ),
                          ]
                        : null,
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        '${day.day}',
                        style: TextStyle(
                          color: isToday 
                              ? Theme.of(context).colorScheme.onPrimary
                              : isCurrentMonth
                                  ? Theme.of(context).colorScheme.onSurface
                                  : Theme.of(context).colorScheme.onSurfaceVariant,
                          fontWeight: isToday ? FontWeight.bold : FontWeight.normal,
                        ),
                      ),
                      if (hasEvents)
                        Container(
                          margin: const EdgeInsets.only(top: 4),
                          width: 6,
                          height: 6,
                          decoration: BoxDecoration(
                            color: isToday 
                                ? Theme.of(context).colorScheme.onPrimary
                                : Theme.of(context).colorScheme.primary,
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

        // Smart Event Creator Button
        _buildSmartEventCreatorButton(),

        // Categories Section
        _buildCategoriesSection(),

        // Quick Status Section
        _buildQuickStatusSection(),

        // Quick Actions Section
        _buildQuickActionsSection(),

        // App Integration Section
        _buildAppIntegrationSection(),
        ],
      ),
    );
  }

  Widget _buildCategoriesSection() {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'calendar.categories'.tr(),
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              IconButton(
                icon: const Icon(Icons.add),
                onPressed: () {
                  _showCreateCategoryDialog();
                },
                style: IconButton.styleFrom(
                  backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                  iconSize: 20,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ..._categories.map((category) {
            // Count events for this category
            final categoryEventCount = _events.where((event) =>
              event.categoryId == category.id
            ).length;

            // Debug: Print icon value

            // Replace problematic calendar emoji with spiral calendar
            String displayIcon = category.icon ?? '';
            if (displayIcon == '📅') {
              displayIcon = '🗓️';
            }

            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                onTap: () {
                  _showEditCategoryDialog(category);
                },
                leading: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: _parseColorFromHex(category.color).withOpacity(0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      alignment: Alignment.center,
                      child: displayIcon.isNotEmpty
                          ? Text(
                              displayIcon,
                              style: const TextStyle(
                                fontSize: 20,
                              ),
                              textAlign: TextAlign.center,
                            )
                          : Container(
                              width: 16,
                              height: 16,
                              decoration: BoxDecoration(
                                color: _parseColorFromHex(category.color),
                                shape: BoxShape.circle,
                              ),
                            ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      width: 4,
                      height: 36,
                      decoration: BoxDecoration(
                        color: _parseColorFromHex(category.color),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ],
                ),
                title: Text(category.name),
                subtitle: category.description != null && category.description!.isNotEmpty
                    ? Text(
                        category.description!,
                        style: Theme.of(context).textTheme.bodySmall,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      )
                    : null,
                trailing: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.secondaryContainer,
                    borderRadius: BorderRadius.circular(5),
                  ),
                  child: Text(
                    '$categoryEventCount',
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.onSecondaryContainer,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildQuickStatusSection() {
    final totalEvents = _events.length;
    final thisWeekEvents = _events.where((event) {
      final now = DateTime.now();
      final weekStart = now.subtract(Duration(days: now.weekday - 1));
      final weekEnd = weekStart.add(const Duration(days: 6));
      return event.startTime.isAfter(weekStart) && event.startTime.isBefore(weekEnd);
    }).length;
    final upcomingEvents = _events.where((event) => 
      event.startTime.isAfter(DateTime.now())
    ).length;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'calendar.quick_status'.tr(),
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildStatusCard(
                  'calendar.total_events'.tr(),
                  totalEvents.toString(),
                  Icons.event,
                  Theme.of(context).colorScheme.primary,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildStatusCard(
                  'calendar.this_week'.tr(),
                  thisWeekEvents.toString(),
                  Icons.calendar_today,
                  Colors.orange,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildStatusCard(
                  'calendar.upcoming'.tr(),
                  upcomingEvents.toString(),
                  Icons.upcoming,
                  Colors.green,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatusCard(String title, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(5),
        border: Border.all(
          color: color.withValues(alpha: 0.3),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 8),
          Text(
            value,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          Text(
            title,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActionsSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'calendar.quick_actions'.tr(),
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              OutlinedButton.icon(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const MeetingRoomBookingScreen(),
                    ),
                  );
                },
                icon: const Icon(Icons.meeting_room),
                label: Text('calendar.manage_meeting_rooms'.tr()),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(5),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              // OutlinedButton.icon(
              //   onPressed: () {
              //     _showImportCalendarDialog();
              //   },
              //   icon: const Icon(Icons.file_upload),
              //   label: const Text('Import Calendar'),
              //   style: OutlinedButton.styleFrom(
              //     padding: const EdgeInsets.symmetric(vertical: 16),
              //     shape: RoundedRectangleBorder(
              //       borderRadius: BorderRadius.circular(5),
              //     ),
              //   ),
              // ),
              // const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: () {
                  _showExportCalendarDialog();
                },
                icon: const Icon(Icons.file_download),
                label: Text('calendar.export_calendar'.tr()),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(5),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              // Calendar Settings button - Commented out
              // OutlinedButton.icon(
              //   onPressed: () {
              //     _showCalendarSettingsDialog();
              //   },
              //   icon: const Icon(Icons.settings),
              //   label: const Text('Calendar Settings'),
              //   style: OutlinedButton.styleFrom(
              //     padding: const EdgeInsets.symmetric(vertical: 16),
              //     shape: RoundedRectangleBorder(
              //       borderRadius: BorderRadius.circular(5),
              //     ),
              //   ),
              // ),
            ],
          ),
        ],
      ),
    );
  }

  /// Build the App Integration section
  Widget _buildAppIntegrationSection() {
    final isConnected = _googleCalendarConnection != null;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final borderColor = isDark ? const Color(0xFF30363D) : Colors.grey[300]!;
    final surfaceColor = isDark ? const Color(0xFF161B22) : Colors.white;

    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'calendar.app_integration'.tr(),
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),

          // Google Calendar Integration Card
          Container(
            decoration: BoxDecoration(
              color: surfaceColor,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: borderColor),
            ),
            child: Column(
              children: [
                // Header
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      // Google Calendar Icon
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: const Color(0xFF4285F4).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(
                          Icons.calendar_month,
                          color: Color(0xFF4285F4),
                          size: 24,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(
                                  'google_calendar.title'.tr(),
                                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                if (isConnected) ...[
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 3,
                                    ),
                                    decoration: BoxDecoration(
                                      color: Colors.green.withValues(alpha: 0.1),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Icon(
                                          Icons.check_circle,
                                          size: 12,
                                          color: Colors.green,
                                        ),
                                        const SizedBox(width: 4),
                                        Text(
                                          'google_calendar.connected'.tr(),
                                          style: const TextStyle(
                                            fontSize: 10,
                                            color: Colors.green,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ],
                            ),
                            const SizedBox(height: 4),
                            if (isConnected)
                              Text(
                                _googleCalendarConnection!.googleEmail,
                                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: Theme.of(context).colorScheme.primary,
                                ),
                              )
                            else
                              Text(
                                'google_calendar.description'.tr(),
                                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                                ),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                // Action buttons
                if (_isGoogleCalendarLoading)
                  const Padding(
                    padding: EdgeInsets.all(16),
                    child: Center(
                      child: SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    ),
                  )
                else if (isConnected) ...[
                  // Show sync info and buttons
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Row(
                      children: [
                        Icon(
                          Icons.sync,
                          size: 16,
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'google_calendar.last_synced'.tr(
                              args: [_googleCalendarConnection!.lastSyncedAgo],
                            ),
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0xFF4285F4).withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            'google_calendar.auto_sync'.tr(),
                            style: const TextStyle(
                              fontSize: 10,
                              color: Color(0xFF4285F4),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    child: Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: _isGoogleCalendarSyncing ? null : _syncGoogleCalendar,
                            icon: _isGoogleCalendarSyncing
                                ? const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(strokeWidth: 2),
                                  )
                                : const Icon(Icons.sync, size: 18),
                            label: Text(
                              _isGoogleCalendarSyncing
                                  ? 'google_calendar.syncing'.tr()
                                  : 'google_calendar.sync_now'.tr(),
                            ),
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        OutlinedButton.icon(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => const CalendarSettingsScreen(),
                              ),
                            ).then((_) {
                              _loadGoogleCalendarConnection();
                              _loadEvents();
                            });
                          },
                          icon: const Icon(Icons.settings, size: 18),
                          label: Text('apps.manage'.tr()),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 12,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ] else ...[
                  // Not connected - show connect prompt
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    child: Column(
                      children: [
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton.icon(
                            onPressed: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => const CalendarSettingsScreen(),
                                ),
                              ).then((_) {
                                _loadGoogleCalendarConnection();
                              });
                            },
                            icon: const Icon(Icons.settings, size: 18),
                            label: Text('google_calendar.connect_from_apps'.tr()),
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              side: const BorderSide(color: Color(0xFF4285F4)),
                              foregroundColor: const Color(0xFF4285F4),
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'google_calendar.connect_from_apps_hint'.tr(),
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                            fontStyle: FontStyle.italic,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Build the highlighted Smart Event Creator button
  Widget _buildSmartEventCreatorButton() {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: ElevatedButton.icon(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => const SmartEventCreatorScreen(),
            ),
          );
        },
        icon: const Icon(Icons.auto_awesome),
        label: Text('calendar.smart_event_creator'.tr()),
        style: ElevatedButton.styleFrom(
          backgroundColor: Theme.of(context).colorScheme.primary,
          foregroundColor: Theme.of(context).colorScheme.onPrimary,
          padding: const EdgeInsets.symmetric(vertical: 16),
          minimumSize: const Size(double.infinity, 52),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          elevation: 2,
        ),
      ),
    );
  }

  DateTime _getDayForIndex(int index) {
    final firstDayOfMonth = DateTime(_selectedDate.year, _selectedDate.month, 1);
    final firstDayWeekday = firstDayOfMonth.weekday;
    final startDate = firstDayOfMonth.subtract(Duration(days: firstDayWeekday - 1));
    return startDate.add(Duration(days: index));
  }

  List<CalendarEvent> _getEventsForDay(DateTime day) {
    return _events.where((event) {
      return event.startTime.year == day.year &&
             event.startTime.month == day.month &&
             event.startTime.day == day.day;
    }).toList();
  }

  bool _isToday(DateTime day) {
    final now = DateTime.now();
    return day.year == now.year && day.month == now.month && day.day == now.day;
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
      'calendar.month_december'.tr(),
    ];
    return months[month - 1];
  }


  // Helper method to parse color from hex string
  Color _parseColorFromHex(String hexColor) {
    try {
      final hex = hexColor.replaceAll('#', '');
      if (hex.length == 6) {
        return Color(int.parse('FF$hex', radix: 16));
      } else if (hex.length == 8) {
        return Color(int.parse(hex, radix: 16));
      }
    } catch (e) {
    }
    return Colors.blue; // Default color
  }
  
  // Helper method to convert Color to hex string
  String _colorToHex(Color color) {
    return '#${color.value.toRadixString(16).substring(2)}';
  }

  void _showCreateCategoryDialog() {
    Color selectedColor = Colors.red;
    IconData? selectedIcon;
    final TextEditingController nameController = TextEditingController();
    final TextEditingController descriptionController = TextEditingController();
    
    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => Dialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(5),
          ),
          child: Container(
            width: MediaQuery.of(context).size.width * 0.9,
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.9,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Header
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'calendar.create_new_category'.tr(),
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                
                // Scrollable Content
                Flexible(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                
                // Name Field
                Text(
                  'calendar.name_label'.tr(),
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: nameController,
                  decoration: InputDecoration(
                    hintText: 'calendar.category_name_hint'.tr(),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(5),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                
                // Description Field
                Text(
                  'calendar.description_optional'.tr(),
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: descriptionController,
                  maxLines: 3,
                  decoration: InputDecoration(
                    hintText: 'calendar.category_description_hint'.tr(),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(5),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                
                // Color Selection
                Row(
                  children: [
                    Icon(Icons.palette, size: 20),
                    const SizedBox(width: 8),
                    Text(
                      'calendar.color_label'.tr(),
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: [
                    _buildColorOption(Colors.red, selectedColor == Colors.red, 
                      () => setState(() => selectedColor = Colors.red)),
                    _buildColorOption(Colors.orange, selectedColor == Colors.orange,
                      () => setState(() => selectedColor = Colors.orange)),
                    _buildColorOption(Colors.amber, selectedColor == Colors.amber,
                      () => setState(() => selectedColor = Colors.amber)),
                    _buildColorOption(Colors.green, selectedColor == Colors.green,
                      () => setState(() => selectedColor = Colors.green)),
                    _buildColorOption(Colors.cyan, selectedColor == Colors.cyan,
                      () => setState(() => selectedColor = Colors.cyan)),
                    _buildColorOption(Colors.blue, selectedColor == Colors.blue,
                      () => setState(() => selectedColor = Colors.blue)),
                    _buildColorOption(Colors.purple, selectedColor == Colors.purple,
                      () => setState(() => selectedColor = Colors.purple)),
                    _buildColorOption(Colors.pink, selectedColor == Colors.pink,
                      () => setState(() => selectedColor = Colors.pink)),
                    _buildColorOption(Colors.grey, selectedColor == Colors.grey,
                      () => setState(() => selectedColor = Colors.grey)),
                    _buildColorOption(Colors.brown, selectedColor == Colors.brown,
                      () => setState(() => selectedColor = Colors.brown)),
                  ],
                ),
                const SizedBox(height: 12),
                Container(
                  height: 4,
                  decoration: BoxDecoration(
                    color: selectedColor,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 20),
                
                // Icon Selection
                Text(
                  'calendar.icon_optional'.tr(),
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: [
                    _buildIconOption(Icons.calendar_today, selectedIcon == Icons.calendar_today,
                      () => setState(() => selectedIcon = Icons.calendar_today)),
                    _buildIconOption(Icons.work, selectedIcon == Icons.work,
                      () => setState(() => selectedIcon = Icons.work)),
                    _buildIconOption(Icons.home, selectedIcon == Icons.home,
                      () => setState(() => selectedIcon = Icons.home)),
                    _buildIconOption(Icons.school, selectedIcon == Icons.school,
                      () => setState(() => selectedIcon = Icons.school)),
                    _buildIconOption(Icons.sports_soccer, selectedIcon == Icons.sports_soccer,
                      () => setState(() => selectedIcon = Icons.sports_soccer)),
                    _buildIconOption(Icons.edit, selectedIcon == Icons.edit,
                      () => setState(() => selectedIcon = Icons.edit)),
                    _buildIconOption(Icons.flight, selectedIcon == Icons.flight,
                      () => setState(() => selectedIcon = Icons.flight)),
                    _buildIconOption(Icons.restaurant, selectedIcon == Icons.restaurant,
                      () => setState(() => selectedIcon = Icons.restaurant)),
                    _buildIconOption(Icons.celebration, selectedIcon == Icons.celebration,
                      () => setState(() => selectedIcon = Icons.celebration)),
                    _buildIconOption(Icons.fitness_center, selectedIcon == Icons.fitness_center,
                      () => setState(() => selectedIcon = Icons.fitness_center)),
                  ],
                ),
                      ],
                    ),
                  ),
                ),
                
                // Action Buttons (Outside scroll area)
                Container(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
                  decoration: BoxDecoration(
                    border: Border(
                      top: BorderSide(
                        color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.2),
                      ),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      TextButton(
                        onPressed: () => Navigator.pop(context),
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        ),
                        child: Text('common.cancel'.tr()),
                      ),
                      const SizedBox(width: 12),
                      Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              context.primaryColor,
                              Color(0xFF8B6BFF),
                            ],
                            begin: Alignment.centerLeft,
                            end: Alignment.centerRight,
                          ),
                          borderRadius: BorderRadius.circular(5),
                        ),
                        child: ElevatedButton(
                          onPressed: () async {
                            if (nameController.text.trim().isEmpty) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('calendar.enter_category_name'.tr()),
                                  backgroundColor: Colors.red,
                                ),
                              );
                              return;
                            }
                            
                            // Check if category already exists
                            final exists = _categories.any(
                              (cat) => cat.name.toLowerCase() == 
                                      nameController.text.trim().toLowerCase()
                            );
                            
                            if (exists) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('calendar.category_exists'.tr()),
                                  backgroundColor: Colors.orange,
                                ),
                              );
                              return;
                            }

                            // Get current workspace
                            final currentWorkspace = _workspaceService.currentWorkspace;
                            if (currentWorkspace == null) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('calendar.no_workspace_selected'.tr()),
                                  backgroundColor: Colors.red,
                                ),
                              );
                              return;
                            }

                            // Get icon name
                            final iconName = _getIconName(selectedIcon);

                            // Create category via API
                            try {
                              final dto = api.CreateEventCategoryDto(
                                name: nameController.text.trim(),
                                description: descriptionController.text.trim().isEmpty
                                    ? null
                                    : descriptionController.text.trim(),
                                color: _colorToHex(selectedColor),
                                icon: iconName,
                              );

                              final response = await _calendarApi.createEventCategory(
                                currentWorkspace.id,
                                dto,
                              );

                              if (response.isSuccess && response.data != null) {
                                setState(() {
                                  _categories.add(response.data!);
                                });

                                if (mounted) {
                                  Navigator.pop(context);
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text('calendar.category_created'.tr(args: [nameController.text.trim()])),
                                      backgroundColor: Colors.green,
                                    ),
                                  );
                                }
                              } else {
                                throw Exception(response.message);
                              }
                            } catch (e) {
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text('calendar.failed_create_category'.tr(args: ['$e'])),
                                    backgroundColor: Colors.red,
                                  ),
                                );
                              }
                            }
                          },
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                            backgroundColor: Colors.transparent,
                            shadowColor: Colors.transparent,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(5),
                            ),
                          ),
                          child: Text(
                            'calendar.create_category_btn'.tr(),
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w600,
                            ),
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

  void _showEditCategoryDialog(api.EventCategory category) {
    final TextEditingController nameController = TextEditingController(text: category.name);
    final TextEditingController descriptionController = TextEditingController(text: category.description ?? '');

    Color selectedColor = _parseColorFromHex(category.color);
    IconData? selectedIcon = _getIconDataFromEmoji(category.icon);

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => Dialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(5),
          ),
          child: Container(
            width: MediaQuery.of(context).size.width * 0.9,
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.9,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Header
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surface,
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(5),
                      topRight: Radius.circular(5),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'calendar.edit_category_title'.tr(),
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.pop(context),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                    ],
                  ),
                ),

                // Body
                Flexible(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Name Field
                        Text(
                          'calendar.category_name_required'.tr(),
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          controller: nameController,
                          decoration: InputDecoration(
                            hintText: 'calendar.category_name_hint'.tr(),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(5),
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Description Field
                        Text(
                          'calendar.description_optional'.tr(),
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          controller: descriptionController,
                          decoration: InputDecoration(
                            hintText: 'calendar.description_hint'.tr(),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(5),
                            ),
                          ),
                          maxLines: 3,
                        ),
                        const SizedBox(height: 20),

                        // Color Selection
                        Text(
                          'calendar.color_label'.tr(),
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 12,
                          runSpacing: 12,
                          children: [
                            _buildColorOption(Colors.blue, selectedColor == Colors.blue,
                              () => setState(() => selectedColor = Colors.blue)),
                            _buildColorOption(Colors.green, selectedColor == Colors.green,
                              () => setState(() => selectedColor = Colors.green)),
                            _buildColorOption(Colors.orange, selectedColor == Colors.orange,
                              () => setState(() => selectedColor = Colors.orange)),
                            _buildColorOption(Colors.red, selectedColor == Colors.red,
                              () => setState(() => selectedColor = Colors.red)),
                            _buildColorOption(Colors.purple, selectedColor == Colors.purple,
                              () => setState(() => selectedColor = Colors.purple)),
                            _buildColorOption(Colors.pink, selectedColor == Colors.pink,
                              () => setState(() => selectedColor = Colors.pink)),
                            _buildColorOption(Colors.teal, selectedColor == Colors.teal,
                              () => setState(() => selectedColor = Colors.teal)),
                            _buildColorOption(Colors.amber, selectedColor == Colors.amber,
                              () => setState(() => selectedColor = Colors.amber)),
                            _buildColorOption(Colors.indigo, selectedColor == Colors.indigo,
                              () => setState(() => selectedColor = Colors.indigo)),
                            _buildColorOption(Colors.brown, selectedColor == Colors.brown,
                              () => setState(() => selectedColor = Colors.brown)),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Container(
                          height: 4,
                          decoration: BoxDecoration(
                            color: selectedColor,
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                        const SizedBox(height: 20),

                        // Icon Selection
                        Text(
                          'calendar.icon_optional'.tr(),
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 12,
                          runSpacing: 12,
                          children: [
                            _buildIconOption(Icons.calendar_today, selectedIcon == Icons.calendar_today,
                              () => setState(() => selectedIcon = Icons.calendar_today)),
                            _buildIconOption(Icons.work, selectedIcon == Icons.work,
                              () => setState(() => selectedIcon = Icons.work)),
                            _buildIconOption(Icons.home, selectedIcon == Icons.home,
                              () => setState(() => selectedIcon = Icons.home)),
                            _buildIconOption(Icons.school, selectedIcon == Icons.school,
                              () => setState(() => selectedIcon = Icons.school)),
                            _buildIconOption(Icons.sports_soccer, selectedIcon == Icons.sports_soccer,
                              () => setState(() => selectedIcon = Icons.sports_soccer)),
                            _buildIconOption(Icons.edit, selectedIcon == Icons.edit,
                              () => setState(() => selectedIcon = Icons.edit)),
                            _buildIconOption(Icons.flight, selectedIcon == Icons.flight,
                              () => setState(() => selectedIcon = Icons.flight)),
                            _buildIconOption(Icons.restaurant, selectedIcon == Icons.restaurant,
                              () => setState(() => selectedIcon = Icons.restaurant)),
                            _buildIconOption(Icons.celebration, selectedIcon == Icons.celebration,
                              () => setState(() => selectedIcon = Icons.celebration)),
                            _buildIconOption(Icons.fitness_center, selectedIcon == Icons.fitness_center,
                              () => setState(() => selectedIcon = Icons.fitness_center)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),

                // Action Buttons
                Container(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
                  decoration: BoxDecoration(
                    border: Border(
                      top: BorderSide(
                        color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.2),
                      ),
                    ),
                  ),
                  child: Row(
                    children: [
                      // Delete Button
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () async {
                            final confirm = await showDialog<bool>(
                              context: context,
                              builder: (context) => AlertDialog(
                                title: Text('calendar.delete_category'.tr()),
                                content: Text('calendar.delete_category_confirm'.tr(args: [category.name])),
                                actions: [
                                  TextButton(
                                    onPressed: () => Navigator.pop(context, false),
                                    child: Text('common.cancel'.tr()),
                                  ),
                                  TextButton(
                                    onPressed: () => Navigator.pop(context, true),
                                    style: TextButton.styleFrom(
                                      foregroundColor: Colors.red,
                                    ),
                                    child: Text('common.delete'.tr()),
                                  ),
                                ],
                              ),
                            );

                            if (confirm == true && mounted) {
                              try {
                                final currentWorkspace = _workspaceService.currentWorkspace;
                                if (currentWorkspace == null) {
                                  throw Exception('calendar.no_workspace_selected'.tr());
                                }

                                final response = await _calendarApi.deleteEventCategory(
                                  currentWorkspace.id,
                                  category.id,
                                );

                                if (response.isSuccess) {
                                  this.setState(() {
                                    _categories.removeWhere((c) => c.id == category.id);
                                  });

                                  if (mounted) {
                                    Navigator.pop(context);
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text('calendar.category_deleted'.tr()),
                                        backgroundColor: Colors.green,
                                      ),
                                    );
                                  }
                                } else {
                                  throw Exception(response.message);
                                }
                              } catch (e) {
                                if (mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text('calendar.failed_delete_category'.tr(args: ['$e'])),
                                      backgroundColor: Colors.red,
                                    ),
                                  );
                                }
                              }
                            }
                          },
                          icon: const Icon(Icons.delete),
                          label: Text('common.delete'.tr()),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.red,
                            side: const BorderSide(color: Colors.red),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      // Cancel Button
                      TextButton(
                        onPressed: () => Navigator.pop(context),
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        ),
                        child: Text('common.cancel'.tr()),
                      ),
                      const SizedBox(width: 12),
                      // Update Button
                      Expanded(
                        child: Container(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [context.primaryColor, Color(0xFF8B6BFF)],
                              begin: Alignment.centerLeft,
                              end: Alignment.centerRight,
                            ),
                            borderRadius: BorderRadius.circular(5),
                          ),
                          child: ElevatedButton(
                            onPressed: () async {
                              if (nameController.text.trim().isEmpty) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text('calendar.enter_category_name'.tr()),
                                    backgroundColor: Colors.red,
                                  ),
                                );
                                return;
                              }

                              try {
                                final currentWorkspace = _workspaceService.currentWorkspace;
                                if (currentWorkspace == null) {
                                  throw Exception('calendar.no_workspace_selected'.tr());
                                }

                                final updateData = {
                                  'name': nameController.text.trim(),
                                  'description': descriptionController.text.trim().isEmpty
                                      ? null
                                      : descriptionController.text.trim(),
                                  'color': _colorToHex(selectedColor),
                                  'icon': _getIconName(selectedIcon),
                                };

                                final response = await _calendarApi.updateEventCategory(
                                  currentWorkspace.id,
                                  category.id,
                                  updateData,
                                );

                                if (response.isSuccess && response.data != null) {
                                  this.setState(() {
                                    final index = _categories.indexWhere((c) => c.id == category.id);
                                    if (index != -1) {
                                      _categories[index] = response.data!;
                                    }
                                  });

                                  if (mounted) {
                                    Navigator.pop(context);
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text('calendar.category_updated'.tr()),
                                        backgroundColor: Colors.green,
                                      ),
                                    );
                                  }
                                } else {
                                  throw Exception(response.message);
                                }
                              } catch (e) {
                                if (mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text('calendar.failed_update_category'.tr(args: ['$e'])),
                                      backgroundColor: Colors.red,
                                    ),
                                  );
                                }
                              }
                            },
                            style: ElevatedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              backgroundColor: Colors.transparent,
                              shadowColor: Colors.transparent,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(5),
                              ),
                            ),
                            child: Text(
                              'calendar.update_btn'.tr(),
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
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

  IconData? _getIconDataFromEmoji(String? emoji) {
    if (emoji == null || emoji.isEmpty) return null;
    if (emoji == '🗓️' || emoji == '📅') return Icons.calendar_today;
    if (emoji == '💼') return Icons.work;
    if (emoji == '👤') return Icons.person;
    if (emoji == '📞') return Icons.phone;
    if (emoji == '🏠') return Icons.home;
    if (emoji == '🏫') return Icons.school;
    if (emoji == '⚽') return Icons.sports_soccer;
    if (emoji == '✏️') return Icons.edit;
    if (emoji == '✈️') return Icons.flight;
    if (emoji == '🍽️') return Icons.restaurant;
    if (emoji == '🎉') return Icons.celebration;
    if (emoji == '💪') return Icons.fitness_center;
    return Icons.calendar_today;
  }

  Widget _buildColorOption(Color color, bool isSelected, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(5),
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
          border: Border.all(
            color: isSelected ? Theme.of(context).colorScheme.primary : Colors.transparent,
            width: 3,
          ),
        ),
        child: isSelected 
          ? Icon(
              Icons.check,
              color: Colors.white,
              size: 20,
            )
          : null,
      ),
    );
  }

  Widget _buildIconOption(IconData icon, bool isSelected, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(5),
      child: Container(
        width: 48,
        height: 48,
        decoration: BoxDecoration(
          color: isSelected 
            ? Theme.of(context).colorScheme.primaryContainer
            : Theme.of(context).colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(5),
          border: Border.all(
            color: isSelected 
              ? Theme.of(context).colorScheme.primary 
              : Colors.transparent,
            width: 2,
          ),
        ),
        child: Text(
          _getIconName(icon),
          style: const TextStyle(fontSize: 24),
        ),
      ),
    );
  }

  String _getIconName(IconData? icon) {
    // Map IconData to emoji (avoiding 📅 as it renders as a date widget on Android)
    if (icon == null) return '🗓️';
    if (icon == Icons.calendar_today) return '🗓️';
    if (icon == Icons.work) return '💼';
    if (icon == Icons.person) return '👤';
    if (icon == Icons.event) return '🗓️';
    if (icon == Icons.phone) return '📞';
    if (icon == Icons.home) return '🏠';
    if (icon == Icons.school) return '🏫';
    if (icon == Icons.sports_soccer) return '⚽';
    if (icon == Icons.edit) return '✏️';
    if (icon == Icons.flight) return '✈️';
    if (icon == Icons.restaurant) return '🍽️';
    if (icon == Icons.celebration) return '🎉';
    if (icon == Icons.fitness_center) return '💪';
    return '🗓️'; // default
  }

  // Calendar Settings Dialog - Commented out
  // void _showCalendarSettingsDialog() {
  //   showDialog(
  //     context: context,
  //     barrierDismissible: false,
  //     builder: (context) => StatefulBuilder(
  //       builder: (context, setState) => Dialog(
  //         shape: RoundedRectangleBorder(
  //           borderRadius: BorderRadius.circular(5),
  //         ),
  //         child: Container(
  //           width: MediaQuery.of(context).size.width * 0.9,
  //           constraints: BoxConstraints(
  //             maxHeight: MediaQuery.of(context).size.height * 0.9,
  //           ),
  //           child: Column(
  //             mainAxisSize: MainAxisSize.min,
  //             children: [
  //               // Header
  //               Container(
  //                 padding: const EdgeInsets.all(16),
  //                 decoration: BoxDecoration(
  //                   color: Theme.of(context).colorScheme.surface,
  //                   borderRadius: const BorderRadius.only(
  //                     topLeft: Radius.circular(5),
  //                     topRight: Radius.circular(5),
  //                   ),
  //                 ),
  //                 child: Row(
  //                   mainAxisAlignment: MainAxisAlignment.spaceBetween,
  //                   children: [
  //                     Text(
  //                       'Calendar Settings',
  //                       style: Theme.of(context).textTheme.headlineSmall?.copyWith(
  //                         fontWeight: FontWeight.bold,
  //                       ),
  //                     ),
  //                     IconButton(
  //                       icon: const Icon(Icons.close),
  //                       onPressed: () => Navigator.pop(context),
  //                     ),
  //                   ],
  //                 ),
  //               ),
  //               // Body
  //               Expanded(
  //                 child: SingleChildScrollView(
  //                   child: Padding(
  //                     padding: const EdgeInsets.all(16),
  //                     child: Column(
  //                       crossAxisAlignment: CrossAxisAlignment.start,
  //                       children: [
  //                         // Display Settings
  //                         Text(
  //                           'Display Settings',
  //                           style: Theme.of(context).textTheme.titleLarge?.copyWith(
  //                             fontWeight: FontWeight.bold,
  //                           ),
  //                         ),
  //                         const SizedBox(height: 20),
  //
  //                         // Show weekends toggle
  //                         _buildSettingTile(
  //                           title: 'Show weekends',
  //                           subtitle: 'Display Saturday and Sunday in calendar views',
  //                           value: _showWeekends,
  //                           onChanged: (value) {
  //                             setState(() {
  //                               _showWeekends = value;
  //                             });
  //                             this.setState(() {
  //                               _showWeekends = value;
  //                             });
  //                           },
  //                         ),
  //
  //                         // 24-hour format toggle
  //                         _buildSettingTile(
  //                           title: '24-hour time format',
  //                           subtitle: 'Use 24-hour format instead of AM/PM',
  //                           value: _use24HourFormat,
  //                           onChanged: (value) {
  //                             setState(() {
  //                               _use24HourFormat = value;
  //                             });
  //                             this.setState(() {
  //                               _use24HourFormat = value;
  //                             });
  //                           },
  //                         ),
  //
  //                         // Show week numbers toggle
  //                         _buildSettingTile(
  //                           title: 'Show week numbers',
  //                           subtitle: 'Display week numbers in calendar views',
  //                           value: _showWeekNumbers,
  //                           onChanged: (value) {
  //                             setState(() {
  //                               _showWeekNumbers = value;
  //                             });
  //                             this.setState(() {
  //                               _showWeekNumbers = value;
  //                             });
  //                           },
  //                         ),
  //
  //                         const SizedBox(height: 40),
  //
  //                         // Notification Settings
  //                         Text(
  //                           'Notification Settings',
  //                           style: Theme.of(context).textTheme.titleLarge?.copyWith(
  //                             fontWeight: FontWeight.bold,
  //                           ),
  //                         ),
  //                         const SizedBox(height: 20),
  //
  //                         // Default event reminders toggle
  //                         _buildSettingTile(
  //                           title: 'Default event reminders',
  //                           subtitle: 'Automatically add reminders to new events',
  //                           value: _defaultEventReminders,
  //                           onChanged: (value) {
  //                             setState(() {
  //                               _defaultEventReminders = value;
  //                             });
  //                             this.setState(() {
  //                               _defaultEventReminders = value;
  //                             });
  //                           },
  //                         ),
  //
  //                         // Conflict alerts toggle
  //                         _buildSettingTile(
  //                           title: 'Conflict alerts',
  //                           subtitle: 'Warn when scheduling overlapping events',
  //                           value: _conflictAlerts,
  //                           onChanged: (value) {
  //                             setState(() {
  //                               _conflictAlerts = value;
  //                             });
  //                             this.setState(() {
  //                               _conflictAlerts = value;
  //                             });
  //                           },
  //                         ),
  //
  //                         const SizedBox(height: 40),
  //
  //                         // Export & Sync
  //                         Text(
  //                           'Export & Sync',
  //                           style: Theme.of(context).textTheme.titleLarge?.copyWith(
  //                             fontWeight: FontWeight.bold,
  //                           ),
  //                         ),
  //                         const SizedBox(height: 20),
  //
  //                         // Export Calendar button
  //                         Container(
  //                           width: double.infinity,
  //                           decoration: BoxDecoration(
  //                             border: Border.all(
  //                               color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.3),
  //                             ),
  //                             borderRadius: BorderRadius.circular(5),
  //                           ),
  //                           child: InkWell(
  //                             onTap: () {
  //                               _exportCalendar();
  //                             },
  //                             borderRadius: BorderRadius.circular(5),
  //                             child: Padding(
  //                               padding: const EdgeInsets.all(16),
  //                               child: Row(
  //                                 children: [
  //                                   Icon(
  //                                     Icons.download,
  //                                     color: Theme.of(context).colorScheme.onSurface,
  //                                     size: 20,
  //                                   ),
  //                                   const SizedBox(width: 12),
  //                                   Expanded(
  //                                     child: Text(
  //                                       'Export Calendar (.ics)',
  //                                       style: Theme.of(context).textTheme.bodyMedium,
  //                                     ),
  //                                   ),
  //                                 ],
  //                               ),
  //                             ),
  //                           ),
  //                         ),
  //
  //                         const SizedBox(height: 12),
  //
  //                         // Sync with Google Calendar button
  //                         Container(
  //                           width: double.infinity,
  //                           decoration: BoxDecoration(
  //                             border: Border.all(
  //                               color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.3),
  //                             ),
  //                             borderRadius: BorderRadius.circular(5),
  //                           ),
  //                           child: InkWell(
  //                             onTap: () {
  //                               ScaffoldMessenger.of(context).showSnackBar(
  //                                 SnackBar(
  //                                   content: Text('Google Calendar sync coming soon!'),
  //                                 ),
  //                               );
  //                             },
  //                             borderRadius: BorderRadius.circular(5),
  //                             child: Padding(
  //                               padding: const EdgeInsets.all(16),
  //                               child: Row(
  //                                 children: [
  //                                   Icon(
  //                                     Icons.sync,
  //                                     color: Theme.of(context).colorScheme.onSurface,
  //                                     size: 20,
  //                                   ),
  //                                   const SizedBox(width: 12),
  //                                   Expanded(
  //                                     child: Text(
  //                                       'Sync with Google Calendar',
  //                                       style: Theme.of(context).textTheme.bodyMedium,
  //                                     ),
  //                                   ),
  //                                 ],
  //                               ),
  //                             ),
  //                           ),
  //                         ),
  //                       ],
  //                     ),
  //                   ),
  //                 ),
  //               ),
  //             ],
  //           ),
  //         ),
  //       ),
  //     ),
  //   );
  // }

  Widget _buildSettingTile({
    required String title,
    required String subtitle,
    required bool value,
    required void Function(bool) onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6),
                  ),
                ),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeColor: Theme.of(context).colorScheme.primary,
          ),
        ],
      ),
    );
  }

  Future<void> _exportCalendar() async {
    try {
      // Generate ICS content
      final StringBuffer icsContent = StringBuffer();
      icsContent.writeln('BEGIN:VCALENDAR');
      icsContent.writeln('VERSION:2.0');
      icsContent.writeln('PRODID:-//Deskive//Calendar Export//EN');
      icsContent.writeln('CALSCALE:GREGORIAN');
      icsContent.writeln('METHOD:PUBLISH');

      for (final event in _events) {
        icsContent.writeln('BEGIN:VEVENT');
        icsContent.writeln('UID:${event.id}@workspace-suite');
        icsContent.writeln('DTSTAMP:${_formatIcsDateTime(DateTime.now())}');
        icsContent.writeln('DTSTART:${_formatIcsDateTime(event.startTime)}');
        icsContent.writeln('DTEND:${_formatIcsDateTime(event.endTime)}');
        icsContent.writeln('SUMMARY:${event.title}');
        if (event.description != null && event.description!.isNotEmpty) {
          icsContent.writeln('DESCRIPTION:${event.description}');
        }
        if (event.location != null && event.location!.isNotEmpty) {
          icsContent.writeln('LOCATION:${event.location}');
        }
        icsContent.writeln('END:VEVENT');
      }

      icsContent.writeln('END:VCALENDAR');

      // Handle web platform
      if (kIsWeb) {
        final timestamp = DateTime.now().millisecondsSinceEpoch;
        final fileName = 'calendar_export_$timestamp.ics';
        final success = await FileDownloadHelper.downloadFile(
          content: icsContent.toString(),
          fileName: fileName,
          mimeType: 'text/calendar',
        );

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(success
                  ? 'calendar.export_success_web'.tr()
                  : 'calendar.export_failed'.tr(args: ['Download failed'])),
              backgroundColor: success ? Colors.green : Colors.red,
              duration: const Duration(seconds: 4),
            ),
          );
        }
        return;
      }

      // Non-web platforms: Request storage permission and save to file
      if (await _requestStoragePermission()) {
        // Save to file
        final directoryPath = await _getDownloadDirectoryPath();
        final timestamp = DateTime.now().millisecondsSinceEpoch;
        final filePath = '$directoryPath/calendar_export_$timestamp.ics';
        final file = File(filePath);
        await file.writeAsString(icsContent.toString());

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('calendar.export_success_ics'.tr(args: [directoryPath])),
              backgroundColor: Colors.green,
              duration: const Duration(seconds: 4),
            ),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('calendar.storage_permission_required'.tr()),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('calendar.export_failed'.tr(args: ['$e'])),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  String _formatIcsDateTime(DateTime dateTime) {
    // Convert to UTC if it's a local time
    final utcTime = dateTime.toUtc();
    return '${utcTime.year.toString().padLeft(4, '0')}'
           '${utcTime.month.toString().padLeft(2, '0')}'
           '${utcTime.day.toString().padLeft(2, '0')}'
           'T'
           '${utcTime.hour.toString().padLeft(2, '0')}'
           '${utcTime.minute.toString().padLeft(2, '0')}'
           '${utcTime.second.toString().padLeft(2, '0')}'
           'Z';
  }

  void _showExportCalendarDialog() {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(5),
        ),
        child: Container(
          width: MediaQuery.of(context).size.width * 0.9,
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'calendar.export_calendar'.tr(),
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                'Choose export format',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 24),

              // ICS Export Option
              _buildExportOption(
                context: context,
                icon: Icons.calendar_today,
                title: 'calendar.export_as_ics'.tr(),
                description: 'Standard calendar format for Google, Outlook, etc.',
                onTap: () {
                  Navigator.pop(context);
                  _exportCalendar();
                },
              ),

              const SizedBox(height: 12),

              // CSV Export Option
              _buildExportOption(
                context: context,
                icon: Icons.table_chart,
                title: 'calendar.export_as_csv'.tr(),
                description: 'Spreadsheet format for Excel, Google Sheets, etc.',
                onTap: () {
                  Navigator.pop(context);
                  _exportCalendarAsCsv();
                },
              ),

              const SizedBox(height: 12),

              // PDF Export Option
              _buildExportOption(
                context: context,
                icon: Icons.picture_as_pdf,
                title: 'calendar.export_as_pdf'.tr(),
                description: 'Printable document format',
                onTap: () {
                  Navigator.pop(context);
                  _exportCalendarAsPdf();
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildExportOption({
    required BuildContext context,
    required IconData icon,
    required String title,
    required String description,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(5),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          border: Border.all(
            color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.3),
          ),
          borderRadius: BorderRadius.circular(5),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                icon,
                color: Theme.of(context).colorScheme.primary,
                size: 24,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    description,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.chevron_right,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _exportCalendarAsCsv() async {
    try {
      // Generate CSV content
      final StringBuffer csvContent = StringBuffer();
      csvContent.writeln('Title,Start Date,End Date,Description,Location,Category');

      for (final event in _events) {
        final category = _categories.firstWhere(
          (cat) => cat.id == event.categoryId,
          orElse: () => api.EventCategory(
            id: '',
            workspaceId: '',
            name: 'Uncategorized',
            color: '#000000',
            icon: '',
            isDefault: false,
            createdBy: '',
            createdAt: DateTime.now(),
            updatedAt: DateTime.now(),
          ),
        );

        csvContent.write('"${event.title}",');
        csvContent.write('"${event.startTime.toIso8601String()}",');
        csvContent.write('"${event.endTime.toIso8601String()}",');
        csvContent.write('"${event.description ?? ''}",');
        csvContent.write('"${event.location ?? ''}",');
        csvContent.writeln('"${category.name}"');
      }

      // Handle web platform
      if (kIsWeb) {
        final timestamp = DateTime.now().millisecondsSinceEpoch;
        final fileName = 'calendar_export_$timestamp.csv';
        final success = await FileDownloadHelper.downloadFile(
          content: csvContent.toString(),
          fileName: fileName,
          mimeType: 'text/csv',
        );

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(success
                  ? 'calendar.export_success_web'.tr()
                  : 'calendar.export_csv_failed'.tr(args: ['Download failed'])),
              backgroundColor: success ? Colors.green : Colors.red,
              duration: const Duration(seconds: 4),
            ),
          );
        }
        return;
      }

      // Non-web platforms: Request storage permission and save to file
      if (await _requestStoragePermission()) {
        // Save to file
        final directoryPath = await _getDownloadDirectoryPath();
        final timestamp = DateTime.now().millisecondsSinceEpoch;
        final filePath = '$directoryPath/calendar_export_$timestamp.csv';
        final file = File(filePath);
        await file.writeAsString(csvContent.toString());

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('calendar.export_success_csv'.tr(args: [directoryPath])),
              backgroundColor: Colors.green,
              duration: const Duration(seconds: 4),
            ),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('calendar.storage_permission_required'.tr()),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('calendar.export_csv_failed'.tr(args: ['$e'])),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _exportCalendarAsPdf() async {
    try {
      // Create PDF document
      final pdf = pw.Document();

      // Add page with calendar events
      pdf.addPage(
        pw.MultiPage(
          pageFormat: PdfPageFormat.a4,
          build: (pw.Context context) {
            return [
              pw.Header(
                level: 0,
                child: pw.Text(
                  'Calendar Export',
                  style: pw.TextStyle(
                    fontSize: 24,
                    fontWeight: pw.FontWeight.bold,
                  ),
                ),
              ),
              pw.SizedBox(height: 20),
              pw.Text(
                'Total Events: ${_events.length}',
                style: const pw.TextStyle(fontSize: 12),
              ),
              pw.SizedBox(height: 20),
              pw.Table.fromTextArray(
                headers: ['Title', 'Start', 'End', 'Location', 'Category'],
                data: _events.map((event) {
                  final category = _categories.firstWhere(
                    (cat) => cat.id == event.categoryId,
                    orElse: () => api.EventCategory(
                      id: '',
                      workspaceId: '',
                      name: 'N/A',
                      color: '#000000',
                      icon: '',
                      isDefault: false,
                      createdBy: '',
                      createdAt: DateTime.now(),
                      updatedAt: DateTime.now(),
                    ),
                  );
                  return [
                    event.title,
                    _formatDateTime(event.startTime),
                    _formatDateTime(event.endTime),
                    event.location ?? 'N/A',
                    category.name,
                  ];
                }).toList(),
                cellAlignment: pw.Alignment.centerLeft,
                headerStyle: pw.TextStyle(
                  fontWeight: pw.FontWeight.bold,
                  fontSize: 10,
                ),
                cellStyle: const pw.TextStyle(fontSize: 9),
                border: pw.TableBorder.all(width: 0.5),
                headerDecoration: const pw.BoxDecoration(
                  color: PdfColors.grey300,
                ),
              ),
            ];
          },
        ),
      );

      final pdfBytes = await pdf.save();

      // Handle web platform
      if (kIsWeb) {
        final timestamp = DateTime.now().millisecondsSinceEpoch;
        final fileName = 'calendar_export_$timestamp.pdf';
        final success = await FileDownloadHelper.downloadBinaryFile(
          bytes: pdfBytes,
          fileName: fileName,
          mimeType: 'application/pdf',
        );

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(success
                  ? 'calendar.export_success_web'.tr()
                  : 'calendar.export_pdf_failed'.tr(args: ['Download failed'])),
              backgroundColor: success ? Colors.green : Colors.red,
              duration: const Duration(seconds: 4),
            ),
          );
        }
        return;
      }

      // Non-web platforms: Request storage permission and save to file
      if (await _requestStoragePermission()) {
        // Save to file
        final directoryPath = await _getDownloadDirectoryPath();
        final timestamp = DateTime.now().millisecondsSinceEpoch;
        final filePath = '$directoryPath/calendar_export_$timestamp.pdf';
        final file = File(filePath);
        await file.writeAsBytes(pdfBytes);

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('calendar.export_success_pdf'.tr(args: [directoryPath])),
              backgroundColor: Colors.green,
              duration: const Duration(seconds: 4),
            ),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('calendar.storage_permission_required'.tr()),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('calendar.export_pdf_failed'.tr(args: ['$e'])),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  String _formatDateTime(DateTime dateTime) {
    return '${dateTime.day}/${dateTime.month}/${dateTime.year} ${dateTime.hour}:${dateTime.minute.toString().padLeft(2, '0')}';
  }

  void _showImportCalendarDialog() {
    String? selectedFilePath;
    bool isLoading = false;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => Dialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(5),
          ),
          child: Container(
            width: MediaQuery.of(context).size.width * 0.9,
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.8,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Header
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surface,
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(5),
                      topRight: Radius.circular(5),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Import Calendar',
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: isLoading ? null : () => Navigator.pop(context),
                      ),
                    ],
                  ),
                ),
                // Body
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Select Calendar File',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 16),
                      // File picker button
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          border: Border.all(
                            color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.3),
                          ),
                          borderRadius: BorderRadius.circular(5),
                          color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
                        ),
                        child: InkWell(
                          onTap: isLoading ? null : () async {
                            FilePickerResult? result = await FilePicker.platform.pickFiles(
                              type: FileType.custom,
                              allowedExtensions: ['ics', 'csv'],
                            );

                            if (result != null) {
                              setState(() {
                                selectedFilePath = result.files.single.path;
                              });
                            }
                          },
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                decoration: BoxDecoration(
                                  color: Theme.of(context).colorScheme.primary,
                                  borderRadius: BorderRadius.circular(5),
                                ),
                                child: Text(
                                  'Choose file',
                                  style: TextStyle(
                                    color: Theme.of(context).colorScheme.onPrimary,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  selectedFilePath != null
                                      ? selectedFilePath!.split('/').last
                                      : 'No file chosen',
                                  style: TextStyle(
                                    color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.7),
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Supported formats: .ics (iCalendar), .csv (Comma-separated values)',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6),
                        ),
                      ),
                      const SizedBox(height: 24),
                      // Import Options
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
                          borderRadius: BorderRadius.circular(5),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Import Options',
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                Container(
                                  width: 6,
                                  height: 6,
                                  decoration: BoxDecoration(
                                    color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    '.ics files: Standard calendar format from Google Calendar, Outlook, etc.',
                                    style: Theme.of(context).textTheme.bodyMedium,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                Container(
                                  width: 6,
                                  height: 6,
                                  decoration: BoxDecoration(
                                    color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    '.csv files: Custom format with columns: Title, Start Date, End Date, Description',
                                    style: Theme.of(context).textTheme.bodyMedium,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                Container(
                                  width: 6,
                                  height: 6,
                                  decoration: BoxDecoration(
                                    color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    'Events will be added to your default category',
                                    style: Theme.of(context).textTheme.bodyMedium,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      if (isLoading) ...[
                        const SizedBox(height: 24),
                        const Center(
                          child: CircularProgressIndicator(),
                        ),
                      ],
                    ],
                  ),
                ),
                // Footer
                Container(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      TextButton(
                        onPressed: isLoading ? null : () => Navigator.pop(context),
                        child: Text('common.cancel'.tr()),
                      ),
                      const SizedBox(width: 12),
                      ElevatedButton(
                        onPressed: (isLoading || selectedFilePath == null) ? null : () async {
                          setState(() {
                            isLoading = true;
                          });

                          try {
                            await _importCalendarFile(selectedFilePath!);
                            if (mounted) {
                              Navigator.pop(context);
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('calendar.import_success'.tr()),
                                  backgroundColor: Colors.green,
                                ),
                              );
                            }
                          } catch (e) {
                            if (mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('calendar.import_failed'.tr(args: [e.toString()])),
                                  backgroundColor: Colors.red,
                                ),
                              );
                            }
                          } finally {
                            if (mounted) {
                              setState(() {
                                isLoading = false;
                              });
                            }
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Theme.of(context).colorScheme.primary,
                          foregroundColor: Theme.of(context).colorScheme.onPrimary,
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(5),
                          ),
                        ),
                        child: Text('calendar.import_calendar'.tr()),
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

  Future<void> _importCalendarFile(String filePath) async {
    final file = File(filePath);
    final contents = await file.readAsString();
    final extension = filePath.split('.').last.toLowerCase();

    if (extension == 'ics') {
      await _parseIcsFile(contents);
    } else if (extension == 'csv') {
      await _parseCsvFile(contents);
    } else {
      throw Exception('Unsupported file format');
    }
  }

  Future<void> _parseIcsFile(String contents) async {
    final lines = contents.split('\n');
    String? title;
    String? description;
    DateTime? startTime;
    DateTime? endTime;

    for (final line in lines) {
      final trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('BEGIN:VEVENT')) {
        // Start of a new event
        title = null;
        description = null;
        startTime = null;
        endTime = null;
      } else if (trimmedLine.startsWith('SUMMARY:')) {
        title = trimmedLine.substring(8);
      } else if (trimmedLine.startsWith('DESCRIPTION:')) {
        description = trimmedLine.substring(12);
      } else if (trimmedLine.startsWith('DTSTART:')) {
        final dateStr = trimmedLine.substring(8);
        startTime = _parseIcsDateTime(dateStr);
      } else if (trimmedLine.startsWith('DTEND:')) {
        final dateStr = trimmedLine.substring(6);
        endTime = _parseIcsDateTime(dateStr);
      } else if (trimmedLine.startsWith('END:VEVENT')) {
        // End of event - create the event
        if (title != null && startTime != null) {
          final event = CalendarEvent(
            id: DateTime.now().millisecondsSinceEpoch.toString(),
            workspaceId: 'local-workspace',
            title: title,
            description: description ?? '',
            startTime: startTime,
            endTime: endTime ?? startTime.add(const Duration(hours: 1)),
            categoryId: _categories.isNotEmpty ? _categories.first.id : null,
          );

          setState(() {
            _events.add(event);
          });
        }
      }
    }
  }

  DateTime? _parseIcsDateTime(String dateStr) {
    try {
      // Remove any timezone info for simplicity
      final cleanDateStr = dateStr.replaceAll('Z', '').replaceAll('T', '');
      
      if (cleanDateStr.length >= 8) {
        final year = int.parse(cleanDateStr.substring(0, 4));
        final month = int.parse(cleanDateStr.substring(4, 6));
        final day = int.parse(cleanDateStr.substring(6, 8));
        
        if (cleanDateStr.length >= 14) {
          final hour = int.parse(cleanDateStr.substring(8, 10));
          final minute = int.parse(cleanDateStr.substring(10, 12));
          final second = int.parse(cleanDateStr.substring(12, 14));
          return DateTime(year, month, day, hour, minute, second);
        } else {
          return DateTime(year, month, day);
        }
      }
    } catch (e) {
      // Error parsing ICS date
    }
    return null;
  }

  Future<void> _parseCsvFile(String contents) async {
    final lines = contents.split('\n');
    
    // Skip header if present
    final startIndex = lines.isNotEmpty && 
        lines[0].toLowerCase().contains('title') ? 1 : 0;
    
    for (int i = startIndex; i < lines.length; i++) {
      final line = lines[i].trim();
      if (line.isEmpty) continue;
      
      final columns = _parseCsvLine(line);
      if (columns.length >= 3) {
        final title = columns[0];
        final startDate = _parseDateString(columns[1]);
        final endDate = columns.length > 2 ? _parseDateString(columns[2]) : null;
        final description = columns.length > 3 ? columns[3] : '';
        
        if (startDate != null) {
          final event = CalendarEvent(
            id: '${DateTime.now().millisecondsSinceEpoch}_$i',
            workspaceId: 'local-workspace',
            title: title,
            description: description,
            startTime: startDate,
            endTime: endDate ?? startDate.add(const Duration(hours: 1)),
            categoryId: _categories.isNotEmpty ? _categories.first.id : null,
          );

          setState(() {
            _events.add(event);
          });
        }
      }
    }
  }

  List<String> _parseCsvLine(String line) {
    final List<String> result = [];
    bool inQuotes = false;
    String currentField = '';
    
    for (int i = 0; i < line.length; i++) {
      final char = line[i];
      
      if (char == '"' && (i == 0 || line[i - 1] == ',')) {
        inQuotes = true;
      } else if (char == '"' && inQuotes && (i == line.length - 1 || line[i + 1] == ',')) {
        inQuotes = false;
      } else if (char == ',' && !inQuotes) {
        result.add(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    
    if (currentField.isNotEmpty) {
      result.add(currentField.trim());
    }
    
    return result;
  }

  DateTime? _parseDateString(String dateStr) {
    try {
      // Try different date formats
      final formats = [
        RegExp(r'(\d{4})-(\d{1,2})-(\d{1,2})'), // YYYY-MM-DD
        RegExp(r'(\d{1,2})/(\d{1,2})/(\d{4})'), // MM/DD/YYYY
        RegExp(r'(\d{1,2})-(\d{1,2})-(\d{4})'), // MM-DD-YYYY
      ];
      
      for (final format in formats) {
        final match = format.firstMatch(dateStr);
        if (match != null) {
          if (format.pattern == r'(\d{4})-(\d{1,2})-(\d{1,2})') {
            return DateTime(
              int.parse(match.group(1)!),
              int.parse(match.group(2)!),
              int.parse(match.group(3)!),
            );
          } else {
            return DateTime(
              int.parse(match.group(3)!),
              int.parse(match.group(1)!),
              int.parse(match.group(2)!),
            );
          }
        }
      }
    } catch (e) {
      // Error parsing date
    }
    return null;
  }

  // Helper method to request storage permission
  // Note: This should never be called on web (web exports return early)
  Future<bool> _requestStoragePermission() async {
    // Web doesn't need storage permission - handled via browser download
    if (kIsWeb) return true;

    if (Platform.isAndroid) {
      // For Android 13+ (API level 33+), we don't need WRITE_EXTERNAL_STORAGE
      // For Android 10-12, we need to check permission
      final androidInfo = await DeviceInfoPlugin().androidInfo;
      if (androidInfo.version.sdkInt >= 33) {
        // Android 13+, no permission needed for app-specific directory
        return true;
      } else if (androidInfo.version.sdkInt >= 30) {
        // Android 11-12, check if we can manage external storage
        if (await Permission.manageExternalStorage.isGranted) {
          return true;
        }
        final status = await Permission.manageExternalStorage.request();
        return status.isGranted;
      } else {
        // Android 10 and below
        if (await Permission.storage.isGranted) {
          return true;
        }
        final status = await Permission.storage.request();
        return status.isGranted;
      }
    }
    // For iOS, no permission needed for app directory
    return true;
  }

  // Helper method to get download directory path
  // Note: This should never be called on web (web exports return early)
  Future<String> _getDownloadDirectoryPath() async {
    // Web doesn't use file system - this shouldn't be called on web
    if (kIsWeb) {
      throw UnsupportedError('File system access not available on web');
    }

    if (Platform.isAndroid) {
      // Try to get the Downloads directory
      try {
        final directory = Directory('/storage/emulated/0/Download/CalendarExports');
        if (!await directory.exists()) {
          await directory.create(recursive: true);
        }
        return directory.path;
      } catch (e) {
        // Fallback to app directory
        final dir = await getApplicationDocumentsDirectory();
        return dir.path;
      }
    } else {
      // For iOS, use app documents directory
      final dir = await getApplicationDocumentsDirectory();
      return dir.path;
    }
  }
}

// Day Progress Indicator Widget
class DayProgressIndicator extends StatelessWidget {
  final DateTime currentTime;

  const DayProgressIndicator({
    Key? key,
    required this.currentTime,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    // Calculate sunrise and sunset times (simplified - using fixed times)
    // In a real app, you'd use a package like 'sunrise_sunset' or an API
    final sunrise = DateTime(
      currentTime.year,
      currentTime.month,
      currentTime.day,
      6, // 6 AM sunrise
      0,
    );

    final sunset = DateTime(
      currentTime.year,
      currentTime.month,
      currentTime.day,
      18, // 6 PM sunset
      30,
    );

    // Calculate progress (0.0 to 1.0)
    double progress = 0.0;
    if (currentTime.isBefore(sunrise)) {
      progress = 0.0; // Before sunrise
    } else if (currentTime.isAfter(sunset)) {
      progress = 1.0; // After sunset
    } else {
      // During the day
      final totalDayMinutes = sunset.difference(sunrise).inMinutes;
      final elapsedMinutes = currentTime.difference(sunrise).inMinutes;
      progress = elapsedMinutes / totalDayMinutes;
    }

    // Format current time
    final hour = currentTime.hour;
    final minute = currentTime.minute.toString().padLeft(2, '0');
    final period = hour >= 12 ? 'PM' : 'AM';
    final displayHour = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);
    final timeString = '$displayHour:$minute $period';

    return Tooltip(
      message: 'Current Time: $timeString',
      child: Container(
        width: 50,
        height: 28,
        child: CustomPaint(
          painter: DayProgressPainter(
            progress: progress,
            primaryColor: Theme.of(context).primaryColor,
          ),
        ),
      ),
    );
  }
}

// Custom Painter for Day Progress Arc
class DayProgressPainter extends CustomPainter {
  final double progress;
  final Color primaryColor;

  DayProgressPainter({
    required this.progress,
    required this.primaryColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height - 3);
    final radius = size.width / 2 - 3;

    // Draw background arc (gray)
    final backgroundPaint = Paint()
      ..color = Colors.grey.withOpacity(0.3)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      math.pi, // Start from left (180 degrees)
      math.pi, // Sweep 180 degrees (semicircle)
      false,
      backgroundPaint,
    );

    // Draw progress arc (colored)
    final progressPaint = Paint()
      ..color = primaryColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      math.pi, // Start from left (180 degrees)
      math.pi * progress, // Sweep based on progress
      false,
      progressPaint,
    );

    // Calculate sun position
    final sunAngle = math.pi + (math.pi * progress);
    final sunX = center.dx + radius * math.cos(sunAngle);
    final sunY = center.dy + radius * math.sin(sunAngle);
    final sunCenter = Offset(sunX, sunY);

    // Draw sun rays (small lines emanating from center)
    final rayPaint = Paint()
      ..color = Colors.amber.withOpacity(0.7)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5
      ..strokeCap = StrokeCap.round;

    const rayCount = 8;
    const rayLength = 4.0;
    const sunRadius = 5.0;

    for (int i = 0; i < rayCount; i++) {
      final angle = (2 * math.pi / rayCount) * i;
      final rayStartX = sunX + (sunRadius + 1) * math.cos(angle);
      final rayStartY = sunY + (sunRadius + 1) * math.sin(angle);
      final rayEndX = sunX + (sunRadius + 1 + rayLength) * math.cos(angle);
      final rayEndY = sunY + (sunRadius + 1 + rayLength) * math.sin(angle);

      canvas.drawLine(
        Offset(rayStartX, rayStartY),
        Offset(rayEndX, rayEndY),
        rayPaint,
      );
    }

    // Draw outer glow (multiple circles with decreasing opacity)
    for (int i = 3; i > 0; i--) {
      final glowPaint = Paint()
        ..color = Colors.amber.withOpacity(0.15 * i / 3)
        ..style = PaintingStyle.fill
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 2);

      canvas.drawCircle(
        sunCenter,
        sunRadius + (i * 2),
        glowPaint,
      );
    }

    // Draw main sun circle with gradient effect
    final sunPaint = Paint()
      ..shader = RadialGradient(
        colors: [
          Colors.yellow.shade300,
          Colors.amber,
          Colors.orange.shade700,
        ],
        stops: const [0.0, 0.6, 1.0],
      ).createShader(Rect.fromCircle(center: sunCenter, radius: sunRadius))
      ..style = PaintingStyle.fill;

    canvas.drawCircle(
      sunCenter,
      sunRadius,
      sunPaint,
    );

    // Draw sun border with glow
    final sunBorderPaint = Paint()
      ..color = Colors.orange.shade600
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 1);

    canvas.drawCircle(
      sunCenter,
      sunRadius,
      sunBorderPaint,
    );
  }

  @override
  bool shouldRepaint(DayProgressPainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}

