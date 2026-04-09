import 'package:dio/dio.dart';
import '../base_api_client.dart';

/// DTO classes for Notes operations
class CreateNoteDto {
  final String title;
  final String? content;
  final String? parentId; // For hierarchical notes
  final List<String>? tags;
  final String? category;
  final bool isPublic;
  final Map<String, dynamic>? metadata;
  final Map<String, dynamic>? attachments;

  CreateNoteDto({
    required this.title,
    this.content,
    this.parentId,
    this.tags,
    this.category,
    this.isPublic = false,
    this.metadata,
    this.attachments,
  });

  Map<String, dynamic> toJson() => {
    'title': title,
    if (content != null) 'content': content,
    if (parentId != null) 'parent_id': parentId,
    if (tags != null) 'tags': tags,
    if (category != null) 'category': category,
    'is_public': isPublic,
    if (metadata != null) 'metadata': metadata,
    if (attachments != null) 'attachments': attachments,
  };
}

class UpdateNoteDto {
  final String? title;
  final String? content;
  final String? parentId;
  final List<String>? tags;
  final String? category;
  final bool? isPublic;
  final bool? isFavorite;
  final Map<String, dynamic>? metadata;
  final Map<String, dynamic>? attachments;

  UpdateNoteDto({
    this.title,
    this.content,
    this.parentId,
    this.tags,
    this.category,
    this.isPublic,
    this.isFavorite,
    this.metadata,
    this.attachments,
  });

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    if (title != null) map['title'] = title;
    if (content != null) map['content'] = content;
    if (parentId != null) map['parent_id'] = parentId;
    if (tags != null) map['tags'] = tags;
    if (category != null) map['category'] = category;
    if (isPublic != null) map['is_public'] = isPublic;
    if (isFavorite != null) map['is_favorite'] = isFavorite;
    if (metadata != null) map['metadata'] = metadata;
    if (attachments != null) map['attachments'] = attachments;
    return map;
  }
}

class ShareNoteDto {
  final List<String> userIds;

  ShareNoteDto({
    required this.userIds,
  });

  Map<String, dynamic> toJson() => {
    'user_ids': userIds,
  };
}

class DuplicateNoteDto {
  final String? title;
  final String? parentId;
  final bool includeSubNotes;

  DuplicateNoteDto({
    this.title,
    this.parentId,
    this.includeSubNotes = true,
  });

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    if (title != null) map['title'] = title;
    if (parentId != null) map['parentId'] = parentId;
    map['includeSubNotes'] = includeSubNotes;
    return map;
  }
}

class CreateTemplateDto {
  final String name;
  final String description;
  final String content;
  final String category;
  final List<String>? tags;
  final Map<String, dynamic>? variables; // Template variables

  CreateTemplateDto({
    required this.name,
    required this.description,
    required this.content,
    required this.category,
    this.tags,
    this.variables,
  });

  Map<String, dynamic> toJson() => {
    'name': name,
    'description': description,
    'content': content,
    'category': category,
    if (tags != null) 'tags': tags,
    if (variables != null) 'variables': variables,
  };
}

class MergeNotesDto {
  final List<String> noteIds;
  final String? title;
  final bool includeHeaders;
  final bool addDividers;
  final bool sortByDate;

  MergeNotesDto({
    required this.noteIds,
    this.title,
    this.includeHeaders = true,
    this.addDividers = true,
    this.sortByDate = false,
  });

  Map<String, dynamic> toJson() => {
    'note_ids': noteIds,
    if (title != null) 'title': title,
    'include_headers': includeHeaders,
    'add_dividers': addDividers,
    'sort_by_date': sortByDate,
  };
}

/// Model classes
class Note {
  final String id;
  final String title;
  final String? content;
  final String authorId;
  final String? authorName;
  final String workspaceId;
  final String? parentId;
  final List<String>? tags;
  final String? category;
  final String icon; // Emoji icon for the note
  final bool isPublic;
  final bool isFavorite;
  final List<Note>? children; // For hierarchical notes
  final Map<String, dynamic>? metadata;
  final Map<String, dynamic>? attachments; // Linked items (notes, events, files)
  final DateTime? archivedAt;
  final DateTime? deletedAt;
  final DateTime createdAt;
  final DateTime updatedAt;

