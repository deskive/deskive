import 'note.dart';
import '../api/services/notes_api_service.dart' as api;
import '../api/base_api_client.dart';
import '../services/app_at_once_service.dart';
import 'package:flutter/foundation.dart';

class NotesService {
  static final NotesService _instance = NotesService._internal();
  factory NotesService() => _instance;
  NotesService._internal();

  List<Note> _notes = <Note>[];
  final api.NotesApiService _notesApiService = api.NotesApiService();
  final AppAtOnceService _appAtOnceService = AppAtOnceService.instance;
  DateTime? _lastFetchTime;

  List<Note> get notes => List.unmodifiable(activeNotes);

  void initialize() {
    _loadSampleNotes();
  }

  /// Fetch notes from API
  Future<List<Note>> fetchNotesFromApi({String? parentId, bool forceRefresh = false}) async {
    try {
      // Use cache if available and fresh (within 5 minutes)
      if (!forceRefresh && 
          _notes.isNotEmpty && 
          _lastFetchTime != null &&
          DateTime.now().difference(_lastFetchTime!).inMinutes < 5) {
        if (parentId != null) {
          return _notes.where((note) => note.parentId == parentId && !note.isDeleted && !note.isTemplate).toList();
        }
        return activeNotes;
      }

      final workspaceId = _appAtOnceService.currentWorkspaceId;
      if (workspaceId == null) {
        return _notes;
      }


      final response = await _notesApiService.getNotes(workspaceId, parentId: parentId);

      if (response.success && response.data != null) {
        // Convert API response notes to local model
        final List<Note> apiNotes = response.data!.map((apiNoteData) {
          return Note(
            id: apiNoteData.id,
            parentId: apiNoteData.parentId,
            title: apiNoteData.title,
            description: apiNoteData.content ?? '',
            content: apiNoteData.content ?? '',
            icon: '📝',
            categoryId: apiNoteData.category ?? 'work',
            subcategory: 'Notes',
            keywords: apiNoteData.tags ?? [],
            isFavorite: false,
            isTemplate: false,
            isDeleted: false,
            collaborators: [],
            activities: [],
            createdAt: apiNoteData.createdAt,
            updatedAt: apiNoteData.updatedAt,
          );
        }).toList();

        // If no parent ID, replace all notes; otherwise merge
        if (parentId == null) {
          _notes = [..._loadDefaultNotes(), ...apiNotes];
        } else {
          // Remove existing notes with this parent and add new ones
          _notes.removeWhere((note) => note.parentId == parentId);
          _notes.addAll(apiNotes);
        }

        _lastFetchTime = DateTime.now();
        
        return apiNotes;
      } else {
        return _notes.where((note) => parentId == null || note.parentId == parentId).toList();
      }
    } catch (e) {
      return _notes.where((note) => parentId == null || note.parentId == parentId).toList();
    }
  }

  void _loadSampleNotes() {
    _notes = _loadDefaultNotes();
  }

