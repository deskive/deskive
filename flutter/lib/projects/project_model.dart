class Project {
  final String id;
  final String name;
  final String? description;
  final String workspaceId;
  final String ownerId;
  final ProjectType type;
  final ProjectStatus status;
  final ProjectPriority? priority;
  final String? leadId;
  final DateTime? startDate;
  final DateTime? endDate;
  final double? estimatedHours;
  final double? budget;
  final bool isTemplate;
  final List<KanbanStage>? kanbanStages;
  final Map<String, dynamic>? metadata;
  final DateTime createdAt;
  final DateTime updatedAt;
  
  // Calculated fields
  final double progress;
  final int taskCount;
  final int memberCount;
  final List<String> memberIds;
  final List<String> taskIds;

  const Project({
    required this.id,
    required this.name,
    this.description,
    required this.workspaceId,
    required this.ownerId,
    required this.type,
    required this.status,
    this.priority,
    this.leadId,
    this.startDate,
    this.endDate,
    this.estimatedHours,
    this.budget,
    this.isTemplate = false,
    this.kanbanStages,
    this.metadata,
    required this.createdAt,
    required this.updatedAt,
    this.progress = 0.0,
    this.taskCount = 0,
    this.memberCount = 0,
    this.memberIds = const [],
    this.taskIds = const [],
  });

  factory Project.fromJson(Map<String, dynamic> json) {
    return Project(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      workspaceId: json['workspaceId'] ?? json['workspace_id'] as String,
      ownerId: json['ownerId'] ?? json['owner_id'] as String,
      type: _parseProjectType(json['type']),
      status: _parseProjectStatus(json['status']),
      priority: json['priority'] != null ? _parseProjectPriority(json['priority']) : null,
      leadId: json['leadId'] ?? json['lead_id'] as String?,
      startDate: json['startDate'] != null ? DateTime.parse(json['startDate']) : 
                 json['start_date'] != null ? DateTime.parse(json['start_date']) : null,
      endDate: json['endDate'] != null ? DateTime.parse(json['endDate']) : 
               json['end_date'] != null ? DateTime.parse(json['end_date']) : null,
      estimatedHours: json['estimatedHours']?.toDouble() ?? json['estimated_hours']?.toDouble(),
      budget: json['budget']?.toDouble(),
      isTemplate: json['isTemplate'] ?? json['is_template'] ?? false,
      kanbanStages: json['kanbanStages'] != null || json['kanban_stages'] != null
          ? (json['kanbanStages'] ?? json['kanban_stages'] as List)
              .map((stage) => KanbanStage.fromJson(stage))
              .toList()
          : null,
      metadata: json['metadata'] as Map<String, dynamic>?,
      createdAt: DateTime.parse(json['createdAt'] ?? json['created_at'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] ?? json['updated_at'] as String),
      progress: (json['progress'] as num?)?.toDouble() ?? 0.0,
      taskCount: json['taskCount'] as int? ?? json['task_count'] as int? ?? 0,
      memberCount: json['memberCount'] as int? ?? json['member_count'] as int? ?? 0,
      memberIds: json['memberIds'] != null ? List<String>.from(json['memberIds']) :
                json['member_ids'] != null ? List<String>.from(json['member_ids']) : const [],
      taskIds: json['taskIds'] != null ? List<String>.from(json['taskIds']) :
               json['task_ids'] != null ? List<String>.from(json['task_ids']) : const [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'workspaceId': workspaceId,
      'ownerId': ownerId,
      'type': type.value,
      'status': status.value,
      if (priority != null) 'priority': priority!.value,
      if (leadId != null) 'leadId': leadId,
      if (startDate != null) 'startDate': startDate!.toIso8601String(),
      if (endDate != null) 'endDate': endDate!.toIso8601String(),
      if (estimatedHours != null) 'estimatedHours': estimatedHours,
      if (budget != null) 'budget': budget,
      'isTemplate': isTemplate,
      if (kanbanStages != null) 'kanbanStages': kanbanStages!.map((stage) => stage.toJson()).toList(),
      if (metadata != null) 'metadata': metadata,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'progress': progress,
      'taskCount': taskCount,
      'memberCount': memberCount,
      'memberIds': memberIds,
      'taskIds': taskIds,
    };
  }

  Project copyWith({
    String? id,
    String? name,
    String? description,
    String? workspaceId,
    String? ownerId,
    ProjectType? type,
    ProjectStatus? status,
    ProjectPriority? priority,
    String? leadId,
    DateTime? startDate,
    DateTime? endDate,
    double? estimatedHours,
    double? budget,
    bool? isTemplate,
    List<KanbanStage>? kanbanStages,
    Map<String, dynamic>? metadata,
    DateTime? createdAt,
    DateTime? updatedAt,
    double? progress,
    int? taskCount,
    int? memberCount,
    List<String>? memberIds,
    List<String>? taskIds,
  }) {
    return Project(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      workspaceId: workspaceId ?? this.workspaceId,
      ownerId: ownerId ?? this.ownerId,
      type: type ?? this.type,
      status: status ?? this.status,
      priority: priority ?? this.priority,
      leadId: leadId ?? this.leadId,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      estimatedHours: estimatedHours ?? this.estimatedHours,
      budget: budget ?? this.budget,
      isTemplate: isTemplate ?? this.isTemplate,
      kanbanStages: kanbanStages ?? this.kanbanStages,
      metadata: metadata ?? this.metadata,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      progress: progress ?? this.progress,
      taskCount: taskCount ?? this.taskCount,
      memberCount: memberCount ?? this.memberCount,
      memberIds: memberIds ?? this.memberIds,
      taskIds: taskIds ?? this.taskIds,
    );
  }

  static ProjectType _parseProjectType(dynamic type) {
    if (type == null) return ProjectType.kanban;
    switch (type.toString().toLowerCase()) {
      case 'kanban': return ProjectType.kanban;
      case 'scrum': return ProjectType.scrum;
      case 'waterfall': return ProjectType.waterfall;
      case 'development': return ProjectType.development;
      case 'design': return ProjectType.design;
      case 'research': return ProjectType.research;
      case 'task': return ProjectType.task;
      default: return ProjectType.kanban;
    }
  }

  static ProjectStatus _parseProjectStatus(dynamic status) {
    if (status == null) return ProjectStatus.active;
    switch (status.toString().toLowerCase()) {
      case 'active': return ProjectStatus.active;
      case 'on_hold': return ProjectStatus.onHold;
      case 'completed': return ProjectStatus.completed;
      case 'archived': return ProjectStatus.archived;
      case 'paused': return ProjectStatus.paused;
      case 'cancelled': return ProjectStatus.cancelled;
      default: return ProjectStatus.active;
    }
  }

  static ProjectPriority _parseProjectPriority(dynamic priority) {
    if (priority == null) return ProjectPriority.medium;
    switch (priority.toString().toLowerCase()) {
      case 'low': return ProjectPriority.low;
      case 'medium': return ProjectPriority.medium;
      case 'high': return ProjectPriority.high;
      case 'critical': return ProjectPriority.critical;
      default: return ProjectPriority.medium;
    }
  }
}

enum ProjectType {
  kanban('Kanban', 'kanban'),
  scrum('Scrum', 'scrum'),
  waterfall('Waterfall', 'waterfall'),
  task('Task Management', 'task'),
  development('Development', 'development'),
  design('Design', 'design'),
  research('Research', 'research');

  const ProjectType(this.displayName, this.value);
  final String displayName;
  final String value;
}

enum ProjectStatus {
  active('Active', 'active'),
  onHold('On Hold', 'on_hold'),
  completed('Completed', 'completed'),
  archived('Archived', 'archived'),
  paused('Paused', 'paused'),
  cancelled('Cancelled', 'cancelled');

  const ProjectStatus(this.displayName, this.value);
  final String displayName;
  final String value;
}

enum ProjectPriority {
  low('Low', 'low'),
  medium('Medium', 'medium'),
  high('High', 'high'),
  critical('Critical', 'critical');

  const ProjectPriority(this.displayName, this.value);
  final String displayName;
  final String value;
}

class KanbanStage {
  final String id;
  final String name;
  final int order;
  final String color;

  const KanbanStage({
    required this.id,
    required this.name,
    required this.order,
    required this.color,
  });

  factory KanbanStage.fromJson(Map<String, dynamic> json) {
    return KanbanStage(
      id: json['id'] as String,
      name: json['name'] as String,
      order: json['order'] as int,
      color: json['color'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'order': order,
      'color': color,
    };
  }

  static List<KanbanStage> getDefaultStages() {
    return [
      const KanbanStage(id: 'todo', name: 'To Do', order: 1, color: '#6B7280'),
      const KanbanStage(id: 'in_progress', name: 'In Progress', order: 2, color: '#3B82F6'),
      const KanbanStage(id: 'review', name: 'Review', order: 3, color: '#F59E0B'),
      const KanbanStage(id: 'testing', name: 'Testing', order: 4, color: '#8B5CF6'),
      const KanbanStage(id: 'done', name: 'Done', order: 5, color: '#10B981'),
    ];
  }
}

class Task {
  final String id;
  final String projectId;
  final String title;
  final String? description;
  final TaskType taskType;
  final TaskStatus status;
  final TaskPriority priority;
  final String? sprintId;
  final String? parentTaskId;
  final String? assignedTo;
  final String? assigneeTeamMemberId;
  final String? reporterTeamMemberId;
  final String? assigneeName;
  final DateTime? dueDate;
  final double? estimatedHours;
  final double? actualHours;
  final int? storyPoints;
  final List<String>? labels;
  final List<TaskComment>? comments;
  final List<TaskAttachment>? attachments;
  final List<TaskDependency>? dependencies;
  final List<String>? dependencyIds; // Simple list of task IDs this task depends on
  final Map<String, dynamic>? metadata;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Task({
    required this.id,
    required this.projectId,
    required this.title,
    this.description,
    this.taskType = TaskType.task,
    required this.status,
    required this.priority,
    this.sprintId,
    this.parentTaskId,
    this.assignedTo,
    this.assigneeTeamMemberId,
    this.reporterTeamMemberId,
    this.assigneeName,
    this.dueDate,
    this.estimatedHours,
    this.actualHours,
    this.storyPoints,
    this.labels,
    this.comments,
    this.attachments,
    this.dependencies,
    this.dependencyIds,
    this.metadata,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Task.fromJson(Map<String, dynamic> json) {
    return Task(
      id: json['id'] as String,
      projectId: json['projectId'] ?? json['project_id'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      taskType: _parseTaskType(json['taskType'] ?? json['task_type']),
      status: _parseTaskStatus(json['status']),
      priority: _parseTaskPriority(json['priority']),
      sprintId: json['sprintId'] ?? json['sprint_id'] as String?,
      parentTaskId: json['parentTaskId'] ?? json['parent_task_id'] as String?,
      assignedTo: json['assignedTo'] ?? json['assigned_to'] as String?,
      assigneeTeamMemberId: json['assigneeTeamMemberId'] ?? json['assignee_team_member_id'] as String?,
      reporterTeamMemberId: json['reporterTeamMemberId'] ?? json['reporter_team_member_id'] as String?,
      assigneeName: json['assigneeName'] ?? json['assignee_name'] as String?,
      dueDate: json['dueDate'] != null ? DateTime.parse(json['dueDate']) :
               json['due_date'] != null ? DateTime.parse(json['due_date']) : null,
      estimatedHours: json['estimatedHours']?.toDouble() ?? json['estimated_hours']?.toDouble(),
      actualHours: json['actualHours']?.toDouble() ?? json['actual_hours']?.toDouble(),
      storyPoints: json['storyPoints'] as int? ?? json['story_points'] as int?,
      labels: json['labels'] != null ? List<String>.from(json['labels']) : null,
      comments: json['comments'] != null
          ? (json['comments'] as List).map((c) => TaskComment.fromJson(c)).toList()
          : null,
      attachments: json['attachments'] != null
          ? (json['attachments'] as List).map((a) => TaskAttachment.fromJson(a)).toList()
          : null,
      dependencies: json['dependencies'] != null
          ? (json['dependencies'] as List).map((d) => TaskDependency.fromJson(d)).toList()
          : null,
      dependencyIds: json['dependencyIds'] != null ? List<String>.from(json['dependencyIds']) :
                     json['dependency_ids'] != null ? List<String>.from(json['dependency_ids']) : null,
      metadata: json['metadata'] as Map<String, dynamic>?,
      createdAt: DateTime.parse(json['createdAt'] ?? json['created_at'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] ?? json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'projectId': projectId,
      'title': title,
      if (description != null) 'description': description,
      'taskType': taskType.value,
      'status': status.value,
      'priority': priority.value,
      if (sprintId != null) 'sprintId': sprintId,
      if (parentTaskId != null) 'parentTaskId': parentTaskId,
      if (assignedTo != null) 'assignedTo': assignedTo,
      if (assigneeTeamMemberId != null) 'assigneeTeamMemberId': assigneeTeamMemberId,
      if (reporterTeamMemberId != null) 'reporterTeamMemberId': reporterTeamMemberId,
      if (assigneeName != null) 'assigneeName': assigneeName,
      if (dueDate != null) 'dueDate': dueDate!.toIso8601String(),
      if (estimatedHours != null) 'estimatedHours': estimatedHours,
      if (actualHours != null) 'actualHours': actualHours,
      if (storyPoints != null) 'storyPoints': storyPoints,
      if (labels != null) 'labels': labels,
      if (comments != null) 'comments': comments!.map((c) => c.toJson()).toList(),
      if (attachments != null) 'attachments': attachments!.map((a) => a.toJson()).toList(),
      if (dependencies != null) 'dependencies': dependencies!.map((d) => d.toJson()).toList(),
      if (dependencyIds != null) 'dependencyIds': dependencyIds,
      if (metadata != null) 'metadata': metadata,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  Task copyWith({
    String? id,
    String? projectId,
    String? title,
    String? description,
    TaskType? taskType,
    TaskStatus? status,
    TaskPriority? priority,
    String? sprintId,
    String? parentTaskId,
    String? assignedTo,
    String? assigneeTeamMemberId,
    String? reporterTeamMemberId,
    String? assigneeName,
    DateTime? dueDate,
    double? estimatedHours,
    double? actualHours,
    int? storyPoints,
    List<String>? labels,
    List<TaskComment>? comments,
    List<TaskAttachment>? attachments,
    List<TaskDependency>? dependencies,
    List<String>? dependencyIds,
    Map<String, dynamic>? metadata,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Task(
      id: id ?? this.id,
      projectId: projectId ?? this.projectId,
      title: title ?? this.title,
      description: description ?? this.description,
      taskType: taskType ?? this.taskType,
      status: status ?? this.status,
      priority: priority ?? this.priority,
      sprintId: sprintId ?? this.sprintId,
      parentTaskId: parentTaskId ?? this.parentTaskId,
      assignedTo: assignedTo ?? this.assignedTo,
      assigneeTeamMemberId: assigneeTeamMemberId ?? this.assigneeTeamMemberId,
      reporterTeamMemberId: reporterTeamMemberId ?? this.reporterTeamMemberId,
      assigneeName: assigneeName ?? this.assigneeName,
      dueDate: dueDate ?? this.dueDate,
      estimatedHours: estimatedHours ?? this.estimatedHours,
      actualHours: actualHours ?? this.actualHours,
      storyPoints: storyPoints ?? this.storyPoints,
      labels: labels ?? this.labels,
      comments: comments ?? this.comments,
      attachments: attachments ?? this.attachments,
      dependencies: dependencies ?? this.dependencies,
      dependencyIds: dependencyIds ?? this.dependencyIds,
      metadata: metadata ?? this.metadata,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  static TaskType _parseTaskType(dynamic type) {
    if (type == null) return TaskType.task;
    switch (type.toString().toLowerCase()) {
      case 'task': return TaskType.task;
      case 'story': return TaskType.story;
      case 'bug': return TaskType.bug;
      case 'epic': return TaskType.epic;
      case 'subtask': return TaskType.subtask;
      default: return TaskType.task;
    }
  }

  static TaskStatus _parseTaskStatus(dynamic status) {
    if (status == null) return TaskStatus.todo;
    switch (status.toString().toLowerCase()) {
      case 'todo': return TaskStatus.todo;
      case 'in_progress': return TaskStatus.inProgress;
      case 'review': return TaskStatus.review;
      case 'testing': return TaskStatus.testing;
      case 'done': return TaskStatus.done;
      case 'completed': return TaskStatus.done;
      case 'cancelled': return TaskStatus.cancelled;
      default: return TaskStatus.todo;
    }
  }

  static TaskPriority _parseTaskPriority(dynamic priority) {
    if (priority == null) return TaskPriority.medium;
    switch (priority.toString().toLowerCase()) {
      case 'lowest': return TaskPriority.lowest;
      case 'low': return TaskPriority.low;
      case 'medium': return TaskPriority.medium;
      case 'high': return TaskPriority.high;
      case 'highest': return TaskPriority.highest;
      default: return TaskPriority.medium;
    }
  }
}

enum TaskType {
  task('Task', 'task'),
  story('Story', 'story'),
  bug('Bug', 'bug'),
  epic('Epic', 'epic'),
  subtask('Subtask', 'subtask');

  const TaskType(this.displayName, this.value);
  final String displayName;
  final String value;
}

enum TaskStatus {
  todo('To Do', 'todo'),
  inProgress('In Progress', 'in_progress'),
  review('Review', 'review'),
  testing('Testing', 'testing'),
  done('Done', 'done'),
  completed('Completed', 'completed'),
  cancelled('Cancelled', 'cancelled');

  const TaskStatus(this.displayName, this.value);
  final String displayName;
  final String value;
}

enum TaskPriority {
  lowest('Lowest', 'lowest'),
  low('Low', 'low'),
  medium('Medium', 'medium'),
  high('High', 'high'),
  highest('Highest', 'highest');

  const TaskPriority(this.displayName, this.value);
  final String displayName;
  final String value;
}

class Sprint {
  final String id;
  final String projectId;
  final String name;
  final String? goal;
  final DateTime startDate;
  final DateTime endDate;
  final SprintStatus status;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Sprint({
    required this.id,
    required this.projectId,
    required this.name,
    this.goal,
    required this.startDate,
    required this.endDate,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Sprint.fromJson(Map<String, dynamic> json) {
    return Sprint(
      id: json['id'] as String,
      projectId: json['projectId'] ?? json['project_id'] as String,
      name: json['name'] as String,
      goal: json['goal'] as String?,
      startDate: DateTime.parse(json['startDate'] ?? json['start_date'] as String),
      endDate: DateTime.parse(json['endDate'] ?? json['end_date'] as String),
      status: _parseSprintStatus(json['status']),
      createdAt: DateTime.parse(json['createdAt'] ?? json['created_at'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] ?? json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'projectId': projectId,
      'name': name,
      if (goal != null) 'goal': goal,
      'startDate': startDate.toIso8601String(),
      'endDate': endDate.toIso8601String(),
      'status': status.value,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  static SprintStatus _parseSprintStatus(dynamic status) {
    if (status == null) return SprintStatus.planning;
    switch (status.toString().toLowerCase()) {
      case 'planning': return SprintStatus.planning;
      case 'active': return SprintStatus.active;
      case 'completed': return SprintStatus.completed;
      default: return SprintStatus.planning;
    }
  }
}

enum SprintStatus {
  planning('Planning', 'planning'),
  active('Active', 'active'),
  completed('Completed', 'completed');

  const SprintStatus(this.displayName, this.value);
  final String displayName;
  final String value;
}

class TaskComment {
  final String id;
  final String taskId;
  final String authorId;
  final String authorName;
  final String content;
  final DateTime createdAt;
  final DateTime updatedAt;

  const TaskComment({
    required this.id,
    required this.taskId,
    required this.authorId,
    required this.authorName,
    required this.content,
    required this.createdAt,
    required this.updatedAt,
  });

  factory TaskComment.fromJson(Map<String, dynamic> json) {
    return TaskComment(
      id: json['id'] as String,
      taskId: json['taskId'] ?? json['task_id'] as String,
      authorId: json['authorId'] ?? json['author_id'] as String,
      authorName: json['authorName'] ?? json['author_name'] as String,
      content: json['content'] as String,
      createdAt: DateTime.parse(json['createdAt'] ?? json['created_at'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] ?? json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'taskId': taskId,
      'authorId': authorId,
      'authorName': authorName,
      'content': content,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}

class TaskAttachment {
  final String id;
  final String taskId;
  final String fileName;
  final String originalName;
  final String mimeType;
  final int size;
  final String url;
  final DateTime createdAt;

  const TaskAttachment({
    required this.id,
    required this.taskId,
    required this.fileName,
    required this.originalName,
    required this.mimeType,
    required this.size,
    required this.url,
    required this.createdAt,
  });

  factory TaskAttachment.fromJson(Map<String, dynamic> json) {
    return TaskAttachment(
      id: json['id'] as String,
      taskId: json['taskId'] ?? json['task_id'] as String,
      fileName: json['fileName'] ?? json['file_name'] as String,
      originalName: json['originalName'] ?? json['original_name'] as String,
      mimeType: json['mimeType'] ?? json['mime_type'] as String,
      size: json['size'] as int,
      url: json['url'] as String,
      createdAt: DateTime.parse(json['createdAt'] ?? json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'taskId': taskId,
      'fileName': fileName,
      'originalName': originalName,
      'mimeType': mimeType,
      'size': size,
      'url': url,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}

/// Represents a dependency between two tasks
class TaskDependency {
  final String id;
  final String taskId;
  final String dependsOnTaskId;
  final DependencyType dependencyType;
  final int lagDays;
  final bool isCriticalPath;
  final String createdBy;
  final DateTime createdAt;
  final DateTime updatedAt;

  // Populated fields for display
  final String? dependsOnTaskTitle;
  final TaskStatus? dependsOnTaskStatus;

  const TaskDependency({
    required this.id,
    required this.taskId,
    required this.dependsOnTaskId,
    this.dependencyType = DependencyType.blocks,
    this.lagDays = 0,
    this.isCriticalPath = false,
    required this.createdBy,
    required this.createdAt,
    required this.updatedAt,
    this.dependsOnTaskTitle,
    this.dependsOnTaskStatus,
  });

  factory TaskDependency.fromJson(Map<String, dynamic> json) {
    return TaskDependency(
      id: json['id'] as String,
      taskId: json['taskId'] ?? json['task_id'] as String,
      dependsOnTaskId: json['dependsOnTaskId'] ?? json['depends_on_task_id'] as String,
      dependencyType: _parseDependencyType(json['dependencyType'] ?? json['dependency_type']),
      lagDays: json['lagDays'] ?? json['lag_days'] ?? 0,
      isCriticalPath: json['isCriticalPath'] ?? json['is_critical_path'] ?? false,
      createdBy: json['createdBy'] ?? json['created_by'] as String,
      createdAt: DateTime.parse(json['createdAt'] ?? json['created_at'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] ?? json['updated_at'] as String),
      dependsOnTaskTitle: json['dependsOnTaskTitle'] ?? json['depends_on_task_title'],
      dependsOnTaskStatus: json['dependsOnTaskStatus'] != null || json['depends_on_task_status'] != null
          ? Task._parseTaskStatus(json['dependsOnTaskStatus'] ?? json['depends_on_task_status'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'taskId': taskId,
      'dependsOnTaskId': dependsOnTaskId,
      'dependencyType': dependencyType.value,
      'lagDays': lagDays,
      'isCriticalPath': isCriticalPath,
      'createdBy': createdBy,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  static DependencyType _parseDependencyType(dynamic type) {
    if (type == null) return DependencyType.blocks;
    switch (type.toString().toLowerCase()) {
      case 'blocks': return DependencyType.blocks;
      case 'blocked_by': return DependencyType.blockedBy;
      case 'finish_to_start': return DependencyType.finishToStart;
      case 'start_to_start': return DependencyType.startToStart;
      case 'finish_to_finish': return DependencyType.finishToFinish;
      case 'start_to_finish': return DependencyType.startToFinish;
      default: return DependencyType.blocks;
    }
  }
}

enum DependencyType {
  blocks('Blocks', 'blocks'),
  blockedBy('Blocked By', 'blocked_by'),
  finishToStart('Finish to Start', 'finish_to_start'),
  startToStart('Start to Start', 'start_to_start'),
  finishToFinish('Finish to Finish', 'finish_to_finish'),
  startToFinish('Start to Finish', 'start_to_finish');

  const DependencyType(this.displayName, this.value);
  final String displayName;
  final String value;
}

class ProjectTemplate {
  final String id;
  final String name;
  final String? description;
  final ProjectType type;
  final List<KanbanStage>? kanbanStages;
  final List<TaskTemplate>? taskTemplates;
  final Map<String, dynamic>? metadata;

  const ProjectTemplate({
    required this.id,
    required this.name,
    this.description,
    required this.type,
    this.kanbanStages,
    this.taskTemplates,
    this.metadata,
  });

  factory ProjectTemplate.fromJson(Map<String, dynamic> json) {
    return ProjectTemplate(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      type: Project._parseProjectType(json['type']),
      kanbanStages: json['kanbanStages'] != null
          ? (json['kanbanStages'] as List)
              .map((stage) => KanbanStage.fromJson(stage))
              .toList()
          : null,
      taskTemplates: json['taskTemplates'] != null
          ? (json['taskTemplates'] as List)
              .map((task) => TaskTemplate.fromJson(task))
              .toList()
          : null,
      metadata: json['metadata'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      if (description != null) 'description': description,
      'type': type.value,
      if (kanbanStages != null) 'kanbanStages': kanbanStages!.map((s) => s.toJson()).toList(),
      if (taskTemplates != null) 'taskTemplates': taskTemplates!.map((t) => t.toJson()).toList(),
      if (metadata != null) 'metadata': metadata,
    };
  }
}

class TaskTemplate {
  final String id;
  final String name;
  final String? description;
  final TaskType taskType;
  final TaskPriority priority;
  final double? estimatedHours;
  final int? storyPoints;
  final List<String>? labels;

  const TaskTemplate({
    required this.id,
    required this.name,
    this.description,
    this.taskType = TaskType.task,
    this.priority = TaskPriority.medium,
    this.estimatedHours,
    this.storyPoints,
    this.labels,
  });

  factory TaskTemplate.fromJson(Map<String, dynamic> json) {
    return TaskTemplate(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      taskType: Task._parseTaskType(json['taskType']),
      priority: Task._parseTaskPriority(json['priority']),
      estimatedHours: json['estimatedHours']?.toDouble(),
      storyPoints: json['storyPoints'] as int?,
      labels: json['labels'] != null ? List<String>.from(json['labels']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      if (description != null) 'description': description,
      'taskType': taskType.value,
      'priority': priority.value,
      if (estimatedHours != null) 'estimatedHours': estimatedHours,
      if (storyPoints != null) 'storyPoints': storyPoints,
      if (labels != null) 'labels': labels,
    };
  }
}