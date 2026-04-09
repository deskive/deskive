import 'dart:async';
import 'package:flutter/material.dart';
import '../models/budget_models.dart';
import '../services/budget_service.dart';
import '../../../projects/project_model.dart' as project_model;
import 'time_entry_list_item.dart';

/// A comprehensive time tracking view for budget details
/// Displays all time entries in a scrollable list - no floating banners
class TimeTrackingView extends StatefulWidget {
  final String budgetId;
  final List<TimeEntry> timeEntries;
  final List<BudgetCategory> categories;
  final List<project_model.Task> tasks;
  final Function(String entryId)? onStopTimer;
  final VoidCallback? onRefresh;

  const TimeTrackingView({
    super.key,
    required this.budgetId,
    required this.timeEntries,
    required this.categories,
    this.tasks = const [],
    this.onStopTimer,
    this.onRefresh,
  });

  @override
  State<TimeTrackingView> createState() => _TimeTrackingViewState();
}

class _TimeTrackingViewState extends State<TimeTrackingView> {
  String? _selectedTaskFilter;
  TimeTrackingStats? _stats;
  Timer? _timerUpdateTimer;

  @override
  void initState() {
    super.initState();
    _calculateStats();
    _startTimerUpdates();
  }

  @override
  void dispose() {
    _timerUpdateTimer?.cancel();
    super.dispose();
  }

