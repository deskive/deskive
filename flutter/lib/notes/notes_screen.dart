import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:dio/dio.dart';
import 'dart:io';
import 'note.dart';
import 'notes_service.dart';
import 'note_editor_screen.dart';
import 'share_to_app_screen.dart';
import '../services/app_at_once_service.dart';
import '../services/analytics_service.dart';
import '../config/app_config.dart';
import '../models/note.dart' as models;
import '../api/services/notes_api_service.dart' as api;
import '../api/services/calendar_api_service.dart' as calendar_api;
import '../providers/auth_provider.dart';
import '../services/workspace_service.dart';
import '../config/env_config.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:path_provider/path_provider.dart';
import 'package:open_filex/open_filex.dart';
import 'widgets/share_note_dialog.dart';
import 'widgets/file_import_modal.dart';
import '../theme/app_theme.dart';
import '../widgets/deskive_toolbar.dart';
import '../widgets/ai_button.dart';
import 'ai_notes_assistant.dart';
import '../widgets/google_drive_folder_picker.dart';
import '../apps/services/google_drive_service.dart';

class NotesScreen extends StatefulWidget {
  const NotesScreen({super.key});

  @override
  State<NotesScreen> createState() => NotesScreenState();
}

class NotesScreenState extends State<NotesScreen> with SingleTickerProviderStateMixin {
  final NotesService _notesService = NotesService();
  final api.NotesApiService _notesApiService = api.NotesApiService();
  final WorkspaceService _workspaceService = WorkspaceService.instance;
  late TabController _tabController;

  // Search, Filter, Sort state
  final TextEditingController _searchController = TextEditingController();
  bool _isSearching = false;
  String _searchQuery = '';
  String _selectedFilter = 'all'; // all, work, personal, study, project, meeting
  String _selectedSort = 'updated'; // updated, created, title, category

  // Selection mode state
  bool _isSelectionMode = false;
  final Set<String> _selectedNoteIds = {};

  // Expansion state for parent notes
  final Set<String> _expandedParentIds = {};

  // AppAtOnce database notes
  List<models.Note> _appAtOnceNotes = [];
  List<models.Note> _deletedAppAtOnceNotes = [];
  bool _isLoadingNotes = true;
  bool _isLoadingDeletedNotes = false;
  String? _loadError;

  @override
  void initState() {
    super.initState();
    AnalyticsService.instance.logScreenView(screenName: 'NotesScreen');
    _tabController = TabController(length: 5, vsync: this);
    _tabController.addListener(_onTabChanged);
    _notesService.initialize();

    // Listen to workspace changes
    _workspaceService.addListener(_onWorkspaceChanged);

    _initializeAndLoadNotes();
  }

  void _onWorkspaceChanged() {

    // Reload notes with new workspace
    _loadNotesFromDatabase();

    // Clear deleted notes so they reload when trash tab is opened
    if (mounted) {
      setState(() {
        _deletedAppAtOnceNotes = [];
      });
    }
  }

  // Archived notes list
  List<models.Note> _archivedAppAtOnceNotes = [];
  bool _isLoadingArchivedNotes = false;

  void _onTabChanged() {
    // Load archived notes when archive tab (index 3) is selected
    if (_tabController.index == 3 && _archivedAppAtOnceNotes.isEmpty) {
      _loadArchivedNotesFromDatabase();
    }
    // Load deleted notes when trash tab (index 4) is selected
    if (_tabController.index == 4 && _deletedAppAtOnceNotes.isEmpty) {
      _loadDeletedNotesFromDatabase();
    }
  }
  
  Future<void> _initializeAndLoadNotes() async {
    // Directly load notes from database via REST API
    await _loadNotesFromDatabase();
  }
  
