import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/budget_models.dart';
import '../services/budget_service.dart';
import 'time_tracker_widget.dart';

/// A list item widget for displaying a time entry
class TimeEntryListItem extends StatelessWidget {
  final TimeEntry entry;
  final String? categoryName;
  final String? taskName;
  final VoidCallback? onTap;
  final VoidCallback? onStop;
  final VoidCallback? onDelete;

  const TimeEntryListItem({
    super.key,
    required this.entry,
    this.categoryName,
    this.taskName,
    this.onTap,
    this.onStop,
    this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final dateFormat = DateFormat('MMM d, yyyy');
    final timeFormat = DateFormat('h:mm a');

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      elevation: entry.isRunning ? 4 : 1,
      color: entry.isRunning
          ? (isDark ? Colors.teal.shade900 : Colors.teal.shade50)
          : null,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header row
              Row(
                children: [
                  // Timer icon
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: entry.isRunning
                          ? Colors.red.withOpacity(0.1)
                          : (isDark ? Colors.grey.shade800 : Colors.grey.shade100),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      entry.isRunning ? Icons.timer : Icons.access_time,
                      color: entry.isRunning ? Colors.red : Colors.grey,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  // Description
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          entry.description ?? 'Time Entry',
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 15,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${dateFormat.format(entry.startTime)} at ${timeFormat.format(entry.startTime)}',
                          style: TextStyle(
                            color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Duration
                  InlineTimerDisplay(
                    timeEntry: entry,
                    onStop: entry.isRunning ? onStop : null,
                  ),
                ],
              ),
              const SizedBox(height: 12),
              // Tags row
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  // Category badge
                  if (categoryName != null)
                    _buildBadge(
                      context,
                      icon: Icons.category,
                      label: categoryName!,
                      color: Colors.blue,
                    ),
                  // Task badge
                  if (taskName != null)
                    _buildBadge(
                      context,
                      icon: Icons.task_alt,
                      label: taskName!,
                      color: Colors.purple,
                    ),
                  // Billable badge
                  if (entry.billable)
                    _buildBadge(
                      context,
                      icon: Icons.attach_money,
                      label: 'Billable',
                      color: Colors.green,
                    ),
                  // Running badge
                  if (entry.isRunning)
                    _buildBadge(
                      context,
                      icon: Icons.play_circle,
                      label: 'Running',
                      color: Colors.red,
                    ),
                ],
              ),
              // Amount row (if billable and has amount)
              if (entry.billable && entry.totalAmount != null && entry.totalAmount! > 0)
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Hourly Rate: ${BudgetService.formatCurrency(entry.hourlyRate ?? 0, 'USD')}/hr',
                        style: TextStyle(
                          color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                          fontSize: 12,
                        ),
                      ),
                      Text(
                        BudgetService.formatCurrency(entry.totalAmount!, 'USD'),
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                          color: Colors.green,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBadge(
    BuildContext context, {
    required IconData icon,
    required String label,
    required Color color,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(isDark ? 0.2 : 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: color.withOpacity(0.3),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 14,
            color: color,
          ),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

/// A section header for grouping time entries by date
class TimeEntryDateHeader extends StatelessWidget {
  final DateTime date;
  final Duration totalDuration;
  final double? totalAmount;

  const TimeEntryDateHeader({
    super.key,
    required this.date,
    required this.totalDuration,
    this.totalAmount,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final dateFormat = DateFormat('EEEE, MMMM d, yyyy');
    final isToday = DateUtils.isSameDay(date, DateTime.now());
    final isYesterday = DateUtils.isSameDay(
      date,
      DateTime.now().subtract(const Duration(days: 1)),
    );

    String dateLabel;
    if (isToday) {
      dateLabel = 'Today';
    } else if (isYesterday) {
      dateLabel = 'Yesterday';
    } else {
      dateLabel = dateFormat.format(date);
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      color: isDark ? Colors.grey.shade900 : Colors.grey.shade100,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            dateLabel,
            style: TextStyle(
              fontWeight: FontWeight.w600,
              color: isDark ? Colors.grey.shade300 : Colors.grey.shade700,
            ),
          ),
          Row(
            children: [
              Text(
                BudgetService.formatDuration(totalDuration.inMinutes),
                style: TextStyle(
                  fontWeight: FontWeight.w500,
                  color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                ),
              ),
              if (totalAmount != null && totalAmount! > 0) ...[
                const SizedBox(width: 12),
                Text(
                  BudgetService.formatCurrency(totalAmount!, 'USD'),
                  style: const TextStyle(
                    fontWeight: FontWeight.w500,
                    color: Colors.green,
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}