  List<Note> _loadDefaultNotes() {
    final now = DateTime.now();
    return [
      Note(
        id: '1',
        title: 'Sprint Planning Meeting',
        description: 'Q1 2025 Sprint Planning Session',
        content: 'Discussed upcoming sprint goals, assigned tasks to team members. Need to follow up on budget approval for new tools.',
        icon: '🤝',
        categoryId: 'meeting',
        subcategory: 'Agenda',
        keywords: ['sprint', 'planning', 'Q1', 'budget'],
        isFavorite: true,
        collaborators: [
          Collaborator(
            id: '1',
            name: 'John Smith',
            email: 'john.smith@company.com',
            avatar: 'JS',
            role: CollaboratorRole.editor,
            addedAt: now.subtract(const Duration(hours: 3)),
          ),
          Collaborator(
            id: '2',
            name: 'Sarah Johnson',
            email: 'sarah.johnson@company.com',
            avatar: 'SJ',
            role: CollaboratorRole.viewer,
            addedAt: now.subtract(const Duration(hours: 2)),
          ),
        ],
        activities: [
          Activity(
            id: '1',
            noteId: '1',
            userId: 'user_1',
            userName: 'Current User',
            userAvatar: 'CU',
            type: ActivityType.created,
            description: 'Created this note',
            timestamp: now.subtract(const Duration(hours: 2)),
          ),
          Activity(
            id: '2',
            noteId: '1',
            userId: '1',
            userName: 'John Smith',
            userAvatar: 'JS',
            type: ActivityType.updated,
            description: 'Updated the note content',
            timestamp: now.subtract(const Duration(hours: 1)),
          ),
          Activity(
            id: '3',
            noteId: '1',
            userId: '2',
            userName: 'Sarah Johnson',
            userAvatar: 'SJ',
            type: ActivityType.favorited,
            description: 'Added to favorites',
            timestamp: now.subtract(const Duration(minutes: 30)),
          ),
        ],
        createdAt: now.subtract(const Duration(hours: 2)),
        updatedAt: now.subtract(const Duration(hours: 1)),
      ),
      Note(
        id: '2',
        title: 'Mobile App Redesign',
        description: 'UI/UX overhaul for version 2.0',
        content: 'Project scope includes new navigation, dark mode support, and improved performance. Timeline: 3 months.',
        icon: '🎨',
        categoryId: 'project',
        subcategory: 'Planning',
        keywords: ['mobile', 'redesign', 'UI/UX', 'dark mode'],
        createdAt: now.subtract(const Duration(days: 1)),
        updatedAt: now.subtract(const Duration(hours: 3)),
      ),
      Note(
        id: '3',
        title: 'Study Plan - Flutter',
        description: 'Advanced Flutter concepts and state management',
        content: 'Focus areas: Riverpod, advanced animations, custom painters, and performance optimization.',
        icon: '📚',
        categoryId: 'study',
        subcategory: 'Notes',
        keywords: ['Flutter', 'Riverpod', 'animations', 'performance'],
        isFavorite: true,
        createdAt: now.subtract(const Duration(days: 2)),
        updatedAt: now.subtract(const Duration(days: 1)),
      ),
      Note(
        id: '4',
        title: 'Quarterly Report',
        description: 'Q4 2024 performance metrics',
        content: 'Compile team performance data, project completion rates, and client satisfaction scores.',
        icon: '📊',
        categoryId: 'work',
        subcategory: 'Reports',
        keywords: ['quarterly', 'metrics', 'performance', 'Q4'],
        createdAt: now.subtract(const Duration(days: 3)),
        updatedAt: now.subtract(const Duration(days: 2)),
      ),
      Note(
        id: '5',
        title: 'Personal Goals 2025',
        description: 'New year resolutions and objectives',
        content: 'Health: Exercise 4x/week. Career: Complete 2 certifications. Personal: Read 24 books.',
        icon: '🎯',
        categoryId: 'personal',
        subcategory: 'Goals',
        keywords: ['goals', '2025', 'resolutions', 'personal development'],
        createdAt: now.subtract(const Duration(days: 4)),
        updatedAt: now.subtract(const Duration(days: 3)),
      ),
      Note(
        id: '6',
        title: 'Weekend Trip Planning',
        description: 'Planning a weekend getaway to the mountains',
        content: 'Destination: Lake Tahoe. Activities: Hiking, kayaking, photography. Need to book hotel and pack outdoor gear.',
        icon: '🏔️',
        categoryId: 'personal',
        subcategory: 'Travel',
        keywords: ['weekend', 'travel', 'mountains', 'lake tahoe'],
        isFavorite: true,
        createdAt: now.subtract(const Duration(days: 5)),
        updatedAt: now.subtract(const Duration(days: 1)),
      ),
      Note(
        id: '7',
        title: 'Team Building Ideas',
        description: 'Creative ideas for next team building event',
        content: 'Options: Escape room, cooking class, mini golf tournament, outdoor scavenger hunt. Budget: \$50 per person.',
        icon: '🎉',
        categoryId: 'work',
        subcategory: 'Events',
        keywords: ['team building', 'events', 'activities', 'budget'],
        createdAt: now.subtract(const Duration(days: 6)),
        updatedAt: now.subtract(const Duration(days: 4)),
      ),
      Note(
        id: '8',
        title: 'Book Recommendations',
        description: 'Must-read books for 2025',
        content: 'Fiction: "The Seven Husbands of Evelyn Hugo", "Project Hail Mary". Non-fiction: "Atomic Habits", "Thinking Fast and Slow".',
        icon: '📖',
        categoryId: 'personal',
        subcategory: 'Reading',
        keywords: ['books', 'reading', 'recommendations', 'fiction'],
        isFavorite: true,
        createdAt: now.subtract(const Duration(days: 7)),
        updatedAt: now.subtract(const Duration(days: 5)),
      ),
      Note(
        id: '9',
        title: 'API Documentation',
        description: 'REST API endpoints for the mobile app',
        content: 'User auth: POST /login, GET /profile. Notes: GET /notes, POST /notes, PUT /notes/:id, DELETE /notes/:id.',
        icon: '🔗',
        categoryId: 'work',
        subcategory: 'Development',
        keywords: ['API', 'documentation', 'endpoints', 'REST'],
        createdAt: now.subtract(const Duration(days: 8)),
        updatedAt: now.subtract(const Duration(days: 6)),
      ),
      Note(
        id: '10',
        title: 'Recipe Collection',
        description: 'Favorite recipes to try',
        content: 'Pasta: Carbonara, Aglio e Olio. Asian: Pad Thai, Chicken Teriyaki. Desserts: Tiramisu, Chocolate Lava Cake.',
        icon: '🍳',
        categoryId: 'personal',
        subcategory: 'Cooking',
        keywords: ['recipes', 'cooking', 'pasta', 'desserts'],
        createdAt: now.subtract(const Duration(days: 9)),
        updatedAt: now.subtract(const Duration(days: 7)),
      ),
      Note(
        id: '11',
        title: 'Client Feedback Summary',
        description: 'Compilation of recent client feedback',
        content: 'Positive: Great communication, timely delivery. Areas to improve: More detailed progress updates, better testing.',
        icon: '💬',
        categoryId: 'work',
        subcategory: 'Feedback',
        keywords: ['client', 'feedback', 'communication', 'improvement'],
        createdAt: now.subtract(const Duration(days: 10)),
        updatedAt: now.subtract(const Duration(days: 8)),
      ),
      Note(
        id: '12',
        title: 'Workout Routine',
        description: 'Weekly exercise schedule',
        content: 'Monday: Chest & Triceps. Wednesday: Back & Biceps. Friday: Legs & Shoulders. Weekend: Cardio or hiking.',
        icon: '💪',
        categoryId: 'personal',
        subcategory: 'Fitness',
        keywords: ['workout', 'exercise', 'fitness', 'routine'],
        isFavorite: true,
        createdAt: now.subtract(const Duration(days: 11)),
        updatedAt: now.subtract(const Duration(days: 2)),
      ),
    ];
  }

