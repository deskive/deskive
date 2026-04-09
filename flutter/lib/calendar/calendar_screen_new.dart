import 'package:flutter/material.dart';
import 'dart:math' as math;
import 'package:easy_localization/easy_localization.dart';
import 'models/calendar_event.dart';
import 'calendar_analytics_screen.dart';
import '../videocalls/schedule_meeting_screen.dart';
import 'edit_event_screen.dart';
import 'create_event_screen.dart';
import 'calendar_settings_screen.dart';
import '../theme/app_theme.dart';

class CalendarScreenNew extends StatefulWidget {
  const CalendarScreenNew({super.key});

  @override
  State<CalendarScreenNew> createState() => _CalendarScreenNewState();
}

class _CalendarScreenNewState extends State<CalendarScreenNew> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  DateTime _selectedDate = DateTime.now();
  String _currentView = 'Day';
  final ScrollController _timelineController = ScrollController();
  
  // Calendar Settings
  final bool _showWeekends = true;
  final bool _use24HourFormat = false;
  final bool _showWeekNumbers = false;
  final bool _defaultEventReminders = true;
  final bool _conflictAlerts = true;
  
  // Categories
  final List<Map<String, dynamic>> _categories = [
    {'name': 'Personal', 'color': Colors.blue, 'icon': Icons.home, 'description': 'Personal events and activities', 'count': 3},
    {'name': 'Work', 'color': Colors.green, 'icon': Icons.work, 'description': 'Work-related tasks and meetings', 'count': 5},
    {'name': 'Meeting', 'color': Colors.orange, 'icon': Icons.groups, 'description': 'Team meetings and collaborations', 'count': 2},
    {'name': 'Deadline', 'color': Colors.red, 'icon': Icons.flag, 'description': 'Important deadlines and due dates', 'count': 1},
  ];

  final List<CalendarEvent> _events = [

    CalendarEvent(
      id: '1a',
      title: 'Lunch Break',
      description: 'Take a well-deserved break',
      startTime: DateTime(DateTime.now().year, DateTime.now().month, DateTime.now().day, 12, 0),
      endTime: DateTime(DateTime.now().year, DateTime.now().month, DateTime.now().day, 13, 0),
      type: 'personal',
      color: Colors.green,
      attendees: [],
    ),
    CalendarEvent(
      id: '2',
      title: 'Project Review',
      description: 'Quarterly project review meeting',
      startTime: DateTime.now().add(const Duration(days: 1, hours: 2)),
      endTime: DateTime.now().add(const Duration(days: 1, hours: 3)),
      type: 'meeting',
      color: Colors.blue,
      attendees: ['Sarah Williams', 'David Brown'],
    ),
    CalendarEvent(
      id: '3',
      title: 'Client Presentation',
      description: 'Present final project deliverables to client',
      startTime: DateTime.now().add(const Duration(days: 2, hours: 4)),
      endTime: DateTime.now().add(const Duration(days: 2, hours: 5)),
      type: 'presentation',
      color: Colors.green,
      attendees: ['John Doe', 'Client Team'],
    ),
    CalendarEvent(
      id: '4',
      title: 'Deadline: Feature Implementation',
      description: 'Complete new feature implementation',
      startTime: DateTime.now().add(const Duration(days: 3)),
      endTime: DateTime.now().add(const Duration(days: 3)),
      type: 'deadline',
      color: Colors.red,
      attendees: [],
    ),
  ];

  @override
  void initState() {
    super.initState();
    // Auto scroll to current time when in day view
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_currentView == 'Day') {
        _scrollToCurrentTime();
      }
    });
  }

  void _scrollToCurrentTime() {
    final currentHour = DateTime.now().hour;
    final scrollPosition = (currentHour - 3) * 80.0; // 80px per hour, start 3 hours before
    if (scrollPosition > 0 && _timelineController.hasClients) {
      _timelineController.animateTo(
        scrollPosition,
        duration: const Duration(milliseconds: 500),
        curve: Curves.easeInOut,
      );
    }
  }

  @override
  void dispose() {
    _timelineController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      appBar: AppBar(
        title: Text(_currentView == 'Month' ? 'calendar.calendar'.tr() : _getDateTitle()),
        actions: [
          // View dropdown
          PopupMenuButton<String>(
            icon: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(_currentView, style: const TextStyle(fontSize: 14)),
                const SizedBox(width: 2),
                const Icon(Icons.arrow_drop_down, size: 20),
              ],
            ),
            onSelected: (value) {
              setState(() {
                _currentView = value;
                if (value == 'Day') {
                  WidgetsBinding.instance.addPostFrameCallback((_) {
                    _scrollToCurrentTime();
                  });
                }
              });
            },
            itemBuilder: (context) => [
              _buildViewMenuItem('Month', Icons.calendar_month),
              _buildViewMenuItem('Week', Icons.view_week),
              _buildViewMenuItem('Day', Icons.today),
              _buildViewMenuItem('Agenda', Icons.list_alt),
            ],
          ),
          // Today button
          IconButton(
            icon: const Icon(Icons.today),
            onPressed: () {
              setState(() {
                _selectedDate = DateTime.now();
                if (_currentView == 'Day') {
                  _scrollToCurrentTime();
                }
              });
            },
            tooltip: 'calendar.go_to_today'.tr(),
          ),
          // Drawer button
          IconButton(
            icon: const Icon(Icons.menu),
            onPressed: () {
              _scaffoldKey.currentState?.openEndDrawer();
            },
            tooltip: 'calendar.open_menu'.tr(),
          ),
        ],
      ),
      endDrawer: _buildDrawer(),
      body: _buildCurrentView(),
      floatingActionButton: Theme(
        data: Theme.of(context).copyWith(
          floatingActionButtonTheme: FloatingActionButtonThemeData(
            extendedSizeConstraints: BoxConstraints.tightFor(
              height: 40,
            ),
            extendedPadding: const EdgeInsets.symmetric(horizontal: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(5),
            ),
          ),
        ),
        child: FloatingActionButton.extended(
          onPressed: _showCreateEventDialog,
          label: Text('calendar.new_event'.tr(), style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
          icon: const Icon(Icons.add, color: Colors.white, size: 20),
          backgroundColor: context.primaryColor,
          elevation: 2,
        ),
      ),
    );
  }

  String _getViewLabel(String view) {
    switch (view) {
      case 'Month':
        return 'calendar.view_month'.tr();
      case 'Week':
        return 'calendar.view_week'.tr();
      case 'Day':
        return 'calendar.view_day'.tr();
      case 'Agenda':
        return 'calendar.view_agenda'.tr();
      default:
        return view;
    }
  }

  PopupMenuItem<String> _buildViewMenuItem(String view, IconData icon) {
    final isSelected = _currentView == view;
    return PopupMenuItem(
      value: view,
      child: Row(
        children: [
          Icon(
            icon,
            size: 18,
            color: isSelected ? Theme.of(context).colorScheme.primary : null
          ),
          const SizedBox(width: 8),
          Text(
            _getViewLabel(view),
            style: TextStyle(
              color: isSelected ? Theme.of(context).colorScheme.primary : null,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
            )
          ),
        ],
      ),
    );
  }

  Widget _buildDrawer() {
    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          Container(
            height: 380,
            padding: const EdgeInsets.fromLTRB(16, 48, 16, 16),
            child: Column(
              children: [
                // Month navigation header
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    IconButton(
                      icon: Icon(
                        Icons.chevron_left,
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                      onPressed: () {
                        setState(() {
                          _selectedDate = DateTime(_selectedDate.year, _selectedDate.month - 1, _selectedDate.day);
                        });
                      },
                    ),
                    Text(
                      _getMonthYear(_selectedDate),
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).colorScheme.onSurface,
                      ),
                    ),
                    IconButton(
                      icon: Icon(
                        Icons.chevron_right,
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                      onPressed: () {
                        setState(() {
                          _selectedDate = DateTime(_selectedDate.year, _selectedDate.month + 1, _selectedDate.day);
                        });
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                // Days of week
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    'calendar.day_sun_short'.tr(),
                    'calendar.day_mon_short'.tr(),
                    'calendar.day_tue_short'.tr(),
                    'calendar.day_wed_short'.tr(),
                    'calendar.day_thu_short'.tr(),
                    'calendar.day_fri_short'.tr(),
                    'calendar.day_sat_short'.tr(),
                  ].map((day) =>
                    SizedBox(
                      width: 38,
                      child: Center(
                        child: Text(
                          day,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ),
                    ),
                  ).toList(),
                ),
                const SizedBox(height: 12),
                // Calendar grid
                Expanded(
                  child: GridView.builder(
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 7,
                      childAspectRatio: 1.1,
                      mainAxisSpacing: 6,
                      crossAxisSpacing: 6,
                    ),
                    itemCount: 42, // 6 weeks to ensure we always show full month
                    itemBuilder: (context, index) {
                      final firstDayOfMonth = DateTime(_selectedDate.year, _selectedDate.month, 1);
                      final firstDayWeekday = firstDayOfMonth.weekday % 7; // Convert to 0-6 (Sunday-Saturday)
                      final dayNumber = index - firstDayWeekday + 1;
                      final daysInMonth = DateTime(_selectedDate.year, _selectedDate.month + 1, 0).day;
                      
                      DateTime date;
                      bool isPreviousMonth = false;
                      bool isNextMonth = false;
                      
                      if (dayNumber <= 0) {
                        // Previous month
                        final prevMonth = DateTime(_selectedDate.year, _selectedDate.month - 1);
                        final daysInPrevMonth = DateTime(prevMonth.year, prevMonth.month + 1, 0).day;
                        date = DateTime(prevMonth.year, prevMonth.month, daysInPrevMonth + dayNumber);
                        isPreviousMonth = true;
                      } else if (dayNumber > daysInMonth) {
                        // Next month
                        final nextMonth = DateTime(_selectedDate.year, _selectedDate.month + 1);
                        date = DateTime(nextMonth.year, nextMonth.month, dayNumber - daysInMonth);
                        isNextMonth = true;
                      } else {
                        // Current month
                        date = DateTime(_selectedDate.year, _selectedDate.month, dayNumber);
                      }
                      
                      final isToday = DateTime.now().year == date.year &&
                        DateTime.now().month == date.month &&
                        DateTime.now().day == date.day;
                      final isSelected = _selectedDate.year == date.year &&
                        _selectedDate.month == date.month &&
                        _selectedDate.day == date.day;
                      
                      final hasEvents = _getEventsForDay(date).isNotEmpty;
                      
                      return InkWell(
                        onTap: () {
                          setState(() {
                            _selectedDate = date;
                            if (_currentView != 'Month') {
                              _currentView = 'Day';
                            }
                          });
                          Navigator.pop(context);
                        },
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          decoration: BoxDecoration(
                            color: isToday 
                              ? Theme.of(context).colorScheme.primary
                              : isSelected
                                ? Theme.of(context).colorScheme.primary.withValues(alpha: 0.3)
                                : null,
                            borderRadius: BorderRadius.circular(8),
                            border: isSelected && !isToday
                              ? Border.all(
                                  color: Theme.of(context).colorScheme.primary,
                                  width: 2,
                                )
                              : null,
                          ),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                date.day.toString(),
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: isToday || isSelected ? FontWeight.bold : FontWeight.normal,
                                  color: isToday 
                                    ? Theme.of(context).colorScheme.onPrimary
                                    : (isPreviousMonth || isNextMonth)
                                      ? Theme.of(context).colorScheme.onSurfaceVariant.withValues(alpha: 0.4)
                                      : Theme.of(context).colorScheme.onSurface,
                                ),
                              ),
                              if (hasEvents) ...[
                                const SizedBox(height: 2),
                                Container(
                                  width: 4,
                                  height: 4,
                                  decoration: BoxDecoration(
                                    color: isToday
                                      ? Theme.of(context).colorScheme.onPrimary
                                      : Theme.of(context).colorScheme.primary,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
          const Divider(),
          // Categories Section
          _buildCategoriesDrawerSection(),
          const Divider(),
          // Quick Status Section
          _buildQuickStatusDrawerSection(),
          const Divider(),
          // Quick Actions Section
          _buildQuickActionsDrawerSection(),
        ],
      ),
    );
  }

  Widget _buildQuickStatusDrawerSection() {
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

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: Text(
            'calendar.quick_status'.tr(),
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        ListTile(
          dense: true,
          visualDensity: VisualDensity.compact,
          title: Text('calendar.total_events'.tr()),
          trailing: Text(
            totalEvents.toString(),
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
              color: Colors.black,
            ),
          ),
        ),
        ListTile(
          dense: true,
          visualDensity: VisualDensity.compact,
          title: Text('calendar.this_week'.tr()),
          trailing: Text(
            thisWeekEvents.toString(),
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
              color: Colors.black,
            ),
          ),
        ),
        ListTile(
          dense: true,
          visualDensity: VisualDensity.compact,
          title: Text('calendar.upcoming'.tr()),
          trailing: Text(
            upcomingEvents.toString(),
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
              color: Colors.black,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCategoriesDrawerSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'calendar.categories'.tr(),
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              IconButton(
                icon: const Icon(Icons.add, size: 20),
                onPressed: _showCreateCategoryDialog,
                tooltip: 'calendar.add_category'.tr(),
              ),
            ],
          ),
        ),
        ..._categories.map((category) {
          return ListTile(
            dense: true,
            visualDensity: VisualDensity.compact,
            leading: Icon(
              category['icon'] as IconData,
              color: category['color'] as Color,
              size: 18,
            ),
            title: Text(category['name'] as String),
            trailing: Text(
              '${category['count']}',
              style: TextStyle(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
                fontWeight: FontWeight.bold,
                fontSize: 12,
              ),
            ),
            onTap: () {
              Navigator.pop(context);
              _showEditCategoryDialog(category);
            },
          );
        }),
      ],
    );
  }

  Widget _buildQuickActionsDrawerSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: Text(
            'calendar.quick_actions'.tr(),
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        ListTile(
          leading: const Icon(Icons.schedule),
          title: Text('calendar.schedule_meeting'.tr()),
          onTap: () async {
            Navigator.pop(context);
            final result = await Navigator.push<CalendarEvent>(
              context,
              MaterialPageRoute(
                builder: (context) => ScheduleMeetingScreen(selectedDate: _selectedDate),
              ),
            );
            if (result != null) {
              setState(() {
                _events.add(result);
              });
            }
          },
        ),
        ListTile(
          leading: const Icon(Icons.auto_awesome),
          title: Text('calendar.ai_time_suggestions'.tr()),
          onTap: () {
            Navigator.pop(context);
            // AI Time Suggestions feature coming soon
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('calendar.ai_suggestions_coming_soon'.tr())),
            );
          },
        ),
        ListTile(
          leading: const Icon(Icons.analytics),
          title: Text('calendar.calendar_analytics'.tr()),
          onTap: () {
            Navigator.pop(context);
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
        ListTile(
          leading: const Icon(Icons.settings),
          title: Text('calendar.calendar_settings'.tr()),
          onTap: () {
            Navigator.pop(context);
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => const CalendarSettingsScreen(),
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildCurrentView() {
    switch (_currentView) {
      case 'Month':
        return _buildMonthView();
      case 'Week':
        return _buildWeekView();
      case 'Day':
        return _buildDayView();
      case 'Agenda':
        return _buildAgendaView();
      default:
        return _buildMonthView();
    }
  }

  Widget _buildMonthView() {
    return Column(
      children: [
        // Month navigation header
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
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
                },
              ),
              GestureDetector(
                onTap: _showMonthYearPicker,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      '${_getMonthName(_selectedDate.month)} ${_selectedDate.year}',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(width: 4),
                    const Icon(Icons.arrow_drop_down, size: 20),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.chevron_right),
                onPressed: () {
                  setState(() {
                    _selectedDate = DateTime(_selectedDate.year, _selectedDate.month + 1);
                  });
                },
              ),
            ],
          ),
        ),
        // Days of week header
        Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Row(
            children: List.generate(7, (index) {
              final days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
              final isWeekend = index >= 5;
              return Expanded(
                child: Center(
                  child: Text(
                    days[index],
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: isWeekend 
                        ? Theme.of(context).colorScheme.error.withValues(alpha: 0.7)
                        : Theme.of(context).colorScheme.onSurfaceVariant,
                      fontSize: 12,
                    ),
                  ),
                ),
              );
            }),
          ),
        ),
        // Calendar grid
        Expanded(
          child: GridView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 7,
              childAspectRatio: 1.0,
            ),
            itemCount: 42, // 6 weeks * 7 days
            itemBuilder: (context, index) {
              final day = _getDayForIndex(index);
              final hasEvents = _getEventsForDay(day).isNotEmpty;
              final isToday = _isToday(day);
              final isCurrentMonth = day.month == _selectedDate.month;
              final isSelected = day.day == _selectedDate.day && 
                               day.month == _selectedDate.month &&
                               day.year == _selectedDate.year;
              
              return InkWell(
                onTap: () {
                  setState(() {
                    _selectedDate = day;
                    _currentView = 'Day';
                  });
                  WidgetsBinding.instance.addPostFrameCallback((_) {
                    _scrollToCurrentTime();
                  });
                },
                child: Container(
                  margin: const EdgeInsets.all(2),
                  decoration: BoxDecoration(
                    color: isToday 
                        ? Theme.of(context).colorScheme.primary
                        : isSelected
                            ? Theme.of(context).colorScheme.primaryContainer
                            : null,
                    borderRadius: BorderRadius.circular(8),
                    border: isSelected && !isToday
                        ? Border.all(
                            color: Theme.of(context).colorScheme.primary, 
                            width: 2
                          )
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
                                  : Theme.of(context).colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
                          fontWeight: isToday || isSelected ? FontWeight.bold : FontWeight.normal,
                        ),
                      ),
                      if (hasEvents) ...[
                        const SizedBox(height: 4),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: List.generate(
                            _getEventsForDay(day).length > 3 ? 3 : _getEventsForDay(day).length,
                            (i) => Container(
                              margin: const EdgeInsets.symmetric(horizontal: 1),
                              width: 4,
                              height: 4,
                              decoration: BoxDecoration(
                                color: isToday 
                                    ? Theme.of(context).colorScheme.onPrimary
                                    : _getEventsForDay(day)[i].color,
                                shape: BoxShape.circle,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildWeekView() {
    final weekStart = _selectedDate.subtract(Duration(days: _selectedDate.weekday - 1));
    
    return Column(
      children: [
        // Week header
        Container(
          height: 80,
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            border: Border(
              bottom: BorderSide(
                color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.2),
              ),
            ),
          ),
          child: Row(
            children: [
              // Time column header
              Container(
                width: 60,
                alignment: Alignment.center,
                child: Text(
                  'GMT',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
              ),
              // Days headers
              ...List.generate(7, (index) {
                final date = weekStart.add(Duration(days: index));
                final isToday = _isToday(date);
                final isSelected = date.day == _selectedDate.day && 
                                 date.month == _selectedDate.month;
                
                return Expanded(
                  child: InkWell(
                    onTap: () {
                      setState(() {
                        _selectedDate = date;
                        _currentView = 'Day';
                      });
                    },
                    child: Container(
                      decoration: BoxDecoration(
                        border: Border(
                          left: BorderSide(
                            color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.2),
                          ),
                        ),
                        color: isSelected 
                          ? Theme.of(context).colorScheme.primaryContainer.withValues(alpha: 0.3)
                          : null,
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            _getDayName(date.weekday).substring(0, 3),
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Container(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                              color: isToday 
                                ? Theme.of(context).colorScheme.primary
                                : null,
                              shape: BoxShape.circle,
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              '${date.day}',
                              style: TextStyle(
                                color: isToday 
                                  ? Theme.of(context).colorScheme.onPrimary
                                  : Theme.of(context).colorScheme.onSurface,
                                fontWeight: isToday ? FontWeight.bold : FontWeight.normal,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }),
            ],
          ),
        ),
        // Week grid with time slots
        Expanded(
          child: SingleChildScrollView(
            controller: _timelineController,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Time labels column
                Column(
                  children: List.generate(24, (hour) {
                    return Container(
                      width: 60,
                      height: 60,
                      alignment: Alignment.topCenter,
                      padding: const EdgeInsets.only(top: 2),
                      child: Text(
                        _formatHour(hour),
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                          fontSize: 11,
                        ),
                      ),
                    );
                  }),
                ),
                // Days columns
                ...List.generate(7, (dayIndex) {
                  final date = weekStart.add(Duration(days: dayIndex));
                  final dayEvents = _getEventsForDay(date);
                  
                  return Expanded(
                    child: Container(
                      decoration: BoxDecoration(
                        border: Border(
                          left: BorderSide(
                            color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.2),
                          ),
                        ),
                      ),
                      child: Stack(
                        children: [
                          // Hour grid lines
                          Column(
                            children: List.generate(24, (hour) {
                              return Container(
                                height: 60,
                                decoration: BoxDecoration(
                                  border: Border(
                                    top: BorderSide(
                                      color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.1),
                                    ),
                                  ),
                                ),
                              );
                            }),
                          ),
                          // Events
                          ...dayEvents.map((event) {
                            final startHour = event.startTime.hour + 
                                             event.startTime.minute / 60.0;
                            final duration = event.endTime.difference(event.startTime).inMinutes / 60.0;
                            
                            return Positioned(
                              top: startHour * 60,
                              left: 2,
                              right: 2,
                              height: duration * 60 - 2,
                              child: GestureDetector(
                                onTap: () => _showEventDetails(event),
                                child: Container(
                                  padding: const EdgeInsets.all(4),
                                  decoration: BoxDecoration(
                                    color: event.color.withValues(alpha: 0.8),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    event.title,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w500,
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ),
                            );
                          }),
                        ],
                      ),
                    ),
                  );
                }),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDayView() {
    final dayEvents = _getEventsForDay(_selectedDate);
    
    return Column(
      children: [
        // Date header
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            border: Border(
              bottom: BorderSide(
                color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.2),
              ),
            ),
          ),
          child: Row(
            children: [
              Text(
                '${_selectedDate.day}',
                style: Theme.of(context).textTheme.displayMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(width: 16),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _getDayName(_selectedDate.weekday),
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Text(
                    '${_getMonthName(_selectedDate.month)} ${_selectedDate.year}',
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
              const Spacer(),
              // Navigation buttons
              IconButton(
                icon: const Icon(Icons.chevron_left),
                onPressed: () {
                  setState(() {
                    _selectedDate = _selectedDate.subtract(const Duration(days: 1));
                  });
                },
              ),
              IconButton(
                icon: const Icon(Icons.chevron_right),
                onPressed: () {
                  setState(() {
                    _selectedDate = _selectedDate.add(const Duration(days: 1));
                  });
                },
              ),
            ],
          ),
        ),
        // Timeline view
        Expanded(
          child: SingleChildScrollView(
            controller: _timelineController,
            child: Stack(
              children: [
                // Hour lines and labels
                Column(
                  children: List.generate(24, (hour) {
                    return Container(
                      height: 80,
                      decoration: BoxDecoration(
                        border: Border(
                          top: BorderSide(
                            color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.1),
                          ),
                        ),
                      ),
                      child: Row(
                        children: [
                          // Time label
                          Container(
                            width: 80,
                            padding: const EdgeInsets.only(right: 16, top: 2),
                            alignment: Alignment.topRight,
                            child: Text(
                              _formatHour(hour),
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: Theme.of(context).colorScheme.onSurfaceVariant,
                              ),
                            ),
                          ),
                          // Rest of the row
                          Expanded(
                            child: Container(
                              decoration: BoxDecoration(
                                border: Border(
                                  left: BorderSide(
                                    color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.2),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                ),
                // No events message
                if (dayEvents.isEmpty) ...[
                  Positioned(
                    top: 400, // Around 5 AM
                    left: 88,
                    right: 16,
                    child: Container(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        children: [
                          Icon(
                            Icons.event_busy,
                            size: 48,
                            color: Theme.of(context).colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'No events scheduled',
                            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                              color: Theme.of(context).colorScheme.onSurfaceVariant.withValues(alpha: 0.7),
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Tap the + button to add an event',
                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: Theme.of(context).colorScheme.onSurfaceVariant.withValues(alpha: 0.6),
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
                // Events
                ...dayEvents.map((event) {
                  final startHour = event.startTime.hour + event.startTime.minute / 60.0;
                  final duration = event.endTime.difference(event.startTime).inMinutes / 60.0;
                  
                  return Positioned(
                    top: startHour * 80,
                    left: 88,
                    right: 16,
                    height: math.max(duration * 80 - 4, 30), // Minimum height of 30px
                    child: GestureDetector(
                      onTap: () => _showEventDetails(event),
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [
                              event.color,
                              event.color.withValues(alpha: 0.8),
                            ],
                          ),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: Colors.white.withValues(alpha: 0.2),
                            width: 1,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: event.color.withValues(alpha: 0.4),
                              blurRadius: 8,
                              offset: const Offset(0, 4),
                            ),
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.1),
                              blurRadius: 2,
                              offset: const Offset(0, 1),
                            ),
                          ],
                        ),
                        child: LayoutBuilder(
                          builder: (context, constraints) {
                            final availableHeight = constraints.maxHeight;
                            final isCompact = availableHeight < 120;
                            
                            return SingleChildScrollView(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          event.title,
                                          style: TextStyle(
                                            color: Colors.white,
                                            fontWeight: FontWeight.bold,
                                            fontSize: isCompact ? 14 : 16,
                                          ),
                                          maxLines: isCompact ? 1 : 2,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                      if (!isCompact) ...[
                                        const SizedBox(width: 8),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: Colors.white.withValues(alpha: 0.2),
                                            borderRadius: BorderRadius.circular(12),
                                          ),
                                          child: Text(
                                            '${_formatTime(event.startTime)} - ${_formatTime(event.endTime)}',
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 10,
                                              fontWeight: FontWeight.w500,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                  if (isCompact) ...[
                                    const SizedBox(height: 4),
                                    Text(
                                      '${_formatTime(event.startTime)} - ${_formatTime(event.endTime)}',
                                      style: const TextStyle(
                                        color: Colors.white70,
                                        fontSize: 10,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ],
                                  if (event.description.isNotEmpty && !isCompact) ...[
                                    const SizedBox(height: 8),
                                    Container(
                                      padding: const EdgeInsets.all(8),
                                      decoration: BoxDecoration(
                                        color: Colors.white.withValues(alpha: 0.1),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        event.description,
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 13,
                                          fontWeight: FontWeight.w400,
                                        ),
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                  if (event.attendees.isNotEmpty && availableHeight > 80) ...[
                                    const SizedBox(height: 6),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: Colors.white.withValues(alpha: 0.15),
                                        borderRadius: BorderRadius.circular(16),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          const Icon(
                                            Icons.people_outline,
                                            color: Colors.white,
                                            size: 12,
                                          ),
                                          const SizedBox(width: 4),
                                          Flexible(
                                            child: Text(
                                              'calendar.attendees_count'.tr(args: ['${event.attendees.length}']),
                                              style: const TextStyle(
                                                color: Colors.white,
                                                fontSize: 10,
                                                fontWeight: FontWeight.w500,
                                              ),
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                  if (availableHeight > 60) ...[
                                    const SizedBox(height: 4),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: Colors.white.withValues(alpha: 0.2),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text(
                                        event.type,
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontSize: isCompact ? 8 : 10,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            );
                          },
                        ),
                      ),
                    ),
                  );
                }),
                // Current time indicator
                if (_isToday(_selectedDate)) ...[
                  Positioned(
                    top: (DateTime.now().hour + DateTime.now().minute / 60.0) * 80,
                    left: 80,
                    right: 0,
                    child: Row(
                      children: [
                        Container(
                          width: 12,
                          height: 12,
                          decoration: BoxDecoration(
                            color: Theme.of(context).colorScheme.error,
                            shape: BoxShape.circle,
                          ),
                        ),
                        Expanded(
                          child: Container(
                            height: 2,
                            color: Theme.of(context).colorScheme.error,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildAgendaView() {
    // Get events for the next 30 days
    final endDate = _selectedDate.add(const Duration(days: 30));
    final agendaEvents = _events.where((event) {
      return event.startTime.isAfter(_selectedDate.subtract(const Duration(days: 1))) &&
             event.startTime.isBefore(endDate);
    }).toList()
      ..sort((a, b) => a.startTime.compareTo(b.startTime));

    // Group events by date
    final Map<DateTime, List<CalendarEvent>> groupedEvents = {};
    for (final event in agendaEvents) {
      final date = DateTime(event.startTime.year, event.startTime.month, event.startTime.day);
      groupedEvents[date] ??= [];
      groupedEvents[date]!.add(event);
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: groupedEvents.length,
      itemBuilder: (context, index) {
        final date = groupedEvents.keys.elementAt(index);
        final events = groupedEvents[date]!;
        final isToday = _isToday(date);
        
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Date header
            Container(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Row(
                children: [
                  Text(
                    isToday ? 'Today' : _formatDateHeader(date),
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: isToday ? Theme.of(context).colorScheme.primary : null,
                    ),
                  ),
                  if (isToday) ...[
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.primary,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        'Today',
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.onPrimary,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            // Events for this date
            ...events.map((event) {
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: InkWell(
                  onTap: () => _showEventDetails(event),
                  borderRadius: BorderRadius.circular(12),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Time
                        SizedBox(
                          width: 60,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _formatTime(event.startTime),
                                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              Text(
                                _formatTime(event.endTime),
                                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 16),
                        // Color indicator
                        Container(
                          width: 4,
                          height: 50,
                          decoration: BoxDecoration(
                            color: event.color,
                            borderRadius: BorderRadius.circular(2),
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
                                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              if (event.description.isNotEmpty) ...[
                                const SizedBox(height: 4),
                                Text(
                                  event.description,
                                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                              if (event.attendees.isNotEmpty) ...[
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    Icon(
                                      Icons.people,
                                      size: 16,
                                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                                    ),
                                    const SizedBox(width: 4),
                                    Expanded(
                                      child: Text(
                                        event.attendees.join(', '),
                                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                          color: Theme.of(context).colorScheme.onSurfaceVariant,
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
                        // Action button
                        IconButton(
                          icon: const Icon(Icons.more_vert),
                          onPressed: () => _showEventActions(event),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }),
            const SizedBox(height: 16),
          ],
        );
      },
    );
  }

  // Helper methods
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
      'calendar.month_december'.tr()
    ];
    return months[month - 1];
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

  String _getMonthYear(DateTime date) {
    return '${_getMonthName(date.month)} ${date.year}';
  }

  String _getDateTitle() {
    if (_isToday(_selectedDate)) {
      return 'calendar.today'.tr();
    }
    final now = DateTime.now();
    final tomorrow = DateTime(now.year, now.month, now.day + 1);
    final yesterday = DateTime(now.year, now.month, now.day - 1);

    if (_selectedDate.year == tomorrow.year &&
        _selectedDate.month == tomorrow.month &&
        _selectedDate.day == tomorrow.day) {
      return 'calendar.tomorrow'.tr();
    }

    if (_selectedDate.year == yesterday.year &&
        _selectedDate.month == yesterday.month &&
        _selectedDate.day == yesterday.day) {
      return 'calendar.yesterday'.tr();
    }

    return '${_getDayName(_selectedDate.weekday)}, ${_getMonthName(_selectedDate.month)} ${_selectedDate.day}';
  }

  String _formatHour(int hour) {
    if (_use24HourFormat) {
      return '${hour.toString().padLeft(2, '0')}:00';
    }
    if (hour == 0) return '12 AM';
    if (hour == 12) return '12 PM';
    if (hour > 12) return '${hour - 12} PM';
    return '$hour AM';
  }

  String _formatTime(DateTime time) {
    final hour = time.hour;
    final minute = time.minute.toString().padLeft(2, '0');
    
    if (_use24HourFormat) {
      return '${hour.toString().padLeft(2, '0')}:$minute';
    }
    
    if (hour == 0) return '12:$minute AM';
    if (hour == 12) return '12:$minute PM';
    if (hour > 12) return '${hour - 12}:$minute PM';
    return '$hour:$minute AM';
  }

  String _formatDateHeader(DateTime date) {
    final now = DateTime.now();
    final difference = date.difference(now).inDays;
    
    if (difference == 1) return 'Tomorrow';
    if (difference == -1) return 'Yesterday';
    if (difference >= 0 && difference < 7) return _getDayName(date.weekday);
    
    return '${_getDayName(date.weekday)}, ${_getMonthName(date.month)} ${date.day}';
  }

  void _showEventDetails(CalendarEvent event) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        minChildSize: 0.4,
        maxChildSize: 0.9,
        expand: false,
        builder: (context, scrollController) => Container(
          padding: const EdgeInsets.all(24),
          child: ListView(
            controller: scrollController,
            children: [
              // Handle bar
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.onSurfaceVariant.withValues(alpha: 0.4),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              // Event title
              Row(
                children: [
                  Container(
                    width: 4,
                    height: 40,
                    decoration: BoxDecoration(
                      color: event.color,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Text(
                      event.title,
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.edit),
                    onPressed: () async {
                      Navigator.pop(context);
                      final result = await Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => EditEventScreen(
                            event: event,
                            onEventUpdated: (updatedEvent) {
                              Navigator.pop(context, updatedEvent);
                            },
                            onEventDeleted: () {
                              Navigator.pop(context, 'deleted');
                            },
                          ),
                        ),
                      );
                      if (result == 'deleted') {
                        setState(() {
                          _events.removeWhere((e) => e.id == event.id);
                        });
                      } else if (result != null) {
                        setState(() {
                          final index = _events.indexWhere((e) => e.id == event.id);
                          if (index != -1) {
                            _events[index] = result;
                          }
                        });
                      }
                    },
                  ),
                  IconButton(
                    icon: const Icon(Icons.delete),
                    onPressed: () {
                      Navigator.pop(context);
                      _deleteEvent(event);
                    },
                  ),
                ],
              ),
              const SizedBox(height: 24),
              // Time
              ListTile(
                leading: const Icon(Icons.access_time),
                title: Text(
                  '${_formatTime(event.startTime)} - ${_formatTime(event.endTime)}',
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
                subtitle: Text(_formatDateHeader(event.startTime)),
              ),
              // Description
              if (event.description.isNotEmpty) ...[
                ListTile(
                  leading: const Icon(Icons.notes),
                  title: Text(event.description),
                ),
              ],
              // Type
              ListTile(
                leading: const Icon(Icons.category),
                title: Text('calendar.event_type'.tr(args: [event.type])),
              ),
              // Attendees
              if (event.attendees.isNotEmpty) ...[
                ListTile(
                  leading: const Icon(Icons.people),
                  title: Text('calendar.attendees_count'.tr(args: ['${event.attendees.length}'])),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: event.attendees.map((attendee) => 
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Text('• $attendee'),
                      )
                    ).toList(),
                  ),
                ),
              ],
              const SizedBox(height: 24),
              // Actions
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        Navigator.pop(context);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('calendar.event_shared'.tr())),
                        );
                      },
                      icon: const Icon(Icons.share),
                      label: Text('common.share'.tr()),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        Navigator.pop(context);
                        _duplicateEvent(event);
                      },
                      icon: const Icon(Icons.copy),
                      label: Text('calendar.duplicate'.tr()),
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

  void _showEventActions(CalendarEvent event) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.symmetric(vertical: 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.edit),
              title: Text('calendar.edit_event'.tr()),
              onTap: () async {
                Navigator.pop(context);
                final result = await Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => EditEventScreen(
                      event: event,
                      onEventUpdated: (updatedEvent) {
                        Navigator.pop(context, updatedEvent);
                      },
                      onEventDeleted: () {
                        Navigator.pop(context, 'deleted');
                      },
                    ),
                  ),
                );
                if (result != null) {
                  setState(() {
                    final index = _events.indexWhere((e) => e.id == event.id);
                    if (index != -1) {
                      _events[index] = result;
                    }
                  });
                }
              },
            ),
            ListTile(
              leading: const Icon(Icons.copy),
              title: Text('calendar.duplicate_event'.tr()),
              onTap: () {
                Navigator.pop(context);
                _duplicateEvent(event);
              },
            ),
            ListTile(
              leading: const Icon(Icons.share),
              title: Text('calendar.share_event'.tr()),
              onTap: () {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('calendar.event_shared'.tr())),
                );
              },
            ),
            ListTile(
              leading: Icon(Icons.delete, color: Theme.of(context).colorScheme.error),
              title: Text('calendar.delete_event'.tr(), style: TextStyle(color: Theme.of(context).colorScheme.error)),
              onTap: () {
                Navigator.pop(context);
                _deleteEvent(event);
              },
            ),
          ],
        ),
      ),
    );
  }

  void _deleteEvent(CalendarEvent event) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('calendar.delete_event'.tr()),
        content: Text('calendar.delete_event_confirm'.tr(args: [event.title])),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('common.cancel'.tr()),
          ),
          TextButton(
            onPressed: () {
              setState(() {
                _events.removeWhere((e) => e.id == event.id);
              });
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('calendar.event_deleted'.tr(args: [event.title])),
                  action: SnackBarAction(
                    label: 'common.undo'.tr(),
                    onPressed: () {
                      setState(() {
                        _events.add(event);
                      });
                    },
                  ),
                ),
              );
            },
            child: Text(
              'common.delete'.tr(),
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ),
        ],
      ),
    );
  }

  void _duplicateEvent(CalendarEvent event) {
    final newEvent = CalendarEvent(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      title: '${event.title} (Copy)',
      description: event.description,
      startTime: event.startTime.add(const Duration(days: 1)),
      endTime: event.endTime.add(const Duration(days: 1)),
      type: event.type,
      color: event.color,
      attendees: List.from(event.attendees),
    );
    
    setState(() {
      _events.add(newEvent);
    });
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Event duplicated for ${_formatDateHeader(newEvent.startTime)}'),
        action: SnackBarAction(
          label: 'View',
          onPressed: () {
            setState(() {
              _selectedDate = newEvent.startTime;
              if (_currentView == 'Month') {
                _currentView = 'Day';
              }
            });
          },
        ),
      ),
    );
  }

  void _showMonthYearPicker() {
    showDialog(
      context: context,
      builder: (context) {
        int selectedYear = _selectedDate.year;
        int selectedMonth = _selectedDate.month;
        
        return StatefulBuilder(
          builder: (context, setState) => AlertDialog(
            title: Text('calendar.select_month_year'.tr()),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Year selector
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.chevron_left),
                      onPressed: () {
                        setState(() {
                          selectedYear--;
                        });
                      },
                    ),
                    Text(
                      selectedYear.toString(),
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    IconButton(
                      icon: const Icon(Icons.chevron_right),
                      onPressed: () {
                        setState(() {
                          selectedYear++;
                        });
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                // Month grid
                GridView.builder(
                  shrinkWrap: true,
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 3,
                    childAspectRatio: 2,
                  ),
                  itemCount: 12,
                  itemBuilder: (context, index) {
                    final month = index + 1;
                    final isSelected = month == selectedMonth;

                    return InkWell(
                      onTap: () {
                        setState(() {
                          selectedMonth = month;
                        });
                      },
                      child: Container(
                        margin: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: isSelected
                            ? Theme.of(context).colorScheme.primary
                            : null,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: isSelected
                              ? Theme.of(context).colorScheme.primary
                              : Theme.of(context).colorScheme.outline,
                          ),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          _getMonthName(month).substring(0, 3),
                          style: TextStyle(
                            color: isSelected
                              ? Theme.of(context).colorScheme.onPrimary
                              : null,
                            fontWeight: isSelected ? FontWeight.bold : null,
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: Text('common.cancel'.tr()),
              ),
              FilledButton(
                onPressed: () {
                  this.setState(() {
                    _selectedDate = DateTime(selectedYear, selectedMonth, 1);
                  });
                  Navigator.pop(context);
                },
                child: Text('calendar.select'.tr()),
              ),
            ],
          ),
        );
      },
    );
  }

  // Dialog methods (simplified versions - you can expand these)
  void _showCreateEventDialog() async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => CreateEventScreen(
          categories: _categories,
          onEventCreated: (newEvent) {
            setState(() {
              _events.add(newEvent);
            });
          },
        ),
      ),
    );
  }

  void _showCreateCategoryDialog() {
    String categoryName = '';
    String categoryDescription = '';
    Color selectedColor = Colors.red;
    IconData selectedIcon = Icons.calendar_today;
    
    final List<Color> colorOptions = [
      Colors.red, Colors.orange, Colors.amber, Colors.green, Colors.cyan,
      Colors.blue, Colors.purple, Colors.pink, Colors.grey, Colors.brown,
    ];
    
    final List<Map<String, dynamic>> iconOptions = [
      {'icon': Icons.calendar_month, 'color': const Color(0xFF4285F4)},
      {'icon': Icons.work_outline, 'color': const Color(0xFF8B4513)},
      {'icon': Icons.home_filled, 'color': const Color(0xFF34A853)},
      {'icon': Icons.favorite, 'color': const Color(0xFFE91E63)},
      {'icon': Icons.flight_takeoff, 'color': const Color(0xFF00BCD4)},
      {'icon': Icons.brush, 'color': AppTheme.warningLight},
      {'icon': Icons.restaurant_menu, 'color': context.colorScheme.error},
      {'icon': Icons.sports_gymnastics, 'color': AppTheme.infoLight},
      {'icon': Icons.school_outlined, 'color': const Color(0xFF3F51B5)},
      {'icon': Icons.directions_car_filled, 'color': const Color(0xFF009688)},
    ];
    
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => Dialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
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
                  padding: const EdgeInsets.all(20),
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
                
                // Content
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Name field
                        Text(
                          'calendar.name'.tr(),
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          autofocus: true,
                          decoration: InputDecoration(
                            hintText: 'calendar.category_name_hint'.tr(),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: const BorderSide(color: Colors.blue, width: 2),
                            ),
                            filled: true,
                            fillColor: Theme.of(context).colorScheme.surfaceContainerHighest,
                          ),
                          onChanged: (value) {
                            setDialogState(() {
                              categoryName = value;
                            });
                          },
                        ),
                        const SizedBox(height: 20),

                        // Description field
                        Text(
                          'calendar.description_optional'.tr(),
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          maxLines: 3,
                          decoration: InputDecoration(
                            hintText: 'calendar.description_hint'.tr(),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: const BorderSide(color: Colors.blue, width: 2),
                            ),
                            filled: true,
                            fillColor: Theme.of(context).colorScheme.surfaceContainerHighest,
                          ),
                          onChanged: (value) {
                            setDialogState(() {
                              categoryDescription = value;
                            });
                          },
                        ),
                        const SizedBox(height: 20),
                        
                        // Color selection
                        Row(
                          children: [
                            Icon(Icons.palette, size: 20),
                            const SizedBox(width: 8),
                            Text(
                              'calendar.color'.tr(),
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: colorOptions.take(5).map((color) {
                            final isSelected = selectedColor == color;
                            return Expanded(
                              child: GestureDetector(
                                onTap: () {
                                  setDialogState(() {
                                    selectedColor = color;
                                  });
                                },
                                child: Container(
                                  margin: const EdgeInsets.symmetric(horizontal: 4),
                                  width: 30,
                                  height: 30,
                                  decoration: BoxDecoration(
                                    color: color,
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                      color: isSelected ? Colors.white : Colors.transparent,
                                      width: 2,
                                    ),
                                  ),
                                  child: isSelected 
                                    ? const Icon(Icons.check, color: Colors.white, size: 16)
                                    : null,
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: colorOptions.skip(5).map((color) {
                            final isSelected = selectedColor == color;
                            return Expanded(
                              child: GestureDetector(
                                onTap: () {
                                  setDialogState(() {
                                    selectedColor = color;
                                  });
                                },
                                child: Container(
                                  margin: const EdgeInsets.symmetric(horizontal: 4),
                                  width: 30,
                                  height: 30,
                                  decoration: BoxDecoration(
                                    color: color,
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                      color: isSelected ? Colors.white : Colors.transparent,
                                      width: 2,
                                    ),
                                  ),
                                  child: isSelected 
                                    ? const Icon(Icons.check, color: Colors.white, size: 16)
                                    : null,
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                        const SizedBox(height: 12),
                        // Color bar
                        Container(
                          height: 8,
                          decoration: BoxDecoration(
                            color: selectedColor,
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                        const SizedBox(height: 20),
                        
                        // Icon selection
                        Text(
                          'calendar.icon_optional'.tr(),
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: iconOptions.take(5).map((iconData) {
                            final icon = iconData['icon'] as IconData;
                            final iconColor = iconData['color'] as Color;
                            final isSelected = selectedIcon == icon;
                            return Expanded(
                              child: GestureDetector(
                                onTap: () {
                                  setDialogState(() {
                                    selectedIcon = icon;
                                  });
                                },
                                child: Container(
                                  margin: const EdgeInsets.symmetric(horizontal: 4),
                                  width: 40,
                                  height: 40,
                                  decoration: BoxDecoration(
                                    color: isSelected 
                                      ? Colors.blue.withValues(alpha: 0.1)
                                      : Theme.of(context).colorScheme.surfaceContainerHighest,
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(
                                      color: isSelected 
                                        ? Colors.blue
                                        : Colors.transparent,
                                      width: 2,
                                    ),
                                  ),
                                  child: Icon(
                                    icon,
                                    color: isSelected ? Colors.blue : iconColor,
                                    size: 20,
                                  ),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: iconOptions.skip(5).map((iconData) {
                            final icon = iconData['icon'] as IconData;
                            final iconColor = iconData['color'] as Color;
                            final isSelected = selectedIcon == icon;
                            return Expanded(
                              child: GestureDetector(
                                onTap: () {
                                  setDialogState(() {
                                    selectedIcon = icon;
                                  });
                                },
                                child: Container(
                                  margin: const EdgeInsets.symmetric(horizontal: 4),
                                  width: 40,
                                  height: 40,
                                  decoration: BoxDecoration(
                                    color: isSelected 
                                      ? Colors.blue.withValues(alpha: 0.1)
                                      : Theme.of(context).colorScheme.surfaceContainerHighest,
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(
                                      color: isSelected 
                                        ? Colors.blue
                                        : Colors.transparent,
                                      width: 2,
                                    ),
                                  ),
                                  child: Icon(
                                    icon,
                                    color: isSelected ? Colors.blue : iconColor,
                                    size: 20,
                                  ),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                        const SizedBox(height: 20),
                        
                        // Preview section
                        if (categoryName.isNotEmpty) ...[
                          Text(
                            'calendar.preview'.tr(),
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Theme.of(context).colorScheme.surfaceContainerHighest,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.2),
                              ),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 8,
                                  height: 8,
                                  decoration: BoxDecoration(
                                    color: selectedColor,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Icon(
                                  selectedIcon,
                                  color: selectedColor,
                                  size: 20,
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    categoryName,
                                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
                
                // Action buttons
                Container(
                  padding: const EdgeInsets.all(20),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      TextButton(
                        onPressed: () => Navigator.pop(context),
                        child: Text(
                          'common.cancel'.tr(),
                          style: const TextStyle(color: Colors.blue),
                        ),
                      ),
                      const SizedBox(width: 12),
                      ElevatedButton(
                        onPressed: () {
                          if (categoryName.trim().isEmpty) {
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
                            (cat) => cat['name'].toString().toLowerCase() ==
                                    categoryName.trim().toLowerCase(),
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
                          
                          // Add the new category
                          setState(() {
                            _categories.add({
                              'name': categoryName.trim(),
                              'description': categoryDescription.trim(),
                              'color': selectedColor,
                              'icon': selectedIcon,
                              'count': 0,
                            });
                          });
                          
                          Navigator.pop(context);
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blue,
                          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        child: Text(
                          'calendar.create_category'.tr(),
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
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


  void _showEditCategoryDialog(Map<String, dynamic> category) {
    String categoryName = category['name'];
    String categoryDescription = category['description'] ?? '';
    Color selectedColor = category['color'];
    IconData selectedIcon = category['icon'];
    
    final List<Color> colorOptions = [
      Colors.red, Colors.orange, Colors.amber, Colors.green, Colors.cyan,
      Colors.blue, Colors.purple, Colors.pink, Colors.grey, Colors.brown,
    ];
    
    final List<Map<String, dynamic>> iconOptions = [
      {'icon': Icons.calendar_month, 'color': const Color(0xFF4285F4)},
      {'icon': Icons.work_outline, 'color': const Color(0xFF8B4513)},
      {'icon': Icons.home_filled, 'color': const Color(0xFF34A853)},
      {'icon': Icons.favorite, 'color': const Color(0xFFE91E63)},
      {'icon': Icons.flight_takeoff, 'color': const Color(0xFF00BCD4)},
      {'icon': Icons.brush, 'color': AppTheme.warningLight},
      {'icon': Icons.restaurant_menu, 'color': context.colorScheme.error},
      {'icon': Icons.sports_gymnastics, 'color': AppTheme.infoLight},
      {'icon': Icons.school_outlined, 'color': const Color(0xFF3F51B5)},
      {'icon': Icons.directions_car_filled, 'color': const Color(0xFF009688)},
    ];
    
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => Dialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
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
                  padding: const EdgeInsets.all(20),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'calendar.edit_category'.tr(),
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.delete, color: Colors.red),
                            onPressed: () {
                              Navigator.pop(context);
                              _showDeleteCategoryDialog(category);
                            },
                          ),
                          IconButton(
                            icon: const Icon(Icons.close),
                            onPressed: () => Navigator.pop(context),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                
                // Content
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Name field
                        Text(
                          'calendar.name'.tr(),
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          autofocus: true,
                          controller: TextEditingController(text: categoryName),
                          decoration: InputDecoration(
                            hintText: 'calendar.category_name_hint'.tr(),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: const BorderSide(color: Colors.blue, width: 2),
                            ),
                            filled: true,
                            fillColor: Theme.of(context).colorScheme.surfaceContainerHighest,
                          ),
                          onChanged: (value) {
                            setDialogState(() {
                              categoryName = value;
                            });
                          },
                        ),
                        const SizedBox(height: 20),

                        // Description field
                        Text(
                          'calendar.description_optional'.tr(),
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          maxLines: 3,
                          controller: TextEditingController(text: categoryDescription),
                          decoration: InputDecoration(
                            hintText: 'calendar.description_hint'.tr(),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: const BorderSide(color: Colors.blue, width: 2),
                            ),
                            filled: true,
                            fillColor: Theme.of(context).colorScheme.surfaceContainerHighest,
                          ),
                          onChanged: (value) {
                            setDialogState(() {
                              categoryDescription = value;
                            });
                          },
                        ),
                        const SizedBox(height: 20),
                        
                        // Color selection
                        Row(
                          children: [
                            Icon(Icons.palette, size: 20),
                            const SizedBox(width: 8),
                            Text(
                              'calendar.color'.tr(),
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: colorOptions.take(5).map((color) {
                            final isSelected = selectedColor == color;
                            return Expanded(
                              child: GestureDetector(
                                onTap: () {
                                  setDialogState(() {
                                    selectedColor = color;
                                  });
                                },
                                child: Container(
                                  margin: const EdgeInsets.symmetric(horizontal: 4),
                                  width: 30,
                                  height: 30,
                                  decoration: BoxDecoration(
                                    color: color,
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                      color: isSelected ? Colors.white : Colors.transparent,
                                      width: 2,
                                    ),
                                  ),
                                  child: isSelected 
                                    ? const Icon(Icons.check, color: Colors.white, size: 16)
                                    : null,
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: colorOptions.skip(5).map((color) {
                            final isSelected = selectedColor == color;
                            return Expanded(
                              child: GestureDetector(
                                onTap: () {
                                  setDialogState(() {
                                    selectedColor = color;
                                  });
                                },
                                child: Container(
                                  margin: const EdgeInsets.symmetric(horizontal: 4),
                                  width: 30,
                                  height: 30,
                                  decoration: BoxDecoration(
                                    color: color,
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                      color: isSelected ? Colors.white : Colors.transparent,
                                      width: 2,
                                    ),
                                  ),
                                  child: isSelected 
                                    ? const Icon(Icons.check, color: Colors.white, size: 16)
                                    : null,
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                        const SizedBox(height: 12),
                        // Color bar
                        Container(
                          height: 8,
                          decoration: BoxDecoration(
                            color: selectedColor,
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                        const SizedBox(height: 20),
                        
                        // Icon selection
                        Text(
                          'calendar.icon_optional'.tr(),
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: iconOptions.take(5).map((iconData) {
                            final icon = iconData['icon'] as IconData;
                            final iconColor = iconData['color'] as Color;
                            final isSelected = selectedIcon == icon;
                            return Expanded(
                              child: GestureDetector(
                                onTap: () {
                                  setDialogState(() {
                                    selectedIcon = icon;
                                  });
                                },
                                child: Container(
                                  margin: const EdgeInsets.symmetric(horizontal: 4),
                                  width: 40,
                                  height: 40,
                                  decoration: BoxDecoration(
                                    color: isSelected 
                                      ? Colors.blue.withValues(alpha: 0.1)
                                      : Theme.of(context).colorScheme.surfaceContainerHighest,
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(
                                      color: isSelected 
                                        ? Colors.blue
                                        : Colors.transparent,
                                      width: 2,
                                    ),
                                  ),
                                  child: Icon(
                                    icon,
                                    color: isSelected ? Colors.blue : iconColor,
                                    size: 20,
                                  ),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: iconOptions.skip(5).map((iconData) {
                            final icon = iconData['icon'] as IconData;
                            final iconColor = iconData['color'] as Color;
                            final isSelected = selectedIcon == icon;
                            return Expanded(
                              child: GestureDetector(
                                onTap: () {
                                  setDialogState(() {
                                    selectedIcon = icon;
                                  });
                                },
                                child: Container(
                                  margin: const EdgeInsets.symmetric(horizontal: 4),
                                  width: 40,
                                  height: 40,
                                  decoration: BoxDecoration(
                                    color: isSelected 
                                      ? Colors.blue.withValues(alpha: 0.1)
                                      : Theme.of(context).colorScheme.surfaceContainerHighest,
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(
                                      color: isSelected 
                                        ? Colors.blue
                                        : Colors.transparent,
                                      width: 2,
                                    ),
                                  ),
                                  child: Icon(
                                    icon,
                                    color: isSelected ? Colors.blue : iconColor,
                                    size: 20,
                                  ),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                        const SizedBox(height: 20),
                        
                        // Preview section
                        if (categoryName.isNotEmpty) ...[
                          Text(
                            'calendar.preview'.tr(),
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Theme.of(context).colorScheme.surfaceContainerHighest,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.2),
                              ),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 8,
                                  height: 8,
                                  decoration: BoxDecoration(
                                    color: selectedColor,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Icon(
                                  selectedIcon,
                                  color: selectedColor,
                                  size: 20,
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    categoryName,
                                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
                
                // Action buttons
                Container(
                  padding: const EdgeInsets.all(20),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      TextButton(
                        onPressed: () => Navigator.pop(context),
                        child: Text(
                          'common.cancel'.tr(),
                          style: const TextStyle(color: Colors.blue),
                        ),
                      ),
                      const SizedBox(width: 12),
                      ElevatedButton(
                        onPressed: () {
                          if (categoryName.trim().isEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('calendar.enter_category_name'.tr()),
                                backgroundColor: Colors.red,
                              ),
                            );
                            return;
                          }

                          // Check if category name already exists in another category
                          final exists = _categories.any(
                            (cat) => cat['name'].toString().toLowerCase() ==
                                    categoryName.trim().toLowerCase() &&
                                    cat['name'] != category['name'],
                          );

                          if (exists) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('calendar.category_name_exists'.tr()),
                                backgroundColor: Colors.orange,
                              ),
                            );
                            return;
                          }

                          // Update the category
                          setState(() {
                            final index = _categories.indexWhere((cat) => cat['name'] == category['name']);
                            if (index != -1) {
                              _categories[index] = {
                                'name': categoryName.trim(),
                                'description': categoryDescription.trim(),
                                'color': selectedColor,
                                'icon': selectedIcon,
                                'count': category['count'],
                              };
                            }
                          });

                          Navigator.pop(context);
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blue,
                          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        child: Text(
                          'calendar.update_category'.tr(),
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
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

  void _showDeleteCategoryDialog(Map<String, dynamic> category) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('calendar.delete_category'.tr()),
        content: Text('calendar.delete_category_warning'.tr(args: [category['name']])),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('common.cancel'.tr()),
          ),
          TextButton(
            onPressed: () {
              setState(() {
                _categories.removeWhere((cat) => cat['name'] == category['name']);
              });
              Navigator.pop(context);
            },
            child: Text('common.delete'.tr(), style: const TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }


}