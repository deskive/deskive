import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../models/calendar_event.dart';
import '../api/services/calendar_api_service.dart' as api;
import '../services/workspace_service.dart';
import 'calendar_screen.dart';
import '../theme/app_theme.dart';

class AITimeSuggestionsScreen extends StatefulWidget {
  final String eventTitle;
  final String description;
  final int duration;
  final String priority;
  final String timePreference;
  final DateTime selectedDate;
  final List<api.TimeSuggestion>? suggestions;
  final String? location;
  final List<String>? attendees;

  const AITimeSuggestionsScreen({
    super.key,
    required this.eventTitle,
    required this.description,
    required this.duration,
    required this.priority,
    required this.timePreference,
    required this.selectedDate,
    this.suggestions,
    this.location,
    this.attendees,
  });

  @override
  State<AITimeSuggestionsScreen> createState() => _AITimeSuggestionsScreenState();
}

class _AITimeSuggestionsScreenState extends State<AITimeSuggestionsScreen> {
  final api.CalendarApiService _calendarApi = api.CalendarApiService();
  final WorkspaceService _workspaceService = WorkspaceService.instance;
  String? _selectedRoomId;

  // Theme-aware color getters
  Color get backgroundColor => Theme.of(context).brightness == Brightness.dark
      ? const Color(0xFF0F1419)
      : Colors.grey[50]!;
      
  Color get surfaceColor => Theme.of(context).brightness == Brightness.dark 
      ? const Color(0xFF1A1F2A) 
      : Colors.white;
      
  Color get textColor => Theme.of(context).brightness == Brightness.dark 
      ? Colors.white 
      : Colors.black87;
      
  Color get subtitleColor => Theme.of(context).brightness == Brightness.dark 
      ? Colors.grey[400]! 
      : Colors.grey[600]!;
      
  Color get borderColor => Theme.of(context).brightness == Brightness.dark 
      ? Colors.grey[800]! 
      : Colors.grey[300]!;

