/// Holds assignee information returned from backend
/// Backend returns: { id, name, email, avatar_url }
class TaskAssigneeInfo {
  final String id;
  final String? name;
  final String? email;
  final String? avatarUrl;

  const TaskAssigneeInfo({
    required this.id,
    this.name,
    this.email,
    this.avatarUrl,
  });

  factory TaskAssigneeInfo.fromJson(Map<String, dynamic> json) {
    return TaskAssigneeInfo(
      id: json['id'] as String? ?? '',
      name: json['name'] as String?,
      email: json['email'] as String?,
      avatarUrl: json['avatar_url'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'avatar_url': avatarUrl,
    };
  }
}

class Task {
  final String id;
  final String projectId;
  final String? sprintId;
  final String? parentTaskId;
  final String taskType; // 'task', 'story', 'bug', 'epic'
  final String title;
  final String? description;
  final String status; // 'todo', 'in_progress', 'done', etc.
  final String priority; // 'lowest', 'low', 'medium', 'high', 'highest'
  final String? assigneeId; // Keep for backward compatibility
  final String? assigneeTeamMemberId;
  final String? assignedTo; // User ID of first assignee
  final List<TaskAssigneeInfo> assignees; // Full assignee info (name, avatar, etc.)
  final String? reporterId; // Keep for backward compatibility
  final String? reporterTeamMemberId;
  final DateTime? dueDate;
  final DateTime? completedAt;
  final String? completedBy;
  final double? estimatedHours;
  final double? actualHours;
  final int? storyPoints;
  final List<String> labels;
  final List<TaskAttachment> attachments;
  final Map<String, dynamic> collaborativeData;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String? createdBy; // User ID who created the task

  const Task({
    required this.id,
    required this.projectId,
    this.sprintId,
    this.parentTaskId,
    this.taskType = 'task',
    required this.title,
    this.description,
    this.status = 'todo',
    this.priority = 'medium',
    this.assigneeId,
    this.assigneeTeamMemberId,
    this.assignedTo,
    this.assignees = const [],
    this.reporterId,
    this.reporterTeamMemberId,
    this.dueDate,
    this.completedAt,
    this.completedBy,
    this.estimatedHours,
    this.actualHours,
    this.storyPoints,
    this.labels = const [],
    this.attachments = const [],
    this.collaborativeData = const {},
    required this.createdAt,
    required this.updatedAt,
    this.createdBy,
  });

  factory Task.fromJson(Map<String, dynamic> json) {
    try {
      return Task(
        id: json['id'] as String,
        projectId: json['project_id'] as String,
        sprintId: json['sprint_id'] as String?,
        parentTaskId: json['parent_task_id'] as String?,
        taskType: json['task_type'] as String? ?? 'task',
        title: json['title'] as String,
        description: json['description'] as String? ?? '',
        status: _parseStatus(json['status']),
        priority: _parsePriority(json['priority']),
        assigneeId: json['assignee_id'] as String?,
        assigneeTeamMemberId: json['assignee_team_member_id'] as String?,
        assignedTo: _parseAssignedTo(json['assigned_to']),
        assignees: _parseAssignees(json['assigned_to']),
        reporterId: json['reporter_id'] as String?,
        reporterTeamMemberId: json['reporter_team_member_id'] as String?,
        dueDate: _parseDateTimeField(json['due_date']),
        completedAt: _parseDateTimeField(json['completed_at']),
        completedBy: json['completed_by'] as String?,
        estimatedHours: _parseDoubleField(json['estimated_hours']),
        actualHours: _parseDoubleField(json['actual_hours']),
        storyPoints: _parseIntField(json['story_points']),
        labels: _parseStringList(json['labels']),
        attachments: _parseAttachments(json['attachments']),
        collaborativeData: _parseCollaborativeData(json['collaborative_data']),
        createdAt: DateTime.parse(json['created_at'] as String),
        updatedAt: DateTime.parse(json['updated_at'] as String),
        createdBy: json['created_by'] as String?,
      );
    } catch (e) {
      rethrow;
    }
  }

