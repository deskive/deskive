import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_html/flutter_html.dart';
import 'package:flutter_quill/flutter_quill.dart';
import 'package:flutter_quill_delta_from_html/flutter_quill_delta_from_html.dart';
import 'package:vsc_quill_delta_to_html/vsc_quill_delta_to_html.dart';
import 'package:easy_localization/easy_localization.dart';
import 'dart:convert';
import 'dart:math' as math;
import '../models/task.dart';
import '../models/project.dart';
import '../models/calendar_event.dart';
import '../services/project_service.dart';
import '../services/workspace_service.dart';
import '../services/file_service.dart';
import '../api/services/ai_api_service.dart';
import '../api/services/workspace_api_service.dart';
import '../api/services/project_api_service.dart' hide Project, Task;
import '../api/services/notes_api_service.dart' as notes_api;
import '../api/services/calendar_api_service.dart' as calendar_api;
import '../notes/note.dart' as notes_model;
import '../models/file/file.dart' as file_model;
import '../theme/app_theme.dart';
import '../widgets/mention_suggestion_widget.dart';
import '../widgets/attachment_display_widget.dart';
import '../widgets/ai_description_button.dart';

class EditTaskScreen extends StatefulWidget {
  final Task task;

  const EditTaskScreen({
    super.key,
    required this.task,
  });

  @override
  State<EditTaskScreen> createState() => _EditTaskScreenState();
}