  Future<void> _loadNotesFromDatabase() async {
    if (!mounted) return;
    setState(() {
      _isLoadingNotes = true;
      _loadError = null;
    });

    try {
      // Get current workspace ID from WorkspaceService (using class field)
      String? workspaceId;

      // Try to get workspace from service first
      try {
        // Ensure workspace service is initialized
        if (!_workspaceService.hasWorkspaces) {
          _workspaceService.initialize();
        }

        workspaceId = _workspaceService.currentWorkspace?.id;
      } catch (e) {
      }

      // Fallback to default workspace ID from environment
      if (workspaceId == null) {
        workspaceId = EnvConfig.defaultWorkspaceId;
      }

      if (workspaceId == null || workspaceId.isEmpty) {
        if (!mounted) return;
        setState(() {
          _loadError = 'notes_home.no_workspace_selected'.tr();
          _isLoadingNotes = false;
        });
        return;
      }


      // Fetch notes using the REST API
      final response = await _notesApiService.getNotes(workspaceId);

      if (response.isSuccess && response.data != null) {

        // Convert API notes to models.Note format
        final notes = response.data!.map((apiNote) {
          // Debug: Log if note is archived
          if (apiNote.archivedAt != null) {
          }

          return models.Note(
            id: apiNote.id,
            workspaceId: apiNote.workspaceId,
            title: apiNote.title,
            content: apiNote.content != null ? {'text': apiNote.content} : {},
            contentText: apiNote.content,
            createdBy: apiNote.authorId,
            authorId: apiNote.authorId,
            parentId: apiNote.parentId,
            parentNoteId: apiNote.parentId,
            tags: apiNote.tags ?? [],
            isFavorite: apiNote.isFavorite,
            archivedAt: apiNote.archivedAt, // Include archived timestamp
            deletedAt: apiNote.deletedAt, // Include deleted timestamp
            icon: '📝', // Default icon
            createdAt: apiNote.createdAt,
            updatedAt: apiNote.updatedAt,
          );
        }).toList();


        if (!mounted) return;
        setState(() {
          _appAtOnceNotes = notes;
          _isLoadingNotes = false;
        });

      } else {
        if (!mounted) return;
        setState(() {
          _loadError = response.message ?? 'notes_home.failed_to_load'.tr();
          _isLoadingNotes = false;
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loadError = 'notes_home.error_loading'.tr(args: [e.toString()]);
        _isLoadingNotes = false;
      });
    }
  }

  Future<void> _loadDeletedNotesFromDatabase() async {
    if (!mounted) return;
    setState(() {
      _isLoadingDeletedNotes = true;
    });

    try {
      // Get current workspace ID (using class field)
      String? workspaceId;

      try {
        if (!_workspaceService.hasWorkspaces) {
          _workspaceService.initialize();
        }
        workspaceId = _workspaceService.currentWorkspace?.id;
      } catch (e) {
      }

      if (workspaceId == null) {
        workspaceId = EnvConfig.defaultWorkspaceId;
      }

      if (workspaceId == null || workspaceId.isEmpty) {
        if (!mounted) return;
        setState(() {
          _isLoadingDeletedNotes = false;
        });
        return;
      }


      // Fetch deleted notes using the REST API with is_deleted=true filter
      final response = await _notesApiService.getNotes(
        workspaceId,
        isDeleted: true,
      );

      if (response.isSuccess && response.data != null) {

        // Convert API notes to models.Note format
        final deletedNotes = response.data!.map((apiNote) {
          return models.Note(
            id: apiNote.id,
            workspaceId: apiNote.workspaceId,
            title: apiNote.title,
            content: apiNote.content != null ? {'text': apiNote.content} : {},
            contentText: apiNote.content,
            createdBy: apiNote.authorId,
            authorId: apiNote.authorId,
            parentId: apiNote.parentId,
            parentNoteId: apiNote.parentId,
            tags: apiNote.tags ?? [],
            isFavorite: apiNote.isFavorite,
            archivedAt: apiNote.archivedAt,
            deletedAt: apiNote.deletedAt,
            icon: '📝',
            createdAt: apiNote.createdAt,
            updatedAt: apiNote.updatedAt,
          );
        }).toList();

        if (!mounted) return;
        setState(() {
          _deletedAppAtOnceNotes = deletedNotes;
          _isLoadingDeletedNotes = false;
        });

      } else {
        if (!mounted) return;
        setState(() {
          _isLoadingDeletedNotes = false;
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isLoadingDeletedNotes = false;
      });
    }
  }

  Future<void> _loadArchivedNotesFromDatabase() async {
    if (!mounted) return;
    setState(() {
      _isLoadingArchivedNotes = true;
    });

    try {
      // Get current workspace ID (using class field)
      String? workspaceId;

      try {
        if (!_workspaceService.hasWorkspaces) {
          _workspaceService.initialize();
        }
        workspaceId = _workspaceService.currentWorkspace?.id;
      } catch (e) {
      }

      if (workspaceId == null) {
        workspaceId = EnvConfig.defaultWorkspaceId;
      }

      if (workspaceId == null || workspaceId.isEmpty) {
        if (!mounted) return;
        setState(() {
          _isLoadingArchivedNotes = false;
        });
        return;
      }


      // Fetch archived notes using the REST API with is_archived=true filter
      final response = await _notesApiService.getNotes(
        workspaceId,
        isArchived: true,
      );

      if (response.isSuccess && response.data != null) {

        // Convert API notes to models.Note format
        final archivedNotes = response.data!.map((apiNote) {
          return models.Note(
            id: apiNote.id,
            workspaceId: apiNote.workspaceId,
            title: apiNote.title,
            content: apiNote.content != null ? {'text': apiNote.content} : {},
            contentText: apiNote.content,
            createdBy: apiNote.authorId,
            authorId: apiNote.authorId,
            parentId: apiNote.parentId,
            parentNoteId: apiNote.parentId,
            tags: apiNote.tags ?? [],
            isFavorite: apiNote.isFavorite,
            archivedAt: apiNote.archivedAt,
            deletedAt: apiNote.deletedAt,
            icon: '📝',
            createdAt: apiNote.createdAt,
            updatedAt: apiNote.updatedAt,
          );
        }).toList();

        if (!mounted) return;
        setState(() {
          _archivedAppAtOnceNotes = archivedNotes;
          _isLoadingArchivedNotes = false;
        });

      } else {
        if (!mounted) return;
        setState(() {
          _isLoadingArchivedNotes = false;
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isLoadingArchivedNotes = false;
      });
    }
  }

  /// Strip HTML tags from content for display in note cards
  String _stripHtmlTags(String html) {
    if (html.isEmpty) return html;
    return html
        .replaceAll(RegExp(r'<br\s*/?>'), ' ')
        .replaceAll(RegExp(r'<p[^>]*>'), ' ')
        .replaceAll(RegExp(r'</p>'), ' ')
        .replaceAll(RegExp(r'<[^>]+>'), '')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
  }

  /// Strip HTML tags from content for PDF export (preserves line breaks)
  String _stripHtmlTagsForPdf(String html) {
    if (html.isEmpty) return html;
    return html
        .replaceAll(RegExp(r'<br\s*/?>'), '\n')
        .replaceAll(RegExp(r'</p>\s*<p[^>]*>'), '\n\n')
        .replaceAll(RegExp(r'<p[^>]*>'), '')
        .replaceAll(RegExp(r'</p>'), '\n')
        .replaceAll(RegExp(r'<div[^>]*>'), '')
        .replaceAll(RegExp(r'</div>'), '\n')
        .replaceAll(RegExp(r'<li[^>]*>'), '• ')
        .replaceAll(RegExp(r'</li>'), '\n')
        .replaceAll(RegExp(r'<[^>]+>'), '')
        .replaceAll(RegExp(r'&nbsp;'), ' ')
        .replaceAll(RegExp(r'&amp;'), '&')
        .replaceAll(RegExp(r'&lt;'), '<')
        .replaceAll(RegExp(r'&gt;'), '>')
        .replaceAll(RegExp(r'&quot;'), '"')
        .replaceAll(RegExp(r'\n{3,}'), '\n\n')
        .trim();
  }

  /// Format file size in human readable format
  String _formatFileSize(String sizeStr) {
    try {
      final bytes = int.parse(sizeStr);
      if (bytes < 1024) return '${bytes}B';
      if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)}KB';
      if (bytes < 1024 * 1024 * 1024) return '${(bytes / (1024 * 1024)).toStringAsFixed(1)}MB';
      return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)}GB';
    } catch (e) {
      return sizeStr;
    }
  }

  // Convert AppAtOnce Note to local Note format for display
  Note _convertToLocalNote(models.Note appNote) {
    final parentId = appNote.parentNoteId ?? appNote.parentId;
    final noteId = appNote.id ?? '';
    
    
    if (noteId.isEmpty) {
    }
    
    return Note(
      id: noteId,
      title: appNote.title,
      description: appNote.contentText ?? '',
      content: appNote.contentText ?? '',
      icon: appNote.icon ?? '📝',
      categoryId: 'work', // Default category, you may want to enhance this
      subcategory: 'General',
      keywords: appNote.tags,
      isFavorite: appNote.isFavorite,
      createdBy: appNote.createdBy,
      collaborators: [], // Empty for now, can be enhanced
      activities: [], // Empty for now, can be enhanced
      createdAt: appNote.createdAt,
      updatedAt: appNote.updatedAt,
      parentId: parentId,
    );
  }
  
  // Get converted notes for display
  List<Note> get _convertedNotes {

    // Filter out deleted and archived notes (notes with deletedAt or archivedAt timestamp)
    final activeNotes = _appAtOnceNotes.where((note) =>
      note.deletedAt == null && note.archivedAt == null
    ).toList();

    final converted = activeNotes.map(_convertToLocalNote).toList();
    return converted;
  }

  // Get deleted notes for trash view
  List<Note> get _deletedNotes {

    // Convert deleted notes from API to local Note format
    final converted = _deletedAppAtOnceNotes.map(_convertToLocalNote).toList();
    return converted;
  }

  // Get archived notes for archive view
  List<Note> get _archivedNotes {

    // Convert archived notes from API to local Note format
    final converted = _archivedAppAtOnceNotes.map(_convertToLocalNote).toList();
    return converted;
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    _workspaceService.removeListener(_onWorkspaceChanged);
    super.dispose();
  }

  void _showCreateNoteDialog() async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => const NoteEditorScreen(
          initialMode: NoteEditorMode.create,
        ),
      ),
    );
    // Refresh notes from database after creating a new one
    _initializeAndLoadNotes();
  }

  void _showImportModal() async {
    final result = await showFileImportModal(
      context: context,
      onNoteCreated: (noteId) {
        // Callback is now called after modal closes via addPostFrameCallback
        // Navigation is handled below using the result
        debugPrint('[NotesScreen] onNoteCreated callback called with noteId: $noteId');
      },
    );

    debugPrint('[NotesScreen] Import modal result: $result');

    // result is noteId (String) on success, null otherwise
    if (result != null && result is String && result.isNotEmpty) {
      // Navigate to the imported note
      debugPrint('[NotesScreen] Navigating to imported note: $result');
      await _navigateToImportedNote(result);
    } else {
      // Just refresh if we didn't get a noteId
      _initializeAndLoadNotes();
    }
  }

  /// Fetch the imported note from API and navigate to editor
  Future<void> _navigateToImportedNote(String noteId) async {
    try {
      // Get workspace ID
      String? workspaceId = _workspaceService.currentWorkspace?.id;
      if (workspaceId == null || workspaceId.isEmpty) {
        workspaceId = EnvConfig.defaultWorkspaceId;
      }

      if (workspaceId == null || workspaceId.isEmpty) {
        debugPrint('[NotesScreen] Cannot fetch note: missing workspaceId');
        _initializeAndLoadNotes();
        return;
      }

      debugPrint('[NotesScreen] Fetching imported note: $noteId from workspace: $workspaceId');
      final response = await _notesApiService.getNote(workspaceId, noteId);

      debugPrint('[NotesScreen] API response - success: ${response.isSuccess}, hasData: ${response.data != null}');

      if (response.isSuccess && response.data != null && mounted) {
        final apiNote = response.data!;

        debugPrint('[NotesScreen] API Note - id: ${apiNote.id}, title: ${apiNote.title}');
        debugPrint('[NotesScreen] API Note content length: ${apiNote.content?.length ?? 0}');
        debugPrint('[NotesScreen] API Note content preview: ${apiNote.content?.substring(0, (apiNote.content?.length ?? 0) > 100 ? 100 : (apiNote.content?.length ?? 0)) ?? 'null'}');

        // Convert API Note to local Note format
        final localNote = Note(
          id: apiNote.id,
          title: apiNote.title,
          description: '', // API doesn't return description separately
          content: apiNote.content ?? '',
          icon: '📝', // Default icon
          categoryId: apiNote.category ?? 'work',
          subcategory: 'General',
          keywords: apiNote.tags ?? [],
          isFavorite: apiNote.isFavorite,
          createdBy: apiNote.authorId,
          collaborators: [],
          activities: [],
          createdAt: apiNote.createdAt,
          updatedAt: apiNote.updatedAt,
          parentId: apiNote.parentId,
        );

        debugPrint('[NotesScreen] Local Note content length: ${localNote.content.length}');

        // Navigate to the note editor
        if (mounted) {
          debugPrint('[NotesScreen] Navigating to NoteEditorScreen with note');
          await Navigator.of(context).push(
            MaterialPageRoute(
              builder: (context) => NoteEditorScreen(
                note: localNote,
                initialMode: NoteEditorMode.edit,
              ),
            ),
          );
          // Refresh notes from database after editing
          _initializeAndLoadNotes();
        }
      } else {
        debugPrint('[NotesScreen] Failed to fetch note: ${response.message}');
        _initializeAndLoadNotes();
      }
    } catch (e, stack) {
      debugPrint('[NotesScreen] Error navigating to imported note: $e');
      debugPrint('[NotesScreen] Stack trace: $stack');
      _initializeAndLoadNotes();
    }
  }

  void _showNoteDetails(Note note) async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => NoteEditorScreen(
          note: note,
          initialMode: NoteEditorMode.edit,
        ),
      ),
    );
    // Refresh notes from database after editing
    _initializeAndLoadNotes();
  }



  Future<void> _deleteNote(Note note) async {
    // Show confirmation dialog
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('notes_home.move_to_trash'.tr()),
        content: Text('notes_home.move_to_trash_confirm'.tr(args: [note.title])),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('common.cancel'.tr()),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(
              'notes_home.move_to_trash'.tr(),
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      // Show loading indicator
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(
          child: CircularProgressIndicator(),
        ),
      );

      // Get workspace ID
      String? workspaceId = _workspaceService.currentWorkspace?.id ?? EnvConfig.defaultWorkspaceId;

      if (workspaceId == null || workspaceId.isEmpty) {
        throw Exception('No workspace selected');
      }

      // Soft delete via REST API (moves to trash)
      final response = await _notesApiService.deleteNote(workspaceId, note.id);

      if (!response.isSuccess) {
        throw Exception(response.message ?? 'Failed to delete note');
      }

      // Close loading indicator
      if (mounted) {
        Navigator.pop(context);
      }

      // Clear the trash and archive lists so they will be reloaded when their tabs are opened
      setState(() {
        _deletedAppAtOnceNotes = [];
        _archivedAppAtOnceNotes = [];
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('notes_home.note_moved_to_trash'.tr()),
          backgroundColor: Colors.green,
        ),
      );

      // Refresh the main notes list
      _initializeAndLoadNotes();
    } catch (e) {

      // Close loading indicator if still showing
      if (mounted) {
        Navigator.pop(context);
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('notes_home.error_deleting'.tr(args: [e.toString()])),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _restoreNote(Note note) async {
    try {
      // Get current workspace ID
      String? workspaceId;
      try {
        if (!_workspaceService.hasWorkspaces) {
          _workspaceService.initialize();
        }
        workspaceId = _workspaceService.currentWorkspace?.id;
      } catch (e) {
        // Ignore workspace errors
      }

      if (workspaceId == null) {
        workspaceId = EnvConfig.defaultWorkspaceId;
      }

      if (workspaceId == null || workspaceId.isEmpty) {
        throw Exception('No workspace ID available');
      }

      // Show loading indicator
      if (!mounted) return;
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(
          child: CircularProgressIndicator(),
        ),
      );

      // Restore note using API
      final response = await _notesApiService.restoreNote(
        workspaceId,
        note.id,
      );

      // Close loading indicator
      if (mounted) {
        Navigator.pop(context);
      }

      if (response.isSuccess) {
        // Immediately remove the note from the local deleted list for instant UI feedback
        // Also clear the archive list so it refreshes (in case the note was archived before deletion)
        final noteIdToRemove = note.id;
        setState(() {
          _deletedAppAtOnceNotes.removeWhere((n) {
            final modelNoteId = n.id ?? '';
            return modelNoteId == noteIdToRemove && noteIdToRemove.isNotEmpty;
          });
          // Clear archive list so it will reload and show restored archived notes
          _archivedAppAtOnceNotes = [];
        });

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  Icon(Icons.restore, color: Colors.white, size: 20),
                  SizedBox(width: 8),
                  Text('notes_home.note_restored'.tr()),
                ],
              ),
              backgroundColor: Colors.green,
              duration: Duration(seconds: 2),
            ),
          );
        }

        // Refresh the main notes list to show the restored note
        await _initializeAndLoadNotes();
      } else {
        throw Exception(response.message ?? 'notes_home.failed_to_restore'.tr());
      }
    } catch (e) {
      // Close loading indicator if still showing
      if (mounted) {
        Navigator.pop(context);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('notes_home.error_restoring'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _archiveNote(Note note) async {
    try {

      // Get current workspace ID
      String? workspaceId;
      try {
        if (!_workspaceService.hasWorkspaces) {
          _workspaceService.initialize();
        }
        workspaceId = _workspaceService.currentWorkspace?.id;
      } catch (e) {
      }

      if (workspaceId == null) {
        workspaceId = EnvConfig.defaultWorkspaceId;
      }

      if (workspaceId == null || workspaceId.isEmpty) {
        throw Exception('No workspace ID available');
      }

      // Show loading indicator
      if (!mounted) return;
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(
          child: CircularProgressIndicator(),
        ),
      );

      // Archive note using API
      final response = await _notesApiService.archiveNote(
        workspaceId,
        note.id,
      );

      // Close loading indicator
      if (mounted) {
        Navigator.pop(context);
      }

      if (response.isSuccess) {

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  Icon(Icons.archive, color: Colors.white, size: 20),
                  SizedBox(width: 8),
                  Text('notes_home.note_archived'.tr()),
                ],
              ),
              backgroundColor: Colors.green,
              duration: Duration(seconds: 2),
            ),
          );
        }

        // Refresh the notes list
        _initializeAndLoadNotes();
      } else {
        throw Exception(response.message ?? 'notes_home.failed_to_archive'.tr());
      }
    } catch (e) {

      // Close loading indicator if still showing
      if (mounted) {
        Navigator.pop(context);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('notes_home.error_archiving'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _unarchiveNote(Note note) async {
    try {

      // Get current workspace ID
      String? workspaceId;
      try {
        if (!_workspaceService.hasWorkspaces) {
          _workspaceService.initialize();
        }
        workspaceId = _workspaceService.currentWorkspace?.id;
      } catch (e) {
      }

      if (workspaceId == null) {
        workspaceId = EnvConfig.defaultWorkspaceId;
      }

      if (workspaceId == null || workspaceId.isEmpty) {
        throw Exception('No workspace ID available');
      }

      // Show loading indicator
      if (!mounted) return;
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(
          child: CircularProgressIndicator(),
        ),
      );

      // Unarchive note using API
      final response = await _notesApiService.unarchiveNote(
        workspaceId,
        note.id,
      );

      // Close loading indicator
      if (mounted) {
        Navigator.pop(context);
      }

      if (response.isSuccess) {
        // Immediately remove the note from the local archived list for instant UI feedback
        final noteIdToRemove = note.id;
        final countBefore = _archivedAppAtOnceNotes.length;

        setState(() {
          _archivedAppAtOnceNotes.removeWhere((n) {
            // Compare IDs - handle both nullable and non-nullable cases
            final modelNoteId = n.id ?? '';
            return modelNoteId == noteIdToRemove && noteIdToRemove.isNotEmpty;
          });
        });

        final countAfter = _archivedAppAtOnceNotes.length;
        debugPrint('🗑️ Unarchive: Removed note $noteIdToRemove. Count: $countBefore -> $countAfter');

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  Icon(Icons.unarchive, color: Colors.white, size: 20),
                  SizedBox(width: 8),
                  Text('notes_home.note_unarchived'.tr()),
                ],
              ),
              backgroundColor: Colors.green,
              duration: Duration(seconds: 2),
            ),
          );
        }

        // Refresh the main notes list to show the unarchived note
        await _initializeAndLoadNotes();

        // Note: We intentionally don't reload archived notes from API here because:
        // 1. We already removed it from the local list above
        // 2. The API might return stale data due to caching/timing
      } else {
        throw Exception(response.message ?? 'notes_home.failed_to_unarchive'.tr());
      }
    } catch (e) {

      // Close loading indicator if still showing
      if (mounted) {
        Navigator.pop(context);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('notes_home.error_unarchiving'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _permanentlyDeleteNote(Note note) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('notes_home.delete_permanently'.tr()),
        content: Text('notes_home.delete_permanently_confirm'.tr(args: [note.title])),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('common.cancel'.tr()),
          ),
          TextButton(
            onPressed: () {
              // Close the confirmation dialog first
              Navigator.pop(context);

              // Execute the delete operation
              _executePermanentDelete(note);
            },
            child: Text(
              'common.delete'.tr(),
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _executePermanentDelete(Note note) async {
    // Show loading indicator with the main context

    if (!mounted) return;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext dialogContext) => PopScope(
        canPop: false,
        child: Dialog(
          child: Padding(
            padding: EdgeInsets.all(16),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircularProgressIndicator(),
                SizedBox(width: 16),
                Text('notes_home.deleting_permanently'.tr()),
              ],
            ),
          ),
        ),
      ),
    );

    bool success = false;
    String? errorMessage;

    try {
      // Get workspace ID
      String? workspaceId = _workspaceService.currentWorkspace?.id ?? EnvConfig.defaultWorkspaceId;

      if (workspaceId == null || workspaceId.isEmpty) {
        throw Exception('No workspace ID available');
      }

      // Use NotesApiService to permanently delete from database
      final response = await _notesApiService.permanentlyDeleteNote(
        workspaceId,
        note.id,
      );

      if (response.isSuccess) {
        success = true;
        // Remove from deleted notes list (trash)
        if (mounted) {
          setState(() {
            _deletedAppAtOnceNotes.removeWhere((n) => n.id == note.id);
          });
        }
      } else {
        errorMessage = response.message ?? 'Failed to delete note';
      }
    } catch (e) {
      errorMessage = e.toString();
    } finally {
      // Always close the loading dialog
      if (mounted) {
        Navigator.of(context, rootNavigator: true).pop();
      }
    }

    // Show appropriate message after dialog is closed
    await Future.delayed(const Duration(milliseconds: 100));
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              Icon(
                success ? Icons.delete_forever : Icons.error_outline,
                color: Colors.white,
                size: 20,
              ),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  success ? 'notes_home.note_permanently_deleted'.tr() : (errorMessage ?? 'notes_home.failed_to_delete'.tr()),
                ),
              ),
            ],
          ),
          backgroundColor: success ? Colors.red : Colors.orange,
          duration: Duration(seconds: 2),
        ),
      );
    }
  }

  Widget _buildTrashList(List<Note> deletedNotes) {
    // Show loading indicator while fetching deleted notes
    if (_isLoadingDeletedNotes) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('notes_home.loading_deleted'.tr()),
          ],
        ),
      );
    }

    if (deletedNotes.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.delete_outline,
              size: 64,
              color: Theme.of(context).colorScheme.secondary,
            ),
            const SizedBox(height: 16),
            Text(
              'notes_home.trash_empty'.tr(),
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              'notes_home.trash_empty_desc'.tr(),
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16.0),
      itemCount: deletedNotes.length,
      itemBuilder: (context, index) {
        final note = deletedNotes[index];
        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(5),
          ),
          child: ListTile(
            contentPadding: const EdgeInsets.only(left: 16, right: 4),
            leading: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: Colors.primaries[index % Colors.primaries.length].withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(5),
              ),
              child: Center(
                child: Text(
                  note.icon,
                  style: const TextStyle(fontSize: 20),
                ),
              ),
            ),
            title: Text(
              note.title,
              style: const TextStyle(fontWeight: FontWeight.w500),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            subtitle: Text(
              _notesService.formatDateTime(note.updatedAt),
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
            trailing: PopupMenuButton<String>(
              icon: const Icon(Icons.more_vert),
              onSelected: (action) {
                if (action == 'restore') {
                  _restoreNote(note);
                } else if (action == 'delete') {
                  _permanentlyDeleteNote(note);
                }
              },
              itemBuilder: (context) => [
                PopupMenuItem(
                  value: 'restore',
                  child: Row(
                    children: [
                      Icon(Icons.restore, size: 18),
                      SizedBox(width: 8),
                      Text('notes_home.restore'.tr()),
                    ],
                  ),
                ),
                PopupMenuItem(
                  value: 'delete',
                  child: Row(
                    children: [
                      Icon(Icons.delete_forever, size: 18, color: Colors.red),
                      SizedBox(width: 8),
                      Text('notes_home.delete_permanently'.tr(), style: TextStyle(color: Colors.red)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildArchiveList(List<Note> archivedNotes) {
    // Show loading indicator while fetching archived notes
    if (_isLoadingArchivedNotes) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('notes_home.loading_archived'.tr()),
          ],
        ),
      );
    }

    if (archivedNotes.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.archive_outlined,
              size: 64,
              color: Theme.of(context).colorScheme.secondary,
            ),
            const SizedBox(height: 16),
            Text(
              'notes_home.archive_empty'.tr(),
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              'notes_home.archive_empty_desc'.tr(),
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16.0),
      itemCount: archivedNotes.length,
      itemBuilder: (context, index) {
        final note = archivedNotes[index];
        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(5),
          ),
          child: ListTile(
            contentPadding: const EdgeInsets.only(left: 16, right: 4),
            leading: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: Colors.primaries[index % Colors.primaries.length].withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(5),
              ),
              child: Center(
                child: Text(
                  note.icon,
                  style: const TextStyle(fontSize: 20),
                ),
              ),
            ),
            title: Text(
              note.title,
              style: const TextStyle(fontWeight: FontWeight.w500),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            subtitle: Text(
              _notesService.formatDateTime(note.updatedAt),
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
            trailing: PopupMenuButton<String>(
              icon: const Icon(Icons.more_vert),
              onSelected: (action) {
                if (action == 'unarchive') {
                  _unarchiveNote(note);
                } else if (action == 'delete') {
                  _deleteNote(note);
                }
              },
              itemBuilder: (context) => [
                PopupMenuItem(
                  value: 'unarchive',
                  child: Row(
                    children: [
                      Icon(Icons.unarchive, size: 18),
                      SizedBox(width: 8),
                      Text('notes_home.unarchive'.tr()),
                    ],
                  ),
                ),
                PopupMenuItem(
                  value: 'delete',
                  child: Row(
                    children: [
                      Icon(Icons.delete, size: 18, color: Colors.red),
                      SizedBox(width: 8),
                      Text('common.delete'.tr(), style: TextStyle(color: Colors.red)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showCreateChildNoteDialog(Note parentNote) async {
    
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => NoteEditorScreen(
          parentId: parentNote.id,
          initialMode: NoteEditorMode.create,
        ),
      ),
    );
    // Refresh notes from database after creating a child note
    _initializeAndLoadNotes();
  }

  void _toggleFavorite(Note note) async {
    // Show loading indicator
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: CircularProgressIndicator(),
      ),
    );

    // Toggle in local service first for immediate UI feedback
    _notesService.toggleFavorite(note.id);
    final newFavoriteStatus = !note.isFavorite;

    // Update the favorite status via REST API
    try {
      // Get workspace ID
      String? workspaceId = _workspaceService.currentWorkspace?.id;

      // Fallback to default workspace ID from environment
      if (workspaceId == null || workspaceId.isEmpty) {
        workspaceId = EnvConfig.defaultWorkspaceId;
      }

      if (workspaceId == null || workspaceId.isEmpty) {
        throw Exception('No workspace ID available');
      }

      // Find the note ID from _appAtOnceNotes
      final appNote = _appAtOnceNotes.firstWhere(
        (n) => n.id == note.id,
        orElse: () => throw Exception('Note not found'),
      );


      // Update via dedicated toggleFavorite API method
      final response = await _notesApiService.toggleFavorite(
        workspaceId,
        appNote.id!,
        newFavoriteStatus,
      );

      if (response.isSuccess) {
        // Add activity for favorite/unfavorite action
        _notesService.addActivity(
          note.id,
          Activity(
            id: '${newFavoriteStatus ? 'favorited' : 'unfavorited'}_${DateTime.now().millisecondsSinceEpoch}',
            noteId: note.id,
            userId: 'current_user',
            userName: 'You',
            userAvatar: '👤',
            type: newFavoriteStatus ? ActivityType.favorited : ActivityType.unfavorited,
            description: newFavoriteStatus ? 'added to favorites' : 'removed from favorites',
            timestamp: DateTime.now(),
          ),
        );
      } else {
        throw Exception(response.message ?? 'Failed to update favorite status');
      }
    } catch (e) {
      // Revert local change if API update fails
      _notesService.toggleFavorite(note.id);

      // Close loading dialog and show error
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to update favorite status: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
        return;
      }
    }

    // Close loading dialog
    if (mounted) {
      Navigator.pop(context);
    }

    // Refresh from database to ensure consistency
    await _initializeAndLoadNotes();

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              Icon(
                newFavoriteStatus ? Icons.star : Icons.star_border,
                color: Colors.white,
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(newFavoriteStatus
                  ? 'notes_home.added_to_favorites'.tr()
                  : 'notes_home.removed_from_favorites'.tr()),
            ],
          ),
          backgroundColor: newFavoriteStatus ? Colors.amber : Colors.orange,
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  Future<void> _duplicateNote(Note note) async {

    try {
      // Show loading indicator
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(
          child: CircularProgressIndicator(),
        ),
      );

      // Get workspace ID
      String? workspaceId = _workspaceService.currentWorkspace?.id ?? EnvConfig.defaultWorkspaceId;

      if (workspaceId == null || workspaceId.isEmpty) {
        throw Exception('Workspace ID is required');
      }

      // Find the AppAtOnce note
      final appNote = _appAtOnceNotes.firstWhere((n) => n.id == note.id);


      // Call duplicate API
      final response = await _notesApiService.duplicateNote(
        workspaceId,
        appNote.id ?? note.id,
        api.DuplicateNoteDto(
          title: '${note.title} (Copy)',
          includeSubNotes: true,
        ),
      );

      if (!mounted) return;
      Navigator.pop(context); // Close loading dialog

      if (!response.isSuccess) {
        throw Exception(response.message ?? 'Failed to duplicate note');
      }


      // Show success message
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.copy, color: Colors.white, size: 20),
                const SizedBox(width: 8),
                Text('notes_home.duplicated'.tr(args: [note.title])),
              ],
            ),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 2),
          ),
        );
      }

      // Refresh the notes list to show the duplicated note
      await _initializeAndLoadNotes();


    } catch (e) {

      // Close loading indicator if still showing
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('notes_home.failed_to_duplicate'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _shareNote(Note note) async {
    try {
      final workspaceId = await AppConfig.getCurrentWorkspaceId();
      if (workspaceId == null || workspaceId.isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('notes_home.workspace_not_found'.tr())),
          );
        }
        return;
      }

      final result = await showDialog<bool>(
        context: context,
        builder: (context) => ShareNoteDialog(
          noteId: note.id,
          noteTitle: note.title,
          workspaceId: workspaceId,
          createdBy: note.createdBy,
        ),
      );

      // If sharing was successful
      if (result == true && mounted) {
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  Future<void> _exportNoteToGoogleDrive(Note note) async {
    // Show folder picker dialog
    final result = await GoogleDriveFolderPicker.show(
      context: context,
      title: 'notes.export_to_drive_title'.tr(),
      subtitle: 'notes.export_to_drive_subtitle'.tr(args: [note.title]),
    );

    if (result == null || !mounted) return;

    // Show loading indicator
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        content: Row(
          children: [
            const CircularProgressIndicator(),
            const SizedBox(width: 16),
            Expanded(
              child: Text('notes.exporting_to_drive'.tr(args: [note.title])),
            ),
          ],
        ),
      ),
    );

    try {
      final response = await GoogleDriveService.instance.exportNote(
        noteId: note.id,
        targetFolderId: result.folderId,
        format: 'pdf',
      );

      if (!mounted) return;
      Navigator.of(context).pop(); // Close loading dialog

      if (response.success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('notes.export_success'.tr(args: [note.title, result.folderPath ?? 'My Drive'])),
            duration: const Duration(seconds: 4),
            action: response.webViewLink != null
                ? SnackBarAction(
                    label: 'notes.open_in_drive'.tr(),
                    onPressed: () {
                      // Open in Google Drive
                    },
                  )
                : null,
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(response.message ?? 'notes.export_failed'.tr()),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      Navigator.of(context).pop(); // Close loading dialog

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('notes.export_failed'.tr()),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _showDocumentInfo(Note note) {
    // Calculate content statistics
    final contentText = note.content;
    final characterCount = contentText.length;
    final blockCount = contentText.split('\n').where((line) => line.trim().isNotEmpty).length;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.info_outline, color: Theme.of(context).colorScheme.primary),
            const SizedBox(width: 12),
            Text('notes_home.document_info'.tr()),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              // Title
              Text(
                note.title,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 12),
              // Created and edited timestamps
              Text(
                'Created ${_notesService.formatDateTime(note.createdAt)} • Last edited ${_notesService.formatDateTime(note.updatedAt)}',
                style: TextStyle(
                  fontSize: 13,
                  color: Colors.grey[600],
                ),
              ),
              const SizedBox(height: 16),
              const Divider(),
              const SizedBox(height: 16),
              // Content statistics
              Text(
                '$blockCount blocks • $characterCount characters',
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey[700],
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text('common.close'.tr()),
          ),
        ],
      ),
    );
  }

  // TODO: Collaborators feature not functional yet - will implement later
  // void _showCollaborators(Note note) {
  //   showDialog(
  //     context: context,
  //     builder: (context) => AlertDialog(
  //       title: Row(
  //         children: [
  //           Icon(Icons.people_outline, color: Theme.of(context).colorScheme.primary),
  //           const SizedBox(width: 12),
  //           const Text('Collaborators'),
  //         ],
  //       ),
  //       content: SingleChildScrollView(
  //         child: Column(
  //           mainAxisSize: MainAxisSize.min,
  //           crossAxisAlignment: CrossAxisAlignment.start,
  //           children: [
  //             // Owner Section
  //             const Text(
  //               'Owner',
  //               style: TextStyle(
  //                 fontSize: 12,
  //                 fontWeight: FontWeight.w600,
  //                 color: Colors.grey,
  //               ),
  //             ),
  //             const SizedBox(height: 12),
  //             ListTile(
  //               contentPadding: EdgeInsets.zero,
  //               leading: CircleAvatar(
  //                 backgroundColor: Colors.blue.withOpacity(0.2),
  //                 child: const Icon(Icons.person, color: Colors.blue),
  //               ),
  //               title: const Text('Note Owner'),
  //               subtitle: const Text('Created this note'),
  //               trailing: Container(
  //                 padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
  //                 decoration: BoxDecoration(
  //                   color: Colors.purple.withOpacity(0.1),
  //                   borderRadius: BorderRadius.circular(12),
  //                 ),
  //                 child: const Text(
  //                   'Owner',
  //                   style: TextStyle(
  //                     fontSize: 12,
  //                     color: Colors.purple,
  //                     fontWeight: FontWeight.w600,
  //                   ),
  //                 ),
  //               ),
  //             ),
  //             const SizedBox(height: 20),
  //             // Collaborators Section
  //             const Text(
  //               'Collaborators',
  //               style: TextStyle(
  //                 fontSize: 12,
  //                 fontWeight: FontWeight.w600,
  //                 color: Colors.grey,
  //               ),
  //             ),
  //             const SizedBox(height: 12),
  //             note.collaborators.isEmpty
  //                 ? const Padding(
  //                     padding: EdgeInsets.symmetric(vertical: 20),
  //                     child: Center(
  //                       child: Column(
  //                         children: [
  //                           Icon(Icons.person_add_outlined, size: 48, color: Colors.grey),
  //                           SizedBox(height: 12),
  //                           Text(
  //                             'No collaborators yet',
  //                             style: TextStyle(color: Colors.grey),
  //                           ),
  //                         ],
  //                       ),
  //                     ),
  //                   )
  //                 : Column(
  //                     mainAxisSize: MainAxisSize.min,
  //                     children: note.collaborators.map((collaborator) {
  //                       return ListTile(
  //                         contentPadding: EdgeInsets.zero,
  //                         leading: CircleAvatar(
  //                           backgroundImage: NetworkImage(collaborator.avatar),
  //                           child: collaborator.avatar.isEmpty
  //                               ? Text(collaborator.name[0].toUpperCase())
  //                               : null,
  //                         ),
  //                         title: Text(collaborator.name),
  //                         subtitle: Text(collaborator.email),
  //                         trailing: Container(
  //                           padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
  //                           decoration: BoxDecoration(
  //                             color: collaborator.role == CollaboratorRole.editor
  //                                 ? Colors.blue.withOpacity(0.1)
  //                                 : Colors.grey.withOpacity(0.1),
  //                             borderRadius: BorderRadius.circular(12),
  //                           ),
  //                           child: Text(
  //                             collaborator.role == CollaboratorRole.editor ? 'Editor' : 'Viewer',
  //                             style: TextStyle(
  //                               fontSize: 12,
  //                               color: collaborator.role == CollaboratorRole.editor
  //                                   ? Colors.blue
  //                                   : Colors.grey,
  //                               fontWeight: FontWeight.w600,
  //                             ),
  //                           ),
  //                         ),
  //                       );
  //                     }).toList(),
  //                   ),
  //           ],
  //         ),
  //       ),
  //       actions: [
  //         TextButton(
  //           onPressed: () {
  //             Navigator.of(context).pop();
  //             // TODO: Navigate to add collaborators screen
  //             ScaffoldMessenger.of(context).showSnackBar(
  //               SnackBar(
  //                 content: Text('Add collaborators feature coming soon!'),
  //                 duration: Duration(seconds: 2),
  //               ),
  //             );
  //           },
  //           child: const Text('Add Collaborators'),
  //         ),
  //         TextButton(
  //           onPressed: () => Navigator.of(context).pop(),
  //           child: const Text('Close'),
  //         ),
  //       ],
  //     ),
  //   );
  // }

  void _showQuickActions(Note note) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'notes_home.quick_actions'.tr(),
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 20),
            ListTile(
              leading: Icon(Icons.picture_as_pdf, color: Colors.red.shade700, size: 28),
              title: Text(
                'notes_home.export_to_pdf'.tr(),
                style: TextStyle(
                  fontWeight: FontWeight.w500,
                  fontSize: 16,
                ),
              ),
              subtitle: Text('notes_home.export_to_pdf_desc'.tr()),
              onTap: () {
                Navigator.pop(context);
                _exportToPDF(note);
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _exportToPDF(Note note) async {
    String? mainNotePath;
    final List<String> exportedFiles = [];
    final List<String> failedFiles = [];

    try {
      // Show loading indicator
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => AlertDialog(
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(),
              const SizedBox(height: 16),
              Text('notes_home.exporting'.tr(args: [note.title])),
            ],
          ),
        ),
      );

      // Get directory for saving files
      Directory? directory;
      if (Platform.isAndroid) {
        directory = Directory('/storage/emulated/0/Download');
        if (!await directory.exists()) {
          directory = await getExternalStorageDirectory();
        }
      } else if (Platform.isIOS) {
        directory = await getApplicationDocumentsDirectory();
      } else {
        directory = await getApplicationDocumentsDirectory();
      }

      if (directory == null) {
        throw Exception('Could not access storage directory');
      }

      // Create a subfolder for this note's exports
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final safeName = note.title.replaceAll(RegExp(r'[^\w\s-]'), '_').trim();
      final exportFolder = Directory('${directory.path}/NoteExport_${safeName}_$timestamp');
      await exportFolder.create(recursive: true);

      // Fetch attachments from API
      List<Map<String, dynamic>> noteAttachments = [];
      List<Map<String, dynamic>> eventAttachments = [];
      List<Map<String, dynamic>> fileAttachments = [];

      final workspaceId = _workspaceService.currentWorkspace?.id;
      final calendarApi = calendar_api.CalendarApiService();

      debugPrint('📎 Export: workspaceId=$workspaceId, noteId=${note.id}');

      if (workspaceId != null) {
        try {
          final response = await _notesApiService.getNote(workspaceId, note.id);
          debugPrint('📎 Export: API response isSuccess=${response.isSuccess}, hasData=${response.data != null}');

          if (response.isSuccess && response.data != null) {
            final attachments = response.data!.attachments;
            debugPrint('📎 Export: attachments=$attachments');
            debugPrint('📎 Export: attachments type=${attachments.runtimeType}');

            if (attachments != null) {
              debugPrint('📎 Export: attachments keys=${attachments.keys.toList()}');

              // Parse note attachments
              final notes = attachments['note_attachment'];
              debugPrint('📎 Export: note_attachment=$notes, type=${notes.runtimeType}');
              if (notes != null && notes is List) {
                for (final item in notes) {
                  if (item is Map<String, dynamic>) {
                    // Full object with details
                    noteAttachments.add({
                      'id': item['id'] ?? '',
                      'title': item['title'] ?? item['name'] ?? 'Untitled Note',
                      'content': item['content'] ?? '',
                    });
                  } else if (item is String) {
                    // Just ID - fetch note details
                    try {
                      final noteResponse = await _notesApiService.getNote(workspaceId, item);
                      if (noteResponse.isSuccess && noteResponse.data != null) {
                        noteAttachments.add({
                          'id': item,
                          'title': noteResponse.data!.title,
                          'content': noteResponse.data!.content ?? '',
                        });
                      }
                    } catch (e) {
                      debugPrint('📎 Export: Error fetching note $item: $e');
                    }
                  }
                }
              }

              // Parse event attachments
              final events = attachments['event_attachment'];
              debugPrint('📎 Export: event_attachment=$events, type=${events.runtimeType}');
              if (events != null && events is List) {
                for (final item in events) {
                  if (item is Map<String, dynamic>) {
                    // Full object with details
                    eventAttachments.add({
                      'id': item['id'] ?? '',
                      'title': item['title'] ?? item['name'] ?? 'Untitled Event',
                      'description': item['description'] ?? '',
                      'start_time': item['start_time'] ?? item['startTime'],
                      'end_time': item['end_time'] ?? item['endTime'],
                      'location': item['location'] ?? '',
                      'is_all_day': item['is_all_day'] ?? item['isAllDay'] ?? false,
                    });
                  } else if (item is String) {
                    // Just ID - fetch event details
                    try {
                      final eventResponse = await calendarApi.getEvent(workspaceId, item);
                      if (eventResponse.isSuccess && eventResponse.data != null) {
                        final event = eventResponse.data!;
                        eventAttachments.add({
                          'id': item,
                          'title': event.title,
                          'description': event.description ?? '',
                          'start_time': event.startTime.toIso8601String(),
                          'end_time': event.endTime.toIso8601String(),
                          'location': event.location ?? '',
                          'is_all_day': event.isAllDay,
                          'organizer_name': event.organizerName ?? '',
                          'meeting_url': event.meetingUrl ?? '',
                        });
                      }
                    } catch (e) {
                      debugPrint('📎 Export: Error fetching event $item: $e');
                    }
                  }
                }
              }

              // Parse file attachments
              final files = attachments['file_attachment'];
              debugPrint('📎 Export: file_attachment=$files, type=${files.runtimeType}');
              if (files != null && files is List) {
                for (final item in files) {
                  if (item is Map<String, dynamic>) {
                    // Full object with details
                    fileAttachments.add({
                      'id': item['id'] ?? '',
                      'name': item['name'] ?? 'Untitled File',
                      'url': item['url'] ?? '',
                      'size': item['size']?.toString(),
                      'mime_type': item['type'] ?? item['mime_type'] ?? '',
                    });
                  } else if (item is String) {
                    // Just ID or URL - check if it's a URL
                    if (item.startsWith('http')) {
                      fileAttachments.add({
                        'id': '',
                        'name': item.split('/').last,
                        'url': item,
                      });
                    } else {
                      // It's an ID - we can't fetch file details without a proper API
                      fileAttachments.add({
                        'id': item,
                        'name': 'File_$item',
                        'url': '',
                      });
                    }
                  }
                }
              }
            }
          }
        } catch (e, stackTrace) {
          debugPrint('📎 Export Error fetching attachments: $e');
          debugPrint('📎 Export Stack: $stackTrace');
        }
      }

      debugPrint('📎 Export: Found ${noteAttachments.length} notes, ${eventAttachments.length} events, ${fileAttachments.length} files');

      // 1. Export main note as PDF (simple, without attachments)
      final mainPdf = pw.Document();
      final cleanContent = _stripHtmlTagsForPdf(note.content);
      final paragraphs = cleanContent.split('\n\n').where((p) => p.trim().isNotEmpty).toList();

      mainPdf.addPage(
        pw.MultiPage(
          pageFormat: PdfPageFormat.a4,
          margin: const pw.EdgeInsets.all(40),
          maxPages: 50,
          build: (pw.Context context) {
            final List<pw.Widget> widgets = [
              pw.Header(
                level: 0,
                child: pw.Text(note.title, style: pw.TextStyle(fontSize: 24, fontWeight: pw.FontWeight.bold)),
              ),
              pw.SizedBox(height: 10),
              pw.Row(children: [
                pw.Text('Created: ${_notesService.formatDateTime(note.createdAt)}', style: pw.TextStyle(fontSize: 10, color: PdfColors.grey700)),
                pw.SizedBox(width: 20),
                pw.Text('Updated: ${_notesService.formatDateTime(note.updatedAt)}', style: pw.TextStyle(fontSize: 10, color: PdfColors.grey700)),
              ]),
              pw.Divider(thickness: 2),
              pw.SizedBox(height: 20),
            ];

            if (paragraphs.isEmpty) {
              widgets.add(pw.Text('No content', style: const pw.TextStyle(fontSize: 12)));
            } else {
              for (final paragraph in paragraphs) {
                widgets.add(pw.Paragraph(text: paragraph.trim(), style: const pw.TextStyle(fontSize: 12, lineSpacing: 1.5)));
                widgets.add(pw.SizedBox(height: 8));
              }
            }

            // Add attachment summary (just names, not content)
            if (noteAttachments.isNotEmpty || eventAttachments.isNotEmpty || fileAttachments.isNotEmpty) {
              widgets.add(pw.SizedBox(height: 24));
              widgets.add(pw.Divider(color: PdfColors.grey300));
              widgets.add(pw.SizedBox(height: 12));
              widgets.add(pw.Text('Attachments (exported separately):', style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold)));
              widgets.add(pw.SizedBox(height: 8));

              for (final n in noteAttachments) {
                widgets.add(pw.Text('• Note: ${n['title'] ?? n['name'] ?? 'Untitled'}', style: const pw.TextStyle(fontSize: 10)));
              }
              for (final e in eventAttachments) {
                widgets.add(pw.Text('• Event: ${e['title'] ?? e['name'] ?? 'Untitled'}', style: const pw.TextStyle(fontSize: 10)));
              }
              for (final f in fileAttachments) {
                widgets.add(pw.Text('• File: ${f['name'] ?? 'Untitled'}', style: const pw.TextStyle(fontSize: 10)));
              }
            }

            widgets.add(pw.SizedBox(height: 20));
            widgets.add(pw.Text('Generated on: ${DateTime.now().toString().split('.')[0]}', style: pw.TextStyle(fontSize: 8, color: PdfColors.grey500, fontStyle: pw.FontStyle.italic)));

            return widgets;
          },
        ),
      );

      mainNotePath = '${exportFolder.path}/${safeName}.pdf';
      final mainFile = File(mainNotePath);
      await mainFile.writeAsBytes(await mainPdf.save());
      exportedFiles.add('Main Note: ${safeName}.pdf');

      // 2. Export linked notes as separate PDFs
      for (final linkedNote in noteAttachments) {
        try {
          final noteId = linkedNote['id']?.toString() ?? '';
          final noteTitle = linkedNote['title']?.toString() ?? linkedNote['name']?.toString() ?? 'Untitled Note';

          if (noteId.isNotEmpty && workspaceId != null) {
            final noteResponse = await _notesApiService.getNote(workspaceId, noteId);
            if (noteResponse.isSuccess && noteResponse.data != null) {
              final linkedNoteData = noteResponse.data!;
              final linkedPdf = pw.Document();
              final linkedContent = _stripHtmlTagsForPdf(linkedNoteData.content ?? '');
              final linkedParagraphs = linkedContent.split('\n\n').where((p) => p.trim().isNotEmpty).toList();

              linkedPdf.addPage(
                pw.MultiPage(
                  pageFormat: PdfPageFormat.a4,
                  margin: const pw.EdgeInsets.all(40),
                  maxPages: 50,
                  build: (pw.Context context) {
                    final widgets = <pw.Widget>[
                      pw.Header(level: 0, child: pw.Text(linkedNoteData.title, style: pw.TextStyle(fontSize: 24, fontWeight: pw.FontWeight.bold))),
                      pw.SizedBox(height: 10),
                      pw.Text('(Linked from: ${note.title})', style: pw.TextStyle(fontSize: 10, color: PdfColors.grey600, fontStyle: pw.FontStyle.italic)),
                      pw.Divider(thickness: 2),
                      pw.SizedBox(height: 20),
                    ];

                    if (linkedParagraphs.isEmpty) {
                      widgets.add(pw.Text('No content', style: const pw.TextStyle(fontSize: 12)));
                    } else {
                      for (final p in linkedParagraphs) {
                        widgets.add(pw.Paragraph(text: p.trim(), style: const pw.TextStyle(fontSize: 12, lineSpacing: 1.5)));
                        widgets.add(pw.SizedBox(height: 8));
                      }
                    }
                    return widgets;
                  },
                ),
              );

              final safeNoteTitle = noteTitle.replaceAll(RegExp(r'[^\w\s-]'), '_').trim();
              final linkedNotePath = '${exportFolder.path}/${safeName}_Note_$safeNoteTitle.pdf';
              final linkedFile = File(linkedNotePath);
              await linkedFile.writeAsBytes(await linkedPdf.save());
              exportedFiles.add('${safeName}_Note_$safeNoteTitle.pdf');
            }
          }
        } catch (e) {
          debugPrint('Error exporting linked note: $e');
          failedFiles.add('Note: ${linkedNote['title'] ?? 'Unknown'}');
        }
      }

      // 3. Export events as separate PDFs
      for (final event in eventAttachments) {
        try {
          final eventId = event['id']?.toString() ?? '';
          final eventTitle = event['title']?.toString() ?? event['name']?.toString() ?? 'Untitled Event';

          if (eventId.isNotEmpty && workspaceId != null) {
            final eventResponse = await calendarApi.getEvent(workspaceId, eventId);
            if (eventResponse.isSuccess && eventResponse.data != null) {
              final eventData = eventResponse.data!;
              final eventPdf = pw.Document();

              eventPdf.addPage(
                pw.Page(
                  pageFormat: PdfPageFormat.a4,
                  margin: const pw.EdgeInsets.all(40),
                  build: (pw.Context context) {
                    final widgets = <pw.Widget>[
                      pw.Header(level: 0, child: pw.Text(eventData.title, style: pw.TextStyle(fontSize: 24, fontWeight: pw.FontWeight.bold))),
                      pw.SizedBox(height: 10),
                      pw.Text('(Event linked from: ${note.title})', style: pw.TextStyle(fontSize: 10, color: PdfColors.grey600, fontStyle: pw.FontStyle.italic)),
                      pw.Divider(thickness: 2),
                      pw.SizedBox(height: 20),

                      // Event details
                      pw.Row(children: [
                        pw.Text('Date: ', style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold)),
                        pw.Expanded(child: pw.Text('${_notesService.formatDateTime(eventData.startTime)} - ${_notesService.formatDateTime(eventData.endTime)}${eventData.isAllDay ? ' (All Day)' : ''}', style: const pw.TextStyle(fontSize: 12))),
                      ]),
                    ];

                    if (eventData.location != null && eventData.location!.isNotEmpty) {
                      widgets.add(pw.SizedBox(height: 8));
                      widgets.add(pw.Row(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
                        pw.Text('Location: ', style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold)),
                        pw.Expanded(child: pw.Text(eventData.location!, style: const pw.TextStyle(fontSize: 12))),
                      ]));
                    }

                    if (eventData.organizerName != null && eventData.organizerName!.isNotEmpty) {
                      widgets.add(pw.SizedBox(height: 8));
                      widgets.add(pw.Row(children: [
                        pw.Text('Organizer: ', style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold)),
                        pw.Text(eventData.organizerName!, style: const pw.TextStyle(fontSize: 12)),
                      ]));
                    }

                    if (eventData.attendees != null && eventData.attendees!.isNotEmpty) {
                      widgets.add(pw.SizedBox(height: 8));
                      widgets.add(pw.Row(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
                        pw.Text('Attendees: ', style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold)),
                        pw.Expanded(child: pw.Text(eventData.attendees!.map((a) => a.name ?? a.email ?? 'Unknown').join(', '), style: const pw.TextStyle(fontSize: 12))),
                      ]));
                    }

                    if (eventData.meetingUrl != null && eventData.meetingUrl!.isNotEmpty) {
                      widgets.add(pw.SizedBox(height: 8));
                      widgets.add(pw.Row(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
                        pw.Text('Meeting URL: ', style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold)),
                        pw.Expanded(child: pw.Text(eventData.meetingUrl!, style: pw.TextStyle(fontSize: 11, color: PdfColors.blue700))),
                      ]));
                    }

                    if (eventData.description != null && eventData.description!.isNotEmpty) {
                      widgets.add(pw.SizedBox(height: 16));
                      widgets.add(pw.Text('Description:', style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold)));
                      widgets.add(pw.SizedBox(height: 8));
                      widgets.add(pw.Text(_stripHtmlTagsForPdf(eventData.description!), style: const pw.TextStyle(fontSize: 12, lineSpacing: 1.4)));
                    }

                    return pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: widgets);
                  },
                ),
              );

              final safeEventTitle = eventTitle.replaceAll(RegExp(r'[^\w\s-]'), '_').trim();
              final eventPath = '${exportFolder.path}/${safeName}_Event_$safeEventTitle.pdf';
              final eventFile = File(eventPath);
              await eventFile.writeAsBytes(await eventPdf.save());
              exportedFiles.add('${safeName}_Event_$safeEventTitle.pdf');
            }
          }
        } catch (e) {
          debugPrint('Error exporting event: $e');
          failedFiles.add('Event: ${event['title'] ?? 'Unknown'}');
        }
      }

      // 4. Download file attachments
      final dio = Dio();
      int fileIndex = 1;
      for (final fileAttachment in fileAttachments) {
        try {
          final fileUrl = fileAttachment['url']?.toString();
          final originalFileName = fileAttachment['name']?.toString() ?? 'file_${DateTime.now().millisecondsSinceEpoch}';

          // Get file extension from original name or URL
          String extension = '';
          if (originalFileName.contains('.')) {
            extension = originalFileName.substring(originalFileName.lastIndexOf('.'));
          } else if (fileUrl != null && fileUrl.contains('.')) {
            final urlFileName = fileUrl.split('/').last.split('?').first;
            if (urlFileName.contains('.')) {
              extension = urlFileName.substring(urlFileName.lastIndexOf('.'));
            }
          }

          // Determine file type for naming
          String fileType = 'File';
          final mimeType = fileAttachment['mime_type']?.toString().toLowerCase() ?? '';
          if (mimeType.startsWith('image/') || extension.toLowerCase().contains(RegExp(r'\.(jpg|jpeg|png|gif|webp|bmp)'))) {
            fileType = 'Image';
          } else if (mimeType.startsWith('video/') || extension.toLowerCase().contains(RegExp(r'\.(mp4|mov|avi|mkv|webm)'))) {
            fileType = 'Video';
          } else if (mimeType.startsWith('audio/') || extension.toLowerCase().contains(RegExp(r'\.(mp3|wav|aac|m4a)'))) {
            fileType = 'Audio';
          } else if (mimeType == 'application/pdf' || extension.toLowerCase() == '.pdf') {
            fileType = 'PDF';
          } else if (mimeType.contains('document') || mimeType.contains('word') || extension.toLowerCase().contains(RegExp(r'\.(doc|docx)'))) {
            fileType = 'Document';
          }

          if (fileUrl != null && fileUrl.isNotEmpty) {
            final safeFileName = '${safeName}_${fileType}_$fileIndex$extension';
            final filePath = '${exportFolder.path}/$safeFileName';
            await dio.download(fileUrl, filePath);
            exportedFiles.add(safeFileName);
            fileIndex++;
          } else {
            failedFiles.add('File: $originalFileName (No URL)');
          }
        } catch (e) {
          debugPrint('Error downloading file: $e');
          failedFiles.add('File: ${fileAttachment['name'] ?? 'Unknown'}');
        }
      }

      // Close loading dialog
      if (mounted) {
        Navigator.of(context).pop();

        // Show success dialog
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            title: Row(
              children: [
                Icon(Icons.check_circle, color: Colors.green.shade700, size: 28),
                const SizedBox(width: 12),
                const Text('Export Complete'),
              ],
            ),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Exported ${exportedFiles.length} file(s) to:', style: TextStyle(fontSize: 14, color: Colors.grey[700])),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(color: Colors.grey[100], borderRadius: BorderRadius.circular(4)),
                    child: Text(exportFolder.path, style: const TextStyle(fontSize: 11, fontFamily: 'monospace')),
                  ),
                  const SizedBox(height: 16),
                  Text('Exported files:', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  const SizedBox(height: 8),
                  ...exportedFiles.map((f) => Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Row(children: [
                      Icon(Icons.check, color: Colors.green, size: 16),
                      const SizedBox(width: 8),
                      Expanded(child: Text(f, style: const TextStyle(fontSize: 12))),
                    ]),
                  )),
                  if (failedFiles.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Text('Failed:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.red[700])),
                    const SizedBox(height: 8),
                    ...failedFiles.map((f) => Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Row(children: [
                        Icon(Icons.close, color: Colors.red, size: 16),
                        const SizedBox(width: 8),
                        Expanded(child: Text(f, style: const TextStyle(fontSize: 12))),
                      ]),
                    )),
                  ],
                ],
              ),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Close')),
              ElevatedButton.icon(
                onPressed: () async {
                  Navigator.of(context).pop();
                  if (mainNotePath != null) {
                    try {
                      await OpenFilex.open(mainNotePath);
                    } catch (e) {
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error opening PDF: $e'), backgroundColor: Colors.red));
                      }
                    }
                  }
                },
                icon: const Icon(Icons.open_in_new, size: 18),
                label: const Text('Open Main PDF'),
                style: ElevatedButton.styleFrom(backgroundColor: context.primaryColor, foregroundColor: Colors.white),
              ),
            ],
          ),
        );
      }
    } catch (e, stackTrace) {
      debugPrint('Export error: $e\n$stackTrace');
      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(children: [
              const Icon(Icons.error_outline, color: Colors.white),
              const SizedBox(width: 12),
              Expanded(child: Text('Failed to export: $e')),
            ]),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 4),
          ),
        );
      }
    }
  }

  // Organize notes hierarchically
  List<Note> _organizeNotesHierarchically(List<Note> notes) {
    for (final note in notes) {
    }
    
    final List<Note> organizedNotes = [];
    final Map<String, List<Note>> childrenMap = {};
    
    int parentCount = 0;
    int childCount = 0;
    
    // Group children by parent ID
    for (final note in notes) {
      if (note.parentId != null && note.parentId!.isNotEmpty) {
        childrenMap.putIfAbsent(note.parentId!, () => []).add(note);
        childCount++;
        
        // Check if parent exists
        final parentExists = notes.any((n) => n.id == note.parentId);
        if (!parentExists) {
        }
      } else {
        parentCount++;
      }
    }
    
    
    // Add parent notes and their children
    for (final note in notes) {
      if (note.parentId == null) {  // This is a parent note
        organizedNotes.add(note);
        
        // Add children if parent is expanded
        if (_expandedParentIds.contains(note.id) && childrenMap.containsKey(note.id)) {
          organizedNotes.addAll(childrenMap[note.id]!);
        }
      }
    }
    
    return organizedNotes;
  }
  
  void _toggleParentExpansion(String parentId) {
    setState(() {
      if (_expandedParentIds.contains(parentId)) {
        _expandedParentIds.remove(parentId);
      } else {
        _expandedParentIds.add(parentId);
      }
    });
  }
  
  void _expandAllParents(List<Note> notes) {
    setState(() {
      for (final note in notes) {
        if (note.parentId == null) {  // Parent notes only
          final hasChildren = notes.any((child) => child.parentId == note.id);
          if (hasChildren) {
            _expandedParentIds.add(note.id);
          }
        }
      }
    });
  }
  
  void _collapseAllParents() {
    setState(() {
      _expandedParentIds.clear();
    });
  }

  Widget _buildNotesList(List<Note> notes, String emptyMessage) {
    return RefreshIndicator(
      onRefresh: _initializeAndLoadNotes,
      child: notes.isEmpty
          ? ListView(
              children: [
                SizedBox(
                  height: MediaQuery.of(context).size.height * 0.6,
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.note_alt_outlined,
                          size: 64,
                          color: Theme.of(context).colorScheme.secondary,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          emptyMessage,
                          style: Theme.of(context).textTheme.headlineSmall,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'notes_home.pull_to_refresh'.tr(),
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            )
          : _buildNotesListView(notes),
    );
  }
  
  Widget _buildNotesListView(List<Note> notes) {
    final organizedNotes = _organizeNotesHierarchically(notes);
    final childrenMap = <String, List<Note>>{};
    
    // Create children map for checking if note has children
    for (final note in notes) {
      if (note.parentId != null) {
        childrenMap.putIfAbsent(note.parentId!, () => []).add(note);
      }
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16.0),
      itemCount: organizedNotes.length,
      itemBuilder: (context, index) {
        final note = organizedNotes[index];
        final hasChildren = childrenMap.containsKey(note.id);
        final isChild = note.parentId != null;
        
        return Card(
          margin: EdgeInsets.only(
            bottom: 8,
            left: isChild ? 24 : 0,  // Indent child notes
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(5),
          ),
          child: ListTile(
            contentPadding: EdgeInsets.only(left: _isSelectionMode ? 4 : 16, right: 4),
            leading: _isSelectionMode
                ? Checkbox(
                    value: _selectedNoteIds.contains(note.id),
                    onChanged: (_) => _toggleNoteSelection(note.id),
                  )
                : SizedBox(
                    width: hasChildren && !isChild ? 68 : 44,  // Extra width for expansion icon
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Expansion icon for parent notes with children
                        if (hasChildren && !isChild) ...[
                          InkWell(
                            onTap: () => _toggleParentExpansion(note.id),
                            child: Icon(
                              _expandedParentIds.contains(note.id)
                                  ? Icons.expand_less
                                  : Icons.expand_more,
                              size: 20,
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                          ),
                          const SizedBox(width: 4),
                        ],
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: Colors.primaries[index % Colors.primaries.length].withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(5),
                          ),
                          child: Center(
                            child: Text(
                              note.icon,
                              style: const TextStyle(fontSize: 20),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
            title: Row(
              children: [
                if (isChild) ...[
                  Icon(
                    Icons.subdirectory_arrow_right,
                    size: 16,
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(width: 4),
                ],
                Expanded(
                  child: Text(
                    note.title,
                    style: const TextStyle(fontWeight: FontWeight.w500),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                // Show child count for parent notes
                if (hasChildren && !isChild) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.secondaryContainer,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '${childrenMap[note.id]!.length}',
                      style: TextStyle(
                        fontSize: 12,
                        color: Theme.of(context).colorScheme.onSecondaryContainer,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ],
            ),
            subtitle: Text(
              _notesService.formatDateTime(note.updatedAt),
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
            trailing: _isSelectionMode
                ? null
                : PopupMenuButton<String>(
                    icon: const Icon(Icons.more_vert),
                    onSelected: (action) {
                switch (action) {
                  case 'favorite':
                    _toggleFavorite(note);
                    break;
                  case 'duplicate':
                    // Show immediate feedback
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('notes_home.duplicating'.tr(args: [note.title])),
                        backgroundColor: Colors.blue,
                        duration: const Duration(seconds: 1),
                      ),
                    );
                    _duplicateNote(note);
                    break;
                  case 'share':
                    _shareNote(note);
                    break;
                  case 'export_to_drive':
                    _exportNoteToGoogleDrive(note);
                    break;
                  case 'document_info':
                    _showDocumentInfo(note);
                    break;
                  // TODO: Collaborators feature not functional yet
                  // case 'collaborators':
                  //   _showCollaborators(note);
                  //   break;
                  case 'quick_actions':
                    _showQuickActions(note);
                    break;
                  case 'add_child':
                    _showCreateChildNoteDialog(note);
                    break;
                  case 'archive':
                    _archiveNote(note);
                    break;
                  case 'delete':
                    _deleteNote(note);
                    break;
                }
              },
              itemBuilder: (context) => [
                PopupMenuItem(
                  value: 'add_child',
                  child: Row(
                    children: [
                      Icon(Icons.add),
                      SizedBox(width: 12),
                      Text('notes_home.add_child_note'.tr()),
                    ],
                  ),
                ),
                const PopupMenuDivider(),
                PopupMenuItem(
                  value: 'favorite',
                  child: Row(
                    children: [
                      Icon(
                        note.isFavorite ? Icons.star : Icons.star_border,
                        color: note.isFavorite ? Colors.amber : null,
                      ),
                      SizedBox(width: 12),
                      Text(note.isFavorite ? 'notes_home.remove_from_favorites'.tr() : 'notes_home.add_to_favorites'.tr()),
                    ],
                  ),
                ),
                PopupMenuItem(
                  value: 'duplicate',
                  child: Row(
                    children: [
                      Icon(Icons.copy),
                      SizedBox(width: 12),
                      Text('notes_home.duplicate'.tr()),
                    ],
                  ),
                ),
                PopupMenuItem(
                  value: 'share',
                  child: Row(
                    children: [
                      Icon(Icons.share),
                      SizedBox(width: 12),
                      Text('common.share'.tr()),
                    ],
                  ),
                ),
                PopupMenuItem(
                  value: 'export_to_drive',
                  child: Row(
                    children: [
                      Icon(Icons.cloud_upload_outlined),
                      SizedBox(width: 12),
                      Text('notes.export_to_drive'.tr()),
                    ],
                  ),
                ),
                const PopupMenuDivider(),
                PopupMenuItem(
                  value: 'document_info',
                  child: Row(
                    children: [
                      Icon(Icons.info_outline),
                      SizedBox(width: 12),
                      Text('notes_home.document_info'.tr()),
                    ],
                  ),
                ),
                // TODO: Collaborators feature not functional yet
                // const PopupMenuItem(
                //   value: 'collaborators',
                //   child: Row(
                //     children: [
                //       Icon(Icons.people_outline),
                //       SizedBox(width: 12),
                //       Text('Collaborators'),
                //     ],
                //   ),
                // ),
                PopupMenuItem(
                  value: 'quick_actions',
                  child: Row(
                    children: [
                      Icon(Icons.flash_on),
                      SizedBox(width: 12),
                      Text('notes_home.quick_actions'.tr()),
                    ],
                  ),
                ),
                const PopupMenuDivider(),
                PopupMenuItem(
                  value: 'archive',
                  child: Row(
                    children: [
                      Icon(Icons.archive),
                      SizedBox(width: 12),
                      Text('notes_home.archive'.tr()),
                    ],
                  ),
                ),
                PopupMenuItem(
                  value: 'delete',
                  child: Row(
                    children: [
                      Icon(Icons.delete, color: Colors.red),
                      SizedBox(width: 12),
                      Text('common.delete'.tr(), style: TextStyle(color: Colors.red)),
                    ],
                  ),
                ),
              ],
            ),
            onTap: () {
              if (_isSelectionMode) {
                _toggleNoteSelection(note.id);
              } else {
                _showNoteDetails(note);
              }
            },
            onLongPress: () {
              if (!_isSelectionMode) {
                _enterSelectionMode();
                _toggleNoteSelection(note.id);
              }
            },
          ),
        );
      },
    );
  }


  List<Note> _getFilteredAndSortedNotes(List<Note> notes) {
    // Create a mutable copy of the input list
    List<Note> filteredNotes = List<Note>.from(notes);
    
    // Apply search filter
    if (_searchQuery.isNotEmpty) {
      // Search within the provided notes list, not from _notesService
      filteredNotes = filteredNotes.where((note) {
        final query = _searchQuery.toLowerCase();
        return note.title.toLowerCase().contains(query) ||
               note.content.toLowerCase().contains(query) ||
               note.description.toLowerCase().contains(query) ||
               note.keywords.any((keyword) => keyword.toLowerCase().contains(query));
      }).toList();
    }
    
    // Apply category filter
    if (_selectedFilter != 'all') {
      filteredNotes = filteredNotes.where((note) => note.categoryId == _selectedFilter).toList();
    }
    
    // Apply sorting
    switch (_selectedSort) {
      case 'updated':
        filteredNotes.sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
        break;
      case 'created':
        filteredNotes.sort((a, b) => b.createdAt.compareTo(a.createdAt));
        break;
      case 'title':
        filteredNotes.sort((a, b) => a.title.toLowerCase().compareTo(b.title.toLowerCase()));
        break;
      case 'category':
        filteredNotes.sort((a, b) => (a.category?.name ?? '').compareTo(b.category?.name ?? ''));
        break;
    }
    
    return filteredNotes;
  }

  void _toggleSearch() {
    setState(() {
      _isSearching = !_isSearching;
      if (!_isSearching) {
        _searchController.clear();
        _searchQuery = '';
      }
    });
  }

  void _onSearchChanged(String query) {
    setState(() {
      _searchQuery = query;
    });
  }

  void _enterSelectionMode() {
    setState(() {
      _isSelectionMode = true;
      _selectedNoteIds.clear();
    });
  }

  void _exitSelectionMode() {
    setState(() {
      _isSelectionMode = false;
      _selectedNoteIds.clear();
    });
  }

  void _toggleNoteSelection(String noteId) {
    setState(() {
      if (_selectedNoteIds.contains(noteId)) {
        _selectedNoteIds.remove(noteId);
        if (_selectedNoteIds.isEmpty) {
          _exitSelectionMode();
        }
      } else {
        _selectedNoteIds.add(noteId);
      }
    });
  }

  void _selectAllNotes(List<Note> notes) {
    setState(() {
      _selectedNoteIds.clear();
      _selectedNoteIds.addAll(notes.map((note) => note.id));
    });
  }

  void _favoriteSelectedNotes() async {
    final appAtOnceService = AppAtOnceService.instance;
    int successCount = 0;
    
    for (final noteId in _selectedNoteIds) {
      // Find the note in the converted list
      final note = _convertedNotes.firstWhere(
        (n) => n.id == noteId,
        orElse: () => _notesService.getNote(noteId)!,
      );
      
      if (!note.isFavorite) {
        // Update local first
        _notesService.toggleFavorite(noteId);
        
        // Update in database
        try {
          if (appAtOnceService.isInitialized) {
            final dbNote = _appAtOnceNotes.firstWhere(
              (n) => n.id == noteId,
              orElse: () => throw Exception('Note not found'),
            );
            
            final updatedNote = dbNote.copyWith(isFavorite: true);
            await appAtOnceService.updateNote(updatedNote);
            successCount++;
          }
        } catch (e) {
          // Revert local change
          _notesService.toggleFavorite(noteId);
        }
      }
    }
    
    _exitSelectionMode();
    await _initializeAndLoadNotes();
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('notes_home.notes_added_to_favorites'.tr(args: [successCount.toString()])),
        backgroundColor: Colors.amber,
      ),
    );
  }

  void _unfavoriteSelectedNotes() async {
    final appAtOnceService = AppAtOnceService.instance;
    int successCount = 0;
    
    for (final noteId in _selectedNoteIds) {
      // Find the note in the converted list
      final note = _convertedNotes.firstWhere(
        (n) => n.id == noteId,
        orElse: () => _notesService.getNote(noteId)!,
      );
      
      if (note.isFavorite) {
        // Update local first
        _notesService.toggleFavorite(noteId);
        
        // Update in database
        try {
          if (appAtOnceService.isInitialized) {
            final dbNote = _appAtOnceNotes.firstWhere(
              (n) => n.id == noteId,
              orElse: () => throw Exception('Note not found'),
            );
            
            final updatedNote = dbNote.copyWith(isFavorite: false);
            await appAtOnceService.updateNote(updatedNote);
            successCount++;
          }
        } catch (e) {
          // Revert local change
          _notesService.toggleFavorite(noteId);
        }
      }
    }
    
    _exitSelectionMode();
    await _initializeAndLoadNotes();
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('notes_home.notes_removed_from_favorites'.tr(args: [successCount.toString()])),
        backgroundColor: Colors.orange,
      ),
    );
  }

  void _mergeSelectedNotes() async {
    if (_selectedNoteIds.length < 2) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('notes_home.select_at_least_2'.tr()),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    // Get selected notes
    final selectedNotes = _selectedNoteIds
        .map((id) => _convertedNotes.firstWhere((n) => n.id == id))
        .toList();

    // Show merge options dialog
    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => _MergeNotesDialog(notes: selectedNotes),
    );

    if (result == null) return; // User cancelled

    // Show loading dialog
    if (!mounted) return;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => Center(
        child: Card(
          child: Padding(
            padding: EdgeInsets.all(24.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircularProgressIndicator(),
                SizedBox(height: 16),
                Text('notes_home.merging_notes'.tr()),
              ],
            ),
          ),
        ),
      ),
    );

    try {
      // Get workspace ID
      String? workspaceId = _workspaceService.currentWorkspace?.id;

      // Fallback to default workspace ID from environment
      if (workspaceId == null || workspaceId.isEmpty) {
        workspaceId = EnvConfig.defaultWorkspaceId;
      }

      if (workspaceId == null || workspaceId.isEmpty) {
        throw Exception('No workspace ID available');
      }

      // Get the actual note IDs from _appAtOnceNotes

      final noteIdsToMerge = <String>[];
      for (final selectedId in _selectedNoteIds) {
        try {
          final appNote = _appAtOnceNotes.firstWhere(
            (n) => n.id == selectedId,
            orElse: () => throw Exception('Note not found: $selectedId'),
          );
          if (appNote.id != null && appNote.id!.isNotEmpty) {
            noteIdsToMerge.add(appNote.id!);
          } else {
          }
        } catch (e) {
          rethrow;
        }
      }

      for (var i = 0; i < noteIdsToMerge.length; i++) {
      }

      if (noteIdsToMerge.length < 2) {
        throw Exception('Not enough valid notes to merge (found: ${noteIdsToMerge.length})');
      }

      // Get merge options from dialog result
      final customTitle = result['customTitle'] as String?;
      final includeHeaders = result['includeHeaders'] as bool? ?? true;
      final addDividers = result['addDividers'] as bool? ?? true;
      final sortByDate = result['sortByDate'] as bool? ?? false;


      // Create merge DTO with all options
      final mergeDto = api.MergeNotesDto(
        noteIds: noteIdsToMerge,
        title: customTitle,
        includeHeaders: includeHeaders,
        addDividers: addDividers,
        sortByDate: sortByDate,
      );

      // Call merge API
      final response = await _notesApiService.mergeNotes(workspaceId, mergeDto);


      if (mounted) {
        Navigator.pop(context); // Close loading dialog
      }

      if (response.isSuccess) {

        _exitSelectionMode();

        // Refresh notes from API
        await _initializeAndLoadNotes();

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('notes_home.notes_merged'.tr(args: [noteIdsToMerge.length.toString()])),
              backgroundColor: Colors.green,
            ),
          );
        }
      } else {
        final errorMsg = response.message ?? 'Failed to merge notes';
        final statusCode = response.statusCode;
        throw Exception('$errorMsg ${statusCode != null ? '(Status: $statusCode)' : ''}');
      }
    } catch (e) {

      if (mounted) {
        Navigator.pop(context); // Close loading dialog

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('notes_home.failed_to_merge'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void navigateToAllNotesTab() {
    _tabController.animateTo(0);
    setState(() {}); // Refresh the UI to show any new notes
  }

  void _clearSelectedNotes() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('notes_home.delete_selected'.tr()),
        content: Text('notes_home.delete_selected_confirm'.tr(args: [_selectedNoteIds.length.toString()])),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('common.cancel'.tr()),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              
              final appAtOnceService = AppAtOnceService.instance;
              int successCount = 0;
              
              for (final noteId in _selectedNoteIds) {
                try {
                  if (appAtOnceService.isInitialized) {
                    await appAtOnceService.deleteNote(noteId);
                  }
                  _notesService.deleteNote(noteId);
                  successCount++;
                } catch (e) {
                }
              }
              
              final count = _selectedNoteIds.length;
              _exitSelectionMode();
              
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('notes_home.notes_deleted'.tr(args: [successCount.toString()])),
                  backgroundColor: Colors.green,
                ),
              );

              // Refresh the list
              _initializeAndLoadNotes();
            },
            child: Text(
              'common.delete'.tr(),
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ),
        ],
      ),
    );
  }

  void _showFilterDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('notes_home.filter_notes'.tr()),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            RadioListTile<String>(
              title: Text('notes_home.all_categories'.tr()),
              value: 'all',
              groupValue: _selectedFilter,
              onChanged: (value) {
                setState(() {
                  _selectedFilter = value!;
                });
                Navigator.pop(context);
              },
            ),
            ...NoteCategory.categories.map((category) => RadioListTile<String>(
              title: Row(
                children: [
                  Text(category.icon),
                  const SizedBox(width: 8),
                  Text(category.name),
                ],
              ),
              value: category.id,
              groupValue: _selectedFilter,
              onChanged: (value) {
                setState(() {
                  _selectedFilter = value!;
                });
                Navigator.pop(context);
              },
            )),
          ],
        ),
      ),
    );
  }

  void _showSortDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('notes_home.sort_notes'.tr()),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            RadioListTile<String>(
              title: Text('notes_home.last_updated'.tr()),
              value: 'updated',
              groupValue: _selectedSort,
              onChanged: (value) {
                setState(() {
                  _selectedSort = value!;
                });
                Navigator.pop(context);
              },
            ),
            RadioListTile<String>(
              title: Text('notes_home.date_created'.tr()),
              value: 'created',
              groupValue: _selectedSort,
              onChanged: (value) {
                setState(() {
                  _selectedSort = value!;
                });
                Navigator.pop(context);
              },
            ),
            RadioListTile<String>(
              title: Text('notes_home.title_az'.tr()),
              value: 'title',
              groupValue: _selectedSort,
              onChanged: (value) {
                setState(() {
                  _selectedSort = value!;
                });
                Navigator.pop(context);
              },
            ),
            RadioListTile<String>(
              title: Text('notes_home.category'.tr()),
              value: 'category',
              groupValue: _selectedSort,
              onChanged: (value) {
                setState(() {
                  _selectedSort = value!;
                });
                Navigator.pop(context);
              },
            ),
          ],
        ),
      ),
    );
  }

  /// Helper method to build TabBar for bottom widget
  PreferredSizeWidget _buildTabBar() {
    return TabBar(
      controller: _tabController,
      isScrollable: true,
      padding: EdgeInsets.zero,
      tabAlignment: TabAlignment.start,
      tabs: [
        Tab(text: 'notes_home.tab_all'.tr()),
        Tab(text: 'notes_home.tab_recent'.tr()),
        Tab(text: 'notes_home.tab_favorites'.tr()),
        Tab(text: 'notes_home.tab_archive'.tr()),
        Tab(text: 'notes_home.tab_trash'.tr()),
      ],
    );
  }

  /// Helper method to get filter label
  String _getFilterLabel() {
    if (_selectedFilter == 'all') return '';
    return NoteCategory.categories
        .firstWhere((cat) => cat.id == _selectedFilter)
        .name;
  }

  @override
  Widget build(BuildContext context) {
    // Use AppAtOnce database notes instead of demo notes
    
    final convertedNotes = _convertedNotes;
    
    final allNotes = _getFilteredAndSortedNotes(convertedNotes);
    final favoriteNotes = _getFilteredAndSortedNotes(convertedNotes.where((note) => note.isFavorite).toList());

    // Get 5 most recent notes sorted by updatedAt date (also filtered by search)
    final sortedByDate = allNotes.toList()
      ..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    final recentNotes = sortedByDate.take(5).toList();

    // Apply search filter to archived and deleted notes
    final filteredArchivedNotes = _getFilteredAndSortedNotes(_archivedNotes);
    final filteredDeletedNotes = _getFilteredAndSortedNotes(_deletedNotes);

    
    return PopScope(
      canPop: !_isSelectionMode,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop && _isSelectionMode) {
          _exitSelectionMode();
        }
      },
      child: Scaffold(
        appBar: DeskiveToolbar(
          title: 'notes_home.title'.tr(),
          isSearching: _isSearching,
          searchController: _searchController,
          onSearchChanged: _onSearchChanged,
          onSearchToggle: _toggleSearch,
          searchHint: 'notes_home.search_hint'.tr(),
          isSelectionMode: _isSelectionMode,
          selectedCount: _selectedNoteIds.length,
          onExitSelection: _exitSelectionMode,
          onSelectAll: () {
            final List<Note> currentNotes = _tabController.index == 0
                ? allNotes
                : _tabController.index == 1
                    ? recentNotes
                    : _tabController.index == 2
                        ? favoriteNotes
                        : _tabController.index == 3
                            ? filteredArchivedNotes
                            : filteredDeletedNotes;
            _selectAllNotes(currentNotes);
          },
          selectionActions: [
            DeskiveToolbarAction.menu(
              menuItems: [
                DeskiveToolbarMenuItem(
                  value: 'favorite',
                  label: 'notes_home.favorite'.tr(),
                  icon: Icons.star,
                ),
                DeskiveToolbarMenuItem(
                  value: 'unfavorite',
                  label: 'notes_home.unfavorite'.tr(),
                  icon: Icons.star_border,
                ),
                DeskiveToolbarMenuItem(
                  value: 'merge',
                  label: 'notes_home.merge'.tr(),
                  icon: Icons.merge,
                ),
                DeskiveToolbarMenuItem(
                  value: 'clear',
                  label: 'notes_home.clear'.tr(),
                  icon: Icons.delete,
                ),
              ],
              onMenuItemSelected: (action) {
                switch (action) {
                  case 'favorite':
                    _favoriteSelectedNotes();
                    break;
                  case 'unfavorite':
                    _unfavoriteSelectedNotes();
                    break;
                  case 'merge':
                    _mergeSelectedNotes();
                    break;
                  case 'clear':
                    _clearSelectedNotes();
                    break;
                }
              },
            ),
          ],
          actions: [
            DeskiveToolbarAction.icon(
              icon: Icons.file_download_outlined,
              tooltip: 'notes_import.title'.tr(),
              onPressed: _showImportModal,
            ),
            DeskiveToolbarAction.icon(
              icon: Icons.add,
              tooltip: 'notes_home.create_note'.tr(),
              onPressed: _showCreateNoteDialog,
            ),
          ],
          customActions: [
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: AIButton(
                onPressed: () {
                  showAINotesAssistant(
                    context: context,
                    onNotesChanged: _initializeAndLoadNotes,
                  );
                },
                tooltip: 'notes_home.ai_assistant'.tr(),
              ),
            ),
          ],
          activeSearchQuery: _searchQuery,
          activeFilterLabel: _getFilterLabel(),
          onClearFilters: () {
            setState(() {
              _searchQuery = '';
              _selectedFilter = 'all';
              _searchController.clear();
            });
          },
          bottom: _buildTabBar(),
        ),
      body: _isLoadingNotes
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('notes_home.loading_notes'.tr()),
                ],
              ),
            )
          : _loadError != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.error_outline,
                        size: 64,
                        color: Theme.of(context).colorScheme.error,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'notes_home.failed_to_load'.tr(),
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _loadError!,
                        style: Theme.of(context).textTheme.bodyMedium,
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _initializeAndLoadNotes,
                        child: Text('common.retry'.tr()),
                      ),
                    ],
                  ),
                )
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _buildNotesList(allNotes, 'notes_home.no_notes'.tr()),
                    _buildNotesList(recentNotes, 'notes_home.no_recent'.tr()),
                    _buildNotesList(favoriteNotes, 'notes_home.no_favorites'.tr()),
                    _buildArchiveList(filteredArchivedNotes),
                    _buildTrashList(filteredDeletedNotes),
                  ],
                ),
    ),
    );
  }
}

