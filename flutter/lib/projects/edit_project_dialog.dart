import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter_quill/flutter_quill.dart';
import 'package:flutter_quill_delta_from_html/flutter_quill_delta_from_html.dart';
import 'package:vsc_quill_delta_to_html/vsc_quill_delta_to_html.dart';
import 'dart:convert';
import 'dart:math' as math;
import 'package:html/parser.dart' as html_parser;
import '../models/project.dart';
import '../models/calendar_event.dart';
import '../services/project_service.dart';
import '../services/workspace_service.dart';
import '../services/file_service.dart';
import '../api/services/workspace_api_service.dart';
import '../api/services/notes_api_service.dart' as notes_api;
import '../api/services/calendar_api_service.dart' as calendar_api;
import '../models/file/file.dart' as file_model;
import '../api/services/ai_api_service.dart';
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

class EditProjectScreen extends StatefulWidget {
  final Project project;

  const EditProjectScreen({super.key, required this.project});

  @override
  State<EditProjectScreen> createState() => _EditProjectScreenState();
}

class _EditProjectScreenState extends State<EditProjectScreen>
    with TickerProviderStateMixin {
  final _projectNameController = TextEditingController();
  late QuillController _descriptionController;
  final FocusNode _descriptionFocusNode = FocusNode();
  final ScrollController _descriptionScrollController = ScrollController();
  final _formKey = GlobalKey<FormState>();

  int _currentStep = 0;
  String _selectedProjectTypeId = 'kanban';
  String _selectedType = 'kanban';
  final List<String> _selectedTeamMembers = [];
  String? _selectedProjectLeadId;
  List<WorkspaceMember> _workspaceMembers = [];
  List<WorkspaceMember> _filteredWorkspaceMembers = [];
  final TextEditingController _memberSearchController = TextEditingController();
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
  List<Map<String, dynamic>> descriptionAttachments = [];

  // AI generation state and animation
  bool _isGeneratingAI = false;
  late AnimationController _animationController;
  late Animation<double> _borderAnimation;
  final AIApiService _aiService = AIApiService();

  // Status columns configuration - will be loaded from project kanban_stages
  List<StatusColumn> _statusColumns = [];

  @override
  void initState() {
    super.initState();
    // Initialize with existing project data
    _projectNameController.text = widget.project.name;

    // Initialize QuillController with HTML to Delta conversion
    final initialContent = widget.project.description ?? '';
    if (initialContent.isNotEmpty) {
      try {
        // Convert HTML to Quill Delta format to preserve formatting
        final delta = HtmlToDelta().convert(initialContent);
        _descriptionController = QuillController(
          document: Document.fromJson(delta.toJson()),
          selection: const TextSelection.collapsed(offset: 0),
        );
      } catch (e) {
        // If HTML conversion fails, initialize with empty document
        _descriptionController = QuillController.basic();
      }
    } else {
      _descriptionController = QuillController.basic();
    }

    _selectedType = widget.project.type;
    _selectedProjectTypeId = widget.project.type;

    // Initialize status columns from project's kanban stages
    _loadKanbanStages();

    // Initialize project lead and team members from collaborative_data
    if (widget.project.collaborativeData.isNotEmpty) {
      // Load project lead
      if (widget.project.collaborativeData.containsKey('project_lead')) {
        _selectedProjectLeadId = widget.project.collaborativeData['project_lead'] as String?;
      }

      // Load team members (default assignees)
      if (widget.project.collaborativeData.containsKey('default_assignee_ids')) {
        final assigneeIds = widget.project.collaborativeData['default_assignee_ids'];
        if (assigneeIds is List) {
          _selectedTeamMembers.addAll(assigneeIds.map((id) => id.toString()));
        }
      }
    }

    // Load existing attachments from top-level attachments field
    _loadExistingAttachments();

    // Listen to description changes for / mentions
    _descriptionController.addListener(_onDescriptionChange);

    // Load workspace members
    _loadWorkspaceMembers();

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

  void _loadKanbanStages() {
    if (widget.project.kanbanStages.isNotEmpty) {
      _statusColumns = widget.project.kanbanStages.map((stage) {
        return StatusColumn(
          name: stage.name,
          color: _parseColor(stage.color),
        );
      }).toList();
    } else {
      // Default status columns if none exist
      _statusColumns = [
        StatusColumn(name: 'projects.default_todo'.tr(), color: Colors.blue),
        StatusColumn(name: 'projects.default_in_progress'.tr(), color: Colors.orange),
        StatusColumn(name: 'projects.default_done'.tr(), color: Colors.green),
      ];
    }
  }

  Color _parseColor(String hexColor) {
    try {
      // Remove # if present
      String colorStr = hexColor.replaceAll('#', '');
      // If 6 characters, add FF for alpha
      if (colorStr.length == 6) {
        colorStr = 'FF$colorStr';
      }
      return Color(int.parse(colorStr, radix: 16));
    } catch (e) {
      return Colors.blue; // Default fallback color
    }
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
          _filteredWorkspaceMembers = response.data!;
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

  void _filterMembers(String query) {
    setState(() {
      if (query.isEmpty) {
        _filteredWorkspaceMembers = _workspaceMembers;
      } else {
        final lowercaseQuery = query.toLowerCase();
        _filteredWorkspaceMembers = _workspaceMembers.where((member) {
          final name = member.name?.toLowerCase() ?? '';
          final email = member.email.toLowerCase();
          return name.contains(lowercaseQuery) || email.contains(lowercaseQuery);
        }).toList();
      }
    });
  }

  // Load existing attachments from project's top-level attachments field
  void _loadExistingAttachments() {
    final attachments = widget.project.attachments;

    if (attachments.isNotEmpty) {
      // Load note attachments
      // Backend returns: id, title, icon, updated_at (no content)
      if (attachments['note_attachment'] is List) {
        for (var note in attachments['note_attachment']) {
          if (note is Map) {
            descriptionAttachments.add({
              'id': note['id'] ?? '',
              'name': note['name'] ?? note['title'] ?? 'Note',
              'type': 'note',
              'icon': note['icon'] ?? '📝',
              'updated_at': note['updated_at'],
            });
          } else if (note is String) {
            // Handle legacy string ID format
            descriptionAttachments.add({
              'id': note,
              'name': 'Note ${note.substring(0, note.length > 8 ? 8 : note.length)}',
              'type': 'note',
              'icon': '📝',
            });
          }
        }
      }

      // Load event attachments
      // Backend returns: id, title, start_time, end_time, location (no description, attendees)
      if (attachments['event_attachment'] is List) {
        for (var event in attachments['event_attachment']) {
          if (event is Map) {
            descriptionAttachments.add({
              'id': event['id'] ?? '',
              'name': event['name'] ?? event['title'] ?? 'Event',
              'type': 'event',
              'start_time': event['start_time'],
              'end_time': event['end_time'],
              'location': event['location'],
            });
          } else if (event is String) {
            // Handle legacy string ID format
            descriptionAttachments.add({
              'id': event,
              'name': 'Event ${event.substring(0, event.length > 8 ? 8 : event.length)}',
              'type': 'event',
            });
          }
        }
      }

      // Load file attachments
      // Backend returns: id, name, type (mime_type), size, url
      if (attachments['file_attachment'] is List) {
        for (var file in attachments['file_attachment']) {
          if (file is Map) {
            descriptionAttachments.add({
              'id': file['id'] ?? '',
              'name': file['name'] ?? 'File',
              'type': 'file',
              'size': file['size'],
              'url': file['url'],
              'mime_type': file['type'] ?? file['mime_type'],
            });
          } else if (file is String) {
            // Handle legacy string ID format
            descriptionAttachments.add({
              'id': file,
              'name': 'File ${file.substring(0, file.length > 8 ? 8 : file.length)}',
              'type': 'file',
            });
          }
        }
      }
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
    if (_availableEvents.isNotEmpty) return;

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
    if (_availableFiles.isNotEmpty) return;

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

    if (cursorPosition > 0 && cursorPosition <= text.length && text[cursorPosition - 1] == '/') {
      setState(() {
        _slashSymbolPosition = cursorPosition - 1;
        _showMentionSuggestions = true;
      });
      _loadEventsForMention();
      _loadFilesForMention();
    } else if (_showMentionSuggestions && _slashSymbolPosition >= 0) {
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
    final alreadyAttached = descriptionAttachments.any((a) => a['id'] == note.id && a['type'] == 'note');
    if (alreadyAttached) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Note "${note.title}" is already attached'),
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
      descriptionAttachments.add({
        'id': note.id,
        'name': note.title,
        'type': 'note',
        'content': note.content,
      });

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
        content: Text('Note "${note.title}" attached'),
        backgroundColor: Colors.green,
      ),
    );
  }

  // Insert event reference into description
  void _insertEventReference(CalendarEvent event) {
    final alreadyAttached = descriptionAttachments.any((a) => a['id'] == event.id && a['type'] == 'event');
    if (alreadyAttached) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Event "${event.title}" is already attached'),
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
        content: Text('Event "${event.title}" attached'),
        backgroundColor: Colors.green,
      ),
    );
  }

  // Insert file reference into description
  void _insertFileReference(file_model.File file) {
    final alreadyAttached = descriptionAttachments.any((a) => a['id'] == file.id && a['type'] == 'file');
    if (alreadyAttached) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('File "${file.name}" is already attached'),
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
      descriptionAttachments.add({
        'id': file.id,
        'name': file.name,
        'type': 'file',
        'size': file.size,
        'storage_path': file.storagePath,
        'mime_type': file.mimeType,
        'url': file.url,
      });

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
        content: Text('File "${file.name}" attached'),
        backgroundColor: Colors.green,
      ),
    );
  }

  @override
  void dispose() {
    _projectNameController.dispose();
    _descriptionController.removeListener(_onDescriptionChange);
    _descriptionController.dispose();
    _descriptionFocusNode.dispose();
    _descriptionScrollController.dispose();
    _memberSearchController.dispose();
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        systemOverlayStyle: SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness: isDarkMode ? Brightness.light : Brightness.dark,
          statusBarBrightness: isDarkMode ? Brightness.dark : Brightness.light,
        ),
        leading: IconButton(
          icon: Icon(
            Icons.close,
            color: Theme.of(context).colorScheme.onSurface,
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'projects.edit_project'.tr(),
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
                  'projects.update_settings_desc'.tr(),
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
                  onPressed: _currentStep < 3 ? () {
                    setState(() {
                      _currentStep++;
                    });
                  } : _updateProject,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF215AD5),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(5),
                    ),
                  ),
                  child: Text(_currentStep < 3 ? 'common.next'.tr() : 'projects.update_project'.tr()),
                ),
              ],
            ),
          ),
          ],
        ),
      ),
    );
  }

  Widget _buildStepIndicator() {
    final steps = ['projects.basic_info'.tr(), 'projects.type_settings'.tr(), 'projects.status_columns'.tr(), 'projects.team_review'.tr()];

    return Row(
      children: List.generate(steps.length, (index) {
        final isActive = index == _currentStep;
        final isCompleted = index < _currentStep;

        return Expanded(
          child: Column(
            children: [
              Row(
                children: [
                  if (index > 0)
                    Expanded(
                      child: Container(
                        height: 2,
                        color: isCompleted
                            ? context.primaryColor
                            : Theme.of(context).colorScheme.onSurface.withOpacity(0.1),
                      ),
                    ),
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: isActive || isCompleted
                          ? context.primaryColor
                          : Theme.of(context).colorScheme.onSurface.withOpacity(0.1),
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: isCompleted
                          ? Icon(Icons.check, color: Colors.white, size: 16)
                          : Text(
                              '${index + 1}',
                              style: TextStyle(
                                color: isActive
                                    ? Colors.white
                                    : Theme.of(context).colorScheme.onSurface.withOpacity(0.4),
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                    ),
                  ),
                  if (index < steps.length - 1)
                    Expanded(
                      child: Container(
                        height: 2,
                        color: isCompleted
                            ? context.primaryColor
                            : Theme.of(context).colorScheme.onSurface.withOpacity(0.1),
                      ),
                    ),
                ],
              ),
              SizedBox(height: 8),
              Text(
                steps[index],
                style: TextStyle(
                  color: isActive
                      ? Theme.of(context).colorScheme.onSurface
                      : Theme.of(context).colorScheme.onSurface.withOpacity(0.4),
                  fontSize: 12,
                  fontWeight: isActive ? FontWeight.w600 : FontWeight.w400,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        );
      }),
    );
  }

  Widget _buildStepContent() {
    switch (_currentStep) {
      case 0:
        return _buildBasicInfoStep();
      case 1:
        return _buildProjectTypeStep();
      case 2:
        return _buildStatusColumnsStep();
      case 3:
        return _buildTeamMembersAndReviewStep();
      default:
        return _buildBasicInfoStep();
    }
  }

  Widget _buildBasicInfoStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'projects.basic_information'.tr(),
              style: TextStyle(
                color: Theme.of(context).colorScheme.onSurface,
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            SizedBox(height: 8),
            Text(
              'projects.update_basic_details'.tr(),
              style: TextStyle(
                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                fontSize: 14,
              ),
            ),
            SizedBox(height: 32),

            // Project Name
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
                        color: Theme.of(context).colorScheme.primary,
                      ),
                    ),
                  ),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'projects.please_enter_name'.tr();
                    }
                    return null;
                  },
                ),
              ],
            ),

            SizedBox(height: 24),

            // Description
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

                // Mention suggestions (show when / is typed)
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

  Widget _buildProjectTypeStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'projects.project_type'.tr(),
            style: TextStyle(
              color: Theme.of(context).colorScheme.onSurface,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          SizedBox(height: 8),
          Text(
            'projects.choose_methodology'.tr(),
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
                  child: Icon(icon, color: cardColor, size: 22),
                ),
                SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.onSurface,
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        description,
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
                if (isSelected)
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: context.primaryColor,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      Icons.check,
                      color: Colors.white,
                      size: 16,
                    ),
                  ),
              ],
            ),
            SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: features.map((feature) {
                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: cardColor.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    feature,
                    style: TextStyle(
                      color: cardColor,
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                );
              }).toList(),
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
                              final isSelected = column.color.value == color.value;
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
                      SizedBox(height: 8),
                      Container(
                        height: 40,
                        decoration: BoxDecoration(
                          color: column.color.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Center(
                          child: Text(
                            'Tasks',
                            style: TextStyle(
                              color: column.color,
                              fontSize: 10,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ),

          SizedBox(height: 24),

          // Info card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: context.primaryColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: context.primaryColor.withOpacity(0.2),
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.info_outline,
                  color: context.primaryColor,
                  size: 20,
                ),
                SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'projects.columns_workflow_info'.tr(),
                    style: TextStyle(
                      color: context.primaryColor,
                      fontSize: 13,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
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
            'projects.update_team_review'.tr(),
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
            controller: _memberSearchController,
            onChanged: _filterMembers,
            decoration: InputDecoration(
              hintText: 'projects.search_team_members'.tr(),
              hintStyle: TextStyle(
                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.4),
              ),
              prefixIcon: Icon(
                Icons.search,
                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.4),
              ),
              suffixIcon: _memberSearchController.text.isNotEmpty
                  ? IconButton(
                      icon: Icon(
                        Icons.clear,
                        color: Theme.of(context).colorScheme.onSurface.withOpacity(0.4),
                      ),
                      onPressed: () {
                        _memberSearchController.clear();
                        _filterMembers('');
                      },
                    )
                  : null,
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
          else if (_filteredWorkspaceMembers.isEmpty)
            Center(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Text(
                  'projects.no_members_match'.tr(),
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                    fontSize: 14,
                  ),
                ),
              ),
            )
          else
            ..._filteredWorkspaceMembers.map((member) => _buildTeamMemberItem(member)),

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
                              member.role.value.toUpperCase(),
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
                _buildReviewItem('projects.type'.tr(), _getProjectTypeDisplayName(_selectedProjectTypeId)),
                _buildReviewItem('projects.status_columns'.tr(), 'projects.columns_configured'.tr(args: ['${_statusColumns.length}'])),
                if (_descriptionController.document.toPlainText().trim().isNotEmpty)
                  _buildReviewItem('projects.description'.tr(), _descriptionController.document.toPlainText()),
                _buildReviewItem(
                  'projects.project_lead'.tr(),
                  _selectedProjectLeadId != null && _workspaceMembers.isNotEmpty
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
                      member.role.value.toUpperCase(),
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

  String _getProjectTypeDisplayName(String typeId) {
    switch (typeId) {
      case 'kanban':
        return 'Kanban Board';
      case 'scrum':
        return 'Scrum Board';
      case 'bug_tracking':
        return 'Bug Tracking';
      case 'feature':
        return 'Feature Development';
      case 'research':
        return 'Research Project';
      default:
        return typeId.toUpperCase();
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
    // Backend returns: id, title, icon, updated_at (no content)
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
          color: Colors.orange,
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

  void _updateProject() async {
    try {
      final projectService = ProjectService.instance;

      // Separate attachments by type - backend expects arrays of UUIDs only
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

      // Build collaborative_data object (without attachments - they go at top level)
      final collaborativeData = {
        if (_selectedProjectLeadId != null)
          'project_lead': _selectedProjectLeadId,
        'default_assignee_ids': _selectedTeamMembers,
      };

      // Build attachments at top level - only UUIDs as per backend DTO
      final attachmentsPayload = {
        'file_attachment': fileAttachmentIds,
        'note_attachment': noteAttachmentIds,
        'event_attachment': eventAttachmentIds,
      };

      // Convert status columns to kanban_stages format
      final kanbanStages = _statusColumns.asMap().entries.map((entry) {
        final index = entry.key;
        final column = entry.value;
        final colorHex = '#${column.color.value.toRadixString(16).padLeft(8, '0').substring(2).toUpperCase()}';
        return {
          'id': '${index + 1}',
          'name': column.name,
          'order': index,
          'color': colorHex,
        };
      }).toList();

      // Convert Quill delta to HTML for description
      final delta = _descriptionController.document.toDelta();
      final converter = QuillDeltaToHtmlConverter(
        delta.toJson(),
        ConverterOptions(),
      );
      final descriptionHtml = converter.convert();

      // Create update map
      final updates = <String, dynamic>{
        'name': _projectNameController.text.trim(),
        'description': descriptionHtml,
        'type': _selectedType,
        'collaborative_data': collaborativeData,
        'attachments': attachmentsPayload,
        'kanban_stages': kanbanStages,
      };


      final updatedProject = await projectService.updateProject(widget.project.id, updates);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                Icon(Icons.check_circle, color: Colors.white, size: 20),
                SizedBox(width: 8),
                Text('projects.project_updated'.tr()),
              ],
            ),
            backgroundColor: context.primaryColor,
          ),
        );
        Navigator.pop(context, updatedProject);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('projects.failed_to_update'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }
}
