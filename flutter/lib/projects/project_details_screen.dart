import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_html/flutter_html.dart';
import 'package:easy_localization/easy_localization.dart';
import '../models/project.dart';
import '../models/task.dart';
import '../services/project_service.dart';
import '../services/auth_service.dart';
import 'create_task_screen.dart';
import 'edit_task_screen.dart';
import 'edit_project_dialog.dart';
import '../theme/app_theme.dart';
import 'ai_project_assistant.dart';
import '../widgets/ai_button.dart';
import '../widgets/google_drive_folder_picker.dart';
import '../apps/services/google_drive_service.dart';

class ProjectDetailsScreen extends StatefulWidget {
  final Project project;

  const ProjectDetailsScreen({
    super.key,
    required this.project,
  });

  @override
  State<ProjectDetailsScreen> createState() => _ProjectDetailsScreenState();
}

class _ProjectDetailsScreenState extends State<ProjectDetailsScreen> {
  final ProjectService _projectService = ProjectService.instance;
  List<Task> _tasks = [];
  bool _isLoading = true;
  String? _error;
  late Project _currentProject;

  @override
  void initState() {
    super.initState();
    _currentProject = widget.project;
    _loadTasks();
  }

  void _navigateToTaskDetails(Task task) async {
    final result = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (context) => EditTaskScreen(task: task),
      ),
    );
    
    if (result == true) {
      // Refresh tasks if a task was updated
      _loadTasks();
    }
  }

  void _navigateToCreateTask() async {
    final result = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (context) => CreateTaskScreen(projectId: _currentProject.id),
      ),
    );

    if (result == true) {
      // Refresh tasks if a new task was created
      _loadTasks();
    }
  }

  Future<void> _editProject() async {
    final updatedProject = await Navigator.of(context).push<Project>(
      MaterialPageRoute(
        builder: (context) => EditProjectScreen(project: _currentProject),
      ),
    );

    if (updatedProject != null) {
      setState(() {
        _currentProject = updatedProject;
      });
      // Refresh tasks to reflect any changes (e.g., kanban stages)
      _loadTasks();
    }
  }

  Future<void> _deleteProject() async {
    // Show confirmation dialog
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Text('projects.delete_project'.tr()),
          content: Text(
            'projects.delete_project_confirm'.tr(args: [_currentProject.name]),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text('common.cancel'.tr()),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context, true),
              style: TextButton.styleFrom(
                foregroundColor: Colors.red,
              ),
              child: Text('common.delete'.tr()),
            ),
          ],
        );
      },
    );

    if (confirmed != true) return;

    try {

      final success = await _projectService.deleteProject(_currentProject.id);

      if (mounted) {
        if (success) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  Icon(Icons.check_circle, color: Colors.white, size: 20),
                  SizedBox(width: 8),
                  Text('projects.project_deleted'.tr()),
                ],
              ),
              backgroundColor: context.primaryColor,
            ),
          );
          // Return to previous screen with a flag indicating deletion
          Navigator.pop(context, true);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('projects.failed_to_delete'.tr()),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('projects.error_deleting'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _exportProjectToGoogleDrive() async {
    // Show folder picker dialog
    final result = await GoogleDriveFolderPicker.show(
      context: context,
      title: 'projects.export_to_drive_title'.tr(),
      subtitle: 'projects.export_to_drive_subtitle'.tr(args: [_currentProject.name]),
    );

    if (result == null || !mounted) return;

    // Show loading indicator
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        content: Row(
          children: [
            const CircularProgressIndicator(),
            const SizedBox(width: 16),
            Expanded(
              child: Text('projects.exporting_to_drive'.tr(args: [_currentProject.name])),
            ),
          ],
        ),
      ),
    );

    try {
      final response = await GoogleDriveService.instance.exportProject(
        projectId: _currentProject.id,
        targetFolderId: result.folderId,
        format: 'pdf',
      );

      if (!mounted) return;
      Navigator.of(context).pop(); // Close loading dialog

      if (response.success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('projects.export_success'.tr(args: [_currentProject.name, result.folderPath ?? 'My Drive'])),
            duration: const Duration(seconds: 4),
            action: response.webViewLink != null
                ? SnackBarAction(
                    label: 'projects.open_in_drive'.tr(),
                    onPressed: () {
                      // Open in Google Drive
                    },
                  )
                : null,
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(response.message ?? 'projects.export_failed'.tr()),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      Navigator.of(context).pop(); // Close loading dialog

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('projects.export_failed'.tr()),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _loadTasks() async {
    try {
      setState(() {
        _isLoading = true;
        _error = null;
      });


      final tasks = await _projectService.getTasks(projectId: _currentProject.id);

      if (tasks.isNotEmpty) {
      } else {
      }

      setState(() {
        _tasks = tasks;
        _isLoading = false;
      });

    } catch (e) {
      setState(() {
        _error = 'projects.failed_to_load_tasks'.tr(args: [e.toString()]);
        _isLoading = false;
      });
    }
  }

  // Check if current user is the project owner
  bool get _isProjectOwner {
    final currentUser = AuthService.instance.currentUser;
    if (currentUser == null || _currentProject.ownerId == null) {
      return false;
    }
    return currentUser.id == _currentProject.ownerId;
  }

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        systemOverlayStyle: SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness: isDarkMode ? Brightness.light : Brightness.dark,
          statusBarBrightness: isDarkMode ? Brightness.dark : Brightness.light,
        ),
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back,
            color: Theme.of(context).colorScheme.onSurface,
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          _currentProject.name,
          style: TextStyle(
            color: Theme.of(context).colorScheme.onSurface,
            fontSize: 20,
            fontWeight: FontWeight.w600,
          ),
        ),
        centerTitle: true,
        actions: [
          // AI Assistant button on the right side
          AIButton(
            onPressed: () => showAIProjectAssistant(
              context: context,
              projectId: _currentProject.id,
              projectName: _currentProject.name,
              onTasksChanged: _loadTasks,
            ),
            tooltip: 'projects.ai_assistant'.tr(),
          ),
          const SizedBox(width: 8),
          // Export to Google Drive button
          IconButton(
            icon: Icon(
              Icons.cloud_upload_outlined,
              color: Theme.of(context).colorScheme.onSurface,
            ),
            tooltip: 'projects.export_to_drive'.tr(),
            onPressed: _exportProjectToGoogleDrive,
          ),
          if (_isProjectOwner) ...[
            IconButton(
              icon: Icon(
                Icons.edit,
                color: Theme.of(context).colorScheme.onSurface,
              ),
              onPressed: _editProject,
            ),
            IconButton(
              icon: const Icon(
                Icons.delete_outline,
                color: Colors.red,
              ),
              onPressed: _deleteProject,
            ),
          ],
        ],
      ),
      body: _isLoading
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('projects.loading_details'.tr()),
                ],
              ),
            )
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.error_outline, size: 64, color: Colors.grey[400]),
                      const SizedBox(height: 16),
                      Text('projects.failed_to_load_details'.tr()),
                      const SizedBox(height: 8),
                      Text(_error!),
                      const SizedBox(height: 16),
                      ElevatedButton.icon(
                        onPressed: _loadTasks,
                        icon: const Icon(Icons.refresh),
                        label: Text('common.retry'.tr()),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadTasks,
                  child: _buildProjectContent(),
                ),
      floatingActionButton: FloatingActionButton(
        onPressed: _navigateToCreateTask,
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildProjectContent() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Project Info Card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      CircleAvatar(
                        backgroundColor: _getProjectColor(),
                        child: Text(
                          _currentProject.name.isNotEmpty
                              ? _currentProject.name[0].toUpperCase()
                              : 'P',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _currentProject.name,
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: _getStatusColor().withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: _getStatusColor().withValues(alpha: 0.3),
                                ),
                              ),
                              child: Text(
                                _currentProject.status.toUpperCase(),
                                style: TextStyle(
                                  fontSize: 12,
                                  color: _getStatusColor(),
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  if (_currentProject.description != null && _currentProject.description!.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    Text(
                      'projects.description'.tr(),
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Theme.of(context).colorScheme.onSurface,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Html(
                      data: _currentProject.description!,
                      style: {
                        "body": Style(
                          fontSize: FontSize(14),
                          color: Colors.grey[600],
                          margin: Margins.zero,
                          padding: HtmlPaddings.zero,
                        ),
                        "p": Style(
                          margin: Margins.only(bottom: 8),
                          padding: HtmlPaddings.zero,
                        ),
                        "strong": Style(
                          fontWeight: FontWeight.bold,
                        ),
                        "b": Style(
                          fontWeight: FontWeight.bold,
                        ),
                        "em": Style(
                          fontStyle: FontStyle.italic,
                        ),
                        "i": Style(
                          fontStyle: FontStyle.italic,
                        ),
                        "u": Style(
                          textDecoration: TextDecoration.underline,
                        ),
                        "ul": Style(
                          margin: Margins.only(left: 16, bottom: 8),
                          padding: HtmlPaddings.zero,
                        ),
                        "ol": Style(
                          margin: Margins.only(left: 16, bottom: 8),
                          padding: HtmlPaddings.zero,
                        ),
                        "li": Style(
                          margin: Margins.only(bottom: 4),
                          padding: HtmlPaddings.zero,
                        ),
                      },
                    ),
                  ],
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Icon(Icons.category, size: 16, color: Colors.grey[600]),
                      const SizedBox(width: 4),
                      Text(
                        _currentProject.type,
                        style: TextStyle(
                          color: Colors.grey[600],
                          fontSize: 12,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Icon(Icons.schedule, size: 16, color: Colors.grey[600]),
                      const SizedBox(width: 4),
                      Text(
                        'projects.created'.tr(args: [_formatDate(_currentProject.createdAt)]),
                        style: TextStyle(
                          color: Colors.grey[600],
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Tasks Section
          Row(
            children: [
              Text(
                'tasks.title'.tr(),
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Spacer(),
              Text(
                'projects.task_count'.tr(args: ['${_tasks.length}']),
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.grey[600],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          
          if (_tasks.isEmpty)
            Center(
              child: Column(
                children: [
                  const SizedBox(height: 32),
                  Icon(Icons.task_outlined, size: 64, color: Colors.grey[400]),
                  const SizedBox(height: 16),
                  Text(
                    'projects.no_tasks_yet'.tr(),
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'projects.create_first_task'.tr(),
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ),
            )
          else
            ..._tasks.map((task) => _buildTaskCard(task)),
        ],
      ),
    );
  }

  // Get task progress percentage based on status position in kanban stages
  // Progress is calculated dynamically: (stageIndex + 1) / totalStages
  double _getTaskProgress(String status) {
    final stages = _currentProject.kanbanStages;

    if (stages.isEmpty) {
      // Fallback to default if no stages defined
      return 0.25;
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

  Widget _buildTaskCard(Task task) {
    final progress = _getTaskProgress(task.status);
    final progressPercent = (progress * 100).toInt();

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () => _navigateToTaskDetails(task),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CircleAvatar(
                    backgroundColor: _getTaskStatusColor(task.status),
                    child: Icon(
                      _getTaskStatusIcon(task.status),
                      color: Colors.white,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          task.title,
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                        if (task.description != null && task.description!.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Html(
                            data: task.description!,
                            style: {
                              "body": Style(
                                fontSize: FontSize(13),
                                color: Colors.grey[600],
                                margin: Margins.zero,
                                padding: HtmlPaddings.zero,
                                maxLines: 2,
                                textOverflow: TextOverflow.ellipsis,
                              ),
                              "p": Style(
                                margin: Margins.zero,
                                padding: HtmlPaddings.zero,
                              ),
                              "strong": Style(
                                fontWeight: FontWeight.bold,
                              ),
                              "b": Style(
                                fontWeight: FontWeight.bold,
                              ),
                              "em": Style(
                                fontStyle: FontStyle.italic,
                              ),
                              "i": Style(
                                fontStyle: FontStyle.italic,
                              ),
                              "u": Style(
                                textDecoration: TextDecoration.underline,
                              ),
                            },
                          ),
                        ],
                      ],
                    ),
                  ),
                  _buildStatusDropdown(task),
                ],
              ),
              const SizedBox(height: 12),
              // Progress indicator
              Row(
                children: [
                  Expanded(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: progress,
                        backgroundColor: Colors.grey[200],
                        valueColor: AlwaysStoppedAnimation<Color>(
                          _getTaskStatusColor(task.status),
                        ),
                        minHeight: 6,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '$progressPercent%',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: _getTaskStatusColor(task.status),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 12,
                children: [
                  if (task.priority != null)
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.flag, size: 16, color: _getTaskPriorityColor(task.priority!)),
                        const SizedBox(width: 4),
                        Text(
                          task.priority!.toUpperCase(),
                          style: TextStyle(
                            color: _getTaskPriorityColor(task.priority!),
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.schedule, size: 16, color: Colors.grey[600]),
                      const SizedBox(width: 4),
                      Text(
                        'projects.created'.tr(args: [_formatDate(task.createdAt)]),
                        style: TextStyle(
                          color: Colors.grey[600],
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Get stage info from task status (which is now a numeric string like "1", "2", "3")
  Map<String, dynamic> _getStageFromStatus(String status) {
    final stages = _currentProject.kanbanStages;

    // Try to parse status as a number (order + 1)
    final statusNum = int.tryParse(status);
    if (statusNum != null) {
      // Find stage by order (status is order + 1)
      for (final stage in stages) {
        if (stage.order + 1 == statusNum) {
          return {
            'name': stage.name,
            'color': _parseColor(stage.color),
            'order': stage.order,
          };
        }
      }
    }

    // Fallback: try to match by name (for backward compatibility)
    for (final stage in stages) {
      if (stage.name.toLowerCase() == status.toLowerCase()) {
        return {
          'name': stage.name,
          'color': _parseColor(stage.color),
          'order': stage.order,
        };
      }
    }

    // Default to first stage if not found
    if (stages.isNotEmpty) {
      return {
        'name': stages.first.name,
        'color': _parseColor(stages.first.color),
        'order': stages.first.order,
      };
    }

    return {
      'name': 'Unknown',
      'color': Colors.grey,
      'order': 0,
    };
  }

  Widget _buildStatusDropdown(Task task) {
    // Get kanban stages from current project
    final stages = _currentProject.kanbanStages;

    // Get current stage info from task status
    final currentStage = _getStageFromStatus(task.status);
    final String currentStageName = currentStage['name'];
    final Color currentColor = currentStage['color'];

    return PopupMenuButton<String>(
      onSelected: (newStatus) => _updateTaskStatus(task, newStatus),
      offset: const Offset(0, 40),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      itemBuilder: (context) {
        return stages.map((stage) {
          final stageColor = _parseColor(stage.color);
          final isSelected = stage.name == currentStageName;

          return PopupMenuItem<String>(
            value: stage.name,
            child: Row(
              children: [
                Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    color: stageColor,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    stage.name,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                      color: Theme.of(context).colorScheme.onSurface,
                    ),
                  ),
                ),
                if (isSelected)
                  Icon(
                    Icons.check,
                    size: 16,
                    color: stageColor,
                  ),
              ],
            ),
          );
        }).toList();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: currentColor.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: currentColor.withValues(alpha: 0.3),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              currentStageName.toUpperCase(),
              style: TextStyle(
                fontSize: 12,
                color: currentColor,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(width: 4),
            Icon(
              Icons.arrow_drop_down,
              size: 16,
              color: currentColor,
            ),
          ],
        ),
      ),
    );
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

  Future<void> _updateTaskStatus(Task task, String newStatus) async {
    try {
      // Find the stage order for the API
      int statusOrder = 1;
      for (int i = 0; i < _currentProject.kanbanStages.length; i++) {
        if (_currentProject.kanbanStages[i].name == newStatus) {
          statusOrder = _currentProject.kanbanStages[i].order + 1;
          break;
        }
      }


      await _projectService.updateTask(
        task.id,
        {'status': statusOrder},
      );

      // Refresh tasks to show updated status
      _loadTasks();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle, color: Colors.white, size: 20),
                const SizedBox(width: 8),
                Text('projects.task_status_updated'.tr(args: [newStatus])),
              ],
            ),
            backgroundColor: context.primaryColor,
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('projects.failed_to_update_status'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Color _getProjectColor() {
    final colors = [
      Colors.blue, Colors.green, Colors.orange, Colors.purple,
      Colors.red, Colors.teal, Colors.indigo, Colors.pink,
    ];
    return colors[_currentProject.name.hashCode % colors.length];
  }

  Color _getStatusColor() {
    switch (_currentProject.status.toLowerCase()) {
      case 'active':
        return Colors.green;
      case 'completed':
        return Colors.blue;
      case 'paused':
        return Colors.orange;
      case 'cancelled':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  Color _getTaskStatusColor(String status) {
    // Use the stage color from kanban stages
    final stageInfo = _getStageFromStatus(status);
    return stageInfo['color'] as Color;
  }

  IconData _getTaskStatusIcon(String status) {
    // Get the actual stage name from status
    final stageInfo = _getStageFromStatus(status);
    final stageName = (stageInfo['name'] as String).toLowerCase();

    // Match icons based on common stage name patterns
    if (stageName.contains('to do') || stageName.contains('todo') || stageName.contains('backlog')) {
      return Icons.radio_button_unchecked;
    } else if (stageName.contains('progress') || stageName.contains('doing')) {
      return Icons.pending_actions;
    } else if (stageName.contains('done') || stageName.contains('complete') || stageName.contains('finished')) {
      return Icons.check_circle;
    } else if (stageName.contains('review')) {
      return Icons.rate_review;
    } else if (stageName.contains('bug') || stageName.contains('issue')) {
      return Icons.bug_report;
    } else if (stageName.contains('test')) {
      return Icons.science;
    } else {
      return Icons.task;
    }
  }

  Color _getTaskPriorityColor(String priority) {
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

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);

    if (difference.inDays == 0) {
      return 'projects.today'.tr();
    } else if (difference.inDays == 1) {
      return 'projects.yesterday'.tr();
    } else if (difference.inDays < 7) {
      return 'projects.days_ago'.tr(args: ['${difference.inDays}']);
    } else if (difference.inDays < 30) {
      final weeks = (difference.inDays / 7).floor();
      return weeks == 1 ? 'projects.week_ago'.tr() : 'projects.weeks_ago'.tr(args: ['$weeks']);
    } else {
      final months = (difference.inDays / 30).floor();
      return months == 1 ? 'projects.month_ago'.tr() : 'projects.months_ago'.tr(args: ['$months']);
    }
  }
}