  /// Create a new note using the API
  Future<String> createNote({
    required String title,
    required String description,
    required String content,
    String icon = '📝',
    required String categoryId,
    required String subcategory,
    required List<String> keywords,
    bool isFavorite = false,
    bool isArchived = false,
    String? parentId,
  }) async {
    try {
      final workspaceId = _appAtOnceService.currentWorkspaceId;
      if (workspaceId == null) {
        // Fallback to local creation if no workspace
        return _createNoteLocally(
          title: title,
          description: description,
          content: content,
          icon: icon,
          categoryId: categoryId,
          subcategory: subcategory,
          keywords: keywords,
          isFavorite: isFavorite,
          parentId: parentId,
        );
      }


      final createNoteDto = api.CreateNoteDto(
        title: title,
        content: content,
        parentId: parentId,
        tags: keywords,
        category: categoryId,
        isPublic: false,
      );

      final response = await _notesApiService.createNote(workspaceId, createNoteDto);

      if (response.success && response.data != null) {
        final apiNote = response.data!;
        
        // Convert API response to local model
        final createdNote = Note(
          id: apiNote.id,
          parentId: apiNote.parentId,
          title: apiNote.title,
          description: description,
          content: apiNote.content ?? content,
          icon: icon,
          categoryId: apiNote.category ?? categoryId,
          subcategory: subcategory,
          keywords: apiNote.tags ?? keywords,
          isFavorite: isFavorite,
          isTemplate: false,
          isDeleted: false,
          collaborators: [],
          activities: [],
          createdAt: apiNote.createdAt,
          updatedAt: apiNote.updatedAt,
        );

        _notes.insert(0, createdNote);
        return createdNote.id;
      } else {
        // Fallback to local creation
        return _createNoteLocally(
          title: title,
          description: description,
          content: content,
          icon: icon,
          categoryId: categoryId,
          subcategory: subcategory,
          keywords: keywords,
          isFavorite: isFavorite,
          parentId: parentId,
        );
      }
    } catch (e) {
      // Fallback to local creation
      return _createNoteLocally(
        title: title,
        description: description,
        content: content,
        icon: icon,
        categoryId: categoryId,
        subcategory: subcategory,
        keywords: keywords,
        isFavorite: isFavorite,
        parentId: parentId,
      );
    }
  }