  static String? _parseAssignedTo(dynamic value) {
    if (value == null) return null;

    // Handle array format (backend returns array of user objects or strings)
    if (value is List) {
      if (value.isEmpty) return null;
      final first = value.first;

      // Handle user object format: { id, name, email, avatar_url }
      if (first is Map<String, dynamic>) {
        return first['id'] as String?;
      }
      if (first is Map) {
        return first['id']?.toString();
      }

      // Handle string format
      if (first is String) {
        return first;
      }

      return null;
    }

    // Handle single user object format
    if (value is Map<String, dynamic>) {
      return value['id'] as String?;
    }
    if (value is Map) {
      return value['id']?.toString();
    }

    // Handle string format (backwards compatibility)
    if (value is String) {
      return value;
    }

    return null;
  }

  /// Parse the full list of assignees with their info
  static List<TaskAssigneeInfo> _parseAssignees(dynamic value) {
    if (value == null) return [];

    if (value is List) {
      return value.map((item) {
        if (item is Map<String, dynamic>) {
          return TaskAssigneeInfo.fromJson(item);
        }
        if (item is Map) {
          return TaskAssigneeInfo.fromJson(Map<String, dynamic>.from(item));
        }
        // Handle string format - create minimal assignee info
        if (item is String) {
          return TaskAssigneeInfo(id: item);
        }
        return null;
      }).whereType<TaskAssigneeInfo>().toList();
    }

    return [];
  }

  static String _parseStatus(dynamic value) {
    if (value == null) return '1'; // Default to first status

    // Handle numeric status codes - preserve as string for dynamic kanban stages
    // The actual stage name will be resolved in the UI using project's kanban_stages
    if (value is int) {
      return value.toString();
    }

    // Handle string values
    if (value is String) {
      return value;
    }

    return '1';
  }

  static String _parsePriority(dynamic value) {
    if (value == null) return 'medium';

    // Handle numeric priority codes
    if (value is int) {
      switch (value) {
        case 0:
          return 'lowest';
        case 1:
          return 'low';
        case 2:
          return 'medium';
        case 3:
          return 'high';
        case 4:
          return 'highest';
        default:
          return 'medium';
      }
    }

    // Handle string numeric codes
    if (value is String) {
      final numValue = int.tryParse(value);
      if (numValue != null) {
        switch (numValue) {
          case 0:
            return 'lowest';
          case 1:
            return 'low';
          case 2:
            return 'medium';
          case 3:
            return 'high';
          case 4:
            return 'highest';
          default:
            return value;
        }
      }
      // Return as-is if it's already a string priority
      return value;
    }

    return 'medium';
  }

