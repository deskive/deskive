import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../theme/app_theme.dart';
import 'widgets/google_calendar_integration_section.dart';

class CalendarSettingsScreen extends StatefulWidget {
  const CalendarSettingsScreen({super.key});

  @override
  State<CalendarSettingsScreen> createState() => _CalendarSettingsScreenState();
}

class _CalendarSettingsScreenState extends State<CalendarSettingsScreen> {
  // Google Calendar integration section key for refreshing after OAuth callback
  final GlobalKey<GoogleCalendarIntegrationSectionState> _googleCalendarSectionKey =
      GlobalKey<GoogleCalendarIntegrationSectionState>();

  // Settings state
  bool showWeekends = true;
  bool use24HourFormat = false;
  bool showWeekNumbers = false;
  bool defaultEventReminders = true;
  bool conflictAlerts = true;

  // Theme-aware color getters
  Color get backgroundColor => Theme.of(context).brightness == Brightness.dark 
      ? const Color(0xFF0D1117) 
      : Colors.grey[50]!;
      
  Color get surfaceColor => Theme.of(context).brightness == Brightness.dark 
      ? const Color(0xFF161B22) 
      : Colors.white;
      
  Color get textColor => Theme.of(context).brightness == Brightness.dark 
      ? Colors.white 
      : Colors.black87;
      
  Color get subtitleColor => Theme.of(context).brightness == Brightness.dark 
      ? const Color(0xFF8B949E) 
      : Colors.grey[600]!;
      
  Color get borderColor => Theme.of(context).brightness == Brightness.dark 
      ? const Color(0xFF30363D) 
      : Colors.grey[300]!;

  void _exportCalendar() async {
    try {
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
                'calendar.exporting_calendar'.tr(),
                style: TextStyle(color: textColor),
              ),
            ],
          ),
        ),
      );

      // Simulate export process
      await Future.delayed(const Duration(seconds: 2));
      
      // Close loading dialog
      if (!mounted) return;
      Navigator.pop(context);
      
      // Show success dialog with export options
      if (!mounted) return;
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          backgroundColor: surfaceColor,
          title: Text(
            'calendar.export_calendar'.tr(),
            style: TextStyle(color: textColor, fontWeight: FontWeight.w600),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'calendar.export_success'.tr(),
                style: TextStyle(color: textColor),
              ),
              const SizedBox(height: 16),
              Text(
                'calendar.export_details'.tr(),
                style: TextStyle(color: textColor, fontWeight: FontWeight.w500),
              ),
              const SizedBox(height: 8),
              Text(
                '• ${'calendar.format_icalendar'.tr()}',
                style: TextStyle(color: subtitleColor, fontSize: 14),
              ),
              Text(
                '• ${'calendar.events_all'.tr()}',
                style: TextStyle(color: subtitleColor, fontSize: 14),
              ),
              Text(
                '• ${'calendar.file_saved_downloads'.tr()}',
                style: TextStyle(color: subtitleColor, fontSize: 14),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text('calendar.close'.tr(), style: TextStyle(color: subtitleColor)),
            ),
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('calendar.opening_file_location'.tr()),
                    backgroundColor: AppTheme.infoLight,
                  ),
                );
              },
              child: Text('calendar.open_file'.tr(), style: TextStyle(color: AppTheme.infoLight)),
            ),
          ],
        ),
      );
    } catch (e) {
      // Close loading dialog if still open
      if (mounted) Navigator.pop(context);
      
      // Show error dialog
      if (!mounted) return;
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          backgroundColor: surfaceColor,
          title: Text(
            'calendar.export_failed'.tr(),
            style: TextStyle(color: textColor, fontWeight: FontWeight.w600),
          ),
          content: Text(
            'calendar.export_failed_message'.tr(),
            style: TextStyle(color: textColor),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text('common.ok'.tr(), style: TextStyle(color: AppTheme.infoLight)),
            ),
          ],
        ),
      );
    }
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 32, 24, 16),
      child: Text(
        title,
        style: TextStyle(
          color: textColor,
          fontSize: 20,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildSettingTile({
    required String title,
    required String description,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        color: textColor,
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      description,
                      style: TextStyle(
                        color: subtitleColor,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
              Transform.scale(
                scale: 0.8,
                child: Switch.adaptive(
                  value: value,
                  onChanged: onChanged,
                  activeColor: AppTheme.infoLight,
                  activeTrackColor: AppTheme.infoLight.withValues(alpha: 0.5),
                  inactiveThumbColor: Theme.of(context).brightness == Brightness.dark
                      ? Colors.grey[400]
                      : Colors.grey[600],
                  inactiveTrackColor: Theme.of(context).brightness == Brightness.dark
                      ? Colors.grey[800]
                      : Colors.grey[300],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Widget _buildActionTile({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
  }) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 4),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: surfaceColor,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: borderColor),
          ),
          child: Row(
            children: [
              Icon(
                icon,
                color: textColor,
                size: 24,
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    color: textColor,
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDivider() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      height: 1,
      color: borderColor,
    );
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
          'calendar.calendar_settings'.tr(),
          style: TextStyle(
            color: textColor,
            fontSize: 20,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 8),
            
            // Display Settings
            _buildSectionTitle('calendar.display_settings'.tr()),

            _buildSettingTile(
              title: 'calendar.show_weekends'.tr(),
              description: 'calendar.show_weekends_desc'.tr(),
              value: showWeekends,
              onChanged: (value) => setState(() => showWeekends = value),
            ),

            _buildSettingTile(
              title: 'calendar.hour_format_24'.tr(),
              description: 'calendar.hour_format_24_desc'.tr(),
              value: use24HourFormat,
              onChanged: (value) => setState(() => use24HourFormat = value),
            ),

            _buildSettingTile(
              title: 'calendar.show_week_numbers'.tr(),
              description: 'calendar.show_week_numbers_desc'.tr(),
              value: showWeekNumbers,
              onChanged: (value) => setState(() => showWeekNumbers = value),
            ),
            
            _buildDivider(),
            
            // Notification Settings
            _buildSectionTitle('calendar.notification_settings'.tr()),

            _buildSettingTile(
              title: 'calendar.default_event_reminders'.tr(),
              description: 'calendar.default_event_reminders_desc'.tr(),
              value: defaultEventReminders,
              onChanged: (value) => setState(() => defaultEventReminders = value),
            ),

            _buildSettingTile(
              title: 'calendar.conflict_alerts'.tr(),
              description: 'calendar.conflict_alerts_desc'.tr(),
              value: conflictAlerts,
              onChanged: (value) => setState(() => conflictAlerts = value),
            ),
            
            _buildDivider(),

            // Export
            _buildSectionTitle('calendar.export'.tr()),

            _buildActionTile(
              icon: Icons.download,
              title: 'calendar.export_calendar_ics'.tr(),
              onTap: _exportCalendar,
            ),

            _buildDivider(),

            // App Integration Section
            _buildSectionTitle('calendar.app_integration'.tr()),

            // Google Calendar Integration Section
            GoogleCalendarIntegrationSection(
              key: _googleCalendarSectionKey,
              onConnectionChanged: () {
                // Refresh calendar data when connection changes
                setState(() {});
              },
            ),

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}