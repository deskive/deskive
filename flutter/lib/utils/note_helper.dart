import '../models/note.dart';
import '../services/app_at_once_service.dart';

class NoteHelper {
  static final AppAtOnceService _service = AppAtOnceService.instance;

  /// Create a simple text note
  static Future<Note> createTextNote({
    required String workspaceId,
    required String title,
    required String text,
    required String createdBy,
    String? parentId,
    List<String> tags = const [],
    bool isFavorite = false,
    String? icon,
    String? coverImage,
  }) async {
    final note = Note(
      workspaceId: workspaceId,
      title: title,
      content: _createTextContent(text),
      contentText: text,
      createdBy: createdBy,
      parentId: parentId,
      tags: tags,
      isFavorite: isFavorite,
      icon: icon,
      coverImage: coverImage,
    );

    return await _service.insertNote(note);
  }

  /// Create a rich content note with custom JSON structure
  static Future<Note> createRichNote({
    required String workspaceId,
    required String title,
    required Map<String, dynamic> content,
    String? contentText,
    required String createdBy,
    String? parentId,
    List<String> tags = const [],
    bool isFavorite = false,
    String? icon,
    String? coverImage,
  }) async {
    final note = Note(
      workspaceId: workspaceId,
      title: title,
      content: content,
      contentText: contentText,
      createdBy: createdBy,
      parentId: parentId,
      tags: tags,
      isFavorite: isFavorite,
      icon: icon,
      coverImage: coverImage,
    );

    return await _service.insertNote(note);
  }

  /// Create a template note
  static Future<Note> createTemplate({
    required String workspaceId,
    required String title,
    required Map<String, dynamic> content,
    String? contentText,
    required String createdBy,
    List<String> tags = const [],
    String? icon,
    String? coverImage,
  }) async {
    final note = Note(
      workspaceId: workspaceId,
      title: title,
      content: content,
      contentText: contentText,
      createdBy: createdBy,
      tags: tags,
      isTemplate: true,
      icon: icon,
      coverImage: coverImage,
    );

    return await _service.insertNote(note);
  }

  /// Get all notes for a workspace
  static Future<List<Note>> getWorkspaceNotes(String workspaceId) async {
    return await _service.getNotes(workspaceId: workspaceId);
  }

  /// Get child notes of a parent note
  static Future<List<Note>> getChildNotes(String parentId) async {
    return await _service.getNotes(parentId: parentId);
  }

  /// Update an existing note
  static Future<Note> updateNote(Note note) async {
    return await _service.updateNote(note);
  }

  /// Toggle favorite status
  static Future<Note> toggleFavorite(Note note) async {
    final updatedNote = note.copyWith(
      isFavorite: !note.isFavorite,
    );
    return await _service.updateNote(updatedNote);
  }

  /// Add tags to a note
  static Future<Note> addTags(Note note, List<String> newTags) async {
    final updatedTags = [...note.tags];
    for (final tag in newTags) {
      if (!updatedTags.contains(tag)) {
        updatedTags.add(tag);
      }
    }
    
    final updatedNote = note.copyWith(tags: updatedTags);
    return await _service.updateNote(updatedNote);
  }

  /// Remove tags from a note
  static Future<Note> removeTags(Note note, List<String> tagsToRemove) async {
    final updatedTags = note.tags.where((tag) => !tagsToRemove.contains(tag)).toList();
    final updatedNote = note.copyWith(tags: updatedTags);
    return await _service.updateNote(updatedNote);
  }

  /// Archive a note (soft delete)
  static Future<void> archiveNote(String noteId) async {
    await _service.deleteNote(noteId);
  }

  /// Permanently delete a note
  static Future<void> deleteNotePermanently(String noteId) async {
    await _service.permanentlyDeleteNote(noteId);
  }

  /// Helper method to create a simple text content structure
  static Map<String, dynamic> _createTextContent(String text) {
    return {
      'type': 'doc',
      'content': [
        {
          'type': 'paragraph',
          'content': [
            {
              'type': 'text',
              'text': text,
            }
          ]
        }
      ]
    };
  }

  /// Helper method to create a heading content structure
  static Map<String, dynamic> createHeadingContent(String text, int level) {
    return {
      'type': 'doc',
      'content': [
        {
          'type': 'heading',
          'attrs': {'level': level},
          'content': [
            {
              'type': 'text',
              'text': text,
            }
          ]
        }
      ]
    };
  }

  /// Helper method to create a bulleted list content
  static Map<String, dynamic> createBulletListContent(List<String> items) {
    return {
      'type': 'doc',
      'content': [
        {
          'type': 'bulletList',
          'content': items.map((item) => {
            'type': 'listItem',
            'content': [
              {
                'type': 'paragraph',
                'content': [
                  {
                    'type': 'text',
                    'text': item,
                  }
                ]
              }
            ]
          }).toList()
        }
      ]
    };
  }
}