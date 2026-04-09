import 'dart:async';
import 'package:flutter/material.dart';
import '../models/budget_models.dart';
import '../services/budget_service.dart';
import '../../../projects/project_model.dart' as project_model;

/// Widget that displays budget breakdown by tasks - matching frontend TaskBreakdown component
class TaskBreakdownWidget extends StatefulWidget {
  final String budgetId;
  final String workspaceId;
  final List<BudgetExpense> expenses;
  final List<TimeEntry> timeEntries;
  final List<project_model.Task> tasks;
  final double totalBudget;
  final String currency;
  final bool canManageTimers;
  final Function(String taskId, String taskName)? onStartTimer;
  final Function(String entryId)? onStopTimer;
  final VoidCallback? onRefresh;

  const TaskBreakdownWidget({
    super.key,
    required this.budgetId,
    required this.workspaceId,
    required this.expenses,
    required this.timeEntries,
    this.tasks = const [],
    this.totalBudget = 0,
    this.currency = 'USD',
    this.canManageTimers = true,
    this.onStartTimer,
    this.onStopTimer,
    this.onRefresh,
  });

  @override
  State<TaskBreakdownWidget> createState() => _TaskBreakdownWidgetState();
}

class _TaskBreakdownWidgetState extends State<TaskBreakdownWidget> {
  Map<String, TaskBreakdownData> _taskBreakdowns = {};
  List<BudgetExpense> _unlinkedExpenses = [];
  Timer? _timerUpdateTimer;

  @override
  void initState() {
    super.initState();
    _calculateBreakdowns();
    _startTimerUpdates();
  }

  @override
  void dispose() {
    _timerUpdateTimer?.cancel();
    super.dispose();
  }

