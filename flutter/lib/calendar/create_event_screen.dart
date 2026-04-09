import 'dart:io';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter_quill/flutter_quill.dart';
import 'package:vsc_quill_delta_to_html/vsc_quill_delta_to_html.dart';
import 'package:easy_localization/easy_localization.dart';
import '../models/calendar_event.dart';
import '../api/services/calendar_api_service.dart' as api;
import '../api/services/ai_api_service.dart';
import '../api/services/notes_api_service.dart' as notes_api;
import '../api/services/storage_api_service.dart';
import '../api/services/workspace_api_service.dart';
import '../api/services/bot_api_service.dart';
import '../api/base_api_client.dart';
import '../services/workspace_service.dart';
import '../services/file_service.dart';
import '../models/file/file.dart' as file_model;
import '../theme/app_theme.dart';
import '../widgets/mention_suggestion_widget.dart';
import '../widgets/attachment_display_widget.dart';
import '../widgets/attachment_preview_dialogs.dart';
import '../widgets/ai_description_button.dart';
import '../widgets/google_drive_multi_picker.dart';
import '../apps/services/google_drive_service.dart';

class CreateEventScreen extends StatefulWidget {
  final Function(CalendarEvent) onEventCreated;

  /// Optional initial values for pre-filling the form
  final String? initialTitle;
  final String? initialDescription;
  final DateTime? initialStartDate;
  final DateTime? initialEndDate;
  final String? initialLocation;

  const CreateEventScreen({
    super.key,
    required this.onEventCreated,
    this.initialTitle,
    this.initialDescription,
    this.initialStartDate,
    this.initialEndDate,
    this.initialLocation,
  });

  @override
  State<CreateEventScreen> createState() => _CreateEventScreenState();
}

class _CreateEventScreenState extends State<CreateEventScreen> with TickerProviderStateMixin {
  // Services
  final api.CalendarApiService _calendarApi = api.CalendarApiService();
  final AIApiService _aiService = AIApiService();
  final notes_api.NotesApiService _notesApi = notes_api.NotesApiService();
  final WorkspaceApiService _workspaceApi = WorkspaceApiService();
  final StorageApiService _storageApi = StorageApiService();
  final BotApiService _botApi = BotApiService();
  final WorkspaceService _workspaceService = WorkspaceService.instance;
  final FileService _fileService = FileService.instance;

  // Controllers
  final titleController = TextEditingController();
  late QuillController descriptionController;
  final ScrollController descriptionScrollController = ScrollController();
  final locationController = TextEditingController();
  final meetingUrlController = TextEditingController();
  final titleFocusNode = FocusNode();
  final descriptionFocusNode = FocusNode();

  // State variables
  DateTime startDate = DateTime.now();
  TimeOfDay startTime = TimeOfDay(hour: 9, minute: 0);
  DateTime endDate = DateTime.now();
  TimeOfDay endTime = TimeOfDay(hour: 10, minute: 0);

  String? selectedCategoryId;
  String? selectedMeetingRoomId;
  String selectedPriority = 'normal';
  bool isAllDay = false;
  bool isPrivate = false;
  int selectedTab = 0;
  List<String> filteredSuggestions = [];
  bool showSuggestions = false;

  // API Data
  List<api.EventCategory> _categories = [];
  List<api.MeetingRoom> _meetingRooms = [];
  Map<String, List<api.RoomBooking>> _roomBookings = {}; // roomId -> bookings
  List<WorkspaceMember> _workspaceMembers = [];
  bool _isLoadingCategories = false;
  bool _isLoadingRooms = false;
  bool _isLoadingMembers = false;
  bool _isCreatingEvent = false;

  // Validation error states
  bool _titleError = false;
  bool _categoryError = false;
  bool _priorityError = false;

  // Advanced tab - Attendees, Reminders, Recurrence, Bot Assignment
  List<String> attendees = [];

  // Bot Assignment
  List<Bot> _availableBots = [];
  String? _selectedBotId;
  bool _isLoadingBots = false;

  List<Map<String, dynamic>> reminders = [];

  String recurrencePattern = 'none';
  
  // Notes integration (/ mention) - using API notes for UUID IDs
  List<notes_api.Note> _availableNotesForMention = [];
  List<CalendarEvent> _availableEvents = [];
  List<file_model.File> _availableFiles = [];
  bool _showMentionSuggestions = false;
  int _slashSymbolPosition = -1;
  
  // AI Suggestions
  bool _isGeneratingAI = false;
  late AnimationController _animationController;
  late Animation<double> _animation;
  late AnimationController _borderAnimationController;
  late Animation<double> _borderAnimation;

  // Attachments
  List<Map<String, dynamic>> attachedFiles = []; // Regular attachments (from attachment section)
  List<Map<String, dynamic>> descriptionAttachments = []; // Attachments from / mention in description
  List<Map<String, dynamic>> driveAttachments = []; // Google Drive attachments

  // Google Drive
  bool _isDriveConnected = false;
  bool _isCheckingDriveConnection = false;

  // Notes from API
  List<notes_api.Note> _availableNotesForMentionFromApi = [];
  List<notes_api.Note> _selectedNotes = [];
  bool _isLoadingNotes = false;

  final List<String> priorities = ['low', 'normal', 'high', 'urgent'];
  final List<String> priorityLabels = ['Low', 'Normal', 'High', 'Urgent'];
  List<String> get tabs => [
    'calendar.tab_details'.tr(),
    'calendar.tab_advanced'.tr(),
    'calendar.tab_attachment'.tr(),
  ];
  
  // Common event title suggestions
  final List<String> commonEventTitles = [
    'Team Meeting',
    'One-on-One',
    'Client Call',
    'Project Review',
    'Standup',
    'Sprint Planning',
    'Retrospective',
    'Presentation',
    'Workshop',
    'Training Session',
    'Interview',
    'Lunch',
    'Coffee Chat',
    'Brainstorming',
    'Demo',
  ];
  
  // Theme-aware color getters
  Color get backgroundColor => Theme.of(context).brightness == Brightness.dark 
      ? const Color(0xFF1A1A1A) 
      : Colors.grey[50]!;
      
  Color get surfaceColor => Theme.of(context).brightness == Brightness.dark 
      ? const Color(0xFF2A2A2A) 
      : Colors.white;
      
  Color get textColor => Theme.of(context).brightness == Brightness.dark 
      ? Colors.white 
      : Colors.black87;
      