  void _showConfirmationDialog(int index, [api.TimeSuggestion? apiSuggestion]) {
    final dayNames = [
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

    // Use API suggestion if available, otherwise generate mock data
    String day;
    String timeSlot;
    DateTime startDateTime;
    DateTime endDateTime;
    List<api.MeetingRoomInfo> availableRooms = [];

    if (apiSuggestion != null) {
      // Use API suggestion
      final start = apiSuggestion.startTime.toLocal();
      final end = apiSuggestion.endTime.toLocal();

      final dayName = dayNames[start.weekday - 1];
      final monthName = monthNames[start.month - 1];
      day = '$dayName, $monthName ${start.day}';

      final startHour = start.hour;
      final startMinute = start.minute.toString().padLeft(2, '0');
      final startPeriod = startHour >= 12 ? 'PM' : 'AM';
      final displayStartHour = startHour > 12 ? startHour - 12 : (startHour == 0 ? 12 : startHour);

      final endHour = end.hour;
      final endMinute = end.minute.toString().padLeft(2, '0');
      final endPeriod = endHour >= 12 ? 'PM' : 'AM';
      final displayEndHour = endHour > 12 ? endHour - 12 : (endHour == 0 ? 12 : endHour);

      timeSlot = '$displayStartHour:$startMinute $startPeriod - $displayEndHour:$endMinute $endPeriod';
      startDateTime = start;
      endDateTime = end;
      availableRooms = apiSuggestion.availableRooms;

      // Set default selected room to first available
      if (availableRooms.isNotEmpty) {
        _selectedRoomId = availableRooms.first.id;
      }
    } else {
      // Generate mock data for fallback
      final days = <String>[];
      DateTime currentDate = widget.selectedDate;

      final now = DateTime.now();
      if (currentDate.isBefore(DateTime(now.year, now.month, now.day))) {
        currentDate = now;
      }

      while (days.length < 5) {
        final dayName = dayNames[currentDate.weekday - 1];
        final monthName = monthNames[currentDate.month - 1];
        days.add('$dayName, $monthName ${currentDate.day}');
        currentDate = currentDate.add(const Duration(days: 1));
      }

      timeSlot = _getTimeSlotForPreference(index);
      day = days[index];

      final parsed = _parseDateTimeFromSuggestion(day, timeSlot);
      startDateTime = parsed.start;
      endDateTime = parsed.end;
    }

    final suggestion = {
      'day': day,
      'time': timeSlot,
    };
    
    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        child: Container(
          width: MediaQuery.of(context).size.width * 0.9,
          constraints: const BoxConstraints(maxWidth: 400),
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: backgroundColor,
            borderRadius: BorderRadius.circular(12),
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
                    'calendar.confirm_your_event'.tr(),
                    style: TextStyle(
                      color: textColor,
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
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
              const SizedBox(height: 20),
              
              // Confirm Schedule section
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: Colors.green.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Icon(
                      Icons.check_circle,
                      color: Colors.green,
                      size: 16,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    'calendar.confirm_schedule'.tr(),
                    style: TextStyle(
                      color: textColor,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              
              // Event Details Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: surfaceColor,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: borderColor.withValues(alpha: 0.3)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Event Title
                    Row(
                      children: [
                        Icon(
                          Icons.calendar_today,
                          color: textColor,
                          size: 16,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            widget.eventTitle.isNotEmpty ? widget.eventTitle : 't1',
                            style: TextStyle(
                              color: textColor,
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                            overflow: TextOverflow.ellipsis,
                            maxLines: 1,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    
                    // Time
                    Row(
                      children: [
                        Icon(
                          Icons.access_time,
                          color: subtitleColor,
                          size: 16,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            '${suggestion['day']!} at ${suggestion['time']!}',
                            style: TextStyle(
                              color: textColor,
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                            ),
                            overflow: TextOverflow.ellipsis,
                            maxLines: 2,
                          ),
                        ),
                      ],
                    ),
                    // Meeting Room Selection (if available)
                    if (availableRooms.isNotEmpty) ...[
                      const SizedBox(height: 20),
                      Text(
                        'calendar.select_meeting_room'.tr(),
                        style: TextStyle(
                          color: textColor,
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 12),
                      StatefulBuilder(
                        builder: (context, setState) => DropdownButtonFormField<String>(
                          value: _selectedRoomId,
                          decoration: InputDecoration(
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: BorderSide(color: borderColor),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: BorderSide(color: borderColor),
                            ),
                          ),
                          dropdownColor: surfaceColor,
                          items: availableRooms.map((room) {
                            return DropdownMenuItem<String>(
                              value: room.id,
                              child: Text(
                                '${room.name} (${'calendar.capacity'.tr()}: ${room.capacity})',
                                style: TextStyle(color: textColor, fontSize: 14),
                              ),
                            );
                          }).toList(),
                          onChanged: (value) {
                            setState(() {
                              _selectedRoomId = value;
                            });
                          },
                        ),
                      ),
                    ],
                    const SizedBox(height: 20),

                    // What happens next
                    Text(
                      'calendar.what_happens_next'.tr(),
                      style: TextStyle(
                        color: textColor,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Next steps list
                    ...['calendar.event_will_be_added'.tr(),
                         if (widget.attendees != null && widget.attendees!.isNotEmpty)
                           'calendar.invitations_will_be_sent'.tr(),
                         'calendar.reminder_notifications_will_be_set_up'.tr(),
                         if (availableRooms.isNotEmpty)
                           'calendar.meeting_room_will_be_reserved'.tr()
                    ].map((step) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '• ',
                            style: TextStyle(color: subtitleColor, fontSize: 14),
                          ),
                          Expanded(
                            child: Text(
                              step,
                              style: TextStyle(color: subtitleColor, fontSize: 14),
                            ),
                          ),
                        ],
                      ),
                    )),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              
              // Action Buttons
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(context),
                      style: OutlinedButton.styleFrom(
                        side: BorderSide(color: borderColor),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: Text(
                        'common.cancel'.tr(),
                        style: TextStyle(color: textColor, fontSize: 14),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [Color(0xFF6B46FF), Color(0xFF8B6BFF)],
                        ),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: ElevatedButton.icon(
                        onPressed: () async {
                          // Get workspace
                          final workspace = _workspaceService.currentWorkspace;
                          if (workspace == null) {
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('calendar.no_workspace_selected'.tr())),
                              );
                            }
                            return;
                          }

                          // Show loading
                          if (context.mounted) {
                            showDialog(
                              context: context,
                              barrierDismissible: false,
                              builder: (context) => const Center(
                                child: CircularProgressIndicator(),
                              ),
                            );
                          }

                          try {
                            // Create event DTO
                            final createDto = api.CreateEventDto(
                              title: widget.eventTitle,
                              description: widget.description.isEmpty ? null : widget.description,
                              startTime: startDateTime,
                              endTime: endDateTime,
                              location: widget.location,
                              allDay: false,
                              roomId: _selectedRoomId,
                              priority: widget.priority,
                              status: 'confirmed',
                              attendees: widget.attendees,
                              isRecurring: false,
                            );

                            // Call API
                            final response = await _calendarApi.createEvent(
                              workspace.id,
                              createDto,
                            );

                            if (!context.mounted) return;

                            // Close loading
                            Navigator.pop(context);

                            if (response.isSuccess && response.data != null) {

                              // Convert API CalendarEvent to model CalendarEvent
                              final apiEvent = response.data!;

                              // Convert attendees to List<Map<String, dynamic>>
                              final attendeesList = apiEvent.attendees?.map((a) {
                                return <String, dynamic>{
                                  'email': a.email,
                                  'name': a.name,
                                  'status': a.status,
                                };
                              }).toList() ?? <Map<String, dynamic>>[];

                              // Parse priority enum
                              EventPriority priorityEnum = EventPriority.normal;
                              if (apiEvent.priority != null) {
                                switch (apiEvent.priority!.toLowerCase()) {
                                  case 'lowest':
                                    priorityEnum = EventPriority.lowest;
                                    break;
                                  case 'low':
                                    priorityEnum = EventPriority.low;
                                    break;
                                  case 'high':
                                    priorityEnum = EventPriority.high;
                                    break;
                                  case 'highest':
                                    priorityEnum = EventPriority.highest;
                                    break;
                                  default:
                                    priorityEnum = EventPriority.normal;
                                }
                              }

                              // Parse status enum
                              EventStatus statusEnum = EventStatus.confirmed;
                              if (apiEvent.status != null) {
                                switch (apiEvent.status!.toLowerCase()) {
                                  case 'tentative':
                                    statusEnum = EventStatus.tentative;
                                    break;
                                  case 'cancelled':
                                    statusEnum = EventStatus.cancelled;
                                    break;
                                  default:
                                    statusEnum = EventStatus.confirmed;
                                }
                              }

                              final modelEvent = CalendarEvent(
                                id: apiEvent.id,
                                workspaceId: apiEvent.workspaceId,
                                title: apiEvent.title,
                                description: apiEvent.description,
                                startTime: apiEvent.startTime,
                                endTime: apiEvent.endTime,
                                categoryId: apiEvent.categoryId,
                                allDay: apiEvent.isAllDay,
                                attendees: attendeesList,
                                location: apiEvent.location,
                                roomId: apiEvent.meetingRoomId,
                                priority: priorityEnum,
                                status: statusEnum,
                              );

                              // Close confirmation dialog first
                              Navigator.pop(context);

                              // Wait a frame before closing suggestions screen
                              await Future.delayed(const Duration(milliseconds: 100));

                              if (!context.mounted) return;

                              // Return event from suggestions screen
                              Navigator.pop(context, modelEvent);

                              // Show success message
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('calendar.event_created'.tr()),
                                  backgroundColor: Colors.green,
                                ),
                              );
                            } else {
                              // Show error
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(response.message ?? 'calendar.failed_to_create_event'.tr()),
                                  backgroundColor: Colors.red,
                                ),
                              );
                            }
                          } catch (e) {

                            if (!context.mounted) return;

                            // Close loading if still open
                            Navigator.pop(context);

                            // Show error
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('${'common.error'.tr()}: $e'),
                                backgroundColor: Colors.red,
                              ),
                            );
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.transparent,
                          shadowColor: Colors.transparent,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        icon: const Icon(Icons.check, color: Colors.white, size: 16),
                        label: Text(
                          'calendar.confirm_and_schedule'.tr(),
                          style: const TextStyle(color: Colors.white, fontSize: 14),
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
    );
  }

  String _getTimeSlotForPreference(int suggestionIndex) {
    // Generate different time slots based on preference and index
    switch (widget.timePreference) {
      case 'Morning (9 AM - 12 PM)':
        final startTimes = ['9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM'];
        final startTime = startTimes[suggestionIndex % startTimes.length];
        return _calculateEndTime(startTime, widget.duration);
      
      case 'Afternoon (12 PM - 6 PM)':
        final startTimes = ['12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'];
        final startTime = startTimes[suggestionIndex % startTimes.length];
        return _calculateEndTime(startTime, widget.duration);
      
      case 'Evening (6 PM - 9 PM)':
        final startTimes = ['6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM'];
        final startTime = startTimes[suggestionIndex % startTimes.length];
        return _calculateEndTime(startTime, widget.duration);
      
      case 'Any time':
      default:
        // Mix of different times throughout the day
        final startTimes = ['9:00 AM', '11:00 AM', '2:00 PM', '3:30 PM', '4:00 PM'];
        final startTime = startTimes[suggestionIndex % startTimes.length];
        return _calculateEndTime(startTime, widget.duration);
    }
  }
  
  String _calculateEndTime(String startTime, int durationMinutes) {
    // Parse start time
    final parts = startTime.split(' ');
    final timeParts = parts[0].split(':');
    int hours = int.parse(timeParts[0]);
    final minutes = int.parse(timeParts[1]);
    final isPM = parts[1] == 'PM';
    
    // Convert to 24-hour format
    if (isPM && hours != 12) hours += 12;
    if (!isPM && hours == 12) hours = 0;
    
    // Calculate end time
    int totalMinutes = hours * 60 + minutes + durationMinutes;
    int endHours = (totalMinutes ~/ 60) % 24;
    int endMinutes = totalMinutes % 60;
    
    // Convert back to 12-hour format
    String endPeriod = endHours >= 12 ? 'PM' : 'AM';
    if (endHours > 12) endHours -= 12;
    if (endHours == 0) endHours = 12;
    
    return '$startTime - ${endHours.toString().padLeft(2, '0')}:${endMinutes.toString().padLeft(2, '0')} $endPeriod';
  }
  
  String _getReasonForTimeSlot(String timePreference) {
    switch (timePreference) {
      case 'Morning (9 AM - 12 PM)':
        return 'Morning slot - good for focus and productivity';
      case 'Afternoon (12 PM - 6 PM)':
        return 'Afternoon slot - suitable for collaborative meetings';
      case 'Evening (6 PM - 9 PM)':
        return 'Evening slot - accommodates flexible schedules';
      case 'Any time':
      default:
        return 'Flexible timing - fits various schedule preferences';
    }
  }
  
  ({DateTime start, DateTime end}) _parseDateTimeFromSuggestion(String dayString, String timeString) {
    // Parse the day (e.g., "Friday, July 25")
    final now = DateTime.now();
    final dayParts = dayString.split(', ');
    final monthDay = dayParts[1].split(' ');
    final month = monthDay[0];
    final day = int.parse(monthDay[1]);
    
    // Map month names to numbers
    final monthMap = {
      'January': 1, 'February': 2, 'March': 3, 'April': 4,
      'May': 5, 'June': 6, 'July': 7, 'August': 8,
      'September': 9, 'October': 10, 'November': 11, 'December': 12
    };
    
    final monthNumber = monthMap[month] ?? 1;
    final year = now.year;
    
    // Parse the time (e.g., "9:00 AM - 10:00 AM")
    final timeParts = timeString.split(' - ');
    final startTimeParts = timeParts[0].split(' ');
    final endTimeParts = timeParts[1].split(' ');
    
    // Parse start time
    final startTimeComponents = startTimeParts[0].split(':');
    int startHour = int.parse(startTimeComponents[0]);
    final startMinute = int.parse(startTimeComponents[1]);
    final startPeriod = startTimeParts[1];
    
    if (startPeriod == 'PM' && startHour != 12) startHour += 12;
    if (startPeriod == 'AM' && startHour == 12) startHour = 0;
    
    // Parse end time
    final endTimeComponents = endTimeParts[0].split(':');
    int endHour = int.parse(endTimeComponents[0]);
    final endMinute = int.parse(endTimeComponents[1]);
    final endPeriod = endTimeParts[1];
    
    if (endPeriod == 'PM' && endHour != 12) endHour += 12;
    if (endPeriod == 'AM' && endHour == 12) endHour = 0;
    
    // Create DateTime objects
    final startDateTime = DateTime(year, monthNumber, day, startHour, startMinute);
    final endDateTime = DateTime(year, monthNumber, day, endHour, endMinute);
    
    return (start: startDateTime, end: endDateTime);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: backgroundColor,
      appBar: AppBar(
        backgroundColor: backgroundColor,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.close, color: textColor),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'calendar.ai_powered_time_suggestions'.tr(),
          style: TextStyle(color: textColor, fontSize: 16),
        ),
      ),
      body: Column(
        children: [
          // Header Section
          Container(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.green.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Icon(
                        Icons.check_circle,
                        color: Colors.green,
                        size: 16,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      'calendar.ai_suggestions'.tr(),
                      style: TextStyle(
                        color: textColor,
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: surfaceColor,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: borderColor),
                      ),
                      child: Text(
                        'calendar.options_found'.tr(namedArgs: {'count': '${widget.suggestions?.length ?? 5}'}),
                        style: TextStyle(
                          color: subtitleColor,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          
          // Suggestions List
          Expanded(
            child: widget.suggestions != null && widget.suggestions!.isNotEmpty
                ? ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    itemCount: widget.suggestions!.length,
                    itemBuilder: (context, index) {
                      return _buildSuggestionCardFromAPI(index, widget.suggestions![index]);
                    },
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    itemCount: 5,
                    itemBuilder: (context, index) {
                      return _buildSuggestionCard(index);
                    },
                  ),
          ),
          
          // Bottom Action Buttons
          Container(
            padding: const EdgeInsets.all(20),
            child: SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () => Navigator.pop(context),
                style: OutlinedButton.styleFrom(
                  side: BorderSide(color: borderColor),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: Text(
                  'calendar.back_to_form'.tr(),
                  style: TextStyle(color: textColor),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSuggestionCard(int index) {
    final dayNames = [
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
    
    // Generate suggestions starting from the selected date
    final days = <String>[];
    DateTime currentDate = widget.selectedDate;
    
    // If selected date is in the past, start from today
    final now = DateTime.now();
    if (currentDate.isBefore(DateTime(now.year, now.month, now.day))) {
      currentDate = now;
    }
    
    while (days.length < 5) {
      final dayName = dayNames[currentDate.weekday - 1];
      final monthName = monthNames[currentDate.month - 1];
      days.add('$dayName, $monthName ${currentDate.day}');
      currentDate = currentDate.add(const Duration(days: 1));
    }
    
    final timeSlot = _getTimeSlotForPreference(index);
    final timeReason = _getReasonForTimeSlot(widget.timePreference);
    
    final suggestion = {
      'day': days[index],
      'time': timeSlot,
      'confidence': '50%',
      'rating': 'Good',
      'reasons': [
        timeReason,
        'Weekday scheduling - aligns with typical work schedule'
      ]
    };
    
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: surfaceColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: borderColor,
          width: 1,
        ),
      ),
      child: InkWell(
        onTap: () {
          _showConfirmationDialog(index, null);
        },
        borderRadius: BorderRadius.circular(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header with day and rating
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(
                      Icons.calendar_today,
                      color: textColor,
                      size: 16,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      suggestion['day']! as String,
                      style: TextStyle(
                        color: textColor,
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.green.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    suggestion['rating']! as String,
                    style: TextStyle(
                      color: Colors.green,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            
            // Time and confidence
            Row(
              children: [
                Icon(
                  Icons.access_time,
                  color: subtitleColor,
                  size: 16,
                ),
                const SizedBox(width: 8),
                Text(
                  suggestion['time']! as String,
                  style: TextStyle(
                    color: textColor,
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const Spacer(),
                Icon(
                  Icons.trending_up,
                  color: subtitleColor,
                  size: 16,
                ),
                const SizedBox(width: 4),
                Text(
                  '${'calendar.confidence'.tr()}: ${suggestion['confidence']! as String}',
                  style: TextStyle(
                    color: subtitleColor,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            
            // Reasons
            Text(
              'calendar.why_this_time_works'.tr(),
              style: TextStyle(
                color: textColor,
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 8),
            ...((suggestion['reasons'] as List<String>).map((reason) => 
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '• ',
                      style: TextStyle(color: subtitleColor, fontSize: 14),
                    ),
                    Expanded(
                      child: Text(
                        reason,
                        style: TextStyle(color: subtitleColor, fontSize: 14),
                      ),
                    ),
                  ],
                ),
              )
            )),
          ],
        ),
      ),
    );
  }

  Widget _buildSuggestionCardFromAPI(int index, api.TimeSuggestion suggestion) {
    final dayNames = [
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

    final startTime = suggestion.startTime.toLocal();
    final endTime = suggestion.endTime.toLocal();
    final dayOfWeek = dayNames[startTime.weekday - 1];
    final month = monthNames[startTime.month - 1];
    final day = startTime.day;

    final startHour = startTime.hour;
    final startMinute = startTime.minute.toString().padLeft(2, '0');
    final startPeriod = startHour >= 12 ? 'PM' : 'AM';
    final displayStartHour = startHour > 12 ? startHour - 12 : (startHour == 0 ? 12 : startHour);

    final endHour = endTime.hour;
    final endMinute = endTime.minute.toString().padLeft(2, '0');
    final endPeriod = endHour >= 12 ? 'PM' : 'AM';
    final displayEndHour = endHour > 12 ? endHour - 12 : (endHour == 0 ? 12 : endHour);

    // Confidence badge
    final isOptimal = suggestion.confidence >= 80;
    final badgeText = isOptimal ? 'calendar.optimal'.tr() : 'calendar.good'.tr();
    final badgeColor = isOptimal ? context.primaryColor : Colors.orange;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: surfaceColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: borderColor),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () => _showConfirmationDialog(index, suggestion),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Date with badge
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.calendar_today, color: textColor, size: 18),
                        const SizedBox(width: 8),
                        Text(
                          '$dayOfWeek, $month $day',
                          style: TextStyle(
                            color: textColor,
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: badgeColor,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        badgeText,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Time
                Row(
                  children: [
                    Icon(Icons.access_time, color: subtitleColor, size: 18),
                    const SizedBox(width: 8),
                    Text(
                      '$displayStartHour:$startMinute $startPeriod - $displayEndHour:$endMinute $endPeriod',
                      style: TextStyle(
                        color: textColor,
                        fontSize: 15,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Confidence
                Row(
                  children: [
                    Icon(Icons.trending_up, color: subtitleColor, size: 18),
                    const SizedBox(width: 8),
                    Text(
                      '${'calendar.confidence'.tr()}: ${suggestion.confidence}%',
                      style: TextStyle(
                        color: subtitleColor,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Why this time works
                Text(
                  'calendar.why_this_time_works'.tr(),
                  style: TextStyle(
                    color: textColor,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  suggestion.reason,
                  style: TextStyle(
                    color: subtitleColor,
                    fontSize: 14,
                    height: 1.4,
                  ),
                ),

                // Available Rooms
                if (suggestion.availableRooms.isNotEmpty) ...[
                  const SizedBox(height: 20),
                  Text(
                    'calendar.available_rooms'.tr(),
                    style: TextStyle(
                      color: textColor,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  // Show first 2 rooms
                  ...suggestion.availableRooms.take(2).map((room) => Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Text(
                      '• ${room.name} (${'calendar.capacity'.tr()}: ${room.capacity})',
                      style: TextStyle(
                        color: subtitleColor,
                        fontSize: 14,
                      ),
                    ),
                  )),
                  // Show "more rooms" link if there are more than 2
                  if (suggestion.availableRooms.length > 2)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        'calendar.more_rooms'.tr(namedArgs: {'count': '${suggestion.availableRooms.length - 2}'}),
                        style: TextStyle(
                          color: badgeColor,
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}