  /// Local note creation fallback
  String _createNoteLocally({
    required String title,
    required String description,
    required String content,
    String icon = '📝',
    required String categoryId,
    required String subcategory,
    required List<String> keywords,
    bool isFavorite = false,
    String? parentId,
  }) {
    final now = DateTime.now();
    final newNote = Note(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      parentId: parentId,
      title: title,
      description: description,
      content: content,
      icon: icon,
      categoryId: categoryId,
      subcategory: subcategory,
      keywords: keywords,
      isFavorite: isFavorite,
      createdAt: now,
      updatedAt: now,
    );

    _notes.insert(0, newNote);
    return newNote.id;
  }

  /// Update note using API
  Future<bool> updateNote({
    required String id,
    required String title,
    required String description,
    required String content,
    String? icon,
    required String categoryId,
    required String subcategory,
    required List<String> keywords,
  }) async {
    try {
      final workspaceId = _appAtOnceService.currentWorkspaceId;
      if (workspaceId == null) {
        // Fallback to local update
        return _updateNoteLocally(
          id: id,
          title: title,
          description: description,
          content: content,
          icon: icon,
          categoryId: categoryId,
          subcategory: subcategory,
          keywords: keywords,
        );
      }


      final updateNoteDto = api.UpdateNoteDto(
        title: title,
        content: content,
        tags: keywords,
        category: categoryId,
      );

      final response = await _notesApiService.updateNote(workspaceId, id, updateNoteDto);

      if (response.success && response.data != null) {
        final apiNote = response.data!;
        
        // Update local note
        final index = _notes.indexWhere((note) => note.id == id);
        if (index != -1) {
          _notes[index] = _notes[index].copyWith(
            title: apiNote.title,
            description: description,
            content: apiNote.content ?? content,
            icon: icon,
            categoryId: apiNote.category ?? categoryId,
            subcategory: subcategory,
            keywords: apiNote.tags ?? keywords,
            updatedAt: apiNote.updatedAt,
          );
          return true;
        }
      } else {
        // Fallback to local update
        return _updateNoteLocally(
          id: id,
          title: title,
          description: description,
          content: content,
          icon: icon,
          categoryId: categoryId,
          subcategory: subcategory,
          keywords: keywords,
        );
      }
    } catch (e) {
      // Fallback to local update
      return _updateNoteLocally(
        id: id,
        title: title,
        description: description,
        content: content,
        icon: icon,
        categoryId: categoryId,
        subcategory: subcategory,
        keywords: keywords,
      );
    }
    return false;
  }

  /// Local note update fallback
  bool _updateNoteLocally({
    required String id,
    required String title,
    required String description,
    required String content,
    String? icon,
    required String categoryId,
    required String subcategory,
    required List<String> keywords,
  }) {
    final index = _notes.indexWhere((note) => note.id == id);
    if (index != -1) {
      _notes[index] = _notes[index].copyWith(
        title: title,
        description: description,
        content: content,
        icon: icon,
        categoryId: categoryId,
        subcategory: subcategory,
        keywords: keywords,
        updatedAt: DateTime.now(),
      );
      return true;
    }
    return false;
  }

