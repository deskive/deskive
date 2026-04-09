import 'dart:io';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter_quill/flutter_quill.dart';
import 'package:flutter_quill_delta_from_html/flutter_quill_delta_from_html.dart';
import 'package:vsc_quill_delta_to_html/vsc_quill_delta_to_html.dart';
import 'package:easy_localization/easy_localization.dart';
import '../models/calendar_event.dart';
import '../api/services/calendar_api_service.dart' as api;
import '../api/services/ai_api_service.dart';
import '../api/services/notes_api_service.dart' as notes_api;
import '../api/services/storage_api_service.dart';
import '../api/services/workspace_api_service.dart';
import '../api/base_api_client.dart';
import '../services/workspace_service.dart';
import '../services/file_service.dart';
import '../models/file/file.dart' as file_model;
import '../theme/app_theme.dart';
import '../widgets/mention_suggestion_widget.dart';
import '../widgets/attachment_display_widget.dart';
import '../widgets/attachment_preview_dialogs.dart';
import '../widgets/ai_description_button.dart';

class EditEventScreen extends StatefulWidget {
  final CalendarEvent event;
  final Function(CalendarEvent) onEventUpdated;
  final Function() onEventDeleted;

  const EditEventScreen({
    super.key,
    required this.event,
    required this.onEventUpdated,
    required this.onEventDeleted,
  });

  @override
  State<EditEventScreen> createState() => _EditEventScreenState();
}

class _EditEventScreenState extends State<EditEventScreen> with TickerProviderStateMixin {
  int _selectedTabIndex = 0;
  List<String> _tabs = [];

  late TextEditingController _titleController;
  late QuillController descriptionController;
  late TextEditingController _locationController;
  late TextEditingController _meetingUrlController;
  final FocusNode _quillFocusNode = FocusNode();
  final ScrollController _quillScrollController = ScrollController();

  late DateTime _startDate;
  late TimeOfDay _startTime;
  late DateTime _endDate;
  late TimeOfDay _endTime;
  late String _priority;
  late bool _isAllDay;
  late bool _isPrivate;

  final List<String> _priorities = ['low', 'normal', 'high', 'urgent'];
  final List<String> _priorityLabels = ['Low', 'Normal', 'High', 'Urgent'];

  // Advanced tab - Attendees, Reminders, Recurrence
  List<String> _attendees = [];
  List<Map<String, dynamic>> _reminders = [];
  String _recurrencePattern = 'none';

  // Attachments
  List<Map<String, dynamic>> _attachedFiles = [];

  // Notes from API
  List<notes_api.Note> _availableNotesFromApi = [];
  List<notes_api.Note> _selectedNotes = [];
  bool _isLoadingNotes = false;

  // API Services
  final api.CalendarApiService _calendarApi = api.CalendarApiService();
  final AIApiService _aiService = AIApiService();
  final notes_api.NotesApiService _notesApi = notes_api.NotesApiService();
  final StorageApiService _storageApi = StorageApiService();
  final WorkspaceApiService _workspaceApi = WorkspaceApiService();
  final WorkspaceService _workspaceService = WorkspaceService.instance;

  // Workspace members for attendees
  List<WorkspaceMember> _workspaceMembers = [];
  bool _isLoadingMembers = false;

  // API-based categories and meeting rooms
  List<api.EventCategory> _categories = [];
  List<api.MeetingRoom> _meetingRooms = [];
  String? _selectedCategoryId;
  String? _selectedMeetingRoomId;
  bool _isLoadingCategories = false;
  bool _isLoadingRooms = false;

  bool _isLoading = false;
  bool _isDeleting = false;
  bool _isDuplicating = false;

  // AI Suggestions
  bool _isGeneratingAI = false;
  late AnimationController _animationController;
  late Animation<double> _animation;
  late AnimationController _borderAnimationController;
  late Animation<double> _borderAnimation;

  // Validation error states
  bool _titleError = false;
  bool _categoryError = false;
  bool _priorityError = false;

  // Notes integration (/ mention) - using API notes for UUID IDs
  final FileService _fileService = FileService.instance;
  List<notes_api.Note> _availableNotesForMention = [];
  List<CalendarEvent> _availableEvents = [];
  List<file_model.File> _availableFiles = [];
  bool _showMentionSuggestions = false;
  int _slashSymbolPosition = -1;
  final FocusNode _descriptionFocusNode = FocusNode();

  // Attachments from / mention in description
  List<Map<String, dynamic>> _descriptionAttachments = [];

