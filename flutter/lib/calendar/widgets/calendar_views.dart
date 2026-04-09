import 'package:flutter/material.dart';
import 'package:table_calendar/table_calendar.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../models/calendar_event.dart';
import '../../services/calendar_service.dart';

enum CalendarViewType { month, week, day, agenda }

class CalendarViewsWidget extends StatefulWidget {
  final CalendarViewType viewType;
  final List<CalendarEvent> events;
  final DateTime focusedDay;
  final DateTime? selectedDay;
  final Function(DateTime, DateTime)? onDaySelected;
  final Function(CalendarEvent)? onEventTap;
  final Function()? onCreateEvent;

  const CalendarViewsWidget({
    Key? key,
    required this.viewType,
    required this.events,
    required this.focusedDay,
    this.selectedDay,
    this.onDaySelected,
    this.onEventTap,
    this.onCreateEvent,
  }) : super(key: key);

  @override
  State<CalendarViewsWidget> createState() => _CalendarViewsWidgetState();
}

class _CalendarViewsWidgetState extends State<CalendarViewsWidget> {
  @override
  Widget build(BuildContext context) {
    switch (widget.viewType) {
      case CalendarViewType.month:
        return _buildMonthView();
      case CalendarViewType.week:
        return _buildWeekView();
      case CalendarViewType.day:
        return _buildDayView();
      case CalendarViewType.agenda:
        return _buildAgendaView();
    }
  }

