class Project {
  final String id;
  final String workspaceId;
  final String name;
  final String? description;
  final String type; // 'kanban', etc.
  final String status; // 'active', 'completed', 'paused', 'cancelled'
  final String? priority;
  final String? ownerId;
  final String? leadId;
  final String? startDate;
  final String? endDate;
  final double? estimatedHours;
  final double? actualHours;
  final double? budget;
  final bool isTemplate;
  final List<KanbanStage> kanbanStages;
  final List<String> defaultAssignees; // Default assignee user IDs for the project
  final DateTime? archivedAt;
  final String? archivedBy;
  final Map<String, dynamic> settings;
  final Map<String, dynamic> collaborativeData;
  final Map<String, dynamic> attachments; // Top-level attachments field
  final DateTime createdAt;
  final DateTime updatedAt;

  const Project({
    required this.id,
    required this.workspaceId,
    required this.name,
    this.description,
    this.type = 'kanban',
    this.status = 'active',
    this.priority,
    this.ownerId,
    this.leadId,
    this.startDate,
    this.endDate,
    this.estimatedHours,
    this.actualHours,
    this.budget,
    this.isTemplate = false,
    this.kanbanStages = const [],
    this.defaultAssignees = const [],
    this.archivedAt,
    this.archivedBy,
    this.settings = const {},
    this.collaborativeData = const {},
    this.attachments = const {},
    required this.createdAt,
    required this.updatedAt,
  });

