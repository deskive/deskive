import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter_quill/flutter_quill.dart';
import 'package:vsc_quill_delta_to_html/vsc_quill_delta_to_html.dart';
import 'dart:convert';
import 'dart:math' as math;
import 'package:html/parser.dart' as html_parser;
import '../models/project.dart';
import '../models/calendar_event.dart';
import '../services/project_service.dart';
import '../api/services/ai_api_service.dart';
import '../services/workspace_service.dart';
import '../services/file_service.dart';
import '../api/services/workspace_api_service.dart';
import '../api/services/notes_api_service.dart' as notes_api;
import '../api/services/calendar_api_service.dart' as calendar_api;
import '../models/file/file.dart' as file_model;
import '../config/app_config.dart';
import '../theme/app_theme.dart';
import '../widgets/mention_suggestion_widget.dart';
import '../widgets/attachment_display_widget.dart';
import '../widgets/attachment_preview_dialogs.dart';
import '../widgets/ai_description_button.dart';
import '../notes/note.dart';
import '../notes/note_editor_screen.dart';

class StatusColumn {
  String name;
  Color color;
  
  StatusColumn({required this.name, required this.color});
}

class CreateProjectScreen extends StatefulWidget {
  const CreateProjectScreen({super.key});

  @override
  State<CreateProjectScreen> createState() => _CreateProjectScreenState();
}