  /// Delete note using API
  Future<bool> deleteNote(String id) async {
    try {
      final workspaceId = _appAtOnceService.currentWorkspaceId;
      if (workspaceId == null) {
        // Fallback to local delete
        return _deleteNoteLocally(id);
      }


      final response = await _notesApiService.deleteNote(workspaceId, id);

      if (response.success) {
        // Remove from local notes or mark as deleted
        final index = _notes.indexWhere((note) => note.id == id);
        if (index != -1) {
          _notes[index] = _notes[index].copyWith(
            isDeleted: true,
            updatedAt: DateTime.now(),
          );
          return true;
        }
      } else {
        // Fallback to local delete
        return _deleteNoteLocally(id);
      }
    } catch (e) {
      // Fallback to local delete
      return _deleteNoteLocally(id);
    }
    return false;
  }

  /// Local note delete fallback
  bool _deleteNoteLocally(String id) {
    final index = _notes.indexWhere((note) => note.id == id);
    if (index != -1) {
      // Soft delete - mark as deleted instead of removing
      _notes[index] = _notes[index].copyWith(
        isDeleted: true,
        updatedAt: DateTime.now(),
      );
      return true;
    }
    return false;
  }

  bool permanentlyDeleteNote(String id) {
    final index = _notes.indexWhere((note) => note.id == id);
    if (index != -1) {
      _notes.removeAt(index);
      return true;
    }
    return false;
  }

  bool restoreFromTrash(String id) {
    final index = _notes.indexWhere((note) => note.id == id);
    if (index != -1) {
      _notes[index] = _notes[index].copyWith(
        isDeleted: false,
        updatedAt: DateTime.now(),
      );
      return true;
    }
    return false;
  }

  bool saveAsTemplate(String id) {
    final index = _notes.indexWhere((note) => note.id == id);
    if (index != -1) {
      _notes[index] = _notes[index].copyWith(
        isTemplate: true,
        updatedAt: DateTime.now(),
      );
      return true;
    }
    return false;
  }

  String createNoteFromTemplate(String templateId, {required String newTitle}) {
    final template = _notes.firstWhere((note) => note.id == templateId && note.isTemplate);
    final now = DateTime.now();
    final newNote = template.copyWith(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      title: newTitle,
      isTemplate: false,
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
      collaborators: [],
      activities: [],
    );
    _notes.insert(0, newNote);
    return newNote.id;
  }

  Note? getNote(String id) {
    try {
      return _notes.firstWhere((note) => note.id == id);
    } catch (e) {
      return null;
    }
  }

  void restoreNote(Note note) {
    _notes.insert(0, note);
  }

  bool toggleFavorite(String id) {
    final index = _notes.indexWhere((note) => note.id == id);
    if (index != -1) {
      _notes[index] = _notes[index].copyWith(
        isFavorite: !_notes[index].isFavorite,
        updatedAt: DateTime.now(),
      );
      return true;
    }
    return false;
  }

  List<Note> get favoriteNotes => _notes.where((note) => note.isFavorite && !note.isDeleted && !note.isTemplate).toList();

  List<Note> get recentNotes {
    final now = DateTime.now();
    return _notes.where((note) {
      final daysDifference = now.difference(note.updatedAt).inDays;
      return daysDifference <= 7 && !note.isDeleted && !note.isTemplate; // Notes from last 7 days
    }).toList();
  }

  List<Note> get templateNotes => _notes.where((note) => note.isTemplate && !note.isDeleted).toList();

  List<Note> get deletedNotes => _notes.where((note) => note.isDeleted).toList();

  List<Note> get activeNotes => _notes.where((note) => !note.isDeleted && !note.isTemplate).toList();

  List<Note> getChildNotes(String parentId) => _notes.where((note) => note.parentId == parentId && !note.isDeleted).toList();

