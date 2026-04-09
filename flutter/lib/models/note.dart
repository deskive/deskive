
class Note {
  final String? id;
  final String workspaceId;
  final String title;
  final Map<String, dynamic> content;
  final String? contentText;
  final String? parentId;
  final String? parentNoteId;
  final String? authorId;
  final String createdBy;
  final String? lastEditedBy;
  final int position;
  final String? templateId;
  final int viewCount;
  final bool isPublished;
  final DateTime? publishedAt;
  final String? slug;
  final String? coverImage;
  final String? icon;
  final List<String> tags;
  final bool isTemplate;
  final bool isPublic;
  final DateTime? deletedAt;
  final DateTime? archivedAt;
  final bool isFavorite;
  final Map<String, dynamic> collaborativeData;
  final DateTime createdAt;
  final DateTime updatedAt;

  Note({
    this.id,
    required this.workspaceId,
    required this.title,
    required this.content,
    this.contentText,
    this.parentId,
    this.parentNoteId,
    this.authorId,
    required this.createdBy,
    this.lastEditedBy,
    this.position = 0,
    this.templateId,
    this.viewCount = 0,
    this.isPublished = false,
    this.publishedAt,
    this.slug,
    this.coverImage,
    this.icon,
    this.tags = const [],
    this.isTemplate = false,
    this.isPublic = false,
    this.deletedAt,
    this.archivedAt,
    this.isFavorite = false,
    this.collaborativeData = const {},
    DateTime? createdAt,
    DateTime? updatedAt,
  }) : createdAt = createdAt ?? DateTime.now(),
       updatedAt = updatedAt ?? DateTime.now();