  @override
  void didUpdateWidget(TaskBreakdownWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.expenses != widget.expenses ||
        oldWidget.timeEntries != widget.timeEntries ||
        oldWidget.tasks != widget.tasks) {
      _calculateBreakdowns();
    }
  }

  void _startTimerUpdates() {
    _timerUpdateTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted && _hasRunningTimers) {
        setState(() {});
      }
    });
  }

  bool get _hasRunningTimers {
    return _taskBreakdowns.values.any((data) => data.runningTimers.isNotEmpty);
  }

  void _calculateBreakdowns() {
    final Map<String, TaskBreakdownData> breakdowns = {};
    final List<BudgetExpense> unlinked = [];

    // Initialize breakdowns from tasks list
    for (final task in widget.tasks) {
      breakdowns[task.id] = TaskBreakdownData(
        taskId: task.id,
        taskName: task.title,
        taskDescription: task.description,
        taskStatus: task.status.value,
      );
    }

    // Process expenses - only approved ones
    for (final expense in widget.expenses) {
      if (expense.rejected) continue; // Skip rejected expenses

      if (expense.taskId == null || expense.taskId!.isEmpty) {
        if (expense.approved) {
          unlinked.add(expense);
        }
        continue;
      }

      final taskId = expense.taskId!;
      breakdowns.putIfAbsent(
        taskId,
        () => TaskBreakdownData(taskId: taskId),
      );

      if (expense.approved) {
        breakdowns[taskId]!.approvedExpenses.add(expense);
        breakdowns[taskId]!.totalApprovedAmount += expense.amount;
      } else {
        breakdowns[taskId]!.pendingExpenses.add(expense);
      }
    }

    // Process time entries
    for (final entry in widget.timeEntries) {
      if (entry.taskId == null || entry.taskId!.isEmpty) continue;

      final taskId = entry.taskId!;
      breakdowns.putIfAbsent(
        taskId,
        () => TaskBreakdownData(taskId: taskId),
      );

      breakdowns[taskId]!.timeEntries.add(entry);
      breakdowns[taskId]!.totalMinutes += entry.durationMinutes ?? 0;
      breakdowns[taskId]!.totalBilledAmount += entry.totalAmount ?? 0;

      if (entry.isRunning) {
        breakdowns[taskId]!.runningTimers.add(entry);
      }
    }

    setState(() {
      _taskBreakdowns = breakdowns;
      _unlinkedExpenses = unlinked;
    });
  }

  double get _totalTaskLinkedExpenses {
    return _taskBreakdowns.values
        .fold(0.0, (sum, data) => sum + data.totalApprovedAmount);
  }

  double get _totalUnlinkedExpenses {
    return _unlinkedExpenses.fold(0.0, (sum, e) => sum + e.amount);
  }

  int get _tasksWithExpenses {
    return _taskBreakdowns.values.where((d) => d.totalEntries > 0).length;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return RefreshIndicator(
      onRefresh: () async => widget.onRefresh?.call(),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Summary Cards
          _buildSummaryCards(isDark),
          const SizedBox(height: 20),

          // Task List
          if (_taskBreakdowns.isEmpty && widget.tasks.isEmpty)
            _buildEmptyState(isDark)
          else ...[
            _buildSectionHeader('Tasks', Icons.task_alt, isDark),
            const SizedBox(height: 12),
            ..._buildTaskList(isDark),
          ],

          // Unlinked Expenses Section
          if (_unlinkedExpenses.isNotEmpty) ...[
            const SizedBox(height: 20),
            _buildUnlinkedExpensesCard(isDark),
          ],

          const SizedBox(height: 80), // Bottom padding for FAB
        ],
      ),
    );
  }

  Widget _buildSummaryCards(bool isDark) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _buildSummaryCard(
                title: 'Total Tasks',
                value: '${widget.tasks.length}',
                subtitle: '$_tasksWithExpenses with expenses',
                icon: Icons.task_alt,
                color: Colors.purple,
                isDark: isDark,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildSummaryCard(
                title: 'Task-Linked',
                value: BudgetService.formatCurrency(
                    _totalTaskLinkedExpenses, widget.currency),
                subtitle: 'Approved expenses',
                icon: Icons.link,
                color: Colors.green,
                isDark: isDark,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (_unlinkedExpenses.isNotEmpty)
          _buildSummaryCard(
            title: 'Unlinked Expenses',
            value: BudgetService.formatCurrency(
                _totalUnlinkedExpenses, widget.currency),
            subtitle: '${_unlinkedExpenses.length} expense(s) not linked to tasks',
            icon: Icons.link_off,
            color: Colors.orange,
            isDark: isDark,
            isWarning: true,
          ),
      ],
    );
  }

  Widget _buildSummaryCard({
    required String title,
    required String value,
    String? subtitle,
    required IconData icon,
    required Color color,
    required bool isDark,
    bool isWarning = false,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isWarning
            ? color.withOpacity(0.1)
            : (isDark ? Colors.grey.shade900 : Colors.white),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isWarning
              ? color.withOpacity(0.3)
              : (isDark ? Colors.grey.shade800 : Colors.grey.shade200),
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withOpacity(0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: isWarning ? color : null,
                  ),
                ),
                if (subtitle != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 11,
                      color: isDark ? Colors.grey.shade500 : Colors.grey.shade500,
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

  Widget _buildSectionHeader(String title, IconData icon, bool isDark) {
    return Row(
      children: [
        Icon(icon, size: 20, color: Colors.teal),
        const SizedBox(width: 8),
        Text(
          title,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }

  List<Widget> _buildTaskList(bool isDark) {
    // Sort tasks: those with running timers first, then by expense amount
    final sortedTasks = _taskBreakdowns.entries.toList()
      ..sort((a, b) {
        // Running timers first
        if (a.value.runningTimers.isNotEmpty && b.value.runningTimers.isEmpty) {
          return -1;
        }
        if (a.value.runningTimers.isEmpty && b.value.runningTimers.isNotEmpty) {
          return 1;
        }
        // Then by total amount
        return b.value.totalAmount.compareTo(a.value.totalAmount);
      });

    return sortedTasks.map((entry) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: TaskBreakdownCard(
          data: entry.value,
          totalBudget: widget.totalBudget,
          currency: widget.currency,
          canManageTimers: widget.canManageTimers,
          onStartTimer: widget.onStartTimer,
          onStopTimer: widget.onStopTimer,
        ),
      );
    }).toList();
  }

  Widget _buildUnlinkedExpensesCard(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.orange.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.orange.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.warning_amber, color: Colors.orange, size: 20),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  'Unlinked Expenses',
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: Colors.orange,
                  ),
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.orange.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '${_unlinkedExpenses.length}',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Colors.orange,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Total: ${BudgetService.formatCurrency(_totalUnlinkedExpenses, widget.currency)}',
            style: const TextStyle(fontSize: 14),
          ),
          const SizedBox(height: 4),
          Text(
            'These approved expenses are not linked to any task',
            style: TextStyle(
              fontSize: 12,
              color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(32),
      child: Column(
        children: [
          Icon(
            Icons.assignment_outlined,
            size: 64,
            color: isDark ? Colors.grey.shade700 : Colors.grey.shade400,
          ),
          const SizedBox(height: 16),
          Text(
            'No tasks in this project',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: isDark ? Colors.grey.shade500 : Colors.grey.shade600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Add tasks to your project to track expenses and time against them',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: isDark ? Colors.grey.shade600 : Colors.grey.shade500,
            ),
          ),
        ],
      ),
    );
  }
}