  Note({
    required this.id,
    required this.title,
    this.content,
    required this.authorId,
    this.authorName,
    required this.workspaceId,
    this.parentId,
    this.tags,
    this.category,
    this.icon = '📝', // Default icon
    required this.isPublic,
    this.isFavorite = false,
    this.children,
    this.metadata,
    this.attachments,
    this.archivedAt,
    this.deletedAt,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Note.fromJson(Map<String, dynamic> json) {
    return Note(
      id: json['id'] ?? json['_id'] ?? '',
      title: json['title'] ?? '',
      content: json['content'],
      authorId: json['authorId'] ?? json['author_id'] ?? json['createdBy'] ?? json['created_by'] ?? '',
      authorName: json['authorName'] ?? json['author_name'],
      workspaceId: json['workspaceId'] ?? json['workspace_id'] ?? '',
      parentId: json['parentId'] ?? json['parent_id'],
      tags: json['tags'] != null ? List<String>.from(json['tags']) : null,
      category: json['category'],
      icon: json['icon'] ?? '📝', // Default to 📝 if not set
      isPublic: json['isPublic'] ?? json['is_public'] ?? false,
      isFavorite: json['isFavorite'] ?? json['is_favorite'] ?? false,
      children: json['children'] != null
          ? (json['children'] as List).map((e) => Note.fromJson(e)).toList()
          : null,
      metadata: json['metadata'],
      attachments: json['attachments'] != null
          ? Map<String, dynamic>.from(json['attachments'])
          : null,
      archivedAt: json['archivedAt'] != null || json['archived_at'] != null
          ? DateTime.parse(json['archivedAt'] ?? json['archived_at'])
          : null,
      deletedAt: json['deletedAt'] != null || json['deleted_at'] != null
          ? DateTime.parse(json['deletedAt'] ?? json['deleted_at'])
          : null,
      createdAt: json['createdAt'] != null || json['created_at'] != null
          ? DateTime.parse(json['createdAt'] ?? json['created_at'])
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null || json['updated_at'] != null
          ? DateTime.parse(json['updatedAt'] ?? json['updated_at'])
          : DateTime.now(),
    );
  }
}

class NoteTemplate {
  final String id;
  final String name;
  final String description;
  final String content;
  final String category;
  final String authorId;
  final String workspaceId;
  final List<String>? tags;
  final Map<String, dynamic>? variables;
  final DateTime createdAt;
  final DateTime updatedAt;
  
  NoteTemplate({
    required this.id,
    required this.name,
    required this.description,
    required this.content,
    required this.category,
    required this.authorId,
    required this.workspaceId,
    this.tags,
    this.variables,
    required this.createdAt,
    required this.updatedAt,
  });
  
  factory NoteTemplate.fromJson(Map<String, dynamic> json) {
    return NoteTemplate(
      id: json['id'],
      name: json['name'],
      description: json['description'],
      content: json['content'],
      category: json['category'],
      authorId: json['authorId'] ?? json['author_id'],
      workspaceId: json['workspaceId'] ?? json['workspace_id'],
      tags: json['tags'] != null ? List<String>.from(json['tags']) : null,
      variables: json['variables'],
      createdAt: DateTime.parse(json['createdAt'] ?? json['created_at']),
      updatedAt: DateTime.parse(json['updatedAt'] ?? json['updated_at']),
    );
  }
}

class NoteShare {
  final String id;
  final String noteId;
  final String sharedWithUserId;
  final String sharedByUserId;
  final String permission;
  final DateTime? expiresAt;
  final DateTime createdAt;
  
  NoteShare({
    required this.id,
    required this.noteId,
    required this.sharedWithUserId,
    required this.sharedByUserId,
    required this.permission,
    this.expiresAt,
    required this.createdAt,
  });
  
  factory NoteShare.fromJson(Map<String, dynamic> json) {
    return NoteShare(
      id: json['id'],
      noteId: json['noteId'] ?? json['note_id'],
      sharedWithUserId: json['sharedWithUserId'] ?? json['shared_with_user_id'],
      sharedByUserId: json['sharedByUserId'] ?? json['shared_by_user_id'],
      permission: json['permission'],
      expiresAt: json['expiresAt'] != null || json['expires_at'] != null
          ? DateTime.parse(json['expiresAt'] ?? json['expires_at'])
          : null,
      createdAt: DateTime.parse(json['createdAt'] ?? json['created_at']),
    );
  }
}

// ==================== AI RESPONSE MODELS ====================

/// Response from AI agent for notes management
class NoteAgentResponse {
  final bool success;
  final String action;
  final String message;
  final NoteAgentData? data;
  final String? error;

  NoteAgentResponse({
    required this.success,
    required this.action,
    required this.message,
    this.data,
    this.error,
  });

  factory NoteAgentResponse.fromJson(Map<String, dynamic> json) {
    return NoteAgentResponse(
      success: json['success'] ?? false,
      action: json['action'] ?? 'unknown',
      message: json['message'] ?? '',
      data: json['data'] != null ? NoteAgentData.fromJson(json['data']) : null,
      error: json['error'],
    );
  }
}

/// Data returned by AI agent
class NoteAgentData {
  final Note? note;
  final List<Note>? notes;
  final String? deletedNoteId;
  final String? deletedNoteName;
  final int? deletedCount;
  final List<dynamic>? results;
  final int? total;
  final int? successful;
  final int? failed;
  final String? query;
  final int? count;

  NoteAgentData({
    this.note,
    this.notes,
    this.deletedNoteId,
    this.deletedNoteName,
    this.deletedCount,
    this.results,
    this.total,
    this.successful,
    this.failed,
    this.query,
    this.count,
  });

  factory NoteAgentData.fromJson(Map<String, dynamic> json) {
    return NoteAgentData(
      note: json['note'] != null ? Note.fromJson(json['note']) : null,
      notes: json['notes'] != null
          ? (json['notes'] as List).map((e) => Note.fromJson(e)).toList()
          : null,
      deletedNoteId: json['deletedNoteId'] ?? json['deleted_note_id'],
      deletedNoteName: json['deletedNoteName'] ?? json['deleted_note_name'],
      deletedCount: json['deletedCount'] ?? json['deleted_count'],
      results: json['results'],
      total: json['total'],
      successful: json['successful'],
      failed: json['failed'],
      query: json['query'],
      count: json['count'],
    );
  }
}

/// Message in AI conversation history
class ConversationMessage {
  final String id;
  final String role;
  final String content;
  final DateTime timestamp;
  final String? action;
  final bool? success;

  ConversationMessage({
    required this.id,
    required this.role,
    required this.content,
    required this.timestamp,
    this.action,
    this.success,
  });

  factory ConversationMessage.fromJson(Map<String, dynamic> json) {
    return ConversationMessage(
      id: json['id'] ?? '',
      role: json['role'] ?? 'user',
      content: json['content'] ?? '',
      timestamp: json['timestamp'] != null
          ? DateTime.parse(json['timestamp'])
          : DateTime.now(),
      action: json['action'],
      success: json['success'],
    );
  }
}

/// Statistics for AI conversation
class ConversationStats {
  final int totalMessages;
  final int userMessages;
  final int assistantMessages;
  final Map<String, int> actionCounts;
  final Map<String, int> entityTypes;

  ConversationStats({
    required this.totalMessages,
    required this.userMessages,
    required this.assistantMessages,
    required this.actionCounts,
    required this.entityTypes,
  });

  factory ConversationStats.fromJson(Map<String, dynamic> json) {
    return ConversationStats(
      totalMessages: json['totalMessages'] ?? json['total_messages'] ?? 0,
      userMessages: json['userMessages'] ?? json['user_messages'] ?? 0,
      assistantMessages: json['assistantMessages'] ?? json['assistant_messages'] ?? 0,
      actionCounts: json['actionCounts'] != null || json['action_counts'] != null
          ? Map<String, int>.from(json['actionCounts'] ?? json['action_counts'])
          : {},
      entityTypes: json['entityTypes'] != null || json['entity_types'] != null
          ? Map<String, int>.from(json['entityTypes'] ?? json['entity_types'])
          : {},
    );
  }
}

/// Response from AI improve writing
class ImproveWritingResponse {
  final String improved;
  final List<WritingChange> changes;

  ImproveWritingResponse({
    required this.improved,
    required this.changes,
  });

  factory ImproveWritingResponse.fromJson(Map<String, dynamic> json) {
    return ImproveWritingResponse(
      improved: json['improved'] ?? '',
      changes: json['changes'] != null
          ? (json['changes'] as List).map((e) => WritingChange.fromJson(e)).toList()
          : [],
    );
  }
}

/// A writing change suggestion
class WritingChange {
  final String original;
  final String suggested;

  WritingChange({
    required this.original,
    required this.suggested,
  });

  factory WritingChange.fromJson(Map<String, dynamic> json) {
    return WritingChange(
      original: json['original'] ?? '',
      suggested: json['suggested'] ?? '',
    );
  }
}

/// API service for notes operations
class NotesApiService {
  final BaseApiClient _apiClient;
  
  NotesApiService({BaseApiClient? apiClient}) 
      : _apiClient = apiClient ?? BaseApiClient.instance;
  
  // ==================== NOTE OPERATIONS ====================
  
  /// Create a new note
  Future<ApiResponse<Note>> createNote(
    String workspaceId,
    CreateNoteDto dto,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/notes',
        data: dto.toJson(),
      );
      
      return ApiResponse.success(
        Note.fromJson(response.data),
        message: 'Note created successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to create note',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Get notes in workspace
  Future<ApiResponse<List<Note>>> getNotes(
    String workspaceId, {
    String? parentId,
    bool? isDeleted,
    bool? isArchived,
  }) async {
    try {
      final queryParameters = <String, dynamic>{};
      if (parentId != null) queryParameters['parent_id'] = parentId;
      if (isDeleted != null) queryParameters['is_deleted'] = isDeleted;
      if (isArchived != null) queryParameters['is_archived'] = isArchived;

      final response = await _apiClient.get(
        '/workspaces/$workspaceId/notes',
        queryParameters: queryParameters,
      );
      
      final notes = (response.data as List)
          .map((json) => Note.fromJson(json))
          .toList();
      
      return ApiResponse.success(
        notes,
        message: 'Notes retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get notes',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Search notes with unified search modes (keyword, semantic, hybrid)
  /// [mode] - Search mode: 'keyword' (fuzzy text), 'semantic' (AI similarity), 'hybrid' (combined)
  /// [limit] - Maximum results to return (default: 50)
  /// [offset] - Offset for pagination (default: 0)
  Future<ApiResponse<List<Note>>> searchNotes(
    String workspaceId,
    String query, {
    String mode = 'hybrid',
    int limit = 50,
    int offset = 0,
  }) async {
    try {
      final queryParameters = <String, dynamic>{
        'q': query,
        'mode': mode,
        'limit': limit,
        'offset': offset,
      };

      final response = await _apiClient.get(
        '/workspaces/$workspaceId/notes/search',
        queryParameters: queryParameters,
      );

      final notes = (response.data as List)
          .map((json) => Note.fromJson(json))
          .toList();

      return ApiResponse.success(
        notes,
        message: 'Search completed successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to search notes',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Get note details
  Future<ApiResponse<Note>> getNote(
    String workspaceId,
    String noteId,
  ) async {
    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/notes/$noteId',
      );
      
      return ApiResponse.success(
        Note.fromJson(response.data),
        message: 'Note retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get note',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Update a note
  Future<ApiResponse<Note>> updateNote(
    String workspaceId,
    String noteId,
    UpdateNoteDto dto,
  ) async {
    try {
      final response = await _apiClient.patch(
        '/workspaces/$workspaceId/notes/$noteId',
        data: dto.toJson(),
      );

      return ApiResponse.success(
        Note.fromJson(response.data),
        message: 'Note updated successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to update note',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Toggle favorite status of a note
  Future<ApiResponse<Note>> toggleFavorite(
    String workspaceId,
    String noteId,
    bool isFavorite,
  ) async {
    try {
      final response = await _apiClient.patch(
        '/workspaces/$workspaceId/notes/$noteId',
        data: {'is_favorite': isFavorite},
      );

      return ApiResponse.success(
        Note.fromJson(response.data),
        message: isFavorite ? 'Added to favorites' : 'Removed from favorites',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to update favorite status',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Delete a note
  Future<ApiResponse<void>> deleteNote(
    String workspaceId,
    String noteId,
  ) async {
    try {
      final response = await _apiClient.delete(
        '/workspaces/$workspaceId/notes/$noteId',
      );

      return ApiResponse.success(
        null,
        message: 'Note deleted successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to delete note',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Merge multiple notes into one
  Future<ApiResponse<Note>> mergeNotes(
    String workspaceId,
    MergeNotesDto dto,
  ) async {
    try {

      final response = await _apiClient.post(
        '/workspaces/$workspaceId/notes/merge',
        data: dto.toJson(),
      );


      // Check if response.data is a Note object or wrapped in another structure
      dynamic noteData = response.data;

      // If the response has a 'data' field, use that
      if (noteData is Map<String, dynamic> && noteData.containsKey('data')) {
        noteData = noteData['data'];
      }

      return ApiResponse.success(
        Note.fromJson(noteData),
        message: 'Notes merged successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {

      return ApiResponse.error(
        e.response?.data?['message'] ?? e.message ?? 'Failed to merge notes',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    } catch (e) {
      return ApiResponse.error(
        'Unexpected error: ${e.toString()}',
      );
    }
  }

  /// Duplicate a note
  Future<ApiResponse<Note>> duplicateNote(
    String workspaceId,
    String noteId,
    DuplicateNoteDto dto,
  ) async {
    try {

      final response = await _apiClient.post(
        '/workspaces/$workspaceId/notes/$noteId/duplicate',
        data: dto.toJson(),
      );


      // Extract the note from the response
      // Backend returns: { success: true, message: '...', note: {...}, duplicatedCount: 1 }
      dynamic noteData = response.data;

      if (noteData is Map<String, dynamic> && noteData.containsKey('note')) {
        noteData = noteData['note'];
      }

      return ApiResponse.success(
        Note.fromJson(noteData),
        message: response.data['message'] ?? 'Note duplicated successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {

      return ApiResponse.error(
        e.response?.data?['message'] ?? e.message ?? 'Failed to duplicate note',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    } catch (e) {
      return ApiResponse.error(
        'Unexpected error: ${e.toString()}',
      );
    }
  }

  /// Share a note
  Future<ApiResponse<Map<String, dynamic>>> shareNote(
    String workspaceId,
    String noteId,
    ShareNoteDto dto,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/notes/$noteId/share',
        data: dto.toJson(),
      );

      return ApiResponse.success(
        response.data as Map<String, dynamic>,
        message: response.data['message'] ?? 'Note shared successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to share note',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Archive a note
  Future<ApiResponse<Map<String, dynamic>>> archiveNote(
    String workspaceId,
    String noteId,
  ) async {
    try {

      final response = await _apiClient.post(
        '/workspaces/$workspaceId/notes/$noteId/archive',
      );


      return ApiResponse.success(
        response.data as Map<String, dynamic>,
        message: response.data['message'] ?? 'Note archived successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {

      return ApiResponse.error(
        e.response?.data?['message'] ?? e.message ?? 'Failed to archive note',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    } catch (e) {
      return ApiResponse.error(
        'Unexpected error: ${e.toString()}',
      );
    }
  }

  /// Unarchive a note
  Future<ApiResponse<Map<String, dynamic>>> unarchiveNote(
    String workspaceId,
    String noteId,
  ) async {
    try {

      final response = await _apiClient.post(
        '/workspaces/$workspaceId/notes/$noteId/unarchive',
      );


      return ApiResponse.success(
        response.data as Map<String, dynamic>,
        message: response.data['message'] ?? 'Note unarchived successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {

      return ApiResponse.error(
        e.response?.data?['message'] ?? e.message ?? 'Failed to unarchive note',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    } catch (e) {
      return ApiResponse.error(
        'Unexpected error: ${e.toString()}',
      );
    }
  }

  /// Restore a deleted note from trash
  Future<ApiResponse<Map<String, dynamic>>> restoreNote(
    String workspaceId,
    String noteId,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/notes/$noteId/restore',
      );

      return ApiResponse.success(
        response.data as Map<String, dynamic>,
        message: response.data['message'] ?? 'Note restored successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.response?.data?['message'] ?? e.message ?? 'Failed to restore note',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    } catch (e) {
      return ApiResponse.error(
        'Unexpected error: ${e.toString()}',
      );
    }
  }

  /// Permanently delete a note from trash (cannot be undone)
  Future<ApiResponse<Map<String, dynamic>>> permanentlyDeleteNote(
    String workspaceId,
    String noteId,
  ) async {
    try {
      final response = await _apiClient.delete(
        '/workspaces/$workspaceId/notes/$noteId/permanent',
      );

      return ApiResponse.success(
        response.data as Map<String, dynamic>,
        message: response.data['message'] ?? 'Note permanently deleted',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.response?.data?['message'] ?? e.message ?? 'Failed to permanently delete note',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    } catch (e) {
      return ApiResponse.error(
        'Unexpected error: ${e.toString()}',
      );
    }
  }

  // ==================== TEMPLATE OPERATIONS ====================
  
  /// Get note templates
  Future<ApiResponse<List<NoteTemplate>>> getTemplates(String workspaceId) async {
    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/notes/templates',
      );
      
      final templates = (response.data as List)
          .map((json) => NoteTemplate.fromJson(json))
          .toList();
      
      return ApiResponse.success(
        templates,
        message: 'Templates retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get templates',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Create note template
  Future<ApiResponse<NoteTemplate>> createTemplate(
    String workspaceId,
    CreateTemplateDto dto,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/notes/templates',
        data: dto.toJson(),
      );

      return ApiResponse.success(
        NoteTemplate.fromJson(response.data),
        message: 'Template created successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to create template',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  // ==================== AI OPERATIONS ====================

  /// Generate note content using AI
  Future<ApiResponse<Map<String, dynamic>>> generateWithAI(
    String workspaceId,
    String prompt,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/notes/ai-generate',
        data: {'prompt': prompt},
      );

      return ApiResponse.success(
        response.data as Map<String, dynamic>,
        message: 'Content generated successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.response?.data?['message'] ?? e.message ?? 'Failed to generate content',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Improve writing with AI
  /// [action] - The type of improvement: 'improve', 'grammar', 'shorten', 'expand', 'simplify', 'professional'
  Future<ApiResponse<ImproveWritingResponse>> improveWriting(
    String noteId,
    String text,
    String action,
  ) async {
    try {
      final response = await _apiClient.post(
        '/notes/$noteId/ai-improve',
        data: {
          'text': text,
          'action': action,
        },
      );

      return ApiResponse.success(
        ImproveWritingResponse.fromJson(response.data),
        message: 'Writing improved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.response?.data?['message'] ?? e.message ?? 'Failed to improve writing',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Process AI command for notes management
  /// This is the main AI agent endpoint for natural language commands
  Future<ApiResponse<NoteAgentResponse>> processAICommand(
    String workspaceId,
    String prompt,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/notes/ai',
        data: {'prompt': prompt},
      );

      return ApiResponse.success(
        NoteAgentResponse.fromJson(response.data),
        message: 'Command processed successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.response?.data?['message'] ?? e.message ?? 'Failed to process command',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Get AI conversation history
  Future<ApiResponse<List<ConversationMessage>>> getConversationHistory(
    String workspaceId, {
    int limit = 50,
  }) async {
    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/notes/ai/history',
        queryParameters: {'limit': limit},
      );

      final messages = (response.data as List)
          .map((json) => ConversationMessage.fromJson(json))
          .toList();

      return ApiResponse.success(
        messages,
        message: 'History retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.response?.data?['message'] ?? e.message ?? 'Failed to get history',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Clear AI conversation history
  Future<ApiResponse<void>> clearConversationHistory(String workspaceId) async {
    try {
      final response = await _apiClient.delete(
        '/workspaces/$workspaceId/notes/ai/history',
      );

      return ApiResponse.success(
        null,
        message: 'History cleared successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.response?.data?['message'] ?? e.message ?? 'Failed to clear history',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Get AI conversation statistics
  Future<ApiResponse<ConversationStats>> getConversationStats(
    String workspaceId,
  ) async {
    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/notes/ai/stats',
      );

      return ApiResponse.success(
        ConversationStats.fromJson(response.data),
        message: 'Stats retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.response?.data?['message'] ?? e.message ?? 'Failed to get stats',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  // ==================== IMPORT OPERATIONS ====================

  /// Import PDF file and create a note
  /// Backend extracts text, tables, and optionally images from PDF
  Future<ApiResponse<PdfImportResponse>> importPdf(
    String workspaceId,
    String filePath,
    String fileName, {
    required String title,
    String? parentId,
    List<String>? tags,
    bool extractImages = true,
  }) async {
    try {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(filePath, filename: fileName),
        'title': title,
        if (parentId != null) 'parentId': parentId,
        if (tags != null) 'tags': tags.join(','),
        'extractImages': extractImages.toString(),
      });

      final response = await _apiClient.post(
        '/workspaces/$workspaceId/notes/import/pdf',
        data: formData,
        options: Options(
          contentType: 'multipart/form-data',
        ),
      );

      return ApiResponse.success(
        PdfImportResponse.fromJson(response.data),
        message: response.data['message'] ?? 'PDF imported successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.response?.data?['message'] ?? e.message ?? 'Failed to import PDF',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    } catch (e) {
      return ApiResponse.error(
        'Unexpected error: ${e.toString()}',
      );
    }
  }

  /// Import content from URL and create a note
  /// Backend fetches the URL and extracts content (articles, blog posts, etc.)
  Future<ApiResponse<UrlImportResponse>> importUrl(
    String workspaceId, {
    required String url,
    String? title,
    String? parentId,
    List<String>? tags,
  }) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/notes/import/url',
        data: {
          'url': url,
          if (title != null) 'title': title,
          if (parentId != null) 'parentId': parentId,
          if (tags != null) 'tags': tags,
        },
      );

      return ApiResponse.success(
        UrlImportResponse.fromJson(response.data),
        message: response.data['message'] ?? 'URL imported successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.response?.data?['message'] ?? e.message ?? 'Failed to import URL',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    } catch (e) {
      return ApiResponse.error(
        'Unexpected error: ${e.toString()}',
      );
    }
  }
}

/// Response model for PDF import
class PdfImportResponse {
  final bool success;
  final String noteId;
  final String? markdown;
  final String? html;
  final int pageCount;
  final bool hasTable;
  final int imageCount;
  final String? message;

  PdfImportResponse({
    required this.success,
    required this.noteId,
    this.markdown,
    this.html,
    required this.pageCount,
    required this.hasTable,
    required this.imageCount,
    this.message,
  });

  factory PdfImportResponse.fromJson(Map<String, dynamic> json) {
    return PdfImportResponse(
      success: json['success'] ?? true,
      noteId: json['noteId'] ?? '',
      markdown: json['markdown'],
      html: json['html'],
      pageCount: json['pageCount'] ?? 0,
      hasTable: json['hasTable'] ?? false,
      imageCount: json['imageCount'] ?? 0,
      message: json['message'],
    );
  }
}

/// Response model for URL import
class UrlImportResponse {
  final bool success;
  final String noteId;
  final String title;
  final String? excerpt;
  final String? siteName;
  final String? message;

  UrlImportResponse({
    required this.success,
    required this.noteId,
    required this.title,
    this.excerpt,
    this.siteName,
    this.message,
  });

  factory UrlImportResponse.fromJson(Map<String, dynamic> json) {
    return UrlImportResponse(
      success: json['success'] ?? true,
      noteId: json['noteId'] ?? '',
      title: json['title'] ?? '',
      excerpt: json['excerpt'],
      siteName: json['siteName'],
      message: json['message'],
    );
  }
}