  static DateTime? _parseDateTimeField(dynamic value) {
    if (value == null) return null;
    if (value is String && value.isNotEmpty) {
      try {
        return DateTime.parse(value);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  static double? _parseDoubleField(dynamic value) {
    if (value == null) return null;
    if (value is num) return value.toDouble();
    if (value is String) {
      final parsed = double.tryParse(value);
      return parsed;
    }
    return null;
  }

  static int? _parseIntField(dynamic value) {
    if (value == null) return null;
    if (value is int) return value;
    if (value is num) return value.toInt();
    if (value is String) {
      final parsed = int.tryParse(value);
      return parsed;
    }
    return null;
  }

  static List<String> _parseStringList(dynamic value) {
    if (value == null) return [];
    if (value is List) {
      return value.map((e) => e.toString()).toList();
    }
    return [];
  }

  static List<TaskAttachment> _parseAttachments(dynamic value) {
    if (value == null) return [];
    if (value is List) {
      try {
        return value.map((att) {
          if (att is Map<String, dynamic>) {
            return TaskAttachment.fromJson(att);
          } else {
            return null;
          }
        }).whereType<TaskAttachment>().toList();
      } catch (e) {
        return [];
      }
    }
    return [];
  }

  static Map<String, dynamic> _parseCollaborativeData(dynamic value) {
    if (value == null) return {};
    if (value is Map<String, dynamic>) return value;
    if (value is Map) {
      try {
        return Map<String, dynamic>.from(value);
      } catch (e) {
        return {};
      }
    }
    return {};
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'project_id': projectId,
      'sprint_id': sprintId,
      'parent_task_id': parentTaskId,
      'task_type': taskType,
      'title': title,
      'description': description,
      'status': status,
      'priority': priority,
      'assignee_id': assigneeId,
      'assignee_team_member_id': assigneeTeamMemberId,
      // Backend expects array of user IDs or objects
      'assigned_to': assignees.isNotEmpty
          ? assignees.map((a) => a.toJson()).toList()
          : (assignedTo != null ? [assignedTo] : null),
      'reporter_id': reporterId,
      'reporter_team_member_id': reporterTeamMemberId,
      'due_date': dueDate?.toIso8601String(),
      'completed_at': completedAt?.toIso8601String(),
      'completed_by': completedBy,
      'estimated_hours': estimatedHours,
      'actual_hours': actualHours,
      'story_points': storyPoints,
      'labels': labels,
      'attachments': attachments.map((att) => att.toJson()).toList(),
      'collaborative_data': collaborativeData,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
      'created_by': createdBy,
    };
  }

  Task copyWith({
    String? id,
    String? projectId,
    String? sprintId,
    String? parentTaskId,
    String? taskType,
    String? title,
    String? description,
    String? status,
    String? priority,
    String? assigneeId,
    String? assigneeTeamMemberId,
    String? assignedTo,
    List<TaskAssigneeInfo>? assignees,
    String? reporterId,
    String? reporterTeamMemberId,
    DateTime? dueDate,
    DateTime? completedAt,
    String? completedBy,
    double? estimatedHours,
    double? actualHours,
    int? storyPoints,
    List<String>? labels,
    List<TaskAttachment>? attachments,
    Map<String, dynamic>? collaborativeData,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? createdBy,
  }) {
    return Task(
      id: id ?? this.id,
      projectId: projectId ?? this.projectId,
      sprintId: sprintId ?? this.sprintId,
      parentTaskId: parentTaskId ?? this.parentTaskId,
      taskType: taskType ?? this.taskType,
      title: title ?? this.title,
      description: description ?? this.description,
      status: status ?? this.status,
      priority: priority ?? this.priority,
      assigneeId: assigneeId ?? this.assigneeId,
      assigneeTeamMemberId: assigneeTeamMemberId ?? this.assigneeTeamMemberId,
      assignedTo: assignedTo ?? this.assignedTo,
      assignees: assignees ?? this.assignees,
      reporterId: reporterId ?? this.reporterId,
      reporterTeamMemberId: reporterTeamMemberId ?? this.reporterTeamMemberId,
      dueDate: dueDate ?? this.dueDate,
      completedAt: completedAt ?? this.completedAt,
      completedBy: completedBy ?? this.completedBy,
      estimatedHours: estimatedHours ?? this.estimatedHours,
      actualHours: actualHours ?? this.actualHours,
      storyPoints: storyPoints ?? this.storyPoints,
      labels: labels ?? this.labels,
      attachments: attachments ?? this.attachments,
      collaborativeData: collaborativeData ?? this.collaborativeData,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      createdBy: createdBy ?? this.createdBy,
    );
  }
}

class TaskAssignee {
  final String id;
  final String taskId;
  final String userId;
  final DateTime assignedAt;
  final String assignedBy;

  const TaskAssignee({
    required this.id,
    required this.taskId,
    required this.userId,
    required this.assignedAt,
    required this.assignedBy,
  });

  factory TaskAssignee.fromJson(Map<String, dynamic> json) {
    return TaskAssignee(
      id: json['id'] as String,
      taskId: json['task_id'] as String,
      userId: json['user_id'] as String,
      assignedAt: DateTime.parse(json['assigned_at'] as String),
      assignedBy: json['assigned_by'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'task_id': taskId,
      'user_id': userId,
      'assigned_at': assignedAt.toIso8601String(),
      'assigned_by': assignedBy,
    };
  }
}

class TaskComment {
  final String id;
  final String taskId;
  final String userId;
  final String content;
  final String? contentHtml;
  final List<TaskAttachment> attachments;
  final bool isEdited;
  final bool isDeleted;
  final DateTime createdAt;
  final DateTime updatedAt;

  const TaskComment({
    required this.id,
    required this.taskId,
    required this.userId,
    required this.content,
    this.contentHtml,
    this.attachments = const [],
    this.isEdited = false,
    this.isDeleted = false,
    required this.createdAt,
    required this.updatedAt,
  });

  factory TaskComment.fromJson(Map<String, dynamic> json) {
    return TaskComment(
      id: json['id'] as String,
      taskId: json['task_id'] as String,
      userId: json['user_id'] as String,
      content: json['content'] as String,
      contentHtml: json['content_html'] as String?,
      attachments: json['attachments'] != null 
          ? (json['attachments'] as List).map((att) => TaskAttachment.fromJson(att)).toList()
          : [],
      isEdited: json['is_edited'] as bool? ?? false,
      isDeleted: json['is_deleted'] as bool? ?? false,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'task_id': taskId,
      'user_id': userId,
      'content': content,
      'content_html': contentHtml,
      'attachments': attachments.map((att) => att.toJson()).toList(),
      'is_edited': isEdited,
      'is_deleted': isDeleted,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }
}

class TaskAttachment {
  final String id;
  final String taskId;
  final String fileId;
  final String uploadedBy;
  final DateTime uploadedAt;
  final String? fileName;
  final String? fileUrl;
  final int? fileSize;
  final String? mimeType;

  const TaskAttachment({
    required this.id,
    required this.taskId,
    required this.fileId,
    required this.uploadedBy,
    required this.uploadedAt,
    this.fileName,
    this.fileUrl,
    this.fileSize,
    this.mimeType,
  });

  factory TaskAttachment.fromJson(Map<String, dynamic> json) {
    return TaskAttachment(
      id: json['id'] as String,
      taskId: json['task_id'] as String,
      fileId: json['file_id'] as String,
      uploadedBy: json['uploaded_by'] as String,
      uploadedAt: DateTime.parse(json['uploaded_at'] as String),
      fileName: json['file_name'] as String?,
      fileUrl: json['file_url'] as String?,
      fileSize: json['file_size'] as int?,
      mimeType: json['mime_type'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'task_id': taskId,
      'file_id': fileId,
      'uploaded_by': uploadedBy,
      'uploaded_at': uploadedAt.toIso8601String(),
      'file_name': fileName,
      'file_url': fileUrl,
      'file_size': fileSize,
      'mime_type': mimeType,
    };
  }
}

// Enums for better type safety
enum TaskType {
  task('task', 'Task'),
  story('story', 'Story'),
  bug('bug', 'Bug'),
  epic('epic', 'Epic');

  const TaskType(this.value, this.displayName);
  final String value;
  final String displayName;
}

enum TaskStatus {
  todo('todo', 'To Do'),
  inProgress('in_progress', 'In Progress'),
  inReview('in_review', 'In Review'),
  testing('testing', 'Testing'),
  done('done', 'Done'),
  cancelled('cancelled', 'Cancelled');

  const TaskStatus(this.value, this.displayName);
  final String value;
  final String displayName;
}

enum TaskPriority {
  lowest('lowest', 'Lowest'),
  low('low', 'Low'),
  medium('medium', 'Medium'),
  high('high', 'High'),
  highest('highest', 'Highest');

  const TaskPriority(this.value, this.displayName);
  final String value;
  final String displayName;
}