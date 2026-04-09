import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../models/project.dart';
import '../services/project_service.dart';
import '../services/analytics_service.dart';
import '../config/app_config.dart';
import 'project_details_screen.dart';
import 'create_project_screen.dart';
import 'ai_project_assistant.dart';
import '../widgets/ai_button.dart';
import '../tools/templates/template_gallery_screen.dart';
import '../api/services/bot_api_service.dart';

class ProjectsScreen extends StatefulWidget {
  const ProjectsScreen({super.key});

  @override
  State<ProjectsScreen> createState() => _ProjectsScreenState();
}

class _ProjectsScreenState extends State<ProjectsScreen> {
  final ProjectService _projectService = ProjectService.instance;
  final BotApiService _botApi = BotApiService();
  List<Project> _projects = [];
  Map<String, double> _projectProgress = {}; // Map of projectId to progress
  Map<String, int> _projectTaskCounts = {}; // Map of projectId to total task count
  bool _isLoading = true;
  bool _isLoadingAnalytics = false; // Separate loading state for analytics
  String? _error;

  @override
  void initState() {
    super.initState();
    AnalyticsService.instance.logScreenView(screenName: 'ProjectsScreen');
    _loadProjects();
  }

  Future<void> _loadProjects() async {
    try {
      setState(() {
        _isLoading = true;
        _error = null;
      });

      final projects = await _projectService.getProjects(
        workspaceId: await AppConfig.getCurrentWorkspaceId(),
      );

      // PROGRESSIVE LOADING: Show projects immediately, load analytics in background
      // This makes the UI appear much faster
      setState(() {
        _projects = projects;
        _isLoading = false;
        _isLoadingAnalytics = projects.isNotEmpty;
      });

      // Load analytics in background (don't block UI)
      if (projects.isNotEmpty) {
        _loadAnalyticsInBackground(projects);
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  /// Load analytics for all projects in background
  /// Updates UI progressively as each analytics result arrives
  Future<void> _loadAnalyticsInBackground(List<Project> projects) async {
    final progressMap = <String, double>{};
    final taskCountsMap = <String, int>{};

    // Create futures for all analytics calls
    final analyticsFutures = projects.map((project) =>
      _projectService.getProjectAnalytics(project.id)
        .then((analytics) => {'projectId': project.id, 'analytics': analytics})
        .catchError((e) => {'projectId': project.id, 'analytics': <String, dynamic>{}})
    ).toList();

    // Process results as they complete (progressive update)
    for (final future in analyticsFutures) {
      try {
        final result = await future;
        final projectId = result['projectId'] as String;
        final analytics = result['analytics'] as Map<String, dynamic>;

        final totalTasks = analytics['total_tasks'] as int? ?? 0;
        final progressValue = analytics['progress'];
        double progress = 0.0;
        if (progressValue is double) {
          progress = progressValue;
        } else if (progressValue is int) {
          progress = progressValue.toDouble();
        } else if (progressValue is num) {
          progress = progressValue.toDouble();
        }

        taskCountsMap[projectId] = totalTasks;
        progressMap[projectId] = progress;

        // Update UI progressively as each result arrives
        if (mounted) {
          setState(() {
            _projectProgress = Map.from(progressMap);
            _projectTaskCounts = Map.from(taskCountsMap);
          });
        }
      } catch (e) {
        // Ignore individual errors, continue loading others
      }
    }

    // Mark analytics loading as complete
    if (mounted) {
      setState(() {
        _isLoadingAnalytics = false;
      });
    }
  }

  Future<void> _navigateToCreateProject() async {
    final result = await Navigator.of(context).push<Project>(
      MaterialPageRoute(
        builder: (context) => const CreateProjectScreen(),
      ),
    );

    // If a project was created (result is not null), reload the projects list
    if (result != null) {
      _loadProjects();
    }
  }

  Future<void> _navigateToProjectDetails(Project project) async {
    final result = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (context) => ProjectDetailsScreen(project: project),
      ),
    );

    // If the project was deleted (result == true), reload the projects list
    if (result == true) {
      _loadProjects();
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
      // Fetch all workspace bots (same pattern as calendar screen)
      final botsResponse = await _botApi.getBots(workspaceId);

      // Also fetch currently assigned bots to show "Already Assigned" badge
      final assignedBotsResponse = await _botApi.getProjectBots(workspaceId, project.id);

      if (!mounted) return;
      Navigator.pop(context); // Close loading dialog

      if (!botsResponse.isSuccess) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(botsResponse.message ?? 'projects.failed_to_load_bots'.tr())),
        );
        return;
      }