  Color get subtitleColor => Theme.of(context).brightness == Brightness.dark 
      ? Colors.grey[600]! 
      : Colors.grey[700]!;
      
  Color get borderColor => Theme.of(context).brightness == Brightness.dark 
      ? Colors.grey[700]! 
      : Colors.grey[300]!;
      
  Color get tabBackgroundColor => Theme.of(context).brightness == Brightness.dark 
      ? const Color(0xFF2A2A2A) 
      : Colors.grey[100]!;
      
  Color get selectedTabColor => Theme.of(context).brightness == Brightness.dark 
      ? const Color(0xFF3A3A3A) 
      : Colors.white;
      
  Color get primaryColor => context.primaryColor;

  /// Initialize default date/time to ensure start time is always in the future
  void _initializeDefaultDateTime() {
    final now = DateTime.now();

    // Calculate default start time (round up to next full hour, minimum 5 minutes from now)
    int defaultStartHour;
    int defaultStartMinute = 0;

    if (now.hour < 9) {
      // Before 9 AM: default to 9:00 AM today
      defaultStartHour = 9;
    } else if (now.hour >= 23) {
      // After 11 PM: default to 9:00 AM tomorrow
      startDate = now.add(const Duration(days: 1));
      endDate = now.add(const Duration(days: 1));
      defaultStartHour = 9;
    } else {
      // During the day: round up to next full hour
      defaultStartHour = now.hour + 1;
    }

    startTime = TimeOfDay(hour: defaultStartHour, minute: defaultStartMinute);

    // End time is 1 hour after start time
    int endHour = defaultStartHour + 1;
    if (endHour >= 24) {
      // If end time would be next day, adjust
      endDate = startDate.add(const Duration(days: 1));
      endHour = 0;
    }
    endTime = TimeOfDay(hour: endHour, minute: defaultStartMinute);
  }

  /// Initialize date/time from initial values provided (e.g., from travel ticket)
  void _initializeFromInitialValues() {
    final now = DateTime.now();

    if (widget.initialStartDate != null) {
      startDate = widget.initialStartDate!;
      startTime = TimeOfDay(
        hour: widget.initialStartDate!.hour,
        minute: widget.initialStartDate!.minute,
      );
    } else {
      startDate = now;
      startTime = TimeOfDay(hour: now.hour + 1, minute: 0);
    }

    if (widget.initialEndDate != null) {
      endDate = widget.initialEndDate!;
      endTime = TimeOfDay(
        hour: widget.initialEndDate!.hour,
        minute: widget.initialEndDate!.minute,
      );
    } else {
      // Default to 2 hours after start
      final endDateTime = DateTime(
        startDate.year,
        startDate.month,
        startDate.day,
        startTime.hour,
        startTime.minute,
      ).add(const Duration(hours: 2));

      endDate = endDateTime;
      endTime = TimeOfDay(
        hour: endDateTime.hour,
        minute: endDateTime.minute,
      );
    }
  }

  @override
  void initState() {
    super.initState();

    // Initialize smart default date/time (always in the future)
    // or use initial values if provided
    if (widget.initialStartDate != null || widget.initialEndDate != null) {
      _initializeFromInitialValues();
    } else {
      _initializeDefaultDateTime();
    }

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

    // Initialize QuillController for description
    // with initial description if provided
    if (widget.initialDescription != null && widget.initialDescription!.isNotEmpty) {
      descriptionController = QuillController(
        document: Document()..insert(0, widget.initialDescription!),
        selection: const TextSelection.collapsed(offset: 0),
      );
    } else {
      descriptionController = QuillController.basic();
    }

    // Set initial title if provided
    if (widget.initialTitle != null && widget.initialTitle!.isNotEmpty) {
      titleController.text = widget.initialTitle!;
    }

    // Set initial location if provided
    if (widget.initialLocation != null && widget.initialLocation!.isNotEmpty) {
      locationController.text = widget.initialLocation!;
    }

    // Listen to title changes to filter suggestions
    titleController.addListener(_filterSuggestions);
    // Listen to focus changes
    titleFocusNode.addListener(_onFocusChange);
    // Listen to description changes for / mentions
    descriptionController.addListener(_onDescriptionChange);
    // Initialize with all suggestions
    filteredSuggestions = List.from(commonEventTitles);
    // Load notes from API for / mentions (ensures UUID IDs)
    _loadNotesForMentions();
    // Load categories and meeting rooms from API
    _loadCategories();
    _loadMeetingRooms();
    // Load workspace members for attendees dropdown
    _loadWorkspaceMembers();
    // Load available bots for event assignment
    _loadAvailableBots();
    // Check Google Drive connection
    _checkGoogleDriveConnection();
  }

  /// Check if Google Drive is connected
  Future<void> _checkGoogleDriveConnection() async {
    setState(() => _isCheckingDriveConnection = true);
    try {
      final connection = await GoogleDriveService.instance.getConnection();
      if (mounted) {
        setState(() {
          _isDriveConnected = connection != null && connection.isActive;
          _isCheckingDriveConnection = false;
        });
      }
    } catch (e) {
      debugPrint('Error checking Google Drive connection: $e');
      if (mounted) {
        setState(() {
          _isDriveConnected = false;
          _isCheckingDriveConnection = false;
        });
      }
    }
  }

