import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'project_model.dart';
import 'project_service.dart';
import 'edit_task_screen.dart';
import '../models/task.dart' as models;
import '../api/services/project_api_service.dart' show ProjectApiService, TaskDependencyResponse, AddDependencyDto;
import '../services/workspace_service.dart';

class TaskDetailsScreen extends StatefulWidget {
  final Task task;

  const TaskDetailsScreen({
    super.key,
    required this.task,
  });

  @override
  State<TaskDetailsScreen> createState() => _TaskDetailsScreenState();
}

class _TaskDetailsScreenState extends State<TaskDetailsScreen> {
  final ProjectService _projectService = ProjectService();
  final ProjectApiService _projectApiService = ProjectApiService();
  final WorkspaceService _workspaceService = WorkspaceService.instance;
  late Task _task;
  Project? _project;
  List<TaskDependencyResponse> _dependencies = [];
  bool _isLoadingDependencies = false;

  @override
  void initState() {
    super.initState();
    _task = widget.task;
    _loadProject();
    _loadDependencies();
  }

  void _loadProject() async {
    _project = await _projectService.getProjectById(_task.projectId);
    if (mounted) {
      setState(() {});
    }
  }

  Future<void> _loadDependencies() async {
    final workspaceId = _workspaceService.currentWorkspace?.id;
    if (workspaceId == null) return;

    setState(() => _isLoadingDependencies = true);

    try {
      final response = await _projectApiService.getTaskDependencies(
        workspaceId,
        _task.id,
      );

      if (mounted) {
        setState(() {
          if (response.success && response.data != null) {
            _dependencies = response.data!;
          }
          _isLoadingDependencies = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoadingDependencies = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back,
            color: Theme.of(context).colorScheme.onSurface,
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'tasks.task_details'.tr(),
          style: TextStyle(
            color: Theme.of(context).colorScheme.onSurface,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        actions: [
          PopupMenuButton<String>(
            onSelected: _handleMenuAction,
            itemBuilder: (context) => [
              PopupMenuItem(
                value: 'edit',
                child: Row(
                  children: [
                    Icon(Icons.edit, size: 18, color: Theme.of(context).colorScheme.onSurface),
                    const SizedBox(width: 12),
                    Text('tasks.edit_task'.tr()),
                  ],
                ),
              ),
              PopupMenuItem(
                value: 'delete',
                child: Row(
                  children: [
                    Icon(Icons.delete, size: 18, color: Colors.red),
                    const SizedBox(width: 12),
                    Text('tasks.delete_task'.tr(), style: TextStyle(color: Colors.red)),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Task Header
            Container(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Task Title
                  Text(
                    _task.title,
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.onSurface,
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  
                  // Project Info
                  if (_project != null)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: _getProjectColor(_project!.type).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            _getProjectIcon(_project!.type),
                            size: 14,
                            color: _getProjectColor(_project!.type),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            _project!.name,
                            style: TextStyle(
                              color: _getProjectColor(_project!.type),
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),

            // Status and Priority Section
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 24),
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: Theme.of(context).colorScheme.outline.withOpacity(0.1),
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: _buildInfoItem(
                      'tasks.status'.tr(),
                      _getStatusDisplayName(_task.status),
                      _getStatusColor(_task.status),
                      Icons.radio_button_checked,
                    ),
                  ),
                  Container(
                    width: 1,
                    height: 40,
                    color: Theme.of(context).colorScheme.outline.withOpacity(0.2),
                  ),
                  Expanded(
                    child: _buildInfoItem(
                      'tasks.priority'.tr(),
                      _task.priority.name.toUpperCase(),
                      _getPriorityColor(_task.priority),
                      Icons.flag,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Task Details
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 24),
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: Theme.of(context).colorScheme.outline.withOpacity(0.1),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'tasks.description'.tr(),
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.onSurface,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    (_task.description == null || _task.description!.isEmpty)
                        ? 'tasks.no_description'.tr()
                        : _task.description!,
                    style: TextStyle(
                      color: (_task.description == null || _task.description!.isEmpty)
                          ? Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5)
                          : Theme.of(context).colorScheme.onSurface,
                      fontSize: 14,
                      height: 1.5,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Task Info Grid
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: _buildDetailCard(
                          'tasks.created'.tr(),
                          _formatDate(_task.createdAt),
                          Icons.calendar_today,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: _buildDetailCard(
                          'tasks.due_date'.tr(),
                          _task.dueDate != null
                              ? _formatDate(_task.dueDate!)
                              : 'tasks.not_set'.tr(),
                          Icons.schedule,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: _buildDetailCard(
                          'tasks.assignee'.tr(),
                          _task.assignedTo ?? 'tasks.unassigned'.tr(),
                          Icons.person,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: _buildDetailCard(
                          'tasks.task_id'.tr(),
                          _task.id.length > 8
                              ? '${_task.id.substring(0, 8)}...'
                              : _task.id,
                          Icons.tag,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Dependencies Section
            _buildDependenciesSection(),

            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildDependenciesSection() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Theme.of(context).colorScheme.outline.withOpacity(0.1),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(
                    Icons.account_tree,
                    size: 18,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'tasks.dependencies'.tr(),
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.onSurface,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
              TextButton.icon(
                onPressed: _showAddDependencyDialog,
                icon: const Icon(Icons.add, size: 18),
                label: Text('tasks.add_dependency'.tr()),
                style: TextButton.styleFrom(
                  foregroundColor: Theme.of(context).colorScheme.primary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (_isLoadingDependencies)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: CircularProgressIndicator(),
              ),
            )
          else if (_dependencies.isEmpty)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surfaceContainerHighest.withOpacity(0.3),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.info_outline,
                    size: 18,
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'tasks.no_dependencies_hint'.tr(),
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ],
              ),
            )
          else
            Column(
              children: _dependencies.map((dep) => _buildDependencyItem(dep)).toList(),
            ),
        ],
      ),
    );
  }

  Widget _buildDependencyItem(TaskDependencyResponse dependency) {
    final isBlocking = dependency.dependencyType == 'blocks';
    final color = isBlocking ? Colors.orange : Colors.blue;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.05),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Icon(
              isBlocking ? Icons.block : Icons.arrow_back,
              size: 16,
              color: color,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  dependency.dependsOnTaskTitle ?? 'Unknown Task',
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurface,
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  isBlocking ? 'tasks.blocks'.tr() : 'tasks.blocked_by'.tr(),
                  style: TextStyle(
                    color: color,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          if (dependency.dependsOnTaskStatus != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: _getStatusColorByString(dependency.dependsOnTaskStatus!),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                dependency.dependsOnTaskStatus!,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          const SizedBox(width: 8),
          IconButton(
            onPressed: () => _removeDependency(dependency),
            icon: const Icon(Icons.close, size: 18),
            color: Colors.red,
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
          ),
        ],
      ),
    );
  }

  Color _getStatusColorByString(String status) {
    switch (status.toLowerCase()) {
      case 'todo':
        return Colors.grey;
      case 'in_progress':
        return Colors.blue;
      case 'done':
      case 'completed':
        return Colors.green;
      case 'cancelled':
        return Colors.red;
      case 'review':
        return Colors.orange;
      case 'testing':
        return Colors.purple;
      default:
        return Colors.grey;
    }
  }

  Future<void> _showAddDependencyDialog() async {
    final workspaceId = _workspaceService.currentWorkspace?.id;
    if (workspaceId == null) return;

    // Get available tasks from the same project
    final tasks = await _projectService.getTasksForProject(_task.projectId);
    if (tasks.isEmpty) return;

    // Filter out current task and already added dependencies
    final dependencyIds = _dependencies.map((d) => d.dependsOnTaskId).toSet();
    final availableTasks = tasks.where((t) =>
      t.id != _task.id && !dependencyIds.contains(t.id)
    ).toList();

    if (!mounted) return;

    if (availableTasks.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('tasks.no_tasks_found'.tr()),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    String? selectedTaskId;
    String selectedType = 'blocked_by';

    await showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text('tasks.add_dependency'.tr()),
          content: SizedBox(
            width: 400,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'tasks.select_dependency'.tr(),
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: selectedTaskId,
                  hint: Text('tasks.search_tasks_to_add'.tr()),
                  decoration: const InputDecoration(
                    border: OutlineInputBorder(),
                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  ),
                  items: availableTasks.map((task) => DropdownMenuItem(
                    value: task.id,
                    child: Text(
                      task.title,
                      overflow: TextOverflow.ellipsis,
                    ),
                  )).toList(),
                  onChanged: (value) {
                    setDialogState(() => selectedTaskId = value);
                  },
                ),
                const SizedBox(height: 16),
                Text(
                  'tasks.dependency_type'.tr(),
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  value: selectedType,
                  decoration: const InputDecoration(
                    border: OutlineInputBorder(),
                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  ),
                  items: [
                    DropdownMenuItem(
                      value: 'blocked_by',
                      child: Text('tasks.blocked_by'.tr()),
                    ),
                    DropdownMenuItem(
                      value: 'blocks',
                      child: Text('tasks.blocks'.tr()),
                    ),
                    DropdownMenuItem(
                      value: 'finish_to_start',
                      child: Text('tasks.finish_to_start'.tr()),
                    ),
                  ],
                  onChanged: (value) {
                    if (value != null) {
                      setDialogState(() => selectedType = value);
                    }
                  },
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text('common.cancel'.tr()),
            ),
            ElevatedButton(
              onPressed: selectedTaskId == null
                  ? null
                  : () async {
                      Navigator.pop(context);
                      await _addDependency(selectedTaskId!, selectedType);
                    },
              style: ElevatedButton.styleFrom(
                backgroundColor: Theme.of(context).colorScheme.primary,
                foregroundColor: Colors.white,
              ),
              child: Text('common.add'.tr()),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _addDependency(String dependsOnTaskId, String dependencyType) async {
    final workspaceId = _workspaceService.currentWorkspace?.id;
    if (workspaceId == null) return;

    try {
      final response = await _projectApiService.addTaskDependency(
        workspaceId,
        _task.id,
        AddDependencyDto(
          dependsOnTaskId: dependsOnTaskId,
          dependencyType: dependencyType,
        ),
      );

      if (mounted) {
        if (response.success) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('tasks.dependency_added'.tr()),
              backgroundColor: Colors.green,
            ),
          );
          _loadDependencies();
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('tasks.failed_to_add_dependency'.tr()),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('tasks.failed_to_add_dependency'.tr()),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _removeDependency(TaskDependencyResponse dependency) async {
    final workspaceId = _workspaceService.currentWorkspace?.id;
    if (workspaceId == null) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('tasks.remove_dependency'.tr()),
        content: Text('Are you sure you want to remove this dependency?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('common.cancel'.tr()),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: Text('common.remove'.tr()),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      final response = await _projectApiService.removeTaskDependency(
        workspaceId,
        _task.id,
        dependency.id,
      );

      if (mounted) {
        if (response.success) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('tasks.dependency_removed'.tr()),
              backgroundColor: Colors.green,
            ),
          );
          _loadDependencies();
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('tasks.failed_to_remove_dependency'.tr()),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('tasks.failed_to_remove_dependency'.tr()),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Widget _buildInfoItem(String label, String value, Color color, IconData icon) {
    return Column(
      children: [
        Icon(icon, color: color, size: 24),
        const SizedBox(height: 8),
        Text(
          label,
          style: TextStyle(
            color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
            fontSize: 12,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            color: Theme.of(context).colorScheme.onSurface,
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }

  Widget _buildDetailCard(String title, String value, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: Theme.of(context).colorScheme.outline.withOpacity(0.1),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                icon,
                size: 16,
                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
              ),
              const SizedBox(width: 6),
              Text(
                title,
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                  fontSize: 12,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              color: Theme.of(context).colorScheme.onSurface,
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Color _getStatusColor(TaskStatus status) {
    switch (status) {
      case TaskStatus.todo:
        return Colors.grey;
      case TaskStatus.inProgress:
        return Colors.blue;
      case TaskStatus.completed:
      case TaskStatus.done:
        return Colors.green;
      case TaskStatus.cancelled:
        return Colors.red;
      case TaskStatus.review:
        return Colors.orange;
      case TaskStatus.testing:
        return Colors.purple;
    }
  }

  Color _getPriorityColor(TaskPriority priority) {
    switch (priority) {
      case TaskPriority.lowest:
      case TaskPriority.low:
        return Colors.green;
      case TaskPriority.medium:
        return Colors.orange;
      case TaskPriority.high:
      case TaskPriority.highest:
        return Colors.red;
    }
  }

  IconData _getProjectIcon(ProjectType type) {
    switch (type) {
      case ProjectType.development:
        return Icons.code;
      case ProjectType.design:
        return Icons.palette;
      case ProjectType.research:
        return Icons.science;
      case ProjectType.task:
        return Icons.task_alt;
      case ProjectType.kanban:
        return Icons.dashboard;
      case ProjectType.scrum:
        return Icons.format_list_numbered;
      case ProjectType.waterfall:
        return Icons.waterfall_chart;
    }
  }

  Color _getProjectColor(ProjectType type) {
    switch (type) {
      case ProjectType.development:
        return Colors.blue;
      case ProjectType.design:
        return Colors.purple;
      case ProjectType.research:
        return Colors.green;
      case ProjectType.task:
        return Colors.orange;
      case ProjectType.kanban:
        return Colors.teal;
      case ProjectType.scrum:
        return Colors.indigo;
      case ProjectType.waterfall:
        return Colors.cyan;
    }
  }

  String _getStatusDisplayName(TaskStatus status) {
    switch (status) {
      case TaskStatus.todo:
        return 'tasks.status_todo'.tr();
      case TaskStatus.inProgress:
        return 'tasks.status_in_progress'.tr();
      case TaskStatus.completed:
      case TaskStatus.done:
        return 'tasks.status_completed'.tr();
      case TaskStatus.cancelled:
        return 'tasks.status_cancelled'.tr();
      case TaskStatus.review:
        return 'tasks.status_in_review'.tr();
      case TaskStatus.testing:
        return 'tasks.status_testing'.tr();
    }
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }

  void _handleMenuAction(String action) {
    switch (action) {
      case 'edit':
        _editTask();
        break;
      case 'delete':
        _deleteTask();
        break;
    }
  }


  void _editTask() async {
    // Convert project_model.Task to models/task.Task for EditTaskScreen
    final modelsTask = models.Task(
      id: _task.id,
      projectId: _task.projectId,
      sprintId: _task.sprintId,
      parentTaskId: _task.parentTaskId,
      taskType: _task.taskType.value,
      title: _task.title,
      description: _task.description,
      status: _task.status.value,
      priority: _task.priority.value,
      assigneeId: _task.assignedTo,
      assigneeTeamMemberId: _task.assigneeTeamMemberId,
      assignedTo: _task.assignedTo,
      dueDate: _task.dueDate,
      estimatedHours: _task.estimatedHours,
      storyPoints: _task.storyPoints,
      labels: _task.labels ?? [],
      createdAt: _task.createdAt,
      updatedAt: _task.updatedAt,
    );

    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => EditTaskScreen(task: modelsTask),
      ),
    );

    if (result != null && result is models.Task && mounted) {
      // Reload the task from service to get latest data
      final updatedTask = await _projectService.getTaskById(_task.id);
      if (updatedTask != null) {
        setState(() {
          _task = updatedTask;
        });
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('tasks.task_updated'.tr())),
      );
    }
  }

  void _deleteTask() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('tasks.delete_task'.tr()),
        content: Text('tasks.delete_task_confirm'.tr()),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            style: TextButton.styleFrom(foregroundColor: const Color(0xFF215AD5)),
            child: Text('common.cancel'.tr()),
          ),
          TextButton(
            onPressed: () async {
              await _projectService.deleteTask(_task.id);
              if (mounted) {
                Navigator.pop(context); // Close dialog
                Navigator.pop(context, true); // Return to previous screen with refresh flag
              }
            },
            style: TextButton.styleFrom(foregroundColor: const Color(0xFF215AD5)),
            child: Text('common.delete'.tr()),
          ),
        ],
      ),
    );
  }
}