  // Convert to Map for database insertion
  Map<String, dynamic> toMap() {
    return {
      if (id != null) 'id': id,
      'workspace_id': workspaceId,
      'title': title,
      'content': content,
      'content_text': contentText,
      'parent_id': parentId,
      'parent_note_id': parentNoteId,
      'author_id': authorId,
      'created_by': createdBy,
      'last_edited_by': lastEditedBy,
      'position': position,
      'template_id': templateId,
      'view_count': viewCount,
      'is_published': isPublished,
      'published_at': publishedAt?.toIso8601String(),
      'slug': slug,
      'cover_image': coverImage,
      'icon': icon,
      'tags': tags,
      'is_template': isTemplate,
      'is_public': isPublic,
      'deleted_at': deletedAt?.toIso8601String(),
      'archived_at': archivedAt?.toIso8601String(),
      'is_favorite': isFavorite,
      'collaborative_data': collaborativeData,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  // Helper method to convert content from various formats
  static Map<String, dynamic> _convertContentToMap(dynamic content) {
    if (content == null) {
      return {};
    } else if (content is Map<String, dynamic>) {
      return content;
    } else if (content is Map) {
      return Map<String, dynamic>.from(content);
    } else if (content is List) {
      // Rich text content from AppAtOnce - convert to a map with the raw data
      return {
        'rich': content,
        'text': _extractPlainTextFromRichContent(content),
      };
    } else {
      // Fallback for unknown content types
      return {
        'raw': content.toString(),
        'text': content.toString(),
      };
    }
  }
  
  // Helper method to extract plain text from rich content structure
  static String _extractPlainTextFromRichContent(List<dynamic> richContent) {
    final StringBuffer buffer = StringBuffer();
    
    for (final block in richContent) {
      if (block is Map) {
        final blockContent = block['content'];
        if (blockContent is List) {
          for (final contentItem in blockContent) {
            if (contentItem is Map && contentItem['text'] != null) {
              buffer.write(contentItem['text']);
            }
          }
        }
        // Add line break after each block (except dividers)
        if (block['type'] != 'divider') {
          buffer.writeln();
        }
      }
    }
    
    return buffer.toString().trim();
  }
  
  // Helper method to extract plain text from any content format
  static String _extractPlainTextFromContent(dynamic content) {
    if (content == null) {
      return '';
    } else if (content is String) {
      return content;
    } else if (content is List) {
      return _extractPlainTextFromRichContent(content);
    } else if (content is Map) {
      // If it's already converted content, look for text field
      if (content['text'] != null) {
        return content['text'].toString();
      } else if (content['rich'] != null) {
        return _extractPlainTextFromRichContent(content['rich']);
      }
    }
    return content.toString();
  }

  // Create from database Map
  factory Note.fromMap(Map<String, dynamic> map) {
    try {
      return Note(
        id: map['id'],
        workspaceId: map['workspace_id'] ?? '',
        title: map['title'] ?? '',
        content: _convertContentToMap(map['content']),
        contentText: map['content_text'] ?? _extractPlainTextFromContent(map['content']),
        parentId: map['parent_id'],
        parentNoteId: map['parent_note_id'],
        authorId: map['author_id'],
        createdBy: map['created_by'] ?? '',
        lastEditedBy: map['last_edited_by'],
        position: map['position'] ?? 0,
        templateId: map['template_id'],
        viewCount: map['view_count'] ?? 0,
        isPublished: map['is_published'] ?? false,
        publishedAt: map['published_at'] != null 
            ? DateTime.parse(map['published_at']) 
            : null,
        slug: map['slug'],
        coverImage: map['cover_image'],
        icon: map['icon'],
        tags: _convertTagsToList(map['tags']),
        isTemplate: map['is_template'] ?? false,
        isPublic: map['is_public'] ?? false,
        deletedAt: map['deleted_at'] != null 
            ? DateTime.parse(map['deleted_at']) 
            : null,
        archivedAt: map['archived_at'] != null 
            ? DateTime.parse(map['archived_at']) 
            : null,
        isFavorite: map['is_favorite'] ?? false,
        collaborativeData: _convertCollaborativeDataToMap(map['collaborative_data']),
        createdAt: map['created_at'] != null 
            ? DateTime.parse(map['created_at']) 
            : DateTime.now(),
        updatedAt: map['updated_at'] != null 
            ? DateTime.parse(map['updated_at']) 
            : DateTime.now(),
      );
    } catch (e, stackTrace) {
      rethrow;
    }
  }
  
  // Helper method to safely convert tags to List<String>
  static List<String> _convertTagsToList(dynamic tags) {
    if (tags == null) {
      return [];
    } else if (tags is List<String>) {
      return tags;
    } else if (tags is List) {
      return tags.map((tag) => tag.toString()).toList();
    } else {
      return [];
    }
  }
  
  // Helper method to safely convert collaborative_data to Map<String, dynamic>
  static Map<String, dynamic> _convertCollaborativeDataToMap(dynamic data) {
    if (data == null) {
      return {};
    } else if (data is Map<String, dynamic>) {
      return data;
    } else if (data is Map) {
      return Map<String, dynamic>.from(data);
    } else {
      return {};
    }
  }

  // Create a copy with modified fields
  Note copyWith({
    String? id,
    String? workspaceId,
    String? title,
    Map<String, dynamic>? content,
    String? contentText,
    String? parentId,
    String? parentNoteId,
    String? authorId,
    String? createdBy,
    String? lastEditedBy,
    int? position,
    String? templateId,
    int? viewCount,
    bool? isPublished,
    DateTime? publishedAt,
    String? slug,
    String? coverImage,
    String? icon,
    List<String>? tags,
    bool? isTemplate,
    bool? isPublic,
    DateTime? deletedAt,
    DateTime? archivedAt,
    bool? isFavorite,
    Map<String, dynamic>? collaborativeData,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Note(
      id: id ?? this.id,
      workspaceId: workspaceId ?? this.workspaceId,
      title: title ?? this.title,
      content: content ?? this.content,
      contentText: contentText ?? this.contentText,
      parentId: parentId ?? this.parentId,
      parentNoteId: parentNoteId ?? this.parentNoteId,
      authorId: authorId ?? this.authorId,
      createdBy: createdBy ?? this.createdBy,
      lastEditedBy: lastEditedBy ?? this.lastEditedBy,
      position: position ?? this.position,
      templateId: templateId ?? this.templateId,
      viewCount: viewCount ?? this.viewCount,
      isPublished: isPublished ?? this.isPublished,
      publishedAt: publishedAt ?? this.publishedAt,
      slug: slug ?? this.slug,
      coverImage: coverImage ?? this.coverImage,
      icon: icon ?? this.icon,
      tags: tags ?? this.tags,
      isTemplate: isTemplate ?? this.isTemplate,
      isPublic: isPublic ?? this.isPublic,
      deletedAt: deletedAt ?? this.deletedAt,
      archivedAt: archivedAt ?? this.archivedAt,
      isFavorite: isFavorite ?? this.isFavorite,
      collaborativeData: collaborativeData ?? this.collaborativeData,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  String toString() {
    return 'Note{id: $id, title: $title, workspaceId: $workspaceId}';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is Note &&
        other.id == id &&
        other.title == title &&
        other.workspaceId == workspaceId;
  }

  @override
  int get hashCode {
    return id.hashCode ^ title.hashCode ^ workspaceId.hashCode;
  }
}