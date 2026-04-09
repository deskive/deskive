import 'whiteboard_element.dart';

/// Represents a whiteboard document
class WhiteboardData {
  final String id;
  final String workspaceId;
  String name;
  List<WhiteboardElement> elements;
  Map<String, dynamic>? appState;
  Map<String, dynamic>? files; // For embedded images
  final String createdBy;
  final DateTime createdAt;
  DateTime updatedAt;
  bool isPublic;
  String? shareLink;

  WhiteboardData({
    required this.id,
    required this.workspaceId,
    required this.name,
    List<WhiteboardElement>? elements,
    this.appState,
    this.files,
    required this.createdBy,
    required this.createdAt,
    required this.updatedAt,
    this.isPublic = false,
    this.shareLink,
  }) : elements = elements ?? [];

  /// Create a copy with updated values
  WhiteboardData copyWith({
    String? id,
    String? workspaceId,
    String? name,
    List<WhiteboardElement>? elements,
    Map<String, dynamic>? appState,
    Map<String, dynamic>? files,
    String? createdBy,
    DateTime? createdAt,
    DateTime? updatedAt,
    bool? isPublic,
    String? shareLink,
  }) {
    return WhiteboardData(
      id: id ?? this.id,
      workspaceId: workspaceId ?? this.workspaceId,
      name: name ?? this.name,
      elements: elements ?? this.elements,
      appState: appState ?? this.appState,
      files: files ?? this.files,
      createdBy: createdBy ?? this.createdBy,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      isPublic: isPublic ?? this.isPublic,
      shareLink: shareLink ?? this.shareLink,
    );
  }

  /// Convert to JSON for API
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'workspaceId': workspaceId,
      'name': name,
      'elements': elements.map((e) => e.toJson()).toList(),
      if (appState != null) 'appState': appState,
      if (files != null) 'files': files,
      'createdBy': createdBy,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'isPublic': isPublic,
      if (shareLink != null) 'shareLink': shareLink,
    };
  }

  /// Create from JSON
  factory WhiteboardData.fromJson(Map<String, dynamic> json) {
    // Handle id - might be int or String
    final id = json['id']?.toString() ?? '';
    final workspaceId = json['workspaceId']?.toString() ?? '';
    final createdBy = json['createdBy']?.toString() ?? '';

    // Parse dates safely
    DateTime? createdAt;
    if (json['createdAt'] != null) {
      try {
        createdAt = DateTime.parse(json['createdAt'].toString());
      } catch (_) {
        createdAt = DateTime.now();
      }
    }

    DateTime? updatedAt;
    if (json['updatedAt'] != null) {
      try {
        updatedAt = DateTime.parse(json['updatedAt'].toString());
      } catch (_) {
        updatedAt = DateTime.now();
      }
    }

    return WhiteboardData(
      id: id,
      workspaceId: workspaceId,
      name: json['name']?.toString() ?? 'Untitled',
      elements: (json['elements'] as List?)
              ?.map((e) => WhiteboardElement.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      appState: json['appState'] as Map<String, dynamic>?,
      files: json['files'] as Map<String, dynamic>?,
      createdBy: createdBy,
      createdAt: createdAt ?? DateTime.now(),
      updatedAt: updatedAt ?? DateTime.now(),
      isPublic: json['isPublic'] as bool? ?? false,
      shareLink: json['shareLink']?.toString(),
    );
  }

  /// Get visible (non-deleted) elements
  List<WhiteboardElement> get visibleElements =>
      elements.where((e) => !e.isDeleted).toList();

  @override
  String toString() {
    return 'WhiteboardData(id: $id, name: $name, elements: ${elements.length})';
  }
}

/// Represents a whiteboard in a list (minimal data)
class WhiteboardListItem {
  final String id;
  final String workspaceId;
  final String name;
  final String createdBy;
  final DateTime createdAt;
  final DateTime updatedAt;
  final int elementCount;
  final String? thumbnailUrl;

  WhiteboardListItem({
    required this.id,
    required this.workspaceId,
    required this.name,
    required this.createdBy,
    required this.createdAt,
    required this.updatedAt,
    this.elementCount = 0,
    this.thumbnailUrl,
  });

  factory WhiteboardListItem.fromJson(Map<String, dynamic> json) {
    // Handle id - might be int or String
    final id = json['id']?.toString() ?? '';
    final workspaceId = json['workspaceId']?.toString() ?? '';
    final createdBy = json['createdBy']?.toString() ?? '';

    // Parse dates safely
    DateTime? createdAt;
    if (json['createdAt'] != null) {
      try {
        createdAt = DateTime.parse(json['createdAt'].toString());
      } catch (_) {
        createdAt = DateTime.now();
      }
    }

    DateTime? updatedAt;
    if (json['updatedAt'] != null) {
      try {
        updatedAt = DateTime.parse(json['updatedAt'].toString());
      } catch (_) {
        updatedAt = DateTime.now();
      }
    }

    // Parse element count - might be int or String
    int elementCount = 0;
    if (json['elementCount'] != null) {
      elementCount = int.tryParse(json['elementCount'].toString()) ?? 0;
    }

    return WhiteboardListItem(
      id: id,
      workspaceId: workspaceId,
      name: json['name']?.toString() ?? 'Untitled',
      createdBy: createdBy,
      createdAt: createdAt ?? DateTime.now(),
      updatedAt: updatedAt ?? DateTime.now(),
      elementCount: elementCount,
      thumbnailUrl: json['thumbnailUrl']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'workspaceId': workspaceId,
      'name': name,
      'createdBy': createdBy,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'elementCount': elementCount,
      if (thumbnailUrl != null) 'thumbnailUrl': thumbnailUrl,
    };
  }
}
