/// Represents an item (file or folder) in the trash
class TrashItem {
  final String id;
  final String workspaceId;
  final String name;
  final String type; // 'file' or 'folder'
  final bool isDeleted;
  final DateTime? deletedAt;
  final String? deletedBy;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  // File-specific properties
  final String? mimeType;
  final String? size;
  final int? version;
  final String? virusScanStatus;

  // Folder-specific properties
  final String? parentId;
  final List<dynamic>? children;
  final List<dynamic>? files;

  TrashItem({
    required this.id,
    required this.workspaceId,
    required this.name,
    required this.type,
    required this.isDeleted,
    this.deletedAt,
    this.deletedBy,
    this.createdAt,
    this.updatedAt,
    this.mimeType,
    this.size,
    this.version,
    this.virusScanStatus,
    this.parentId,
    this.children,
    this.files,
  });

  factory TrashItem.fromJson(Map<String, dynamic> json) {
    final type = json['type'] as String? ?? 'file';

    return TrashItem(
      id: json['id'] as String,
      workspaceId: json['workspace_id'] as String,
      name: json['name'] as String,
      type: type,
      isDeleted: json['is_deleted'] as bool? ?? false,
      deletedAt: json['deleted_at'] != null
          ? DateTime.parse(json['deleted_at'] as String)
          : null,
      deletedBy: json['deleted_by'] as String?,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : null,
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'] as String)
          : null,
      // File-specific
      mimeType: json['mime_type'] as String?,
      size: json['size'] as String?,
      version: json['version'] as int?,
      virusScanStatus: json['virus_scan_status'] as String?,
      // Folder-specific
      parentId: json['parent_id'] as String?,
      children: json['children'] as List<dynamic>?,
      files: json['files'] as List<dynamic>?,
    );
  }

  bool get isFolder => type == 'folder';
  bool get isFile => type != 'folder';

  String get displayType {
    if (isFolder) return 'Folder';
    if (mimeType == null) return 'File';

    if (mimeType!.startsWith('image/')) return 'Image';
    if (mimeType!.startsWith('video/')) return 'Video';
    if (mimeType!.startsWith('audio/')) return 'Audio';
    if (mimeType == 'application/pdf') return 'PDF';
    if (mimeType!.contains('word') || mimeType!.contains('document')) return 'Document';
    if (mimeType!.contains('spreadsheet') || mimeType!.contains('excel')) return 'Spreadsheet';
    if (mimeType!.contains('presentation') || mimeType!.contains('powerpoint')) return 'Presentation';

    return 'File';
  }
}
