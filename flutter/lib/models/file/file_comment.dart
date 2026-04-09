/// Model representing a file comment author
class CommentAuthor {
  final String id;
  final String name;
  final String email;
  final String? avatarUrl;

  CommentAuthor({
    required this.id,
    required this.name,
    required this.email,
    this.avatarUrl,
  });

  factory CommentAuthor.fromJson(Map<String, dynamic> json) {
    return CommentAuthor(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      avatarUrl: json['avatar_url'] ?? json['avatarUrl'],
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'email': email,
    if (avatarUrl != null) 'avatar_url': avatarUrl,
  };
}

/// Model representing a comment on a file
class FileComment {
  final String id;
  final String fileId;
  final String userId;
  final String content;
  final String? parentId;
  final bool isResolved;
  final String? resolvedBy;
  final DateTime? resolvedAt;
  final bool isEdited;
  final DateTime? editedAt;
  final Map<String, dynamic>? metadata;
  final DateTime createdAt;
  final DateTime updatedAt;
  final CommentAuthor? author;
  final List<FileComment>? replies;

  FileComment({
    required this.id,
    required this.fileId,
    required this.userId,
    required this.content,
    this.parentId,
    this.isResolved = false,
    this.resolvedBy,
    this.resolvedAt,
    this.isEdited = false,
    this.editedAt,
    this.metadata,
    required this.createdAt,
    required this.updatedAt,
    this.author,
    this.replies,
  });

  factory FileComment.fromJson(Map<String, dynamic> json) {
    return FileComment(
      id: json['id'] ?? '',
      fileId: json['file_id'] ?? json['fileId'] ?? '',
      userId: json['user_id'] ?? json['userId'] ?? '',
      content: json['content'] ?? '',
      parentId: json['parent_id'] ?? json['parentId'],
      isResolved: json['is_resolved'] ?? json['isResolved'] ?? false,
      resolvedBy: json['resolved_by'] ?? json['resolvedBy'],
      resolvedAt: json['resolved_at'] != null
          ? DateTime.parse(json['resolved_at'])
          : (json['resolvedAt'] != null
              ? DateTime.parse(json['resolvedAt'])
              : null),
      isEdited: json['is_edited'] ?? json['isEdited'] ?? false,
      editedAt: json['edited_at'] != null
          ? DateTime.parse(json['edited_at'])
          : (json['editedAt'] != null
              ? DateTime.parse(json['editedAt'])
              : null),
      metadata: json['metadata'],
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'])
          : (json['createdAt'] != null
              ? DateTime.parse(json['createdAt'])
              : DateTime.now()),
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'])
          : (json['updatedAt'] != null
              ? DateTime.parse(json['updatedAt'])
              : DateTime.now()),
      author: json['author'] != null
          ? CommentAuthor.fromJson(json['author'])
          : null,
      replies: json['replies'] != null
          ? (json['replies'] as List)
              .map((reply) => FileComment.fromJson(reply))
              .toList()
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'file_id': fileId,
    'user_id': userId,
    'content': content,
    if (parentId != null) 'parent_id': parentId,
    'is_resolved': isResolved,
    if (resolvedBy != null) 'resolved_by': resolvedBy,
    if (resolvedAt != null) 'resolved_at': resolvedAt!.toIso8601String(),
    'is_edited': isEdited,
    if (editedAt != null) 'edited_at': editedAt!.toIso8601String(),
    if (metadata != null) 'metadata': metadata,
    'created_at': createdAt.toIso8601String(),
    'updated_at': updatedAt.toIso8601String(),
    if (author != null) 'author': author!.toJson(),
    if (replies != null) 'replies': replies!.map((r) => r.toJson()).toList(),
  };

  FileComment copyWith({
    String? id,
    String? fileId,
    String? userId,
    String? content,
    String? parentId,
    bool? isResolved,
    String? resolvedBy,
    DateTime? resolvedAt,
    bool? isEdited,
    DateTime? editedAt,
    Map<String, dynamic>? metadata,
    DateTime? createdAt,
    DateTime? updatedAt,
    CommentAuthor? author,
    List<FileComment>? replies,
  }) {
    return FileComment(
      id: id ?? this.id,
      fileId: fileId ?? this.fileId,
      userId: userId ?? this.userId,
      content: content ?? this.content,
      parentId: parentId ?? this.parentId,
      isResolved: isResolved ?? this.isResolved,
      resolvedBy: resolvedBy ?? this.resolvedBy,
      resolvedAt: resolvedAt ?? this.resolvedAt,
      isEdited: isEdited ?? this.isEdited,
      editedAt: editedAt ?? this.editedAt,
      metadata: metadata ?? this.metadata,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      author: author ?? this.author,
      replies: replies ?? this.replies,
    );
  }

  /// Check if this comment is a reply (has a parent)
  bool get isReply => parentId != null;

  /// Check if this comment has any replies
  bool get hasReplies => replies != null && replies!.isNotEmpty;

  /// Get the number of replies
  int get replyCount => replies?.length ?? 0;
}
