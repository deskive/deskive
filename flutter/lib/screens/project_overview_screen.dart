import 'package:flutter/material.dart';
import 'package:flutter_html/flutter_html.dart';
import 'package:easy_localization/easy_localization.dart';
import '../services/project_service.dart';
import '../models/project.dart';
import '../models/task.dart';
import '../config/app_config.dart';
import '../theme/app_theme.dart';

class ProjectOverviewScreen extends StatefulWidget {
  const ProjectOverviewScreen({super.key});

  @override
  State<ProjectOverviewScreen> createState() => _ProjectOverviewScreenState();
}

class _ProjectOverviewScreenState extends State<ProjectOverviewScreen> {
  final ProjectService _projectService = ProjectService.instance;

  List<Project> _projects = [];
  List<Task> _tasks = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
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
        _projects = projects;
        _tasks = allTasks;
        _isLoading = false;
      });

      // Debug: Log project statuses
      for (final project in _projects) {
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  int get _totalProjectsCount => _projects.length;
  int get _activeProjectsCount => _projects.where((p) => p.status == 'active').length;
  int get _completedProjectsCount => _projects.where((p) => p.status == 'completed').length;

  int get _totalTasksCount => _tasks.length;

  // Get task progress based on status position in project's kanban stages
  double _getTaskStatusProgress(String status, String projectId) {
    // Find the project to get its kanban stages
    final project = _projects.firstWhere(
      (p) => p.id == projectId,
      orElse: () => _projects.isNotEmpty ? _projects.first : Project(
        id: '',
        workspaceId: '',
        name: '',
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
    );

    final stages = project.kanbanStages;
    if (stages.isEmpty) {
      return 0.25; // Default fallback
    }

    // Try to parse status as a number (order + 1)
    final statusNum = int.tryParse(status);
    if (statusNum != null) {
      // Find stage by order (status is order + 1)
      for (int i = 0; i < stages.length; i++) {
        if (stages[i].order + 1 == statusNum) {
          return (i + 1) / stages.length;
        }
      }
    }

    // Fallback: try to match by name (for backward compatibility)
    for (int i = 0; i < stages.length; i++) {
      if (stages[i].name.toLowerCase() == status.toLowerCase()) {
        return (i + 1) / stages.length;
      }
    }

    // If status not found, return minimum progress
    return 1.0 / stages.length;
  }

  // Overall progress = percentage of projects that are completed
  double get _averageProgress {
    if (_projects.isEmpty) return 0.0;
    return _completedProjectsCount / _projects.length;
  }

  // Get all unique kanban stages across all projects with task counts
  List<Map<String, dynamic>> get _taskStatusBreakdown {
    final Map<String, Map<String, dynamic>> stageMap = {};

    for (final project in _projects) {
      for (final stage in project.kanbanStages) {
        final stageKey = '${stage.order}_${stage.name}';
        if (!stageMap.containsKey(stageKey)) {
          stageMap[stageKey] = {
            'name': stage.name,
            'color': _parseColor(stage.color),
            'order': stage.order,
            'count': 0,
          };
        }
      }
    }

    // Count tasks for each stage
    for (final task in _tasks) {
      final project = _projects.firstWhere(
        (p) => p.id == task.projectId,
        orElse: () => Project(
          id: '',
          workspaceId: '',
          name: '',
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
        ),
      );

      if (project.kanbanStages.isEmpty) continue;

      // Find the stage for this task
      final statusNum = int.tryParse(task.status);
      for (final stage in project.kanbanStages) {
        bool matches = false;
        if (statusNum != null) {
          matches = stage.order + 1 == statusNum;
        } else {
          matches = stage.name.toLowerCase() == task.status.toLowerCase();
        }

        if (matches) {
          final stageKey = '${stage.order}_${stage.name}';
          if (stageMap.containsKey(stageKey)) {
            stageMap[stageKey]!['count'] = (stageMap[stageKey]!['count'] as int) + 1;
          }
          break;
        }
      }
    }

    // Sort by order and return as list
    final stages = stageMap.values.toList();
    stages.sort((a, b) => (a['order'] as int).compareTo(b['order'] as int));
    return stages;
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
              Text('overview.error_loading'.tr(), style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 8),
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _loadData,
                child: Text('overview.retry'.tr()),
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
          'overview.title'.tr(),
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: isDark ? Colors.white : Colors.black,
          ),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _loadData,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildProjectOverviewSection(isDark),
              const SizedBox(height: 16),
              _buildTaskBreakdownSection(isDark),
              const SizedBox(height: 16),
              _buildAllTasksSection(isDark),
            ],
          ),
        ),
      ),
    );
  }

  Color _getTaskStatusColor(String status, String projectId) {
    // Find the project to get its kanban stages
    final project = _projects.firstWhere(
      (p) => p.id == projectId,
      orElse: () => _projects.isNotEmpty ? _projects.first : Project(
        id: '',
        workspaceId: '',
        name: '',
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
    );

    final stages = project.kanbanStages;
    if (stages.isEmpty) {
      return Colors.grey; // Default fallback
    }

    // Try to parse status as a number (order + 1)
    final statusNum = int.tryParse(status);
    if (statusNum != null) {
      // Find stage by order (status is order + 1)
      for (final stage in stages) {
        if (stage.order + 1 == statusNum) {
          return _parseColor(stage.color);
        }
      }
    }

    // Fallback: try to match by name
    for (final stage in stages) {
      if (stage.name.toLowerCase() == status.toLowerCase()) {
        return _parseColor(stage.color);
      }
    }

    return Colors.grey;
  }

  Color _parseColor(String hexColor) {
    try {
      String colorStr = hexColor.replaceAll('#', '');
      if (colorStr.length == 6) {
        colorStr = 'FF$colorStr';
      }
      return Color(int.parse(colorStr, radix: 16));
    } catch (e) {
      return Colors.blue;
    }
  }

  // Check if task is in the last (completed) stage
  bool _isTaskCompleted(String status, String projectId) {
    final project = _projects.firstWhere(
      (p) => p.id == projectId,
      orElse: () => _projects.isNotEmpty ? _projects.first : Project(
        id: '',
        workspaceId: '',
        name: '',
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
    );

    final stages = project.kanbanStages;
    if (stages.isEmpty) {
      return status.toLowerCase() == 'done' || status.toLowerCase() == 'completed';
    }

    // Find the last stage (highest order)
    final lastStage = stages.reduce((a, b) => a.order > b.order ? a : b);

    // Try to parse status as a number (order + 1)
    final statusNum = int.tryParse(status);
    if (statusNum != null) {
      return statusNum == lastStage.order + 1;
    }

    // Fallback: check by name
    return status.toLowerCase() == lastStage.name.toLowerCase();
  }

  String _getStatusDisplayName(String status, String projectId) {
    // Find the project to get its kanban stages
    final project = _projects.firstWhere(
      (p) => p.id == projectId,
      orElse: () => _projects.isNotEmpty ? _projects.first : Project(
        id: '',
        workspaceId: '',
        name: '',
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
    );

    final stages = project.kanbanStages;
    if (stages.isEmpty) {
      return status;
    }

    // Try to parse status as a number (order + 1)
    final statusNum = int.tryParse(status);
    if (statusNum != null) {
      // Find stage by order (status is order + 1)
      for (final stage in stages) {
        if (stage.order + 1 == statusNum) {
          return stage.name;
        }
      }
    }

    // Fallback: try to match by name
    for (final stage in stages) {
      if (stage.name.toLowerCase() == status.toLowerCase()) {
        return stage.name;
      }
    }

    return status;
  }

  Widget _buildProjectOverviewSection(bool isDark) {
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
          // Header
          Row(
            children: [
              Icon(
                Icons.folder_outlined,
                size: 20,
                color: isDark ? Colors.white70 : Colors.grey[700],
              ),
              const SizedBox(width: 8),
              Text(
                'overview.projects_summary'.tr(),
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : Colors.black,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Project counts - 3 cards
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1E3A5F) : const Color(0xFFE3F2FD),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    children: [
                      Text(
                        '$_totalProjectsCount',
                        style: TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                          color: isDark ? Colors.blue[300] : Colors.blue[700],
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'overview.total'.tr(),
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: isDark ? Colors.blue[300] : Colors.blue[700],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF3D2E1E) : const Color(0xFFFFF4E6),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    children: [
                      Text(
                        '$_activeProjectsCount',
                        style: TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                          color: isDark ? Colors.orange[300] : AppTheme.warningLight,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'overview.active'.tr(),
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: isDark ? Colors.orange[300] : AppTheme.warningLight,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1E3D2E) : const Color(0xFFE8F5E9),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    children: [
                      Text(
                        '$_completedProjectsCount',
                        style: TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                          color: isDark ? Colors.green[300] : AppTheme.successLight,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'overview.completed'.tr(),
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: isDark ? Colors.green[300] : AppTheme.successLight,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Average Progress
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'overview.overall_progress'.tr(),
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: isDark ? Colors.white70 : Colors.grey[700],
                ),
              ),
              Text(
                '${(_averageProgress * 100).toInt()}%',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : Colors.black,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Progress Bar
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: _averageProgress,
              minHeight: 10,
              backgroundColor: isDark ? Colors.grey[800] : Colors.grey[300],
              valueColor: AlwaysStoppedAnimation<Color>(
                _averageProgress > 0.7 ? Colors.green :
                _averageProgress > 0.4 ? Colors.orange : Colors.blue,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTaskBreakdownSection(bool isDark) {
    final stages = _taskStatusBreakdown;

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
          // Header
          Row(
            children: [
              Icon(
                Icons.pie_chart_outline,
                size: 20,
                color: isDark ? Colors.white70 : Colors.grey[700],
              ),
              const SizedBox(width: 8),
              Text(
                'overview.task_breakdown'.tr(),
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : Colors.black,
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: isDark ? Colors.blue.withValues(alpha: 0.2) : Colors.blue.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  'overview.total_count'.tr(args: ['$_totalTasksCount']),
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: isDark ? Colors.blue[300] : Colors.blue[700],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Dynamic task status cards based on kanban stages
          if (stages.isEmpty)
            Center(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Text(
                  'overview.no_status_columns'.tr(),
                  style: TextStyle(
                    color: isDark ? Colors.white60 : Colors.grey[600],
                  ),
                ),
              ),
            )
          else
            // Build grid of status cards (2 per row)
            ...List.generate(
              (stages.length / 2).ceil(),
              (rowIndex) {
                final firstIndex = rowIndex * 2;
                final secondIndex = firstIndex + 1;

                return Padding(
                  padding: EdgeInsets.only(bottom: secondIndex < stages.length || rowIndex < (stages.length / 2).ceil() - 1 ? 10 : 0),
                  child: Row(
                    children: [
                      Expanded(
                        child: _buildStatusCard(
                          stages[firstIndex]['name'] as String,
                          stages[firstIndex]['count'] as int,
                          stages[firstIndex]['color'] as Color,
                          _getStageIcon(stages[firstIndex]['name'] as String, firstIndex, stages.length),
                          isDark,
                        ),
                      ),
                      if (secondIndex < stages.length) ...[
                        const SizedBox(width: 10),
                        Expanded(
                          child: _buildStatusCard(
                            stages[secondIndex]['name'] as String,
                            stages[secondIndex]['count'] as int,
                            stages[secondIndex]['color'] as Color,
                            _getStageIcon(stages[secondIndex]['name'] as String, secondIndex, stages.length),
                            isDark,
                          ),
                        ),
                      ] else
                        const Expanded(child: SizedBox()),
                    ],
                  ),
                );
              },
            ),
        ],
      ),
    );
  }

  // Get icon based on stage name or position
  IconData _getStageIcon(String stageName, int index, int totalStages) {
    final name = stageName.toLowerCase();

    if (name.contains('to do') || name.contains('todo') || name.contains('backlog')) {
      return Icons.radio_button_unchecked;
    } else if (name.contains('progress') || name.contains('doing')) {
      return Icons.autorenew;
    } else if (name.contains('review')) {
      return Icons.rate_review_outlined;
    } else if (name.contains('done') || name.contains('complete') || name.contains('finished')) {
      return Icons.check_circle_outline;
    } else if (name.contains('bug') || name.contains('issue')) {
      return Icons.bug_report_outlined;
    } else if (name.contains('test')) {
      return Icons.science_outlined;
    } else if (index == 0) {
      return Icons.radio_button_unchecked;
    } else if (index == totalStages - 1) {
      return Icons.check_circle_outline;
    } else {
      return Icons.circle_outlined;
    }
  }

  Widget _buildStatusCard(String label, int count, Color color, IconData icon, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? color.withValues(alpha: 0.15) : color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: color.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '$count',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? Colors.white60 : Colors.grey[600],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAllTasksSection(bool isDark) {
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
          // Header
          Row(
            children: [
              Icon(
                Icons.task_alt,
                size: 20,
                color: isDark ? Colors.white70 : Colors.grey[700],
              ),
              const SizedBox(width: 8),
              Text(
                'overview.all_tasks'.tr(),
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : Colors.black,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Task list
          if (_tasks.isEmpty)
            Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  children: [
                    Icon(
                      Icons.inbox_outlined,
                      size: 48,
                      color: isDark ? Colors.white30 : Colors.grey[400],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'overview.no_tasks_found'.tr(),
                      style: TextStyle(
                        color: isDark ? Colors.white60 : Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _tasks.length,
              separatorBuilder: (context, index) => Divider(
                color: isDark ? Colors.white10 : Colors.grey[200],
                height: 1,
              ),
              itemBuilder: (context, index) {
                final task = _tasks[index];
                final project = _projects.firstWhere(
                  (p) => p.id == task.projectId,
                  orElse: () => Project(
                    id: '',
                    workspaceId: '',
                    name: 'Unknown',
                    description: '',
                    type: '',
                    status: '',
                    createdAt: DateTime.now(),
                    updatedAt: DateTime.now(),
                  ),
                );
                final statusColor = _getTaskStatusColor(task.status, task.projectId);
                final progress = _getTaskStatusProgress(task.status, task.projectId);

                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Row(
                    children: [
                      // Status indicator
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: statusColor.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(
                          _isTaskCompleted(task.status, task.projectId)
                              ? Icons.check_circle
                              : Icons.circle_outlined,
                          color: statusColor,
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 12),
                      // Task info
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              task.title,
                              style: TextStyle(
                                fontWeight: FontWeight.w500,
                                color: isDark ? Colors.white : Colors.black87,
                                decoration: _isTaskCompleted(task.status, task.projectId)
                                    ? TextDecoration.lineThrough
                                    : null,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            if (task.description != null && task.description!.isNotEmpty) ...[
                              const SizedBox(height: 4),
                              Html(
                                data: task.description!,
                                style: {
                                  "body": Style(
                                    fontSize: FontSize(12),
                                    color: isDark ? Colors.white60 : Colors.grey[600],
                                    margin: Margins.zero,
                                    padding: HtmlPaddings.zero,
                                    maxLines: 2,
                                    textOverflow: TextOverflow.ellipsis,
                                  ),
                                },
                              ),
                            ],
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: statusColor.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    _getStatusDisplayName(task.status, task.projectId),
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w500,
                                      color: statusColor,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Icon(
                                  Icons.folder_outlined,
                                  size: 12,
                                  color: isDark ? Colors.white38 : Colors.grey[500],
                                ),
                                const SizedBox(width: 4),
                                Expanded(
                                  child: Text(
                                    project.name,
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: isDark ? Colors.white38 : Colors.grey[500],
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      // Progress percentage
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: statusColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          '${(progress * 100).toInt()}%',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: statusColor,
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
        ],
      ),
    );
  }
}
