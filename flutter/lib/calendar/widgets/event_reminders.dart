import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../models/calendar_event.dart';
import '../../models/event_reminder.dart';

class EventRemindersService {
  static final EventRemindersService _instance = EventRemindersService._internal();
  factory EventRemindersService() => _instance;
  EventRemindersService._internal();

  late FlutterLocalNotificationsPlugin _flutterLocalNotificationsPlugin;
  bool _isInitialized = false;

  Future<void> initialize() async {
    if (_isInitialized) return;

    _flutterLocalNotificationsPlugin = FlutterLocalNotificationsPlugin();
    
    const AndroidInitializationSettings initializationSettingsAndroid =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    
    const DarwinInitializationSettings initializationSettingsIOS =
        DarwinInitializationSettings(
          requestAlertPermission: true,
          requestBadgePermission: true,
          requestSoundPermission: true,
        );

    const InitializationSettings initializationSettings = InitializationSettings(
      android: initializationSettingsAndroid,
      iOS: initializationSettingsIOS,
    );

    await _flutterLocalNotificationsPlugin.initialize(
      initializationSettings,
      onDidReceiveNotificationResponse: _onNotificationResponse,
    );

    _isInitialized = true;
  }

  void _onNotificationResponse(NotificationResponse response) {
    // Handle notification tap
    // Navigate to event details or calendar
  }

  Future<void> scheduleEventReminders(CalendarEvent event, List<EventReminder> reminders) async {
    if (!_isInitialized) await initialize();

    for (final reminder in reminders) {
      await _scheduleReminder(event, reminder);
    }
  }

  Future<void> _scheduleReminder(CalendarEvent event, EventReminder reminder) async {
    final reminderTime = event.startTime.subtract(Duration(minutes: reminder.minutesBefore));
    
    // Don't schedule past reminders
    if (reminderTime.isBefore(DateTime.now())) return;

    const AndroidNotificationDetails androidPlatformChannelSpecifics =
        AndroidNotificationDetails(
      'event_reminders',
      'Event Reminders',
      channelDescription: 'Notifications for upcoming events',
      importance: Importance.high,
      priority: Priority.high,
      showWhen: true,
    );

    const DarwinNotificationDetails iOSPlatformChannelSpecifics =
        DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const NotificationDetails platformChannelSpecifics = NotificationDetails(
      android: androidPlatformChannelSpecifics,
      iOS: iOSPlatformChannelSpecifics,
    );

    await _flutterLocalNotificationsPlugin.zonedSchedule(
      reminder.id.hashCode,
      _getReminderTitle(reminder),
      _getReminderBody(event, reminder),
      _convertToTZDateTime(reminderTime),
      platformChannelSpecifics,
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      uiLocalNotificationDateInterpretation:
          UILocalNotificationDateInterpretation.absoluteTime,
      payload: event.id,
    );
  }

  String _getReminderTitle(EventReminder reminder) {
    switch (reminder.type) {
      case ReminderType.notification:
        return 'Event Reminder';
      case ReminderType.email:
        return 'Email Reminder Sent';
      case ReminderType.popup:
        return 'Event Starting Soon';
      default:
        return 'Event Reminder';
    }
  }

  String _getReminderBody(CalendarEvent event, EventReminder reminder) {
    final timeText = reminder.minutesBefore < 60 
        ? '${reminder.minutesBefore} minutes'
        : '${(reminder.minutesBefore / 60).round()} hours';
    
    return '${event.title} starts in $timeText';
  }

  TZDateTime _convertToTZDateTime(DateTime dateTime) {
    // Convert to timezone-aware datetime
    // This is a simplified version - in production you'd use the timezone package
    return TZDateTime.from(dateTime, getLocation('UTC'));
  }

  Future<void> cancelEventReminders(String eventId) async {
    // In a real implementation, you'd keep track of notification IDs
    // and cancel them individually
    await _flutterLocalNotificationsPlugin.cancelAll();
  }

  Future<void> updateEventReminders(CalendarEvent event, List<EventReminder> reminders) async {
    await cancelEventReminders(event.id!);
    await scheduleEventReminders(event, reminders);
  }
}

class EventRemindersWidget extends StatefulWidget {
  final CalendarEvent event;
  final List<EventReminder>? initialReminders;
  final Function(List<EventReminder>)? onRemindersChanged;

  const EventRemindersWidget({
    Key? key,
    required this.event,
    this.initialReminders,
    this.onRemindersChanged,
  }) : super(key: key);

