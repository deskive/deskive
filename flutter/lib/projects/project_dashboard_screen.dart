import 'package:flutter/material.dart';
import 'package:flutter_html/flutter_html.dart';
import 'package:easy_localization/easy_localization.dart';
import '../services/project_service.dart';
import '../models/project.dart';
import '../models/task.dart';
import '../config/app_config.dart';
import 'create_project_screen.dart';
import 'project_details_screen.dart';
import 'edit_task_screen.dart';
import '../screens/project_overview_screen.dart';
import '../team/team_screen.dart';
import '../screens/upcoming_deadlines_screen.dart';
import '../screens/quick_actions_screen.dart';
import 'ai_project_assistant.dart';
import '../widgets/ai_button.dart';
import 'task_import_modal.dart';
import '../tools/templates/template_gallery_screen.dart';
import '../api/services/bot_api_service.dart';

class ProjectDashboardScreen extends StatefulWidget {
  const ProjectDashboardScreen({super.key});

  @override
  State<ProjectDashboardScreen> createState() => _ProjectDashboardScreenState();
}

class _ProjectDashboardScreenState extends State<ProjectDashboardScreen> {
  final ProjectService _projectService = ProjectService.instance;
  final BotApiService _botApi = BotApiService();
  final TextEditingController _searchController = TextEditingController();

  List<Project> _projects = [];
  List<Task> _tasks = [];
  String? _currentUserId;
  bool _isLoading = true;
  String? _error;
  String _selectedFilter = 'All types';
  String _searchQuery = '';

  // Get tasks assigned to current user OR created by current user
  List<Task> get _myTasks {
    if (_currentUserId == null) {
      return [];
    }


    final result = _tasks.where((task) {
      // Check if current user created the task
      if (task.createdBy == _currentUserId) {
        return true;
      }

      // Check if current user is in assignees list
      if (task.assignees.isNotEmpty) {
        final isAssigned = task.assignees.any((a) => a.id == _currentUserId);
        if (isAssigned) {
        }
        return isAssigned;
      }

      // Fallback to assignedTo field
      if (task.assignedTo == _currentUserId) {
        return true;
      }

      // Debug: print task info for non-matching tasks
      return false;
    }).toList();

    return result;
  }

  final List<String> _filterOptions = [
    'All types',
    'kanban',
    'scrum',
    'bug_tracking',
    'feature',
    'research',
  ];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    try {
      setState(() {
        _isLoading = true;
        _error = null;
      });


      // Get current user ID for filtering "My Tasks"
      final userId = await AppConfig.getCurrentUserId();

      // First, load all projects
      final workspaceId = await AppConfig.getCurrentWorkspaceId();

      final projects = await _projectService.getProjects(workspaceId: workspaceId);

      // Then, fetch tasks for each project IN PARALLEL
      List<Task> allTasks = [];

      if (projects.isNotEmpty) {
        final startTime = DateTime.now();

        // ✅ PARALLEL FETCHING - Much faster!
        // Create a list of futures for all task fetching operations
        final taskFutures = projects.map((project) {
          return _projectService.getTasks(
            projectId: project.id,
            workspaceId: workspaceId,
          ).then((tasks) {
            return tasks;
          }).catchError((e) {
            return <Task>[]; // Return empty list on error
          });
        }).toList();

        // Wait for all task fetching operations to complete in parallel
        final allTaskLists = await Future.wait(taskFutures);

        // Flatten the list of task lists into a single list
        allTasks = allTaskLists.expand((tasks) => tasks).toList();

        final endTime = DateTime.now();
        final duration = endTime.difference(startTime).inMilliseconds;

        // Log each task status (reduced logging for performance)
      } else {
      }

      setState(() {
        _projects = projects;
        _tasks = allTasks;
        _currentUserId = userId;
        _isLoading = false;
      });


      // Log task breakdown by status
      final tasksByStatus = <String, int>{};
      for (final task in allTasks) {
        tasksByStatus[task.status] = (tasksByStatus[task.status] ?? 0) + 1;
      }

    } catch (e, stackTrace) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  List<Project> get _filteredProjects {
    var filtered = _projects.where((project) {
      // Search filter
      if (_searchQuery.isNotEmpty && 
          !project.name.toLowerCase().contains(_searchQuery.toLowerCase()) &&
          !(project.description?.toLowerCase().contains(_searchQuery.toLowerCase()) ?? false)) {
        return false;
      }

      // Type filter
      if (_selectedFilter != 'All types') {
        if (project.type.toLowerCase() != _selectedFilter.toLowerCase()) {
          return false;
        }
      }

      return true;
    }).toList();

    return filtered;
  }