class _EditTaskScreenState extends State<EditTaskScreen>
    with TickerProviderStateMixin {
  late TabController _tabController;
  final _titleController = TextEditingController();
  late QuillController _quillController;
  final FocusNode _quillFocusNode = FocusNode();
  final ScrollController _quillScrollController = ScrollController();
  final _estimatedHoursController = TextEditingController();
  final _actualHoursController = TextEditingController();
  final _storyPointsController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  late String _selectedType;
  late String _selectedPriority;
  late String _selectedStatus;
  DateTime? _dueDate;
  List<String> _selectedAssigneeIds = []; // Multiple assignees support
  double _estimatedHours = 0;
  double _actualHours = 0;
  int _storyPoints = 0;
  String? _parentTaskId;

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

  // Services
  final AIApiService _aiService = AIApiService();
  final WorkspaceService _workspaceService = WorkspaceService.instance;
  final WorkspaceApiService _workspaceApiService = WorkspaceApiService();
  final ProjectApiService _projectApiService = ProjectApiService();
  final notes_api.NotesApiService _notesApi = notes_api.NotesApiService();
  final calendar_api.CalendarApiService _calendarApi = calendar_api.CalendarApiService();
  final FileService _fileService = FileService.instance;

  bool _isLoadingProject = true;
  Project? _project;

  // Workspace members for assignee selection
  List<WorkspaceMember> _workspaceMembers = [];
  bool _isLoadingMembers = false;

  // / mention functionality (triggered by /)
  List<notes_api.Note> _availableNotesFromService = [];
  List<calendar_api.CalendarEvent> _availableEvents = [];
  List<file_model.File> _availableFiles = [];
  bool _showMentionSuggestions = false;
  int _slashSymbolPosition = -1;
  List<Map<String, dynamic>> _linkedItems = []; // For storing linked notes, events, files

  // AI generation state and animation
  bool _isGeneratingAI = false;
  late AnimationController _aiAnimationController;
  late Animation<double> _aiBorderAnimation;

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
    final delta = _quillController.document.toDelta();
    final converter = QuillDeltaToHtmlConverter(
      delta.toJson().cast<Map<String, dynamic>>(),
      ConverterOptions.forEmail(),
    );
    return converter.convert();
  }

  // Convert API numeric status to display status name using kanban stages
  String _getDisplayStatus(String apiStatus) {
    // The status is stored as a numeric string (e.g., "1", "2", "3")
    // representing order + 1
    if (_project != null && _project!.kanbanStages.isNotEmpty) {
      final statusNum = int.tryParse(apiStatus);
      if (statusNum != null) {
        // Find stage by order (order + 1 = status number)
        for (final stage in _project!.kanbanStages) {
          if (stage.order + 1 == statusNum) {
            return stage.name;
          }
        }
      }
      // If status is already a name, check if it matches a stage
      for (final stage in _project!.kanbanStages) {
        if (stage.name.toLowerCase() == apiStatus.toLowerCase()) {
          return stage.name;
        }
      }
      // Return first stage as default
      return _project!.kanbanStages.first.name;
    }

    // Fallback for when project is not loaded
    switch (apiStatus.toLowerCase()) {
      case '1':
      case 'todo':
      case 'to_do':
        return 'To Do';
      case '2':
      case 'in_progress':
      case 'inprogress':
        return 'In Progress';
      case '3':
      case '4':
      case 'done':
      case 'completed':
        return 'Done';
      default:
        return 'To Do';
    }
  }

  // Convert display status name to API kanban stage ID (string)
  String _getApiStatus(String displayStatus) {
    if (_project != null && _project!.kanbanStages.isNotEmpty) {
      // Find the stage by name and return its ID
      for (final stage in _project!.kanbanStages) {
        if (stage.name == displayStatus) {
          return stage.id;
        }
      }
      // Fallback to first stage
      return _project!.kanbanStages.first.id;
    }

    // Fallback for when project is not loaded
    switch (displayStatus.toLowerCase()) {
      case 'to do':
      case 'todo':
        return 'todo';
      case 'in progress':
      case 'in_progress':
        return 'in_progress';
      case 'done':
      case 'completed':
        return 'done';
      default:
        return 'todo';
    }
  }

  // Convert API priority to display priority
  String _getDisplayPriority(String apiPriority) {
    final priority = apiPriority.toLowerCase();
    if (priority == 'lowest' || priority == 'low') {
      return 'low';
    } else if (priority == 'highest' || priority == 'high') {
      return 'high';
    } else {
      return 'medium';
    }
  }

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);

    // Initialize form with existing task data
    _titleController.text = widget.task.title;
    _estimatedHoursController.text = widget.task.estimatedHours?.toString() ?? '0';
    _actualHoursController.text = widget.task.actualHours?.toString() ?? '0';
    _storyPointsController.text = widget.task.storyPoints?.toString() ?? '0';

    // Initialize Quill controller with existing description
    final initialContent = widget.task.description ?? '';
    if (initialContent.isNotEmpty && _isHtmlContent(initialContent)) {
      // Convert HTML to Quill Delta format to preserve formatting
      try {
        final delta = HtmlToDelta().convert(initialContent);
        _quillController = QuillController(
          document: Document.fromDelta(delta),
          selection: const TextSelection.collapsed(offset: 0),
        );
      } catch (e) {
        // Fallback to plain text if HTML conversion fails
        _quillController = QuillController.basic();
        _quillController.document = Document()..insert(0, _stripHtmlTags(initialContent));
      }
    } else {
      // For plain text or empty content
      _quillController = QuillController.basic();
      if (initialContent.isNotEmpty) {
        _quillController.document = Document()..insert(0, initialContent);
      }
    }
    _selectedType = widget.task.taskType;
    _selectedPriority = _getDisplayPriority(widget.task.priority);
    _selectedStatus = _getDisplayStatus(widget.task.status);
    _dueDate = widget.task.dueDate;
    // Initialize selected assignees from task.assignees or fallback to single assignee
    if (widget.task.assignees.isNotEmpty) {
      _selectedAssigneeIds = widget.task.assignees.map((a) => a.id).toList();
    } else if (widget.task.assignedTo != null) {
      _selectedAssigneeIds = [widget.task.assignedTo!];
    } else if (widget.task.assigneeId != null) {
      _selectedAssigneeIds = [widget.task.assigneeId!];
    }
    _estimatedHours = widget.task.estimatedHours ?? 0;
    _actualHours = widget.task.actualHours ?? 0;
    _storyPoints = widget.task.storyPoints ?? 0;
    _parentTaskId = widget.task.parentTaskId;

    // Load project to get kanban stages (this will also load workspace members)
    _loadProject();

    // Load notes for / mention functionality
    _loadNotesFromAPI();

    // Add listener for / mention functionality
    _quillController.addListener(_onDescriptionChange);

    // Pre-populate linked items from task attachments
    _loadExistingAttachments();

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

  // Load existing linked items from task's collaborativeData or attachments
  void _loadExistingAttachments() {
    final collaborativeData = widget.task.collaborativeData;

    // Helper to add items from a list
    void addItemsFromList(dynamic list, String type) {
      if (list is! List) return;
      for (var item in list) {
        if (item is String) {
          // Just an ID string
          _linkedItems.add({
            'id': item,
            'name': type == 'note' ? 'Note' : type == 'event' ? 'Event' : 'File',
            'type': type,
            'needsResolve': true,
          });
        } else if (item is Map) {
          _linkedItems.add({
            'id': item['id']?.toString() ?? '',
            'name': item['name']?.toString() ?? item['title']?.toString() ??
                   (type == 'note' ? 'Note' : type == 'event' ? 'Event' : 'File'),
            'type': type,
          });
        }
      }
    }

    // Check collaborativeData['linked_items'] format (old format)
    if (collaborativeData.containsKey('linked_items')) {
      final linkedItems = collaborativeData['linked_items'];
      if (linkedItems is Map) {
        addItemsFromList(linkedItems['notes'], 'note');
        addItemsFromList(linkedItems['events'], 'event');
        addItemsFromList(linkedItems['files'], 'file');
      }
    }

    // Check collaborativeData root level (note_attachment, event_attachment, file_attachment)
    if (collaborativeData.containsKey('note_attachment')) {
      addItemsFromList(collaborativeData['note_attachment'], 'note');
    }
    if (collaborativeData.containsKey('event_attachment')) {
      addItemsFromList(collaborativeData['event_attachment'], 'event');
    }
    if (collaborativeData.containsKey('file_attachment')) {
      addItemsFromList(collaborativeData['file_attachment'], 'file');
    }

    // Check collaborativeData['attachments'] format (backend response format)
    if (collaborativeData.containsKey('attachments')) {
      final attachments = collaborativeData['attachments'];
      if (attachments is Map) {
        addItemsFromList(attachments['note_attachment'], 'note');
        addItemsFromList(attachments['event_attachment'], 'event');
        addItemsFromList(attachments['file_attachment'], 'file');
      }
    }


    // Resolve names for items that only have IDs
    _resolveLinkedItemNames();
  }

  // Resolve names for linked items that only have IDs
  Future<void> _resolveLinkedItemNames() async {
    // Wait for data to load first
    await Future.delayed(const Duration(milliseconds: 500));

    bool hasChanges = false;
    for (var item in _linkedItems) {
      if (item['needsResolve'] == true) {
        final id = item['id'];
        final type = item['type'];

        try {
          if (type == 'note') {
            final note = _availableNotesFromService.firstWhere((n) => n.id == id);
            item['name'] = note.title;
            item.remove('needsResolve');
            hasChanges = true;
          } else if (type == 'event') {
            final event = _availableEvents.firstWhere((e) => e.id == id);
            item['name'] = event.title;
            item.remove('needsResolve');
            hasChanges = true;
          } else if (type == 'file') {
            final file = _availableFiles.firstWhere((f) => f.id == id);
            item['name'] = file.name;
            item.remove('needsResolve');
            hasChanges = true;
          }
        } catch (e) {
          // Item not found in available lists, keep default name
        }
      }
    }

    if (hasChanges && mounted) {
      setState(() {});
    }
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

  Future<void> _loadProject() async {
    try {
      final projectService = ProjectService.instance;
      final project = await projectService.getProject(widget.task.projectId);

      if (project != null && mounted) {
        setState(() {
          _project = project;
          _isLoadingProject = false;
          // Re-set the status now that we have the kanban stages loaded
          _selectedStatus = _getDisplayStatus(widget.task.status);
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
    try {
      setState(() {
        _isLoadingMembers = true;
      });

      final currentWorkspaceId = _workspaceService.currentWorkspace?.id;
      if (currentWorkspaceId == null) {
        setState(() {
          _isLoadingMembers = false;
        });
        return;
      }

      // Fetch actual project members from the API instead of filtering workspace members
      final response = await _projectApiService.getProjectMembers(
        currentWorkspaceId,
        widget.task.projectId,
      );

      if (response.isSuccess && response.data != null && mounted) {
        // Convert ProjectMemberResponse to WorkspaceMember for UI compatibility
        final projectMembers = response.data!;
        final workspaceMembers = projectMembers.map((pm) {
          return WorkspaceMember(
            id: pm.id,
            userId: pm.userId,
            workspaceId: currentWorkspaceId,
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
        if (mounted) {
          setState(() {
            _isLoadingMembers = false;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoadingMembers = false;
        });
      }
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

  Future<void> _loadNotesFromAPI() async {
    try {
      final currentWorkspaceId = _workspaceService.currentWorkspace?.id;
      if (currentWorkspaceId == null) return;

      final response = await _notesApi.getNotes(currentWorkspaceId);

      if (response.success && response.data != null && mounted) {
        setState(() {
          _availableNotesFromService = response.data!;
        });
      }
    } catch (e) {
    }
  }

  Future<void> _loadEventsForMention() async {
    try {
      final currentWorkspaceId = _workspaceService.currentWorkspace?.id;
      if (currentWorkspaceId == null) return;

      final response = await _calendarApi.getEvents(currentWorkspaceId);

      if (response.success && response.data != null && mounted) {
        setState(() {
          _availableEvents = response.data!;
        });
      }
    } catch (e) {
    }
  }

  Future<void> _loadFilesForMention() async {
    try {
      final files = await _fileService.getFiles();

      if (files != null && mounted) {
        setState(() {
          _availableFiles = files;
        });
      }
    } catch (e) {
    }
  }

  void _onDescriptionChange() {
    // Get plain text and cursor position from QuillController
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

  void _insertNoteReference(notes_api.Note note) {
    // Check if already attached
    final alreadyAttached = _linkedItems.any((a) => a['id'] == note.id && a['type'] == 'note');
    if (alreadyAttached) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Note "${note.title}" is already attached'), backgroundColor: Colors.orange),
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
      SnackBar(content: Text('Note "${note.title}" attached'), backgroundColor: Colors.green),
    );
  }

  void _insertEventReference(calendar_api.CalendarEvent event) {
    // Check if already attached
    final alreadyAttached = _linkedItems.any((a) => a['id'] == event.id && a['type'] == 'event');
    if (alreadyAttached) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Event "${event.title}" is already attached'), backgroundColor: Colors.orange),
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
      SnackBar(content: Text('Event "${event.title}" attached'), backgroundColor: Colors.green),
    );
  }

  void _insertFileReference(file_model.File file) {
    // Check if already attached
    final alreadyAttached = _linkedItems.any((a) => a['id'] == file.id && a['type'] == 'file');
    if (alreadyAttached) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('File "${file.name}" is already attached'), backgroundColor: Colors.orange),
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
      SnackBar(content: Text('File "${file.name}" attached'), backgroundColor: Colors.green),
    );
  }

  String _formatFileSize(String sizeStr) {
    try {
      final bytes = int.parse(sizeStr);
      if (bytes < 1024) return '${bytes}B';
      if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)}KB';
      if (bytes < 1024 * 1024 * 1024) return '${(bytes / (1024 * 1024)).toStringAsFixed(1)}MB';
      return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)}GB';
    } catch (e) {
      return sizeStr; // Return original string if parsing fails
    }
  }

  String _getAssigneeDisplayName() {
    if (_selectedAssigneeIds.isEmpty) return 'tasks.select_assignees'.tr();

    // If members haven't loaded yet, show loading state
    if (_workspaceMembers.isEmpty) {
      return _isLoadingMembers ? 'common.loading'.tr() : 'tasks.assignee_count'.tr(args: ['${_selectedAssigneeIds.length}']);
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
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'tasks.edit_task'.tr(),
              style: TextStyle(
                color: Theme.of(context).colorScheme.onSurface,
                fontSize: 20,
                fontWeight: FontWeight.w600,
              ),
            ),
            Text(
              'tasks.update_task_subtitle'.tr(),
              style: TextStyle(
                color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6),
                fontSize: 14,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: Icon(
              Icons.delete_outline,
              color: Colors.red,
            ),
            onPressed: _deleteTask,
          ),
        ],
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
                  onPressed: _updateTask,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF215AD5),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(5),
                    ),
                  ),
                  child: Text('tasks.update_task'.tr()),
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
                      borderSide: BorderSide(
                        color: Theme.of(context).colorScheme.primary,
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
                // Rich Text Editor with Quill - with animated border when AI is generating
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
                      events: _availableEvents.map((e) => CalendarEvent(
                        id: e.id,
                        workspaceId: e.workspaceId,
                        title: e.title,
                        description: e.description,
                        startTime: e.startTime,
                        endTime: e.endTime,
                        allDay: e.isAllDay,
                        location: e.location,
                        organizerId: e.organizerId,
                        categoryId: e.categoryId,
                        attendees: [],
                        createdAt: e.createdAt,
                        updatedAt: e.updatedAt,
                      )).toList(),
                      files: _availableFiles,
                      onNoteSelected: _insertNoteReference,
                      onEventSelected: (event) {
                        // Convert back to calendar_api.CalendarEvent
                        final apiEvent = _availableEvents.firstWhere((e) => e.id == event.id);
                        _insertEventReference(apiEvent);
                      },
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
          // Assignees Section
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
                          borderSide: const BorderSide(
                            color: Color(0xFF215AD5),
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
                          borderSide: const BorderSide(
                            color: Color(0xFF215AD5),
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
                          borderSide: const BorderSide(
                            color: Color(0xFF215AD5),
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
                      onPressed: () {
                        // TODO: Implement file upload
                      },
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
                      onPressed: () {
                        // TODO: Implement file selection
                      },
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
              ElevatedButton.icon(
                onPressed: () {
                  // TODO: Add link functionality
                },
                icon: Icon(Icons.link, size: 18),
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

  Future<void> _selectDueDate() async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _dueDate ?? DateTime.now().add(const Duration(days: 7)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null && picked != _dueDate) {
      setState(() {
        _dueDate = picked;
      });
    }
  }

  void _showAssigneeSelection() async {
    // Wait for members to load if not already loaded
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
              height: MediaQuery.of(context).size.height * 0.7,
              padding: const EdgeInsets.only(top: 20),
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
                  SizedBox(height: 20),
                  if (members.isNotEmpty)
                    Expanded(
                      child: ListView.builder(
                        itemCount: members.length,
                        itemBuilder: (context, index) {
                          final member = members[index];
                          final displayName = member.name ?? member.email;
                          final isSelected = tempSelectedIds.contains(member.userId);

                          return ListTile(
                            leading: CircleAvatar(
                              backgroundImage: member.avatar != null
                                  ? NetworkImage(member.avatar!)
                                  : null,
                              child: member.avatar == null
                                  ? Text(displayName[0].toUpperCase())
                                  : null,
                            ),
                            title: Text(displayName),
                            subtitle: Text(member.role.value.toUpperCase()),
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
                              size: 48,
                              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.3),
                            ),
                            SizedBox(height: 16),
                            Text(
                              'tasks.no_team_members'.tr(),
                              style: TextStyle(
                                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                              ),
                            ),
                            SizedBox(height: 16),
                            ElevatedButton.icon(
                              onPressed: () async {
                                await _loadWorkspaceMembers();
                                setModalState(() {});
                              },
                              icon: Icon(Icons.refresh),
                              label: Text('common.retry'.tr()),
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

  Future<void> _deleteTask() async {
    // Show confirmation dialog
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Text('tasks.delete_task'.tr()),
          content: Text('tasks.delete_task_confirm'.tr()),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text('common.cancel'.tr()),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context, true),
              style: TextButton.styleFrom(
                foregroundColor: Colors.red,
              ),
              child: Text('common.delete'.tr()),
            ),
          ],
        );
      },
    );

    if (confirmed != true) return;

    try {
      final projectService = ProjectService.instance;


      final success = await projectService.deleteTask(widget.task.id);

      if (mounted) {
        if (success) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  Icon(Icons.check_circle, color: Colors.white, size: 20),
                  SizedBox(width: 8),
                  Text('tasks.task_deleted'.tr()),
                ],
              ),
              backgroundColor: context.primaryColor,
            ),
          );
          Navigator.pop(context, true); // Return true to indicate task was deleted
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('tasks.task_deleted_failed'.tr()),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('tasks.error_deleting_task'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
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
              .replaceAll(RegExp(r'\*\*Task Title:\*\*\s*.*?\n?'), '')
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
                            // Set AI description to QuillController
                            _quillController.document = Document()..insert(0, descriptions[index]);
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

  void _updateTask() async {
    // Validate title manually since form might not be in widget tree (different tab)
    final isFormValid = _formKey.currentState?.validate() ?? true;
    final isTitleValid = _titleController.text.trim().isNotEmpty;

    if (!isTitleValid) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('tasks.please_enter_title'.tr()),
          backgroundColor: Theme.of(context).colorScheme.error,
        ),
      );
      return;
    }

    if (isFormValid && isTitleValid) {
      final projectService = ProjectService.instance;

      // Create update map with only the essential fields
      final updates = <String, dynamic>{
        'title': _titleController.text,
        'description': _getDescriptionAsHtml(),
        'task_type': _selectedType,
        'status': _getApiStatus(_selectedStatus),
        'priority': _selectedPriority.toLowerCase(),
      };

      // Only add optional fields if they have valid values
      if (_dueDate != null) {
        // Ensure the date is in the correct format (just date, not full datetime)
        final dueDateString = _dueDate!.toIso8601String().split('T')[0];
        updates['due_date'] = dueDateString;
      }

      // Add assignees if selected
      if (_selectedAssigneeIds.isNotEmpty) {
        updates['assigned_to'] = _selectedAssigneeIds;
      }

      if (_estimatedHours > 0) {
        updates['estimated_hours'] = _estimatedHours.toInt(); // Ensure it's an integer
      }

      if (_actualHours > 0) {
        updates['actual_hours'] = _actualHours;
      }

      if (_storyPoints > 0) {
        updates['story_points'] = _storyPoints;
      }

      // Only add parent_task_id if it's a valid UUID
      if (_parentTaskId != null && _parentTaskId!.contains('-')) {
        updates['parent_task_id'] = _parentTaskId;
      }

      // Format linked items into attachments structure - backend expects UUIDs only
      if (_linkedItems.isNotEmpty) {
        final noteIds = <String>[];
        final eventIds = <String>[];
        final fileIds = <String>[];

        for (final item in _linkedItems) {
          final id = item['id'] as String?;
          if (id == null) continue;

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

        final attachments = <String, dynamic>{};
        if (noteIds.isNotEmpty) {
          attachments['note_attachment'] = noteIds;
        }
        if (eventIds.isNotEmpty) {
          attachments['event_attachment'] = eventIds;
        }
        if (fileIds.isNotEmpty) {
          attachments['file_attachment'] = fileIds;
        }

        if (attachments.isNotEmpty) {
          updates['attachments'] = attachments;
        }
      } else {
        // Clear attachments if all removed
        updates['attachments'] = {};
      }


      try {
        final updatedTask = await projectService.updateTask(widget.task.id, updates);

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('tasks.task_updated'.tr()),
              backgroundColor: context.primaryColor,
            ),
          );
          Navigator.pop(context, true); // Return true to indicate task was updated
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('tasks.error_updating_task'.tr(args: [e.toString()])),
              backgroundColor: Theme.of(context).colorScheme.error,
            ),
          );
        }
      }
    }
  }
}