// Merge Notes Dialog Widget
class _MergeNotesDialog extends StatefulWidget {
  final List<Note> notes;

  const _MergeNotesDialog({required this.notes});

  @override
  State<_MergeNotesDialog> createState() => _MergeNotesDialogState();
}

class _MergeNotesDialogState extends State<_MergeNotesDialog> {
  bool _includeHeaders = true;
  bool _addDividers = true;
  bool _sortByDate = false;
  late TextEditingController _titleController;

  @override
  void initState() {
    super.initState();
    // Generate default title from first note
    final defaultTitle = widget.notes.isNotEmpty
        ? '${widget.notes.first.title} + ${widget.notes.length - 1} more'
        : 'Merged Notes';
    _titleController = TextEditingController(text: defaultTitle);
  }

  @override
  void dispose() {
    _titleController.dispose();
    super.dispose();
  }

  int get _totalBlocks {
    return widget.notes.fold<int>(0, (sum, note) {
      // Count blocks by splitting content by newlines
      final blocks = note.content.split('\n').where((line) => line.trim().isNotEmpty).length;
      return sum + blocks;
    });
  }

  Set<String> get _uniqueTags {
    final tags = <String>{};
    for (final note in widget.notes) {
      tags.addAll(note.keywords);
    }
    return tags;
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 500, maxHeight: 600),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Icon(
                    Icons.merge,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'notes_home.merge_notes'.tr(),
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
            ),

