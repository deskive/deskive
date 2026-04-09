import '../project.dart';

/// Project Template Model
/// Represents a template that can be used to create new projects
class ProjectTemplate {
  final String id;
  final String? workspaceId;
  final String slug;
  final String name;
  final String? description;
  final String category;
  final String? icon;
  final bool isSystem;
  final bool isFeatured;
  final int usageCount;
  final TemplateStructure structure;
  final DateTime createdAt;
  final DateTime updatedAt;

  const ProjectTemplate({
    required this.id,
    this.workspaceId,
    required this.slug,
    required this.name,
    this.description,
    required this.category,
    this.icon,
    this.isSystem = true,
    this.isFeatured = false,
    this.usageCount = 0,
    required this.structure,
    required this.createdAt,
    required this.updatedAt,
  });

  factory ProjectTemplate.fromJson(Map<String, dynamic> json) {
    // Handle null values safely with defaults
    final id = json['id']?.toString() ?? '';
    final slug = json['slug']?.toString() ?? '';
    final name = json['name']?.toString() ?? 'Untitled Template';
    final category = json['category']?.toString() ?? 'general';
    final createdAtStr = json['created_at']?.toString();
    final updatedAtStr = json['updated_at']?.toString();

    return ProjectTemplate(
      id: id,
      workspaceId: json['workspace_id']?.toString(),
      slug: slug.isNotEmpty ? slug : id,
      name: name,
      description: json['description']?.toString(),
      category: category,
      icon: json['icon']?.toString(),
      isSystem: json['is_system'] as bool? ?? json['isSystem'] as bool? ?? true,
      isFeatured: json['is_featured'] as bool? ?? json['isFeatured'] as bool? ?? false,
      usageCount: json['usage_count'] as int? ?? json['usageCount'] as int? ?? 0,
      structure: TemplateStructure.fromJson(
        json['structure'] as Map<String, dynamic>? ?? {},
      ),
      createdAt: createdAtStr != null ? DateTime.tryParse(createdAtStr) ?? DateTime.now() : DateTime.now(),
      updatedAt: updatedAtStr != null ? DateTime.tryParse(updatedAtStr) ?? DateTime.now() : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'workspace_id': workspaceId,
      'slug': slug,
      'name': name,
      'description': description,
      'category': category,
      'icon': icon,
      'is_system': isSystem,
      'is_featured': isFeatured,
      'usage_count': usageCount,
      'structure': structure.toJson(),
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  ProjectTemplate copyWith({
    String? id,
    String? workspaceId,
    String? slug,
    String? name,
    String? description,
    String? category,
    String? icon,
    bool? isSystem,
    bool? isFeatured,
    int? usageCount,
    TemplateStructure? structure,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return ProjectTemplate(
      id: id ?? this.id,
      workspaceId: workspaceId ?? this.workspaceId,
      slug: slug ?? this.slug,
      name: name ?? this.name,
      description: description ?? this.description,
      category: category ?? this.category,
      icon: icon ?? this.icon,
      isSystem: isSystem ?? this.isSystem,
      isFeatured: isFeatured ?? this.isFeatured,
      usageCount: usageCount ?? this.usageCount,
      structure: structure ?? this.structure,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

/// Template Structure containing kanban stages, custom fields, and sections
class TemplateStructure {
  final List<KanbanStage> kanbanStages;
  final List<TemplateCustomField> customFields;
  final List<TemplateSection> sections;

  const TemplateStructure({
    this.kanbanStages = const [],
    this.customFields = const [],
    this.sections = const [],
  });

  factory TemplateStructure.fromJson(Map<String, dynamic> json) {
    return TemplateStructure(
      kanbanStages: (json['kanban_stages'] as List<dynamic>?)
              ?.map((e) => KanbanStage.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      customFields: (json['custom_fields'] as List<dynamic>?)
              ?.map((e) => TemplateCustomField.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      sections: (json['sections'] as List<dynamic>?)
              ?.map((e) => TemplateSection.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'kanban_stages': kanbanStages.map((e) => e.toJson()).toList(),
      'custom_fields': customFields.map((e) => e.toJson()).toList(),
      'sections': sections.map((e) => e.toJson()).toList(),
    };
  }

  /// Get total task count across all sections
  int get totalTaskCount {
    return sections.fold(0, (sum, section) => sum + section.tasks.length);
  }

  /// Get total subtask count across all sections
  int get totalSubtaskCount {
    return sections.fold(0, (sum, section) {
      return sum + section.tasks.fold(0, (taskSum, task) => taskSum + task.subtasks.length);
    });
  }
}

/// Template Section containing tasks
class TemplateSection {
  final String name;
  final List<TemplateTask> tasks;

  const TemplateSection({
    required this.name,
    this.tasks = const [],
  });

  factory TemplateSection.fromJson(Map<String, dynamic> json) {
    return TemplateSection(
      name: json['name']?.toString() ?? 'Untitled Section',
      tasks: (json['tasks'] as List<dynamic>?)
              ?.map((e) => TemplateTask.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'tasks': tasks.map((e) => e.toJson()).toList(),
    };
  }
}

/// Template Task with subtasks
class TemplateTask {
  final String title;
  final String? description;
  final String? priority;
  final List<String> labels;
  final int? dueOffset;
  final List<TemplateSubtask> subtasks;

  const TemplateTask({
    required this.title,
    this.description,
    this.priority,
    this.labels = const [],
    this.dueOffset,
    this.subtasks = const [],
  });

  factory TemplateTask.fromJson(Map<String, dynamic> json) {
    return TemplateTask(
      title: json['title']?.toString() ?? json['name']?.toString() ?? 'Untitled Task',
      description: json['description']?.toString(),
      priority: json['priority']?.toString(),
      labels: (json['labels'] as List<dynamic>?)
              ?.map((e) => e?.toString() ?? '')
              .where((e) => e.isNotEmpty)
              .toList() ??
          [],
      dueOffset: json['dueOffset'] as int? ?? json['due_offset'] as int? ?? json['dueDaysOffset'] as int?,
      subtasks: (json['subtasks'] as List<dynamic>?)
              ?.map((e) => TemplateSubtask.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'title': title,
      'description': description,
      'priority': priority,
      'labels': labels,
      'dueOffset': dueOffset,
      'subtasks': subtasks.map((e) => e.toJson()).toList(),
    };
  }
}

/// Template Subtask
class TemplateSubtask {
  final String title;

  const TemplateSubtask({
    required this.title,
  });

  factory TemplateSubtask.fromJson(Map<String, dynamic> json) {
    return TemplateSubtask(
      title: json['title']?.toString() ?? json['name']?.toString() ?? 'Untitled Subtask',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'title': title,
    };
  }
}

/// Template Custom Field
class TemplateCustomField {
  final String name;
  final String type;
  final List<String>? options;
  final bool required;

  const TemplateCustomField({
    required this.name,
    required this.type,
    this.options,
    this.required = false,
  });

  factory TemplateCustomField.fromJson(Map<String, dynamic> json) {
    return TemplateCustomField(
      name: json['name']?.toString() ?? 'Untitled Field',
      type: json['type']?.toString() ?? 'text',
      options: (json['options'] as List<dynamic>?)
          ?.map((e) => e?.toString() ?? '')
          .where((e) => e.isNotEmpty)
          .toList(),
      required: json['required'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'type': type,
      'options': options,
      'required': required,
    };
  }
}

/// Template Category with metadata
class TemplateCategory {
  final String id;
  final String name;
  final String icon;
  final int color;
  final int count;

  const TemplateCategory({
    required this.id,
    required this.name,
    required this.icon,
    required this.color,
    this.count = 0,
  });

  TemplateCategory copyWith({int? count}) {
    return TemplateCategory(
      id: id,
      name: name,
      icon: icon,
      color: color,
      count: count ?? this.count,
    );
  }
}
