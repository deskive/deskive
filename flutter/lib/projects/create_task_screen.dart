import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter_quill/flutter_quill.dart';
import 'package:vsc_quill_delta_to_html/vsc_quill_delta_to_html.dart';
import 'package:easy_localization/easy_localization.dart';
import 'dart:io';
import 'dart:convert';
import 'dart:math' as math;
import '../models/task.dart';
import '../models/project.dart';
import '../services/project_service.dart';
import '../api/services/ai_api_service.dart';
import '../notes/notes_service.dart';
import '../notes/note.dart' as notes_model;
import '../models/calendar_event.dart';
import '../api/services/calendar_api_service.dart' as calendar_api;
import '../api/services/notes_api_service.dart' as notes_api;
import '../api/services/workspace_api_service.dart';
import '../api/services/project_api_service.dart' hide Project, Task;
import '../services/workspace_service.dart';
import '../services/file_service.dart';
import '../models/file/file.dart' as file_model;
import '../theme/app_theme.dart';
import '../widgets/mention_suggestion_widget.dart';
import '../widgets/attachment_display_widget.dart';
import '../widgets/ai_description_button.dart';

class CreateTaskScreen extends StatefulWidget {
  final String projectId;

  const CreateTaskScreen({
    super.key,
    required this.projectId,
  });

  @override
  State<CreateTaskScreen> createState() => _CreateTaskScreenState();
}