            const Divider(height: 1),

            // Content
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Description
                    Text(
                      'notes_home.merge_description'.tr(args: [widget.notes.length.toString()]),
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),

                    const SizedBox(height: 20),

                    // Notes to merge section
                    Text(
                      'notes_home.notes_to_merge'.tr(),
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 12),

                    // List of notes
                    ...widget.notes.asMap().entries.map((entry) {
                      final index = entry.key;
                      final note = entry.value;
                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          children: [
                            Text(
                              '${index + 1}',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Theme.of(context).colorScheme.primary,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Icon(
                              Icons.description,
                              size: 16,
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    note.title,
                                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                      fontWeight: FontWeight.w500,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  Text(
                                    '1 blocks • Invalid date',
                                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    }),

                    const SizedBox(height: 20),

                    // Merge options
                    Text(
                      'notes_home.merge_options'.tr(),
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 12),

                    CheckboxListTile(
                      value: _includeHeaders,
                      onChanged: (value) {
                        setState(() {
                          _includeHeaders = value ?? true;
                        });
                      },
                      title: Text('notes_home.include_headers'.tr()),
                      contentPadding: EdgeInsets.zero,
                      controlAffinity: ListTileControlAffinity.leading,
                    ),

                    CheckboxListTile(
                      value: _addDividers,
                      onChanged: (value) {
                        setState(() {
                          _addDividers = value ?? true;
                        });
                      },
                      title: Text('notes_home.add_dividers'.tr()),
                      contentPadding: EdgeInsets.zero,
                      controlAffinity: ListTileControlAffinity.leading,
                    ),

                    CheckboxListTile(
                      value: _sortByDate,
                      onChanged: (value) {
                        setState(() {
                          _sortByDate = value ?? false;
                        });
                      },
                      title: Text('notes_home.sort_by_date'.tr()),
                      contentPadding: EdgeInsets.zero,
                      controlAffinity: ListTileControlAffinity.leading,
                    ),

                    const SizedBox(height: 20),

                    // Custom title
                    Text(
                      'notes_home.custom_title'.tr(),
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),

                    TextField(
                      controller: _titleController,
                      decoration: InputDecoration(
                        hintText: 'notes_home.enter_custom_title'.tr(),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 12,
                        ),
                      ),
                    ),

                    const SizedBox(height: 20),

                    // Merge summary
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.primaryContainer.withValues(alpha: 0.3),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.auto_awesome,
                            color: Theme.of(context).colorScheme.primary,
                            size: 20,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'notes_home.merge_summary'.tr(),
                                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'notes_home.total_blocks'.tr(args: [_totalBlocks.toString()]),
                                  style: Theme.of(context).textTheme.bodySmall,
                                ),
                                Text(
                                  'notes_home.unique_tags'.tr(args: [_uniqueTags.length.toString()]),
                                  style: Theme.of(context).textTheme.bodySmall,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const Divider(height: 1),

            // Actions
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: Text('common.cancel'.tr()),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton.icon(
                    onPressed: () {
                      Navigator.pop(context, {
                        'customTitle': _titleController.text.trim().isEmpty
                            ? null
                            : _titleController.text.trim(),
                        'includeHeaders': _includeHeaders,
                        'addDividers': _addDividers,
                        'sortByDate': _sortByDate,
                      });
                    },
                    icon: const Icon(Icons.merge),
                    label: Text('notes_home.merge_notes'.tr()),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Theme.of(context).colorScheme.primary,
                      foregroundColor: Theme.of(context).colorScheme.onPrimary,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 20,
                        vertical: 12,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}