  factory Project.fromJson(Map<String, dynamic> json) {
    try {
      return Project(
        id: _parseStringField(json['id']) ?? '',
        workspaceId: _parseStringField(json['workspace_id']) ?? '',
        name: _parseStringField(json['name']) ?? 'Untitled Project',
        description: _parseStringField(json['description']),
        type: _parseStringField(json['type']) ?? 'kanban',
        status: _parseStringField(json['status']) ?? 'active',
        priority: _parseStringField(json['priority']),
        ownerId: _parseStringField(json['owner_id']),
        leadId: _parseStringField(json['lead_id']),
        startDate: _parseStringField(json['start_date']),
        endDate: _parseStringField(json['end_date']),
        estimatedHours: _parseDoubleField(json['estimated_hours']),
        actualHours: _parseDoubleField(json['actual_hours']),
        budget: _parseDoubleField(json['budget']),
        isTemplate: _parseBoolField(json['is_template']) ?? false,
        kanbanStages: _parseKanbanStages(json['kanban_stages']),
        defaultAssignees: _parseStringList(json['default_assignees']),
        archivedAt: _parseDateTimeField(json['archived_at']),
        archivedBy: _parseStringField(json['archived_by']),
        settings: _parseMapField(json['settings']) ?? {},
        collaborativeData: _parseMapField(json['collaborative_data']) ?? {},
        attachments: _parseMapField(json['attachments']) ?? {},
        createdAt: _parseDateTimeField(json['created_at']) ?? DateTime.now(),
        updatedAt: _parseDateTimeField(json['updated_at']) ?? DateTime.now(),
      );
    } catch (e) {
      rethrow;
    }
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'workspace_id': workspaceId,
      'name': name,
      'description': description,
      'type': type,
      'status': status,
      'priority': priority,
      'owner_id': ownerId,
      'lead_id': leadId,
      'start_date': startDate,
      'end_date': endDate,
      'estimated_hours': estimatedHours,
      'actual_hours': actualHours,
      'budget': budget,
      'is_template': isTemplate,
      'kanban_stages': kanbanStages.map((stage) => stage.toJson()).toList(),
      'default_assignees': defaultAssignees,
      'archived_at': archivedAt?.toIso8601String(),
      'archived_by': archivedBy,
      'settings': settings,
      'collaborative_data': collaborativeData,
      'attachments': attachments,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  Project copyWith({
    String? id,
    String? workspaceId,
    String? name,
    String? description,
    String? type,
    String? status,
    String? priority,
    String? ownerId,
    String? leadId,
    String? startDate,
    String? endDate,
    double? estimatedHours,
    double? actualHours,
    double? budget,
    bool? isTemplate,
    List<KanbanStage>? kanbanStages,
    List<String>? defaultAssignees,
    DateTime? archivedAt,
    String? archivedBy,
    Map<String, dynamic>? settings,
    Map<String, dynamic>? collaborativeData,
    Map<String, dynamic>? attachments,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Project(
      id: id ?? this.id,
      workspaceId: workspaceId ?? this.workspaceId,
      name: name ?? this.name,
      description: description ?? this.description,
      type: type ?? this.type,
      status: status ?? this.status,
      priority: priority ?? this.priority,
      ownerId: ownerId ?? this.ownerId,
      leadId: leadId ?? this.leadId,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      estimatedHours: estimatedHours ?? this.estimatedHours,
      actualHours: actualHours ?? this.actualHours,
      budget: budget ?? this.budget,
      isTemplate: isTemplate ?? this.isTemplate,
      kanbanStages: kanbanStages ?? this.kanbanStages,
      defaultAssignees: defaultAssignees ?? this.defaultAssignees,
      archivedAt: archivedAt ?? this.archivedAt,
      archivedBy: archivedBy ?? this.archivedBy,
      settings: settings ?? this.settings,
      collaborativeData: collaborativeData ?? this.collaborativeData,
      attachments: attachments ?? this.attachments,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  static String? _parseStringField(dynamic value) {
    if (value == null) return null;
    if (value is String) return value;
    if (value is List) {
      // If it's a list, try to get the first string element or return null
      if (value.isNotEmpty && value.first is String) {
        return value.first as String;
      }
      return null;
    }
    // Convert other types to string
    return value.toString();
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

  static bool? _parseBoolField(dynamic value) {
    if (value == null) return null;
    if (value is bool) return value;
    if (value is String) {
      return value.toLowerCase() == 'true';
    }
    if (value is num) {
      return value != 0;
    }
    return null;
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

  static Map<String, dynamic>? _parseMapField(dynamic value) {
    if (value == null) return null;
    if (value is Map<String, dynamic>) return value;
    if (value is Map) {
      try {
        return Map<String, dynamic>.from(value);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  static List<String> _parseStringList(dynamic value) {
    if (value == null) return [];
    if (value is List) {
      try {
        return value.map((item) => item.toString()).toList();
      } catch (e) {
        return [];
      }
    }
    return [];
  }

  static List<KanbanStage> _parseKanbanStages(dynamic value) {
    if (value == null) return _getDefaultKanbanStages();
    if (value is List) {
      try {
        return value.map((stage) => KanbanStage.fromJson(stage as Map<String, dynamic>)).toList();
      } catch (e) {
        return _getDefaultKanbanStages();
      }
    }
    return _getDefaultKanbanStages();
  }

  static List<KanbanStage> _getDefaultKanbanStages() {
    return [
      const KanbanStage(id: 'todo', name: 'To Do', order: 1, color: '#3B82F6'),
      const KanbanStage(id: 'in_progress', name: 'In Progress', order: 2, color: '#F59E0B'),
      const KanbanStage(id: 'done', name: 'Done', order: 3, color: '#10B981'),
    ];
  }
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
    try {
      return KanbanStage(
        id: _parseStageStringField(json['id']) ?? 'unknown',
        name: _parseStageStringField(json['name']) ?? 'Unnamed',
        order: _parseIntField(json['order']) ?? 0,
        color: _parseStageStringField(json['color']) ?? '#808080',
      );
    } catch (e) {
      rethrow;
    }
  }

  static String? _parseStageStringField(dynamic value) {
    if (value == null) return null;
    if (value is String) return value;
    if (value is List) {
      if (value.isNotEmpty && value.first is String) {
        return value.first as String;
      }
      return null;
    }
    return value.toString();
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

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'order': order,
      'color': color,
    };
  }
}

class ProjectMember {
  final String id;
  final String projectId;
  final String? teamMemberId;
  final String? userId; // For backward compatibility
  final String role; // 'member', 'admin', 'viewer', etc.
  final DateTime joinedAt;
  final DateTime createdAt;
  final DateTime updatedAt;

  const ProjectMember({
    required this.id,
    required this.projectId,
    this.teamMemberId,
    this.userId,
    this.role = 'member',
    required this.joinedAt,
    required this.createdAt,
    required this.updatedAt,
  });

  factory ProjectMember.fromJson(Map<String, dynamic> json) {
    return ProjectMember(
      id: json['id'] as String,
      projectId: json['project_id'] as String,
      teamMemberId: json['team_member_id'] as String?,
      userId: json['user_id'] as String?,
      role: json['role'] as String? ?? 'member',
      joinedAt: DateTime.parse(json['joined_at'] as String),
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'project_id': projectId,
      'team_member_id': teamMemberId,
      'user_id': userId,
      'role': role,
      'joined_at': joinedAt.toIso8601String(),
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }
}

class Sprint {
  final String id;
  final String projectId;
  final String name;
  final String? goal;
  final DateTime startDate;
  final DateTime endDate;
  final String status; // 'planning', 'active', 'completed'
  final String createdBy;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Sprint({
    required this.id,
    required this.projectId,
    required this.name,
    this.goal,
    required this.startDate,
    required this.endDate,
    this.status = 'planning',
    required this.createdBy,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Sprint.fromJson(Map<String, dynamic> json) {
    return Sprint(
      id: json['id'] as String,
      projectId: json['project_id'] as String,
      name: json['name'] as String,
      goal: json['goal'] as String?,
      startDate: DateTime.parse(json['start_date'] as String),
      endDate: DateTime.parse(json['end_date'] as String),
      status: json['status'] as String? ?? 'planning',
      createdBy: json['created_by'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'project_id': projectId,
      'name': name,
      'goal': goal,
      'start_date': startDate.toIso8601String(),
      'end_date': endDate.toIso8601String(),
      'status': status,
      'created_by': createdBy,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }
}