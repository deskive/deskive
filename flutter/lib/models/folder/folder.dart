/// Folder model representing a folder entity
class Folder {
  final String id;
  final String workspaceId;
  final String name;
  final String? parentId;
  final List<String>? parentIds;
  final String createdBy;
  final Map<String, dynamic>? collaborativeData;
  final bool isDeleted;
  final DateTime? deletedAt;
  final String? deletedBy;
  final DateTime createdAt;
  final DateTime updatedAt;

  Folder({
    required this.id,
    required this.workspaceId,
    required this.name,
    this.parentId,
    this.parentIds,
    required this.createdBy,
    this.collaborativeData,
    required this.isDeleted,
    this.deletedAt,
    this.deletedBy,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Folder.fromJson(Map<String, dynamic> json) {
    // Handle parent_id - it might be a String, empty string, or null
    String? parseParentId(dynamic value) {
      if (value == null || value == '') return null;
      if (value is String) return value;
      if (value is List && value.isEmpty) return null;
      return null;
    }

    return Folder(
      id: json['id'] as String,
      workspaceId: json['workspace_id'] as String,
      name: json['name'] as String,
      parentId: parseParentId(json['parent_id']),
      parentIds: json['parent_ids'] != null
          ? (json['parent_ids'] is List
              ? (json['parent_ids'] as List<dynamic>).map((e) => e.toString()).toList()
              : null)
          : null,
      createdBy: json['created_by'] as String,
      collaborativeData: json['collaborative_data'] as Map<String, dynamic>?,
      isDeleted: (json['is_deleted'] as bool?) ?? false,
      deletedAt: json['deleted_at'] != null
          ? DateTime.parse(json['deleted_at'] as String)
          : null,
      deletedBy: json['deleted_by'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'workspace_id': workspaceId,
      'name': name,
      'parent_id': parentId,
      'parent_ids': parentIds,
      'created_by': createdBy,
      'collaborative_data': collaborativeData,
      'is_deleted': isDeleted,
      'deleted_at': deletedAt?.toIso8601String(),
      'deleted_by': deletedBy,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }
}