class _CreateProjectScreenState extends State<CreateProjectScreen>
    with TickerProviderStateMixin {
  final _projectNameController = TextEditingController();
  final _projectKeyController = TextEditingController();
  late QuillController _descriptionController;
  final FocusNode _descriptionFocusNode = FocusNode();
  final ScrollController _descriptionScrollController = ScrollController();
  final _formKey = GlobalKey<FormState>();
  
  int _currentStep = 0;
  String _selectedProjectTypeId = 'kanban'; // Default to Kanban Board
  String _selectedType = 'kanban';
  final List<String> _selectedTeamMembers = [];
  String? _selectedProjectLeadId;
  List<WorkspaceMember> _workspaceMembers = [];
  bool _isLoadingMembers = false;
  final WorkspaceApiService _workspaceApiService = WorkspaceApiService();
  final WorkspaceService _workspaceService = WorkspaceService.instance;
  final notes_api.NotesApiService _notesApi = notes_api.NotesApiService();
  final calendar_api.CalendarApiService _calendarApi = calendar_api.CalendarApiService();
  final FileService _fileService = FileService.instance;

  // / Mention functionality for description field (triggered by /)
  List<notes_api.Note> _availableNotesForMention = [];
  List<CalendarEvent> _availableEvents = [];
  List<file_model.File> _availableFiles = [];
  bool _showMentionSuggestions = false;
  int _slashSymbolPosition = -1;
  List<Map<String, dynamic>> descriptionAttachments = []; // Attachments from / mention in description

  // AI generation state and animation
  bool _isGeneratingAI = false;
  late AnimationController _animationController;
  late Animation<double> _borderAnimation;
  final AIApiService _aiService = AIApiService();

  // Sample notes data for auto-generation
  final List<String> _availableNotes = [
    'Project requirements gathered from stakeholder meeting',
    'Technical specifications documented in system design',
    'User stories defined for MVP features',
    'Database schema designed for scalability',
    'API endpoints documented for frontend integration',
    'Security requirements outlined for compliance',
    'Performance benchmarks established for optimization',
    'Testing strategy defined for quality assurance',
  ];
  
  // Status columns configuration
  final List<StatusColumn> _statusColumns = [
    StatusColumn(name: 'projects.default_todo'.tr(), color: Colors.blue),
    StatusColumn(name: 'projects.default_in_progress'.tr(), color: Colors.orange),
    StatusColumn(name: 'projects.default_done'.tr(), color: Colors.green),
  ];

  @override
  void initState() {
    super.initState();
    _descriptionController = QuillController.basic();
    _loadWorkspaceMembers();
    // Listen to description changes for / mentions
    _descriptionController.addListener(_onDescriptionChange);
    // Load notes, events, and files for / mentions
    _loadNotesForMentions();

    // Initialize animation controller for AI generation border effect
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 2000),
      vsync: this,
    );
    _borderAnimation = CurvedAnimation(
      parent: _animationController,
      curve: Curves.linear,
    );
  }

  Future<void> _loadWorkspaceMembers() async {
    setState(() {
      _isLoadingMembers = true;
    });

    try {
      final currentWorkspace = _workspaceService.currentWorkspace;
      if (currentWorkspace == null) {
        setState(() {
          _isLoadingMembers = false;
        });
        return;
      }

      final response = await _workspaceApiService.getMembers(currentWorkspace.id);

      if (response.isSuccess && response.data != null) {
        setState(() {
          _workspaceMembers = response.data!;
          _isLoadingMembers = false;
        });
      } else {
        setState(() {
          _isLoadingMembers = false;
        });
      }
    } catch (e) {
      setState(() {
        _isLoadingMembers = false;
      });
    }
  }

  // Load notes from API for / mentions
  Future<void> _loadNotesForMentions() async {
    try {
      final currentWorkspace = _workspaceService.currentWorkspace;
      if (currentWorkspace == null) return;

      final response = await _notesApi.getNotes(currentWorkspace.id);
      if (response.isSuccess && response.data != null) {
        setState(() {
          _availableNotesForMention = response.data!;
        });
      }
    } catch (e) {
    }
  }

  // Load events from API for / mentions
  Future<void> _loadEventsForMention() async {
    if (_availableEvents.isNotEmpty) return; // Already loaded

    try {
      final workspaceId = _workspaceService.currentWorkspace?.id;
      if (workspaceId == null) return;

      final response = await _calendarApi.getEvents(workspaceId);
      if (response.isSuccess && response.data != null) {
        setState(() {
          _availableEvents = response.data!.map((apiEvent) {
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
    }
  }

  // Load files from API for / mentions
  Future<void> _loadFilesForMention() async {
    if (_availableFiles.isNotEmpty) return; // Already loaded

    try {
      final workspaceId = _workspaceService.currentWorkspace?.id;
      if (workspaceId == null) return;

      // Initialize the file service with workspace context before fetching files
      _fileService.initialize(workspaceId);

      final files = await _fileService.getFiles();
      if (files != null) {
        setState(() {
          _availableFiles = files;
        });
      }
    } catch (e) {
    }
  }

  // Detect / symbol in description field
  void _onDescriptionChange() {
    final text = _descriptionController.document.toPlainText();
    final cursorPosition = _descriptionController.selection.baseOffset;

    // Check if / symbol was typed
    if (cursorPosition > 0 && cursorPosition <= text.length && text[cursorPosition - 1] == '/') {
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

  // Insert note reference into description
  void _insertNoteReference(notes_api.Note note) {
    // Check if already attached in description
    final alreadyAttached = descriptionAttachments.any((a) => a['id'] == note.id && a['type'] == 'note');
    if (alreadyAttached) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Note "${note.title}" is already referenced in description'),
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
      _descriptionController.replaceText(
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
        content: Text('Note "${note.title}" referenced in description'),
        duration: const Duration(seconds: 2),
        backgroundColor: Colors.green,
      ),
    );
  }

  // Insert event reference into description
  void _insertEventReference(CalendarEvent event) {
    // Check if already attached in description
    final alreadyAttached = descriptionAttachments.any((a) => a['id'] == event.id && a['type'] == 'event');
    if (alreadyAttached) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Event "${event.title}" is already referenced in description'),
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
        'description': event.description,
        'attendees': event.attendees,
      });

      // Insert event reference in description text
      final reference = '[Event: ${event.title}]';
      _descriptionController.replaceText(
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
        content: Text('Event "${event.title}" referenced in description'),
        duration: const Duration(seconds: 2),
        backgroundColor: Colors.green,
      ),
    );
  }

  // Insert file reference into description
  void _insertFileReference(file_model.File file) {
    // Check if already attached in description
    final alreadyAttached = descriptionAttachments.any((a) => a['id'] == file.id && a['type'] == 'file');
    if (alreadyAttached) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('File "${file.name}" is already referenced in description'),
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
        'size': _formatFileSize(file.size),
        'storage_path': file.storagePath,
        'mime_type': file.mimeType,
        'url': file.url,
      });

      // Insert file reference in description text
      final reference = '[File: ${file.name}]';
      _descriptionController.replaceText(
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
        content: Text('File "${file.name}" referenced in description'),
        duration: const Duration(seconds: 2),
        backgroundColor: Colors.green,
      ),
    );
  }

  // Format file size to human-readable format
  String _formatFileSize(String sizeStr) {
    try {
      final bytes = int.tryParse(sizeStr) ?? 0;
      if (bytes < 1024) return '$bytes B';
      if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
      if (bytes < 1024 * 1024 * 1024) return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
      return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
    } catch (e) {
      return sizeStr;
    }
  }

  @override
  void dispose() {
    _projectNameController.dispose();
    _projectKeyController.dispose();
    _descriptionController.removeListener(_onDescriptionChange);
    _descriptionController.dispose();
    _descriptionFocusNode.dispose();
    _descriptionScrollController.dispose();
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(
            Icons.close,
            color: Theme.of(context).colorScheme.onSurface,
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'projects.create_new_project'.tr(),
          style: TextStyle(
            color: Theme.of(context).colorScheme.onSurface,
            fontSize: 20,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Progress Indicator
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'projects.setup_project_desc'.tr(),
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                      fontSize: 14,
                    ),
                  ),
                  SizedBox(height: 24),
                  _buildStepIndicator(),
                ],
              ),
            ),
          
          // Content
          Expanded(
            child: _buildStepContent(),
          ),
          
          // Navigation Buttons
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              border: Border(
                top: BorderSide(
                  color: Theme.of(context).dividerColor.withOpacity(0.1),
                ),
              ),
            ),
            child: Row(
              children: [
                if (_currentStep > 0)
                  TextButton(
                    onPressed: () {
                      setState(() {
                        _currentStep--;
                      });
                    },
                    child: Text(
                      'common.back'.tr(),
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                      ),
                    ),
                  ),
                const Spacer(),
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: Text(
                    'common.cancel'.tr(),
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                    ),
                  ),
                ),
                SizedBox(width: 12),
                ElevatedButton(
                  onPressed: _currentStep < 3 ? _nextStep : _createProject,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: context.primaryColor,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(5),
                    ),
                  ),
                  child: Text(_currentStep < 3 ? 'common.next'.tr() : 'projects.create_project'.tr()),
                ),
              ],
            ),
          ),
        ],
      )
    ),
    );
  }

  Widget _buildStepIndicator() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        for (int i = 0; i < 4; i++) ...[
          _buildStepCircle(i),
          if (i < 3)
            Container(
              width: 60,
              height: 2,
              color: i < _currentStep
                  ? context.primaryColor
                  : Theme.of(context).colorScheme.onSurface.withOpacity(0.2),
            ),
        ],
      ],
    );
  }

  Widget _buildStepCircle(int step) {
    final isActive = step == _currentStep;
    final isCompleted = step < _currentStep;
    
    return Container(
      width: 32,
      height: 32,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: isActive
            ? context.primaryColor
            : isCompleted
                ? context.primaryColor.withOpacity(0.2)
                : Theme.of(context).colorScheme.onSurface.withOpacity(0.1),
      ),
      child: Center(
        child: Text(
          '${step + 1}',
          style: TextStyle(
            color: isActive
                ? Colors.white
                : isCompleted
                    ? context.primaryColor
                    : Theme.of(context).colorScheme.onSurface.withOpacity(0.4),
            fontWeight: FontWeight.w600,
            fontSize: 14,
          ),
        ),
      ),
    );
  }

  Widget _buildStepContent() {
    switch (_currentStep) {
      case 0:
        return _buildProjectDetailsStep();
      case 1:
        return _buildStatusColumnsStep();
      case 2:
        return _buildProjectTypeStep();
      case 3:
        return _buildTeamMembersAndReviewStep();
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildProjectDetailsStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'projects.project_details'.tr(),
              style: TextStyle(
                color: Theme.of(context).colorScheme.onSurface,
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            SizedBox(height: 32),
            
            // Project Name Field
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      'projects.project_name'.tr(),
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurface,
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    Text(
                      '*',
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
                SizedBox(height: 8),
                TextFormField(
                  controller: _projectNameController,
                  decoration: InputDecoration(
                    hintText: 'projects.enter_project_name'.tr(),
                    hintStyle: TextStyle(
                      color: Theme.of(context).colorScheme.onSurface.withOpacity(0.4),
                    ),
                    filled: true,
                    fillColor: Theme.of(context).colorScheme.onSurface.withOpacity(0.05),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide(
                        color: Theme.of(context).colorScheme.onSurface.withOpacity(0.2),
                      ),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide(
                        color: Theme.of(context).colorScheme.onSurface.withOpacity(0.2),
                      ),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide(
                        color: context.primaryColor,
                      ),
                    ),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'projects.please_enter_name'.tr();
                    }
                    return null;
                  },
                  onChanged: (value) {
                    // Auto-generate project key
                    final key = value.toUpperCase().replaceAll(' ', '');
                    _projectKeyController.text = key.length > 7 ? key.substring(0, 7) : key;
                  },
                ),
              ],
            ),
            
            SizedBox(height: 24),
            
            // Project Key Field
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      'projects.project_key'.tr(),
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurface,
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    Text(
                      '*',
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
                SizedBox(height: 8),
                TextFormField(
                  controller: _projectKeyController,
                  decoration: InputDecoration(
                    hintText: 'projects.project_key_hint'.tr(),
                    hintStyle: TextStyle(
                      color: Theme.of(context).colorScheme.onSurface.withOpacity(0.4),
                    ),
                    filled: true,
                    fillColor: Theme.of(context).colorScheme.onSurface.withOpacity(0.05),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide(
                        color: Theme.of(context).colorScheme.onSurface.withOpacity(0.2),
                      ),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide(
                        color: Theme.of(context).colorScheme.onSurface.withOpacity(0.2),
                      ),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide(
                        color: context.primaryColor,
                      ),
                    ),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'projects.please_enter_key'.tr();
                    }
                    return null;
                  },
                ),
                SizedBox(height: 8),
                Text(
                  'projects.key_prefix_hint'.tr(),
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurface.withOpacity(0.5),
                    fontSize: 12,
                  ),
                ),
              ],
            ),
            
            SizedBox(height: 24),
            
            // Description Field
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'projects.description'.tr(),
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurface,
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    AIDescriptionButton(
                      onPressed: _generateAIDescription,
                      isLoading: _isGeneratingAI,
                    ),
                  ],
                ),
                SizedBox(height: 8),
                // Rich text editor with QuillToolbar and QuillEditor - with animated border when AI is generating
                _isGeneratingAI
                    ? AnimatedBuilder(
                        animation: _borderAnimation,
                        builder: (context, child) {
                          return Container(
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(8),
                              gradient: SweepGradient(
                                center: Alignment.center,
                                startAngle: 0,
                                endAngle: math.pi * 2,
                                transform: GradientRotation(_borderAnimation.value * math.pi * 2),
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
                                color: Theme.of(context).colorScheme.surface,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: child,
                            ),
                          );
                        },
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(6),
                          child: Column(
                            children: [
                              // Quill Toolbar
                              Container(
                                decoration: BoxDecoration(
                                  color: Theme.of(context).colorScheme.onSurface.withOpacity(0.05),
                                ),
                                child: QuillSimpleToolbar(
                                  controller: _descriptionController,
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
                              Divider(height: 1, color: Theme.of(context).colorScheme.onSurface.withOpacity(0.2)),
                              // Quill Editor
                              Container(
                                height: 120,
                                padding: const EdgeInsets.all(8),
                                child: QuillEditor.basic(
                                  controller: _descriptionController,
                                  focusNode: _descriptionFocusNode,
                                  scrollController: _descriptionScrollController,
                                  config: QuillEditorConfig(
                                    placeholder: 'projects.description_placeholder'.tr(),
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
                          color: Theme.of(context).colorScheme.onSurface.withOpacity(0.05),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(
                            color: Theme.of(context).colorScheme.onSurface.withOpacity(0.2),
                          ),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(6),
                          child: Column(
                            children: [
                              // Quill Toolbar
                              Container(
                                decoration: BoxDecoration(
                                  color: Theme.of(context).colorScheme.onSurface.withOpacity(0.05),
                                  borderRadius: const BorderRadius.only(
                                    topLeft: Radius.circular(6),
                                    topRight: Radius.circular(6),
                                  ),
                                ),
                                child: QuillSimpleToolbar(
                                  controller: _descriptionController,
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
                              Divider(height: 1, color: Theme.of(context).colorScheme.onSurface.withOpacity(0.2)),
                              // Quill Editor
                              Container(
                                height: 120,
                                padding: const EdgeInsets.all(8),
                                child: QuillEditor.basic(
                                  controller: _descriptionController,
                                  focusNode: _descriptionFocusNode,
                                  scrollController: _descriptionScrollController,
                                  config: QuillEditorConfig(
                                    placeholder: 'projects.description_placeholder'.tr(),
                                    expands: true,
                                    padding: EdgeInsets.zero,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),

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

                // Display attached items
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
                        final text = _descriptionController.document.toPlainText();
                        final index = text.indexOf(refPattern);
                        if (index >= 0) {
                          _descriptionController.replaceText(
                            index,
                            refPattern.length,
                            '',
                            null,
                          );
                        }
                      });
                    },
                    onTapAttachment: (attachment) {
                      _showAttachmentPreview(attachment);
                    },
                    isCompact: true,
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusColumnsStep() {
    final availableColors = [
      Colors.blue,
      Colors.orange,
      Colors.green,
      Colors.red,
      Colors.purple,
      Colors.deepOrange,
      Colors.pink,
      Colors.indigo,
      Colors.teal,
      Colors.cyan,
    ];

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'projects.configure_status_columns'.tr(),
            style: TextStyle(
              color: Theme.of(context).colorScheme.onSurface,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          SizedBox(height: 8),
          Text(
            'projects.status_columns_desc'.tr(),
            style: TextStyle(
              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
              fontSize: 14,
            ),
          ),
          SizedBox(height: 32),
          
          // Status Columns List
          ..._statusColumns.asMap().entries.map((entry) {
            final index = entry.key;
            final column = entry.value;
            
            return Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: Theme.of(context).colorScheme.outline.withOpacity(0.2),
                ),
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      // Drag handle
                      Icon(
                        Icons.drag_handle,
                        color: Theme.of(context).colorScheme.onSurface.withOpacity(0.5),
                      ),
                      SizedBox(width: 12),
                      
                      // Step number
                      Text(
                        '${index + 1}.',
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                          fontSize: 16,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      SizedBox(width: 12),
                      
                      // Column name input field
                      Expanded(
                        child: TextFormField(
                          initialValue: column.name,
                          decoration: InputDecoration(
                            hintText: 'projects.column_name'.tr(),
                            hintStyle: TextStyle(
                              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.4),
                            ),
                            filled: true,
                            fillColor: Theme.of(context).colorScheme.onSurface.withOpacity(0.05),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(6),
                              borderSide: BorderSide(
                                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.2),
                              ),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(6),
                              borderSide: BorderSide(
                                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.2),
                              ),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(6),
                              borderSide: BorderSide(
                                color: context.primaryColor,
                              ),
                            ),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          ),
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.onSurface,
                            fontSize: 14,
                          ),
                          onChanged: (value) {
                            setState(() {
                              _statusColumns[index].name = value;
                            });
                          },
                        ),
                      ),
                      
                      // Delete button
                      if (_statusColumns.length > 2)
                        IconButton(
                          onPressed: () {
                            setState(() {
                              _statusColumns.removeAt(index);
                            });
                          },
                          icon: Icon(
                            Icons.close,
                            color: Colors.red,
                            size: 20,
                          ),
                        ),
                    ],
                  ),
                  
                  SizedBox(height: 12),
                  
                  // Color selection (horizontal scrollable)
                  Row(
                    children: [
                      Text(
                        'projects.color'.tr(),
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                          fontSize: 12,
                        ),
                      ),
                      SizedBox(width: 12),
                      Expanded(
                        child: SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: Row(
                            children: availableColors.map((color) {
                              final isSelected = column.color == color;
                              return GestureDetector(
                                onTap: () {
                                  setState(() {
                                    _statusColumns[index].color = color;
                                  });
                                },
                                child: Container(
                                  width: 28,
                                  height: 28,
                                  margin: const EdgeInsets.only(right: 8),
                                  decoration: BoxDecoration(
                                    color: color,
                                    shape: BoxShape.circle,
                                    border: isSelected
                                        ? Border.all(
                                            color: Theme.of(context).colorScheme.onSurface,
                                            width: 2,
                                          )
                                        : Border.all(
                                            color: Theme.of(context).colorScheme.outline.withOpacity(0.3),
                                            width: 1,
                                          ),
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            );
          }),
          
          // Add Status Column Button
          Container(
            margin: const EdgeInsets.only(bottom: 32),
            child: InkWell(
              onTap: () {
                setState(() {
                  _statusColumns.add(
                    StatusColumn(
                      name: 'New Status',
                      color: Colors.grey,
                    ),
                  );
                });
              },
              borderRadius: BorderRadius.circular(8),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  border: Border.all(
                    color: Theme.of(context).colorScheme.outline.withOpacity(0.3),
                    style: BorderStyle.solid,
                  ),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.add,
                      color: context.primaryColor,
                    ),
                    SizedBox(width: 8),
                    Text(
                      'projects.add_status_column'.tr(),
                      style: TextStyle(
                        color: context.primaryColor,
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          
          // Preview Board Layout
          Text(
            'projects.preview_board_layout'.tr(),
            style: TextStyle(
              color: Theme.of(context).colorScheme.onSurface,
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          SizedBox(height: 16),
          
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: _statusColumns.map((column) {
                return Container(
                  width: 120,
                  margin: const EdgeInsets.only(right: 12),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surface,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: Theme.of(context).colorScheme.outline.withOpacity(0.2),
                    ),
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: column.color,
                              shape: BoxShape.circle,
                            ),
                          ),
                          SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              column.name,
                              style: TextStyle(
                                color: Theme.of(context).colorScheme.onSurface,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.onSurface.withOpacity(0.05),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          'Task',
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                            fontSize: 10,
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProjectTypeStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'projects.choose_project_type'.tr(),
            style: TextStyle(
              color: Theme.of(context).colorScheme.onSurface,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          SizedBox(height: 8),
          Text(
            'projects.select_workflow'.tr(),
            style: TextStyle(
              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
              fontSize: 14,
            ),
          ),
          SizedBox(height: 32),
          
          _buildProjectTypeCard(
            'kanban',
            'projects.kanban_board'.tr(),
            'projects.kanban_board_desc'.tr(),
            ['projects.chip_continuous_flow'.tr(), 'projects.chip_wip_limits'.tr(), 'projects.chip_lead_time'.tr(), 'projects.chip_cumulative_flow'.tr()],
            Icons.view_column,
            Colors.green,
            'kanban',
          ),
          SizedBox(height: 16),
          _buildProjectTypeCard(
            'scrum',
            'projects.scrum_board'.tr(),
            'projects.scrum_board_desc'.tr(),
            ['projects.chip_sprint_planning'.tr(), 'projects.chip_backlog_mgmt'.tr(), 'projects.chip_burndown'.tr(), 'projects.chip_velocity'.tr()],
            Icons.access_time,
            Colors.blue,
            'scrum',
          ),
          SizedBox(height: 16),
          _buildProjectTypeCard(
            'bug_tracking',
            'projects.bug_tracking'.tr(),
            'projects.bug_tracking_desc'.tr(),
            ['projects.chip_bug_tracking'.tr(), 'projects.chip_severity'.tr(), 'projects.chip_resolution'.tr(), 'projects.chip_priority'.tr()],
            Icons.bug_report,
            Colors.red.shade700,
            'bug_tracking',
          ),
          SizedBox(height: 16),
          _buildProjectTypeCard(
            'feature',
            'projects.feature_development'.tr(),
            'projects.feature_development_desc'.tr(),
            ['projects.chip_feature_specs'.tr(), 'projects.chip_requirements'.tr(), 'projects.chip_milestones'.tr(), 'projects.chip_releases'.tr()],
            Icons.flash_on,
            Colors.orange.shade700,
            'feature',
          ),
          SizedBox(height: 16),
          _buildProjectTypeCard(
            'research',
            'projects.type_research'.tr(),
            'projects.research_desc'.tr(),
            ['projects.chip_requirements'.tr(), 'projects.chip_milestones'.tr(), 'projects.chip_feature_specs'.tr(), 'projects.chip_releases'.tr()],
            Icons.school,
            Colors.purple,
            'research',
          ),
        ],
      ),
    );
  }

  Widget _buildProjectTypeCard(
    String id,
    String title,
    String description,
    List<String> features,
    IconData icon,
    Color cardColor,
    String type,
  ) {
    final isSelected = _selectedProjectTypeId == id;
    
    return InkWell(
      onTap: () {
        setState(() {
          _selectedProjectTypeId = id;
          _selectedType = type;
        });
      },
      borderRadius: BorderRadius.circular(5),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: cardColor.withOpacity(0.1),
          borderRadius: BorderRadius.circular(5),
          border: Border.all(
            color: isSelected ? context.primaryColor : Colors.transparent,
            width: 2,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: cardColor.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(5),
                  ),
                  child: Icon(
                    icon,
                    color: cardColor,
                    size: 24,
                  ),
                ),
                SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.onSurface,
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        description,
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.onSurface.withOpacity(0.7),
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: features.map((feature) => Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: cardColor.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Text(
                  feature,
                  style: TextStyle(
                    color: cardColor.withOpacity(0.9),
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              )).toList(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTeamMembersAndReviewStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Team Members Section
          Text(
            'projects.team_members_review'.tr(),
            style: TextStyle(
              color: Theme.of(context).colorScheme.onSurface,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          SizedBox(height: 8),
          Text(
            'projects.add_team_members_desc'.tr(),
            style: TextStyle(
              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
              fontSize: 14,
            ),
          ),
          SizedBox(height: 32),

          // Team Members Subsection
          Text(
            'projects.team_members'.tr(),
            style: TextStyle(
              color: Theme.of(context).colorScheme.onSurface,
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
          SizedBox(height: 16),

          // Search field
          TextField(
            decoration: InputDecoration(
              hintText: 'projects.search_team_members'.tr(),
              hintStyle: TextStyle(
                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.4),
              ),
              prefixIcon: Icon(
                Icons.search,
                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.4),
              ),
              filled: true,
              fillColor: Theme.of(context).colorScheme.onSurface.withOpacity(0.05),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide.none,
              ),
            ),
          ),
          SizedBox(height: 16),

          // Team members list
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
                  'projects.no_workspace_members'.tr(),
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                    fontSize: 14,
                  ),
                ),
              ),
            )
          else
            ..._workspaceMembers.map((member) => _buildTeamMemberItem(member)),

          SizedBox(height: 32),

          // Project Lead Section
          Text(
            'projects.project_lead'.tr(),
            style: TextStyle(
              color: Theme.of(context).colorScheme.onSurface,
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
          SizedBox(height: 8),
          Text(
            'projects.select_project_lead_desc'.tr(),
            style: TextStyle(
              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
              fontSize: 14,
            ),
          ),
          SizedBox(height: 16),

          // Project Lead Dropdown
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.05),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.2),
              ),
            ),
            child: DropdownButton<String>(
              value: _selectedProjectLeadId,
              hint: Text(
                'projects.select_project_lead'.tr(),
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                ),
              ),
              isExpanded: true,
              underline: Container(),
              icon: Icon(
                Icons.arrow_drop_down,
                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
              ),
              items: _workspaceMembers.map<DropdownMenuItem<String>>((WorkspaceMember member) {
                final displayName = member.name ?? member.email;
                return DropdownMenuItem<String>(
                  value: member.userId,
                  child: Row(
                    children: [
                      // Avatar
                      if (member.avatar != null && member.avatar!.isNotEmpty)
                        CircleAvatar(
                          radius: 16,
                          backgroundImage: NetworkImage(member.avatar!),
                          onBackgroundImageError: (_, __) {},
                        )
                      else
                        CircleAvatar(
                          radius: 16,
                          backgroundColor: context.primaryColor.withOpacity(0.2),
                          child: Text(
                            displayName.isNotEmpty ? displayName[0].toUpperCase() : 'U',
                            style: TextStyle(
                              color: context.primaryColor,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              displayName,
                              style: TextStyle(
                                color: Theme.of(context).colorScheme.onSurface,
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            Text(
                              'workspace.${member.role.value}'.tr().toUpperCase(),
                              style: TextStyle(
                                color: context.primaryColor,
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
              onChanged: (String? newValue) {
                setState(() {
                  _selectedProjectLeadId = newValue;
                });
              },
            ),
          ),

          SizedBox(height: 32),

          // Review Section
          Text(
            'projects.project_summary'.tr(),
            style: TextStyle(
              color: Theme.of(context).colorScheme.onSurface,
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
          SizedBox(height: 16),
          
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: Theme.of(context).colorScheme.outline.withOpacity(0.1),
              ),
            ),
            child: Column(
              children: [
                _buildReviewItem('projects.project_name'.tr(), _projectNameController.text),
                _buildReviewItem('projects.project_key'.tr(), _projectKeyController.text),
                _buildReviewItem('projects.type'.tr(), _getProjectTypeDisplayName(_selectedProjectTypeId)),
                _buildReviewItem('projects.status_columns'.tr(), 'projects.columns_configured'.tr(args: ['${_statusColumns.length}'])),
                if (_descriptionController.document.toPlainText().trim().isNotEmpty)
                  _buildReviewItem('projects.description'.tr(), _descriptionController.document.toPlainText()),
                _buildReviewItem(
                  'projects.project_lead'.tr(),
                  _selectedProjectLeadId != null
                      ? _workspaceMembers
                          .firstWhere(
                            (m) => m.userId == _selectedProjectLeadId,
                            orElse: () => _workspaceMembers.first,
                          )
                          .name ?? _workspaceMembers
                          .firstWhere(
                            (m) => m.userId == _selectedProjectLeadId,
                            orElse: () => _workspaceMembers.first,
                          )
                          .email
                      : 'projects.no_lead_selected'.tr(),
                ),
                _buildReviewItem(
                  'projects.team_members'.tr(),
                  _selectedTeamMembers.isEmpty
                      ? 'projects.no_members_selected'.tr()
                      : 'projects.members_selected'.tr(args: ['${_selectedTeamMembers.length}']),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTeamMemberItem(WorkspaceMember member) {
    final isSelected = _selectedTeamMembers.contains(member.userId);
    final displayName = member.name ?? member.email;
    final initial = displayName.isNotEmpty ? displayName[0].toUpperCase() : 'U';

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () {
          setState(() {
            if (isSelected) {
              _selectedTeamMembers.remove(member.userId);
            } else {
              _selectedTeamMembers.add(member.userId);
            }
          });
        },
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.1),
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
                            color: context.primaryColor,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        )
                      : null,
                )
              else
                CircleAvatar(
                  radius: 20,
                  backgroundColor: context.primaryColor.withOpacity(0.2),
                  child: Text(
                    initial,
                    style: TextStyle(
                      color: context.primaryColor,
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
                        color: Theme.of(context).colorScheme.onSurface,
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    if (member.name != null && member.name!.isNotEmpty)
                      Text(
                        member.email,
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                          fontSize: 12,
                        ),
                      ),
                    Text(
                      'workspace.${member.role.value}'.tr().toUpperCase(),
                      style: TextStyle(
                        color: context.primaryColor,
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
                      _selectedTeamMembers.add(member.userId);
                    } else {
                      _selectedTeamMembers.remove(member.userId);
                    }
                  });
                },
                activeColor: context.primaryColor,
                checkColor: Colors.white,
              ),
            ],
          ),
        ),
      ),
    );
  }


  Widget _buildReviewItem(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
              fontSize: 14,
            ),
          ),
          SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              color: Theme.of(context).colorScheme.onSurface,
              fontSize: 16,
            ),
          ),
        ],
      ),
    );
  }

  String _getTypeName(String type) {
    switch (type) {
      case 'KANBAN':
      case 'SCRUM':
        return 'Development';
      case 'FEATURE':
        return 'Design';
      case 'RESEARCH':
        return 'Research';
      case 'BUG TRACKING':
        return 'Task Management';
      default:
        return 'Development';
    }
  }

  String _getProjectTypeDisplayName(String projectTypeId) {
    switch (projectTypeId) {
      case 'kanban':
        return 'Kanban Board';
      case 'scrum':
        return 'Scrum Board';
      case 'bug_tracking':
        return 'Bug Tracking';
      case 'feature_dev':
        return 'Feature Development';
      case 'research':
        return 'Research Project';
      default:
        return 'Kanban Board'; // Default fallback
    }
  }

  void _nextStep() {
    if (_currentStep == 0) {
      if (_formKey.currentState!.validate()) {
        setState(() {
          _currentStep++;
        });
      }
    } else {
      setState(() {
        _currentStep++;
      });
    }
  }

  void _generateAIDescription() async {
    final projectName = _projectNameController.text.trim();

    if (projectName.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Please enter a project name first to generate AI description'),
          backgroundColor: Theme.of(context).colorScheme.error,
        ),
      );
      return;
    }

    // Start animation and set loading state
    setState(() {
      _isGeneratingAI = true;
    });
    _animationController.repeat();

    try {
      // Call AI API using AIApiService
      final response = await _aiService.generateProjectDescriptions(
        projectName,
        projectType: _getProjectTypeDisplayName(_selectedProjectTypeId),
      );

      // Stop animation
      _animationController.stop();
      setState(() {
        _isGeneratingAI = false;
      });

      if (response.success && response.data != null) {
        // Parse descriptions from response
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
        // Try splitting by **Project Description N:** or **Description N:**
        else if (fullText.contains('**Project Description') || fullText.contains('**Description')) {
          final pattern = RegExp(
            r'\*\*(?:Project )?Description \d+:\*\*\s*(.+?)(?=\*\*(?:Project )?Description \d+:\*\*|$)',
            dotAll: true,
          );
          final matches = pattern.allMatches(fullText);
          descriptions = matches
              .map((m) => m.group(1)?.trim() ?? '')
              .where((d) => d.isNotEmpty)
              .toList();
        }
        // Try splitting by numbered list (1., 2., 3.)
        else if (fullText.contains(RegExp(r'^\d+[\.\)]\s', multiLine: true))) {
          final pattern = RegExp(r'^\d+[\.\)]\s*(.+?)(?=^\d+[\.\)]\s|$)', dotAll: true, multiLine: true);
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

        // Clean up each description
        descriptions = descriptions.map((desc) {
          String cleaned = desc;
          cleaned = cleaned.replaceAll(RegExp(r'^\*\*[^*]+\*\*\s*', multiLine: true), '');
          cleaned = cleaned.replaceAll(RegExp(r'\*\*(?:Project )?Description[^*]*\*\*\s*'), '');
          cleaned = cleaned.replaceAll(RegExp(r'\*\*'), '');
          cleaned = cleaned.replaceAll(RegExp(r'^[\d#]+[\.\)\:]\s*'), '');
          cleaned = cleaned.replaceAll(RegExp(r'^(?:Option|Description)\s*\d+:\s*', caseSensitive: false), '');
          cleaned = cleaned.replaceAll(RegExp(r'^\n+'), '');
          return cleaned.trim();
        }).where((d) => d.isNotEmpty).toList();

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
      setState(() {
        _isGeneratingAI = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to generate AI description: $e'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    }
  }

  void _showDescriptionSelectionDialog(List<String> descriptions) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    final surfaceColor = isDarkMode ? const Color(0xFF1E1E1E) : Colors.white;
    final textColor = isDarkMode ? Colors.white : Colors.black87;
    final subtitleColor = isDarkMode ? Colors.white70 : Colors.black54;

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
                      'Select Description',
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
                            final length = _descriptionController.document.length;
                            _descriptionController.replaceText(
                              0,
                              length - 1,
                              descriptions[index],
                              TextSelection.collapsed(offset: descriptions[index].length),
                            );
                          });
                          Navigator.pop(context);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Description applied'),
                              backgroundColor: context.primaryColor,
                              duration: Duration(seconds: 2),
                            ),
                          );
                        },
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            border: Border.all(
                              color: isDarkMode
                                  ? Colors.white.withOpacity(0.1)
                                  : Colors.black.withOpacity(0.1),
                            ),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: Colors.teal.withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      'Option ${index + 1}',
                                      style: TextStyle(
                                        color: Colors.teal,
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

  /// Show preview dialog for attached items (notes, events, files)
  void _showAttachmentPreview(AttachmentItem attachment) {
    // For events, show a dialog that fetches full details
    if (attachment.type == AttachmentType.event) {
      _showEventPreviewDialog(attachment);
      return;
    }

    showDialog(
      context: context,
      builder: (context) {
        return Dialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          child: Container(
            constraints: const BoxConstraints(maxWidth: 500, maxHeight: 600),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Header
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: attachment.type.color.withOpacity(0.1),
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(16),
                      topRight: Radius.circular(16),
                    ),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: attachment.type.color.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(
                          attachment.type.icon,
                          color: attachment.type.color,
                          size: 24,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              attachment.name,
                              style: TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 16,
                                color: Theme.of(context).colorScheme.onSurface,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            Text(
                              attachment.type.label,
                              style: TextStyle(
                                color: attachment.type.color,
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: () => Navigator.of(context).pop(),
                        icon: Icon(
                          Icons.close,
                          color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                        ),
                      ),
                    ],
                  ),
                ),

                // Content
                Flexible(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: _buildAttachmentContent(attachment),
                  ),
                ),

              ],
            ),
          ),
        );
      },
    );
  }

  /// Show event preview dialog with full details fetched from API
  void _showEventPreviewDialog(AttachmentItem attachment) {
    EventPreviewDialog.show(
      context,
      eventId: attachment.id,
      eventName: attachment.name,
      workspaceId: _workspaceService.currentWorkspace?.id ?? '',
      calendarApi: _calendarApi,
    );
  }

  /// Build content based on attachment type
  Widget _buildAttachmentContent(AttachmentItem attachment) {
    switch (attachment.type) {
      case AttachmentType.note:
        return _buildNotePreviewContent(attachment);
      case AttachmentType.event:
        // Events are now shown in EventPreviewDialog via _showEventPreviewDialog
        return const SizedBox.shrink();
      case AttachmentType.file:
        return _buildFilePreviewContent(attachment);
    }
  }

  Widget _buildNotePreviewContent(AttachmentItem attachment) {
    // When adding via /mention, we have content. When loading from saved project, we don't.
    final content = attachment.metadata?['content'];
    final icon = attachment.metadata?['icon'] ?? '📝';
    final updatedAt = attachment.metadata?['updated_at'];
    final noteId = attachment.id;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Note icon and title
        Row(
          children: [
            Text(
              icon.toString(),
              style: const TextStyle(fontSize: 24),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                attachment.name,
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 16,
                  color: Theme.of(context).colorScheme.onSurface,
                ),
              ),
            ),
          ],
        ),

        // Last updated
        if (updatedAt != null) ...[
          const SizedBox(height: 12),
          _buildDetailRow(
            Icons.update,
            'Last Updated',
            _formatDateTime(updatedAt),
          ),
        ],

        // Show content if available (when adding via /mention)
        if (content != null && content.toString().isNotEmpty) ...[
          const SizedBox(height: 16),
          Text(
            'Content Preview',
            style: TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 14,
              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.7),
            ),
          ),
          const SizedBox(height: 8),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.05),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              _parseHtmlContent(content.toString()),
              style: TextStyle(
                color: Theme.of(context).colorScheme.onSurface,
                fontSize: 14,
                height: 1.5,
              ),
              maxLines: 10,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],

        const SizedBox(height: 16),

        // Open Note Button
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: () => _openNoteEditor(noteId, attachment.name, icon.toString()),
            icon: const Icon(Icons.open_in_new, size: 18),
            label: const Text('Open Note'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
        ),
      ],
    );
  }

  /// Opens the note in the NoteEditorScreen
  Future<void> _openNoteEditor(String noteId, String noteTitle, String noteIcon) async {
    // Close the preview dialog first
    Navigator.of(context).pop();

    // Fetch full note data from API
    try {
      final workspaceId = _workspaceService.currentWorkspace?.id;
      if (workspaceId == null) return;

      final response = await _notesApi.getNote(workspaceId, noteId);
      if (response.isSuccess && response.data != null) {
        final apiNote = response.data!;

        // Convert API Note to note.dart Note
        final note = Note(
          id: apiNote.id,
          parentId: apiNote.parentId,
          title: apiNote.title,
          description: '',
          content: apiNote.content ?? '',
          icon: noteIcon,
          categoryId: apiNote.category ?? 'work',
          subcategory: '',
          keywords: apiNote.tags ?? [],
          isFavorite: apiNote.isFavorite,
          isTemplate: false,
          isDeleted: apiNote.deletedAt != null,
          createdBy: apiNote.authorId,
          collaborators: [],
          activities: [],
          createdAt: apiNote.createdAt,
          updatedAt: apiNote.updatedAt,
        );

        // Navigate to note editor
        if (mounted) {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (context) => NoteEditorScreen(
                note: note,
                initialMode: NoteEditorMode.edit,
              ),
            ),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Failed to load note'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error opening note: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Widget _buildDetailRow(IconData icon, String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(
          icon,
          size: 18,
          color: Colors.green,
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                  fontSize: 12,
                ),
              ),
              Text(
                value,
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurface,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildFilePreviewContent(AttachmentItem attachment) {
    final size = attachment.metadata?['size'] ?? 'Unknown size';
    final mimeType = attachment.metadata?['mime_type'] ?? 'Unknown type';
    final url = attachment.metadata?['url'];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildFileDetailRow('Size', size.toString()),
        const SizedBox(height: 8),
        _buildFileDetailRow('Type', mimeType.toString()),
        if (url != null && mimeType.toString().startsWith('image/')) ...[
          const SizedBox(height: 16),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Image.network(
              url.toString(),
              height: 200,
              width: double.infinity,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) {
                return Container(
                  height: 100,
                  color: Colors.grey.shade200,
                  child: const Center(
                    child: Icon(Icons.broken_image, color: Colors.grey),
                  ),
                );
              },
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildFileDetailRow(String label, String value) {
    return Row(
      children: [
        Text(
          '$label: ',
          style: TextStyle(
            color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
            fontSize: 13,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            color: Theme.of(context).colorScheme.onSurface,
            fontSize: 13,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  String _formatDateTime(String isoString) {
    try {
      final date = DateTime.parse(isoString).toLocal();
      return '${date.day}/${date.month}/${date.year} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
    } catch (e) {
      return isoString;
    }
  }

  /// Parse HTML content and return plain text with entities decoded
  String _parseHtmlContent(String htmlContent) {
    try {
      final document = html_parser.parse(htmlContent);
      return document.body?.text ?? htmlContent;
    } catch (e) {
      // Fallback: just strip HTML tags with regex
      return htmlContent.replaceAll(RegExp(r'<[^>]*>'), '');
    }
  }

  void _createProject() async {
    try {
      final projectService = ProjectService.instance;

      // Convert status columns to kanban_stages format
      final kanbanStages = _statusColumns.asMap().entries.map((entry) {
        final index = entry.key;
        final column = entry.value;
        // Convert Color to hex string (e.g., #FF0000 for red)
        final colorHex = '#${column.color.value.toRadixString(16).padLeft(8, '0').substring(2).toUpperCase()}';
        return {
          'id': '${index + 1}',
          'name': column.name,
          'order': index,
          'color': colorHex,
        };
      }).toList();

      // Organize description attachments by type for top-level attachments field
      // Backend expects arrays of UUIDs only, not full objects
      final noteAttachmentIds = descriptionAttachments
          .where((a) => a['type'] == 'note')
          .map((a) => a['id'] as String)
          .toList();
      final eventAttachmentIds = descriptionAttachments
          .where((a) => a['type'] == 'event')
          .map((a) => a['id'] as String)
          .toList();
      final fileAttachmentIds = descriptionAttachments
          .where((a) => a['type'] == 'file')
          .map((a) => a['id'] as String)
          .toList();

      // Top-level attachments payload - only UUIDs as per backend DTO
      final attachmentsPayload = {
        'file_attachment': fileAttachmentIds,
        'note_attachment': noteAttachmentIds,
        'event_attachment': eventAttachmentIds,
      };

      // Build collaborative_data for other data like default assignees
      final collaborativeData = {
        'default_assignees': _selectedTeamMembers,
      };

      // Convert Quill delta to HTML for description
      final delta = _descriptionController.document.toDelta();
      final converter = QuillDeltaToHtmlConverter(
        delta.toJson(),
        ConverterOptions(),
      );
      final descriptionHtml = converter.convert();

      final project = await projectService.createProject(
        workspaceId: await AppConfig.getCurrentWorkspaceId(),
        name: _projectNameController.text,
        description: descriptionHtml,
        type: _selectedType,
        priority: 'medium',
        leadId: _selectedProjectLeadId,
        kanbanStages: kanbanStages,
        collaborativeData: collaborativeData,
        attachments: attachmentsPayload,
      );

      if (mounted) {
        Navigator.pop(context, project);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to create project: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }
}