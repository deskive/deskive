import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:url_launcher/url_launcher.dart';

/// Badge widget to indicate an event is from Google Calendar
/// Tapping opens the event in Google Calendar
class GoogleEventBadge extends StatelessWidget {
  /// The URL to open in Google Calendar (htmlLink from Google Calendar API)
  final String? googleCalendarHtmlLink;

  /// The name of the Google Calendar this event belongs to
  final String? googleCalendarName;

  /// The color of the Google Calendar (hex format)
  final String? googleCalendarColor;

  /// Whether to show in compact mode (icon only)
  final bool compact;

  /// Whether the badge is interactive (can be tapped)
  final bool interactive;

  const GoogleEventBadge({
    super.key,
    this.googleCalendarHtmlLink,
    this.googleCalendarName,
    this.googleCalendarColor,
    this.compact = false,
    this.interactive = true,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final googleBlue = const Color(0xFF4285F4);

    // Parse calendar color or use default Google blue
    Color badgeColor = googleBlue;
    if (googleCalendarColor != null) {
      badgeColor = _parseColor(googleCalendarColor!) ?? googleBlue;
    }

    Widget badge = Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 6 : 8,
        vertical: compact ? 3 : 4,
      ),
      decoration: BoxDecoration(
        color: badgeColor.withValues(alpha: isDark ? 0.2 : 0.1),
        borderRadius: BorderRadius.circular(compact ? 4 : 6),
        border: Border.all(
          color: badgeColor.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Google Calendar icon
          Icon(
            Icons.event,
            size: compact ? 12 : 14,
            color: badgeColor,
          ),
          if (!compact) ...[
            const SizedBox(width: 4),
            Text(
              googleCalendarName ?? 'Google',
              style: TextStyle(
                fontSize: compact ? 10 : 11,
                color: badgeColor,
                fontWeight: FontWeight.w500,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            if (interactive && googleCalendarHtmlLink != null) ...[
              const SizedBox(width: 2),
              Icon(
                Icons.open_in_new,
                size: 10,
                color: badgeColor,
              ),
            ],
          ],
        ],
      ),
    );

    // Wrap with tooltip for compact mode
    if (compact) {
      badge = Tooltip(
        message: googleCalendarName != null
            ? '${'google_calendar.from'.tr()} $googleCalendarName'
            : 'google_calendar.event'.tr(),
        child: badge,
      );
    }

    // Make interactive if link is provided
    if (interactive && googleCalendarHtmlLink != null) {
      return GestureDetector(
        onTap: _openInGoogleCalendar,
        child: badge,
      );
    }

    return badge;
  }

  Future<void> _openInGoogleCalendar() async {
    if (googleCalendarHtmlLink == null) return;

    try {
      final uri = Uri.parse(googleCalendarHtmlLink!);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    } catch (e) {
      debugPrint('Failed to open Google Calendar link: $e');
    }
  }

  Color? _parseColor(String colorString) {
    try {
      if (colorString.startsWith('#')) {
        final hex = colorString.replaceFirst('#', '');
        if (hex.length == 6) {
          return Color(int.parse('FF$hex', radix: 16));
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  }
}

/// A larger Google Calendar indicator for event detail screens
class GoogleEventIndicator extends StatelessWidget {
  /// The URL to open in Google Calendar
  final String? googleCalendarHtmlLink;

  /// The name of the Google Calendar
  final String? googleCalendarName;

  /// The color of the Google Calendar
  final String? googleCalendarColor;

  const GoogleEventIndicator({
    super.key,
    this.googleCalendarHtmlLink,
    this.googleCalendarName,
    this.googleCalendarColor,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? Colors.white : Colors.black87;
    final subtitleColor = isDark ? const Color(0xFF8B949E) : Colors.grey[600]!;
    final borderColor = isDark ? const Color(0xFF30363D) : Colors.grey[300]!;
    final googleBlue = const Color(0xFF4285F4);

    Color calendarColor = googleBlue;
    if (googleCalendarColor != null) {
      calendarColor = _parseColor(googleCalendarColor!) ?? googleBlue;
    }

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: calendarColor.withValues(alpha: isDark ? 0.1 : 0.05),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: borderColor),
      ),
      child: Row(
        children: [
          // Google icon with calendar color
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: borderColor),
            ),
            child: Center(
              child: Icon(
                Icons.calendar_month,
                color: calendarColor,
                size: 24,
              ),
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
                      'google_calendar.synced_event'.tr(),
                      style: TextStyle(
                        color: textColor,
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 6,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: calendarColor.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        'google_calendar.read_only'.tr(),
                        style: TextStyle(
                          color: calendarColor,
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  googleCalendarName ?? 'Google Calendar',
                  style: TextStyle(
                    color: subtitleColor,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          if (googleCalendarHtmlLink != null)
            IconButton(
              onPressed: _openInGoogleCalendar,
              icon: Icon(
                Icons.open_in_new,
                color: calendarColor,
                size: 20,
              ),
              tooltip: 'google_calendar.open_in_google'.tr(),
            ),
        ],
      ),
    );
  }

  Future<void> _openInGoogleCalendar() async {
    if (googleCalendarHtmlLink == null) return;

    try {
      final uri = Uri.parse(googleCalendarHtmlLink!);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    } catch (e) {
      debugPrint('Failed to open Google Calendar link: $e');
    }
  }

  Color? _parseColor(String colorString) {
    try {
      if (colorString.startsWith('#')) {
        final hex = colorString.replaceFirst('#', '');
        if (hex.length == 6) {
          return Color(int.parse('FF$hex', radix: 16));
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  }
}