  @override
  State<EventRemindersWidget> createState() => _EventRemindersWidgetState();
}

class _EventRemindersWidgetState extends State<EventRemindersWidget> {
  late List<EventReminder> _reminders;

  @override
  void initState() {
    super.initState();
    _reminders = List.from(widget.initialReminders ?? _getDefaultReminders());
  }

  List<EventReminder> _getDefaultReminders() {
    return [
      EventReminder(
        id: '1',
        eventId: widget.event.id!,
        type: ReminderType.notification,
        minutesBefore: 15,
        isActive: true,
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(
              Icons.notifications,
              color: Theme.of(context).primaryColor,
            ),
            const SizedBox(width: 8),
            Text(
              'Reminders',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const Spacer(),
            TextButton(
              onPressed: _addReminder,
              child: Text('calendar.add'.tr()),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (_reminders.isEmpty)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              border: Border.all(color: Colors.grey.withOpacity(0.3)),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.notifications_off,
                  color: Colors.grey[400],
                ),
                const SizedBox(width: 8),
                Text(
                  'No reminders set',
                  style: TextStyle(color: Colors.grey[600]),
                ),
              ],
            ),
          )
        else
          ...._reminders.asMap().entries.map((entry) {
            final index = entry.key;
            final reminder = entry.value;
            return _buildReminderItem(reminder, index);
          }),
      ],
    );
  }

  Widget _buildReminderItem(EventReminder reminder, int index) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            // Reminder type icon
            Icon(
              _getReminderIcon(reminder.type),
              color: reminder.isActive 
                  ? Theme.of(context).primaryColor 
                  : Colors.grey,
            ),
            const SizedBox(width: 12),
            
            // Reminder details
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _getReminderText(reminder),
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  if (reminder.message?.isNotEmpty == true) ...[
                    const SizedBox(height: 4),
                    Text(
                      reminder.message!,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ],
              ),
            ),
            
            // Active/Inactive toggle
            Switch(
              value: reminder.isActive,
              onChanged: (value) {
                setState(() {
                  _reminders[index] = reminder.copyWith(isActive: value);
                });
                widget.onRemindersChanged?.call(_reminders);
              },
            ),
            
            // More options
            PopupMenuButton<String>(
              icon: const Icon(Icons.more_vert),
              itemBuilder: (context) => [
                PopupMenuItem(
                  value: 'edit',
                  child: Row(
                    children: [
                      const Icon(Icons.edit, size: 16),
                      const SizedBox(width: 8),
                      Text('calendar.edit'.tr()),
                    ],
                  ),
                ),
                PopupMenuItem(
                  value: 'duplicate',
                  child: Row(
                    children: [
                      const Icon(Icons.copy, size: 16),
                      const SizedBox(width: 8),
                      Text('calendar.duplicate'.tr()),
                    ],
                  ),
                ),
                const PopupMenuDivider(),
                PopupMenuItem(
                  value: 'delete',
                  child: Row(
                    children: [
                      const Icon(Icons.delete, size: 16, color: Colors.red),
                      const SizedBox(width: 8),
                      Text('common.delete'.tr(), style: const TextStyle(color: Colors.red)),
                    ],
                  ),
                ),
              ],
              onSelected: (value) => _handleReminderAction(value, reminder, index),
            ),
          ],
        ),
      ),
    );
  }

  IconData _getReminderIcon(ReminderType type) {
    switch (type) {
      case ReminderType.notification:
        return Icons.notifications;
      case ReminderType.email:
        return Icons.email;
      case ReminderType.popup:
        return Icons.popup_state;
      default:
        return Icons.notifications;
    }
  }

  String _getReminderText(EventReminder reminder) {
    final timeText = reminder.minutesBefore < 60 
        ? '${reminder.minutesBefore} minutes before'
        : '${(reminder.minutesBefore / 60).round()} hours before';
    
    final typeText = reminder.type.name.toLowerCase();
    
    return '${typeText.capitalize()} $timeText';
  }

  void _handleReminderAction(String action, EventReminder reminder, int index) {
    switch (action) {
      case 'edit':
        _editReminder(reminder, index);
        break;
      case 'duplicate':
        _duplicateReminder(reminder);
        break;
      case 'delete':
        _deleteReminder(index);
        break;
    }
  }

  void _addReminder() {
    _showReminderDialog();
  }

  void _editReminder(EventReminder reminder, int index) {
    _showReminderDialog(reminder: reminder, index: index);
  }

  void _duplicateReminder(EventReminder reminder) {
    final newReminder = reminder.copyWith(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
    );
    setState(() {
      _reminders.add(newReminder);
    });
    widget.onRemindersChanged?.call(_reminders);
  }

  void _deleteReminder(int index) {
    setState(() {
      _reminders.removeAt(index);
    });
    widget.onRemindersChanged?.call(_reminders);
  }

  void _showReminderDialog({EventReminder? reminder, int? index}) {
    showDialog(
      context: context,
      builder: (context) => ReminderDialog(
        reminder: reminder,
        eventId: widget.event.id!,
        onSave: (newReminder) {
          setState(() {
            if (index != null) {
              _reminders[index] = newReminder;
            } else {
              _reminders.add(newReminder);
            }
          });
          widget.onRemindersChanged?.call(_reminders);
        },
      ),
    );
  }
}