      // Filter to only show active bots (same as calendar screen)
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

      // Convert Bot objects to Map for dialog (with isAssigned status)
      final botsWithStatus = activeBots.map((bot) => {
        'id': bot.id,
        'name': bot.name,
        'displayName': bot.displayName ?? bot.name,
        'description': bot.description ?? '',
        'isAssigned': assignedBotIds.contains(bot.id),
      }).toList();

      // Show bot selection dialog
      await showDialog(
        context: context,
        builder: (dialogContext) => _BotAssignmentDialog(
          projectName: project.name,
          availableBots: botsWithStatus,
          onAssign: (botId) async {
            final result = await _botApi.assignBotToProject(
              workspaceId,
              botId,
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
        ),
      );
    } catch (e) {
      if (mounted) {
        Navigator.pop(context); // Close loading dialog
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('projects.failed_to_load_bots'.tr())),
        );
      }
    }
  }

  Color _getProjectColor(int index) {
    final colors = [
      Colors.blue,
      Colors.green,
      Colors.orange,
      Colors.purple,
      Colors.red,
      Colors.teal,
      Colors.indigo,
      Colors.pink,
    ];
    return colors[index % colors.length];
  }

  String _getStatusDisplayText(String status) {
    switch (status.toLowerCase()) {
      case 'active':
        return 'projects.status_active'.tr();
      case 'completed':
        return 'projects.status_completed'.tr();
      case 'paused':
        return 'projects.status_paused'.tr();
      case 'cancelled':
        return 'projects.status_cancelled'.tr();
      default:
        return status;
    }
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text('projects.title'.tr()),
        centerTitle: true,
        actions: [
          // AI Assistant button
          AIButton(
            onPressed: () => showAIProjectAssistant(
              context: context,
              onProjectsChanged: _loadProjects,
            ),
            tooltip: 'projects.ai_assistant'.tr(),
          ),
          // Add project button
          IconButton(
            icon: const Icon(Icons.add),
            tooltip: 'projects.create_project'.tr(),
            onPressed: _navigateToCreateProject,
          ),
          // 3-dot menu
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert),
            tooltip: 'common.more_options'.tr(),
            onSelected: (value) async {
              switch (value) {
                case 'templates':
                  final result = await Navigator.push<Project>(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const TemplateGalleryScreen(),
                    ),
                  );
                  if (result != null) {
                    _loadProjects();
                  }
                  break;
                case 'refresh':
                  _loadProjects();
                  break;
              }
            },
            itemBuilder: (context) => [
              PopupMenuItem<String>(
                value: 'templates',
                child: Row(
                  children: [
                    const Icon(Icons.dashboard_customize_outlined),
                    const SizedBox(width: 12),
                    Text('projects.templates'.tr()),
                  ],
                ),
              ),
              PopupMenuItem<String>(
                value: 'refresh',
                child: Row(
                  children: [
                    const Icon(Icons.refresh),
                    const SizedBox(width: 12),
                    Text('common.refresh'.tr()),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadProjects,
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('projects.loading_projects'.tr()),
          ],
        ),
      );
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 64,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              'projects.failed_to_load'.tr(),
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              _error!,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Colors.grey[600],
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: _loadProjects,
              icon: const Icon(Icons.refresh),
              label: Text('common.retry'.tr()),
            ),
          ],
        ),
      );
    }

    if (_projects.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.folder_outlined,
              size: 64,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              'projects.no_projects_yet'.tr(),
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'projects.create_first_project'.tr(),
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Colors.grey[600],
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: _navigateToCreateProject,
              icon: const Icon(Icons.add),
              label: Text('projects.create_project'.tr()),
            ),
          ],
        ),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // All Projects Section Header
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
                'projects.project_count'.tr(args: ['${_projects.length}']),
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.grey[600],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          
          // Projects List
          ..._projects.asMap().entries.map((entry) {
            final index = entry.key;
            final project = entry.value;
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _buildProjectCard(project, index),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildProjectCard(Project project, int index) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        leading: CircleAvatar(
          backgroundColor: _getProjectColor(index),
          child: Text(
            project.name.isNotEmpty ? project.name[0].toUpperCase() : 'P',
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        title: Row(
          children: [
            Expanded(
              child: Text(
                project.name,
                style: const TextStyle(fontWeight: FontWeight.w600),
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
                _getStatusDisplayText(project.status),
                style: TextStyle(
                  fontSize: 12,
                  color: _getStatusColor(project.status),
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (project.description != null && project.description!.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                project.description!,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: Colors.grey[600],
                  fontSize: 13,
                ),
              ),
            ],
            const SizedBox(height: 8),
            Wrap(
              spacing: 12,
              runSpacing: 4,
              children: [
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.assignment, size: 16, color: Colors.grey[600]),
                    const SizedBox(width: 4),
                    Text(
                      'projects.kanban_project'.tr(),
                      style: TextStyle(
                        color: Colors.grey[600],
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.task_alt, size: 16, color: Colors.grey[600]),
                    const SizedBox(width: 4),
                    Text(
                      'projects.task_count'.tr(args: ['${_projectTaskCounts[project.id] ?? 0}']),
                      style: TextStyle(
                        color: Colors.grey[600],
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
                if (project.priority != null)
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.flag, size: 16, color: Colors.grey[600]),
                      const SizedBox(width: 4),
                      Text(
                        project.priority!,
                        style: TextStyle(
                          color: Colors.grey[600],
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
              ],
            ),
            if (project.startDate != null || project.endDate != null) ...[
              const SizedBox(height: 4),
              Row(
                children: [
                  Icon(Icons.schedule, size: 16, color: Colors.grey[600]),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      project.endDate != null
                          ? 'projects.due'.tr(args: ['${project.endDate}'])
                          : 'projects.started'.tr(args: ['${project.startDate}']),
                      style: TextStyle(
                        color: Colors.grey[600],
                        fontSize: 12,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 8),
            // Progress Bar
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      'projects.progress'.tr(),
                      style: TextStyle(
                        color: Colors.grey[600],
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const Spacer(),
                    // Show loading indicator or percentage
                    if (!_projectProgress.containsKey(project.id) && _isLoadingAnalytics)
                      SizedBox(
                        width: 12,
                        height: 12,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.grey[400]!),
                        ),
                      )
                    else
                      Text(
                        '${((_projectProgress[project.id] ?? 0.0) * 100).toInt()}%',
                        style: TextStyle(
                          color: Colors.grey[600],
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 4),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  // Show indeterminate progress while loading, determinate when loaded
                  child: !_projectProgress.containsKey(project.id) && _isLoadingAnalytics
                    ? LinearProgressIndicator(
                        backgroundColor: Colors.grey[200],
                        valueColor: AlwaysStoppedAnimation<Color>(
                          _getProjectColor(index).withValues(alpha: 0.5),
                        ),
                        minHeight: 6,
                      )
                    : LinearProgressIndicator(
                        value: _projectProgress[project.id] ?? 0.0,
                        backgroundColor: Colors.grey[200],
                        valueColor: AlwaysStoppedAnimation<Color>(
                          _getProjectColor(index),
                        ),
                        minHeight: 6,
                      ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'projects.created'.tr(args: [_formatDate(project.createdAt)]),
              style: TextStyle(
                color: Colors.grey[500],
                fontSize: 11,
              ),
            ),
          ],
        ),
        trailing: PopupMenuButton<String>(
          icon: const Icon(Icons.more_vert, size: 20),
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
        onTap: () => _navigateToProjectDetails(project),
      ),
    );
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

/// Dialog for assigning bots to a project (matches frontend pattern)
class _BotAssignmentDialog extends StatefulWidget {
  final String projectName;
  final List<Map<String, dynamic>> availableBots;
  final Future<void> Function(String botId) onAssign;

  const _BotAssignmentDialog({
    required this.projectName,
    required this.availableBots,
    required this.onAssign,
  });

  @override
  State<_BotAssignmentDialog> createState() => _BotAssignmentDialogState();
}

class _BotAssignmentDialogState extends State<_BotAssignmentDialog> {
  String? _loadingBotId;

  Future<void> _handleAssign(String botId) async {
    if (_loadingBotId != null) return;

    setState(() {
      _loadingBotId = botId;
    });

    try {
      await widget.onAssign(botId);
    } finally {
      if (mounted) {
        setState(() {
          _loadingBotId = null;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text('projects.assign_ai_assistant'.tr()),
      content: SizedBox(
        width: double.maxFinite,
        child: widget.availableBots.isEmpty
            ? Padding(
                padding: const EdgeInsets.symmetric(vertical: 24),
                child: Center(
                  child: Text(
                    'projects.no_activated_bots'.tr(),
                    style: TextStyle(color: Colors.grey[600]),
                  ),
                ),
              )
            : ListView.builder(
                shrinkWrap: true,
                itemCount: widget.availableBots.length,
                itemBuilder: (context, index) {
                  final botData = widget.availableBots[index];
                  final botId = botData['id']?.toString() ?? '';
                  // Frontend uses displayName, fallback to name
                  final botName = botData['displayName']?.toString() ??
                                  botData['name']?.toString() ??
                                  'Unknown Bot';
                  final botDescription = botData['description']?.toString() ?? '';
                  // isAssigned comes from the API response
                  final isAssigned = botData['isAssigned'] == true;
                  final isLoading = _loadingBotId == botId;

                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Row(
                        children: [
                          // Bot Avatar
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
                          // Bot Info
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        botName,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w600,
                                          fontSize: 14,
                                        ),
                                      ),
                                    ),
                                    if (isAssigned)
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                          vertical: 2,
                                        ),
                                        decoration: BoxDecoration(
                                          color: Colors.green.withValues(alpha: 0.1),
                                          borderRadius: BorderRadius.circular(12),
                                          border: Border.all(
                                            color: Colors.green.withValues(alpha: 0.3),
                                          ),
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
                                if (botDescription.isNotEmpty) ...[
                                  const SizedBox(height: 4),
                                  Text(
                                    botDescription,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: Colors.grey[600],
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                          const SizedBox(width: 12),
                          // Assign Button
                          SizedBox(
                            width: 80,
                            child: isLoading
                                ? const Center(
                                    child: SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(strokeWidth: 2),
                                    ),
                                  )
                                : ElevatedButton(
                                    onPressed: isAssigned ? null : () => _handleAssign(botId),
                                    style: ElevatedButton.styleFrom(
                                      padding: const EdgeInsets.symmetric(horizontal: 12),
                                      minimumSize: const Size(0, 32),
                                    ),
                                    child: Text(
                                      'projects.assign'.tr(),
                                      style: const TextStyle(fontSize: 12),
                                    ),
                                  ),
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
          onPressed: () => Navigator.pop(context),
          child: Text('common.cancel'.tr()),
        ),
      ],
    );
  }
}