  /// Open Google Drive picker and handle selected files
  Future<void> _openGoogleDrivePicker() async {
    final selectedFiles = await GoogleDriveMultiPicker.show(
      context: context,
      title: 'calendar.import_from_drive'.tr(),
    );

    if (selectedFiles != null && selectedFiles.isNotEmpty) {
      setState(() {
        for (final file in selectedFiles) {
          // Avoid duplicates
          final alreadyAdded = driveAttachments.any((a) => a['id'] == file.id);
          if (!alreadyAdded) {
            driveAttachments.add(file.toMap());
          }
        }
      });
      debugPrint('Added ${selectedFiles.length} files from Google Drive');
    }
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
          if (selectedCategoryId != null &&
              !_categories.any((c) => c.id == selectedCategoryId)) {
            selectedCategoryId = null;
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
      setState(() => _isLoadingCategories = false);
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
        final rooms = response.data!;

        // Show rooms immediately
        setState(() {
          _meetingRooms = rooms;
          _roomBookings = {}; // Start with empty bookings
        });

        // Fetch bookings for all rooms in parallel
        final bookingsFutures = rooms.map((room) async {
          try {
            final bookingsResponse = await _calendarApi.getRoomBookings(
              currentWorkspace.id,
              room.id,
            );

            if (bookingsResponse.isSuccess && bookingsResponse.data != null) {
              return MapEntry(room.id, bookingsResponse.data!);
            } else {
              return MapEntry(room.id, <api.RoomBooking>[]);
            }
          } catch (e) {
            return MapEntry(room.id, <api.RoomBooking>[]);
          }
        });

        final bookingsEntries = await Future.wait(bookingsFutures);
        final bookingsMap = Map.fromEntries(bookingsEntries);

        setState(() {
          _roomBookings = bookingsMap;
          _isLoadingRooms = false;
          // Validate selected meeting room still exists and is available
          if (selectedMeetingRoomId != null) {
            final roomExists = _meetingRooms.any((r) => r.id == selectedMeetingRoomId);
            if (!roomExists) {
              selectedMeetingRoomId = null;
            } else {
              // Check if still available
              final roomStatus = _getRoomStatus(selectedMeetingRoomId!);
              if (!(roomStatus['isAvailable'] as bool)) {
                selectedMeetingRoomId = null; // Clear if no longer available
              }
            }
          }
        });
        debugPrint('📍 Loaded ${_meetingRooms.length} meeting rooms with bookings');
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

  /// Load workspace members for attendees dropdown
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

  /// Load available bots for event assignment
  Future<void> _loadAvailableBots() async {
    setState(() => _isLoadingBots = true);

    try {
      final currentWorkspace = _workspaceService.currentWorkspace;
      if (currentWorkspace == null) return;

      final response = await _botApi.getBots(currentWorkspace.id);

      if (response.isSuccess && response.data != null) {
        setState(() {
          // Only show active bots
          _availableBots = response.data!.where((bot) => bot.status == BotStatus.active).toList();
          _isLoadingBots = false;
        });
        debugPrint('✅ Loaded ${_availableBots.length} available bots for event assignment');
      } else {
        setState(() {
          _availableBots = [];
          _isLoadingBots = false;
        });
      }
    } catch (e) {
      setState(() {
        _availableBots = [];
        _isLoadingBots = false;
      });
      debugPrint('❌ Error loading available bots: $e');
    }
  }

  /// Determine room status based on current bookings
  Map<String, dynamic> _getRoomStatus(String roomId) {
    final bookings = _roomBookings[roomId] ?? [];
    final now = DateTime.now();

    // Find current booking
    final currentBooking = bookings.firstWhere(
      (booking) {
        final startLocal = booking.startTime.toLocal();
        final endLocal = booking.endTime.toLocal();
        return booking.status == 'confirmed' &&
            startLocal.isBefore(now) &&
            endLocal.isAfter(now);
      },
      orElse: () => api.RoomBooking(
        id: '',
        eventId: '',
        roomId: '',
        startTime: DateTime(2000),
        endTime: DateTime(2000),
        status: '',
      ),
    );

    // Room is currently occupied
    if (currentBooking.id.isNotEmpty) {
      final endLocal = currentBooking.endTime.toLocal();
      return {
        'status': 'Occupied until ${_formatTime(endLocal)}',
        'isAvailable': false,
        'endTime': endLocal,
      };
    }

    // Find next upcoming booking
    final upcomingBookings = bookings
        .where((booking) {
          final startLocal = booking.startTime.toLocal();
          return booking.status == 'confirmed' && startLocal.isAfter(now);
        })
        .toList()
      ..sort((a, b) => a.startTime.compareTo(b.startTime));

    if (upcomingBookings.isNotEmpty) {
      final nextBooking = upcomingBookings.first;
      final startLocal = nextBooking.startTime.toLocal();
      return {
        'status': 'Available until ${_formatTime(startLocal)}',
        'isAvailable': true,
        'startTime': startLocal,
      };
    }

    // Room is completely available
    return {
      'status': 'Available',
      'isAvailable': true,
    };
  }

  /// Format time for display (12-hour format with AM/PM)
  String _formatTime(DateTime dateTime) {
    final hour = dateTime.hour;
    final minute = dateTime.minute;
    final period = hour >= 12 ? 'PM' : 'AM';
    final displayHour = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);
    final displayMinute = minute.toString().padLeft(2, '0');
    return '$displayHour:$displayMinute $period';
  }

  void _onFocusChange() {
    setState(() {
      showSuggestions = titleFocusNode.hasFocus;
    });
  }

  void _filterSuggestions() {
    final query = titleController.text.toLowerCase();
    setState(() {
      if (query.isEmpty) {
        filteredSuggestions = List.from(commonEventTitles);
      } else {
        filteredSuggestions = commonEventTitles
            .where((title) => title.toLowerCase().contains(query))
            .toList();
      }
    });
  }

  void _onDescriptionChange() {
    final text = descriptionController.document.toPlainText();
    final cursorPosition = descriptionController.selection.baseOffset;

    // Check if / symbol was typed
    if (cursorPosition > 0 && cursorPosition <= text.length && text[cursorPosition - 1] == '/') {
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
    final alreadyAttached = descriptionAttachments.any((a) => a['id'] == note.id && a['type'] == 'note');
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
      descriptionAttachments.add({
        'id': note.id,
        'name': note.title,
        'type': 'note',
        'content': note.content,
      });

      // Insert note reference in description text
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
    final alreadyAttached = descriptionAttachments.any((a) => a['id'] == event.id && a['type'] == 'event');
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
      descriptionAttachments.add({
        'id': event.id,
        'name': event.title,
        'type': 'event',
        'start_time': event.startTime.toIso8601String(),
        'end_time': event.endTime.toIso8601String(),
        'location': event.location,
      });

      // Insert event reference in description text
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
    final alreadyAttached = descriptionAttachments.any((a) => a['id'] == file.id && a['type'] == 'file');
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
      descriptionAttachments.add({
        'id': file.id,
        'name': file.name,
        'type': 'file',
        'size': file.size, // Store raw size, let preview dialog format it
        'storage_path': file.storagePath,
        'mime_type': file.mimeType,
        'url': file.url,
      });

      // Insert file reference in description text
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

  String _formatMimeType(String? mimeType) {
    if (mimeType == null || mimeType.isEmpty) return 'File';

    // Handle Google-specific MIME types
    if (mimeType.contains('google-apps.document')) return 'Google Doc';
    if (mimeType.contains('google-apps.spreadsheet')) return 'Google Sheet';
    if (mimeType.contains('google-apps.presentation')) return 'Google Slides';
    if (mimeType.contains('google-apps.folder')) return 'Folder';

    // Handle common MIME types
    if (mimeType.contains('pdf')) return 'PDF';
    if (mimeType.contains('image')) return 'Image';
    if (mimeType.contains('video')) return 'Video';
    if (mimeType.contains('audio')) return 'Audio';
    if (mimeType.contains('text')) return 'Text';
    if (mimeType.contains('zip') || mimeType.contains('archive')) return 'Archive';
    if (mimeType.contains('word') || mimeType.contains('document')) return 'Document';
    if (mimeType.contains('excel') || mimeType.contains('spreadsheet')) return 'Spreadsheet';
    if (mimeType.contains('powerpoint') || mimeType.contains('presentation')) return 'Presentation';

    // Return the extension part if available
    final parts = mimeType.split('/');
    if (parts.length > 1) {
      return parts.last.toUpperCase();
    }

    return 'File';
  }

  @override
  void dispose() {
    _animationController.dispose();
    _borderAnimationController.dispose();
    titleController.removeListener(_filterSuggestions);
    titleFocusNode.removeListener(_onFocusChange);
    descriptionController.removeListener(_onDescriptionChange);
    titleController.dispose();
    titleFocusNode.dispose();
    descriptionController.dispose();
    descriptionScrollController.dispose();
    descriptionFocusNode.dispose();
    locationController.dispose();
    meetingUrlController.dispose();
    super.dispose();
  }

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
          'calendar.create_new_event'.tr(),
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: textColor,
          ),
        ),
        actions: [
          TextButton(
            onPressed: (_isCreatingEvent || _isGeneratingAI) ? null : _createEvent,
            child: _isCreatingEvent
                ? SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                    ),
                  )
                : Text(
                    'calendar.create_event_btn'.tr(),
                    style: TextStyle(
                      color: (_isCreatingEvent || _isGeneratingAI) ? Colors.grey : primaryColor,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
          ),
          SizedBox(width: 8),
        ],
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
                children: tabs.asMap().entries.map((entry) {
                  final index = entry.key;
                  final tab = entry.value;
                  final isSelected = selectedTab == index;
                  
                  return Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => selectedTab = index),
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
            child: selectedTab == 0
                ? _buildDetailsTab()
                : selectedTab == 1
                    ? _buildAdvancedTab()
                    : selectedTab == 2
                        ? _buildAttachmentTab()
                        : _buildDetailsTab(),
          ),
          ],
        ),
      ),
    );
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
                'calendar.title_label'.tr(),
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: _titleError ? Colors.red : textColor,
                ),
              ),
              Text(
                ' *',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: Colors.red,
                ),
              ),
            ],
          ),
          SizedBox(height: 8),
          TextField(
            controller: titleController,
            focusNode: titleFocusNode,
            style: TextStyle(color: textColor),
            onChanged: (value) {
              if (_titleError && value.trim().isNotEmpty) {
                setState(() => _titleError = false);
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
                borderSide: BorderSide(color: _titleError ? Colors.red : borderColor, width: _titleError ? 2 : 1),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(color: _titleError ? Colors.red : primaryColor, width: 2),
              ),
              errorText: _titleError ? 'calendar.title_required'.tr() : null,
            ),
          ),
          SizedBox(height: 8),
          // Common title suggestions (show when field is focused)
          if (showSuggestions && filteredSuggestions.isNotEmpty) ...[
            Container(
              constraints: BoxConstraints(maxHeight: 150),
              decoration: BoxDecoration(
                color: surfaceColor,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: borderColor),
              ),
              child: ListView.builder(
                shrinkWrap: true,
                padding: const EdgeInsets.symmetric(vertical: 4),
                itemCount: filteredSuggestions.length,
                itemBuilder: (context, index) {
                  return InkWell(
                    onTap: () {
                      setState(() {
                        titleController.text = filteredSuggestions[index];
                        // Clear selection and unfocus to hide suggestions after selection
                        titleController.selection = TextSelection.fromPosition(
                          TextPosition(offset: titleController.text.length),
                        );
                        titleFocusNode.unfocus();
                        showSuggestions = false;
                      });
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      child: Text(
                        filteredSuggestions[index],
                        style: TextStyle(
                          color: textColor,
                          fontSize: 14,
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
            SizedBox(height: 12),
          ],
          
          // Description
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'calendar.description_label'.tr(),
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
                    child: Column(
                      children: [
                        // Quill Toolbar
                        Container(
                          decoration: BoxDecoration(
                            color: surfaceColor.withOpacity(0.5),
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
                            showLink: false,
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
                      Divider(height: 1, color: borderColor),
                      // Quill Editor with AI icon
                      Container(
                        height: 120,
                        padding: const EdgeInsets.all(12),
                        child: QuillEditor.basic(
                          controller: descriptionController,
                          focusNode: descriptionFocusNode,
                          scrollController: descriptionScrollController,
                          config: QuillEditorConfig(
                            placeholder: 'calendar.description_placeholder'.tr(),
                            expands: true,
                            padding: EdgeInsets.zero,
                          ),
                        ),
                      ),
                      ],
                    ),
                  ),
                )
              : Container(
              decoration: BoxDecoration(
                color: surfaceColor,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: borderColor),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Column(
                  children: [
                    // Quill Toolbar
                    Container(
                      decoration: BoxDecoration(
                        color: surfaceColor.withOpacity(0.5),
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
                        showLink: false,
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
                  Divider(height: 1, color: borderColor),
                    // Quill Editor
                    Container(
                      height: 120,
                      padding: const EdgeInsets.all(12),
                      child: QuillEditor.basic(
                        controller: descriptionController,
                        focusNode: descriptionFocusNode,
                        scrollController: descriptionScrollController,
                        config: QuillEditorConfig(
                          placeholder: 'calendar.description_placeholder'.tr(),
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
          if (descriptionAttachments.isNotEmpty)
            AttachmentFieldWidget(
              attachments: descriptionAttachments
                  .map((a) => AttachmentItem.fromMap(a))
                  .toList(),
              onRemoveAttachment: (attachment) {
                setState(() {
                  descriptionAttachments.removeWhere(
                    (a) => a['id'] == attachment.id && a['type'] == attachment.type.value,
                  );
                  // Also remove from description text
                  final refPattern = '[${attachment.type.label}: ${attachment.name}]';
                  final text = descriptionController.document.toPlainText();
                  final index = text.indexOf(refPattern);
                  if (index >= 0) {
                    descriptionController.replaceText(
                      index,
                      refPattern.length,
                      '',
                      null,
                    );
                  }
                });
              },
              onTapAttachment: _handleAttachmentTap,
              isCompact: true,
            ),

          Text(
            'calendar.type_to_attach'.tr(),
            style: TextStyle(color: subtitleColor, fontSize: 12),
          ),
          SizedBox(height: 20),
          
          // Category and Priority
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
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: _categoryError ? Colors.red : textColor,
                          ),
                        ),
                        Text(
                          ' *',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: Colors.red,
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
                            value: selectedCategoryId,
                            isExpanded: true,
                            hint: Text('calendar.select_category'.tr(), style: TextStyle(color: _categoryError ? Colors.red : subtitleColor)),
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
                                  selectedCategoryId = value;
                                  if (_categoryError) _categoryError = false;
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
                                borderSide: BorderSide(color: _categoryError ? Colors.red : borderColor, width: _categoryError ? 2 : 1),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide: BorderSide(color: _categoryError ? Colors.red : primaryColor, width: 2),
                              ),
                              errorText: _categoryError ? 'calendar.category_required'.tr() : null,
                            ),
                            dropdownColor: surfaceColor,
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
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: _priorityError ? Colors.red : textColor,
                          ),
                        ),
                        Text(
                          ' *',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: Colors.red,
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      value: selectedPriority,
                      items: [
                        DropdownMenuItem(value: 'low', child: Text('calendar.priority_low'.tr())),
                        DropdownMenuItem(value: 'normal', child: Text('calendar.priority_normal'.tr())),
                        DropdownMenuItem(value: 'high', child: Text('calendar.priority_high'.tr())),
                        DropdownMenuItem(value: 'urgent', child: Text('calendar.priority_urgent'.tr())),
                      ],
                      onChanged: (value) {
                        setState(() {
                          selectedPriority = value!;
                          if (_priorityError) _priorityError = false;
                        });
                      },
                      style: TextStyle(color: textColor),
                      icon: Icon(Icons.arrow_drop_down, color: textColor),
                      decoration: InputDecoration(
                        filled: true,
                        fillColor: surfaceColor,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide: BorderSide(color: _priorityError ? Colors.red : borderColor),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide: BorderSide(color: _priorityError ? Colors.red : borderColor, width: _priorityError ? 2 : 1),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide: BorderSide(color: _priorityError ? Colors.red : primaryColor, width: 2),
                        ),
                        errorText: _priorityError ? 'calendar.priority_required'.tr() : null,
                      ),
                      dropdownColor: surfaceColor,
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
              : _meetingRooms.isEmpty
                  ? Container(
                      height: 48,
                      decoration: BoxDecoration(
                        color: surfaceColor,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: borderColor),
                      ),
                      child: Center(
                        child: Text(
                          'calendar.no_meeting_rooms'.tr(),
                          style: TextStyle(color: subtitleColor, fontSize: 14),
                        ),
                      ),
                    )
                  : DropdownButtonFormField<String>(
                      value: selectedMeetingRoomId,
                      isExpanded: true,
                      hint: Text('calendar.select_meeting_room'.tr(), style: TextStyle(color: subtitleColor)),
                      items: _meetingRooms
                          .map((room) {
                            final roomStatus = _getRoomStatus(room.id);
                            final statusText = roomStatus['status'] as String;
                            final isAvailable = roomStatus['isAvailable'] as bool;
                            return DropdownMenuItem(
                              value: room.id,
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.meeting_room, size: 16, color: isAvailable ? Colors.green : Colors.orange),
                                  SizedBox(width: 8),
                                  Flexible(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Text(
                                          '${room.name} (${room.capacity} people)',
                                          style: TextStyle(color: textColor, fontWeight: FontWeight.w500),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        Text(
                                          statusText,
                                          style: TextStyle(color: isAvailable ? Colors.green : Colors.orange, fontSize: 12),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            );
                          })
                          .toList(),
                      // Show single-line version when selected to prevent overflow
                      selectedItemBuilder: (context) {
                        return _meetingRooms
                            .map((room) {
                              final roomStatus = _getRoomStatus(room.id);
                              final isAvailable = roomStatus['isAvailable'] as bool;
                              return Row(
                                children: [
                                  Icon(Icons.meeting_room, size: 16, color: isAvailable ? Colors.green : Colors.orange),
                                  SizedBox(width: 8),
                                  Flexible(
                                    child: Text(
                                      '${room.name} (${room.capacity} people)',
                                      style: TextStyle(color: textColor, fontWeight: FontWeight.w500),
                                      overflow: TextOverflow.ellipsis,
                                      maxLines: 1,
                                    ),
                                  ),
                                ],
                              );
                            })
                            .toList();
                      },
                      onChanged: (value) {
                        setState(() => selectedMeetingRoomId = value);
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
          
          // All Day Event
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: surfaceColor,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: borderColor),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
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
                      'calendar.all_day_description'.tr(),
                      style: TextStyle(
                        color: subtitleColor,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
                Switch.adaptive(
                  value: isAllDay,
                  onChanged: (value) => setState(() => isAllDay = value),
                  activeColor: primaryColor,
                  activeTrackColor: primaryColor.withValues(alpha: 0.5),
                  inactiveThumbColor: Theme.of(context).brightness == Brightness.dark
                      ? Colors.grey[400]
                      : Colors.grey[600],
                  inactiveTrackColor: Theme.of(context).brightness == Brightness.dark
                      ? Colors.grey[800]
                      : Colors.grey[300],
                ),
              ],
            ),
          ),
          SizedBox(height: 20),
          
          // Date and Time
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
                      onTap: () => _selectDate(true),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        decoration: BoxDecoration(
                          color: surfaceColor,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: borderColor),
                        ),
                        child: Text(
                          '${startDate.month.toString().padLeft(2, '0')}/${startDate.day.toString().padLeft(2, '0')}/${startDate.year}',
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
                      onTap: () => _selectDate(false),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        decoration: BoxDecoration(
                          color: surfaceColor,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: borderColor),
                        ),
                        child: Text(
                          '${endDate.month.toString().padLeft(2, '0')}/${endDate.day.toString().padLeft(2, '0')}/${endDate.year}',
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
          
          // Time (if not all day)
          if (!isAllDay) Row(
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
                      onTap: () => _selectTime(true),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        decoration: BoxDecoration(
                          color: surfaceColor,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: borderColor),
                        ),
                        child: Text(
                          startTime.format(context),
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
                      onTap: () => _selectTime(false),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        decoration: BoxDecoration(
                          color: surfaceColor,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: borderColor),
                        ),
                        child: Text(
                          endTime.format(context),
                          style: TextStyle(color: textColor),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (!isAllDay) SizedBox(height: 20),
          
          // Location
          Text(
            'calendar.location'.tr(),
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: textColor,
            ),
          ),
          SizedBox(height: 8),
          TextField(
            controller: locationController,
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
            'calendar.meeting_url'.tr(),
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: textColor,
            ),
          ),
          SizedBox(height: 8),
          TextField(
            controller: meetingUrlController,
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

          // Private Event
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: surfaceColor,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: borderColor),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'calendar.private_event'.tr(),
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: textColor,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'calendar.private_event_description'.tr(),
                      style: TextStyle(
                        color: subtitleColor,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
                Switch.adaptive(
                  value: isPrivate,
                  onChanged: (value) => setState(() => isPrivate = value),
                  activeColor: primaryColor,
                  activeTrackColor: primaryColor.withValues(alpha: 0.5),
                  inactiveThumbColor: Theme.of(context).brightness == Brightness.dark
                      ? Colors.grey[400]
                      : Colors.grey[600],
                  inactiveTrackColor: Theme.of(context).brightness == Brightness.dark
                      ? Colors.grey[800]
                      : Colors.grey[300],
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
      padding: const EdgeInsets.all(20),
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
                  'calendar.no_members_found'.tr(),
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
                onPressed: _addReminder,
                icon: Icon(Icons.notifications_outlined, size: 18),
                label: Text('calendar.add_reminder'.tr()),
                style: TextButton.styleFrom(
                  foregroundColor: primaryColor,
                ),
              ),
            ],
          ),
          SizedBox(height: 12),
          ...reminders.asMap().entries.map((entry) {
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
                      items: ['In App', 'Email', 'SMS'].map((type) {
                        return DropdownMenuItem(
                          value: type,
                          child: Text(type),
                        );
                      }).toList(),
                      onChanged: (value) {
                        setState(() {
                          reminders[index]['type'] = value;
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
                            reminders[index]['minutes'] = minutes;
                          });
                        }
                      },
                    ),
                  ),
                  SizedBox(width: 12),
                  Text(
                    'minutes before',
                    style: TextStyle(color: subtitleColor),
                  ),
                  const Spacer(),
                  // Delete Button
                  IconButton(
                    icon: Icon(Icons.delete_outline, color: subtitleColor),
                    onPressed: () {
                      setState(() {
                        reminders.removeAt(index);
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
            'calendar.recurrence_description'.tr(),
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
              value: recurrencePattern,
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
                setState(() {
                  recurrencePattern = value!;
                });
              },
            ),
          ),
          SizedBox(height: 24),

          // Bot Assignment Section
          Row(
            children: [
              Icon(Icons.smart_toy, size: 18, color: primaryColor),
              SizedBox(width: 8),
              Text(
                'calendar.event_bot_assistant'.tr(),
                style: TextStyle(
                  color: textColor,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          SizedBox(height: 8),
          Text(
            'calendar.event_bot_description'.tr(),
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
            child: _isLoadingBots
                ? Padding(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    child: Center(
                      child: SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    ),
                  )
                : DropdownButton<String?>(
                    value: _selectedBotId,
                    isExpanded: true,
                    underline: SizedBox(),
                    hint: Text('calendar.no_bot'.tr()),
                    style: TextStyle(color: textColor),
                    dropdownColor: surfaceColor,
                    items: [
                      DropdownMenuItem<String?>(
                        value: null,
                        child: Text('calendar.no_bot'.tr()),
                      ),
                      ..._availableBots.map((bot) => DropdownMenuItem<String?>(
                        value: bot.id,
                        child: Row(
                          children: [
                            Icon(Icons.smart_toy, size: 16, color: Colors.indigo),
                            SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                bot.effectiveDisplayName,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      )),
                    ],
                    onChanged: (value) {
                      setState(() {
                        _selectedBotId = value;
                      });
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildAttendeeMemberItem(WorkspaceMember member) {
    final isSelected = attendees.contains(member.email);
    final displayName = member.name ?? member.email;
    final initial = displayName.isNotEmpty ? displayName[0].toUpperCase() : 'U';

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () {
          setState(() {
            if (isSelected) {
              attendees.remove(member.email);
            } else {
              attendees.add(member.email);
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
                      member.role.value.toLowerCase() == 'owner'
                          ? 'calendar.owner'.tr()
                          : 'calendar.member'.tr(),
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
                      attendees.add(member.email);
                    } else {
                      attendees.remove(member.email);
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
                      'calendar.upload_files_hint'.tr(),
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
                  print('🟢 Upload Files button pressed!');
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
                      TextSpan(text: 'calendar.drop_files_here'.tr()),
                      TextSpan(
                        text: 'calendar.upload_files_btn'.tr(),
                        style: TextStyle(
                          color: primaryColor,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      TextSpan(text: 'calendar.to_browse'.tr()),
                    ],
                  ),
                ),
                SizedBox(height: 8),
                Text(
                  'calendar.file_support_hint'.tr(),
                  style: TextStyle(
                    fontSize: 12,
                    color: subtitleColor.withValues(alpha: 0.7),
                  ),
                ),
              ],
            ),
          ),
          SizedBox(height: 16),

          // Google Drive import section
          if (_isDriveConnected)
            InkWell(
              onTap: _openGoogleDrivePicker,
              borderRadius: BorderRadius.circular(8),
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.green.withOpacity(0.05),
                  border: Border.all(
                    color: Colors.green.withOpacity(0.3),
                    width: 2,
                    strokeAlign: BorderSide.strokeAlignInside,
                  ),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: Colors.green.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(
                        Icons.cloud,
                        size: 28,
                        color: Colors.green,
                      ),
                    ),
                    SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Google Drive',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: Colors.green.shade700,
                            ),
                          ),
                          SizedBox(height: 4),
                          Text(
                            'calendar.import_from_drive_hint'.tr(),
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.green.shade600,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Icon(
                      Icons.arrow_forward_ios,
                      size: 16,
                      color: Colors.green.shade600,
                    ),
                  ],
                ),
              ),
            ),
          SizedBox(height: 24),

          // Google Drive attachments section
          if (driveAttachments.isNotEmpty) ...[
            Text(
              'Google Drive Files (${driveAttachments.length})',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: textColor,
              ),
            ),
            SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.green.withOpacity(0.05),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.green.withOpacity(0.2)),
              ),
              child: Column(
                children: driveAttachments.map((attachment) {
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: surfaceColor,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: borderColor),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            color: Colors.green.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Icon(Icons.cloud, color: Colors.green, size: 20),
                        ),
                        SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                attachment['title'] ?? 'Unknown',
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
                                _formatMimeType(attachment['driveMimeType']),
                                style: TextStyle(
                                  color: subtitleColor,
                                  fontSize: 11,
                                ),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: Icon(Icons.close, color: subtitleColor, size: 18),
                          onPressed: () {
                            setState(() {
                              driveAttachments.removeWhere((a) => a['id'] == attachment['id']);
                            });
                          },
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
            ),
            SizedBox(height: 24),
          ],

          // Description references section (from / mention)
          if (descriptionAttachments.isNotEmpty) ...[
            Text(
              'calendar.description_references'.tr(args: ['${descriptionAttachments.length}']),
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: textColor,
              ),
            ),
            SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.blue.withOpacity(0.05),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.blue.withOpacity(0.2)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.info_outline, size: 16, color: Colors.blue),
                      SizedBox(width: 8),
                      Text(
                        'calendar.referenced_items_hint'.tr(),
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.blue.shade700,
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 8),
                  ...descriptionAttachments.map((attachment) {
                    final type = attachment['type'] ?? 'file';
                    IconData icon;
                    Color iconColor;
                    String typeLabel;

                    switch (type) {
                      case 'note':
                        icon = Icons.note_outlined;
                        iconColor = Colors.blue;
                        typeLabel = 'calendar.note_type'.tr();
                        break;
                      case 'event':
                        icon = Icons.event_outlined;
                        iconColor = Colors.green;
                        typeLabel = 'calendar.event_type'.tr();
                        break;
                      case 'file':
                      default:
                        icon = Icons.insert_drive_file_outlined;
                        iconColor = Colors.orange;
                        typeLabel = 'calendar.file_type'.tr();
                        break;
                    }

                    return Container(
                      margin: const EdgeInsets.only(top: 4),
                      child: Row(
                        children: [
                          Icon(icon, color: iconColor, size: 16),
                          SizedBox(width: 8),
                          Text(
                            '[$typeLabel: ${attachment['name']}]',
                            style: TextStyle(
                              color: textColor.withOpacity(0.8),
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ),
            SizedBox(height: 24),
          ],

          // Attached files section (manual uploads)
          Text(
            'calendar.file_attachments'.tr() + ' (${attachedFiles.length})',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: textColor,
            ),
          ),
          SizedBox(height: 12),

          // Attachments list
          if (attachedFiles.isEmpty)
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: surfaceColor,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: borderColor),
              ),
              child: Center(
                child: Text(
                  'calendar.no_attachments_yet'.tr(),
                  style: TextStyle(color: subtitleColor, fontSize: 13),
                ),
              ),
            )
          else
            ...attachedFiles.map((attachment) {
              final type = attachment['type'] ?? 'file';
              IconData icon;
              Color iconColor;
              String subtitle;

              switch (type) {
                case 'note':
                  icon = Icons.note_outlined;
                  iconColor = Colors.blue;
                  subtitle = 'Note';
                  break;
                case 'event':
                  icon = Icons.event_outlined;
                  iconColor = Colors.green;
                  final startTime = attachment['start_time'] != null
                      ? DateTime.parse(attachment['start_time'])
                      : null;
                  subtitle = startTime != null
                      ? 'Event • ${startTime.day}/${startTime.month}/${startTime.year}'
                      : 'Event';
                  break;
                case 'file':
                default:
                  icon = Icons.insert_drive_file_outlined;
                  iconColor = Colors.orange;
                  subtitle = 'File • ${attachment['size'] ?? 'unknown'}';
                  break;
              }

              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: surfaceColor,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: borderColor),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: iconColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(icon, color: iconColor, size: 20),
                    ),
                    SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            attachment['name'] ?? 'Unknown',
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
                            subtitle,
                            style: TextStyle(
                              color: subtitleColor,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (type == 'file' || type == 'note')
                      IconButton(
                        icon: Icon(Icons.visibility_outlined, color: subtitleColor, size: 18),
                        onPressed: () {
                          // TODO: Preview attachment
                        },
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                    SizedBox(width: 12),
                    IconButton(
                      icon: Icon(Icons.close, color: subtitleColor, size: 18),
                      onPressed: () {
                        setState(() {
                          attachedFiles.remove(attachment);
                        });
                      },
                      padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ],
              ),
            );
            }),

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
            'calendar.shared_notes_hint'.tr(),
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
                    'calendar.no_notes_attached'.tr(),
                    style: TextStyle(
                      fontSize: 14,
                      color: textColor,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  SizedBox(height: 8),
                  Text(
                    'calendar.browse_notes_hint'.tr(),
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

  void _addReminder() {
    setState(() {
      reminders.add({
        'type': 'In App',
        'minutes': 5,
      });
    });
  }

  void _removeReminder(int index) {
    setState(() {
      reminders.removeAt(index);
    });
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
        _availableNotesForMentionFromApi = notes;
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
                    : _availableNotesForMentionFromApi.isEmpty
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
                                  'calendar.create_notes_first'.tr(),
                                  style: TextStyle(color: subtitleColor, fontSize: 14),
                                  textAlign: TextAlign.center,
                                ),
                              ],
                            ),
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.all(20),
                            itemCount: _availableNotesForMentionFromApi.length,
                            itemBuilder: (context, index) {
                              final note = _availableNotesForMentionFromApi[index];
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
                    note.content ?? 'No content',
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

  Future<void> _generateAIDescriptions() async {
    // Check if title is empty
    if (titleController.text.trim().isEmpty) {
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
        titleController.text.trim(),
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
            content: Text('calendar.error_generating_descriptions'.tr(args: ['$e'])),
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
                            final length = descriptionController.document.length;
                            descriptionController.replaceText(
                              0,
                              length - 1,
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
                                      'Option ${index + 1}',
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

  void _selectDate(bool isStart) async {
    final date = await showDatePicker(
      context: context,
      initialDate: isStart ? startDate : endDate,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );
    if (date != null) {
      setState(() {
        if (isStart) {
          startDate = date;
        } else {
          endDate = date;
        }
      });
    }
  }

  void _selectTime(bool isStart) async {
    final time = await showTimePicker(
      context: context,
      initialTime: isStart ? startTime : endTime,
    );
    if (time != null) {
      setState(() {
        if (isStart) {
          startTime = time;
        } else {
          endTime = time;
        }
      });
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
          return !attachedFiles.any((attached) => attached['id'] == file.id);
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
          // Add file to attachedFiles
          setState(() {
            attachedFiles.add({
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
    print('🔵 _pickFiles called');
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
            content: Text('calendar.uploading_files'.tr(args: ['${result.files.length}'])),
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
              attachedFiles.add({
                'id': uploadResponse.data!.id,
                'name': file.name,
                'type': 'file',
                'size': fileSize,
                'storage_path': uploadResponse.data!.storagePath,
                'mime_type': uploadResponse.data!.mimeType,
                'url': uploadResponse.data!.url, // Use full CDN URL
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
              content: Text(failCount > 0
                ? 'calendar.files_uploaded_with_failures'.tr(args: ['$successCount', '$failCount'])
                : 'calendar.files_uploaded_successfully'.tr(args: ['$successCount'])),
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
          content: Text('calendar.pick_files_failed'.tr(args: ['$e'])),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _createEvent() async {
    // Validate required fields
    bool hasError = false;

    setState(() {
      _titleError = titleController.text.trim().isEmpty;
      _categoryError = selectedCategoryId == null;
      _priorityError = selectedPriority.isEmpty;

      hasError = _titleError || _categoryError || _priorityError;
    });

    if (hasError) {
      // Build error message
      List<String> missingFields = [];
      if (_titleError) missingFields.add('Title');
      if (_categoryError) missingFields.add('Category');
      if (_priorityError) missingFields.add('Priority');

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('calendar.fill_required_fields'.tr(args: [missingFields.join(', ')])),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() {
      _isCreatingEvent = true;
    });

    try {
      final currentWorkspace = _workspaceService.currentWorkspace;
      if (currentWorkspace == null) {
        throw Exception('No workspace selected');
      }

      final startDateTime = DateTime(
        startDate.year,
        startDate.month,
        startDate.day,
        isAllDay ? 0 : startTime.hour,
        isAllDay ? 0 : startTime.minute,
      );

      final endDateTime = DateTime(
        endDate.year,
        endDate.month,
        endDate.day,
        isAllDay ? 23 : endTime.hour,
        isAllDay ? 59 : endTime.minute,
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
      for (final attachment in attachedFiles) {
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
      for (final attachment in descriptionAttachments) {
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
      if (fileIds.isNotEmpty || noteIds.isNotEmpty || eventIds.isNotEmpty || driveAttachments.isNotEmpty) {
        eventAttachments = api.EventAttachments(
          fileAttachment: fileIds,
          noteAttachment: noteIds,
          eventAttachment: eventIds,
          driveAttachment: driveAttachments,
        );
        debugPrint('📎 Unified attachments - files: $fileIds, notes: $noteIds, events: $eventIds, drive: ${driveAttachments.length}');
      }

      // Format reminders - backend expects array of minutes only (e.g., [5, 15, 60])
      List<int>? formattedReminders;
      if (reminders.isNotEmpty) {
        formattedReminders = reminders
            .map((reminder) => (reminder['minutes'] as num?)?.toInt() ?? 5)
            .toList();
      }

      // Convert Quill delta to HTML for description
      final descriptionText = descriptionController.document.toPlainText().trim();
      String? descriptionHtml;
      if (descriptionText.isNotEmpty) {
        final delta = descriptionController.document.toDelta();
        final converter = QuillDeltaToHtmlConverter(
          delta.toJson(),
          ConverterOptions(),
        );
        descriptionHtml = converter.convert();
      }

      final createDto = api.CreateEventDto(
        title: titleController.text.trim(),
        description: descriptionHtml,
        startTime: startDateTime,
        endTime: endDateTime,
        location: locationController.text.trim().isEmpty
            ? null
            : locationController.text.trim(),
        allDay: isAllDay,
        categoryId: selectedCategoryId,
        roomId: selectedMeetingRoomId,
        attendees: attendees.isNotEmpty ? attendees : null,
        attachments: eventAttachments,
        // Note: descriptionFileIds is no longer sent separately - all attachments are unified in the attachments object
        reminders: formattedReminders,
        priority: selectedPriority.toLowerCase(),
        visibility: isPrivate ? 'private' : 'public',
        status: 'confirmed',
        meetingUrl: meetingUrlController.text.trim().isEmpty
            ? null
            : meetingUrlController.text.trim(),
      );

      final response = await _calendarApi.createEvent(
        currentWorkspace.id,
        createDto,
      );

      if (!mounted) return;

      if (response.isSuccess && response.data != null) {
        // Convert API event to local CalendarEvent model
        final newEvent = CalendarEvent(
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

        // Assign bot to event if one was selected
        if (_selectedBotId != null) {
          final currentWorkspace = _workspaceService.currentWorkspace;
          if (currentWorkspace != null && response.data!.id != null) {
            debugPrint('🤖 Assigning bot $_selectedBotId to event ${response.data!.id}');
            final botResponse = await _botApi.assignBotToEvent(
              currentWorkspace.id,
              response.data!.id!,
              _selectedBotId!,
            );
            if (botResponse.isSuccess) {
              debugPrint('✅ Bot assigned to event successfully');
            } else {
              debugPrint('⚠️ Failed to assign bot: ${botResponse.message}');
            }
          }
        }

        widget.onEventCreated(newEvent);
        Navigator.pop(context);

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('calendar.event_created'.tr()),
            backgroundColor: Colors.green,
          ),
        );
      } else {
        throw Exception(response.message ?? 'Failed to create event');
      }
    } catch (e) {
      if (!mounted) return;

      final errorMessage = extractErrorMessage(e, fallback: 'Failed to create event');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(errorMessage),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isCreatingEvent = false;
        });
      }
    }
  }
}