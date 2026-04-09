import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';

/// Dialog for scheduling a message to be sent later
class ScheduleMessageDialog extends StatefulWidget {
  final String? initialMessage;
  final Function(DateTime scheduledTime) onSchedule;

  const ScheduleMessageDialog({
    super.key,
    this.initialMessage,
    required this.onSchedule,
  });

  @override
  State<ScheduleMessageDialog> createState() => _ScheduleMessageDialogState();

  /// Show the schedule message dialog
  static Future<DateTime?> show(BuildContext context, {String? initialMessage}) async {
    DateTime? selectedTime;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => ScheduleMessageDialog(
        initialMessage: initialMessage,
        onSchedule: (time) {
          selectedTime = time;
          Navigator.pop(context);
        },
      ),
    );

    return selectedTime;
  }
}

class _ScheduleMessageDialogState extends State<ScheduleMessageDialog> {
  DateTime? _selectedDateTime;
  bool _showCustomPicker = false;

  // Predefined schedule options
  List<_ScheduleOption> get _predefinedOptions {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final tomorrow = today.add(const Duration(days: 1));

    // Find next Monday
    int daysUntilMonday = (DateTime.monday - now.weekday) % 7;
    if (daysUntilMonday == 0 && now.hour >= 9) {
      daysUntilMonday = 7; // Next week's Monday
    }
    final nextMonday = today.add(Duration(days: daysUntilMonday));

    return [
      // Later today (only if before 6 PM)
      if (now.hour < 18)
        _ScheduleOption(
          label: 'scheduled_message.later_today'.tr(),
          subtitle: _formatTime(DateTime(now.year, now.month, now.day, 18, 0)),
          dateTime: DateTime(now.year, now.month, now.day, 18, 0),
          icon: Icons.schedule,
        ),
      // Tomorrow morning
      _ScheduleOption(
        label: 'scheduled_message.tomorrow_morning'.tr(),
        subtitle: _formatDateTime(DateTime(tomorrow.year, tomorrow.month, tomorrow.day, 9, 0)),
        dateTime: DateTime(tomorrow.year, tomorrow.month, tomorrow.day, 9, 0),
        icon: Icons.wb_sunny_outlined,
      ),
      // Tomorrow afternoon
      _ScheduleOption(
        label: 'scheduled_message.tomorrow_afternoon'.tr(),
        subtitle: _formatDateTime(DateTime(tomorrow.year, tomorrow.month, tomorrow.day, 14, 0)),
        dateTime: DateTime(tomorrow.year, tomorrow.month, tomorrow.day, 14, 0),
        icon: Icons.wb_twilight,
      ),
      // Next Monday (only show if today is not Monday, or it's past 9 AM on Monday)
      if (daysUntilMonday > 0 || (daysUntilMonday == 0 && now.hour >= 9))
        _ScheduleOption(
          label: 'scheduled_message.next_monday'.tr(),
          subtitle: _formatDateTime(DateTime(nextMonday.year, nextMonday.month, nextMonday.day, 9, 0)),
          dateTime: DateTime(nextMonday.year, nextMonday.month, nextMonday.day, 9, 0),
          icon: Icons.next_week,
        ),
    ];
  }

  String _formatTime(DateTime dateTime) {
    return DateFormat.jm().format(dateTime);
  }

  String _formatDateTime(DateTime dateTime) {
    return DateFormat('EEE, MMM d \'at\' h:mm a').format(dateTime);
  }

  Future<void> _showDateTimePicker() async {
    final now = DateTime.now();

    // First pick date
    final date = await showDatePicker(
      context: context,
      initialDate: _selectedDateTime ?? now.add(const Duration(days: 1)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 365)),
    );

    if (date == null || !mounted) return;

    // Then pick time
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_selectedDateTime ?? DateTime(date.year, date.month, date.day, 9, 0)),
    );

    if (time == null || !mounted) return;

    final selectedDateTime = DateTime(
      date.year,
      date.month,
      date.day,
      time.hour,
      time.minute,
    );

    // Validate that selected time is in the future
    if (selectedDateTime.isBefore(now)) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('scheduled_message.error_past_time'.tr()),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() {
      _selectedDateTime = selectedDateTime;
      _showCustomPicker = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    final options = _predefinedOptions;

    return Container(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      decoration: BoxDecoration(
        color: isDarkMode ? Colors.grey[900] : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle bar
            Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(top: 12, bottom: 8),
              decoration: BoxDecoration(
                color: Colors.grey[400],
                borderRadius: BorderRadius.circular(2),
              ),
            ),

            // Title
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  Icon(
                    Icons.schedule_send,
                    color: Theme.of(context).primaryColor,
                  ),
                  const SizedBox(width: 12),
                  Text(
                    'scheduled_message.title'.tr(),
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),

            const Divider(),

            // Predefined options
            ...options.map((option) => ListTile(
              leading: Icon(option.icon, color: Theme.of(context).primaryColor),
              title: Text(option.label),
              subtitle: Text(
                option.subtitle,
                style: TextStyle(
                  color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
                  fontSize: 13,
                ),
              ),
              onTap: () {
                widget.onSchedule(option.dateTime);
              },
            )),

            const Divider(),

            // Custom date/time option
            ListTile(
              leading: Icon(
                Icons.calendar_today,
                color: _showCustomPicker
                    ? Theme.of(context).primaryColor
                    : (isDarkMode ? Colors.grey[400] : Colors.grey[600]),
              ),
              title: Text(
                _showCustomPicker && _selectedDateTime != null
                    ? _formatDateTime(_selectedDateTime!)
                    : 'scheduled_message.custom_time'.tr(),
              ),
              subtitle: _showCustomPicker && _selectedDateTime != null
                  ? Text(
                      'scheduled_message.tap_to_change'.tr(),
                      style: TextStyle(
                        color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
                        fontSize: 13,
                      ),
                    )
                  : null,
              trailing: _showCustomPicker && _selectedDateTime != null
                  ? ElevatedButton(
                      onPressed: () {
                        widget.onSchedule(_selectedDateTime!);
                      },
                      child: Text('scheduled_message.schedule'.tr()),
                    )
                  : null,
              onTap: _showDateTimePicker,
            ),

            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}

class _ScheduleOption {
  final String label;
  final String subtitle;
  final DateTime dateTime;
  final IconData icon;

  _ScheduleOption({
    required this.label,
    required this.subtitle,
    required this.dateTime,
    required this.icon,
  });
}