/// Data model for task breakdown
class TaskBreakdownData {
  final String taskId;
  String? taskName;
  String? taskDescription;
  String? taskStatus;
  List<BudgetExpense> approvedExpenses = [];
  List<BudgetExpense> pendingExpenses = [];
  List<TimeEntry> timeEntries = [];
  List<TimeEntry> runningTimers = [];
  double totalApprovedAmount = 0;
  double totalBilledAmount = 0;
  int totalMinutes = 0;

  TaskBreakdownData({
    required this.taskId,
    this.taskName,
    this.taskDescription,
    this.taskStatus,
  });

  double get totalAmount => totalApprovedAmount + totalBilledAmount;
  int get totalEntries => approvedExpenses.length + timeEntries.length;
  bool get hasRunningTimer => runningTimers.isNotEmpty;
}

/// Card widget for displaying a single task's breakdown
class TaskBreakdownCard extends StatelessWidget {
  final TaskBreakdownData data;
  final double totalBudget;
  final String currency;
  final bool canManageTimers;
  final Function(String taskId, String taskName)? onStartTimer;
  final Function(String entryId)? onStopTimer;
  final VoidCallback? onTap;

  const TaskBreakdownCard({
    super.key,
    required this.data,
    this.totalBudget = 0,
    this.currency = 'USD',
    this.canManageTimers = true,
    this.onStartTimer,
    this.onStopTimer,
    this.onTap,
  });