  @override
  void didUpdateWidget(TimeTrackingView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.timeEntries != widget.timeEntries) {
      _calculateStats();
    }
  }

  void _startTimerUpdates() {
    _timerUpdateTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted && _runningTimers.isNotEmpty) {
        setState(() {});
      }
    });
  }

  void _calculateStats() {
    setState(() {
      _stats = TimeTrackingStats.fromTimeEntries(widget.timeEntries);
    });
  }

  List<TimeEntry> get _runningTimers {
    return widget.timeEntries.where((e) => e.isRunning).toList();
  }

  List<TimeEntry> get _filteredEntries {
    if (_selectedTaskFilter == null) {
      return widget.timeEntries;
    }
    return widget.timeEntries
        .where((e) => e.taskId == _selectedTaskFilter)
        .toList();
  }

  Map<DateTime, List<TimeEntry>> get _entriesByDate {
    final Map<DateTime, List<TimeEntry>> grouped = {};

    for (final entry in _filteredEntries) {
      final date = DateTime(
        entry.startTime.year,
        entry.startTime.month,
        entry.startTime.day,
      );
      grouped.putIfAbsent(date, () => []).add(entry);
    }

    // Sort entries within each date by start time (newest first)
    // Running timers always appear first
    for (final entries in grouped.values) {
      entries.sort((a, b) {
        if (a.isRunning && !b.isRunning) return -1;
        if (!a.isRunning && b.isRunning) return 1;
        return b.startTime.compareTo(a.startTime);
      });
    }

    return Map.fromEntries(
      grouped.entries.toList()
        ..sort((a, b) => b.key.compareTo(a.key)),
    );
  }

  String? _getCategoryName(String? categoryId) {
    if (categoryId == null) return null;
    final category = widget.categories.firstWhere(
      (c) => c.id == categoryId,
      orElse: () => BudgetCategory(
        id: '',
        budgetId: '',
        name: 'Unknown',
        allocatedAmount: 0,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
    );
    return category.name;
  }

  String? _getTaskName(String? taskId) {
    if (taskId == null) return null;
    final task = widget.tasks.firstWhere(
      (t) => t.id == taskId,
      orElse: () => project_model.Task(
        id: '',
        projectId: '',
        title: 'Unknown Task',
        status: project_model.TaskStatus.todo,
        priority: project_model.TaskPriority.medium,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
    );
    return task.title;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (widget.timeEntries.isEmpty) {
      return _buildEmptyState(isDark);
    }

    // Build all items for the list
    final List<Widget> listItems = [];

    // 1. Stats section at top
    if (_stats != null) {
      listItems.add(_buildStatsSection(isDark));
    }

    // 2. Filter section
    listItems.add(_buildFilterSection(isDark));

    // 3. Time entries grouped by date
    final entriesByDate = _entriesByDate;
    for (final entry in entriesByDate.entries) {
      final date = entry.key;
      final entries = entry.value;

      // Calculate totals for this date
      final totalMinutes = entries.fold<int>(
        0,
        (sum, e) => sum + (e.durationMinutes ?? 0),
      );
      final totalAmount = entries.fold<double>(
        0,
        (sum, e) => sum + (e.totalAmount ?? 0),
      );

      // Date header
      listItems.add(TimeEntryDateHeader(
        date: date,
        totalDuration: Duration(minutes: totalMinutes),
        totalAmount: totalAmount,
      ));

      // Entries for this date
      for (final timeEntry in entries) {
        listItems.add(TimeEntryListItem(
          entry: timeEntry,
          categoryName: _getCategoryName(timeEntry.categoryId),
          taskName: _getTaskName(timeEntry.taskId),
          onStop: timeEntry.isRunning && widget.onStopTimer != null
              ? () => widget.onStopTimer!(timeEntry.id)
              : null,
        ));
      }
    }

    // Add bottom padding
    listItems.add(const SizedBox(height: 80));

    return RefreshIndicator(
      onRefresh: () async {
        widget.onRefresh?.call();
      },
      child: ListView(
        padding: EdgeInsets.zero,
        children: listItems,
      ),
    );
  }

  Widget _buildEmptyState(bool isDark) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 48),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.timer_off,
              size: 56,
              color: isDark ? Colors.grey.shade700 : Colors.grey.shade400,
            ),
            const SizedBox(height: 16),
            Text(
              'No time entries yet',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: isDark ? Colors.grey.shade500 : Colors.grey.shade600,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Start a timer from the Tasks tab to track time',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                color: isDark ? Colors.grey.shade600 : Colors.grey.shade500,
              ),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.teal.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.lightbulb_outline,
                    size: 18,
                    color: Colors.teal.shade600,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Go to Tasks tab \u2192 Select a task \u2192 Start Timer',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.teal.shade700,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsSection(bool isDark) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isDark
              ? [Colors.teal.shade900, Colors.teal.shade800]
              : [Colors.teal.shade400, Colors.teal.shade600],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: _buildStatCard(
                  icon: Icons.schedule,
                  label: 'Total Time',
                  value: _stats!.formattedTotalTime,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildStatCard(
                  icon: Icons.attach_money,
                  label: 'Total Billed',
                  value: BudgetService.formatCurrency(_stats!.totalBilled, 'USD'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildStatCard(
                  icon: Icons.receipt_long,
                  label: 'Billable',
                  value: '${_stats!.billableEntries}',
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildStatCard(
                  icon: Icons.people_outline,
                  label: 'Team Members',
                  value: '${_stats!.teamMembers}',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(icon, color: Colors.white, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                Text(
                  label,
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.8),
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterSection(bool isDark) {
    // Get unique task IDs from entries
    final taskIds = widget.timeEntries
        .where((e) => e.taskId != null)
        .map((e) => e.taskId!)
        .toSet()
        .toList();

    if (taskIds.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          const Icon(Icons.filter_list, size: 20),
          const SizedBox(width: 8),
          const Text('Filter by task:'),
          const SizedBox(width: 12),
          Expanded(
            child: DropdownButton<String?>(
              value: _selectedTaskFilter,
              isExpanded: true,
              hint: const Text('All tasks'),
              items: [
                const DropdownMenuItem<String?>(
                  value: null,
                  child: Text('All tasks'),
                ),
                ...taskIds.map((taskId) {
                  return DropdownMenuItem<String>(
                    value: taskId,
                    child: Text('Task ${taskId.substring(0, 8)}'),
                  );
                }),
              ],
              onChanged: (value) {
                setState(() => _selectedTaskFilter = value);
              },
            ),
          ),
        ],
      ),
    );
  }
}
