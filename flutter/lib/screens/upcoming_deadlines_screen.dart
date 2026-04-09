import 'package:flutter/material.dart';
import 'package:flutter_html/flutter_html.dart';
import 'package:easy_localization/easy_localization.dart';
import '../services/project_service.dart';
import '../models/project.dart';
import '../models/task.dart';
import '../config/app_config.dart';
import '../theme/app_theme.dart';

class UpcomingDeadlinesScreen extends StatefulWidget {
  const UpcomingDeadlinesScreen({super.key});

  @override
  State<UpcomingDeadlinesScreen> createState() => _UpcomingDeadlinesScreenState();
}

class _UpcomingDeadlinesScreenState extends State<UpcomingDeadlinesScreen> {
  final ProjectService _projectService = ProjectService.instance;

  List<Task> _tasks = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadTasks();
  }

  Future<void> _loadTasks() async {
    try {
      setState(() {
        _isLoading = true;
        _error = null;
      });

      final workspaceId = await AppConfig.getCurrentWorkspaceId();
      final projects = await _projectService.getProjects(workspaceId: workspaceId);

      List<Task> allTasks = [];
      for (final project in projects) {
        try {
          final projectTasks = await _projectService.getTasks(
            projectId: project.id,
            workspaceId: workspaceId,
          );
          allTasks.addAll(projectTasks);
        } catch (e) {
        }
      }

      setState(() {
        _tasks = allTasks;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  List<Task> get _overdueTasks => _tasks.where((t) =>
    t.dueDate != null &&
    t.dueDate!.isBefore(DateTime.now()) &&
    t.completedAt == null
  ).toList();

  List<Task> get _dueTodayTasks {
    final today = DateTime.now();
    return _tasks.where((t) {
      if (t.dueDate == null || t.completedAt != null) return false;
      final dueDate = t.dueDate!;
      return dueDate.year == today.year &&
             dueDate.month == today.month &&
             dueDate.day == today.day;
    }).toList();
  }

  List<Task> get _dueThisWeekTasks {
    final now = DateTime.now();
    final weekEnd = now.add(const Duration(days: 7));
    return _tasks.where((t) {
      if (t.dueDate == null || t.completedAt != null) return false;
      return t.dueDate!.isAfter(now) && t.dueDate!.isBefore(weekEnd);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (_error != null) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 64, color: Colors.red),
              const SizedBox(height: 16),
              Text('deadlines.error_loading'.tr(), style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 8),
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _loadTasks,
                child: Text('deadlines.retry'.tr()),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: context.backgroundColor,
      appBar: AppBar(
        backgroundColor: context.backgroundColor,
        elevation: 0,
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back,
            color: isDark ? Colors.white : Colors.black,
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'deadlines.title'.tr(),
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: isDark ? Colors.white : Colors.black,
          ),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _loadTasks,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Stats Cards
              Row(
                children: [
                  Expanded(
                    child: _buildStatCard(
                      count: _overdueTasks.length,
                      label: 'deadlines.overdue'.tr(),
                      icon: Icons.warning_amber_rounded,
                      color: const Color(0xFFFFEBEE),
                      textColor: context.colorScheme.error,
                      isDark: isDark,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildStatCard(
                      count: _dueTodayTasks.length,
                      label: 'deadlines.today'.tr(),
                      icon: Icons.today_rounded,
                      color: const Color(0xFFFFF9C4),
                      textColor: const Color(0xFFFFA726),
                      isDark: isDark,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildStatCard(
                      count: _dueThisWeekTasks.length,
                      label: 'deadlines.this_week'.tr(),
                      icon: Icons.calendar_today_rounded,
                      color: const Color(0xFFE3F2FD),
                      textColor: AppTheme.infoLight,
                      isDark: isDark,
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 24),

              // Overdue Tasks
              if (_overdueTasks.isNotEmpty) ...[
                _buildTaskSection(
                  title: 'deadlines.overdue_tasks'.tr(),
                  tasks: _overdueTasks,
                  color: context.colorScheme.error,
                  icon: Icons.warning_amber_rounded,
                  isDark: isDark,
                ),
                const SizedBox(height: 24),
              ],

              // Due Today Tasks
              if (_dueTodayTasks.isNotEmpty) ...[
                _buildTaskSection(
                  title: 'deadlines.due_today'.tr(),
                  tasks: _dueTodayTasks,
                  color: const Color(0xFFFFA726),
                  icon: Icons.today_rounded,
                  isDark: isDark,
                ),
                const SizedBox(height: 24),
              ],

              // Due This Week Tasks
              if (_dueThisWeekTasks.isNotEmpty) ...[
                _buildTaskSection(
                  title: 'deadlines.due_this_week'.tr(),
                  tasks: _dueThisWeekTasks,
                  color: AppTheme.infoLight,
                  icon: Icons.calendar_today_rounded,
                  isDark: isDark,
                ),
              ],

              // No deadlines message
              if (_overdueTasks.isEmpty && _dueTodayTasks.isEmpty && _dueThisWeekTasks.isEmpty) ...[
                const SizedBox(height: 40),
                Center(
                  child: Column(
                    children: [
                      Icon(
                        Icons.check_circle_outline,
                        size: 64,
                        color: isDark ? Colors.white24 : Colors.grey[300],
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'deadlines.no_upcoming_deadlines'.tr(),
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                          color: isDark ? Colors.white70 : Colors.grey[700],
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'deadlines.all_caught_up'.tr(),
                        style: TextStyle(
                          fontSize: 14,
                          color: isDark ? Colors.white38 : Colors.grey[500],
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
    );
  }

  Widget _buildStatCard({
    required int count,
    required String label,
    required IconData icon,
    required Color color,
    required Color textColor,
    required bool isDark,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              icon,
              color: textColor,
              size: 20,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            '$count',
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white : Colors.black,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: isDark ? Colors.white60 : Colors.grey[600],
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildTaskSection({
    required String title,
    required List<Task> tasks,
    required Color color,
    required IconData icon,
    required bool isDark,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  icon,
                  size: 20,
                  color: color,
                ),
              ),
              const SizedBox(width: 12),
              Text(
                title,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : Colors.black,
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '${tasks.length}',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: color,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ...tasks.map((task) => Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: _buildTaskCard(task, color, isDark),
          )),
        ],
      ),
    );
  }

  Widget _buildTaskCard(Task task, Color accentColor, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: context.backgroundColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: accentColor.withValues(alpha: 0.2),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  task.title,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: isDark ? Colors.white : Colors.black,
                  ),
                ),
              ),
              if (task.dueDate != null) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: accentColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.access_time,
                        size: 12,
                        color: accentColor,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        _formatDueDate(task.dueDate!),
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: accentColor,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
          if (task.description != null && task.description!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Html(
              data: task.description!,
              style: {
                "body": Style(
                  fontSize: FontSize(13),
                  color: isDark ? Colors.white60 : Colors.grey[600],
                  margin: Margins.zero,
                  padding: HtmlPaddings.zero,
                  maxLines: 2,
                  textOverflow: TextOverflow.ellipsis,
                ),
                "p": Style(
                  margin: Margins.zero,
                  padding: HtmlPaddings.zero,
                ),
              },
            ),
          ],
          const SizedBox(height: 8),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: _getStatusColor(task.status).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  task.status.toUpperCase(),
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: _getStatusColor(task.status),
                  ),
                ),
              ),
              if (task.priority != null) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: _getPriorityColor(task.priority!).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.flag,
                        size: 12,
                        color: _getPriorityColor(task.priority!),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        task.priority!.toUpperCase(),
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: _getPriorityColor(task.priority!),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  String _formatDueDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);

    if (difference.inDays == 0) {
      return 'deadlines.today'.tr();
    } else if (difference.inDays == 1) {
      return 'projects.yesterday'.tr();
    } else if (difference.inDays > 0) {
      return 'deadlines.days_overdue'.tr(args: ['${difference.inDays}']);
    } else if (difference.inDays == -1) {
      return 'deadlines.tomorrow'.tr();
    } else {
      return 'deadlines.in_days'.tr(args: ['${-difference.inDays}']);
    }
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'todo':
        return Colors.blue;
      case 'in_progress':
        return Colors.orange;
      case 'done':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  Color _getPriorityColor(String priority) {
    switch (priority.toLowerCase()) {
      case 'lowest':
        return Colors.grey.shade400;
      case 'low':
        return Colors.green;
      case 'medium':
        return Colors.orange;
      case 'high':
        return Colors.red;
      case 'highest':
        return Colors.purple;
      default:
        return Colors.grey;
    }
  }
}