  double get _budgetPercentage {
    if (totalBudget <= 0) return 0;
    return (data.totalAmount / totalBudget * 100).clamp(0, 100);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Card(
      elevation: data.hasRunningTimer ? 4 : 1,
      color: data.hasRunningTimer
          ? (isDark
              ? Colors.teal.shade900.withOpacity(0.3)
              : Colors.teal.shade50)
          : null,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header with task info
              _buildHeader(isDark),

              // Running timers section
              if (data.hasRunningTimer && canManageTimers) ...[
                const SizedBox(height: 12),
                _buildRunningTimersSection(context, isDark),
              ],

              const SizedBox(height: 12),

              // Stats grid
              _buildStatsRow(context, isDark),

              // Budget progress bar - always show
              const SizedBox(height: 12),
              _buildProgressBar(isDark),

              // Recent expenses preview - always show
              const SizedBox(height: 12),
              _buildExpensesPreview(isDark),

              // Action buttons
              if (canManageTimers) ...[
                const SizedBox(height: 12),
                _buildActionButtons(context, isDark),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(bool isDark) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: isDark
                ? Colors.purple.shade900.withOpacity(0.3)
                : Colors.purple.shade50,
            borderRadius: BorderRadius.circular(10),
          ),
          child: const Icon(
            Icons.task_alt,
            color: Colors.purple,
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
                  Expanded(
                    child: Text(
                      data.taskName ?? 'Task ${data.taskId.substring(0, 8)}',
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 16,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  if (data.taskStatus != null) ...[
                    const SizedBox(width: 8),
                    _buildStatusBadge(data.taskStatus!, isDark),
                  ],
                ],
              ),
              if (data.taskDescription != null &&
                  data.taskDescription!.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  _stripHtml(data.taskDescription!),
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStatusBadge(String status, bool isDark) {
    Color color;
    switch (status.toLowerCase()) {
      case 'done':
      case 'completed':
        color = Colors.green;
        break;
      case 'in_progress':
      case 'inprogress':
        color = Colors.blue;
        break;
      case 'todo':
      case 'pending':
        color = Colors.grey;
        break;
      case 'blocked':
        color = Colors.red;
        break;
      default:
        color = Colors.grey;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        _formatStatus(status),
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w500,
          color: color,
        ),
      ),
    );
  }

  String _formatStatus(String status) {
    return status.replaceAll('_', ' ').split(' ').map((word) {
      if (word.isEmpty) return word;
      return word[0].toUpperCase() + word.substring(1).toLowerCase();
    }).join(' ');
  }

  Widget _buildRunningTimersSection(BuildContext context, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isDark
              ? [Colors.teal.shade900, Colors.teal.shade800]
              : [Colors.teal.shade500, Colors.teal.shade600],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.teal.withValues(alpha: 0.3),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _buildPulsingIndicator(),
              const SizedBox(width: 8),
              Text(
                'Active Timer${data.runningTimers.length > 1 ? 's' : ''}',
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                  fontSize: 14,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ...data.runningTimers.map((timer) => _buildRunningTimerItem(
                context,
                timer,
                isDark,
              )),
        ],
      ),
    );
  }

