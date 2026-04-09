import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:fl_chart/fl_chart.dart';
import 'project_model.dart';
import 'project_service.dart';

class SprintManagementScreen extends StatefulWidget {
  final String projectId;
  
  const SprintManagementScreen({
    super.key,
    required this.projectId,
  });

  @override
  State<SprintManagementScreen> createState() => _SprintManagementScreenState();
}

class _SprintManagementScreenState extends State<SprintManagementScreen> 
    with SingleTickerProviderStateMixin {
  final ProjectService _projectService = ProjectService();
  late TabController _tabController;
  
  Project? _project;
  List<Sprint> _sprints = [];
  List<Task> _allTasks = [];
  Sprint? _activeSprint;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    
    try {
      final project = await _projectService.getProjectById(widget.projectId);
      final sprints = await _projectService.getProjectSprints(widget.projectId);
      final tasks = await _projectService.getTasksForProject(widget.projectId);
      final activeSprint = await _projectService.getActiveSprint(widget.projectId);
      
      setState(() {
        _project = project;
        _sprints = sprints..sort((a, b) => b.createdAt.compareTo(a.createdAt));
        _allTasks = tasks;
        _activeSprint = activeSprint;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('sprints.error_loading_data'.tr(args: [e.toString()]))),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('${_project?.name ?? 'projects.title'.tr()} - ${'sprints.title'.tr()}'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(icon: const Icon(Icons.list), text: 'sprints.all_sprints'.tr()),
            Tab(icon: const Icon(Icons.play_circle), text: 'sprints.active_sprint'.tr()),
            Tab(icon: const Icon(Icons.analytics), text: 'sprints.sprint_analytics'.tr()),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _buildAllSprintsTab(),
                _buildActiveSprintTab(),
                _buildSprintAnalyticsTab(),
              ],
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showCreateSprintDialog,
        icon: const Icon(Icons.add),
        label: Text('sprints.create_sprint'.tr()),
      ),
    );
  }

  Widget _buildAllSprintsTab() {
    if (_sprints.isEmpty) {
      return _buildEmptyState(
        'sprints.no_sprints_yet'.tr(),
        'sprints.create_first_sprint'.tr(),
        Icons.sprint,
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16.0),
      itemCount: _sprints.length,
      separatorBuilder: (context, index) => const SizedBox(height: 12),
      itemBuilder: (context, index) => _buildSprintCard(_sprints[index]),
    );
  }

  Widget _buildActiveSprintTab() {
    if (_activeSprint == null) {
      return _buildEmptyState(
        'sprints.no_active_sprint'.tr(),
        'sprints.start_sprint_desc'.tr(),
        Icons.play_circle_outline,
      );
    }

    final sprintTasks = _allTasks.where((task) => 
      task.sprintId == _activeSprint!.id).toList();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Sprint Overview Card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8.0,
                          vertical: 4.0,
                        ),
                        decoration: BoxDecoration(
                          color: _getSprintStatusColor(_activeSprint!.status),
                          borderRadius: BorderRadius.circular(4.0),
                        ),
                        child: Text(
                          _getTranslatedSprintStatusName(_activeSprint!.status).toUpperCase(),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12.0,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const Spacer(),
                      PopupMenuButton<String>(
                        onSelected: (action) => _handleSprintAction(_activeSprint!, action),
                        itemBuilder: (context) => [
                          PopupMenuItem(
                            value: 'edit',
                            child: Row(
                              children: [
                                const Icon(Icons.edit, size: 16),
                                const SizedBox(width: 8),
                                Text('sprints.edit_sprint'.tr()),
                              ],
                            ),
                          ),
                          if (_activeSprint!.status == SprintStatus.active)
                            PopupMenuItem(
                              value: 'complete',
                              child: Row(
                                children: [
                                  const Icon(Icons.check_circle, size: 16),
                                  const SizedBox(width: 8),
                                  Text('sprints.complete_sprint'.tr()),
                                ],
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: 16),
                  
                  Text(
                    _activeSprint!.name,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  
                  if (_activeSprint!.goal != null && 
                      _activeSprint!.goal!.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      _activeSprint!.goal!,
                      style: TextStyle(
                        color: Colors.grey[600],
                        fontSize: 16,
                      ),
                    ),
                  ],
                  
                  const SizedBox(height: 16),
                  
                  Row(
                    children: [
                      Expanded(
                        child: _buildSprintStat(
                          'sprints.start_date'.tr(),
                          DateFormat('MMM dd, yyyy').format(_activeSprint!.startDate),
                          Icons.play_arrow,
                        ),
                      ),
                      Expanded(
                        child: _buildSprintStat(
                          'sprints.end_date'.tr(),
                          DateFormat('MMM dd, yyyy').format(_activeSprint!.endDate),
                          Icons.flag,
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 8),

                  Row(
                    children: [
                      Expanded(
                        child: _buildSprintStat(
                          'sprints.days_remaining'.tr(),
                          '${_activeSprint!.endDate.difference(DateTime.now()).inDays}',
                          Icons.schedule,
                        ),
                      ),
                      Expanded(
                        child: _buildSprintStat(
                          'sprints.total_tasks'.tr(),
                          '${sprintTasks.length}',
                          Icons.task,
                        ),
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: 16),
                  
                  // Progress Bar
                  _buildSprintProgress(sprintTasks),
                ],
              ),
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Sprint Tasks
          Row(
            children: [
              Text(
                'sprints.sprint_tasks'.tr(),
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Spacer(),
              TextButton.icon(
                onPressed: () => _showTaskSelectionDialog(),
                icon: const Icon(Icons.add, size: 16),
                label: Text('sprints.add_tasks'.tr()),
              ),
            ],
          ),
          
          const SizedBox(height: 16),
          
          if (sprintTasks.isEmpty) ...[
            Card(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  children: [
                    Icon(
                      Icons.inbox,
                      size: 48,
                      color: Colors.grey[400],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'sprints.no_tasks_in_sprint'.tr(),
                      style: TextStyle(
                        fontSize: 16,
                        color: Colors.grey[600],
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'sprints.add_tasks_desc'.tr(),
                      style: TextStyle(
                        color: Colors.grey[500],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ] else ...[
            // Group tasks by status
            ..._groupTasksByStatus(sprintTasks).entries.map((entry) => 
              _buildTaskStatusSection(entry.key, entry.value)),
          ],
        ],
      ),
    );
  }

  Widget _buildSprintAnalyticsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Sprint Burndown Chart
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'sprints.burndown_chart'.tr(),
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      if (_activeSprint != null)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.blue.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            _activeSprint!.name,
                            style: const TextStyle(
                              color: Colors.blue,
                              fontWeight: FontWeight.w500,
                              fontSize: 12,
                            ),
                          ),
                        ),
                    ],
                  ),

                  const SizedBox(height: 8),

                  // Legend
                  Row(
                    children: [
                      _buildLegendItem('sprints.ideal_burndown'.tr(), Colors.grey),
                      const SizedBox(width: 16),
                      _buildLegendItem('sprints.actual_burndown'.tr(), Colors.blue),
                    ],
                  ),

                  const SizedBox(height: 16),

                  _buildBurndownChart(),
                ],
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Sprint Statistics
          Row(
            children: [
              Expanded(
                child: _buildAnalyticsCard(
                  'sprints.completed_sprints'.tr(),
                  '${_sprints.where((s) => s.status == SprintStatus.completed).length}',
                  Icons.check_circle,
                  Colors.green,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildAnalyticsCard(
                  'sprints.average_duration'.tr(),
                  '${_calculateAverageSprintDuration()} ${'sprints.days'.tr()}',
                  Icons.schedule,
                  Colors.blue,
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          Row(
            children: [
              Expanded(
                child: _buildAnalyticsCard(
                  'sprints.total_story_points'.tr(),
                  '${_calculateTotalStoryPoints()}',
                  Icons.star,
                  Colors.orange,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildAnalyticsCard(
                  'sprints.avg_tasks_per_sprint'.tr(),
                  '${_calculateAverageTasksPerSprint()}',
                  Icons.task,
                  Colors.purple,
                ),
              ),
            ],
          ),

          const SizedBox(height: 24),

          // Recent Sprints List
          Text(
            'sprints.recent_sprints'.tr(),
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          
          const SizedBox(height: 16),
          
          ..._sprints.take(5).map((sprint) => Card(
            child: ListTile(
              leading: Container(
                padding: const EdgeInsets.all(8.0),
                decoration: BoxDecoration(
                  color: _getSprintStatusColor(sprint.status).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8.0),
                ),
                child: Icon(
                  _getSprintStatusIcon(sprint.status),
                  color: _getSprintStatusColor(sprint.status),
                ),
              ),
              title: Text(sprint.name),
              subtitle: Text(
                '${DateFormat('MMM dd').format(sprint.startDate)} - '
                '${DateFormat('MMM dd, yyyy').format(sprint.endDate)}',
              ),
              trailing: Text(
                _getTranslatedSprintStatusName(sprint.status),
                style: TextStyle(
                  color: _getSprintStatusColor(sprint.status),
                  fontWeight: FontWeight.bold,
                ),
              ),
              onTap: () => _showSprintDetails(sprint),
            ),
          )),
        ],
      ),
    );
  }

  Widget _buildSprintCard(Sprint sprint) {
    final sprintTasks = _allTasks.where((task) => task.sprintId == sprint.id).toList();
    final completedTasks = sprintTasks.where((task) => 
      task.status == TaskStatus.done || task.status == TaskStatus.completed).length;
    
    return Card(
      elevation: sprint.status == SprintStatus.active ? 4 : 2,
      child: InkWell(
        borderRadius: BorderRadius.circular(8.0),
        onTap: () => _showSprintDetails(sprint),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8.0,
                      vertical: 4.0,
                    ),
                    decoration: BoxDecoration(
                      color: _getSprintStatusColor(sprint.status),
                      borderRadius: BorderRadius.circular(4.0),
                    ),
                    child: Text(
                      _getTranslatedSprintStatusName(sprint.status).toUpperCase(),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10.0,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const Spacer(),
                  PopupMenuButton<String>(
                    onSelected: (action) => _handleSprintAction(sprint, action),
                    itemBuilder: (context) => [
                      PopupMenuItem(
                        value: 'edit',
                        child: Row(
                          children: [
                            const Icon(Icons.edit, size: 16),
                            const SizedBox(width: 8),
                            Text('common.edit'.tr()),
                          ],
                        ),
                      ),
                      if (sprint.status == SprintStatus.planning)
                        PopupMenuItem(
                          value: 'start',
                          child: Row(
                            children: [
                              const Icon(Icons.play_arrow, size: 16),
                              const SizedBox(width: 8),
                              Text('sprints.start_sprint'.tr()),
                            ],
                          ),
                        ),
                      if (sprint.status == SprintStatus.active)
                        PopupMenuItem(
                          value: 'complete',
                          child: Row(
                            children: [
                              const Icon(Icons.check_circle, size: 16),
                              const SizedBox(width: 8),
                              Text('sprints.complete_sprint'.tr()),
                            ],
                          ),
                        ),
                      PopupMenuItem(
                        value: 'delete',
                        child: Row(
                          children: [
                            const Icon(Icons.delete, size: 16, color: Colors.red),
                            const SizedBox(width: 8),
                            Text('common.delete'.tr(), style: const TextStyle(color: Colors.red)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              
              const SizedBox(height: 12),
              
              // Sprint Name
              Text(
                sprint.name,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              
              // Sprint Goal
              if (sprint.goal != null && sprint.goal!.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  sprint.goal!,
                  style: TextStyle(
                    color: Colors.grey[600],
                    fontSize: 14,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
              
              const SizedBox(height: 12),
              
              // Sprint Dates
              Row(
                children: [
                  Icon(Icons.schedule, size: 16, color: Colors.grey[600]),
                  const SizedBox(width: 4),
                  Text(
                    '${DateFormat('MMM dd').format(sprint.startDate)} - '
                    '${DateFormat('MMM dd, yyyy').format(sprint.endDate)}',
                    style: TextStyle(
                      color: Colors.grey[600],
                      fontSize: 12,
                    ),
                  ),
                  const Spacer(),
                  if (sprint.status == SprintStatus.active) ...[
                    const Icon(Icons.timer, size: 16, color: Colors.orange),
                    const SizedBox(width: 4),
                    Text(
                      'sprints.days_left'.tr(args: ['${sprint.endDate.difference(DateTime.now()).inDays}']),
                      style: const TextStyle(
                        color: Colors.orange,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ],
              ),
              
              const SizedBox(height: 12),
              
              // Task Progress
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Tasks: $completedTasks / ${sprintTasks.length}',
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Text(
                              '${sprintTasks.isNotEmpty ? ((completedTasks / sprintTasks.length) * 100).toStringAsFixed(0) : 0}%',
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        LinearProgressIndicator(
                          value: sprintTasks.isNotEmpty ? completedTasks / sprintTasks.length : 0,
                          backgroundColor: Colors.grey[300],
                          valueColor: AlwaysStoppedAnimation<Color>(
                            _getSprintStatusColor(sprint.status),
                          ),
                        ),
                      ],
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

  Widget _buildSprintStat(String label, String value, IconData icon) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 16, color: Colors.grey[600]),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                color: Colors.grey[600],
                fontSize: 12,
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }

  Widget _buildSprintProgress(List<Task> tasks) {
    final completedTasks = tasks.where((task) =>
      task.status == TaskStatus.done || task.status == TaskStatus.completed).length;
    final progress = tasks.isNotEmpty ? completedTasks / tasks.length : 0.0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'sprints.sprint_progress'.tr(),
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(
              '${(progress * 100).toStringAsFixed(0)}%',
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        LinearProgressIndicator(
          value: progress,
          backgroundColor: Colors.grey[300],
          valueColor: AlwaysStoppedAnimation<Color>(
            progress >= 0.8 ? Colors.green :
            progress >= 0.5 ? Colors.orange : Colors.red,
          ),
        ),
      ],
    );
  }

  Widget _buildTaskStatusSection(TaskStatus status, List<Task> tasks) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 8.0),
          child: Row(
            children: [
              Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(
                  color: _getTaskStatusColor(status),
                  borderRadius: BorderRadius.circular(6),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '${_getTranslatedStatusName(status)} (${tasks.length})',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
        ...tasks.map((task) => Card(
          margin: const EdgeInsets.only(bottom: 8.0),
          child: ListTile(
            leading: Container(
              padding: const EdgeInsets.all(6.0),
              decoration: BoxDecoration(
                color: _getTaskTypeColor(task.taskType).withOpacity(0.1),
                borderRadius: BorderRadius.circular(6.0),
              ),
              child: Icon(
                _getTaskTypeIcon(task.taskType),
                size: 16,
                color: _getTaskTypeColor(task.taskType),
              ),
            ),
            title: Text(task.title),
            subtitle: task.assigneeName != null
                ? Text('sprints.assigned_to'.tr(args: [task.assigneeName!]))
                : Text('sprints.unassigned'.tr()),
            trailing: Container(
              padding: const EdgeInsets.symmetric(
                horizontal: 8.0,
                vertical: 4.0,
              ),
              decoration: BoxDecoration(
                color: _getTaskPriorityColor(task.priority),
                borderRadius: BorderRadius.circular(4.0),
              ),
              child: Text(
                _getTranslatedPriorityName(task.priority),
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 10.0,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            onTap: () => _showTaskDetails(task),
          ),
        )),
        const SizedBox(height: 16),
      ],
    );
  }

  Widget _buildAnalyticsCard(
    String title,
    String value,
    IconData icon,
    Color color,
  ) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Icon(icon, size: 32, color: color),
            const SizedBox(height: 8),
            Text(
              value,
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              title,
              style: TextStyle(
                color: Colors.grey[600],
                fontSize: 12,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState(String title, String subtitle, IconData icon) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            icon,
            size: 64,
            color: Colors.grey[400],
          ),
          const SizedBox(height: 16),
          Text(
            title,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            subtitle,
            style: TextStyle(
              color: Colors.grey[500],
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Map<TaskStatus, List<Task>> _groupTasksByStatus(List<Task> tasks) {
    final grouped = <TaskStatus, List<Task>>{};
    
    for (final task in tasks) {
      grouped.putIfAbsent(task.status, () => []).add(task);
    }
    
    return grouped;
  }

  Color _getSprintStatusColor(SprintStatus status) {
    switch (status) {
      case SprintStatus.planning:
        return Colors.orange;
      case SprintStatus.active:
        return Colors.green;
      case SprintStatus.completed:
        return Colors.blue;
    }
  }

  IconData _getSprintStatusIcon(SprintStatus status) {
    switch (status) {
      case SprintStatus.planning:
        return Icons.schedule;
      case SprintStatus.active:
        return Icons.play_circle;
      case SprintStatus.completed:
        return Icons.check_circle;
    }
  }

  Color _getTaskStatusColor(TaskStatus status) {
    switch (status) {
      case TaskStatus.todo:
        return Colors.grey;
      case TaskStatus.inProgress:
        return Colors.blue;
      case TaskStatus.review:
        return Colors.orange;
      case TaskStatus.testing:
        return Colors.purple;
      case TaskStatus.done:
      case TaskStatus.completed:
        return Colors.green;
      case TaskStatus.cancelled:
        return Colors.red;
    }
  }

  Color _getTaskTypeColor(TaskType type) {
    switch (type) {
      case TaskType.task:
        return Colors.blue;
      case TaskType.story:
        return Colors.green;
      case TaskType.bug:
        return Colors.red;
      case TaskType.epic:
        return Colors.purple;
      case TaskType.subtask:
        return Colors.orange;
    }
  }

  IconData _getTaskTypeIcon(TaskType type) {
    switch (type) {
      case TaskType.task:
        return Icons.task;
      case TaskType.story:
        return Icons.book;
      case TaskType.bug:
        return Icons.bug_report;
      case TaskType.epic:
        return Icons.flag;
      case TaskType.subtask:
        return Icons.subdirectory_arrow_right;
    }
  }

  Color _getTaskPriorityColor(TaskPriority priority) {
    switch (priority) {
      case TaskPriority.lowest:
        return Colors.grey;
      case TaskPriority.low:
        return Colors.blue;
      case TaskPriority.medium:
        return Colors.orange;
      case TaskPriority.high:
        return Colors.red;
      case TaskPriority.highest:
        return Colors.purple;
    }
  }

  String _getTranslatedSprintStatusName(SprintStatus status) {
    switch (status) {
      case SprintStatus.planning:
        return 'sprints.status_planning'.tr();
      case SprintStatus.active:
        return 'sprints.status_active'.tr();
      case SprintStatus.completed:
        return 'sprints.status_completed'.tr();
    }
  }

  String _getTranslatedStatusName(TaskStatus status) {
    switch (status) {
      case TaskStatus.todo:
        return 'tasks.status_todo'.tr();
      case TaskStatus.inProgress:
        return 'tasks.status_in_progress'.tr();
      case TaskStatus.review:
        return 'tasks.status_review'.tr();
      case TaskStatus.testing:
        return 'tasks.status_testing'.tr();
      case TaskStatus.done:
        return 'tasks.status_done'.tr();
      case TaskStatus.completed:
        return 'tasks.status_done'.tr();
      case TaskStatus.cancelled:
        return 'tasks.status_cancelled'.tr();
    }
  }

  String _getTranslatedPriorityName(TaskPriority priority) {
    switch (priority) {
      case TaskPriority.lowest:
        return 'tasks.priority_lowest'.tr();
      case TaskPriority.low:
        return 'tasks.priority_low'.tr();
      case TaskPriority.medium:
        return 'tasks.priority_medium'.tr();
      case TaskPriority.high:
        return 'tasks.priority_high'.tr();
      case TaskPriority.highest:
        return 'tasks.priority_highest'.tr();
    }
  }

  int _calculateAverageSprintDuration() {
    if (_sprints.isEmpty) return 0;
    
    final totalDays = _sprints.fold<int>(0, (sum, sprint) {
      return sum + sprint.endDate.difference(sprint.startDate).inDays;
    });
    
    return (totalDays / _sprints.length).round();
  }

  int _calculateTotalStoryPoints() {
    return _allTasks.fold<int>(0, (sum, task) {
      return sum + (task.storyPoints ?? 0);
    });
  }

  double _calculateAverageTasksPerSprint() {
    if (_sprints.isEmpty) return 0;

    final totalTasks = _sprints.fold<int>(0, (sum, sprint) {
      final sprintTasks = _allTasks.where((task) => task.sprintId == sprint.id).length;
      return sum + sprintTasks;
    });

    return totalTasks / _sprints.length;
  }

  // Burndown chart helper methods
  Widget _buildLegendItem(String label, Color color) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 16,
          height: 3,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey[600],
          ),
        ),
      ],
    );
  }

  Widget _buildBurndownChart() {
    if (_activeSprint == null) {
      return Container(
        height: 200,
        child: Center(
          child: Text(
            'sprints.no_active_sprint'.tr(),
            style: TextStyle(color: Colors.grey[600]),
          ),
        ),
      );
    }

    final burndownData = _calculateBurndownData();
    if (burndownData.isEmpty) {
      return Container(
        height: 200,
        child: Center(
          child: Text(
            'sprints.no_data_available'.tr(),
            style: TextStyle(color: Colors.grey[600]),
          ),
        ),
      );
    }

    final maxY = burndownData.first['totalPoints'] as double;

    return Container(
      height: 220,
      padding: const EdgeInsets.only(right: 16, top: 8),
      child: LineChart(
        LineChartData(
          gridData: FlGridData(
            show: true,
            drawVerticalLine: true,
            horizontalInterval: maxY > 0 ? maxY / 5 : 1,
            verticalInterval: 1,
            getDrawingHorizontalLine: (value) {
              return FlLine(
                color: Colors.grey.withOpacity(0.2),
                strokeWidth: 1,
              );
            },
            getDrawingVerticalLine: (value) {
              return FlLine(
                color: Colors.grey.withOpacity(0.2),
                strokeWidth: 1,
              );
            },
          ),
          titlesData: FlTitlesData(
            show: true,
            rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 30,
                interval: (burndownData.length / 5).ceil().toDouble().clamp(1, 10),
                getTitlesWidget: (value, meta) {
                  final index = value.toInt();
                  if (index >= 0 && index < burndownData.length) {
                    final date = burndownData[index]['date'] as DateTime;
                    return Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(
                        DateFormat('dd').format(date),
                        style: TextStyle(
                          color: Colors.grey[600],
                          fontSize: 10,
                        ),
                      ),
                    );
                  }
                  return const SizedBox();
                },
              ),
            ),
            leftTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                interval: maxY > 0 ? maxY / 5 : 1,
                reservedSize: 35,
                getTitlesWidget: (value, meta) {
                  return Text(
                    value.toInt().toString(),
                    style: TextStyle(
                      color: Colors.grey[600],
                      fontSize: 10,
                    ),
                  );
                },
              ),
            ),
          ),
          borderData: FlBorderData(
            show: true,
            border: Border(
              bottom: BorderSide(color: Colors.grey.withOpacity(0.3)),
              left: BorderSide(color: Colors.grey.withOpacity(0.3)),
            ),
          ),
          minX: 0,
          maxX: (burndownData.length - 1).toDouble(),
          minY: 0,
          maxY: maxY,
          lineBarsData: [
            // Ideal burndown line (dashed grey)
            LineChartBarData(
              spots: _getIdealBurndownSpots(burndownData),
              isCurved: false,
              color: Colors.grey.withOpacity(0.5),
              barWidth: 2,
              isStrokeCapRound: true,
              dotData: const FlDotData(show: false),
              dashArray: [5, 5],
            ),
            // Actual burndown line (solid blue)
            LineChartBarData(
              spots: _getActualBurndownSpots(burndownData),
              isCurved: true,
              curveSmoothness: 0.15,
              color: Colors.blue,
              barWidth: 3,
              isStrokeCapRound: true,
              dotData: FlDotData(
                show: true,
                getDotPainter: (spot, percent, barData, index) {
                  return FlDotCirclePainter(
                    radius: 3,
                    color: Colors.blue,
                    strokeWidth: 1,
                    strokeColor: Colors.white,
                  );
                },
              ),
              belowBarData: BarAreaData(
                show: true,
                color: Colors.blue.withOpacity(0.1),
              ),
            ),
          ],
          lineTouchData: LineTouchData(
            touchTooltipData: LineTouchTooltipData(
              getTooltipItems: (touchedSpots) {
                return touchedSpots.map((spot) {
                  final index = spot.x.toInt();
                  if (index >= 0 && index < burndownData.length) {
                    final date = burndownData[index]['date'] as DateTime;
                    final isIdeal = spot.barIndex == 0;
                    return LineTooltipItem(
                      '${DateFormat('MMM dd').format(date)}\n${isIdeal ? 'sprints.ideal'.tr() : 'sprints.actual'.tr()}: ${spot.y.toInt()} pts',
                      TextStyle(
                        color: isIdeal ? Colors.grey : Colors.blue,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    );
                  }
                  return null;
                }).toList();
              },
            ),
          ),
        ),
      ),
    );
  }

  List<Map<String, dynamic>> _calculateBurndownData() {
    if (_activeSprint == null) return [];

    final sprint = _activeSprint!;
    final sprintTasks = _allTasks.where((task) => task.sprintId == sprint.id).toList();

    if (sprintTasks.isEmpty) return [];

    final totalPoints = sprintTasks.fold<int>(0, (sum, task) => sum + (task.storyPoints ?? 1));
    final sprintDays = sprint.endDate.difference(sprint.startDate).inDays + 1;

    final data = <Map<String, dynamic>>[];
    final now = DateTime.now();

    for (int i = 0; i < sprintDays; i++) {
      final date = sprint.startDate.add(Duration(days: i));

      // Calculate ideal remaining points (linear burndown)
      final idealRemaining = totalPoints - (totalPoints / (sprintDays - 1) * i);

      // Calculate actual remaining points based on task completion
      int completedPoints = 0;
      if (date.isBefore(now) || date.isAtSameMomentAs(now)) {
        for (final task in sprintTasks) {
          if (task.status == TaskStatus.done) {
            // Check if task was completed on or before this date
            final completedDate = task.updatedAt;
            if (completedDate.isBefore(date.add(const Duration(days: 1)))) {
              completedPoints += task.storyPoints ?? 1;
            }
          }
        }
      }

      data.add({
        'date': date,
        'day': i,
        'idealRemaining': idealRemaining.clamp(0, totalPoints.toDouble()),
        'actualRemaining': date.isAfter(now) ? null : (totalPoints - completedPoints).toDouble(),
        'totalPoints': totalPoints.toDouble(),
      });
    }

    return data;
  }

  List<FlSpot> _getIdealBurndownSpots(List<Map<String, dynamic>> data) {
    return data.map((d) {
      return FlSpot(
        (d['day'] as int).toDouble(),
        d['idealRemaining'] as double,
      );
    }).toList();
  }

  List<FlSpot> _getActualBurndownSpots(List<Map<String, dynamic>> data) {
    final spots = <FlSpot>[];
    for (final d in data) {
      final actual = d['actualRemaining'];
      if (actual != null) {
        spots.add(FlSpot(
          (d['day'] as int).toDouble(),
          actual as double,
        ));
      }
    }
    return spots;
  }

  void _showCreateSprintDialog() {
    showDialog(
      context: context,
      builder: (context) => _CreateSprintDialog(
        projectId: widget.projectId,
        onSprintCreated: _loadData,
      ),
    );
  }

  void _showSprintDetails(Sprint sprint) {
    // Navigate to sprint details screen
    // This would show detailed sprint information, burndown charts, etc.
  }

  void _showTaskDetails(Task task) {
    Navigator.pushNamed(
      context,
      '/task-details',
      arguments: task.id,
    );
  }

  void _showTaskSelectionDialog() {
    final unassignedTasks = _allTasks.where((task) => task.sprintId == null).toList();
    
    showDialog(
      context: context,
      builder: (context) => _TaskSelectionDialog(
        tasks: unassignedTasks,
        sprintId: _activeSprint!.id,
        onTasksAssigned: _loadData,
      ),
    );
  }

  void _handleSprintAction(Sprint sprint, String action) {
    switch (action) {
      case 'edit':
        _showEditSprintDialog(sprint);
        break;
      case 'start':
        _startSprint(sprint);
        break;
      case 'complete':
        _completeSprint(sprint);
        break;
      case 'delete':
        _confirmDeleteSprint(sprint);
        break;
    }
  }

  void _showEditSprintDialog(Sprint sprint) {
    showDialog(
      context: context,
      builder: (context) => _CreateSprintDialog(
        projectId: widget.projectId,
        sprint: sprint,
        onSprintCreated: _loadData,
      ),
    );
  }

  Future<void> _startSprint(Sprint sprint) async {
    // Check if there's already an active sprint
    if (_activeSprint != null && _activeSprint!.id != sprint.id) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('sprints.complete_active_first'.tr()),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    final success = await _projectService.updateSprint(
      sprint.id,
      status: SprintStatus.active,
    );

    if (success != null) {
      _loadData();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('sprints.sprint_started'.tr()),
            backgroundColor: Colors.green,
          ),
        );
      }
    }
  }

  Future<void> _completeSprint(Sprint sprint) async {
    final success = await _projectService.updateSprint(
      sprint.id,
      status: SprintStatus.completed,
    );

    if (success != null) {
      _loadData();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('sprints.sprint_completed'.tr()),
            backgroundColor: Colors.green,
          ),
        );
      }
    }
  }

  void _confirmDeleteSprint(Sprint sprint) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('sprints.delete_sprint'.tr()),
        content: Text('sprints.delete_sprint_confirm'.tr(args: [sprint.name])),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('common.cancel'.tr()),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () async {
              Navigator.pop(context);
              final success = await _projectService.deleteSprint(sprint.id);
              if (success) {
                _loadData();
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('sprints.sprint_deleted'.tr())),
                  );
                }
              }
            },
            child: Text('common.delete'.tr(), style: const TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}

// Create Sprint Dialog
class _CreateSprintDialog extends StatefulWidget {
  final String projectId;
  final Sprint? sprint;
  final VoidCallback onSprintCreated;

  const _CreateSprintDialog({
    required this.projectId,
    this.sprint,
    required this.onSprintCreated,
  });

  @override
  State<_CreateSprintDialog> createState() => _CreateSprintDialogState();
}

class _CreateSprintDialogState extends State<_CreateSprintDialog> {
  final ProjectService _projectService = ProjectService();
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _goalController = TextEditingController();
  
  DateTime? _startDate;
  DateTime? _endDate;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    if (widget.sprint != null) {
      _nameController.text = widget.sprint!.name;
      _goalController.text = widget.sprint!.goal ?? '';
      _startDate = widget.sprint!.startDate;
      _endDate = widget.sprint!.endDate;
    } else {
      _startDate = DateTime.now();
      _endDate = DateTime.now().add(const Duration(days: 14));
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _goalController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.sprint != null ? 'sprints.edit_sprint'.tr() : 'sprints.create_sprint'.tr()),
      content: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: _nameController,
                decoration: InputDecoration(
                  labelText: 'sprints.sprint_name'.tr(),
                  border: const OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'sprints.sprint_name_required'.tr();
                  }
                  return null;
                },
              ),

              const SizedBox(height: 16),

              TextFormField(
                controller: _goalController,
                decoration: InputDecoration(
                  labelText: 'sprints.sprint_goal'.tr(),
                  border: const OutlineInputBorder(),
                ),
                maxLines: 2,
              ),

              const SizedBox(height: 16),

              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () => _selectDate(isStartDate: true),
                      child: InputDecorator(
                        decoration: InputDecoration(
                          labelText: 'sprints.start_date'.tr(),
                          border: const OutlineInputBorder(),
                        ),
                        child: Text(
                          _startDate != null
                              ? DateFormat('MMM dd, yyyy').format(_startDate!)
                              : 'sprints.select_date'.tr(),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: InkWell(
                      onTap: () => _selectDate(isStartDate: false),
                      child: InputDecorator(
                        decoration: InputDecoration(
                          labelText: 'sprints.end_date'.tr(),
                          border: const OutlineInputBorder(),
                        ),
                        child: Text(
                          _endDate != null
                              ? DateFormat('MMM dd, yyyy').format(_endDate!)
                              : 'sprints.select_date'.tr(),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text('common.cancel'.tr()),
        ),
        ElevatedButton(
          onPressed: _isLoading ? null : _saveSprint,
          child: _isLoading
              ? const SizedBox(
                  height: 20,
                  width: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : Text(widget.sprint != null ? 'common.update'.tr() : 'common.create'.tr()),
        ),
      ],
    );
  }

  Future<void> _selectDate({required bool isStartDate}) async {
    final initialDate = isStartDate 
        ? (_startDate ?? DateTime.now())
        : (_endDate ?? _startDate?.add(const Duration(days: 14)) ?? DateTime.now());
    
    final date = await showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: DateTime.now().subtract(const Duration(days: 30)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    
    if (date != null) {
      setState(() {
        if (isStartDate) {
          _startDate = date;
          if (_endDate != null && _endDate!.isBefore(date)) {
            _endDate = date.add(const Duration(days: 14));
          }
        } else {
          _endDate = date;
        }
      });
    }
  }

  Future<void> _saveSprint() async {
    if (!_formKey.currentState!.validate() || 
        _startDate == null || _endDate == null) {
      return;
    }

    if (_endDate!.isBefore(_startDate!)) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('sprints.end_date_after_start'.tr()),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      Sprint? result;
      
      if (widget.sprint != null) {
        result = await _projectService.updateSprint(
          widget.sprint!.id,
          name: _nameController.text.trim(),
          goal: _goalController.text.trim().isNotEmpty 
              ? _goalController.text.trim() 
              : null,
          startDate: _startDate,
          endDate: _endDate,
        );
      } else {
        result = await _projectService.createSprint(
          projectId: widget.projectId,
          name: _nameController.text.trim(),
          goal: _goalController.text.trim().isNotEmpty 
              ? _goalController.text.trim() 
              : null,
          startDate: _startDate!,
          endDate: _endDate!,
        );
      }

      if (result != null && mounted) {
        Navigator.pop(context);
        widget.onSprintCreated();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              widget.sprint != null
                  ? 'sprints.sprint_updated'.tr()
                  : 'sprints.sprint_created'.tr()
            ),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('sprints.error_saving_sprint'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }
}

// Task Selection Dialog
class _TaskSelectionDialog extends StatefulWidget {
  final List<Task> tasks;
  final String sprintId;
  final VoidCallback onTasksAssigned;

  const _TaskSelectionDialog({
    required this.tasks,
    required this.sprintId,
    required this.onTasksAssigned,
  });

  @override
  State<_TaskSelectionDialog> createState() => _TaskSelectionDialogState();
}

class _TaskSelectionDialogState extends State<_TaskSelectionDialog> {
  final ProjectService _projectService = ProjectService();
  final Set<String> _selectedTaskIds = {};
  bool _isLoading = false;

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text('sprints.add_tasks_to_sprint'.tr()),
      content: SizedBox(
        width: double.maxFinite,
        height: 400,
        child: widget.tasks.isEmpty
            ? Center(
                child: Text('sprints.no_unassigned_tasks'.tr()),
              )
            : ListView.builder(
                itemCount: widget.tasks.length,
                itemBuilder: (context, index) {
                  final task = widget.tasks[index];
                  return CheckboxListTile(
                    value: _selectedTaskIds.contains(task.id),
                    onChanged: (selected) {
                      setState(() {
                        if (selected == true) {
                          _selectedTaskIds.add(task.id);
                        } else {
                          _selectedTaskIds.remove(task.id);
                        }
                      });
                    },
                    title: Text(task.title),
                    subtitle: Text(_getTranslatedPriorityName(task.priority)),
                    secondary: Container(
                      padding: const EdgeInsets.all(4.0),
                      decoration: BoxDecoration(
                        color: _getTaskTypeColor(task.taskType).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(4.0),
                      ),
                      child: Icon(
                        _getTaskTypeIcon(task.taskType),
                        size: 16,
                        color: _getTaskTypeColor(task.taskType),
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
        ElevatedButton(
          onPressed: _selectedTaskIds.isEmpty || _isLoading
              ? null
              : _assignTasks,
          child: _isLoading
              ? const SizedBox(
                  height: 20,
                  width: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : Text('sprints.add_tasks'.tr()),
        ),
      ],
    );
  }

  Future<void> _assignTasks() async {
    setState(() => _isLoading = true);

    try {
      for (final taskId in _selectedTaskIds) {
        await _projectService.updateTask(
          taskId,
          sprintId: widget.sprintId,
        );
      }

      if (mounted) {
        Navigator.pop(context);
        widget.onTasksAssigned();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('sprints.tasks_added_to_sprint'.tr(args: ['${_selectedTaskIds.length}'])),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('sprints.error_assigning_tasks'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Color _getTaskTypeColor(TaskType type) {
    switch (type) {
      case TaskType.task:
        return Colors.blue;
      case TaskType.story:
        return Colors.green;
      case TaskType.bug:
        return Colors.red;
      case TaskType.epic:
        return Colors.purple;
      case TaskType.subtask:
        return Colors.orange;
    }
  }

  IconData _getTaskTypeIcon(TaskType type) {
    switch (type) {
      case TaskType.task:
        return Icons.task;
      case TaskType.story:
        return Icons.book;
      case TaskType.bug:
        return Icons.bug_report;
      case TaskType.epic:
        return Icons.flag;
      case TaskType.subtask:
        return Icons.subdirectory_arrow_right;
    }
  }
}