  List<Task> get _inProgressTasks => _tasks.where((task) => task.status == 'in_progress').toList();
  List<Task> get _overdueTasks => _tasks.where((task) =>
    task.dueDate != null &&
    task.dueDate!.isBefore(DateTime.now()) &&
    task.completedAt == null  // Not completed (based on completed_at field)
  ).toList();

  // Get task progress based on status position in project's kanban stages
  // Progress is calculated dynamically: (stageIndex + 1) / totalStages
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

  // Calculate project progress as average of all task status percentages
  double _calculateProjectProgress(List<Task> projectTasks) {
    if (projectTasks.isEmpty) return 0.0;

    final totalProgress = projectTasks.fold<double>(
      0.0,
      (sum, task) => sum + _getTaskStatusProgress(task.status, task.projectId),
    );
    return totalProgress / projectTasks.length;
  }

  double get _overallCompletionRate {
    if (_tasks.isEmpty) return 0.0;
    return _calculateProjectProgress(_tasks);
  }

  void _handleMenuSelection(String value) async {
    switch (value) {
      case 'project_overview':
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => const ProjectOverviewScreen(),
          ),
        );
        break;
      case 'team_members':
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => const TeamScreen(),
          ),
        );
        break;
      case 'upcoming_deadlines':
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => const UpcomingDeadlinesScreen(),
          ),
        );
        break;
      case 'quick_actions':
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => const QuickActionsScreen(),
          ),
        );
        break;
      case 'templates':
        final result = await Navigator.of(context).push<Project>(
          MaterialPageRoute(
            builder: (context) => const TemplateGalleryScreen(),
          ),
        );
        if (result != null) {
          _loadData();
        }
        break;
    }
  }

  Future<void> _showCreateProjectDialog() async {
    final result = await Navigator.of(context).push<Project>(
      MaterialPageRoute(
        builder: (context) => const CreateProjectScreen(),
      ),
    );
    
    if (result != null) {
      // Reload data to show the new project
      await _loadData();
      
      // Show success message
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle, color: Colors.white, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text('projects.project_created_success'.tr(args: [result.name])),
                ),
              ],
            ),
            backgroundColor: Colors.green,
          ),
        );
      }
    }
  }

  void _showImportModal() {
    showDialog(
      context: context,
      builder: (context) => TaskImportModal(
        projectId: null, // User will select project in modal
        onTasksImported: () {
          _loadData();
        },
      ),
    );
  }

  Future<void> _navigateToProjectDetails(Project project) async {
    final result = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (context) => ProjectDetailsScreen(project: project),
      ),
    );

    // If the project was deleted (result == true), reload the project list
    if (result == true) {
      _loadData();
    }
  }

  Future<void> _showAssignBotDialog(Project project) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) return;

    // Show loading dialog
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: CircularProgressIndicator(),
      ),
    );

    try {
      // Fetch all workspace bots
      final botsResponse = await _botApi.getBots(workspaceId);

      // Fetch currently assigned bots
      final assignedBotsResponse = await _botApi.getProjectBots(workspaceId, project.id);

      if (!mounted) return;
      Navigator.pop(context); // Close loading dialog

      if (!botsResponse.isSuccess) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(botsResponse.message ?? 'projects.failed_to_load_bots'.tr())),
        );
        return;
      }

      // Filter to only show active bots
      final allBots = botsResponse.data ?? [];
      final activeBots = allBots.where((bot) => bot.status == BotStatus.active).toList();

      // Get set of assigned bot IDs
      final assignedBots = assignedBotsResponse.data ?? [];
      final assignedBotIds = assignedBots.map((b) => b.id).toSet();

      if (activeBots.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('projects.no_bots_available'.tr())),
        );
        return;
      }

      // Show bot selection dialog
      await showDialog(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: Text('projects.assign_ai_assistant'.tr()),
          content: SizedBox(
            width: double.maxFinite,
            child: ListView.builder(
              shrinkWrap: true,
              itemCount: activeBots.length,
              itemBuilder: (context, index) {
                final bot = activeBots[index];
                final isAssigned = assignedBotIds.contains(bot.id);

                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Row(
                      children: [
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [
                                Theme.of(context).primaryColor,
                                Theme.of(context).primaryColor.withValues(alpha: 0.7),
                              ],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(
                            Icons.smart_toy,
                            color: Colors.white,
                            size: 20,
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
                                      bot.displayName ?? bot.name,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w600,
                                        fontSize: 14,
                                      ),
                                    ),
                                  ),
                                  if (isAssigned)
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: Colors.green.withValues(alpha: 0.1),
                                        borderRadius: BorderRadius.circular(12),
                                        border: Border.all(color: Colors.green.withValues(alpha: 0.3)),
                                      ),
                                      child: Text(
                                        'projects.already_assigned'.tr(),
                                        style: const TextStyle(
                                          fontSize: 10,
                                          color: Colors.green,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                              if (bot.description != null && bot.description!.isNotEmpty) ...[
                                const SizedBox(height: 4),
                                Text(
                                  bot.description!,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                                ),
                              ],
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        ElevatedButton(
                          onPressed: isAssigned ? null : () async {
                            final result = await _botApi.assignBotToProject(
                              workspaceId,
                              bot.id,
                              project.id,
                            );
                            if (result.isSuccess) {
                              if (mounted) {
                                Navigator.pop(dialogContext);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text('projects.bot_assigned_success'.tr())),
                                );
                              }
                            } else {
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text(result.message ?? 'projects.bot_assign_failed'.tr())),
                                );
                              }
                            }
                          },
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            minimumSize: const Size(0, 32),
                          ),
                          child: Text('projects.assign'.tr(), style: const TextStyle(fontSize: 12)),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: Text('common.cancel'.tr()),
            ),
          ],
        ),
      );
    } catch (e) {
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('projects.failed_to_load_bots'.tr())),
        );
      }
    }
  }

  void _navigateToTaskDetails(Task task) async {
    final result = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (context) => EditTaskScreen(task: task),
      ),
    );

    if (result == true) {
      // Refresh data if task was updated
      _loadData();
    }
  }

  Future<void> _toggleTaskCompletion(Task task) async {
    try {
      final isCurrentlyCompleted = task.completedAt != null;


      // Get current user ID
      final userId = await AppConfig.getCurrentUserId();

      // Show loading indicator
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                ),
              ),
              const SizedBox(width: 12),
              Text(isCurrentlyCompleted ? 'projects.reopening_task'.tr() : 'projects.completing_task'.tr()),
            ],
          ),
          duration: const Duration(seconds: 1),
        ),
      );

      // Toggle completion based on completedAt field
      Task updatedTask;
      if (isCurrentlyCompleted) {
        updatedTask = await _projectService.markTaskAsIncomplete(task.id);
      } else {
        updatedTask = await _projectService.markTaskAsComplete(
          task.id,
          userId: userId,
        );
      }

      // Reload data to reflect changes
      await _loadData();

      // Show success message
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                Icon(
                  isCurrentlyCompleted ? Icons.restart_alt : Icons.check_circle,
                  color: Colors.white,
                  size: 20,
                ),
                const SizedBox(width: 8),
                Text(isCurrentlyCompleted
                    ? 'projects.task_reopened'.tr()
                    : 'projects.task_completed'.tr()),
              ],
            ),
            backgroundColor: isCurrentlyCompleted ? Colors.orange : Colors.green,
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } catch (e, stackTrace) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.error, color: Colors.white, size: 20),
                const SizedBox(width: 8),
                Expanded(child: Text('projects.failed_to_update_task'.tr(args: [e.toString()]))),
              ],
            ),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    }
  }


  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const CircularProgressIndicator(),
              const SizedBox(height: 16),
              Text('projects.loading_dashboard'.tr()),
            ],
          ),
        ),
      );
    }

    if (_error != null) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error_outline, size: 64, color: Colors.grey[400]),
              const SizedBox(height: 16),
              Text('projects.failed_to_load_dashboard'.tr(), style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 8),
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: _loadData,
                icon: const Icon(Icons.refresh),
                label: Text('projects.try_again'.tr()),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        leading: Builder(
          builder: (context) => IconButton(
            onPressed: () => Scaffold.of(context).openDrawer(),
            icon: const Icon(Icons.menu),
          ),
        ),
        title: Text('projects.title'.tr()),
        centerTitle: true,
        actions: [
          // AI Assistant button
          AIButton(
            onPressed: () => showAIProjectAssistant(
              context: context,
              onProjectsChanged: _loadData,
            ),
            tooltip: 'AI Project Assistant',
          ),
          IconButton(
            onPressed: _showImportModal,
            icon: const Icon(Icons.file_download_outlined),
            tooltip: 'tasks_import.title'.tr(),
          ),
          IconButton(
            onPressed: _showCreateProjectDialog,
            icon: const Icon(Icons.add),
          ),
          PopupMenuButton<String>(
            onSelected: _handleMenuSelection,
            itemBuilder: (BuildContext context) => [
              PopupMenuItem<String>(
                value: 'project_overview',
                child: Row(
                  children: [
                    Icon(Icons.dashboard_outlined, size: 20, color: Theme.of(context).colorScheme.onSurface),
                    const SizedBox(width: 12),
                    Text('projects.project_overview'.tr()),
                  ],
                ),
              ),
              PopupMenuItem<String>(
                value: 'templates',
                child: Row(
                  children: [
                    Icon(Icons.dashboard_customize_outlined, size: 20, color: Theme.of(context).colorScheme.onSurface),
                    const SizedBox(width: 12),
                    Text('projects.templates'.tr()),
                  ],
                ),
              ),
              PopupMenuItem<String>(
                value: 'team_members',
                child: Row(
                  children: [
                    Icon(Icons.people_outline, size: 20, color: Theme.of(context).colorScheme.onSurface),
                    const SizedBox(width: 12),
                    Text('projects.team_members'.tr()),
                  ],
                ),
              ),
              PopupMenuItem<String>(
                value: 'upcoming_deadlines',
                child: Row(
                  children: [
                    Icon(Icons.schedule_outlined, size: 20, color: Theme.of(context).colorScheme.onSurface),
                    const SizedBox(width: 12),
                    Text('projects.upcoming_deadlines'.tr()),
                  ],
                ),
              ),
              PopupMenuItem<String>(
                value: 'quick_actions',
                child: Row(
                  children: [
                    Icon(Icons.flash_on_outlined, size: 20, color: Theme.of(context).colorScheme.onSurface),
                    const SizedBox(width: 12),
                    Text('projects.quick_actions'.tr()),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      drawer: _buildDrawer(),
      body: RefreshIndicator(
        onRefresh: _loadData,
        child: _buildBody(),
      ),
    );
  }

  Widget _buildDrawer() {
    return Drawer(
      backgroundColor: Theme.of(context).brightness == Brightness.dark 
          ? const Color(0xFF1A1D29) 
          : Colors.white,
      width: 300,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.zero,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Projects Section (Top)
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Enhanced Drawer Header
                Container(
                  padding: const EdgeInsets.fromLTRB(24, 60, 24, 24),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        const Color(0xFF2563EB).withValues(alpha: 0.1),
                        const Color(0xFF2563EB).withValues(alpha: 0.05),
                      ],
                    ),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: const Color(0xFF2563EB),
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF2563EB).withValues(alpha: 0.3),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.folder_outlined,
                          color: Colors.white,
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        'projects.title'.tr(),
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.onSurface,
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          letterSpacing: -0.5,
                        ),
                      ),
                    ],
                  ),
                ),
                
                // Project List in Drawer
                Expanded(
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
                    itemCount: _projects.take(5).length,
                    itemBuilder: (context, index) {
                      final project = _projects.take(5).toList()[index];
                      final projectTasks = _tasks.where((task) => task.projectId == project.id).toList();
                      final progress = _calculateProjectProgress(projectTasks);
                      
                      return ListTile(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 0, vertical: 2),
                        leading: CircleAvatar(
                          radius: 14,
                          backgroundColor: _getProjectColor(project.name),
                          child: Text(
                            project.name.isNotEmpty ? project.name[0].toUpperCase() : 'P',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        title: Text(
                          project.name,
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.onSurface,
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                Expanded(
                                  child: LinearProgressIndicator(
                                    value: progress,
                                    backgroundColor: Colors.grey[300],
                                    valueColor: AlwaysStoppedAnimation<Color>(
                                      progress > 0.7 ? Colors.green : 
                                      progress > 0.4 ? Colors.orange : Colors.red,
                                    ),
                                    minHeight: 3,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  '${(progress * 100).toInt()}%',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w500,
                                    color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.7),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'projects.task_count'.tr(args: ['${projectTasks.length}']),
                              style: TextStyle(
                                color: _getStatusColor(project.status),
                                fontSize: 10,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                        onTap: () {
                          Navigator.pop(context);
                          _navigateToProjectDetails(project);
                        },
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
          
          // Enhanced Divider
          Container(
            height: 1,
            margin: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  Colors.transparent,
                  Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.1),
                  Colors.transparent,
                ],
              ),
            ),
          ),
          
          // Tasks Section (Bottom)
          Container(
            constraints: const BoxConstraints(maxHeight: 320),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Enhanced Tasks Header
                Container(
                  padding: const EdgeInsets.fromLTRB(24, 20, 24, 16),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(
                          Icons.task_outlined,
                          color: Color(0xFF10B981),
                          size: 18,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'projects.my_tasks'.tr(),
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.onSurface,
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            letterSpacing: -0.5,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          '${_myTasks.length}',
                          style: const TextStyle(
                            color: Color(0xFF10B981),
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // Tasks List - Shows only tasks assigned to current user
                Expanded(
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    itemCount: _myTasks.take(10).length,
                    itemBuilder: (context, index) {
                      final task = _myTasks.take(10).toList()[index];
                      final taskProject = _projects.firstWhere(
                        (project) => project.id == task.projectId,
                        orElse: () => Project(
                          id: '',
                          workspaceId: '',
                          name: 'projects.unknown_project'.tr(),
                          description: '',
                          type: 'unknown',
                          status: 'unknown',
                          createdAt: DateTime.now(),
                          updatedAt: DateTime.now(),
                        ),
                      );
                      
                      final isCompleted = task.completedAt != null;

                      return ListTile(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 0, vertical: 2),
                        leading: GestureDetector(
                          onTap: () => _toggleTaskCompletion(task),
                          child: Container(
                            width: 28,
                            height: 28,
                            decoration: BoxDecoration(
                              color: isCompleted
                                  ? Colors.green.withValues(alpha: 0.1)
                                  : _getTaskStatusColor(task.status).withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(
                                color: isCompleted ? Colors.green : _getTaskStatusColor(task.status),
                                width: isCompleted ? 0 : 1.5,
                              ),
                            ),
                            child: isCompleted
                                ? const Icon(
                                    Icons.check_circle,
                                    color: Colors.green,
                                    size: 16,
                                  )
                                : Icon(
                                    Icons.radio_button_unchecked,
                                    color: _getTaskStatusColor(task.status),
                                    size: 14,
                                  ),
                          ),
                        ),
                        title: Text(
                          task.title,
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.onSurface,
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                            decoration: isCompleted
                                ? TextDecoration.lineThrough
                                : null,
                            decorationColor: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              task.status.toUpperCase(),
                              style: TextStyle(
                                color: _getTaskStatusColor(task.status),
                                fontSize: 10,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            Text(
                              taskProject.name,
                              style: TextStyle(
                                color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
                                fontSize: 9,
                                fontWeight: FontWeight.w400,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                        onTap: () {
                          Navigator.pop(context);
                          _navigateToTaskDetails(task);
                        },
                      );
                    },
                  ),
                ),
                
                const SizedBox(height: 16),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Color _getTaskStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'todo':
        return Colors.blue;
      case 'in_progress':
        return Colors.orange;
      case 'done':
        return Colors.green;
      case 'in_review':
        return Colors.purple;
      case 'testing':
        return Colors.teal;
      case 'cancelled':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  IconData _getTaskStatusIcon(String status) {
    switch (status.toLowerCase()) {
      case 'todo':
        return Icons.radio_button_unchecked;
      case 'in_progress':
        return Icons.pending_actions;
      case 'done':
        return Icons.check_circle;
      case 'in_review':
        return Icons.rate_review;
      case 'testing':
        return Icons.science;
      case 'cancelled':
        return Icons.cancel;
      default:
        return Icons.task;
    }
  }

  Widget _buildBody() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Search and Filter Row
          _buildSearchAndFilter(),
          const SizedBox(height: 16),
          
          // Stats Cards Row
          _buildStatsCards(),
          const SizedBox(height: 24),
          
          // Overall Completion Rate
          _buildOverallCompletionRate(),
          const SizedBox(height: 24),
          
          // All Projects Section
          _buildAllProjectsSection(),
        ],
      ),
    );
  }

  Widget _buildStatsCards() {
    return SizedBox(
      height: 100,
      child: Row(
        children: [
          Expanded(
            child: _buildStatCard(
              'projects.active_projects'.tr(),
              _projects.where((p) => p.status == 'active').length.toString(),
              Icons.folder_open_rounded,
              const Color(0xFF2563EB),
              onTap: () {
                // Navigate to Project Overview screen
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (context) => const ProjectOverviewScreen(),
                  ),
                );
              },
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _buildStatCard(
              'tasks.in_progress'.tr(),
              _inProgressTasks.length.toString(),
              Icons.timelapse_rounded,
              const Color(0xFFF59E0B),
              onTap: () {
                // Show in-progress tasks in a bottom sheet
                _showTasksBottomSheet(
                  'projects.in_progress_tasks'.tr(),
                  _inProgressTasks,
                  const Color(0xFFF59E0B),
                );
              },
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _buildStatCard(
              'tasks.overdue'.tr(),
              _overdueTasks.length.toString(),
              Icons.warning_amber_rounded,
              const Color(0xFFEF4444),
              onTap: () {
                // Show overdue tasks in a bottom sheet
                _showTasksBottomSheet(
                  'projects.overdue_tasks'.tr(),
                  _overdueTasks,
                  const Color(0xFFEF4444),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  void _showTasksBottomSheet(String title, List<Task> tasks, Color color) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        minChildSize: 0.3,
        maxChildSize: 0.9,
        builder: (context, scrollController) => Container(
          decoration: BoxDecoration(
            color: Theme.of(context).scaffoldBackgroundColor,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              // Handle bar
              Container(
                margin: const EdgeInsets.only(top: 12),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[400],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              // Header
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(
                        title.contains('Overdue')
                            ? Icons.warning_amber_rounded
                            : Icons.timelapse_rounded,
                        color: color,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      title,
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '${tasks.length}',
                        style: TextStyle(
                          color: color,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),
              // Task list
              Expanded(
                child: tasks.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.check_circle_outline,
                              size: 64,
                              color: Colors.grey[400],
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'projects.no_tasks_found'.tr(),
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                color: Colors.grey[600],
                              ),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        controller: scrollController,
                        padding: const EdgeInsets.all(16),
                        itemCount: tasks.length,
                        itemBuilder: (context, index) {
                          final task = tasks[index];
                          final taskProject = _projects.firstWhere(
                            (p) => p.id == task.projectId,
                            orElse: () => Project(
                              id: '',
                              workspaceId: '',
                              name: 'projects.unknown_project'.tr(),
                              createdAt: DateTime.now(),
                              updatedAt: DateTime.now(),
                            ),
                          );

                          return Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: ListTile(
                              onTap: () {
                                Navigator.pop(context);
                                _navigateToTaskDetails(task);
                              },
                              leading: Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: color.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Icon(
                                  Icons.task_alt,
                                  color: color,
                                  size: 20,
                                ),
                              ),
                              title: Text(
                                task.title,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    taskProject.name,
                                    style: TextStyle(
                                      color: Colors.grey[600],
                                      fontSize: 12,
                                    ),
                                  ),
                                  if (task.dueDate != null)
                                    Text(
                                      'projects.due'.tr(args: [_formatDate(task.dueDate!)]),
                                      style: TextStyle(
                                        color: task.dueDate!.isBefore(DateTime.now())
                                            ? Colors.red
                                            : Colors.grey[600],
                                        fontSize: 11,
                                        fontWeight: task.dueDate!.isBefore(DateTime.now())
                                            ? FontWeight.w600
                                            : FontWeight.normal,
                                      ),
                                    ),
                                ],
                              ),
                              trailing: const Icon(
                                Icons.chevron_right,
                                color: Colors.grey,
                              ),
                            ),
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color, {VoidCallback? onTap}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              color.withValues(alpha: 0.05),
              color.withValues(alpha: 0.02),
            ],
          ),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: color.withValues(alpha: 0.1),
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    icon,
                    color: color,
                    size: 16,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    alignment: Alignment.centerLeft,
                    child: Text(
                      value,
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                        color: Theme.of(context).colorScheme.onSurface,
                        letterSpacing: -0.5,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              title,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w500,
                color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.7),
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSearchAndFilter() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header - Results counter only
        if (_searchQuery.isNotEmpty || _selectedFilter != 'All types')
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Row(
              children: [
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFF2563EB).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    'projects.found_count'.tr(args: ['${_filteredProjects.length}']),
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFF2563EB),
                    ),
                  ),
                ),
              ],
            ),
          ),
        
        // Search and Filter Row
        Row(
          children: [
            // Enhanced Search Field
            Expanded(
              flex: 3,
              child: Container(
                decoration: BoxDecoration(
                  color: Theme.of(context).cardColor,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: _searchQuery.isNotEmpty 
                        ? const Color(0xFF2563EB).withValues(alpha: 0.3)
                        : Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.1),
                    width: 1.5,
                  ),
                ),
                child: TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'projects.search_placeholder'.tr(),
                    hintStyle: TextStyle(
                      color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
                      fontSize: 14,
                    ),
                    prefixIcon: Icon(
                      Icons.search_rounded,
                      color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6),
                      size: 20,
                    ),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: Icon(
                              Icons.clear_rounded,
                              color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6),
                              size: 18,
                            ),
                            onPressed: () {
                              _searchController.clear();
                              setState(() {
                                _searchQuery = '';
                              });
                            },
                          )
                        : null,
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  ),
                  style: TextStyle(
                    fontSize: 14,
                    color: Theme.of(context).colorScheme.onSurface,
                  ),
                  onChanged: (value) {
                    setState(() {
                      _searchQuery = value;
                    });
                  },
                ),
              ),
            ),
            
            const SizedBox(width: 12),
            
            // Enhanced Filter Dropdown
            Expanded(
              flex: 2,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                decoration: BoxDecoration(
                  color: Theme.of(context).cardColor,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: _selectedFilter != 'All types'
                        ? const Color(0xFF2563EB).withValues(alpha: 0.3)
                        : Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.1),
                    width: 1.5,
                  ),
                ),
                child: DropdownButton<String>(
                  value: _selectedFilter,
                  isExpanded: true,
                  icon: Icon(
                    Icons.keyboard_arrow_down_rounded,
                    color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6),
                  ),
                  underline: const SizedBox(),
                  style: TextStyle(
                    fontSize: 14,
                    color: Theme.of(context).colorScheme.onSurface,
                    fontWeight: FontWeight.w500,
                  ),
                  items: _filterOptions.map((filter) {
                    return DropdownMenuItem(
                      value: filter,
                      child: Row(
                        children: [
                          Icon(
                            _getFilterIcon(filter),
                            size: 16,
                            color: filter == _selectedFilter
                                ? const Color(0xFF2563EB)
                                : Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _getFilterDisplayName(filter),
                              style: TextStyle(
                                color: filter == _selectedFilter
                                    ? const Color(0xFF2563EB)
                                    : Theme.of(context).colorScheme.onSurface,
                                fontWeight: filter == _selectedFilter
                                    ? FontWeight.w600
                                    : FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                  onChanged: (value) {
                    setState(() {
                      _selectedFilter = value!;
                    });
                  },
                ),
              ),
            ),
          ],
        ),
        
        // Quick Actions / Clear Filters
        if (_searchQuery.isNotEmpty || _selectedFilter != 'All types') ...[
          const SizedBox(height: 12),
          Row(
            children: [
              TextButton.icon(
                onPressed: () {
                  _searchController.clear();
                  setState(() {
                    _searchQuery = '';
                    _selectedFilter = 'All types';
                  });
                },
                icon: const Icon(
                  Icons.clear_all_rounded,
                  size: 16,
                  color: Color(0xFF2563EB),
                ),
                label: Text(
                  'projects.clear_filters'.tr(),
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF2563EB),
                  ),
                ),
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  backgroundColor: const Color(0xFF2563EB).withValues(alpha: 0.1),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }

  IconData _getFilterIcon(String filter) {
    switch (filter.toLowerCase()) {
      case 'all types':
        return Icons.apps_rounded;
      case 'kanban':
        return Icons.view_kanban_rounded;
      case 'scrum':
        return Icons.directions_run_rounded;
      case 'bug_tracking':
        return Icons.bug_report_rounded;
      case 'feature':
        return Icons.star_rounded;
      case 'research':
        return Icons.science_rounded;
      default:
        return Icons.folder_rounded;
    }
  }

  String _getFilterDisplayName(String filter) {
    switch (filter.toLowerCase()) {
      case 'all types':
        return 'projects.filter_all_types'.tr();
      case 'kanban':
        return 'projects.filter_kanban'.tr();
      case 'scrum':
        return 'projects.filter_scrum'.tr();
      case 'bug_tracking':
        return 'projects.filter_bug_tracking'.tr();
      case 'feature':
        return 'projects.filter_feature'.tr();
      case 'research':
        return 'projects.filter_research'.tr();
      default:
        return filter;
    }
  }

  Widget _buildOverallCompletionRate() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
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
          Text(
            'projects.overall_completion_rate'.tr(),
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: LinearProgressIndicator(
                  value: _overallCompletionRate,
                  backgroundColor: Colors.grey[300],
                  valueColor: AlwaysStoppedAnimation<Color>(
                    _overallCompletionRate > 0.7 ? Colors.green : 
                    _overallCompletionRate > 0.4 ? Colors.orange : Colors.red,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Text(
                '${(_overallCompletionRate * 100).toInt()}%',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAllProjectsSection() {
    final filteredProjects = _filteredProjects;
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              'projects.all_projects'.tr(),
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const Spacer(),
            Text(
              'projects.project_count'.tr(args: ['${filteredProjects.length}']),
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Colors.grey[600],
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        
        
        // Projects List
        if (filteredProjects.isEmpty)
          Center(
            child: Column(
              children: [
                const SizedBox(height: 32),
                Icon(Icons.folder_outlined, size: 64, color: Colors.grey[400]),
                const SizedBox(height: 16),
                Text(
                  'projects.no_projects_found'.tr(),
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                Text(
                  'projects.try_adjusting_search'.tr(),
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
          )
        else
          ...filteredProjects.map((project) => _buildProjectCard(project)),
      ],
    );
  }

  Widget _buildProjectCard(Project project) {
    final projectTasks = _tasks.where((task) => task.projectId == project.id).toList();
    final progress = _calculateProjectProgress(projectTasks);
    
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () => _navigateToProjectDetails(project),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: _getProjectColor(project.name),
                  child: Text(
                    project.name.isNotEmpty ? project.name[0].toUpperCase() : 'P',
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
                        project.name,
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 16,
                        ),
                      ),
                      if (project.description != null && project.description!.isNotEmpty)
                        Html(
                          data: project.description!,
                          style: {
                            "body": Style(
                              color: Colors.grey[600],
                              fontSize: FontSize(13),
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
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: _getStatusColor(project.status).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: _getStatusColor(project.status).withValues(alpha: 0.3),
                    ),
                  ),
                  child: Text(
                    'projects.status_${project.status}'.tr().toUpperCase(),
                    style: TextStyle(
                      fontSize: 12,
                      color: _getStatusColor(project.status),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                const SizedBox(width: 4),
                PopupMenuButton<String>(
                  icon: Icon(Icons.more_vert, size: 20, color: Colors.grey[600]),
                  padding: EdgeInsets.zero,
                  tooltip: 'common.more_options'.tr(),
                  onSelected: (value) {
                    switch (value) {
                      case 'assign_bot':
                        _showAssignBotDialog(project);
                        break;
                      case 'view_details':
                        _navigateToProjectDetails(project);
                        break;
                    }
                  },
                  itemBuilder: (context) => [
                    PopupMenuItem<String>(
                      value: 'view_details',
                      child: Row(
                        children: [
                          const Icon(Icons.visibility_outlined, size: 20),
                          const SizedBox(width: 12),
                          Text('projects.view_details'.tr()),
                        ],
                      ),
                    ),
                    PopupMenuItem<String>(
                      value: 'assign_bot',
                      child: Row(
                        children: [
                          const Icon(Icons.smart_toy_outlined, size: 20),
                          const SizedBox(width: 12),
                          Text('projects.assign_bot'.tr()),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Progress bar
            Row(
              children: [
                Expanded(
                  child: LinearProgressIndicator(
                    value: progress,
                    backgroundColor: Colors.grey[300],
                    valueColor: AlwaysStoppedAnimation<Color>(
                      progress > 0.7 ? Colors.green : 
                      progress > 0.4 ? Colors.orange : Colors.red,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  '${(progress * 100).toInt()}%',
                  style: const TextStyle(
                    fontWeight: FontWeight.w500,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            
            // Project info row
            Row(
              children: [
                Icon(Icons.assignment, size: 16, color: Colors.grey[600]),
                const SizedBox(width: 4),
                Text(
                  'projects.task_count'.tr(args: ['${projectTasks.length}']),
                  style: TextStyle(
                    color: Colors.grey[600],
                    fontSize: 12,
                  ),
                ),
                const SizedBox(width: 16),
                Icon(Icons.people, size: 16, color: Colors.grey[600]),
                const SizedBox(width: 4),
                Text(
                  'projects.team_project'.tr(), // TODO: Get actual member count
                  style: TextStyle(
                    color: Colors.grey[600],
                    fontSize: 12,
                  ),
                ),
                const Spacer(),
                Text(
                  'projects.created'.tr(args: [_formatDate(project.createdAt)]),
                  style: TextStyle(
                    color: Colors.grey[500],
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ],
        ),
        ),
      ),
    );
  }

  Color _getProjectColor(String projectName) {
    final colors = [
      Colors.blue, Colors.green, Colors.orange, Colors.purple,
      Colors.red, Colors.teal, Colors.indigo, Colors.pink,
    ];
    return colors[projectName.hashCode % colors.length];
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
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