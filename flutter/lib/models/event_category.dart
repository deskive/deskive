class EventCategory {
  final String? id;
  final String workspaceId;
  final String name;
  final String? description;
  final String color;
  final String createdBy;
  final DateTime createdAt;
  final DateTime updatedAt;

  EventCategory({
    this.id,
    required this.workspaceId,
    required this.name,
    this.description,
    required this.color,
    required this.createdBy,
    DateTime? createdAt,
    DateTime? updatedAt,
  })  : createdAt = createdAt ?? DateTime.now(),
        updatedAt = updatedAt ?? DateTime.now();

  Map<String, dynamic> toMap() {
    return {
      if (id != null) 'id': id,
      'workspace_id': workspaceId,
      'name': name,
      'description': description,
      'color': color,
      'created_by': createdBy,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  factory EventCategory.fromMap(Map<String, dynamic> map) {
    return EventCategory(
      id: map['id'],
      workspaceId: map['workspace_id'] ?? '',
      name: map['name'] ?? '',
      description: map['description'],
      color: map['color'] ?? '#0000FF',
      createdBy: map['created_by'] ?? '',
      createdAt: map['created_at'] != null
          ? DateTime.parse(map['created_at'])
          : DateTime.now(),
      updatedAt: map['updated_at'] != null
          ? DateTime.parse(map['updated_at'])
          : DateTime.now(),
    );
  }

  EventCategory copyWith({
    String? id,
    String? workspaceId,
    String? name,
    String? description,
    String? color,
    String? createdBy,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return EventCategory(
      id: id ?? this.id,
      workspaceId: workspaceId ?? this.workspaceId,
      name: name ?? this.name,
      description: description ?? this.description,
      color: color ?? this.color,
      createdBy: createdBy ?? this.createdBy,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  String toString() {
    return 'EventCategory{id: $id, name: $name, color: $color}';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is EventCategory && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;
}