class _CreateTaskScreenState extends State<CreateTaskScreen>
    with TickerProviderStateMixin {
  late TabController _tabController;
  final _titleController = TextEditingController();
  late QuillController _quillController;
  final FocusNode _quillFocusNode = FocusNode();
  final ScrollController _quillScrollController = ScrollController();
  final _estimatedHoursController = TextEditingController(text: '0');
  final _actualHoursController = TextEditingController(text: '0');
  final _storyPointsController = TextEditingController(text: '0');
  final _formKey = GlobalKey<FormState>();

  String _selectedType = 'task';
  String _selectedPriority = 'medium';
  String _selectedStatus = 'To Do'; // Will be set from kanban stages
  DateTime? _dueDate;
  List<String> _selectedAssigneeIds = []; // Multiple assignees support
  double _estimatedHours = 0;
  double _actualHours = 0;
  int _storyPoints = 0;
  String? _parentTaskId;

  // File attachments
  final List<TaskAttachment> _attachments = [];
  final ImagePicker _imagePicker = ImagePicker();

  // Services for @ mention and workspace members
  final NotesService _notesService = NotesService();
  final calendar_api.CalendarApiService _calendarApi = calendar_api.CalendarApiService();
  final AIApiService _aiService = AIApiService();
  final WorkspaceService _workspaceService = WorkspaceService.instance;
  final FileService _fileService = FileService.instance;
  final WorkspaceApiService _workspaceApiService = WorkspaceApiService();
  final ProjectApiService _projectApiService = ProjectApiService();

  // Notes data for @ import functionality
  final List<Note> _availableNotes = [
    Note(id: '1', title: 'Meeting Notes - Sprint Planning', content: 'Discussed user stories for next sprint. Key priorities: login system, dashboard improvements, and bug fixes.'),
    Note(id: '2', title: 'Research Notes - UI Framework', content: 'Evaluated different UI frameworks. Flutter provides excellent cross-platform compatibility and performance.'),
    Note(id: '3', title: 'Bug Investigation Notes', content: 'Found issue in authentication module. Root cause: incorrect token validation. Solution: update JWT middleware.'),
    Note(id: '4', title: 'Client Feedback', content: 'Client requested changes to navigation flow. Users prefer side drawer over bottom navigation for desktop version.'),
    Note(id: '5', title: 'Performance Optimization', content: 'Database queries taking too long. Consider adding indexes on frequently queried columns and implementing caching.'),
  ];

  // / mention functionality (triggered by /)
  List<notes_api.Note> _availableNotesFromService = [];
  List<CalendarEvent> _availableEvents = [];
  List<file_model.File> _availableFiles = [];
  bool _showMentionSuggestions = false;
  int _slashSymbolPosition = -1;
  List<Map<String, dynamic>> _linkedItems = []; // For storing linked notes, events, files

  // Workspace members for assignee selection
  List<WorkspaceMember> _workspaceMembers = [];
  bool _isLoadingMembers = false;

  // AI generation state and animation
  bool _isGeneratingAI = false;
  late AnimationController _aiAnimationController;
  late Animation<double> _aiBorderAnimation;

  final List<String> _taskTypes = ['task', 'bug', 'story', 'epic', 'subtask', 'feature_request'];
  final List<String> _priorities = ['low', 'medium', 'high'];

  // Status list is dynamically loaded from project's kanban stages
  List<String> get _statusList {
    if (_project != null && _project!.kanbanStages.isNotEmpty) {
      return _project!.kanbanStages.map((stage) => stage.name).toList();
    }
    // Fallback to default stages if project not loaded
    return ['To Do', 'In Progress', 'Done'];
  }

  bool _isLoadingProject = true;
  Project? _project;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _quillController = QuillController.basic();
    _loadProject(); // This will also load workspace members after project loads

    // DO NOT load dummy notes from NotesService - only use API notes
    // Initialize empty list - will be populated from API
    _availableNotesFromService = [];

    // Add listener for / mention functionality
    _quillController.addListener(_onDescriptionChange);

    // Load notes from API when component initializes
    _loadNotesFromAPI();

    // Initialize animation controller for AI generation border effect
    _aiAnimationController = AnimationController(
      duration: const Duration(milliseconds: 2000),
      vsync: this,
    );
    _aiBorderAnimation = CurvedAnimation(
      parent: _aiAnimationController,
      curve: Curves.linear,
    );
  }

  // Convert Quill Delta to HTML
  String _getDescriptionAsHtml() {
    final delta = _quillController.document.toDelta();
    final converter = QuillDeltaToHtmlConverter(
      delta.toJson().cast<Map<String, dynamic>>(),
      ConverterOptions.forEmail(),
    );
    return converter.convert();
  }

  Future<void> _loadNotesFromAPI() async {
    try {
      final workspaceId = _workspaceService.currentWorkspace?.id;
      if (workspaceId == null) {
        return;
      }


      // Use the NotesApiService to fetch notes
      final notes_api.NotesApiService notesApi = notes_api.NotesApiService();
      final response = await notesApi.getNotes(workspaceId);


      if (response.isSuccess && response.data != null) {
        setState(() {
          _availableNotesFromService = response.data!;
        });

      } else {
      }
    } catch (e, stackTrace) {
    }
  }

  Future<void> _loadProject() async {
    try {
      final projectService = ProjectService.instance;
      final project = await projectService.getProject(widget.projectId);

      if (project != null && mounted) {
        setState(() {
          _project = project;
          _isLoadingProject = false;
          // Set the initial status from the first kanban stage
          if (project.kanbanStages.isNotEmpty) {
            _selectedStatus = project.kanbanStages.first.name;
          }
        });


        // Load workspace members after project is loaded (for filtering by project members)
        _loadWorkspaceMembers();
      } else {
        setState(() {
          _isLoadingProject = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoadingProject = false;
        });
      }
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

      // Fetch actual project members from the API instead of filtering workspace members
      final response = await _projectApiService.getProjectMembers(
        currentWorkspace.id,
        widget.projectId,
      );

      if (response.isSuccess && response.data != null) {
        // Convert ProjectMemberResponse to WorkspaceMember for UI compatibility
        final projectMembers = response.data!;
        final workspaceMembers = projectMembers.map((pm) {
          return WorkspaceMember(
            id: pm.id,
            userId: pm.userId,
            workspaceId: currentWorkspace.id,
            role: _mapProjectRoleToWorkspaceRole(pm.role),
            permissions: [],
            email: pm.user?.email ?? '',
            name: pm.user?.name,
            avatar: pm.user?.avatarUrl,
            isActive: true,
            joinedAt: pm.joinedAt,
          );
        }).toList();

        setState(() {
          _workspaceMembers = workspaceMembers;
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

  /// Map project role to workspace role for UI display
  WorkspaceRole _mapProjectRoleToWorkspaceRole(String projectRole) {
    switch (projectRole.toLowerCase()) {
      case 'admin':
        return WorkspaceRole.admin;
      case 'lead':
        return WorkspaceRole.admin;
      case 'owner':
        return WorkspaceRole.owner;
      case 'viewer':
        return WorkspaceRole.viewer;
      default:
        return WorkspaceRole.member;
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
              attendees: [],
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
    final text = _quillController.document.toPlainText();
    final selection = _quillController.selection;
    final cursorPosition = selection.baseOffset;

    if (cursorPosition > 0 && text.length >= cursorPosition && text[cursorPosition - 1] == '/') {
      setState(() {
        _slashSymbolPosition = cursorPosition - 1;
        _showMentionSuggestions = true;
      });

      // Load events and files if not already loaded
      if (_availableEvents.isEmpty) {
        _loadEventsForMention();
      }
      if (_availableFiles.isEmpty) {
        _loadFilesForMention();
      }
    } else if (_showMentionSuggestions) {
      // Check if / was deleted
      if (cursorPosition <= _slashSymbolPosition || !text.contains('/')) {
        setState(() {
          _showMentionSuggestions = false;
          _slashSymbolPosition = -1;
        });
      }
    }
  }

  // Insert note reference
  void _insertNoteReference(notes_api.Note note) {
    // Check if already attached
    final alreadyAttached = _linkedItems.any((a) => a['id'] == note.id && a['type'] == 'note');
    if (alreadyAttached) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('tasks.already_attached'.tr(args: ['Note', note.title])), backgroundColor: Colors.orange),
      );
      setState(() {
        _showMentionSuggestions = false;
        _slashSymbolPosition = -1;
      });
      return;
    }

    setState(() {
      _linkedItems.add({
        'id': note.id,
        'name': note.title,
        'type': 'note',
        'content': note.content,
      });

      // Remove / from description using QuillController
      if (_slashSymbolPosition >= 0) {
        _quillController.document.delete(_slashSymbolPosition, 1);
        _quillController.updateSelection(
          TextSelection.collapsed(offset: _slashSymbolPosition),
          ChangeSource.local,
        );
      }

      _showMentionSuggestions = false;
      _slashSymbolPosition = -1;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('tasks.note_attached'.tr(args: [note.title])), backgroundColor: Colors.green),
    );
  }

  // Insert event reference
  void _insertEventReference(CalendarEvent event) {
    // Check if already attached
    final alreadyAttached = _linkedItems.any((a) => a['id'] == event.id && a['type'] == 'event');
    if (alreadyAttached) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('tasks.already_attached'.tr(args: ['Event', event.title])), backgroundColor: Colors.orange),
      );
      setState(() {
        _showMentionSuggestions = false;
        _slashSymbolPosition = -1;
      });
      return;
    }

    setState(() {
      _linkedItems.add({
        'id': event.id,
        'name': event.title,
        'type': 'event',
      });

      // Remove / from description using QuillController
      if (_slashSymbolPosition >= 0) {
        _quillController.document.delete(_slashSymbolPosition, 1);
        _quillController.updateSelection(
          TextSelection.collapsed(offset: _slashSymbolPosition),
          ChangeSource.local,
        );
      }

      _showMentionSuggestions = false;
      _slashSymbolPosition = -1;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('tasks.event_attached'.tr(args: [event.title])), backgroundColor: Colors.green),
    );
  }

  // Insert file reference
  void _insertFileReference(file_model.File file) {
    // Check if already attached
    final alreadyAttached = _linkedItems.any((a) => a['id'] == file.id && a['type'] == 'file');
    if (alreadyAttached) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('tasks.already_attached'.tr(args: ['File', file.name])), backgroundColor: Colors.orange),
      );
      setState(() {
        _showMentionSuggestions = false;
        _slashSymbolPosition = -1;
      });
      return;
    }

    setState(() {
      _linkedItems.add({
        'id': file.id,
        'name': file.name,
        'type': 'file',
      });

      // Remove / from description using QuillController
      if (_slashSymbolPosition >= 0) {
        _quillController.document.delete(_slashSymbolPosition, 1);
        _quillController.updateSelection(
          TextSelection.collapsed(offset: _slashSymbolPosition),
          ChangeSource.local,
        );
      }

      _showMentionSuggestions = false;
      _slashSymbolPosition = -1;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('tasks.file_attached'.tr(args: [file.name])), backgroundColor: Colors.green),
    );
  }

  @override
  void dispose() {
    _tabController.dispose();
    _titleController.dispose();
    _quillController.removeListener(_onDescriptionChange);
    _quillController.dispose();
    _quillFocusNode.dispose();
    _quillScrollController.dispose();
    _estimatedHoursController.dispose();
    _actualHoursController.dispose();
    _storyPointsController.dispose();
    _aiAnimationController.dispose();
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
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'tasks.create_new_task'.tr(),
              style: TextStyle(
                color: Theme.of(context).colorScheme.onSurface,
                fontSize: 20,
                fontWeight: FontWeight.w600,
              ),
            ),
            Text(
              'tasks.add_task_subtitle'.tr(),
              style: TextStyle(
                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                fontSize: 14,
              ),
            ),
          ],
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Tab Bar
            Container(
            margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.05),
              borderRadius: BorderRadius.circular(8),
            ),
            child: TabBar(
              controller: _tabController,
              indicator: BoxDecoration(
                color: const Color(0xFF215AD5),
                borderRadius: BorderRadius.circular(6),
              ),
              labelColor: Colors.white,
              unselectedLabelColor: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
              labelStyle: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
              unselectedLabelStyle: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w400,
              ),
              indicatorSize: TabBarIndicatorSize.tab,
              dividerColor: Colors.transparent,
              tabs: [
                Tab(text: 'tasks.basic_info'.tr()),
                Tab(text: 'tasks.details'.tr()),
                Tab(text: 'tasks.advanced'.tr()),
              ],
            ),
          ),

          // Tab Content
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildBasicInfoTab(),
                _buildDetailsTab(),
                _buildAdvancedTab(),
              ],
            ),
          ),

          // Bottom Actions
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
                  onPressed: _createTask,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF215AD5),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(5),
                    ),
                  ),
                  child: Text('tasks.create_task'.tr()),
                ),
              ],
            ),
          ),
          ],
        ),
      ),
    );
  }

  Widget _buildBasicInfoTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Task Title
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      'tasks.task_title'.tr(),
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
                  controller: _titleController,
                  decoration: InputDecoration(
                    hintText: 'tasks.enter_task_title'.tr(),
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
                      borderSide: const BorderSide(
                        color: Color(0xFF215AD5),
                      ),
                    ),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'tasks.please_enter_title'.tr();
                    }
                    return null;
                  },
                ),
              ],
            ),

            SizedBox(height: 24),

            // Type, Priority, Status Row
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'tasks.type'.tr(),
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.onSurface,
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      SizedBox(height: 8),
                      _buildDropdown(
                        value: _selectedType,
                        items: _taskTypes,
                        onChanged: (value) {
                          setState(() {
                            _selectedType = value!;
                          });
                        },
                        icon: Icons.check,
                        displayNameFormatter: _getTaskTypeDisplayName,
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
                        'tasks.priority'.tr(),
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.onSurface,
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      SizedBox(height: 8),
                      _buildDropdown(
                        value: _selectedPriority,
                        items: _priorities,
                        onChanged: (value) {
                          setState(() {
                            _selectedPriority = value!;
                          });
                        },
                        icon: Icons.remove,
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
                        'tasks.status'.tr(),
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.onSurface,
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      SizedBox(height: 8),
                      _buildDropdown(
                        value: _selectedStatus,
                        items: _statusList,
                        onChanged: (value) {
                          setState(() {
                            _selectedStatus = value!;
                          });
                        },
                        icon: null,
                      ),
                    ],
                  ),
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
                      'tasks.description'.tr(),
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
                // Rich Text Editor with Toolbar - with animated border when AI is generating
                _isGeneratingAI
                    ? AnimatedBuilder(
                        animation: _aiBorderAnimation,
                        builder: (context, child) {
                          return Container(
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(8),
                              gradient: SweepGradient(
                                center: Alignment.center,
                                startAngle: 0,
                                endAngle: math.pi * 2,
                                transform: GradientRotation(_aiBorderAnimation.value * math.pi * 2),
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
                                  controller: _quillController,
                                  config: const QuillSimpleToolbarConfig(
                                    showBoldButton: true,
                                    showItalicButton: true,
                                    showUnderLineButton: true,
                                    showStrikeThrough: true,
                                    showListNumbers: true,
                                    showListBullets: true,
                                    showIndent: true,
                                    showLink: true,
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
                                  controller: _quillController,
                                  focusNode: _quillFocusNode,
                                  scrollController: _quillScrollController,
                                  config: QuillEditorConfig(
                                    placeholder: 'tasks.describe_task_placeholder'.tr(),
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
                          border: Border.all(
                            color: Theme.of(context).colorScheme.onSurface.withOpacity(0.2),
                          ),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Column(
                            children: [
                              // Quill Toolbar
                              Container(
                                decoration: BoxDecoration(
                                  color: Theme.of(context).colorScheme.onSurface.withOpacity(0.05),
                                  borderRadius: const BorderRadius.only(
                                    topLeft: Radius.circular(8),
                                    topRight: Radius.circular(8),
                                  ),
                                ),
                                child: QuillSimpleToolbar(
                                  controller: _quillController,
                                  config: const QuillSimpleToolbarConfig(
                                    showBoldButton: true,
                                    showItalicButton: true,
                                    showUnderLineButton: true,
                                    showStrikeThrough: true,
                                    showListNumbers: true,
                                    showListBullets: true,
                                    showIndent: true,
                                    showLink: true,
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
                                  controller: _quillController,
                                  focusNode: _quillFocusNode,
                                  scrollController: _quillScrollController,
                                  config: QuillEditorConfig(
                                    placeholder: 'tasks.describe_task_placeholder'.tr(),
                                    expands: true,
                                    padding: EdgeInsets.zero,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                // / Mention Suggestions Widget
                if (_showMentionSuggestions)
                  SizedBox(
                    height: 280, // Fixed height for the mention suggestions widget
                    child: MentionSuggestionWidget(
                      notes: _availableNotesFromService,
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

                // Display linked items using AttachmentFieldWidget
                if (_linkedItems.isNotEmpty)
                  AttachmentFieldWidget(
                    attachments: _linkedItems.map((item) => AttachmentItem.fromMap(item)).toList(),
                    onRemoveAttachment: (attachment) {
                      setState(() {
                        _linkedItems.removeWhere(
                          (a) => a['id'] == attachment.id && a['type'] == attachment.type.value,
                        );
                      });
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

  Widget _buildDetailsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Assignees Row
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'tasks.assignees'.tr(),
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurface,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
              SizedBox(height: 8),
              InkWell(
                onTap: () => _showAssigneeSelection(),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.onSurface.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: Theme.of(context).colorScheme.onSurface.withOpacity(0.2),
                    ),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          _getAssigneeDisplayName(),
                          style: TextStyle(
                            color: _selectedAssigneeIds.isNotEmpty
                                ? Theme.of(context).colorScheme.onSurface
                                : Theme.of(context).colorScheme.onSurface.withOpacity(0.4),
                            fontSize: 16,
                          ),
                        ),
                      ),
                      Icon(
                        Icons.arrow_drop_down,
                        color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),

          SizedBox(height: 24),

          // Due Date and Estimated Hours Row
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'tasks.due_date'.tr(),
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurface,
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    SizedBox(height: 8),
                    InkWell(
                      onTap: _selectDueDate,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.onSurface.withOpacity(0.05),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: Theme.of(context).colorScheme.onSurface.withOpacity(0.2),
                          ),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              Icons.calendar_today_outlined,
                              size: 20,
                              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                            ),
                            SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                _dueDate != null
                                    ? '${_dueDate!.day}/${_dueDate!.month}/${_dueDate!.year}'
                                    : 'tasks.select_due_date'.tr(),
                                style: TextStyle(
                                  color: _dueDate != null
                                      ? Theme.of(context).colorScheme.onSurface
                                      : Theme.of(context).colorScheme.onSurface.withOpacity(0.4),
                                  fontSize: 16,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
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
                      'tasks.estimated_hours'.tr(),
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurface,
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    SizedBox(height: 8),
                    TextFormField(
                      controller: _estimatedHoursController,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        hintText: '0',
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
                      onChanged: (value) {
                        setState(() {
                          _estimatedHours = double.tryParse(value) ?? 0;
                        });
                      },
                    ),
                  ],
                ),
              ),
            ],
          ),

          SizedBox(height: 24),

          // Story Points and Actual Hours Row
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'tasks.story_points'.tr(),
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurface,
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    SizedBox(height: 8),
                    TextFormField(
                      controller: _storyPointsController,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        hintText: '0',
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
                      onChanged: (value) {
                        setState(() {
                          _storyPoints = int.tryParse(value) ?? 0;
                        });
                      },
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
                      'tasks.actual_hours'.tr(),
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurface,
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    SizedBox(height: 8),
                    TextFormField(
                      controller: _actualHoursController,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        hintText: '0',
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
                      onChanged: (value) {
                        setState(() {
                          _actualHours = double.tryParse(value) ?? 0;
                        });
                      },
                    ),
                  ],
                ),
              ),
            ],
          ),

          SizedBox(height: 24),

          // Parent Task
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'tasks.parent_task'.tr(),
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurface,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
              SizedBox(height: 8),
              InkWell(
                onTap: () => _showParentTaskSelection(),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.onSurface.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: Theme.of(context).colorScheme.onSurface.withOpacity(0.2),
                    ),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          _parentTaskId ?? 'tasks.no_parent_task'.tr(),
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.onSurface,
                            fontSize: 16,
                          ),
                        ),
                      ),
                      Icon(
                        Icons.arrow_drop_down,
                        color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAdvancedTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Attachments Section
          Text(
            'tasks.attachments'.tr(),
            style: TextStyle(
              color: Theme.of(context).colorScheme.onSurface,
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              border: Border.all(
                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.2),
                style: BorderStyle.solid,
                width: 2,
              ),
              borderRadius: BorderRadius.circular(8),
              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.02),
            ),
            child: Column(
              children: [
                Icon(
                  Icons.description_outlined,
                  size: 48,
                  color: Theme.of(context).colorScheme.onSurface.withOpacity(0.4),
                ),
                SizedBox(height: 16),
                Text(
                  'tasks.drag_drop_files'.tr(),
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                    fontSize: 14,
                  ),
                ),
                SizedBox(height: 24),
                Wrap(
                  alignment: WrapAlignment.center,
                  spacing: 16,
                  runSpacing: 12,
                  children: [
                    ElevatedButton.icon(
                      onPressed: _uploadFile,
                      icon: Icon(Icons.add, size: 18),
                      label: Text('tasks.upload_file'.tr()),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Theme.of(context).colorScheme.onSurface.withOpacity(0.1),
                        foregroundColor: Theme.of(context).colorScheme.onSurface,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(5),
                        ),
                      ),
                    ),
                    OutlinedButton.icon(
                      onPressed: _selectFromFiles,
                      icon: Icon(Icons.folder_open_outlined, size: 18),
                      label: Text('tasks.select_from_files'.tr()),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Theme.of(context).colorScheme.onSurface,
                        side: BorderSide(
                          color: Theme.of(context).colorScheme.onSurface.withOpacity(0.3),
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(5),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          
          // Display attached files
          if (_attachments.isNotEmpty) ...[
            SizedBox(height: 24),
            Column(
              children: _attachments.asMap().entries.map((entry) {
                final index = entry.key;
                final attachment = entry.value;
                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surface,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: Theme.of(context).colorScheme.outline.withOpacity(0.2),
                    ),
                  ),
                  child: Row(
                    children: [
                      // File icon
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: const Color(0xFF215AD5).withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(
                          _getFileIcon(attachment.type),
                          color: const Color(0xFF215AD5),
                          size: 20,
                        ),
                      ),
                      SizedBox(width: 12),
                      
                      // File info
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              attachment.name,
                              style: TextStyle(
                                color: Theme.of(context).colorScheme.onSurface,
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            SizedBox(height: 2),
                            Text(
                              '${attachment.sizeFormatted} • ${attachment.fileExtension}',
                              style: TextStyle(
                                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                      
                      // Remove button
                      IconButton(
                        onPressed: () => _removeAttachment(index),
                        icon: Icon(
                          Icons.close,
                          color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                          size: 20,
                        ),
                        padding: const EdgeInsets.all(4),
                        constraints: const BoxConstraints(),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ],
          
          SizedBox(height: 32),
          
          // Links Section
          Text(
            'tasks.links'.tr(),
            style: TextStyle(
              color: Theme.of(context).colorScheme.onSurface,
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: TextFormField(
                  decoration: InputDecoration(
                    hintText: 'tasks.add_link_placeholder'.tr(),
                    hintStyle: TextStyle(
                      color: Theme.of(context).colorScheme.onSurface.withOpacity(0.4),
                    ),
                    filled: true,
                    fillColor: Theme.of(context).colorScheme.onSurface.withOpacity(0.05),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(5),
                      borderSide: BorderSide(
                        color: Theme.of(context).colorScheme.onSurface.withOpacity(0.2),
                      ),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(5),
                      borderSide: BorderSide(
                        color: Theme.of(context).colorScheme.onSurface.withOpacity(0.2),
                      ),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(5),
                      borderSide: const BorderSide(
                        color: Color(0xFF215AD5),
                      ),
                    ),
                  ),
                ),
              ),
              SizedBox(width: 12),
              // Link button - COMMENTED OUT
              // ElevatedButton.icon(
              //   onPressed: () {
              //     // TODO: Add link functionality
              //   },
              //   icon: Icon(Icons.link, size: 18),
              //   label: Text('Add'),
              //   style: ElevatedButton.styleFrom(
              //     backgroundColor: Theme.of(context).colorScheme.onSurface.withOpacity(0.1),
              //     foregroundColor: Theme.of(context).colorScheme.onSurface,
              //     elevation: 0,
              //     padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              //     shape: RoundedRectangleBorder(
              //       borderRadius: BorderRadius.circular(5),
              //     ),
              //   ),
              // ),
            ],
          ),
          
          SizedBox(height: 32),
          
          // Tags Section
          Text(
            'tasks.tags'.tr(),
            style: TextStyle(
              color: Theme.of(context).colorScheme.onSurface,
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: TextFormField(
                  decoration: InputDecoration(
                    hintText: 'tasks.add_tag'.tr(),
                    hintStyle: TextStyle(
                      color: Theme.of(context).colorScheme.onSurface.withOpacity(0.4),
                    ),
                    filled: true,
                    fillColor: Theme.of(context).colorScheme.onSurface.withOpacity(0.05),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(5),
                      borderSide: BorderSide(
                        color: Theme.of(context).colorScheme.onSurface.withOpacity(0.2),
                      ),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(5),
                      borderSide: BorderSide(
                        color: Theme.of(context).colorScheme.onSurface.withOpacity(0.2),
                      ),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(5),
                      borderSide: const BorderSide(
                        color: Color(0xFF215AD5),
                      ),
                    ),
                  ),
                ),
              ),
              SizedBox(width: 12),
              ElevatedButton.icon(
                onPressed: () {
                  // TODO: Add tag functionality
                },
                icon: Icon(Icons.label_outline, size: 18),
                label: Text('common.add'.tr()),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Theme.of(context).colorScheme.onSurface.withOpacity(0.1),
                  foregroundColor: Theme.of(context).colorScheme.onSurface,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(5),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDropdown({
    required String value,
    required List<String> items,
    required Function(String?) onChanged,
    IconData? icon,
    String Function(String)? displayNameFormatter,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.onSurface.withOpacity(0.05),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: Theme.of(context).colorScheme.onSurface.withOpacity(0.2),
        ),
      ),
      child: DropdownButton<String>(
        value: value,
        onChanged: onChanged,
        isExpanded: true,
        underline: Container(),
        icon: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(
                icon,
                size: 16,
                color: Theme.of(context).colorScheme.primary,
              ),
              SizedBox(width: 4),
            ],
            Icon(
              Icons.arrow_drop_down,
              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
            ),
          ],
        ),
        style: TextStyle(
          color: Theme.of(context).colorScheme.onSurface,
          fontSize: 14,
        ),
        items: items.map<DropdownMenuItem<String>>((String item) {
          return DropdownMenuItem<String>(
            value: item,
            child: Text(displayNameFormatter?.call(item) ?? item),
          );
        }).toList(),
      ),
    );
  }

  String _getStatusDisplayName(String status) {
    switch (status) {
      case 'todo':
        return 'To Do';
      case 'in_progress':
        return 'In Progress';
      case 'in_review':
        return 'In Review';
      case 'testing':
        return 'Testing';
      case 'done':
        return 'Done';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status.toUpperCase();
    }
  }

  String _getTaskTypeDisplayName(String taskType) {
    switch (taskType) {
      case 'task':
        return 'tasks.type_task'.tr();
      case 'bug':
        return 'tasks.type_bug'.tr();
      case 'story':
        return 'tasks.type_story'.tr();
      case 'epic':
        return 'tasks.type_epic'.tr();
      case 'subtask':
        return 'tasks.type_subtask'.tr();
      case 'feature_request':
        return 'tasks.type_feature_request'.tr();
      default:
        return taskType[0].toUpperCase() + taskType.substring(1);
    }
  }

  Future<void> _selectDueDate() async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _dueDate ?? DateTime.now().add(const Duration(days: 7)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: Theme.of(context).colorScheme.copyWith(
              primary: const Color(0xFF215AD5),
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null && picked != _dueDate) {
      setState(() {
        _dueDate = picked;
      });
    }
  }

  // Helper method to convert UI display values to API values
  // Convert display status to API kanban stage ID (string)
  String _getApiStatus(String displayStatus) {
    // Try to find the stage by name in project's kanban stages
    if (_project != null && _project!.kanbanStages.isNotEmpty) {
      final stage = _project!.kanbanStages.firstWhere(
        (stage) => stage.name.toLowerCase() == displayStatus.toLowerCase(),
        orElse: () => _project!.kanbanStages.first,
      );
      return stage.id; // Return the kanban stage ID
    }

    // Fallback to default stage IDs for backward compatibility
    switch (displayStatus.toLowerCase()) {
      case 'to do':
      case 'todo':
        return 'todo';
      case 'in progress':
      case 'in_progress':
        return 'in_progress';
      case 'review':
        return 'review';
      case 'done':
      case 'completed':
        return 'done';
      default:
        return 'todo'; // Default to first status
    }
  }

  // Helper method to convert UI display values to API values for priority
  String _getApiPriority(String displayPriority) {
    return displayPriority.toLowerCase();
  }

  void _createTask() async {
    // Check if title is empty (required field)
    if (_titleController.text.trim().isEmpty) {
      // Switch to Basic Info tab where the title field is
      _tabController.animateTo(0);

      // Wait for animation to complete before showing message
      await Future.delayed(const Duration(milliseconds: 300));

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('tasks.please_enter_title'.tr()),
            backgroundColor: Colors.orange,
          ),
        );
      }
      return;
    }

    // Validate form if on Basic Info tab
    if (_tabController.index == 0 && _formKey.currentState != null) {
      if (!_formKey.currentState!.validate()) {
        return;
      }
    }

    final projectService = ProjectService.instance;

    try {
      // Format attachments from linked items - backend expects UUIDs only
      Map<String, dynamic>? attachments;

      if (_linkedItems.isNotEmpty) {
        final noteIds = <String>[];
        final eventIds = <String>[];
        final fileIds = <String>[];

        for (final item in _linkedItems) {
          final id = item['id'] as String?;
          if (id == null) continue;


          // Validate UUID format (basic check: contains dashes and is at least 36 chars)
          final isValidUUID = id.contains('-') && id.length >= 36;

          if (!isValidUUID) {
            continue;
          }

          switch (item['type']) {
            case 'note':
              noteIds.add(id);
              break;
            case 'event':
              eventIds.add(id);
              break;
            case 'file':
              fileIds.add(id);
              break;
          }
        }

        // Backend attachments: just UUIDs
        attachments = {};
        if (noteIds.isNotEmpty) {
          attachments['note_attachment'] = noteIds;
        }
        if (eventIds.isNotEmpty) {
          attachments['event_attachment'] = eventIds;
        }
        if (fileIds.isNotEmpty) {
          attachments['file_attachment'] = fileIds;
        }


        // Show warning if some items were skipped due to invalid UUIDs
        final totalLinkedItems = _linkedItems.length;
        final validItems = noteIds.length + eventIds.length + fileIds.length;
        if (validItems < totalLinkedItems) {
          final skippedCount = totalLinkedItems - validItems;
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('tasks.linked_items_skipped'.tr(args: ['$skippedCount'])),
                backgroundColor: Colors.orange,
                duration: const Duration(seconds: 3),
              ),
            );
          }
        }
      }

      // Create task with supported parameters
      await projectService.createTask(
        projectId: widget.projectId,
        title: _titleController.text,
        description: _getDescriptionAsHtml(),
        taskType: _selectedType,
        status: _getApiStatus(_selectedStatus),  // Convert UI value to API value
        priority: _getApiPriority(_selectedPriority),  // Convert UI value to API value
        dueDate: _dueDate,
        estimatedHours: _estimatedHours,
        actualHours: _actualHours > 0 ? _actualHours : null,
        storyPoints: _storyPoints > 0 ? _storyPoints : null,
        assigneeIds: _selectedAssigneeIds.isNotEmpty ? _selectedAssigneeIds : null,
        attachments: attachments,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('tasks.task_created'.tr()),
            backgroundColor: context.primaryColor,
          ),
        );
        Navigator.pop(context, true); // Return true to indicate task was created
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('tasks.error_creating_task'.tr(args: [e.toString()])),
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
      }
    }
  }

  String _getAssigneeDisplayName() {
    if (_selectedAssigneeIds.isEmpty) {
      return 'tasks.select_assignees'.tr();
    }

    // Get names of selected assignees
    final selectedMembers = _workspaceMembers
        .where((member) => _selectedAssigneeIds.contains(member.userId))
        .toList();

    if (selectedMembers.isEmpty) {
      return 'tasks.assignee_count'.tr(args: ['${_selectedAssigneeIds.length}']);
    }

    if (selectedMembers.length == 1) {
      return selectedMembers.first.name ?? selectedMembers.first.email;
    }

    if (selectedMembers.length == 2) {
      final name1 = selectedMembers[0].name ?? selectedMembers[0].email;
      final name2 = selectedMembers[1].name ?? selectedMembers[1].email;
      return '$name1, $name2';
    }

    // More than 2 assignees
    final firstName = selectedMembers.first.name ?? selectedMembers.first.email;
    return 'tasks.plus_more'.tr(args: [firstName, '${selectedMembers.length - 1}']);
  }

  void _showAssigneeSelection() async {

    // If members haven't loaded yet, reload them now
    if (_workspaceMembers.isEmpty && !_isLoadingMembers) {
      await _loadWorkspaceMembers();
    }

    if (!mounted) return;

    // Create a local copy of selected IDs for the modal
    List<String> tempSelectedIds = List.from(_selectedAssigneeIds);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (BuildContext modalContext) {
        return StatefulBuilder(
          builder: (BuildContext context, StateSetter setModalState) {
            final members = _workspaceMembers;
            final loading = _isLoadingMembers;


            return Container(
              padding: const EdgeInsets.only(top: 20),
              height: MediaQuery.of(context).size.height * 0.7,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'tasks.select_assignees'.tr(),
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: Theme.of(context).colorScheme.onSurface,
                              ),
                            ),
                            if (tempSelectedIds.isNotEmpty)
                              Text(
                                'tasks.selected'.tr(args: ['${tempSelectedIds.length}']),
                                style: TextStyle(
                                  fontSize: 14,
                                  color: Theme.of(context).colorScheme.primary,
                                ),
                              ),
                          ],
                        ),
                        Row(
                          children: [
                            if (tempSelectedIds.isNotEmpty)
                              TextButton(
                                onPressed: () {
                                  setModalState(() {
                                    tempSelectedIds.clear();
                                  });
                                },
                                child: Text('common.clear'.tr()),
                              ),
                            SizedBox(width: 8),
                            ElevatedButton(
                              onPressed: () {
                                setState(() {
                                  _selectedAssigneeIds = List.from(tempSelectedIds);
                                });
                                Navigator.pop(modalContext);
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF215AD5),
                                foregroundColor: Colors.white,
                              ),
                              child: Text('common.done'.tr()),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  SizedBox(height: 8),
                  if (members.isNotEmpty)
                    Expanded(
                      child: ListView.builder(
                        itemCount: members.length,
                        itemBuilder: (context, index) {
                          final member = members[index];
                          final isSelected = tempSelectedIds.contains(member.userId);
                          final displayName = member.name ?? member.email;

                          return ListTile(
                            leading: CircleAvatar(
                              backgroundColor: Theme.of(context).colorScheme.primary.withOpacity(0.2),
                              backgroundImage: member.avatar != null
                                  ? NetworkImage(member.avatar!)
                                  : null,
                              child: member.avatar == null
                                  ? Text(
                                      displayName[0].toUpperCase(),
                                      style: TextStyle(
                                        color: Theme.of(context).colorScheme.primary,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    )
                                  : null,
                            ),
                            title: Text(displayName),
                            subtitle: Text(
                              member.role.value.toUpperCase(),
                              style: TextStyle(
                                fontSize: 12,
                                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                              ),
                            ),
                            trailing: Checkbox(
                              value: isSelected,
                              onChanged: (bool? value) {
                                setModalState(() {
                                  if (value == true) {
                                    tempSelectedIds.add(member.userId);
                                  } else {
                                    tempSelectedIds.remove(member.userId);
                                  }
                                });
                              },
                              activeColor: Theme.of(context).colorScheme.primary,
                            ),
                            onTap: () {
                              setModalState(() {
                                if (isSelected) {
                                  tempSelectedIds.remove(member.userId);
                                } else {
                                  tempSelectedIds.add(member.userId);
                                }
                              });
                            },
                          );
                        },
                      ),
                    )
                  else if (loading)
                    Expanded(
                      child: Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            CircularProgressIndicator(),
                            SizedBox(height: 16),
                            Text('tasks.loading_team_members'.tr()),
                          ],
                        ),
                      ),
                    )
                  else
                    Expanded(
                      child: Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.people_outline,
                              size: 64,
                              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.3),
                            ),
                            SizedBox(height: 16),
                            Text(
                              'tasks.no_team_members'.tr(),
                              style: TextStyle(
                                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                                fontSize: 16,
                              ),
                            ),
                            SizedBox(height: 8),
                            TextButton(
                              onPressed: () async {
                                await _loadWorkspaceMembers();
                                setModalState(() {});
                              },
                              child: Text('common.retry'.tr()),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  // Generate AI description for task
  Future<void> _generateAIDescription() async {
    final taskTitle = _titleController.text.trim();

    if (taskTitle.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('tasks.generate_ai_description'.tr()),
          backgroundColor: Theme.of(context).colorScheme.error,
        ),
      );
      return;
    }

    // Start animation and set loading state
    setState(() {
      _isGeneratingAI = true;
    });
    _aiAnimationController.repeat();

    try {
      // Call AI API to generate 3 descriptions
      final response = await _aiService.generateTaskDescriptions(taskTitle);

      // Stop animation
      _aiAnimationController.stop();
      setState(() {
        _isGeneratingAI = false;
      });

      if (response.success && response.data != null) {
        // Parse descriptions
        final fullText = response.data!.generatedText;
        List<String> descriptions = [];

        // Try splitting by ### Task Description N: (markdown headers)
        if (fullText.contains('### Task Description')) {
          final pattern = RegExp(
            r'### Task Description \d+:.*?\n(.+?)(?=### Task Description \d+:|$)',
            dotAll: true,
          );
          final matches = pattern.allMatches(fullText);
          descriptions = matches
              .map((m) => m.group(1)?.trim() ?? '')
              .where((d) => d.isNotEmpty)
              .toList();
        }
        // Try splitting by ---
        else if (fullText.contains('---')) {
          descriptions = fullText
              .split('---')
              .map((d) => d.trim())
              .where((d) => d.isNotEmpty)
              .toList();
        }
        // If no --- separators, try splitting by **Description N:**
        else if (fullText.contains('**Description')) {
          final pattern = RegExp(
            r'\*\*Description \d+:\*\*\s*(.+?)(?=\*\*Description \d+:\*\*|$)',
            dotAll: true,
          );
          final matches = pattern.allMatches(fullText);
          descriptions = matches
              .map((m) => m.group(1)?.trim() ?? '')
              .where((d) => d.isNotEmpty)
              .toList();
        }
        // Try splitting by numbered list (1., 2., 3.)
        else if (fullText.contains(RegExp(r'^\d+\.\s', multiLine: true))) {
          final pattern = RegExp(r'\d+\.\s*(.+?)(?=\d+\.\s|$)', dotAll: true);
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

        // Clean up descriptions - remove common prefixes
        descriptions = descriptions.map((desc) {
          return desc
              .replaceAll(RegExp(r'\*\*Description \d+:\*\*\s*'), '')
              .replaceAll(RegExp(r'\*\*Task Title:\*\*\s*Test\s*\n?'), '')
              .replaceAll(RegExp(r'\*\*Description:\*\*\s*'), '')
              .trim();
        }).toList();

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
      _aiAnimationController.stop();
      setState(() {
        _isGeneratingAI = false;
      });

      // Show error message
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('tasks.failed_generate_ai'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    }
  }

  void _showDescriptionSelectionDialog(List<String> descriptions) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surfaceColor = isDark ? const Color(0xFF1E1E1E) : Colors.white;
    final textColor = isDark ? Colors.white : Colors.black87;
    final subtitleColor = isDark ? Colors.grey[400] : Colors.grey[600];
    final borderColor = isDark ? Colors.grey[800]! : Colors.grey[300]!;
    final backgroundColor = isDark ? const Color(0xFF2D2D2D) : const Color(0xFFF5F5F5);

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
                      'tasks.select_description'.tr(),
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
                            // Set Quill editor content with AI generated description
                            _quillController.clear();
                            _quillController.document.insert(0, descriptions[index]);
                          });
                          Navigator.pop(context);
                        },
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: backgroundColor,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: borderColor.withOpacity(0.5),
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
                                          .withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      'tasks.option'.tr(args: ['${index + 1}']),
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

  void _showNotesSelection() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(5)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'tasks.insert_from_notes'.tr(),
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).colorScheme.onSurface,
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: Icon(
                    Icons.close,
                    color: Theme.of(context).colorScheme.onSurface,
                  ),
                ),
              ],
            ),
            SizedBox(height: 16),
            Flexible(
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: _availableNotes.length,
                itemBuilder: (context, index) {
                  final note = _availableNotes[index];
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(
                      note.title,
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: Theme.of(context).colorScheme.onSurface,
                      ),
                    ),
                    subtitle: Text(
                      note.content,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurface.withOpacity(0.7),
                      ),
                    ),
                    trailing: Icon(
                      Icons.arrow_forward_ios,
                      size: 16,
                      color: Theme.of(context).colorScheme.onSurface.withOpacity(0.5),
                    ),
                    onTap: () {
                      _insertNoteContent(note);
                      Navigator.pop(context);
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _insertNoteContent(Note note) {
    // Get current document length
    final docLength = _quillController.document.length;

    // Remove the trailing '@' if present
    if (docLength > 1) {
      final plainText = _quillController.document.toPlainText();
      if (plainText.isNotEmpty && plainText[plainText.length - 2] == '@') {
        _quillController.document.delete(plainText.length - 2, 1);
      }
    }

    // Insert note content at current position
    final insertPosition = _quillController.selection.baseOffset;
    _quillController.document.insert(insertPosition > 0 ? insertPosition : 0, note.content);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('tasks.inserted_content_from'.tr(args: [note.title])),
        backgroundColor: const Color(0xFF215AD5),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  // File upload functionality
  Future<void> _uploadFile() async {
    try {
      // Show file picker options
      showModalBottomSheet(
        context: context,
        builder: (BuildContext context) {
          return SafeArea(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                ListTile(
                  leading: Icon(Icons.photo_library),
                  title: Text('tasks.choose_from_gallery'.tr()),
                  onTap: () async {
                    Navigator.pop(context);
                    final XFile? image = await _imagePicker.pickImage(source: ImageSource.gallery);
                    if (image != null) {
                      await _addAttachment(image.path, image.name);
                    }
                  },
                ),
                ListTile(
                  leading: Icon(Icons.camera_alt),
                  title: Text('tasks.take_photo'.tr()),
                  onTap: () async {
                    Navigator.pop(context);
                    final XFile? image = await _imagePicker.pickImage(source: ImageSource.camera);
                    if (image != null) {
                      await _addAttachment(image.path, image.name);
                    }
                  },
                ),
                ListTile(
                  leading: Icon(Icons.insert_drive_file),
                  title: Text('tasks.choose_document'.tr()),
                  onTap: () async {
                    Navigator.pop(context);
                    FilePickerResult? result = await FilePicker.platform.pickFiles();
                    if (result != null) {
                      PlatformFile file = result.files.first;
                      await _addAttachment(file.path!, file.name);
                    }
                  },
                ),
              ],
            ),
          );
        },
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('tasks.error_uploading_file'.tr(args: [e.toString()]))),
      );
    }
  }

  Future<void> _selectFromFiles() async {
    try {
      FilePickerResult? result = await FilePicker.platform.pickFiles(
        allowMultiple: true,
        type: FileType.any,
      );

      if (result != null) {
        for (PlatformFile file in result.files) {
          if (file.path != null) {
            await _addAttachment(file.path!, file.name);
          }
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('tasks.error_selecting_files'.tr(args: [e.toString()]))),
        );
      }
    }
  }

  Future<void> _addAttachment(String filePath, String fileName) async {
    try {
      final file = File(filePath);
      final fileSize = await file.length();
      final fileType = fileName.split('.').last.toLowerCase();

      final attachment = TaskAttachment(
        name: fileName,
        path: filePath,
        size: fileSize,
        type: fileType,
        uploadedAt: DateTime.now(),
      );

      setState(() {
        _attachments.add(attachment);
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('tasks.added_file'.tr(args: [fileName])),
            backgroundColor: const Color(0xFF215AD5),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('tasks.error_adding_attachment'.tr(args: [e.toString()]))),
        );
      }
    }
  }

  void _removeAttachment(int index) {
    setState(() {
      _attachments.removeAt(index);
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('tasks.attachment_removed'.tr())),
    );
  }

  IconData _getFileIcon(String fileType) {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return Icons.picture_as_pdf;
      case 'doc':
      case 'docx':
        return Icons.description;
      case 'xls':
      case 'xlsx':
        return Icons.table_chart;
      case 'ppt':
      case 'pptx':
        return Icons.slideshow;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
        return Icons.image;
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'wmv':
        return Icons.video_file;
      case 'mp3':
      case 'wav':
      case 'ogg':
        return Icons.audio_file;
      case 'zip':
      case 'rar':
      case '7z':
        return Icons.archive;
      default:
        return Icons.insert_drive_file;
    }
  }

  void _showParentTaskSelection() {
    // For now, just show a simple dialog
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Text('tasks.select_parent_task'.tr()),
          content: Text('tasks.no_parent_tasks_available'.tr()),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text('common.ok'.tr()),
            ),
          ],
        );
      },
    );
  }
}

// Task Attachment model
class TaskAttachment {
  final String name;
  final String path;
  final int size;
  final String type;
  final DateTime uploadedAt;

  TaskAttachment({
    required this.name,
    required this.path,
    required this.size,
    required this.type,
    required this.uploadedAt,
  });

  String get sizeFormatted {
    if (size < 1024) return '${size}B';
    if (size < 1024 * 1024) return '${(size / 1024).toStringAsFixed(1)}KB';
    return '${(size / (1024 * 1024)).toStringAsFixed(1)}MB';
  }

  String get fileExtension {
    return name.split('.').last.toUpperCase();
  }
}

// Note model for @ import functionality
class Note {
  final String id;
  final String title;
  final String content;

  Note({
    required this.id,
    required this.title,
    required this.content,
  });
}