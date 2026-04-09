import 'package:flutter/material.dart';
import 'package:flutter_html/flutter_html.dart';
import 'package:provider/provider.dart';
import 'package:easy_localization/easy_localization.dart';
import 'project_model.dart';
import 'project_service.dart';

class KanbanBoardScreen extends StatefulWidget {
  final String projectId;
  
  const KanbanBoardScreen({
    super.key,
    required this.projectId,
  });

  @override
  State<KanbanBoardScreen> createState() => _KanbanBoardScreenState();
}

class _KanbanBoardScreenState extends State<KanbanBoardScreen> {
  final ProjectService _projectService = ProjectService();
  Project? _project;
  List<Task> _tasks = [];
  List<KanbanStage> _stages = [];
  bool _isLoading = true;
  String? _selectedSprintId;
  List<Sprint> _sprints = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    
    try {
      final project = await _projectService.getProjectById(widget.projectId);
      final tasks = await _projectService.getTasksForProject(
        widget.projectId,
        sprintId: _selectedSprintId,
      );
      final sprints = await _projectService.getProjectSprints(widget.projectId);
      
      setState(() {
        _project = project;
        _tasks = tasks;
        _sprints = sprints;
        _stages = project?.kanbanStages ?? KanbanStage.getDefaultStages();
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('kanban.error_loading'.tr(args: [e.toString()]))),
        );
      }
    }
  }

  List<Task> _getTasksForStage(String stageId) {
    return _tasks.where((task) {
      switch (stageId) {
        case 'todo':
          return task.status == TaskStatus.todo;
        case 'in_progress':
          return task.status == TaskStatus.inProgress;
        case 'review':
          return task.status == TaskStatus.review;
        case 'testing':
          return task.status == TaskStatus.testing;
        case 'done':
          return task.status == TaskStatus.done || task.status == TaskStatus.completed;
        default:
          return task.status.value == stageId;
      }
    }).toList();
  }

  TaskStatus _getStatusForStage(String stageId) {
    switch (stageId) {
      case 'todo':
        return TaskStatus.todo;
      case 'in_progress':
        return TaskStatus.inProgress;
      case 'review':
        return TaskStatus.review;
      case 'testing':
        return TaskStatus.testing;
      case 'done':
        return TaskStatus.done;
      default:
        return TaskStatus.todo;
    }
  }

  Future<void> _updateTaskStatus(String taskId, String newStageId) async {
    final newStatus = _getStatusForStage(newStageId);
    
    final success = await _projectService.updateTaskStatus(taskId, newStatus);
    if (success) {
      await _loadData(); // Reload to reflect changes
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('kanban.task_updated'.tr())),
        );
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('kanban.failed_to_update'.tr())),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_project?.name ?? 'kanban.title'.tr()),
        actions: [
          if (_sprints.isNotEmpty) ...[
            PopupMenuButton<String>(
              icon: const Icon(Icons.sprint),
              tooltip: 'kanban.filter_by_sprint'.tr(),
              onSelected: (sprintId) {
                setState(() {
                  _selectedSprintId = sprintId == 'all' ? null : sprintId;
                });
                _loadData();
              },
              itemBuilder: (context) => [
                PopupMenuItem(
                  value: 'all',
                  child: Text('kanban.all_tasks'.tr()),
                ),
                ..._sprints.map((sprint) => PopupMenuItem(
                  value: sprint.id,
                  child: Text(sprint.name),
                )),
              ],
            ),
          ],
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
            tooltip: 'kanban.refresh'.tr(),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _buildKanbanBoard(),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCreateTaskDialog(),
        icon: const Icon(Icons.add),
        label: Text('kanban.add_task'.tr()),
      ),
    );
  }

  Widget _buildKanbanBoard() {
    return Container(
      padding: const EdgeInsets.all(16.0),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: _stages.map((stage) => _buildKanbanColumn(stage)).toList(),
        ),
      ),
    );
  }

  Widget _buildKanbanColumn(KanbanStage stage) {
    final tasks = _getTasksForStage(stage.id);
    
    return Container(
      width: 300,
      margin: const EdgeInsets.only(right: 16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Column Header
          Container(
            padding: const EdgeInsets.all(12.0),
            decoration: BoxDecoration(
              color: Color(int.parse(stage.color.replaceFirst('#', '0xFF'))),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(8.0)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  stage.name,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 16.0,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8.0,
                    vertical: 4.0,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.3),
                    borderRadius: BorderRadius.circular(12.0),
                  ),
                  child: Text(
                    '${tasks.length}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 12.0,
                    ),
                  ),
                ),
              ],
            ),
          ),
          
          // Tasks List
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: const BorderRadius.vertical(bottom: Radius.circular(8.0)),
                border: Border.all(color: Colors.grey[300]!),
              ),
              child: DragTarget<Task>(
                onAccept: (task) => _updateTaskStatus(task.id, stage.id),
                builder: (context, candidateData, rejectedData) {
                  return Container(
                    padding: const EdgeInsets.all(8.0),
                    decoration: BoxDecoration(
                      color: candidateData.isNotEmpty 
                          ? Colors.blue.withOpacity(0.1) 
                          : null,
                      borderRadius: const BorderRadius.vertical(
                        bottom: Radius.circular(8.0),
                      ),
                    ),
                    child: ListView.builder(
                      shrinkWrap: true,
                      itemCount: tasks.length,
                      itemBuilder: (context, index) => _buildTaskCard(tasks[index]),
                    ),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTaskCard(Task task) {
    return Draggable<Task>(
      data: task,
      feedback: Material(
        elevation: 8.0,
        borderRadius: BorderRadius.circular(8.0),
        child: Container(
          width: 280,
          child: _buildTaskCardContent(task, isDragging: true),
        ),
      ),
      childWhenDragging: Opacity(
        opacity: 0.5,
        child: _buildTaskCardContent(task),
      ),
      child: GestureDetector(
        onTap: () => _showTaskDetails(task),
        child: _buildTaskCardContent(task),
      ),
    );
  }

  Widget _buildTaskCardContent(Task task, {bool isDragging = false}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8.0),
      padding: const EdgeInsets.all(12.0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8.0),
        border: Border.all(color: Colors.grey[300]!),
        boxShadow: isDragging ? [
          BoxShadow(
            color: Colors.black.withOpacity(0.2),
            blurRadius: 8.0,
            offset: const Offset(0, 4),
          ),
        ] : [],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Task Type Badge
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 6.0,
                  vertical: 2.0,
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
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 6.0,
                  vertical: 2.0,
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
            ],
          ),
          
          const SizedBox(height: 8.0),
          
          // Task Title
          Text(
            task.title,
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 14.0,
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          
          // Task Description
          if (task.description != null && task.description!.isNotEmpty) ...[
            const SizedBox(height: 4.0),
            Html(
              data: task.description!,
              style: {
                "body": Style(
                  fontSize: FontSize(12),
                  color: Colors.grey[600],
                  margin: Margins.zero,
                  padding: HtmlPaddings.zero,
                  maxLines: 2,
                  textOverflow: TextOverflow.ellipsis,
                ),
              },
            ),
          ],
          
          const SizedBox(height: 8.0),
          
          // Task Footer
          Row(
            children: [
              // Assignee
              if (task.assigneeName != null) ...[
                CircleAvatar(
                  radius: 10.0,
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
                const SizedBox(width: 4.0),
              ],
              
              const Spacer(),
              
              // Due Date
              if (task.dueDate != null) ...[
                Icon(
                  Icons.schedule,
                  size: 12.0,
                  color: _isDueSoon(task.dueDate!) ? Colors.red : Colors.grey,
                ),
                const SizedBox(width: 4.0),
                Text(
                  _formatDueDate(task.dueDate!),
                  style: TextStyle(
                    fontSize: 10.0,
                    color: _isDueSoon(task.dueDate!) ? Colors.red : Colors.grey,
                    fontWeight: _isDueSoon(task.dueDate!) 
                        ? FontWeight.bold 
                        : FontWeight.normal,
                  ),
                ),
              ],
              
              // Comments Count
              if (task.comments != null && task.comments!.isNotEmpty) ...[
                const SizedBox(width: 8.0),
                Icon(
                  Icons.chat_bubble_outline,
                  size: 12.0,
                  color: Colors.grey[600],
                ),
                const SizedBox(width: 2.0),
                Text(
                  '${task.comments!.length}',
                  style: TextStyle(
                    fontSize: 10.0,
                    color: Colors.grey[600],
                  ),
                ),
              ],
              
              // Attachments Count
              if (task.attachments != null && task.attachments!.isNotEmpty) ...[
                const SizedBox(width: 8.0),
                Icon(
                  Icons.attach_file,
                  size: 12.0,
                  color: Colors.grey[600],
                ),
                const SizedBox(width: 2.0),
                Text(
                  '${task.attachments!.length}',
                  style: TextStyle(
                    fontSize: 10.0,
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ],
          ),
          
          // Labels
          if (task.labels != null && task.labels!.isNotEmpty) ...[
            const SizedBox(height: 8.0),
            Wrap(
              spacing: 4.0,
              runSpacing: 4.0,
              children: task.labels!.take(3).map((label) => Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 6.0,
                  vertical: 2.0,
                ),
                decoration: BoxDecoration(
                  color: Colors.grey[200],
                  borderRadius: BorderRadius.circular(10.0),
                ),
                child: Text(
                  label,
                  style: const TextStyle(
                    fontSize: 10.0,
                    color: Colors.black87,
                  ),
                ),
              )).toList(),
            ),
          ],

          // Progress indicator
          const SizedBox(height: 8.0),
          Row(
            children: [
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: _getTaskProgress(task.status),
                    backgroundColor: Colors.grey[200],
                    valueColor: AlwaysStoppedAnimation<Color>(
                      _getStatusColor(task.status),
                    ),
                    minHeight: 4,
                  ),
                ),
              ),
              const SizedBox(width: 6),
              Text(
                '${(_getTaskProgress(task.status) * 100).toInt()}%',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  color: _getStatusColor(task.status),
                ),
              ),
            ],
          ),
        ],
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

  // Get task progress percentage based on status
  // todo = 25%, in_progress = 50%, review = 75%, done = 100%
  double _getTaskProgress(String status) {
    switch (status.toLowerCase()) {
      case 'todo':
      case 'to_do':
        return 0.25;
      case 'in_progress':
      case 'inprogress':
        return 0.50;
      case 'review':
      case 'in_review':
        return 0.75;
      case 'done':
      case 'completed':
        return 1.0;
      default:
        return 0.25;
    }
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'todo':
      case 'to_do':
        return Colors.grey;
      case 'in_progress':
      case 'inprogress':
        return Colors.blue;
      case 'review':
      case 'in_review':
        return Colors.orange;
      case 'done':
      case 'completed':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  bool _isDueSoon(DateTime dueDate) {
    final now = DateTime.now();
    final daysUntilDue = dueDate.difference(now).inDays;
    return daysUntilDue <= 1 && daysUntilDue >= 0;
  }

  String _formatDueDate(DateTime dueDate) {
    final now = DateTime.now();
    final difference = dueDate.difference(now);

    if (difference.isNegative) {
      return 'kanban.overdue'.tr();
    } else if (difference.inDays == 0) {
      return 'kanban.today'.tr();
    } else if (difference.inDays == 1) {
      return 'kanban.tomorrow'.tr();
    } else if (difference.inDays < 7) {
      return '${difference.inDays}d';
    } else {
      return '${dueDate.day}/${dueDate.month}';
    }
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
      arguments: {
        'projectId': widget.projectId,
        'sprintId': _selectedSprintId,
      },
    );
  }
}