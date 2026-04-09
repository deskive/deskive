import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:easy_localization/easy_localization.dart';
import 'project_model.dart';
import 'project_service.dart';
import 'task_import_modal.dart';
import '../widgets/google_drive_folder_picker.dart';
import '../apps/services/google_drive_service.dart';

class EnhancedTasksScreen extends StatefulWidget {
  final String? projectId;
  
  const EnhancedTasksScreen({
    super.key,
    this.projectId,
  });

  @override
  State<EnhancedTasksScreen> createState() => _EnhancedTasksScreenState();
}

class _EnhancedTasksScreenState extends State<EnhancedTasksScreen> 
    with TickerProviderStateMixin {
  final ProjectService _projectService = ProjectService();
  final TextEditingController _searchController = TextEditingController();
  late TabController _tabController;
  
  List<Task> _allTasks = [];
  List<Task> _filteredTasks = [];
  List<Project> _projects = [];
  List<Sprint> _sprints = [];
  bool _isLoading = true;
  
  // Filter state
  String _searchQuery = '';
  TaskStatus? _selectedStatus;
  TaskPriority? _selectedPriority;
  TaskType? _selectedTaskType;
  String? _selectedAssignee;
  String? _selectedProject;
  String? _selectedSprint;
  DateTime? _dueBefore;
  DateTime? _dueAfter;
  List<String> _selectedLabels = [];
  
  // View options
  bool _showCompletedTasks = false;
  String _sortBy = 'dueDate'; // dueDate, priority, created, updated
  bool _sortAscending = true;
  
  final List<String> _availableLabels = [
    'highest', 'bug', 'feature', 'enhancement', 'documentation', 'testing'
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(
      length: TaskStatus.values.where((status) => 
        status != TaskStatus.cancelled
      ).length + 1,
      vsync: this,
    );
    _loadData();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    
    try {
      List<Task> tasks;
      if (widget.projectId != null) {
        tasks = await _projectService.getTasksForProject(widget.projectId!);
        final sprints = await _projectService.getProjectSprints(widget.projectId!);
        setState(() => _sprints = sprints);
      } else {
        tasks = await _projectService.getAllTasks();
        final projects = await _projectService.getAllProjects();
        setState(() => _projects = projects);
      }
      
      setState(() {
        _allTasks = tasks;
        _isLoading = false;
      });
      
      _applyFilters();
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading tasks: $e')),
        );
      }
    }
  }

  void _applyFilters() {
    var filtered = _allTasks.toList();
    
    // Apply search
    if (_searchQuery.isNotEmpty) {
      filtered = filtered.where((task) =>
        task.title.toLowerCase().contains(_searchQuery.toLowerCase()) ||
        (task.description?.toLowerCase().contains(_searchQuery.toLowerCase()) ?? false)
      ).toList();
    }
    
    // Apply status filter
    if (_selectedStatus != null) {
      filtered = filtered.where((task) => task.status == _selectedStatus).toList();
    }
    
    // Apply priority filter
    if (_selectedPriority != null) {
      filtered = filtered.where((task) => task.priority == _selectedPriority).toList();
    }
    
    // Apply task type filter
    if (_selectedTaskType != null) {
      filtered = filtered.where((task) => task.taskType == _selectedTaskType).toList();
    }
    
    // Apply assignee filter
    if (_selectedAssignee != null) {
      filtered = filtered.where((task) => task.assignedTo == _selectedAssignee).toList();
    }
    
    // Apply project filter
    if (_selectedProject != null) {
      filtered = filtered.where((task) => task.projectId == _selectedProject).toList();
    }
    
    // Apply sprint filter
    if (_selectedSprint != null) {
      filtered = filtered.where((task) => task.sprintId == _selectedSprint).toList();
    }
    
    // Apply due date filters
    if (_dueBefore != null) {
      filtered = filtered.where((task) => 
        task.dueDate != null && task.dueDate!.isBefore(_dueBefore!)
      ).toList();
    }
    
    if (_dueAfter != null) {
      filtered = filtered.where((task) => 
        task.dueDate != null && task.dueDate!.isAfter(_dueAfter!)
      ).toList();
    }
    
    // Apply label filters
    if (_selectedLabels.isNotEmpty) {
      filtered = filtered.where((task) => 
        task.labels != null && 
        _selectedLabels.any((label) => task.labels!.contains(label))
      ).toList();
    }
    
    // Hide/show completed tasks
    if (!_showCompletedTasks) {
      filtered = filtered.where((task) => 
        task.status != TaskStatus.done && 
        task.status != TaskStatus.completed
      ).toList();
    }
    
    // Apply sorting
    switch (_sortBy) {
      case 'dueDate':
        filtered.sort((a, b) {
          final aDate = a.dueDate ?? DateTime(2099);
          final bDate = b.dueDate ?? DateTime(2099);
          return _sortAscending ? aDate.compareTo(bDate) : bDate.compareTo(aDate);
        });
        break;
      case 'priority':
        filtered.sort((a, b) {
          final priorities = TaskPriority.values;
          final aIndex = priorities.indexOf(a.priority);
          final bIndex = priorities.indexOf(b.priority);
          return _sortAscending ? aIndex.compareTo(bIndex) : bIndex.compareTo(aIndex);
        });
        break;
      case 'created':
        filtered.sort((a, b) => _sortAscending 
          ? a.createdAt.compareTo(b.createdAt)
          : b.createdAt.compareTo(a.createdAt));
        break;
      case 'updated':
        filtered.sort((a, b) => _sortAscending 
          ? a.updatedAt.compareTo(b.updatedAt)
          : b.updatedAt.compareTo(a.updatedAt));
        break;
    }
    
    setState(() => _filteredTasks = filtered);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.projectId != null ? 'tasks.project_tasks'.tr() : 'tasks.all_tasks'.tr()),
        actions: [
          IconButton(
            icon: const Icon(Icons.file_download_outlined),
            tooltip: 'tasks_import.title'.tr(),
            onPressed: _showImportModal,
          ),
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: _showFilterDialog,
          ),
          IconButton(
            icon: const Icon(Icons.sort),
            onPressed: _showSortDialog,
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(100),
          child: Column(
            children: [
              // Search Bar
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'tasks.search_tasks'.tr(),
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () {
                              _searchController.clear();
                              setState(() => _searchQuery = '');
                              _applyFilters();
                            },
                          )
                        : null,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10.0),
                    ),
                  ),
                  onChanged: (value) {
                    setState(() => _searchQuery = value);
                    _applyFilters();
                  },
                ),
              ),
              
              // Filter Tabs
              TabBar(
                controller: _tabController,
                isScrollable: true,
                labelColor: Theme.of(context).primaryColor,
                unselectedLabelColor: Colors.grey,
                indicatorColor: Theme.of(context).primaryColor,
                tabs: [
                  Tab(
                    text: 'All (${_getTaskCountForStatus(null)})',
                  ),
                  ...TaskStatus.values
                      .where((status) => status != TaskStatus.cancelled)
                      .map((status) => Tab(
                            text: '${_getTranslatedStatusName(status)} (${_getTaskCountForStatus(status)})',
                          )),
                ],
                onTap: (index) {
                  if (index == 0) {
                    _selectedStatus = null;
                  } else {
                    final statuses = TaskStatus.values
                        .where((status) => status != TaskStatus.cancelled)
                        .toList();
                    _selectedStatus = statuses[index - 1];
                  }
                  _applyFilters();
                },
              ),
            ],
          ),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _buildTaskList(),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showCreateTaskDialog,
        icon: const Icon(Icons.add),
        label: Text('tasks.add_task'.tr()),
      ),
    );
  }

  int _getTaskCountForStatus(TaskStatus? status) {
    if (status == null) return _filteredTasks.length;
    return _filteredTasks.where((task) => task.status == status).length;
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

  String _getTranslatedTypeName(TaskType type) {
    switch (type) {
      case TaskType.task:
        return 'tasks.type_task'.tr();
      case TaskType.bug:
        return 'tasks.type_bug'.tr();
      case TaskType.story:
        return 'tasks.type_story'.tr();
      case TaskType.epic:
        return 'tasks.type_epic'.tr();
      case TaskType.subtask:
        return 'tasks.type_subtask'.tr();
    }
  }

  Widget _buildTaskList() {
    if (_filteredTasks.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.task_alt,
              size: 64,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              'projects.no_tasks_found'.tr(),
              style: TextStyle(
                fontSize: 18,
                color: Colors.grey[600],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'tasks.try_adjusting_filters'.tr(),
              style: TextStyle(
                color: Colors.grey[500],
              ),
            ),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16.0),
      itemCount: _filteredTasks.length,
      separatorBuilder: (context, index) => const SizedBox(height: 8.0),
      itemBuilder: (context, index) => _buildTaskCard(_filteredTasks[index]),
    );
  }

  Widget _buildTaskCard(Task task) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12.0),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(12.0),
        onTap: () => _showTaskDetails(task),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Row
              Row(
                children: [
                  // Task Type Badge
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8.0,
                      vertical: 4.0,
                    ),
                    decoration: BoxDecoration(
                      color: _getTaskTypeColor(task.taskType),
                      borderRadius: BorderRadius.circular(4.0),
                    ),
                    child: Text(
                      _getTranslatedTypeName(task.taskType).toUpperCase(),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10.0,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),

                  const SizedBox(width: 8.0),

                  // Priority Badge
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8.0,
                      vertical: 4.0,
                    ),
                    decoration: BoxDecoration(
                      color: _getPriorityColor(task.priority),
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

                  const Spacer(),

                  // Status Badge
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8.0,
                      vertical: 4.0,
                    ),
                    decoration: BoxDecoration(
                      color: _getStatusColor(task.status),
                      borderRadius: BorderRadius.circular(4.0),
                    ),
                    child: Text(
                      _getTranslatedStatusName(task.status),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10.0,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  
                  // More Options
                  PopupMenuButton<String>(
                    onSelected: (action) => _handleTaskAction(task, action),
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
                      PopupMenuItem(
                        value: 'duplicate',
                        child: Row(
                          children: [
                            const Icon(Icons.copy, size: 16),
                            const SizedBox(width: 8),
                            Text('tasks.duplicate'.tr()),
                          ],
                        ),
                      ),
                      PopupMenuItem(
                        value: 'export_to_drive',
                        child: Row(
                          children: [
                            const Icon(Icons.cloud_upload_outlined, size: 16),
                            const SizedBox(width: 8),
                            Text('tasks.export_to_drive'.tr()),
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
              
              const SizedBox(height: 12.0),
              
              // Task Title
              Text(
                task.title,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16.0,
                ),
              ),
              
              // Task Description
              if (task.description != null && task.description!.isNotEmpty) ...[
                const SizedBox(height: 8.0),
                Text(
                  task.description!,
                  style: TextStyle(
                    color: Colors.grey[600],
                    fontSize: 14.0,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
              
              const SizedBox(height: 12.0),
              
              // Task Info Row
              Row(
                children: [
                  // Project Info (if showing all tasks)
                  if (widget.projectId == null) ...[
                    Icon(Icons.folder, size: 16, color: Colors.grey[600]),
                    const SizedBox(width: 4.0),
                    Text(
                      _getProjectName(task.projectId),
                      style: TextStyle(
                        fontSize: 12.0,
                        color: Colors.grey[600],
                      ),
                    ),
                    const SizedBox(width: 16.0),
                  ],
                  
                  // Assignee
                  if (task.assigneeName != null) ...[
                    CircleAvatar(
                      radius: 12.0,
                      backgroundColor: Colors.blue,
                      child: Text(
                        task.assigneeName![0].toUpperCase(),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10.0,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8.0),
                    Text(
                      task.assigneeName!,
                      style: TextStyle(
                        fontSize: 12.0,
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                  
                  const Spacer(),
                  
                  // Due Date
                  if (task.dueDate != null) ...[
                    Icon(
                      Icons.schedule,
                      size: 16,
                      color: _isDueSoon(task.dueDate!) ? Colors.red : Colors.grey[600],
                    ),
                    const SizedBox(width: 4.0),
                    Text(
                      DateFormat('MMM dd').format(task.dueDate!),
                      style: TextStyle(
                        fontSize: 12.0,
                        color: _isDueSoon(task.dueDate!) ? Colors.red : Colors.grey[600],
                        fontWeight: _isDueSoon(task.dueDate!) 
                            ? FontWeight.bold 
                            : FontWeight.normal,
                      ),
                    ),
                  ],
                ],
              ),
              
              // Labels
              if (task.labels != null && task.labels!.isNotEmpty) ...[
                const SizedBox(height: 12.0),
                Wrap(
                  spacing: 6.0,
                  runSpacing: 6.0,
                  children: task.labels!.map((label) => Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8.0,
                      vertical: 4.0,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.grey[200],
                      borderRadius: BorderRadius.circular(12.0),
                    ),
                    child: Text(
                      label,
                      style: const TextStyle(
                        fontSize: 11.0,
                        color: Colors.black87,
                      ),
                    ),
                  )).toList(),
                ),
              ],
              
              // Footer with additional info
              const SizedBox(height: 12.0),
              Row(
                children: [
                  // Comments Count
                  if (task.comments != null && task.comments!.isNotEmpty) ...[
                    Icon(Icons.chat_bubble_outline, size: 16, color: Colors.grey[600]),
                    const SizedBox(width: 4.0),
                    Text(
                      'tasks.comments_count'.tr(args: ['${task.comments!.length}']),
                      style: TextStyle(fontSize: 12.0, color: Colors.grey[600]),
                    ),
                    const SizedBox(width: 16.0),
                  ],
                  
                  // Attachments Count
                  if (task.attachments != null && task.attachments!.isNotEmpty) ...[
                    Icon(Icons.attach_file, size: 16, color: Colors.grey[600]),
                    const SizedBox(width: 4.0),
                    Text(
                      'tasks.files_count'.tr(args: ['${task.attachments!.length}']),
                      style: TextStyle(fontSize: 12.0, color: Colors.grey[600]),
                    ),
                    const SizedBox(width: 16.0),
                  ],
                  
                  const Spacer(),
                  
                  // Updated timestamp
                  Text(
                    'tasks.updated_time'.tr(args: [_formatRelativeTime(task.updatedAt)]),
                    style: TextStyle(
                      fontSize: 11.0,
                      color: Colors.grey[500],
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

  Color _getPriorityColor(TaskPriority priority) {
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

  Color _getStatusColor(TaskStatus status) {
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

  bool _isDueSoon(DateTime dueDate) {
    final now = DateTime.now();
    final daysUntilDue = dueDate.difference(now).inDays;
    return daysUntilDue <= 2 && daysUntilDue >= 0;
  }

  String _getProjectName(String projectId) {
    final project = _projects.where((p) => p.id == projectId).firstOrNull;
    return project?.name ?? 'projects.unknown_project'.tr();
  }

  String _formatRelativeTime(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inDays > 0) {
      return 'tasks.days_ago_short'.tr(args: ['${difference.inDays}']);
    } else if (difference.inHours > 0) {
      return 'tasks.hours_ago_short'.tr(args: ['${difference.inHours}']);
    } else if (difference.inMinutes > 0) {
      return 'tasks.minutes_ago_short'.tr(args: ['${difference.inMinutes}']);
    } else {
      return 'tasks.just_now'.tr();
    }
  }

  void _showFilterDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('tasks.filter_tasks'.tr()),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Priority Filter
              Text('tasks.priority'.tr(), style: const TextStyle(fontWeight: FontWeight.bold)),
              DropdownButton<TaskPriority?>(
                value: _selectedPriority,
                isExpanded: true,
                items: [
                  DropdownMenuItem<TaskPriority?>(
                    value: null,
                    child: Text('tasks.all_priorities'.tr()),
                  ),
                  ...TaskPriority.values.map((priority) => DropdownMenuItem(
                    value: priority,
                    child: Text(_getTranslatedPriorityName(priority)),
                  )),
                ],
                onChanged: (value) => setState(() => _selectedPriority = value),
              ),

              const SizedBox(height: 16.0),

              // Task Type Filter
              Text('tasks.task_type'.tr(), style: const TextStyle(fontWeight: FontWeight.bold)),
              DropdownButton<TaskType?>(
                value: _selectedTaskType,
                isExpanded: true,
                items: [
                  DropdownMenuItem<TaskType?>(
                    value: null,
                    child: Text('tasks.all_types'.tr()),
                  ),
                  ...TaskType.values.map((type) => DropdownMenuItem(
                    value: type,
                    child: Text(_getTranslatedTypeName(type)),
                  )),
                ],
                onChanged: (value) => setState(() => _selectedTaskType = value),
              ),

              // Show completed tasks toggle
              const SizedBox(height: 16.0),
              SwitchListTile(
                title: Text('tasks.show_completed'.tr()),
                value: _showCompletedTasks,
                onChanged: (value) => setState(() => _showCompletedTasks = value),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () {
              setState(() {
                _selectedPriority = null;
                _selectedTaskType = null;
                _showCompletedTasks = false;
              });
              _applyFilters();
              Navigator.pop(context);
            },
            child: Text('common.clear'.tr()),
          ),
          ElevatedButton(
            onPressed: () {
              _applyFilters();
              Navigator.pop(context);
            },
            child: Text('tasks.apply'.tr()),
          ),
        ],
      ),
    );
  }

  void _showSortDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('tasks.sort_tasks'.tr()),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            RadioListTile<String>(
              title: Text('tasks.due_date'.tr()),
              value: 'dueDate',
              groupValue: _sortBy,
              onChanged: (value) => setState(() => _sortBy = value!),
            ),
            RadioListTile<String>(
              title: Text('tasks.priority'.tr()),
              value: 'priority',
              groupValue: _sortBy,
              onChanged: (value) => setState(() => _sortBy = value!),
            ),
            RadioListTile<String>(
              title: Text('tasks.created_date'.tr()),
              value: 'created',
              groupValue: _sortBy,
              onChanged: (value) => setState(() => _sortBy = value!),
            ),
            RadioListTile<String>(
              title: Text('tasks.updated_date'.tr()),
              value: 'updated',
              groupValue: _sortBy,
              onChanged: (value) => setState(() => _sortBy = value!),
            ),
            const SizedBox(height: 16),
            SwitchListTile(
              title: Text('tasks.ascending_order'.tr()),
              value: _sortAscending,
              onChanged: (value) => setState(() => _sortAscending = value),
            ),
          ],
        ),
        actions: [
          ElevatedButton(
            onPressed: () {
              _applyFilters();
              Navigator.pop(context);
            },
            child: Text('tasks.apply'.tr()),
          ),
        ],
      ),
    );
  }

  void _handleTaskAction(Task task, String action) {
    switch (action) {
      case 'edit':
        Navigator.pushNamed(
          context,
          '/edit-task',
          arguments: task.id,
        );
        break;
      case 'duplicate':
        _duplicateTask(task);
        break;
      case 'export_to_drive':
        _exportTaskToGoogleDrive(task);
        break;
      case 'delete':
        _confirmDeleteTask(task);
        break;
    }
  }

  Future<void> _duplicateTask(Task task) async {
    final duplicated = await _projectService.createTask(
      projectId: task.projectId,
      title: '${task.title} (Copy)',
      description: task.description,
      taskType: task.taskType,
      priority: task.priority,
      sprintId: task.sprintId,
      estimatedHours: task.estimatedHours,
      storyPoints: task.storyPoints,
      labels: task.labels,
    );

    if (duplicated != null) {
      _loadData();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('tasks.task_duplicated'.tr())),
        );
      }
    }
  }

  Future<void> _exportTaskToGoogleDrive(Task task) async {
    // Show folder picker dialog
    final result = await GoogleDriveFolderPicker.show(
      context: context,
      title: 'tasks.export_to_drive_title'.tr(),
      subtitle: 'tasks.export_to_drive_subtitle'.tr(args: [task.title]),
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
              child: Text('tasks.exporting_to_drive'.tr(args: [task.title])),
            ),
          ],
        ),
      ),
    );

    try {
      final response = await GoogleDriveService.instance.exportTask(
        taskId: task.id,
        targetFolderId: result.folderId,
        format: 'pdf',
      );

      if (!mounted) return;
      Navigator.of(context).pop(); // Close loading dialog

      if (response.success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('tasks.export_success'.tr(args: [task.title, result.folderPath ?? 'My Drive'])),
            duration: const Duration(seconds: 4),
            action: response.webViewLink != null
                ? SnackBarAction(
                    label: 'tasks.open_in_drive'.tr(),
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
            content: Text(response.message ?? 'tasks.export_failed'.tr()),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      Navigator.of(context).pop(); // Close loading dialog

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('tasks.export_failed'.tr()),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _confirmDeleteTask(Task task) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('tasks.delete_task'.tr()),
        content: Text('tasks.delete_task_confirm_with_name'.tr(args: [task.title])),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('common.cancel'.tr()),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () async {
              Navigator.pop(context);
              final success = await _projectService.deleteTask(task.id);
              if (success) {
                _loadData();
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('tasks.task_deleted'.tr())),
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

  void _showTaskDetails(Task task) {
    Navigator.pushNamed(
      context,
      '/task-details',
      arguments: task.id,
    );
  }

  void _showCreateTaskDialog() {
    Navigator.pushNamed(
      context,
      '/create-task',
      arguments: widget.projectId != null
        ? {'projectId': widget.projectId}
        : null,
    );
  }

  void _showImportModal() {
    showDialog(
      context: context,
      builder: (context) => TaskImportModal(
        projectId: widget.projectId,
        onTasksImported: () {
          _loadData();
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('tasks_import.success'.tr(args: [''])),
            ),
          );
        },
      ),
    );
  }
}