  List<Note> searchNotes(String query, {bool includeDeleted = false, bool includeTemplates = false}) {
    final notesToSearch = _notes.where((note) {
      if (!includeDeleted && note.isDeleted) return false;
      if (!includeTemplates && note.isTemplate) return false;
      return true;
    }).toList();
    
    if (query.isEmpty) return notesToSearch;
    
    return notesToSearch.where((note) {
      final lowerQuery = query.toLowerCase();
      return note.title.toLowerCase().contains(lowerQuery) ||
             note.description.toLowerCase().contains(lowerQuery) ||
             note.content.toLowerCase().contains(lowerQuery) ||
             note.subcategory.toLowerCase().contains(lowerQuery) ||
             note.keywords.any((keyword) => keyword.toLowerCase().contains(lowerQuery)) ||
             (note.category?.name.toLowerCase().contains(lowerQuery) ?? false);
    }).toList();
  }

  bool addCollaborator(String noteId, Collaborator collaborator) {
    final index = _notes.indexWhere((note) => note.id == noteId);
    if (index != -1) {
      final existingCollaborators = List<Collaborator>.from(_notes[index].collaborators);
      // Check if collaborator already exists
      if (!existingCollaborators.any((c) => c.email == collaborator.email)) {
        existingCollaborators.add(collaborator);
        _notes[index] = _notes[index].copyWith(
          collaborators: existingCollaborators,
          updatedAt: DateTime.now(),
        );
        return true;
      }
    }
    return false;
  }

  bool removeCollaborator(String noteId, String collaboratorId) {
    final index = _notes.indexWhere((note) => note.id == noteId);
    if (index != -1) {
      final existingCollaborators = List<Collaborator>.from(_notes[index].collaborators);
      existingCollaborators.removeWhere((c) => c.id == collaboratorId);
      _notes[index] = _notes[index].copyWith(
        collaborators: existingCollaborators,
        updatedAt: DateTime.now(),
      );
      return true;
    }
    return false;
  }

  bool updateCollaboratorRole(String noteId, String collaboratorId, CollaboratorRole newRole) {
    final index = _notes.indexWhere((note) => note.id == noteId);
    if (index != -1) {
      final existingCollaborators = List<Collaborator>.from(_notes[index].collaborators);
      final collaboratorIndex = existingCollaborators.indexWhere((c) => c.id == collaboratorId);
      if (collaboratorIndex != -1) {
        existingCollaborators[collaboratorIndex] = existingCollaborators[collaboratorIndex].copyWith(role: newRole);
        _notes[index] = _notes[index].copyWith(
          collaborators: existingCollaborators,
          updatedAt: DateTime.now(),
        );
        return true;
      }
    }
    return false;
  }

  void addActivity(String noteId, Activity activity) {
    final index = _notes.indexWhere((note) => note.id == noteId);
    if (index != -1) {
      final existingActivities = List<Activity>.from(_notes[index].activities);
      existingActivities.insert(0, activity); // Add to beginning for chronological order
      _notes[index] = _notes[index].copyWith(
        activities: existingActivities,
        updatedAt: DateTime.now(),
      );
    }
  }

  List<Activity> getRecentActivities(String noteId, {int limit = 5}) {
    final note = _notes.firstWhere((note) => note.id == noteId, orElse: () => _notes.first);
    return note.activities.take(limit).toList();
  }

  Activity? getLastActivity(String noteId) {
    final note = _notes.firstWhere((note) => note.id == noteId, orElse: () => _notes.first);
    return note.activities.isNotEmpty ? note.activities.first : null;
  }

  Future<String> mergeNotes(List<String> noteIds, String title) async {
    if (noteIds.isEmpty) return '';

    final notesToMerge = noteIds
        .map((id) => _notes.firstWhere(
              (note) => note.id == id,
              orElse: () => _notes.first,
            ))
        .where((note) => note.id != _notes.first.id)
        .toList();

    if (notesToMerge.isEmpty) return '';

    // Create merged content
    final mergedContent = notesToMerge
        .map((note) => '## ${note.title}\n\n${note.content}')
        .join('\n\n---\n\n');

    // Get the first note's properties as defaults
    final firstNote = notesToMerge.first;

    // Create new merged note
    final newNoteId = await createNote(
      title: title,
      description: 'Merged from ${notesToMerge.length} notes',
      content: mergedContent,
      icon: firstNote.icon,
      categoryId: firstNote.categoryId,
      subcategory: firstNote.subcategory,
      keywords: notesToMerge
          .expand((note) => note.keywords)
          .toSet()
          .toList(),
      isFavorite: notesToMerge.any((note) => note.isFavorite),
    );

    // Delete the original notes
    for (final id in noteIds) {
      await deleteNote(id);
    }

    return newNoteId;
  }