  Widget _buildPulsingIndicator() {
    return Container(
      width: 10,
      height: 10,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.red,
        boxShadow: [
          BoxShadow(
            color: Colors.red.withValues(alpha: 0.6),
            blurRadius: 6,
            spreadRadius: 2,
          ),
        ],
      ),
    );
  }

  Widget _buildRunningTimerItem(
      BuildContext context, TimeEntry timer, bool isDark) {
    final duration = timer.currentDuration;
    final hours = duration.inHours;
    final minutes = duration.inMinutes % 60;
    final seconds = duration.inSeconds % 60;
    final formattedDuration =
        '${hours.toString().padLeft(2, '0')}:${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';

    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  formattedDuration,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    fontFamily: 'monospace',
                    letterSpacing: 2,
                  ),
                ),
                if (timer.hourlyRate != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    '${BudgetService.formatCurrency(timer.hourlyRate!, currency)}/hr',
                    style: TextStyle(
                      fontSize: 11,
                      color: Colors.white.withValues(alpha: 0.7),
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (onStopTimer != null)
            ElevatedButton.icon(
              onPressed: () => onStopTimer!(timer.id),
              icon: const Icon(Icons.stop, size: 16),
              label: const Text('Stop'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red,
                foregroundColor: Colors.white,
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(6),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildStatsRow(BuildContext context, bool isDark) {
    return Row(
      children: [
        _buildStatItem(
          context,
          icon: Icons.receipt_long,
          label: 'Expenses',
          value: BudgetService.formatCurrency(data.totalApprovedAmount, currency),
          count: data.approvedExpenses.length,
        ),
        const SizedBox(width: 8),
        _buildStatItem(
          context,
          icon: Icons.timer,
          label: 'Time',
          value: BudgetService.formatDuration(data.totalMinutes),
          count: data.timeEntries.length,
        ),
        const SizedBox(width: 8),
        _buildStatItem(
          context,
          icon: Icons.attach_money,
          label: 'Total',
          value: BudgetService.formatCurrency(data.totalAmount, currency),
          isHighlighted: true,
        ),
      ],
    );
  }

  Widget _buildStatItem(
    BuildContext context, {
    required IconData icon,
    required String label,
    required String value,
    int? count,
    bool isHighlighted = false,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: isHighlighted
              ? Colors.teal.withOpacity(0.1)
              : (isDark ? Colors.grey.shade900 : Colors.grey.shade100),
          borderRadius: BorderRadius.circular(8),
          border: isHighlighted
              ? Border.all(color: Colors.teal.withOpacity(0.3))
              : null,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  icon,
                  size: 14,
                  color: isHighlighted ? Colors.teal : Colors.grey,
                ),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    label,
                    style: TextStyle(
                      fontSize: 10,
                      color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                    ),
                  ),
                ),
                if (count != null)
                  Text(
                    '($count)',
                    style: TextStyle(
                      fontSize: 10,
                      color: isDark ? Colors.grey.shade500 : Colors.grey.shade500,
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              value,
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 13,
                color: isHighlighted ? Colors.teal : null,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProgressBar(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Budget Usage',
              style: TextStyle(
                fontSize: 11,
                color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
              ),
            ),
            Text(
              '${_budgetPercentage.toStringAsFixed(1)}%',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w500,
                color: _budgetPercentage > 80 ? Colors.orange : Colors.teal,
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: _budgetPercentage / 100,
            backgroundColor: isDark ? Colors.grey.shade800 : Colors.grey.shade200,
            valueColor: AlwaysStoppedAnimation(
              _budgetPercentage > 80 ? Colors.orange : Colors.teal,
            ),
            minHeight: 6,
          ),
        ),
      ],
    );
  }

  Widget _buildExpensesPreview(bool isDark) {
    final previewExpenses = data.approvedExpenses.take(3).toList();
    final moreCount = data.approvedExpenses.length - 3;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Recent Expenses',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w500,
            color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
          ),
        ),
        const SizedBox(height: 6),
        if (previewExpenses.isEmpty)
          Text(
            'No expenses yet',
            style: TextStyle(
              fontSize: 12,
              color: isDark ? Colors.grey.shade500 : Colors.grey.shade400,
              fontStyle: FontStyle.italic,
            ),
          )
        else ...[
          ...previewExpenses.map((expense) => Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Row(
                  children: [
                    Container(
                      width: 4,
                      height: 4,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color:
                            isDark ? Colors.grey.shade600 : Colors.grey.shade400,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        expense.title,
                        style: const TextStyle(fontSize: 12),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Text(
                      BudgetService.formatCurrency(expense.amount, currency),
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              )),
          if (moreCount > 0)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                '+$moreCount more expense${moreCount > 1 ? 's' : ''}',
                style: TextStyle(
                  fontSize: 11,
                  color: Colors.teal,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
        ],
      ],
    );
  }

  Widget _buildActionButtons(BuildContext context, bool isDark) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        if (!data.hasRunningTimer && onStartTimer != null)
          TextButton.icon(
            onPressed: () => onStartTimer!(data.taskId, data.taskName ?? 'Unknown Task'),
            icon: const Icon(Icons.play_arrow, color: Colors.teal, size: 20),
            label: const Text(
              'Start Timer',
              style: TextStyle(color: Colors.teal),
            ),
          )
        else if (data.hasRunningTimer && onStartTimer != null)
          TextButton.icon(
            onPressed: () => onStartTimer!(data.taskId, data.taskName ?? 'Unknown Task'),
            icon: const Icon(Icons.add, color: Colors.teal, size: 20),
            label: const Text(
              'Add Timer',
              style: TextStyle(color: Colors.teal, fontSize: 12),
            ),
          ),
      ],
    );
  }

  String _stripHtml(String html) {
    // Simple HTML tag removal
    return html.replaceAll(RegExp(r'<[^>]*>'), '').trim();
  }
}