  Widget _buildMonthView() {
    return TableCalendar<CalendarEvent>(
      firstDay: DateTime(2020),
      lastDay: DateTime(2030),
      focusedDay: widget.focusedDay,
      selectedDayPredicate: (day) {
        return isSameDay(widget.selectedDay, day);
      },
      eventLoader: (day) {
        return widget.events.where((event) {
          return isSameDay(event.startTime, day) ||
                 (event.startTime.isBefore(day) && event.endTime.isAfter(day));
        }).toList();
      },
      startingDayOfWeek: StartingDayOfWeek.monday,
      calendarFormat: CalendarFormat.month,
      headerStyle: const HeaderStyle(
        formatButtonVisible: false,
        titleCentered: true,
        leftChevronIcon: Icon(Icons.chevron_left),
        rightChevronIcon: Icon(Icons.chevron_right),
      ),
      calendarStyle: CalendarStyle(
        outsideDaysVisible: false,
        markersMaxCount: 3,
        markerDecoration: BoxDecoration(
          color: Theme.of(context).primaryColor,
          shape: BoxShape.circle,
        ),
        todayDecoration: BoxDecoration(
          color: Theme.of(context).primaryColor.withOpacity(0.3),
          shape: BoxShape.circle,
        ),
        selectedDecoration: BoxDecoration(
          color: Theme.of(context).primaryColor,
          shape: BoxShape.circle,
        ),
      ),
      onDaySelected: widget.onDaySelected,
      eventBuilder: (context, day, events) {
        return Container(
          margin: const EdgeInsets.only(top: 5.0),
          alignment: Alignment.center,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isSameDay(day, widget.selectedDay)
                  ? Colors.deepOrange[400]
                  : Colors.deepOrange[200],
            ),
            width: 16.0,
            height: 16.0,
            child: Center(
              child: Text(
                '${events.length}',
                style: const TextStyle().copyWith(
                  color: Colors.white,
                  fontSize: 12.0,
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildWeekView() {
    final startOfWeek = _getStartOfWeek(widget.focusedDay);
    final days = List.generate(7, (index) => startOfWeek.add(Duration(days: index)));

    return Column(
      children: [
        // Week header
        Container(
          height: 60,
          child: Row(
            children: days.map((day) {
              final isToday = isSameDay(day, DateTime.now());
              final isSelected = isSameDay(day, widget.selectedDay);
              
              return Expanded(
                child: GestureDetector(
                  onTap: () => widget.onDaySelected?.call(day, day),
                  child: Container(
                    decoration: BoxDecoration(
                      color: isSelected
                          ? Theme.of(context).primaryColor.withOpacity(0.1)
                          : null,
                      border: Border.all(
                        color: Colors.grey.withOpacity(0.3),
                        width: 0.5,
                      ),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          _getDayName(day.weekday),
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: isToday ? Theme.of(context).primaryColor : null,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Container(
                          width: 30,
                          height: 30,
                          decoration: BoxDecoration(
                            color: isToday
                                ? Theme.of(context).primaryColor
                                : isSelected
                                    ? Theme.of(context).primaryColor.withOpacity(0.3)
                                    : null,
                            shape: BoxShape.circle,
                          ),
                          child: Center(
                            child: Text(
                              '${day.day}',
                              style: TextStyle(
                                color: isToday ? Colors.white : null,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
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
        // Week events
        Expanded(
          child: Row(
            children: days.map((day) {
              final dayEvents = widget.events.where((event) {
                return isSameDay(event.startTime, day) ||
                       (event.startTime.isBefore(day) && event.endTime.isAfter(day));
              }).toList();

              return Expanded(
                child: Container(
                  decoration: BoxDecoration(
                    border: Border.all(
                      color: Colors.grey.withOpacity(0.3),
                      width: 0.5,
                    ),
                  ),
                  child: ListView.builder(
                    padding: const EdgeInsets.all(4),
                    itemCount: dayEvents.length,
                    itemBuilder: (context, index) {
                      final event = dayEvents[index];
                      return _buildEventCard(event, isCompact: true);
                    },
                  ),
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildDayView() {
    final selectedDate = widget.selectedDay ?? widget.focusedDay;
    final dayEvents = widget.events.where((event) {
      return isSameDay(event.startTime, selectedDate) ||
             (event.startTime.isBefore(selectedDate) && event.endTime.isAfter(selectedDate));
    }).toList();

    // Sort events by start time
    dayEvents.sort((a, b) => a.startTime.compareTo(b.startTime));

    return Column(
      children: [
        // Date header
        Container(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Icon(
                Icons.calendar_today,
                color: Theme.of(context).primaryColor,
              ),
              const SizedBox(width: 8),
              Text(
                _getFormattedDate(selectedDate),
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const Spacer(),
              if (widget.onCreateEvent != null)
                IconButton(
                  icon: const Icon(Icons.add),
                  onPressed: widget.onCreateEvent,
                  tooltip: 'calendar.create_event'.tr(),
                ),
            ],
          ),
        ),
        // Time slots
        Expanded(
          child: dayEvents.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.event_busy,
                        size: 64,
                        color: Colors.grey[400],
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'No events scheduled',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: Colors.grey[600],
                        ),
                      ),
                      const SizedBox(height: 8),
                      if (widget.onCreateEvent != null)
                        ElevatedButton.icon(
                          onPressed: widget.onCreateEvent,
                          icon: const Icon(Icons.add),
                          label: Text('calendar.create_event'.tr()),
                        ),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: dayEvents.length,
                  itemBuilder: (context, index) {
                    final event = dayEvents[index];
                    return _buildEventCard(event);
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildAgendaView() {
    // Group events by date
    final Map<DateTime, List<CalendarEvent>> groupedEvents = {};
    
    for (final event in widget.events) {
      final eventDate = DateTime(
        event.startTime.year,
        event.startTime.month,
        event.startTime.day,
      );
      
      if (!groupedEvents.containsKey(eventDate)) {
        groupedEvents[eventDate] = [];
      }
      groupedEvents[eventDate]!.add(event);
    }

    // Sort dates
    final sortedDates = groupedEvents.keys.toList()
      ..sort();

    return ListView.builder(
      itemCount: sortedDates.length,
      itemBuilder: (context, index) {
        final date = sortedDates[index];
        final events = groupedEvents[date]!;
        
        // Sort events by start time
        events.sort((a, b) => a.startTime.compareTo(b.startTime));

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Date header
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              color: Theme.of(context).primaryColor.withOpacity(0.1),
              child: Text(
                _getFormattedDate(date),
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).primaryColor,
                ),
              ),
            ),
            // Events for this date
            ...events.map((event) => _buildEventCard(event)),
            const SizedBox(height: 8),
          ],
        );
      },
    );
  }

  Widget _buildEventCard(CalendarEvent event, {bool isCompact = false}) {
    return Card(
      margin: EdgeInsets.symmetric(
        horizontal: isCompact ? 2 : 0,
        vertical: 4,
      ),
      child: InkWell(
        onTap: () => widget.onEventTap?.call(event),
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: EdgeInsets.all(isCompact ? 8 : 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(8),
            border: Border.left(
              width: 4,
              color: event.color,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                event.title,
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
                maxLines: isCompact ? 1 : 2,
                overflow: TextOverflow.ellipsis,
              ),
              if (!event.allDay) ...[
                const SizedBox(height: 4),
                Row(
                  children: [
                    Icon(
                      Icons.access_time,
                      size: 14,
                      color: Colors.grey[600],
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${_formatTime(event.startTime)} - ${_formatTime(event.endTime)}',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ],
              if (event.location != null && event.location!.isNotEmpty && !isCompact) ...[
                const SizedBox(height: 4),
                Row(
                  children: [
                    Icon(
                      Icons.location_on,
                      size: 14,
                      color: Colors.grey[600],
                    ),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        event.location!,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.grey[600],
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ],
              if (event.attendees.isNotEmpty && !isCompact) ...[
                const SizedBox(height: 4),
                Row(
                  children: [
                    Icon(
                      Icons.people,
                      size: 14,
                      color: Colors.grey[600],
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${event.attendees.length} attendees',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Colors.grey[600],
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
  }

  DateTime _getStartOfWeek(DateTime date) {
    final daysFromMonday = date.weekday - 1;
    return date.subtract(Duration(days: daysFromMonday));
  }

  String _getDayName(int weekday) {
    final days = [
      'calendar.day_mon_short'.tr(),
      'calendar.day_tue_short'.tr(),
      'calendar.day_wed_short'.tr(),
      'calendar.day_thu_short'.tr(),
      'calendar.day_fri_short'.tr(),
      'calendar.day_sat_short'.tr(),
      'calendar.day_sun_short'.tr()
    ];
    return days[weekday - 1];
  }

  String _getFormattedDate(DateTime date) {
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

    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final tomorrow = today.add(const Duration(days: 1));
    final dateOnly = DateTime(date.year, date.month, date.day);

    if (dateOnly == today) {
      return '${'calendar.today'.tr()}, ${months[date.month - 1]} ${date.day}';
    } else if (dateOnly == tomorrow) {
      return '${'calendar.tomorrow'.tr()}, ${months[date.month - 1]} ${date.day}';
    } else {
      return '${months[date.month - 1]} ${date.day}, ${date.year}';
    }
  }

  String _formatTime(DateTime time) {
    final hour = time.hour > 12 ? time.hour - 12 : time.hour;
    final minute = time.minute.toString().padLeft(2, '0');
    final period = time.hour >= 12 ? 'PM' : 'AM';
    return '${hour == 0 ? 12 : hour}:$minute $period';
  }
}