  String formatDateTime(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inDays == 0) {
      if (difference.inHours == 0) {
        return '${difference.inMinutes} minutes ago';
      } else {
        return '${difference.inHours} hours ago';
      }
    } else if (difference.inDays == 1) {
      return 'Yesterday';
    } else {
      return '${difference.inDays} days ago';
    }
  }

  bool updateNoteCollaborators(String noteId, List<Collaborator> collaborators) {
    final index = _notes.indexWhere((note) => note.id == noteId);
    if (index != -1) {
      _notes[index] = _notes[index].copyWith(
        collaborators: collaborators,
        updatedAt: DateTime.now(),
      );
      return true;
    }
    return false;
  }

  // ==================== API SEARCH METHODS ====================

  /// Search notes using unified API with support for keyword, semantic, and hybrid modes
  /// [mode] - Search mode: 'keyword' (fuzzy text), 'semantic' (AI similarity), 'hybrid' (combined, default)
  /// [limit] - Maximum results to return (default: 50)
  /// [offset] - Offset for pagination (default: 0)
  Future<List<Note>> searchNotesApi(
    String query, {
    bool includeDeleted = false,
    bool includeTemplates = false,
    String mode = 'hybrid',
    int limit = 50,
    int offset = 0,
  }) async {
    try {
      final workspaceId = _appAtOnceService.currentWorkspaceId;
      if (workspaceId == null) {
        return searchNotes(query, includeDeleted: includeDeleted, includeTemplates: includeTemplates);
      }

      if (query.trim().isEmpty) {
        return [];
      }

      final response = await _notesApiService.searchNotes(
        workspaceId,
        query,
        mode: mode,
        limit: limit,
        offset: offset,
      );

      if (response.success && response.data != null) {
        // Convert API response notes to local model
        final List<Note> searchResults = response.data!.map((apiNoteData) {
          return Note(
            id: apiNoteData.id,
            parentId: apiNoteData.parentId,
            title: apiNoteData.title,
            description: apiNoteData.content ?? '',
            content: apiNoteData.content ?? '',
            icon: '📝',
            categoryId: apiNoteData.category ?? 'work',
            subcategory: 'Notes',
            keywords: apiNoteData.tags ?? [],
            isFavorite: false,
            isTemplate: false,
            isDeleted: false,
            collaborators: [],
            activities: [],
            createdAt: apiNoteData.createdAt,
            updatedAt: apiNoteData.updatedAt,
          );
        }).toList();

        return searchResults;
      } else {
        // Fallback to local search
        return searchNotes(query, includeDeleted: includeDeleted, includeTemplates: includeTemplates);
      }
    } catch (e) {
      // Fallback to local search
      return searchNotes(query, includeDeleted: includeDeleted, includeTemplates: includeTemplates);
    }
  }

  // ==================== TEMPLATES METHODS ====================

  /// Get note templates from API
  Future<List<Note>> getTemplatesFromApi() async {
    try {
      final workspaceId = _appAtOnceService.currentWorkspaceId;
      if (workspaceId == null) {
        return [];
      }


      final response = await _notesApiService.getTemplates(workspaceId);

      if (response.success && response.data != null) {

        // Convert NoteTemplate objects to Note objects
        final notes = response.data!.map((template) {
          return Note(
            id: template.id,
            title: template.name,
            description: template.description,
            content: template.content,
            icon: '📄',
            categoryId: template.category,
            subcategory: '',
            keywords: template.tags ?? [],
            isFavorite: false,
            isTemplate: true,
            createdAt: template.createdAt,
            updatedAt: template.createdAt,
          );
        }).toList();

        return notes;
      } else {
        return [];
      }
    } catch (e) {
      return [];
    }
  }

  /// Create note template using API
  Future<bool> createTemplateApi({
    required String name,
    required String description,
    required String content,
    required String category,
    List<String>? tags,
    Map<String, dynamic>? variables,
  }) async {
    try {
      final workspaceId = _appAtOnceService.currentWorkspaceId;
      if (workspaceId == null) {
        return false;
      }


      final createTemplateDto = api.CreateTemplateDto(
        name: name,
        description: description,
        content: content,
        category: category,
        tags: tags,
        variables: variables,
      );

      final response = await _notesApiService.createTemplate(workspaceId, createTemplateDto);

      if (response.success && response.data != null) {
        return true;
      } else {
        return false;
      }
    } catch (e) {
      return false;
    }
  }

  // ==================== SHARING METHODS ====================

  /// Share note using API
  Future<bool> shareNoteApi({
    required String noteId,
    required List<String> userIds,
    required String permission, // 'read', 'write', 'admin'
    DateTime? expiresAt,
  }) async {
    try {
      final workspaceId = _appAtOnceService.currentWorkspaceId;
      if (workspaceId == null) {
        return false;
      }


      final shareNoteDto = api.ShareNoteDto(
        userIds: userIds,
      );

      final response = await _notesApiService.shareNote(workspaceId, noteId, shareNoteDto);

      if (response.success && response.data != null) {
        return true;
      } else {
        return false;
      }
    } catch (e) {
      return false;
    }
  }

  // ==================== EXPORT FUNCTIONALITY ====================

  /// Export note content in various formats
  String exportNote(String noteId, {String format = 'markdown'}) {
    final note = getNote(noteId);
    if (note == null) return '';

    switch (format.toLowerCase()) {
      case 'markdown':
        return _exportToMarkdown(note);
      case 'html':
        return _exportToHtml(note);
      case 'text':
        return _exportToText(note);
      default:
        return _exportToMarkdown(note);
    }
  }

  String _exportToMarkdown(Note note) {
    final buffer = StringBuffer();
    buffer.writeln('# ${note.title}');
    buffer.writeln();
    if (note.description.isNotEmpty) {
      buffer.writeln('*${note.description}*');
      buffer.writeln();
    }
    buffer.writeln(note.content);
    buffer.writeln();
    buffer.writeln('---');
    buffer.writeln('**Tags:** ${note.keywords.join(', ')}');
    buffer.writeln('**Category:** ${note.categoryId}');
    buffer.writeln('**Created:** ${note.createdAt.toString()}');
    buffer.writeln('**Updated:** ${note.updatedAt.toString()}');
    return buffer.toString();
  }

  String _exportToHtml(Note note) {
    final buffer = StringBuffer();
    buffer.writeln('<!DOCTYPE html>');
    buffer.writeln('<html><head><title>${note.title}</title></head><body>');
    buffer.writeln('<h1>${note.title}</h1>');
    if (note.description.isNotEmpty) {
      buffer.writeln('<p><em>${note.description}</em></p>');
    }
    buffer.writeln('<div>${note.content.replaceAll('\n', '<br>')}</div>');
    buffer.writeln('<hr>');
    buffer.writeln('<p><strong>Tags:</strong> ${note.keywords.join(', ')}</p>');
    buffer.writeln('<p><strong>Category:</strong> ${note.categoryId}</p>');
    buffer.writeln('<p><strong>Created:</strong> ${note.createdAt.toString()}</p>');
    buffer.writeln('<p><strong>Updated:</strong> ${note.updatedAt.toString()}</p>');
    buffer.writeln('</body></html>');
    return buffer.toString();
  }

  String _exportToText(Note note) {
    final buffer = StringBuffer();
    buffer.writeln(note.title);
    buffer.writeln('=' * note.title.length);
    buffer.writeln();
    if (note.description.isNotEmpty) {
      buffer.writeln(note.description);
      buffer.writeln();
    }
    buffer.writeln(note.content);
    buffer.writeln();
    buffer.writeln('Tags: ${note.keywords.join(', ')}');
    buffer.writeln('Category: ${note.categoryId}');
    buffer.writeln('Created: ${note.createdAt.toString()}');
    buffer.writeln('Updated: ${note.updatedAt.toString()}');
    return buffer.toString();
  }
}