class ReminderDialog extends StatefulWidget {
  final EventReminder? reminder;
  final String eventId;
  final Function(EventReminder) onSave;

  const ReminderDialog({
    Key? key,
    this.reminder,
    required this.eventId,
    required this.onSave,
  }) : super(key: key);

  @override
  State<ReminderDialog> createState() => _ReminderDialogState();
}

class _ReminderDialogState extends State<ReminderDialog> {
  late ReminderType _selectedType;
  late int _minutesBefore;
  late String _customMessage;
  final TextEditingController _messageController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _selectedType = widget.reminder?.type ?? ReminderType.notification;
    _minutesBefore = widget.reminder?.minutesBefore ?? 15;
    _customMessage = widget.reminder?.message ?? '';
    _messageController.text = _customMessage;
  }

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.reminder != null ? 'Edit Reminder' : 'Add Reminder'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Reminder Type',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            const SizedBox(height: 8),
            ...ReminderType.values.map((type) {
              return RadioListTile<ReminderType>(
                title: Text(type.name.capitalize()),
                subtitle: Text(_getTypeDescription(type)),
                value: type,
                groupValue: _selectedType,
                onChanged: (value) {
                  setState(() => _selectedType = value!);
                },
              );
            }),
            
            const SizedBox(height: 16),
            Text(
              'Remind me',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            const SizedBox(height: 8),
            DropdownButtonFormField<int>(
              value: _minutesBefore,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              ),
              items: [
                5, 10, 15, 30, 60, 120, 1440, // 1440 = 1 day
              ].map((minutes) {
                return DropdownMenuItem<int>(
                  value: minutes,
                  child: Text(_formatDuration(minutes)),
                );
              }).toList(),
              onChanged: (value) {
                setState(() => _minutesBefore = value!);
              },
            ),
            
            const SizedBox(height: 16),
            Text(
              'Custom Message (Optional)',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _messageController,
              decoration: InputDecoration(
                border: const OutlineInputBorder(),
                hintText: 'calendar.custom_reminder_hint'.tr(),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              ),
              maxLines: 2,
              onChanged: (value) => _customMessage = value,
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: Text('common.cancel'.tr()),
        ),
        ElevatedButton(
          onPressed: _saveReminder,
          child: Text('common.save'.tr()),
        ),
      ],
    );
  }

  String _getTypeDescription(ReminderType type) {
    switch (type) {
      case ReminderType.notification:
        return 'Push notification on device';
      case ReminderType.email:
        return 'Email reminder';
      case ReminderType.popup:
        return 'Popup dialog when app is open';
      default:
        return '';
    }
  }

  String _formatDuration(int minutes) {
    if (minutes < 60) {
      return '$minutes minutes before';
    } else if (minutes < 1440) {
      final hours = minutes ~/ 60;
      return '$hours ${hours == 1 ? 'hour' : 'hours'} before';
    } else {
      final days = minutes ~/ 1440;
      return '$days ${days == 1 ? 'day' : 'days'} before';
    }
  }

  void _saveReminder() {
    final reminder = EventReminder(
      id: widget.reminder?.id ?? DateTime.now().millisecondsSinceEpoch.toString(),
      eventId: widget.eventId,
      type: _selectedType,
      minutesBefore: _minutesBefore,
      message: _customMessage.isNotEmpty ? _customMessage : null,
      isActive: true,
    );

    widget.onSave(reminder);
    Navigator.of(context).pop();
  }
}

extension StringExtensions on String {
  String capitalize() {
    return isEmpty ? this : this[0].toUpperCase() + substring(1);
  }
}