  @override
  void initState() {
    super.initState();

    // Initialize tabs with translations
    _tabs = ['common.details'.tr(), 'common.advanced'.tr(), 'common.attachments'.tr()];

    // Initialize animation controller for breathing AI icon
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    );
    _animation = Tween<double>(begin: 0.6, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeInOut),
    );

    // Initialize animation controller for running border glow
    _borderAnimationController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );
    _borderAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _borderAnimationController, curve: Curves.linear),
    );

    // Initialize controllers with event data
    _titleController = TextEditingController(text: widget.event.title);

    // Initialize description with Quill controller (HTML to Delta conversion)
    String initialDescription = widget.event.description ?? '';
    if (initialDescription.isEmpty || initialDescription == 'Video Meeting') {
      initialDescription = 'Meeting Link: http://localhost:3000/workspace/348a72c9-85a3-4104-955e-bac5e70793fa/video?meeting=ozvmy35e74eindfyyjp2';
    }

    // Initialize Quill controller with existing description
    if (initialDescription.isNotEmpty && _isHtmlContent(initialDescription)) {
      // Convert HTML to Quill Delta format to preserve formatting
      try {
        final delta = HtmlToDelta().convert(initialDescription);
        descriptionController = QuillController(
          document: Document.fromDelta(delta),
          selection: const TextSelection.collapsed(offset: 0),
        );
      } catch (e) {
        // Fallback to plain text if HTML conversion fails
        descriptionController = QuillController.basic();
        descriptionController.document = Document()..insert(0, _stripHtmlTags(initialDescription));
      }
    } else {
      // For plain text or empty content
      descriptionController = QuillController.basic();
      if (initialDescription.isNotEmpty) {
        descriptionController.document = Document()..insert(0, initialDescription);
      }
    }

    _locationController = TextEditingController(text: widget.event.location ?? '');
    _meetingUrlController = TextEditingController(text: widget.event.meetingUrl ?? '');

    // Initialize date/time
    _startDate = DateTime(widget.event.startTime.year, widget.event.startTime.month, widget.event.startTime.day);
    _startTime = TimeOfDay.fromDateTime(widget.event.startTime);
    _endDate = DateTime(widget.event.endTime.year, widget.event.endTime.month, widget.event.endTime.day);
    _endTime = TimeOfDay.fromDateTime(widget.event.endTime);

    // Initialize other properties
    _selectedCategoryId = widget.event.categoryId;
    _selectedMeetingRoomId = widget.event.roomId;
    _priority = widget.event.priority.name.toLowerCase();
    _isAllDay = widget.event.allDay;
    _isPrivate = widget.event.visibility == EventVisibility.private;

    // No default reminder needed

    // Listen to description changes for / mentions
    descriptionController.addListener(_onDescriptionChange);

    // Load notes from API for / mentions (ensures UUID IDs)
    _loadNotesForMentions();

    // Load categories and meeting rooms from API
    _loadCategories();
    _loadMeetingRooms();
    _loadWorkspaceMembers();

    // Load full event details including attendees and attachments
    _loadEventDetails();

    // Parse description for note/file references
    _parseDescriptionReferences();
  }

  /// Load notes from API for / mentions (ensures we get UUID IDs)
  Future<void> _loadNotesForMentions() async {
    try {
      final currentWorkspace = _workspaceService.currentWorkspace;
      if (currentWorkspace == null) return;

      final response = await _notesApi.getNotes(currentWorkspace.id);
      if (response.isSuccess && response.data != null) {
        setState(() {
          _availableNotesForMention = response.data!;
        });
        debugPrint('✅ Loaded ${_availableNotesForMention.length} notes for / mentions with UUID IDs');
      }
    } catch (e) {
      debugPrint('❌ Error loading notes for mentions: $e');
    }
  }

  Future<void> _loadCategories() async {
    setState(() => _isLoadingCategories = true);

    try {
      final currentWorkspace = _workspaceService.currentWorkspace;
      if (currentWorkspace == null) return;

      final response = await _calendarApi.getEventCategories(currentWorkspace.id);

      if (response.isSuccess && response.data != null) {
        setState(() {
          _categories = response.data!;
          _isLoadingCategories = false;
          // Validate selected category still exists
          if (_selectedCategoryId != null &&
              !_categories.any((c) => c.id == _selectedCategoryId)) {
            _selectedCategoryId = null;
          }
        });
        debugPrint('📂 Loaded ${_categories.length} categories');
      } else {
        setState(() {
          _categories = [];
          _isLoadingCategories = false;
        });
      }
    } catch (e) {
      setState(() {
        _categories = [];
        _isLoadingCategories = false;
      });
      debugPrint('Error loading categories: $e');
    }
  }

  Future<void> _loadMeetingRooms() async {
    setState(() => _isLoadingRooms = true);

    try {
      final currentWorkspace = _workspaceService.currentWorkspace;
      if (currentWorkspace == null) return;

      final response = await _calendarApi.getMeetingRooms(currentWorkspace.id);

      if (response.isSuccess && response.data != null) {
        setState(() {
          _meetingRooms = response.data!;
          _isLoadingRooms = false;
          // Validate selected meeting room still exists
          if (_selectedMeetingRoomId != null &&
              !_meetingRooms.any((r) => r.id == _selectedMeetingRoomId)) {
            _selectedMeetingRoomId = null;
          }
        });
        debugPrint('📍 Loaded ${_meetingRooms.length} meeting rooms');
      } else {
        setState(() {
          _meetingRooms = [];
          _isLoadingRooms = false;
        });
      }
    } catch (e) {
      setState(() {
        _meetingRooms = [];
        _isLoadingRooms = false;
      });
      debugPrint('Error loading meeting rooms: $e');
    }
  }

  Future<void> _loadEventDetails() async {
    try {
      final currentWorkspace = _workspaceService.currentWorkspace;
      if (currentWorkspace == null || widget.event.id == null) return;

      print('📅 Loading event details for ID: ${widget.event.id}');

      final response = await _calendarApi.getEvent(
        currentWorkspace.id,
        widget.event.id!,
      );

      if (response.isSuccess && response.data != null) {
        final event = response.data!;
        print('✅ Event details loaded successfully');
        print('📧 Attendees: ${event.attendees}');
        print('📎 Attachments: ${event.attachments}');
        print('📎 Description file IDs: ${event.descriptionFileIds}');

        setState(() {
          // Load attendees from the detailed response
          if (event.attendees != null && event.attendees!.isNotEmpty) {
            _attendees = event.attendees!
                .map((attendee) => attendee.email)
                .where((email) => email.isNotEmpty)
                .toList();
            print('✅ Loaded ${_attendees.length} attendees: $_attendees');
          }

          // Load attachments from the unified attachments format
          // Display them below description (in _descriptionAttachments) for preview on tap
          if (event.attachments != null && event.attachments!.isNotEmpty) {
            _descriptionAttachments = [];

            // Check if we have detailed data (enriched response from API)
            final hasFileDetails = event.attachments!.fileAttachmentDetails.isNotEmpty;
            final hasNoteDetails = event.attachments!.noteAttachmentDetails.isNotEmpty;
            final hasEventDetails = event.attachments!.eventAttachmentDetails.isNotEmpty;

            // Add file attachments with details if available
            if (hasFileDetails) {
              for (final fileDetail in event.attachments!.fileAttachmentDetails) {
                _descriptionAttachments.add({
                  'id': fileDetail['id']?.toString() ?? '',
                  'name': fileDetail['name'] ?? fileDetail['file_name'] ?? 'File',
                  'type': 'file',
                  'size': fileDetail['size']?.toString() ?? 'Unknown',
                  'storage_path': fileDetail['storage_path'] ?? fileDetail['storagePath'],
                  'mime_type': fileDetail['mime_type'] ?? fileDetail['mimeType'],
                  'url': fileDetail['url'],
                });
              }
            } else {
              // Store file IDs to fetch details later
              for (final fileId in event.attachments!.fileAttachment) {
                _descriptionAttachments.add({
                  'id': fileId,
                  'name': 'Loading...',
                  'type': 'file',
                  'size': 'Unknown',
                  '_needsFetch': true,
                });
              }
            }

            // Add note attachments with details if available
            if (hasNoteDetails) {
              for (final noteDetail in event.attachments!.noteAttachmentDetails) {
                _descriptionAttachments.add({
                  'id': noteDetail['id']?.toString() ?? '',
                  'name': noteDetail['title'] ?? noteDetail['name'] ?? 'Note',
                  'type': 'note',
                });
              }
            } else {
              // Store note IDs to fetch details later
              for (final noteId in event.attachments!.noteAttachment) {
                _descriptionAttachments.add({
                  'id': noteId,
                  'name': 'Loading...',
                  'type': 'note',
                  '_needsFetch': true,
                });
              }
            }

            // Add event attachments with details if available
            if (hasEventDetails) {
              for (final eventDetail in event.attachments!.eventAttachmentDetails) {
                _descriptionAttachments.add({
                  'id': eventDetail['id']?.toString() ?? '',
                  'name': eventDetail['title'] ?? eventDetail['name'] ?? 'Event',
                  'type': 'event',
                });
              }
            } else {
              // Store event IDs to fetch details later
              for (final eventId in event.attachments!.eventAttachment) {
                _descriptionAttachments.add({
                  'id': eventId,
                  'name': 'Loading...',
                  'type': 'event',
                  '_needsFetch': true,
                });
              }
            }

            print('✅ Loaded ${_descriptionAttachments.length} attachments for display below description');

            // Fetch actual details for attachments that only have IDs
            _fetchAttachmentDetails();
          }
        });
      } else {
        print('❌ Failed to load event details: ${response.message}');
      }
    } catch (e) {
      print('❌ Error loading event details: $e');
      debugPrint('Error loading event details: $e');
    }
  }

  /// Fetch actual details for attachments that only have IDs
  Future<void> _fetchAttachmentDetails() async {
    final currentWorkspace = _workspaceService.currentWorkspace;
    if (currentWorkspace == null) return;

    bool hasChanges = false;

    for (int i = 0; i < _descriptionAttachments.length; i++) {
      final attachment = _descriptionAttachments[i];
      if (attachment['_needsFetch'] != true) continue;

      final id = attachment['id'] as String;
      final type = attachment['type'] as String;

      try {
        if (type == 'note') {
          // Fetch note details
          final response = await _notesApi.getNote(currentWorkspace.id, id);
          if (response.isSuccess && response.data != null) {
            _descriptionAttachments[i] = {
              'id': id,
              'name': response.data!.title,
              'type': 'note',
            };
            hasChanges = true;
          }
        } else if (type == 'event') {
          // Fetch event details
          final response = await _calendarApi.getEvent(currentWorkspace.id, id);
          if (response.isSuccess && response.data != null) {
            _descriptionAttachments[i] = {
              'id': id,
              'name': response.data!.title,
              'type': 'event',
            };
            hasChanges = true;
          }
        } else if (type == 'file') {
          // Fetch file details
          _fileService.initialize(currentWorkspace.id);
          final file = await _fileService.getFileById(id);
          if (file != null) {
            _descriptionAttachments[i] = {
              'id': id,
              'name': file.name,
              'type': 'file',
              'size': file.size,
              'storage_path': file.storagePath,
              'mime_type': file.mimeType,
              'url': file.url,
            };
            hasChanges = true;
          }
        }
      } catch (e) {
        print('❌ Error fetching details for $type $id: $e');
        // Keep the "Loading..." name or set to generic name
        _descriptionAttachments[i]['name'] = type == 'note' ? 'Note' : type == 'event' ? 'Event' : 'File';
        _descriptionAttachments[i].remove('_needsFetch');
        hasChanges = true;
      }
    }

    if (hasChanges && mounted) {
      setState(() {});
      print('✅ Fetched attachment details');
    }
  }

  Future<void> _loadWorkspaceMembers() async {
    setState(() => _isLoadingMembers = true);

    try {
      final currentWorkspace = _workspaceService.currentWorkspace;
      if (currentWorkspace == null) return;

      final response = await _workspaceApi.getMembers(currentWorkspace.id);

      if (response.isSuccess && response.data != null) {
        setState(() {
          _workspaceMembers = response.data!;
          _isLoadingMembers = false;
        });
        debugPrint('✅ Loaded ${_workspaceMembers.length} workspace members');
      } else {
        setState(() {
          _workspaceMembers = [];
          _isLoadingMembers = false;
        });
      }
    } catch (e) {
      setState(() {
        _workspaceMembers = [];
        _isLoadingMembers = false;
      });
      debugPrint('❌ Error loading workspace members: $e');
    }
  }

  void _parseDescriptionReferences() {
    final description = descriptionController.document.toPlainText();
    if (description.isEmpty) return;

    // Parse [note:id:title] references
    final notePattern = RegExp(r'\[note:([^:]+):([^\]]+)\]');
    final noteMatches = notePattern.allMatches(description);

    for (final match in noteMatches) {
      final noteId = match.group(1);
      final noteTitle = match.group(2);

      if (!_selectedNotes.any((n) => n.id == noteId)) {
        // Create a minimal API Note for display
        _selectedNotes.add(notes_api.Note(
          id: noteId!,
          title: noteTitle!,
          content: '',
          authorId: '', // Empty for parsed references
          workspaceId: _workspaceService.currentWorkspace?.id ?? '',
          isPublic: false,
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
        ));
      }
    }

    // Parse [file:id:filename] references
    final filePattern = RegExp(r'\[file:([^:]+):([^\]]+)\]');
    final fileMatches = filePattern.allMatches(description);

    for (final match in fileMatches) {
      final fileId = match.group(1);
      final fileName = match.group(2);
      // Add to attached files if not already there
      if (!_attachedFiles.any((f) => f['id'] == fileId)) {
        _attachedFiles.add({
          'id': fileId!,
          'name': fileName!,
          'size': 'Unknown',
        });
      }
    }

    if (noteMatches.isNotEmpty || fileMatches.isNotEmpty) {
      setState(() {});
      debugPrint('✅ Parsed ${noteMatches.length} note references and ${fileMatches.length} file references');
    }
  }

  void _onDescriptionChange() {
    final text = descriptionController.document.toPlainText();
    final cursorPosition = descriptionController.selection.baseOffset;

    // Check if / symbol was typed
    if (cursorPosition > 0 && text[cursorPosition - 1] == '/') {
      debugPrint('🔍 / symbol detected. Available: Notes=${_availableNotesForMention.length}, Events=${_availableEvents.length}, Files=${_availableFiles.length}');
      setState(() {
        _slashSymbolPosition = cursorPosition - 1;
        _showMentionSuggestions = true;
      });
      // Load events and files if not already loaded
      _loadEventsForMention();
      _loadFilesForMention();
    } else if (_showMentionSuggestions && _slashSymbolPosition >= 0) {
      // Hide suggestions if user moves away from / mention or deletes /
      if (cursorPosition < _slashSymbolPosition || !text.contains('/')) {
        setState(() {
          _showMentionSuggestions = false;
          _slashSymbolPosition = -1;
        });
      }
    }
  }

  Future<void> _loadEventsForMention() async {
    if (_availableEvents.isNotEmpty) return; // Already loaded

    try {
      final workspaceId = _workspaceService.currentWorkspace?.id;
      if (workspaceId == null) return;

      final response = await _calendarApi.getEvents(workspaceId);
      if (response.isSuccess && response.data != null) {
        setState(() {
          // Convert API CalendarEvent to model CalendarEvent (only minimal fields needed for mention)
          _availableEvents = response.data!.map((apiEvent) {
            // Convert attendees from List<EventAttendee> to List<Map<String, dynamic>>
            final attendeesList = apiEvent.attendees?.map((attendee) {
              return {
                'email': attendee.email,
                'name': attendee.name,
                'status': attendee.status,
              };
            }).toList() ?? [];

            return CalendarEvent(
              id: apiEvent.id,
              workspaceId: apiEvent.workspaceId,
              title: apiEvent.title,
              description: apiEvent.description,
              startTime: apiEvent.startTime,
              endTime: apiEvent.endTime,
              allDay: apiEvent.isAllDay,
              location: apiEvent.location,
              organizerId: apiEvent.organizerId,
              categoryId: apiEvent.categoryId,
              attendees: attendeesList,
              attachments: apiEvent.attachments != null
                    ? CalendarEventAttachments(
                        fileAttachment: apiEvent.attachments!.fileAttachment,
                        noteAttachment: apiEvent.attachments!.noteAttachment,
                        eventAttachment: apiEvent.attachments!.eventAttachment,
                      )
                    : null,
              isRecurring: apiEvent.isRecurring,
              meetingUrl: apiEvent.meetingUrl,
              createdAt: apiEvent.createdAt,
              updatedAt: apiEvent.updatedAt,
            );
          }).toList();
        });
      }
    } catch (e) {
      debugPrint('Error loading events for mention: $e');
    }
  }

  Future<void> _loadFilesForMention() async {
    if (_availableFiles.isNotEmpty) return; // Already loaded

    try {
      final workspaceId = _workspaceService.currentWorkspace?.id;
      if (workspaceId == null) {
        debugPrint('❌ No workspace ID found for loading files');
        return;
      }

      debugPrint('🔍 Loading files for workspace: $workspaceId');

      // Initialize file service if not already
      _fileService.initialize(workspaceId);
      await _fileService.fetchFiles();

      debugPrint('✅ Files loaded: ${_fileService.files.length} files found');

      setState(() {
        _availableFiles = _fileService.files;
        debugPrint('📁 Available files set: ${_availableFiles.length}');
      });
    } catch (e) {
      debugPrint('❌ Error loading files for mention: $e');
    }
  }

  void _insertNoteReference(notes_api.Note note) {
    // Check if already attached in description
    final alreadyAttached = _descriptionAttachments.any((a) => a['id'] == note.id && a['type'] == 'note');
    if (alreadyAttached) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('calendar.note_already_referenced'.tr(args: [note.title])),
          duration: const Duration(seconds: 2),
          backgroundColor: Colors.orange,
        ),
      );
      setState(() {
        _showMentionSuggestions = false;
        _slashSymbolPosition = -1;
      });
      return;
    }

    setState(() {
      // Add note as description attachment
      _descriptionAttachments.add({
        'id': note.id,
        'name': note.title,
        'type': 'note',
        'content': note.content,
      });

      // Insert note reference in Quill description
      final reference = '[Note: ${note.title}]';
      descriptionController.replaceText(
        _slashSymbolPosition,
        1, // Remove the / character
        reference,
        TextSelection.collapsed(offset: _slashSymbolPosition + reference.length),
      );

      _showMentionSuggestions = false;
      _slashSymbolPosition = -1;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('calendar.note_referenced'.tr(args: [note.title])),
        duration: const Duration(seconds: 2),
        backgroundColor: Colors.green,
      ),
    );
  }

  void _insertEventReference(CalendarEvent event) {
    // Check if already attached in description
    final alreadyAttached = _descriptionAttachments.any((a) => a['id'] == event.id && a['type'] == 'event');
    if (alreadyAttached) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('calendar.event_already_referenced'.tr(args: [event.title])),
          duration: const Duration(seconds: 2),
          backgroundColor: Colors.orange,
        ),
      );
      setState(() {
        _showMentionSuggestions = false;
        _slashSymbolPosition = -1;
      });
      return;
    }

    setState(() {
      // Add event as description attachment
      _descriptionAttachments.add({
        'id': event.id,
        'name': event.title,
        'type': 'event',
        'start_time': event.startTime.toIso8601String(),
        'end_time': event.endTime.toIso8601String(),
        'location': event.location,
      });

      // Insert event reference in Quill description
      final reference = '[Event: ${event.title}]';
      descriptionController.replaceText(
        _slashSymbolPosition,
        1, // Remove the / character
        reference,
        TextSelection.collapsed(offset: _slashSymbolPosition + reference.length),
      );

      _showMentionSuggestions = false;
      _slashSymbolPosition = -1;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('calendar.event_referenced'.tr(args: [event.title])),
        duration: const Duration(seconds: 2),
        backgroundColor: Colors.green,
      ),
    );
  }

  void _insertFileReference(file_model.File file) {
    // Check if already attached in description
    final alreadyAttached = _descriptionAttachments.any((a) => a['id'] == file.id && a['type'] == 'file');
    if (alreadyAttached) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('calendar.file_already_referenced'.tr(args: [file.name])),
          duration: const Duration(seconds: 2),
          backgroundColor: Colors.orange,
        ),
      );
      setState(() {
        _showMentionSuggestions = false;
        _slashSymbolPosition = -1;
      });
      return;
    }

    setState(() {
      // Add file as description attachment
      _descriptionAttachments.add({
        'id': file.id,
        'name': file.name,
        'type': 'file',
        'size': file.size, // Store raw size, let preview dialog format it
        'storage_path': file.storagePath,
        'mime_type': file.mimeType,
        'url': file.url,
      });

      // Insert file reference in Quill description
      final reference = '[File: ${file.name}]';
      descriptionController.replaceText(
        _slashSymbolPosition,
        1, // Remove the / character
        reference,
        TextSelection.collapsed(offset: _slashSymbolPosition + reference.length),
      );

      _showMentionSuggestions = false;
      _slashSymbolPosition = -1;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('calendar.file_referenced'.tr(args: [file.name])),
        duration: const Duration(seconds: 2),
        backgroundColor: Colors.green,
      ),
    );
  }

  /// Handles tapping on an attachment to show preview dialog
  void _handleAttachmentTap(AttachmentItem attachment) {
    final workspaceId = _workspaceService.currentWorkspace?.id ?? '';

    switch (attachment.type) {
      case AttachmentType.event:
        EventPreviewDialog.show(
          context,
          eventId: attachment.id,
          eventName: attachment.name,
          workspaceId: workspaceId,
        );
        break;
      case AttachmentType.note:
        NotePreviewDialog.show(
          context,
          noteId: attachment.id,
          noteName: attachment.name,
          workspaceId: workspaceId,
        );
        break;
      case AttachmentType.file:
        FilePreviewDialog.show(
          context,
          fileId: attachment.id,
          fileName: attachment.name,
          fileSize: attachment.metadata?['size']?.toString(),
          mimeType: attachment.metadata?['mime_type']?.toString(),
          fileUrl: attachment.metadata?['url']?.toString(),
        );
        break;
    }
  }

  String _formatFileSize(String sizeStr) {
    try {
      final size = int.tryParse(sizeStr) ?? 0;
      if (size < 1024) {
        return '$size B';
      } else if (size < 1024 * 1024) {
        return '${(size / 1024).toStringAsFixed(1)} KB';
      } else {
        return '${(size / (1024 * 1024)).toStringAsFixed(1)} MB';
      }
    } catch (e) {
      return sizeStr;
    }
  }

  @override
  void dispose() {
    _animationController.dispose();
    _borderAnimationController.dispose();
    descriptionController.removeListener(_onDescriptionChange);
    _titleController.dispose();
    descriptionController.dispose();
    _locationController.dispose();
    _meetingUrlController.dispose();
    _quillFocusNode.dispose();
    _quillScrollController.dispose();
    super.dispose();
  }

  // Strip HTML tags for simple text display
  String _stripHtmlTags(String htmlText) {
    final RegExp htmlTagRegex = RegExp(r'<[^>]*>', multiLine: true, caseSensitive: false);
    return htmlText.replaceAll(htmlTagRegex, '').replaceAll('&nbsp;', ' ').trim();
  }

  // Check if content is HTML
  bool _isHtmlContent(String content) {
    return content.contains('<') && content.contains('>');
  }

  // Convert Quill Delta to HTML
  String _getDescriptionAsHtml() {
    final delta = descriptionController.document.toDelta();
    final converter = QuillDeltaToHtmlConverter(
      delta.toJson().cast<Map<String, dynamic>>(),
      ConverterOptions.forEmail(),
    );
    return converter.convert();
  }

  // Theme-aware color getters
  Color get backgroundColor => Theme.of(context).brightness == Brightness.dark 
      ? const Color(0xFF0F1419) 
      : Colors.grey[50]!;
      
  Color get surfaceColor => Theme.of(context).brightness == Brightness.dark 
      ? const Color(0xFF1A1F2A) 
      : Colors.white;
      
  Color get textColor => Theme.of(context).brightness == Brightness.dark 
      ? Colors.white 
      : Colors.black87;
      
  Color get subtitleColor => Theme.of(context).brightness == Brightness.dark 
      ? Colors.grey[400]! 
      : Colors.grey[600]!;
      
  Color get borderColor => Theme.of(context).brightness == Brightness.dark
      ? Colors.grey[800]!
      : Colors.grey[300]!;

  Color get primaryColor => context.primaryColor;

  Color get tabBackgroundColor => Theme.of(context).brightness == Brightness.dark
      ? const Color(0xFF2A2A2A)
      : Colors.grey[100]!;

  Color get selectedTabColor => Theme.of(context).brightness == Brightness.dark
      ? const Color(0xFF3A3A3A)
      : Colors.white;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: backgroundColor,
      appBar: AppBar(
        backgroundColor: backgroundColor,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.close, color: textColor),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'calendar.edit_event'.tr(),
          style: TextStyle(color: textColor, fontSize: 18, fontWeight: FontWeight.w600),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Tab Bar
            Container(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
            child: Container(
              decoration: BoxDecoration(
                color: tabBackgroundColor,
                borderRadius: BorderRadius.circular(8),
              ),
              padding: const EdgeInsets.all(4),
              child: Row(
                children: _tabs.asMap().entries.map((entry) {
                  final index = entry.key;
                  final tab = entry.value;
                  final isSelected = _selectedTabIndex == index;

                  return Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _selectedTabIndex = index),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        decoration: BoxDecoration(
                          color: isSelected ? selectedTabColor : Colors.transparent,
                          borderRadius: BorderRadius.circular(6),
                          border: isSelected ? Border.all(color: borderColor.withValues(alpha: 0.3)) : null,
                        ),
                        child: Text(
                          tab,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: isSelected ? textColor : subtitleColor,
                            fontSize: 13,
                            fontWeight: isSelected ? FontWeight.w500 : FontWeight.normal,
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
          
          // Content
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: _buildTabContent(),
            ),
          ),
          
          // Bottom Actions
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: surfaceColor,
              border: Border(top: BorderSide(color: borderColor)),
            ),
            child: Row(
              children: [
                // Delete Button
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: (_isDeleting || _isLoading || _isDuplicating) ? null : _deleteEvent,
                    icon: _isDeleting
                        ? SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation<Color>(Colors.red),
                            ),
                          )
                        : Icon(Icons.delete, size: 14),
                    label: Text('common.delete'.tr(), style: TextStyle(fontSize: 12)),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.red,
                      side: const BorderSide(color: Colors.red),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                  ),
                ),
                SizedBox(width: 8),
                // Duplicate Button
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: (_isDeleting || _isLoading || _isDuplicating) ? null : _duplicateEvent,
                    icon: _isDuplicating
                        ? SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation<Color>(Theme.of(context).colorScheme.primary),
                            ),
                          )
                        : Icon(Icons.copy, size: 14),
                    label: Text('calendar.duplicate'.tr(), style: TextStyle(fontSize: 12)),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Theme.of(context).colorScheme.primary,
                      side: BorderSide(color: Theme.of(context).colorScheme.primary),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                  ),
                ),
                SizedBox(width: 8),
                


                // Update Button
                Expanded(
                  flex: 2,
                  child: ElevatedButton(
                    onPressed: (_isLoading || _isGeneratingAI || _isDeleting) ? null : _updateEvent,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: (_isLoading || _isGeneratingAI || _isDeleting) ? Colors.grey : context.primaryColor,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(6),
                      ),
                    ),
                    child: _isLoading
                        ? SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                            ),
                          )
                        : Text('common.update'.tr()),
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

  Widget _buildTabContent() {
    switch (_selectedTabIndex) {
      case 0:
        return _buildDetailsTab();
      case 1:
        return _buildAdvancedTab();
      case 2:
        return _buildAttachmentTab();
      default:
        return _buildDetailsTab();
    }
  }

  Widget _buildDetailsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Title
          Row(
            children: [
              Text(
                'calendar.title_field'.tr(),
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: textColor,
                ),
              ),
              Text(
                ' *',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: _titleError ? Colors.red : primaryColor,
                ),
              ),
            ],
          ),
          SizedBox(height: 8),
          TextField(
            controller: _titleController,
            style: TextStyle(color: textColor),
            onChanged: (value) {
              if (_titleError && value.trim().isNotEmpty) {
                setState(() {
                  _titleError = false;
                });
              }
            },
            decoration: InputDecoration(
              hintText: 'calendar.event_title'.tr(),
              hintStyle: TextStyle(color: subtitleColor),
              filled: true,
              fillColor: surfaceColor,
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(color: _titleError ? Colors.red : borderColor),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(color: _titleError ? Colors.red : borderColor),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(color: _titleError ? Colors.red : primaryColor),
              ),
            ),
          ),
          if (_titleError)
            Padding(
              padding: const EdgeInsets.only(top: 4, left: 4),
              child: Text(
                'calendar.title_required'.tr(),
                style: TextStyle(
                  color: Colors.red,
                  fontSize: 12,
                ),
              ),
            ),
          SizedBox(height: 8),

          // Description
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'calendar.description_field'.tr(),
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: textColor,
                ),
              ),
              AIDescriptionButton(
                onPressed: _generateAIDescriptions,
                isLoading: _isGeneratingAI,
              ),
            ],
          ),
          SizedBox(height: 8),
          // Rich text editor with QuillToolbar and QuillEditor
          _isGeneratingAI
              ? AnimatedBuilder(
                  animation: _borderAnimation,
                  builder: (context, child) {
                    return Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(10),
                        gradient: SweepGradient(
                          center: Alignment.center,
                          startAngle: 0,
                          endAngle: 3.14 * 2,
                          transform: GradientRotation(_borderAnimation.value * 3.14 * 2),
                          colors: [
                            Colors.teal.shade500,
                            Colors.teal.shade400,
                            Colors.cyan.shade400,
                            Colors.green.shade400,
                            Colors.green.shade500,
                            Colors.teal.shade500,
                          ],
                          stops: const [0.0, 0.2, 0.4, 0.6, 0.8, 1.0],
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.teal.shade800.withOpacity(0.7),
                            blurRadius: 15,
                            spreadRadius: 2,
                          ),
                        ],
                      ),
                      padding: const EdgeInsets.all(2),
                      child: Container(
                        decoration: BoxDecoration(
                          color: surfaceColor,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: child,
                      ),
                    );
                  },
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(8),
                        color: surfaceColor,
                      ),
                      child: Column(
                        children: [
                          // Quill Toolbar
                          Container(
                            decoration: BoxDecoration(
                              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.05),
                            ),
                          child: QuillSimpleToolbar(
                            controller: descriptionController,
                            config: const QuillSimpleToolbarConfig(
                              showBoldButton: true,
                              showItalicButton: true,
                              showUnderLineButton: true,
                              showStrikeThrough: true,
                              showListNumbers: true,
                              showListBullets: true,
                              showIndent: true,
                              showLink: false,  // Link disabled as requested
                              showClearFormat: true,
                              showFontFamily: false,
                              showFontSize: false,
                              showBackgroundColorButton: false,
                              showColorButton: false,
                              showHeaderStyle: false,
                              showQuote: false,
                              showCodeBlock: false,
                              showInlineCode: false,
                              showAlignmentButtons: true,
                              showSearchButton: false,
                              showSubscript: false,
                              showSuperscript: false,
                              showDividers: false,
                              showSmallButton: false,
                              showDirection: false,
                              showUndo: false,
                              showRedo: false,
                              multiRowsDisplay: false,
                            ),
                          ),
                        ),
                        Divider(height: 1, color: Theme.of(context).colorScheme.onSurface.withOpacity(0.2)),
                        // Quill Editor
                        Container(
                          height: 120,
                          padding: const EdgeInsets.all(8),
                          child: QuillEditor.basic(
                            controller: descriptionController,
                            focusNode: _quillFocusNode,
                            scrollController: _quillScrollController,
                            config: QuillEditorConfig(
                              placeholder: 'calendar.type_to_attach_hint'.tr(),
                              expands: true,
                              padding: EdgeInsets.zero,
                            ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                )
              : Container(
                  decoration: BoxDecoration(
                    border: Border.all(color: borderColor),
                    borderRadius: BorderRadius.circular(8),
                    color: surfaceColor,
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Column(
                      children: [
                        // Quill Toolbar
                        Container(
                          decoration: BoxDecoration(
                            color: Theme.of(context).colorScheme.onSurface.withOpacity(0.05),
                          ),
                        child: QuillSimpleToolbar(
                          controller: descriptionController,
                          config: const QuillSimpleToolbarConfig(
                            showBoldButton: true,
                            showItalicButton: true,
                            showUnderLineButton: true,
                            showStrikeThrough: true,
                            showListNumbers: true,
                            showListBullets: true,
                            showIndent: true,
                            showLink: false,  // Link disabled as requested
                            showClearFormat: true,
                            showFontFamily: false,
                            showFontSize: false,
                            showBackgroundColorButton: false,
                            showColorButton: false,
                            showHeaderStyle: false,
                            showQuote: false,
                            showCodeBlock: false,
                            showInlineCode: false,
                            showAlignmentButtons: true,
                            showSearchButton: false,
                            showSubscript: false,
                            showSuperscript: false,
                            showDividers: false,
                            showSmallButton: false,
                            showDirection: false,
                            showUndo: false,
                            showRedo: false,
                            multiRowsDisplay: false,
                          ),
                        ),
                      ),
                      Divider(height: 1, color: Theme.of(context).colorScheme.onSurface.withOpacity(0.2)),
                        // Quill Editor
                        Container(
                          height: 120,
                          padding: const EdgeInsets.all(8),
                          child: QuillEditor.basic(
                            controller: descriptionController,
                            focusNode: _quillFocusNode,
                            scrollController: _quillScrollController,
                            config: QuillEditorConfig(
                              placeholder: 'calendar.type_to_attach_hint'.tr(),
                              expands: true,
                              padding: EdgeInsets.zero,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
          SizedBox(height: 8),

          // Mention suggestions (show when / is typed) - Notes, Events, Files
          if (_showMentionSuggestions)
            SizedBox(
              height: 280, // Fixed height for the mention suggestions widget
              child: MentionSuggestionWidget(
                notes: _availableNotesForMention,
                events: _availableEvents,
                files: _availableFiles,
                onNoteSelected: _insertNoteReference,
                onEventSelected: _insertEventReference,
                onFileSelected: _insertFileReference,
                onClose: () {
                  setState(() {
                    _showMentionSuggestions = false;
                    _slashSymbolPosition = -1;
                  });
                },
              ),
            ),

          // Display attached items from / mention
          if (_descriptionAttachments.isNotEmpty)
            AttachmentFieldWidget(
              attachments: _descriptionAttachments
                  .map((a) => AttachmentItem.fromMap(a))
                  .toList(),
              onRemoveAttachment: (attachment) {
                setState(() {
                  _descriptionAttachments.removeWhere(
                    (a) => a['id'] == attachment.id && a['type'] == attachment.type.value,
                  );
                  // Also remove from description text
                  final refPattern = '[${attachment.type.label}: ${attachment.name}]';
                  final currentText = descriptionController.document.toPlainText();
                  final newText = currentText.replaceAll(refPattern, '');
                  // Replace entire content
                  final length = descriptionController.document.length - 1;
                  descriptionController.replaceText(0, length, newText, TextSelection.collapsed(offset: 0));
                });
              },
              onTapAttachment: _handleAttachmentTap,
              isCompact: true,
            ),

          Text(
            'calendar.type_to_attach_hint'.tr(),
            style: TextStyle(color: subtitleColor, fontSize: 12),
          ),
          SizedBox(height: 20),
        
        // Category and Priority Row
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        'calendar.category_field'.tr(),
                        style: TextStyle(
                          color: textColor,
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      Text(
                        ' *',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: _categoryError ? Colors.red : primaryColor,
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 8),
                  _isLoadingCategories
                      ? Container(
                          height: 48,
                          decoration: BoxDecoration(
                            color: surfaceColor,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: _categoryError ? Colors.red : borderColor),
                          ),
                          child: Center(
                            child: SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            ),
                          ),
                        )
                      : DropdownButtonFormField<String>(
                          value: _selectedCategoryId,
                          isExpanded: true,
                          hint: Text('calendar.select_category'.tr(), style: TextStyle(color: subtitleColor)),
                          items: _categories
                              .map((category) => DropdownMenuItem(
                                    value: category.id,
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Text(
                                          category.icon ?? '📁',
                                          style: TextStyle(fontSize: 16),
                                        ),
                                        SizedBox(width: 8),
                                        Flexible(
                                          child: Text(
                                            category.name,
                                            style: TextStyle(color: textColor),
                                            overflow: TextOverflow.ellipsis,
                                            maxLines: 1,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ))
                              .toList(),
                          onChanged: (value) {
                            if (value != null) {
                              setState(() {
                                _selectedCategoryId = value;
                                if (_categoryError) {
                                  _categoryError = false;
                                }
                              });
                            }
                          },
                          style: TextStyle(color: textColor),
                          decoration: InputDecoration(
                            filled: true,
                            fillColor: surfaceColor,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: BorderSide(color: _categoryError ? Colors.red : borderColor),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: BorderSide(color: _categoryError ? Colors.red : borderColor),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: BorderSide(color: _categoryError ? Colors.red : primaryColor),
                            ),
                          ),
                          dropdownColor: surfaceColor,
                        ),
                  if (_categoryError)
                    Padding(
                      padding: const EdgeInsets.only(top: 4, left: 4),
                      child: Text(
                        'calendar.category_required'.tr(),
                        style: TextStyle(
                          color: Colors.red,
                          fontSize: 12,
                        ),
                      ),
                    ),
                ],
              ),
            ),
            SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        'calendar.priority_field'.tr(),
                        style: TextStyle(
                          color: textColor,
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      Text(
                        ' *',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: _priorityError ? Colors.red : primaryColor,
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    value: _priority,
                    isExpanded: true,
                    hint: Text('projects.priority'.tr(), style: TextStyle(color: subtitleColor)),
                    onChanged: (value) {
                      setState(() {
                        _priority = value ?? 'normal';
                        if (_priorityError) {
                          _priorityError = false;
                        }
                      });
                    },
                    items: [
                      DropdownMenuItem(value: 'low', child: Text('calendar.priority_low'.tr(), style: TextStyle(color: textColor))),
                      DropdownMenuItem(value: 'normal', child: Text('calendar.priority_normal'.tr(), style: TextStyle(color: textColor))),
                      DropdownMenuItem(value: 'high', child: Text('calendar.priority_high'.tr(), style: TextStyle(color: textColor))),
                      DropdownMenuItem(value: 'urgent', child: Text('calendar.priority_urgent'.tr(), style: TextStyle(color: textColor))),
                    ],
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: surfaceColor,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(color: _priorityError ? Colors.red : borderColor),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(color: _priorityError ? Colors.red : borderColor),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(color: _priorityError ? Colors.red : primaryColor),
                      ),
                    ),
                    dropdownColor: surfaceColor,
                    style: TextStyle(color: textColor),
                  ),
                  if (_priorityError)
                    Padding(
                      padding: const EdgeInsets.only(top: 4, left: 4),
                      child: Text(
                        'calendar.priority_required'.tr(),
                        style: TextStyle(
                          color: Colors.red,
                          fontSize: 12,
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
        SizedBox(height: 20),

        // Meeting Room
        Text(
          'calendar.meeting_room_optional'.tr(),
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: textColor,
          ),
        ),
        SizedBox(height: 8),
        _isLoadingRooms
            ? Container(
                height: 48,
                decoration: BoxDecoration(
                  color: surfaceColor,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: borderColor),
                ),
                child: Center(
                  child: SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                ),
              )
            : DropdownButtonFormField<String>(
                value: _selectedMeetingRoomId,
                isExpanded: true,
                hint: Text('calendar.select_meeting_room'.tr(), style: TextStyle(color: subtitleColor)),
                items: _meetingRooms
                    .map((room) => DropdownMenuItem(
                          value: room.id,
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.meeting_room, size: 16, color: context.primaryColor),
                              SizedBox(width: 8),
                              Flexible(
                                child: Text(
                                  '${room.name} (${room.capacity} people)',
                                  style: TextStyle(color: textColor),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ))
                    .toList(),
                onChanged: (value) {
                  setState(() => _selectedMeetingRoomId = value);
                },
                style: TextStyle(color: textColor),
                decoration: InputDecoration(
                  filled: true,
                  fillColor: surfaceColor,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: BorderSide(color: borderColor),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: BorderSide(color: borderColor),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: BorderSide(color: primaryColor),
                  ),
                ),
                dropdownColor: surfaceColor,
              ),
        SizedBox(height: 20),

        // All Day Event Toggle
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: surfaceColor,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: borderColor),
          ),
          child: Row(
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'calendar.all_day_event'.tr(),
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: textColor,
                    ),
                  ),
                  SizedBox(height: 4),
                  Text(
                    'calendar.all_day_event_subtitle'.tr(),
                    style: TextStyle(
                      color: subtitleColor,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
              const Spacer(),
              Switch(
                value: _isAllDay,
                onChanged: (value) => setState(() => _isAllDay = value),
                activeColor: context.primaryColor,
              ),
            ],
          ),
        ),
        SizedBox(height: 20),
        
        // Date and Time Section
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'calendar.start_date'.tr(),
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: textColor,
                    ),
                  ),
                  SizedBox(height: 8),
                  InkWell(
                    onTap: _selectStartDate,
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      decoration: BoxDecoration(
                        color: surfaceColor,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: borderColor),
                      ),
                      child: Text(
                        '${_startDate.month.toString().padLeft(2, '0')}/${_startDate.day.toString().padLeft(2, '0')}/${_startDate.year}',
                        style: TextStyle(color: textColor),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'calendar.end_date'.tr(),
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: textColor,
                    ),
                  ),
                  SizedBox(height: 8),
                  InkWell(
                    onTap: _selectEndDate,
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      decoration: BoxDecoration(
                        color: surfaceColor,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: borderColor),
                      ),
                      child: Text(
                        '${_endDate.month.toString().padLeft(2, '0')}/${_endDate.day.toString().padLeft(2, '0')}/${_endDate.year}',
                        style: TextStyle(color: textColor),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        SizedBox(height: 16),
        
        // Time Section (if not all day)
        if (!_isAllDay) ...[
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'calendar.start_time'.tr(),
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: textColor,
                      ),
                    ),
                    SizedBox(height: 8),
                    InkWell(
                      onTap: _selectStartTime,
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        decoration: BoxDecoration(
                          color: surfaceColor,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: borderColor),
                        ),
                        child: Text(
                          _startTime.format(context),
                          style: TextStyle(color: textColor),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'calendar.end_time'.tr(),
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: textColor,
                      ),
                    ),
                    SizedBox(height: 8),
                    InkWell(
                      onTap: _selectEndTime,
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        decoration: BoxDecoration(
                          color: surfaceColor,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: borderColor),
                        ),
                        child: Text(
                          _endTime.format(context),
                          style: TextStyle(color: textColor),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          SizedBox(height: 20),
        ],
        
        // Location
        Text(
          'calendar.location_field'.tr(),
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: textColor,
          ),
        ),
        SizedBox(height: 8),
        TextField(
          controller: _locationController,
          style: TextStyle(color: textColor),
          decoration: InputDecoration(
            hintText: 'calendar.event_location_hint'.tr(),
            hintStyle: TextStyle(color: subtitleColor),
            filled: true,
            fillColor: surfaceColor,
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: borderColor),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: borderColor),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: primaryColor),
            ),
          ),
        ),
        SizedBox(height: 20),

        // Meeting URL
        Text(
          'calendar.meeting_url_field'.tr(),
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: textColor,
          ),
        ),
        SizedBox(height: 8),
        TextField(
          controller: _meetingUrlController,
          style: TextStyle(color: textColor),
          keyboardType: TextInputType.url,
          decoration: InputDecoration(
            hintText: 'calendar.meeting_url_hint'.tr(),
            hintStyle: TextStyle(color: subtitleColor),
            filled: true,
            fillColor: surfaceColor,
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            prefixIcon: Icon(Icons.link, color: subtitleColor, size: 20),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: borderColor),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: borderColor),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: primaryColor),
            ),
          ),
        ),
        SizedBox(height: 20),

        // Private Event Toggle
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: surfaceColor,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: borderColor),
          ),
          child: Row(
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'calendar.private_event'.tr(),
                    style: TextStyle(
                      color: textColor,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  SizedBox(height: 4),
                  Text(
                    'calendar.private_event_subtitle'.tr(),
                    style: TextStyle(
                      color: subtitleColor,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
              const Spacer(),
              Switch(
                value: _isPrivate,
                onChanged: (value) => setState(() => _isPrivate = value),
                activeColor: context.primaryColor,
              ),
            ],
          ),
        ),
        ],
      ),
    );
  }

  Widget _buildAdvancedTab() {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Attendees Section
          Text(
            'calendar.attendees'.tr(),
            style: TextStyle(
              color: textColor,
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          SizedBox(height: 12),
          if (_isLoadingMembers)
            Center(
              child: Padding(
                padding: EdgeInsets.all(20),
                child: CircularProgressIndicator(),
              ),
            )
          else if (_workspaceMembers.isEmpty)
            Center(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Text(
                  'calendar.no_workspace_members'.tr(),
                  style: TextStyle(
                    color: subtitleColor,
                    fontSize: 14,
                  ),
                ),
              ),
            )
          else
            ..._workspaceMembers.map((member) => _buildAttendeeMemberItem(member)),
          SizedBox(height: 24),

          // Reminders Section
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'calendar.reminders'.tr(),
                style: TextStyle(
                  color: textColor,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              TextButton.icon(
                onPressed: () {
                  setState(() {
                    _reminders.add({
                      'type': 'In App',
                      'minutes': 5,
                    });
                  });
                },
                icon: Icon(Icons.notifications_outlined, size: 18),
                label: Text('calendar.add_reminder'.tr()),
                style: TextButton.styleFrom(
                  foregroundColor: context.primaryColor,
                ),
              ),
            ],
          ),
          SizedBox(height: 12),
          ..._reminders.asMap().entries.map((entry) {
            final index = entry.key;
            final reminder = entry.value;
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                children: [
                  // Reminder Type Dropdown
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: surfaceColor,
                      border: Border.all(color: borderColor),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: DropdownButton<String>(
                      value: reminder['type'],
                      underline: SizedBox(),
                      style: TextStyle(color: textColor),
                      dropdownColor: surfaceColor,
                      items: [
                        DropdownMenuItem(value: 'In App', child: Text('calendar.reminder_in_app'.tr())),
                        DropdownMenuItem(value: 'Email', child: Text('calendar.reminder_email'.tr())),
                        DropdownMenuItem(value: 'SMS', child: Text('calendar.reminder_sms'.tr())),
                      ],
                      onChanged: (value) {
                        setState(() {
                          _reminders[index]['type'] = value;
                        });
                      },
                    ),
                  ),
                  SizedBox(width: 12),
                  // Minutes Input
                  SizedBox(
                    width: 80,
                    child: TextField(
                      controller: TextEditingController(text: reminder['minutes'].toString()),
                      keyboardType: TextInputType.number,
                      style: TextStyle(color: textColor),
                      textAlign: TextAlign.center,
                      decoration: InputDecoration(
                        filled: true,
                        fillColor: surfaceColor,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide: BorderSide(color: borderColor),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide: BorderSide(color: borderColor),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide: BorderSide(color: primaryColor),
                        ),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
                      ),
                      onChanged: (value) {
                        final minutes = int.tryParse(value);
                        if (minutes != null) {
                          setState(() {
                            _reminders[index]['minutes'] = minutes;
                          });
                        }
                      },
                    ),
                  ),
                  SizedBox(width: 12),
                  Text(
                    'calendar.minutes_before_label'.tr(),
                    style: TextStyle(color: subtitleColor),
                  ),
                  const Spacer(),
                  // Delete Button
                  IconButton(
                    icon: Icon(Icons.delete_outline, color: subtitleColor),
                    onPressed: () {
                      setState(() {
                        _reminders.removeAt(index);
                      });
                    },
                  ),
                ],
              ),
            );
          }).toList(),
          SizedBox(height: 24),

          // Recurrence Section
          Text(
            'calendar.recurrence'.tr(),
            style: TextStyle(
              color: textColor,
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          SizedBox(height: 8),
          Text(
            'calendar.recurrence_subtitle'.tr(),
            style: TextStyle(
              color: subtitleColor,
              fontSize: 14,
            ),
          ),
          SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              color: surfaceColor,
              border: Border.all(color: borderColor),
              borderRadius: BorderRadius.circular(8),
            ),
            child: DropdownButton<String>(
              value: _recurrencePattern,
              isExpanded: true,
              underline: SizedBox(),
              style: TextStyle(color: textColor),
              dropdownColor: surfaceColor,
              items: [
                DropdownMenuItem(value: 'none', child: Text('calendar.no_recurrence'.tr())),
                DropdownMenuItem(value: 'daily', child: Text('calendar.daily'.tr())),
                DropdownMenuItem(value: 'weekly', child: Text('calendar.weekly'.tr())),
                DropdownMenuItem(value: 'monthly', child: Text('calendar.monthly'.tr())),
                DropdownMenuItem(value: 'yearly', child: Text('calendar.yearly'.tr())),
                DropdownMenuItem(value: 'custom', child: Text('calendar.custom'.tr())),
              ],
              onChanged: (value) {
                if (value != null) {
                  setState(() => _recurrencePattern = value);
                }
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAttendeeMemberItem(WorkspaceMember member) {
    final isSelected = _attendees.contains(member.email);
    final displayName = member.name ?? member.email;
    final initial = displayName.isNotEmpty ? displayName[0].toUpperCase() : 'U';

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () {
          setState(() {
            if (isSelected) {
              _attendees.remove(member.email);
            } else {
              _attendees.add(member.email);
            }
          });
        },
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: borderColor,
            ),
          ),
          child: Row(
            children: [
              // Avatar
              if (member.avatar != null && member.avatar!.isNotEmpty)
                CircleAvatar(
                  radius: 20,
                  backgroundImage: NetworkImage(member.avatar!),
                  onBackgroundImageError: (_, __) {},
                  child: member.avatar == null
                      ? Text(
                          initial,
                          style: TextStyle(
                            color: primaryColor,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        )
                      : null,
                )
              else
                CircleAvatar(
                  radius: 20,
                  backgroundColor: primaryColor.withOpacity(0.2),
                  child: Text(
                    initial,
                    style: TextStyle(
                      color: primaryColor,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      displayName,
                      style: TextStyle(
                        color: textColor,
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    if (member.name != null && member.name!.isNotEmpty)
                      Text(
                        member.email,
                        style: TextStyle(
                          color: subtitleColor,
                          fontSize: 12,
                        ),
                      ),
                    Text(
                      _getRoleLabel(member.role.value),
                      style: TextStyle(
                        color: primaryColor,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              Checkbox(
                value: isSelected,
                onChanged: (value) {
                  setState(() {
                    if (value == true) {
                      _attendees.add(member.email);
                    } else {
                      _attendees.remove(member.email);
                    }
                  });
                },
                activeColor: primaryColor,
                checkColor: Colors.white,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAttachmentTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header with buttons
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'calendar.file_attachments'.tr(),
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: textColor,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'calendar.file_attachments_subtitle'.tr(),
                      style: TextStyle(
                        fontSize: 13,
                        color: subtitleColor,
                      ),
                    ),
                  ],
                ),
              ),
              SizedBox(width: 12),
              OutlinedButton.icon(
                onPressed: _showBrowseFilesDialog,
                icon: Icon(Icons.folder_open, size: 16),
                label: Text('calendar.browse_files'.tr(), style: TextStyle(fontSize: 13)),
                style: OutlinedButton.styleFrom(
                  foregroundColor: textColor,
                  side: BorderSide(color: borderColor),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                ),
              ),
              SizedBox(width: 8),
              ElevatedButton.icon(
                onPressed: () {
                  print('🟢 Upload Files button pressed! (Edit Screen)');
                  _pickFiles();
                },
                icon: Icon(Icons.upload, size: 16),
                label: Text('calendar.upload_files'.tr(), style: TextStyle(fontSize: 13)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: primaryColor,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  elevation: 0,
                ),
              ),
            ],
          ),
          SizedBox(height: 20),

          // Drop zone
          Container(
            padding: const EdgeInsets.all(40),
            decoration: BoxDecoration(
              border: Border.all(
                color: borderColor,
                width: 2,
                strokeAlign: BorderSide.strokeAlignInside,
              ),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              children: [
                Icon(
                  Icons.upload_file_outlined,
                  size: 48,
                  color: subtitleColor,
                ),
                SizedBox(height: 12),
                RichText(
                  text: TextSpan(
                    style: TextStyle(fontSize: 14, color: subtitleColor),
                    children: [
                      const TextSpan(text: 'Drop files here or click '),
                      TextSpan(
                        text: '"Upload Files"',
                        style: TextStyle(
                          color: primaryColor,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const TextSpan(text: ' to attach documents'),
                    ],
                  ),
                ),
                SizedBox(height: 8),
                Text(
                  'Supports images, documents, audio, video, and more',
                  style: TextStyle(
                    fontSize: 12,
                    color: subtitleColor.withValues(alpha: 0.7),
                  ),
                ),
              ],
            ),
          ),
          SizedBox(height: 24),

          // Attached files section
          Text(
            'Attached Files (${_attachedFiles.length})',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: textColor,
            ),
          ),
          SizedBox(height: 12),

          // Files list
          if (_attachedFiles.isEmpty)
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: surfaceColor,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: borderColor),
              ),
              child: Center(
                child: Text(
                  'calendar.no_files_attached'.tr(),
                  style: TextStyle(color: subtitleColor, fontSize: 13),
                ),
              ),
            )
          else
            ..._attachedFiles.map((file) => Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: surfaceColor,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: borderColor),
              ),
              child: Row(
                children: [
                  Icon(Icons.insert_drive_file_outlined, color: subtitleColor, size: 20),
                  SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          file['name'] ?? 'Unknown',
                          style: TextStyle(
                            color: textColor,
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        SizedBox(height: 2),
                        Text(
                          'Size ${file['size'] ?? 'unknown'}',
                          style: TextStyle(
                            color: subtitleColor,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: Icon(Icons.visibility_outlined, color: subtitleColor, size: 18),
                    onPressed: () {
                      // TODO: Preview file
                    },
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                  SizedBox(width: 12),
                  IconButton(
                    icon: Icon(Icons.close, color: subtitleColor, size: 18),
                    onPressed: () {
                      setState(() {
                        _attachedFiles.remove(file);
                      });
                    },
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ],
              ),
            )),

          SizedBox(height: 32),

          // Shared Notes section
          Text(
            'calendar.shared_notes'.tr(),
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: textColor,
            ),
          ),
          SizedBox(height: 4),
          Text(
            'calendar.shared_notes_subtitle'.tr(),
            style: TextStyle(
              fontSize: 13,
              color: subtitleColor,
            ),
          ),
          SizedBox(height: 16),

          // Browse Notes Button
          OutlinedButton.icon(
            onPressed: _showNotesSelectionDialog,
            icon: Icon(Icons.note_add, size: 18, color: primaryColor),
            label: Text('calendar.browse_notes'.tr(), style: TextStyle(color: primaryColor)),
            style: OutlinedButton.styleFrom(
              side: BorderSide(color: primaryColor),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            ),
          ),
          SizedBox(height: 16),

          // Selected notes list
          if (_selectedNotes.isNotEmpty) ...[
            ..._selectedNotes.map((note) => _buildSelectedNoteItem(note)),
          ] else ...[
            Container(
              padding: const EdgeInsets.all(40),
              decoration: BoxDecoration(
                color: surfaceColor,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: borderColor),
              ),
              child: Column(
                children: [
                  Icon(
                    Icons.note_outlined,
                    size: 48,
                    color: subtitleColor,
                  ),
                  SizedBox(height: 12),
                  Text(
                    'No notes have been attached yet.',
                    style: TextStyle(
                      fontSize: 14,
                      color: textColor,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Click "Browse Notes" to attach notes from your workspace.',
                    style: TextStyle(
                      fontSize: 12,
                      color: subtitleColor,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _loadNotesFromApi() async {
    final currentWorkspace = _workspaceService.currentWorkspace;
    if (currentWorkspace == null) return;

    setState(() {
      _isLoadingNotes = true;
    });

    try {
      // Manually call API with correct prefix
      final response = await BaseApiClient.instance.get(
        '/workspaces/${currentWorkspace.id}/notes',
        queryParameters: {'is_deleted': false},
      );

      final notes = (response.data as List)
          .map((json) => notes_api.Note.fromJson(json))
          .toList();

      setState(() {
        _availableNotesFromApi = notes;
        _isLoadingNotes = false;
      });
    } catch (e) {
      print('Error loading notes: $e');
      setState(() {
        _isLoadingNotes = false;
      });
    }
  }

  void _showNotesSelectionDialog() async {
    await _loadNotesFromApi();

    if (!mounted) return;

    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: surfaceColor,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: Container(
          constraints: BoxConstraints(
            maxWidth: 600,
            maxHeight: MediaQuery.of(context).size.height * 0.7,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header
              Padding(
                padding: const EdgeInsets.all(20),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'calendar.select_notes'.tr(),
                      style: TextStyle(
                        color: textColor,
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    IconButton(
                      icon: Icon(Icons.close, color: subtitleColor, size: 20),
                      onPressed: () => Navigator.pop(context),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),

              // Notes list
              Flexible(
                child: _isLoadingNotes
                    ? Center(child: CircularProgressIndicator())
                    : _availableNotesFromApi.isEmpty
                        ? Padding(
                            padding: const EdgeInsets.all(40),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.note_outlined, size: 48, color: subtitleColor),
                                SizedBox(height: 16),
                                Text(
                                  'calendar.no_notes_available'.tr(),
                                  style: TextStyle(color: textColor, fontSize: 16),
                                ),
                                SizedBox(height: 8),
                                Text(
                                  'Create notes in the Notes module first.',
                                  style: TextStyle(color: subtitleColor, fontSize: 14),
                                  textAlign: TextAlign.center,
                                ),
                              ],
                            ),
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.all(20),
                            itemCount: _availableNotesFromApi.length,
                            itemBuilder: (context, index) {
                              final note = _availableNotesFromApi[index];
                              final isSelected = _selectedNotes.any((n) => n.id == note.id);

                              return Container(
                                margin: const EdgeInsets.only(bottom: 12),
                                child: Material(
                                  color: Colors.transparent,
                                  child: InkWell(
                                    borderRadius: BorderRadius.circular(8),
                                    onTap: () {
                                      setState(() {
                                        if (isSelected) {
                                          _selectedNotes.removeWhere((n) => n.id == note.id);
                                        } else {
                                          _selectedNotes.add(note);
                                        }
                                      });
                                      Navigator.pop(context);
                                    },
                                    child: Container(
                                      padding: const EdgeInsets.all(16),
                                      decoration: BoxDecoration(
                                        color: isSelected
                                            ? primaryColor.withValues(alpha: 0.1)
                                            : backgroundColor,
                                        borderRadius: BorderRadius.circular(8),
                                        border: Border.all(
                                          color: isSelected ? primaryColor : borderColor,
                                          width: isSelected ? 2 : 1,
                                        ),
                                      ),
                                      child: Row(
                                        children: [
                                          Icon(
                                            isSelected ? Icons.check_circle : Icons.note_outlined,
                                            color: isSelected ? primaryColor : subtitleColor,
                                            size: 24,
                                          ),
                                          SizedBox(width: 12),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  note.title,
                                                  style: TextStyle(
                                                    color: textColor,
                                                    fontSize: 14,
                                                    fontWeight: FontWeight.w600,
                                                  ),
                                                  maxLines: 1,
                                                  overflow: TextOverflow.ellipsis,
                                                ),
                                                if (note.content != null && note.content!.isNotEmpty) ...[
                                                  SizedBox(height: 4),
                                                  Text(
                                                    note.content!,
                                                    style: TextStyle(
                                                      color: subtitleColor,
                                                      fontSize: 12,
                                                    ),
                                                    maxLines: 2,
                                                    overflow: TextOverflow.ellipsis,
                                                  ),
                                                ],
                                              ],
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSelectedNoteItem(notes_api.Note note) {
    final now = DateTime.now();
    final dateStr = '${now.day}/${now.month}/${now.year}';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: surfaceColor,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: borderColor),
      ),
      child: Row(
        children: [
          Icon(Icons.note, color: primaryColor, size: 24),
          SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  note.title,
                  style: TextStyle(
                    color: textColor,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                SizedBox(height: 4),
                Text(
                  'Attached on $dateStr',
                  style: TextStyle(
                    color: subtitleColor,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          SizedBox(width: 12),
          TextButton(
            onPressed: () {
              // Show note content dialog
              _showNoteContentDialog(note);
            },
            style: TextButton.styleFrom(
              foregroundColor: primaryColor,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            ),
            child: Text('calendar.view'.tr(), style: TextStyle(fontSize: 13)),
          ),
          IconButton(
            icon: Icon(Icons.close, color: subtitleColor, size: 20),
            onPressed: () {
              setState(() {
                _selectedNotes.removeWhere((n) => n.id == note.id);
              });
            },
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
          ),
        ],
      ),
    );
  }

  void _showNoteContentDialog(notes_api.Note note) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: surfaceColor,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: Container(
          constraints: BoxConstraints(
            maxWidth: 600,
            maxHeight: MediaQuery.of(context).size.height * 0.7,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header
              Padding(
                padding: const EdgeInsets.all(20),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        note.title,
                        style: TextStyle(
                          color: textColor,
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    IconButton(
                      icon: Icon(Icons.close, color: subtitleColor, size: 20),
                      onPressed: () => Navigator.pop(context),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),

              // Content
              Flexible(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: Text(
                    note.content ?? 'calendar.no_content'.tr(),
                    style: TextStyle(
                      color: textColor,
                      fontSize: 14,
                      height: 1.5,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _selectStartDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _startDate,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );
    if (date != null) {
      setState(() => _startDate = date);
    }
  }

  void _selectEndDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _endDate,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );
    if (date != null) {
      setState(() => _endDate = date);
    }
  }

  void _selectStartTime() async {
    final time = await showTimePicker(
      context: context,
      initialTime: _startTime,
    );
    if (time != null) {
      setState(() => _startTime = time);
    }
  }

  void _selectEndTime() async {
    final time = await showTimePicker(
      context: context,
      initialTime: _endTime,
    );
    if (time != null) {
      setState(() => _endTime = time);
    }
  }

  /// Show bottom sheet to browse and select workspace files
  void _showBrowseFilesDialog() async {
    // First, make sure files are loaded
    await _loadFilesForMention();

    if (!mounted) return;

    if (_availableFiles.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('calendar.no_files_in_workspace'.tr()),
          backgroundColor: Colors.orange,
          duration: const Duration(seconds: 3),
        ),
      );
      return;
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _buildFilesBrowserSheet(),
    );
  }

  Widget _buildFilesBrowserSheet() {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    final bgColor = isDarkMode ? Colors.grey[900] : Colors.white;
    final textColor = isDarkMode ? Colors.white : Colors.black87;
    final subtitleColor = isDarkMode ? Colors.grey[400] : Colors.grey[600];

    return StatefulBuilder(
      builder: (context, setSheetState) {
        // Filter out already attached files
        final availableToSelect = _availableFiles.where((file) {
          return !_attachedFiles.any((attached) => attached['id'] == file.id);
        }).toList();

        return Container(
          height: MediaQuery.of(context).size.height * 0.7,
          decoration: BoxDecoration(
            color: bgColor,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              // Handle bar
              Container(
                margin: const EdgeInsets.only(top: 12),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[400],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              // Header
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'calendar.select_files_workspace'.tr(),
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                        color: textColor,
                      ),
                    ),
                    IconButton(
                      icon: Icon(Icons.close, color: subtitleColor),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),
              // File list
              Expanded(
                child: availableToSelect.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.check_circle_outline,
                              size: 64,
                              color: Colors.green.withOpacity(0.5),
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'calendar.all_files_attached'.tr(),
                              style: TextStyle(
                                color: subtitleColor,
                                fontSize: 16,
                              ),
                            ),
                          ],
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: availableToSelect.length,
                        separatorBuilder: (context, index) => const SizedBox(height: 8),
                        itemBuilder: (context, index) {
                          final file = availableToSelect[index];
                          return _buildFileItem(file, textColor, subtitleColor, setSheetState);
                        },
                      ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildFileItem(file_model.File file, Color textColor, Color? subtitleColor, StateSetter setSheetState) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    // Get file icon based on mime type
    IconData fileIcon = Icons.insert_drive_file;
    Color iconColor = Colors.blue;

    if (file.mimeType != null) {
      if (file.mimeType!.startsWith('image/')) {
        fileIcon = Icons.image;
        iconColor = Colors.green;
      } else if (file.mimeType!.startsWith('video/')) {
        fileIcon = Icons.video_file;
        iconColor = Colors.purple;
      } else if (file.mimeType!.startsWith('audio/')) {
        fileIcon = Icons.audio_file;
        iconColor = Colors.orange;
      } else if (file.mimeType!.contains('pdf')) {
        fileIcon = Icons.picture_as_pdf;
        iconColor = Colors.red;
      } else if (file.mimeType!.contains('word') || file.mimeType!.contains('document')) {
        fileIcon = Icons.description;
        iconColor = Colors.blue;
      } else if (file.mimeType!.contains('sheet') || file.mimeType!.contains('excel')) {
        fileIcon = Icons.table_chart;
        iconColor = Colors.green;
      } else if (file.mimeType!.contains('presentation') || file.mimeType!.contains('powerpoint')) {
        fileIcon = Icons.slideshow;
        iconColor = Colors.orange;
      } else if (file.mimeType!.contains('zip') || file.mimeType!.contains('archive')) {
        fileIcon = Icons.folder_zip;
        iconColor = Colors.amber;
      }
    }

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () {
          // Add file to _attachedFiles
          setState(() {
            _attachedFiles.add({
              'id': file.id,
              'name': file.name,
              'type': 'file',
              'size': _formatFileSize(file.size),
              'storage_path': file.storagePath,
              'mime_type': file.mimeType,
              'url': file.url,
            });
          });

          // Update the sheet state to reflect the change
          setSheetState(() {});

          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('calendar.added_file'.tr(args: [file.name])),
              backgroundColor: Colors.green,
              duration: const Duration(seconds: 1),
            ),
          );
        },
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: isDarkMode ? Colors.grey[850] : Colors.grey[50],
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isDarkMode ? Colors.grey[700]! : Colors.grey[200]!,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: iconColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(fileIcon, color: iconColor, size: 24),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      file.name,
                      style: TextStyle(
                        color: textColor,
                        fontWeight: FontWeight.w500,
                        fontSize: 14,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _formatFileSize(file.size),
                      style: TextStyle(
                        color: subtitleColor,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.add_circle_outline,
                color: context.primaryColor,
                size: 24,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _pickFiles() async {
    print('🔵 _pickFiles called (Edit Screen)');
    try {
      final currentWorkspace = _workspaceService.currentWorkspace;
      print('🔵 Current workspace: ${currentWorkspace?.id}');

      if (currentWorkspace == null) {
        print('🔴 No workspace selected');
        throw Exception('No workspace selected');
      }

      print('🔵 Opening file picker...');
      FilePickerResult? result = await FilePicker.platform.pickFiles(
        allowMultiple: true,
        type: FileType.any,
      );

      print('🔵 File picker result: ${result != null ? '${result.files.length} files selected' : 'null (cancelled)'}');

      if (result != null) {
        // Show uploading indicator
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('calendar.uploading_files'.tr(args: [result.files.length.toString()])),
            duration: const Duration(seconds: 2),
          ),
        );

        int successCount = 0;
        int failCount = 0;

        for (var file in result.files) {
          print('🔵 Processing file: ${file.name}, has bytes: ${file.bytes != null}, path: ${file.path}');

          // Get file bytes - either from bytes (web) or read from path (mobile)
          List<int>? fileBytes;
          if (file.bytes != null) {
            print('🔵 Using bytes from file picker');
            fileBytes = file.bytes;
          } else if (file.path != null) {
            print('🔵 Reading file from path: ${file.path}');
            try {
              final fileData = await File(file.path!).readAsBytes();
              fileBytes = fileData;
              print('🔵 Successfully read ${fileBytes.length} bytes from file');
            } catch (e) {
              print('🔴 Failed to read file from path: $e');
              failCount++;
              continue;
            }
          } else {
            print('🔴 File has no bytes and no path: ${file.name}');
            failCount++;
            continue;
          }

          // Upload file to storage API
          debugPrint('Uploading file: ${file.name}, extension: ${file.extension}, size: ${file.size}');

          // Determine MIME type based on extension
          String? mimeType;
          if (file.extension != null) {
            final ext = file.extension!.toLowerCase();
            if (['jpg', 'jpeg'].contains(ext)) {
              mimeType = 'image/jpeg';
            } else if (ext == 'png') {
              mimeType = 'image/png';
            } else if (ext == 'gif') {
              mimeType = 'image/gif';
            } else if (ext == 'pdf') {
              mimeType = 'application/pdf';
            } else if (['doc', 'docx'].contains(ext)) {
              mimeType = 'application/msword';
            } else if (['xls', 'xlsx'].contains(ext)) {
              mimeType = 'application/vnd.ms-excel';
            } else if (ext == 'zip') {
              mimeType = 'application/zip';
            } else {
              mimeType = 'application/octet-stream';
            }
          }

          final uploadResponse = await _storageApi.uploadFile(
            workspaceId: currentWorkspace.id,
            fileName: file.name,
            fileBytes: fileBytes,
            mimeType: mimeType,
          );

          if (uploadResponse.isSuccess && uploadResponse.data != null) {
            // Format file size
            String fileSize = 'unknown';
            if (file.size > 0) {
              final sizeInKB = file.size / 1024;
              if (sizeInKB < 1024) {
                fileSize = '${sizeInKB.toStringAsFixed(2)} KB';
              } else {
                final sizeInMB = sizeInKB / 1024;
                fileSize = '${sizeInMB.toStringAsFixed(2)} MB';
              }
            }

            setState(() {
              _attachedFiles.add({
                'id': uploadResponse.data!.id,
                'name': file.name,
                'size': fileSize,
                'storage_path': uploadResponse.data!.storagePath,
                'mime_type': uploadResponse.data!.mimeType,
                'url': uploadResponse.data!.storagePath,
              });
            });
            successCount++;
          } else {
            failCount++;
            debugPrint('Failed to upload ${file.name}: ${uploadResponse.message}');
          }
        }

        // Show result message
        if (!mounted) return;
        if (successCount > 0) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('calendar.upload_success'.tr(args: [successCount.toString(), failCount > 0 ? ' ($failCount failed)' : ''])),
              backgroundColor: failCount > 0 ? Colors.orange : Colors.green,
              duration: const Duration(seconds: 3),
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('calendar.upload_failed'.tr()),
              backgroundColor: Colors.red,
            ),
          );
        }
      } else {
        print('🟡 File picker was cancelled by user');
      }
    } catch (e, stackTrace) {
      print('🔴 Exception in _pickFiles: $e');
      print('🔴 Stack trace: $stackTrace');

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('calendar.pick_files_failed'.tr(args: [e.toString()])),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _deleteEvent() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: surfaceColor,
        title: Text(
          'calendar.delete_event'.tr(),
          style: TextStyle(color: textColor),
        ),
        content: Text(
          'calendar.delete_event_confirm'.tr(),
          style: TextStyle(color: subtitleColor),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(
              'common.cancel'.tr(),
              style: TextStyle(color: subtitleColor),
            ),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(
              'common.delete'.tr(),
              style: TextStyle(color: Colors.red),
            ),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    setState(() {
      _isDeleting = true;
    });

    try {
      final currentWorkspace = _workspaceService.currentWorkspace;
      if (currentWorkspace == null) {
        throw Exception('No workspace selected');
      }

      if (widget.event.id == null) {
        throw Exception('Event ID is null');
      }

      final response = await _calendarApi.deleteEvent(
        currentWorkspace.id,
        widget.event.id!,
      );

      if (!mounted) return;

      if (response.isSuccess) {
        Navigator.pop(context); // Close edit screen
        widget.onEventDeleted();

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('calendar.event_deleted'.tr(args: [widget.event.title])),
            backgroundColor: Colors.red,
          ),
        );
      } else {
        throw Exception(response.message ?? 'Failed to delete event');
      }
    } catch (e) {
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('errors.something_went_wrong'.tr()),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isDeleting = false;
        });
      }
    }
  }

  /// Duplicate the current event
  Future<void> _duplicateEvent() async {
    setState(() {
      _isDuplicating = true;
    });

    try {
      final currentWorkspace = _workspaceService.currentWorkspace;
      if (currentWorkspace == null) {
        throw Exception('No workspace selected');
      }

      if (widget.event.id == null) {
        throw Exception('Event ID is null');
      }

      final response = await _calendarApi.duplicateEvent(
        currentWorkspace.id,
        widget.event.id!,
      );

      if (!mounted) return;

      if (response.isSuccess && response.data != null) {
        // Convert API event to local CalendarEvent model
        final duplicatedEvent = CalendarEvent(
          id: response.data!.id,
          workspaceId: response.data!.workspaceId,
          title: response.data!.title,
          description: response.data!.description,
          startTime: response.data!.startTime,
          endTime: response.data!.endTime,
          categoryId: response.data!.categoryId,
          location: response.data!.location,
          allDay: response.data!.isAllDay,
          organizerId: response.data!.organizerId,
          roomId: response.data!.meetingRoomId,
          meetingUrl: response.data!.meetingUrl,
        );

        Navigator.pop(context); // Close current edit screen
        widget.onEventUpdated(duplicatedEvent); // Refresh calendar with new event

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('calendar.event_duplicated'.tr(args: [widget.event.title])),
            backgroundColor: Colors.green,
          ),
        );
      } else {
        throw Exception(response.message ?? 'Failed to duplicate event');
      }
    } catch (e) {
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('calendar.failed_to_duplicate'.tr()),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isDuplicating = false;
        });
      }
    }
  }

  Future<void> _updateEvent() async {
    // Validate required fields
    bool hasError = false;

    // Check title
    if (_titleController.text.trim().isEmpty) {
      setState(() {
        _titleError = true;
      });
      hasError = true;
    } else {
      setState(() {
        _titleError = false;
      });
    }

    // Check category
    if (_selectedCategoryId == null || _selectedCategoryId!.isEmpty) {
      setState(() {
        _categoryError = true;
      });
      hasError = true;
    } else {
      setState(() {
        _categoryError = false;
      });
    }

    // Check priority
    if (_priority.isEmpty) {
      setState(() {
        _priorityError = true;
      });
      hasError = true;
    } else {
      setState(() {
        _priorityError = false;
      });
    }

    if (hasError) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('calendar.fill_required_fields'.tr(args: [''])),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final currentWorkspace = _workspaceService.currentWorkspace;
      if (currentWorkspace == null) {
        throw Exception('No workspace selected');
      }

      if (widget.event.id == null) {
        throw Exception('Event ID is null');
      }

      final startDateTime = DateTime(
        _startDate.year,
        _startDate.month,
        _startDate.day,
        _startTime.hour,
        _startTime.minute,
      );

      final endDateTime = DateTime(
        _endDate.year,
        _endDate.month,
        _endDate.day,
        _endTime.hour,
        _endTime.minute,
      );

      // Validate dates
      if (endDateTime.isBefore(startDateTime)) {
        throw Exception('End time must be after start time');
      }

      // Build unified attachments object - combine manual attachments with description mentions
      // This matches the web implementation where both are combined into single attachments object
      final fileIds = <String>[];
      final noteIds = <String>[];
      final eventIds = <String>[];

      // Add manual attachments (from attachment tab)
      for (final attachment in _attachedFiles) {
        final id = attachment['id'] as String?;
        final type = attachment['type'] as String?;
        if (id != null && type != null) {
          switch (type) {
            case 'file':
              fileIds.add(id);
              break;
            case 'note':
              noteIds.add(id);
              break;
            case 'event':
              eventIds.add(id);
              break;
          }
        }
      }

      // Add description attachments (from / mentions in description)
      for (final attachment in _descriptionAttachments) {
        final id = attachment['id'] as String?;
        final type = attachment['type'] as String?;
        if (id != null && type != null) {
          switch (type) {
            case 'file':
              if (!fileIds.contains(id)) fileIds.add(id);
              break;
            case 'note':
              if (!noteIds.contains(id)) noteIds.add(id);
              break;
            case 'event':
              if (!eventIds.contains(id)) eventIds.add(id);
              break;
          }
        }
      }

      // Create unified attachments object if there are any attachments
      api.EventAttachments? eventAttachments;
      if (fileIds.isNotEmpty || noteIds.isNotEmpty || eventIds.isNotEmpty) {
        eventAttachments = api.EventAttachments(
          fileAttachment: fileIds,
          noteAttachment: noteIds,
          eventAttachment: eventIds,
        );
        debugPrint('📎 Unified attachments - files: $fileIds, notes: $noteIds, events: $eventIds');
      }

      // Format reminders - backend expects array of minutes only (e.g., [5, 15, 60])
      List<int>? formattedReminders;
      if (_reminders.isNotEmpty) {
        formattedReminders = _reminders
            .map((reminder) => (reminder['minutes'] as num?)?.toInt() ?? 5)
            .toList();
      }

      final updateDto = api.UpdateEventDto(
        title: _titleController.text.trim(),
        description: descriptionController.document.toPlainText().trim().isEmpty
            ? null
            : _getDescriptionAsHtml(),
        startTime: startDateTime,
        endTime: endDateTime,
        location: _locationController.text.trim().isEmpty
            ? null
            : _locationController.text.trim(),
        allDay: _isAllDay,
        categoryId: _selectedCategoryId,
        roomId: _selectedMeetingRoomId,
        attendees: _attendees.isNotEmpty ? _attendees : null,
        attachments: eventAttachments,
        // Note: descriptionFileIds is no longer sent separately - all attachments are unified in the attachments object
        reminders: formattedReminders,
        priority: _priority.toLowerCase(),
        visibility: _isPrivate ? 'private' : 'public',
        status: 'confirmed',
        meetingUrl: _meetingUrlController.text.trim().isEmpty
            ? null
            : _meetingUrlController.text.trim(),
      );

      final response = await _calendarApi.updateEvent(
        currentWorkspace.id,
        widget.event.id!,
        updateDto,
      );

      if (!mounted) return;

      if (response.isSuccess && response.data != null) {
        // Convert API event to local CalendarEvent model
        final updatedEvent = CalendarEvent(
          id: response.data!.id,
          workspaceId: response.data!.workspaceId,
          title: response.data!.title,
          description: response.data!.description,
          startTime: response.data!.startTime,
          endTime: response.data!.endTime,
          categoryId: response.data!.categoryId,
          location: response.data!.location,
          allDay: response.data!.isAllDay,
          organizerId: response.data!.organizerId,
          roomId: response.data!.meetingRoomId,
          meetingUrl: response.data!.meetingUrl,
        );

        widget.onEventUpdated(updatedEvent);
        Navigator.pop(context);

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('calendar.event_updated'.tr()),
            backgroundColor: context.primaryColor,
          ),
        );
      } else {
        throw Exception(response.message ?? 'Failed to update event');
      }
    } catch (e) {
      if (!mounted) return;

      final errorMessage = extractErrorMessage(e, fallback: 'Failed to update event');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(errorMessage),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _generateAIDescriptions() async {
    // Check if title is empty
    if (_titleController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('calendar.enter_title_first'.tr()),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    // Start breathing animation and border animation
    setState(() {
      _isGeneratingAI = true;
    });
    _animationController.repeat(reverse: true);
    _borderAnimationController.repeat();

    try {
      // Call AI API
      final response = await _aiService.generateEventDescriptions(
        _titleController.text.trim(),
      );

      // Stop breathing animation and border animation
      _animationController.stop();
      _borderAnimationController.stop();
      setState(() {
        _isGeneratingAI = false;
      });

      if (response.success && response.data != null) {
        // Parse descriptions
        final fullText = response.data!.generatedText;
        List<String> descriptions = [];

        // Try splitting by ---
        if (fullText.contains('---')) {
          descriptions = fullText
              .split('---')
              .map((d) => d.trim())
              .where((d) => d.isNotEmpty)
              .toList();
        }
        // If no --- separators, try splitting by **Event Description N:** or **Description N:**
        else if (fullText.contains('**Event Description') || fullText.contains('**Description')) {
          final pattern = RegExp(
            r'\*\*(?:Event )?Description \d+:\*\*\s*(.+?)(?=\*\*(?:Event )?Description \d+:\*\*|$)',
            dotAll: true,
          );
          final matches = pattern.allMatches(fullText);
          descriptions = matches
              .map((m) => m.group(1)?.trim() ?? '')
              .where((d) => d.isNotEmpty)
              .toList();
        }
        // Try splitting by numbered list (1., 2., 3.) - improved regex
        else if (fullText.contains(RegExp(r'^\d+[\.\)]\s', multiLine: true))) {
          final pattern = RegExp(r'^\d+[\.\)]\s*(.+?)(?=^\d+[\.\)]\s|$)', dotAll: true, multiLine: true);
          final matches = pattern.allMatches(fullText);
          descriptions = matches
              .map((m) => m.group(1)?.trim() ?? '')
              .where((d) => d.isNotEmpty)
              .toList();
        }
        // Try splitting by "Option N:" or "Description N:" headers
        else if (fullText.contains(RegExp(r'(?:Option|Description)\s*\d+:', caseSensitive: false))) {
          final pattern = RegExp(
            r'(?:Option|Description)\s*\d+:\s*(.+?)(?=(?:Option|Description)\s*\d+:|$)',
            dotAll: true,
            caseSensitive: false,
          );
          final matches = pattern.allMatches(fullText);
          descriptions = matches
              .map((m) => m.group(1)?.trim() ?? '')
              .where((d) => d.isNotEmpty)
              .toList();
        }
        // Otherwise use the whole text as one description
        else {
          descriptions = [fullText];
        }

        // Backend handles sanitization - just filter empty descriptions
        descriptions = descriptions.map((d) => d.trim()).where((d) => d.isNotEmpty).toList();

        if (descriptions.isEmpty) {
          throw Exception('No descriptions generated');
        }

        // Show selection dialog
        if (mounted) {
          _showDescriptionSelectionDialog(descriptions);
        }
      } else {
        throw Exception(response.error ?? 'Failed to generate descriptions');
      }
    } catch (e) {
      // Stop animation on error
      _animationController.stop();
      _borderAnimationController.stop();
      setState(() {
        _isGeneratingAI = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('calendar.error_generating_descriptions'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _showDescriptionSelectionDialog(List<String> descriptions) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: surfaceColor,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: Container(
          constraints: BoxConstraints(
            maxWidth: 500,
            maxHeight: MediaQuery.of(context).size.height * 0.7,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Padding(
                padding: const EdgeInsets.all(20),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'calendar.select_description'.tr(),
                      style: TextStyle(
                        color: textColor,
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    IconButton(
                      icon: Icon(Icons.close, color: subtitleColor, size: 20),
                      onPressed: () => Navigator.pop(context),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),

              // Scrollable list of options
              Flexible(
                child: ListView.separated(
                  shrinkWrap: true,
                  padding: const EdgeInsets.all(20),
                  itemCount: descriptions.length,
                  separatorBuilder: (context, index) => SizedBox(height: 16),
                  itemBuilder: (context, index) {
                    return Material(
                      color: Colors.transparent,
                      child: InkWell(
                        borderRadius: BorderRadius.circular(12),
                        onTap: () {
                          setState(() {
                            // Clear current content and insert new description
                            final length = descriptionController.document.length - 1;
                            descriptionController.replaceText(
                              0,
                              length,
                              descriptions[index],
                              TextSelection.collapsed(offset: descriptions[index].length),
                            );
                          });
                          Navigator.pop(context);
                        },
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: backgroundColor,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: borderColor.withValues(alpha: 0.5),
                              width: 1.5,
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 10,
                                      vertical: 6,
                                    ),
                                    decoration: BoxDecoration(
                                      color: context.primaryColor
                                          .withValues(alpha: 0.1),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      'calendar.option_number'.tr(args: ['${index + 1}']),
                                      style: TextStyle(
                                        color: context.primaryColor,
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              SizedBox(height: 12),
                              Text(
                                descriptions[index],
                                style: TextStyle(
                                  color: textColor,
                                  fontSize: 14,
                                  height: 1.5,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _getRoleLabel(String role) {
    switch (role.toLowerCase()) {
      case 'owner':
        return 'calendar.owner'.tr();
      case 'member':
        return 'calendar.member'.tr();
      default:
        return role.toUpperCase();
    }
  }
}