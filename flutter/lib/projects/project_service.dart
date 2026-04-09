import 'project_model.dart';
import '../api/services/project_api_service.dart' as project_api;
import '../services/auth_service.dart';
import '../services/workspace_service.dart';

class ProjectService {
  static final ProjectService _instance = ProjectService._internal();
  factory ProjectService() => _instance;
  ProjectService._internal();

  final project_api.ProjectApiService _apiService = project_api.ProjectApiService();
  final AuthService _authService = AuthService.instance;
  WorkspaceService get _workspaceService => WorkspaceService.instance;

  /// Convert API Project to local Project model
  Project _convertApiProject(project_api.Project apiProject) {
    final metadata = apiProject.metadata ?? {};
    return Project(
      id: apiProject.id,
      name: apiProject.name,
      description: apiProject.description ?? '',
      workspaceId: apiProject.workspaceId,
      ownerId: apiProject.ownerId,
      type: _parseProjectType(apiProject.type ?? 'task'),
      status: _parseProjectStatus(apiProject.status),
      priority: _parseProjectPriority(metadata['priority'] as String?),
      progress: (metadata['progress'] as num?)?.toDouble() ?? 0.0,
      taskCount: (metadata['taskCount'] as int?) ?? 0,
      memberCount: (metadata['memberCount'] as int?) ?? 0,
      startDate: apiProject.startDate,
      endDate: apiProject.endDate,
      estimatedHours: (metadata['estimatedHours'] as num?)?.toDouble(),
      budget: (metadata['budget'] as num?)?.toDouble(),
      createdAt: apiProject.createdAt,
      updatedAt: apiProject.updatedAt,
      metadata: metadata,
    );
  }

  /// Convert API Task to local Task model
  Task _convertApiTask(project_api.Task apiTask) {
    final metadata = apiTask.metadata ?? {};
    return Task(
      id: apiTask.id,
      projectId: apiTask.projectId,
      title: apiTask.title,
      description: apiTask.description,
      taskType: _parseTaskType(metadata['taskType'] as String? ?? 'task'),
      status: _parseTaskStatus(apiTask.status),
      priority: _parseTaskPriority(apiTask.priority ?? 'medium'),
      sprintId: apiTask.sprintId,
      parentTaskId: metadata['parentTaskId'] as String?,
      assignedTo: apiTask.assigneeId,
      assigneeTeamMemberId: metadata['assigneeTeamMemberId'] as String?,
      reporterTeamMemberId: metadata['reporterTeamMemberId'] as String?,
      dueDate: apiTask.dueDate,
      estimatedHours: (metadata['estimatedHours'] as num?)?.toDouble(),
      storyPoints: metadata['storyPoints'] as int?,
      labels: apiTask.tags,
      createdAt: apiTask.createdAt,
      updatedAt: apiTask.updatedAt,
      metadata: metadata,
    );
  }

  // Helper methods for parsing enum values
  ProjectType _parseProjectType(String value) {
    return ProjectType.values.firstWhere(
      (e) => e.value == value || e.name == value,
      orElse: () => ProjectType.task,
    );
  }

  ProjectStatus _parseProjectStatus(String value) {
    return ProjectStatus.values.firstWhere(
      (e) => e.value == value || e.name == value,
      orElse: () => ProjectStatus.active,
    );
  }

  ProjectPriority? _parseProjectPriority(String? value) {
    if (value == null) return null;
    return ProjectPriority.values.firstWhere(
      (e) => e.value == value || e.name == value,
      orElse: () => ProjectPriority.medium,
    );
  }

  TaskType _parseTaskType(String value) {
    return TaskType.values.firstWhere(
      (e) => e.value == value || e.name == value,
      orElse: () => TaskType.task,
    );
  }

  TaskStatus _parseTaskStatus(String value) {
    return TaskStatus.values.firstWhere(
      (e) => e.value == value || e.name == value,
      orElse: () => TaskStatus.todo,
    );
  }

  TaskPriority _parseTaskPriority(String value) {
    return TaskPriority.values.firstWhere(
      (e) => e.value == value || e.name == value,
      orElse: () => TaskPriority.medium,
    );
  }

  // Cache for offline support
  final List<Project> _cachedProjects = [];
  final List<Task> _cachedTasks = [];
  final List<Sprint> _cachedSprints = [];
  final List<ProjectTemplate> _cachedTemplates = [];

  bool _isInitialized = false;

  // Cache TTL for automatic refresh
  DateTime? _cacheTime;
  static const Duration _cacheDuration = Duration(minutes: 10);

  /// Check if cache is still valid
  bool get _isCacheValid {
    if (_cacheTime == null) return false;
    return DateTime.now().difference(_cacheTime!) < _cacheDuration;
  }

  /// Clear cache and force refresh on next access
  void invalidateCache() {
    _isInitialized = false;
    _cacheTime = null;
  }

  /// Force refresh projects from API
  Future<void> refreshProjects() async {
    _isInitialized = false;
    _cacheTime = null;
    await initialize();
  }

  // Sample projects for offline/fallback mode
  final List<Project> _sampleProjects = [
    // Sample projects for testing
    Project(
      id: '1',
      name: 'Mobile App Redesign',
      description: 'Complete redesign of the mobile application with modern UI/UX',
      workspaceId: 'workspace1',
      ownerId: 'user1',
      type: ProjectType.design,
      status: ProjectStatus.active,
      priority: ProjectPriority.high,
      progress: 0.65,
      taskCount: 18,
      memberCount: 4,
      createdAt: DateTime.now().subtract(const Duration(days: 15)),
      updatedAt: DateTime.now().subtract(const Duration(days: 1)),
      endDate: DateTime.now().add(const Duration(days: 30)),
      memberIds: const ['user1', 'user2', 'user3', 'user4'],
      taskIds: const ['task1', 'task2', 'task3'],
    ),
    Project(
      id: '2',
      name: 'Website Migration',
      description: 'Migrate existing website to new hosting platform',
      workspaceId: 'workspace1',
      ownerId: 'user2',
      type: ProjectType.development,
      status: ProjectStatus.active,
      priority: ProjectPriority.medium,
      progress: 0.45,
      taskCount: 12,
      memberCount: 3,
      createdAt: DateTime.now().subtract(const Duration(days: 10)),
      updatedAt: DateTime.now().subtract(const Duration(days: 1)),
      endDate: DateTime.now().add(const Duration(days: 20)),
      memberIds: const ['user1', 'user2', 'user5'],
      taskIds: const ['task4', 'task5'],
    ),
    Project(
      id: '3',
      name: 'User Research Study',
      description: 'Conduct comprehensive user research for new features',
      workspaceId: 'workspace1',
      ownerId: 'user3',
      type: ProjectType.research,
      status: ProjectStatus.active,
      priority: ProjectPriority.low,
      progress: 0.30,
      taskCount: 8,
      memberCount: 2,
      createdAt: DateTime.now().subtract(const Duration(days: 5)),
      updatedAt: DateTime.now().subtract(const Duration(days: 1)),
      endDate: DateTime.now().add(const Duration(days: 45)),
      memberIds: const ['user3', 'user6'],
      taskIds: const ['task6'],
    ),
    Project(
      id: '4',
      name: 'Task Management System',
      description: 'Build internal task management and tracking system',
      workspaceId: 'workspace1',
      ownerId: 'user1',
      type: ProjectType.scrum,
      status: ProjectStatus.active,
      priority: ProjectPriority.critical,
      progress: 0.80,
      taskCount: 25,
      memberCount: 5,
      createdAt: DateTime.now().subtract(const Duration(days: 30)),
      updatedAt: DateTime.now().subtract(const Duration(days: 1)),
      endDate: DateTime.now().add(const Duration(days: 10)),
      memberIds: const ['user1', 'user2', 'user3', 'user4', 'user7'],
      taskIds: const ['task7', 'task8', 'task9'],
    ),
    Project(
      id: '5',
      name: 'Brand Guidelines',
      description: 'Create comprehensive brand guidelines and style guide',
      workspaceId: 'workspace1',
      ownerId: 'user2',
      type: ProjectType.design,
      status: ProjectStatus.completed,
      priority: ProjectPriority.medium,
      progress: 1.0,
      taskCount: 15,
      memberCount: 3,
      createdAt: DateTime.now().subtract(const Duration(days: 60)),
      updatedAt: DateTime.now().subtract(const Duration(days: 5)),
      endDate: DateTime.now().subtract(const Duration(days: 5)),
      memberIds: const ['user2', 'user3', 'user8'],
      taskIds: const ['task10', 'task11'],
    ),
  ];

  // Sample tasks for offline/fallback mode
  final List<Task> _sampleTasks = [
    // Sample tasks for testing - these will be available even without sample projects
    Task(
      id: 'sample_task_1',
      projectId: 'sample_project_id',
      title: 'Design Login Screen',
      description: 'Create wireframes and mockups for the login screen',
      taskType: TaskType.task,
      status: TaskStatus.todo,
      priority: TaskPriority.high,
      createdAt: DateTime.now().subtract(const Duration(days: 2)),
      updatedAt: DateTime.now().subtract(const Duration(days: 1)),
      dueDate: DateTime.now().add(const Duration(days: 3)),
      assignedTo: 'user1',
    ),
    Task(
      id: 'sample_task_2',
      projectId: 'sample_project_id',
      title: 'Implement Authentication API',
      description: 'Set up JWT authentication endpoints',
      taskType: TaskType.story,
      status: TaskStatus.inProgress,
      priority: TaskPriority.high,
      createdAt: DateTime.now().subtract(const Duration(days: 1)),
      updatedAt: DateTime.now(),
      dueDate: DateTime.now().add(const Duration(days: 5)),
      assignedTo: 'user2',
    ),
    Task(
      id: 'sample_task_3',
      projectId: 'sample_project_id',
      title: 'Setup CI/CD Pipeline',
      description: 'Configure automated testing and deployment',
      taskType: TaskType.task,
      status: TaskStatus.done,
      priority: TaskPriority.medium,
      createdAt: DateTime.now().subtract(const Duration(days: 5)),
      updatedAt: DateTime.now().subtract(const Duration(days: 1)),
      dueDate: DateTime.now().subtract(const Duration(days: 1)),
      assignedTo: 'user3',
    ),
    Task(
      id: 'task1',
      projectId: '1',
      title: 'Design new onboarding flow',
      description: 'Create wireframes and mockups for user onboarding',
      taskType: TaskType.story,
      status: TaskStatus.done,
      priority: TaskPriority.high,
      createdAt: DateTime.now().subtract(const Duration(days: 10)),
      updatedAt: DateTime.now().subtract(const Duration(days: 2)),
      dueDate: DateTime.now().add(const Duration(days: 5)),
      assignedTo: 'user2',
    ),
    Task(
      id: 'task2',
      projectId: '1',
      title: 'Implement responsive navigation',
      description: 'Build responsive navigation component',
      taskType: TaskType.task,
      status: TaskStatus.inProgress,
      priority: TaskPriority.medium,
      createdAt: DateTime.now().subtract(const Duration(days: 8)),
      updatedAt: DateTime.now(),
      dueDate: DateTime.now().add(const Duration(days: 7)),
      assignedTo: 'user1',
    ),
    Task(
      id: 'task3',
      projectId: '1',
      title: 'User testing preparation',
      description: 'Prepare test scenarios and recruit participants',
      taskType: TaskType.task,
      status: TaskStatus.todo,
      priority: TaskPriority.low,
      createdAt: DateTime.now().subtract(const Duration(days: 3)),
      updatedAt: DateTime.now().subtract(const Duration(days: 3)),
      dueDate: DateTime.now().add(const Duration(days: 15)),
      assignedTo: 'user3',
    ),
  ];

  // Initialize service with workspace context
  Future<void> initialize() async {
    // Return cached data if still valid
    if (_isInitialized && _isCacheValid) return;

    try {
      final workspace = _workspaceService.currentWorkspace;
      if (workspace != null) {
        await _loadProjectsFromApi(workspace.id);
      } else {
        _loadSampleData();
      }
      _isInitialized = true;
      _cacheTime = DateTime.now();
    } catch (e) {
      // Fallback to sample data on error
      _loadSampleData();
      _isInitialized = true;
      _cacheTime = DateTime.now();
    }
  }

  void _loadSampleData() {
    _cachedProjects.clear();
    _cachedTasks.clear();
    _cachedProjects.addAll(_sampleProjects);
    _cachedTasks.addAll(_sampleTasks);
  }

  Future<void> _loadProjectsFromApi(String workspaceId) async {
    final response = await _apiService.getAllProjects(workspaceId);
    if (response.isSuccess && response.data != null) {
      _cachedProjects.clear();
      _cachedProjects.addAll(response.data!.map(_convertApiProject));

      // Load tasks for all projects IN PARALLEL using Future.wait()
      // This is much faster than sequential loading
      _cachedTasks.clear();
      if (_cachedProjects.isNotEmpty) {
        final taskFutures = _cachedProjects.map((project) =>
          _apiService.getProjectTasks(workspaceId, project.id)
        ).toList();

        final taskResponses = await Future.wait(taskFutures);

        for (final tasksResponse in taskResponses) {
          if (tasksResponse.isSuccess && tasksResponse.data != null) {
            _cachedTasks.addAll(tasksResponse.data!.map(_convertApiTask));
          }
        }
      }
    }
  }
  
  // Project methods
  Future<List<Project>> getAllProjects() async {
    await initialize();
    return List.unmodifiable(_cachedProjects);
  }

  Future<List<Project>> getActiveProjects() async {
    await initialize();
    return _cachedProjects.where((p) => p.status == ProjectStatus.active).toList();
  }

  Future<Project?> getProjectById(String id) async {
    await initialize();
    try {
      // Try cache first
      final cached = _cachedProjects.where((p) => p.id == id).firstOrNull;
      if (cached != null) return cached;

      // Try API
      final workspace = _workspaceService.currentWorkspace;
      if (workspace != null) {
        final response = await _apiService.getProject(workspace.id, id);
        if (response.isSuccess && response.data != null) {
          final project = _convertApiProject(response.data!);
          // Update cache
          final existingIndex = _cachedProjects.indexWhere((p) => p.id == id);
          if (existingIndex >= 0) {
            _cachedProjects[existingIndex] = project;
          } else {
            _cachedProjects.add(project);
          }
          return project;
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  Future<Project?> createProject({
    required String name,
    required String description,
    required ProjectType type,
    ProjectPriority? priority,
    DateTime? startDate,
    DateTime? endDate,
    double? estimatedHours,
    double? budget,
    bool isTemplate = false,
    List<KanbanStage>? kanbanStages,
    ProjectTemplate? template,
  }) async {
    await initialize();
    
    try {
      final workspace = _workspaceService.currentWorkspace;
      if (workspace == null) throw Exception('No workspace selected');
      
      final user = _authService.currentUser;
      if (user == null) throw Exception('User not authenticated');
      
      final createDto = project_api.CreateProjectDto(
        name: name,
        description: description,
        type: type.value,
        status: ProjectStatus.active.value,
        startDate: startDate,
        endDate: endDate,
        metadata: {
          if (priority != null) 'priority': priority.value,
          if (estimatedHours != null) 'estimatedHours': estimatedHours,
          if (budget != null) 'budget': budget,
          'isTemplate': isTemplate,
          if (kanbanStages != null) 'kanbanStages': kanbanStages.map((s) => s.toJson()).toList(),
        },
      );

      final response = await _apiService.createProject(workspace.id, createDto);

      if (response.isSuccess && response.data != null) {
        final project = _convertApiProject(response.data!);
        _cachedProjects.insert(0, project);

        // Create template tasks if using a template
        if (template != null && template.taskTemplates != null) {
          await _createTasksFromTemplate(project.id, template.taskTemplates!);
        } else {
          // Add default sample tasks
          await _addSampleTasksForProject(project.id);
        }

        return project;
      }
      return null;
    } catch (e) {
      // Fallback to local creation for offline mode
      final project = Project(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        name: name,
        description: description,
        workspaceId: _workspaceService.currentWorkspace?.id ?? 'offline',
        ownerId: (_authService.currentUser)?.id ?? 'offline_user',
        type: type,
        status: ProjectStatus.active,
        priority: priority,
        startDate: startDate,
        endDate: endDate,
        estimatedHours: estimatedHours,
        budget: budget,
        isTemplate: isTemplate,
        kanbanStages: kanbanStages,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );
      
      _cachedProjects.insert(0, project);
      await _addSampleTasksForProject(project.id);
      
      return project;
    }
  }

  Future<Project?> updateProject(String id, {
    String? name,
    String? description,
    ProjectType? type,
    ProjectStatus? status,
    ProjectPriority? priority,
    String? leadId,
    DateTime? startDate,
    DateTime? endDate,
    double? estimatedHours,
    double? budget,
    List<KanbanStage>? kanbanStages,
    Map<String, dynamic>? metadata,
  }) async {
    await initialize();
    
    try {
      final workspace = _workspaceService.currentWorkspace;
      if (workspace == null) throw Exception('No workspace selected');
      
      final updateDto = project_api.UpdateProjectDto(
        name: name,
        description: description,
        type: type?.value,
        status: status?.value,
        startDate: startDate,
        endDate: endDate,
        metadata: {
          if (priority != null) 'priority': priority.value,
          if (estimatedHours != null) 'estimatedHours': estimatedHours,
          if (budget != null) 'budget': budget,
          if (leadId != null) 'leadId': leadId,
          if (kanbanStages != null) 'kanbanStages': kanbanStages.map((s) => s.toJson()).toList(),
          if (metadata != null) ...metadata,
        },
      );

      final response = await _apiService.updateProject(workspace.id, id, updateDto);

      if (response.isSuccess && response.data != null) {
        final project = _convertApiProject(response.data!);
        final index = _cachedProjects.indexWhere((p) => p.id == id);
        if (index >= 0) {
          _cachedProjects[index] = project;
        }
        return project;
      }
      return null;
    } catch (e) {
      // Fallback to local update
      final index = _cachedProjects.indexWhere((p) => p.id == id);
      if (index >= 0) {
        final current = _cachedProjects[index];
        final updated = current.copyWith(
          name: name,
          description: description,
          type: type,
          status: status,
          priority: priority,
          leadId: leadId,
          startDate: startDate,
          endDate: endDate,
          estimatedHours: estimatedHours,
          budget: budget,
          kanbanStages: kanbanStages,
          metadata: metadata,
          updatedAt: DateTime.now(),
        );
        _cachedProjects[index] = updated;
        return updated;
      }
      return null;
    }
  }

  Future<bool> deleteProject(String id) async {
    await initialize();
    
    try {
      final workspace = _workspaceService.currentWorkspace;
      if (workspace != null) {
        final response = await _apiService.deleteProject(workspace.id, id);
        if (response.isSuccess) {
          _cachedProjects.removeWhere((p) => p.id == id);
          _cachedTasks.removeWhere((t) => t.projectId == id);
          return true;
        }
      }
      return false;
    } catch (e) {
      // Fallback to local deletion
      final removed = _cachedProjects.removeWhere((p) => p.id == id);
      _cachedTasks.removeWhere((t) => t.projectId == id);
      return true;
    }
  }

  // Task methods
  Future<List<Task>> getTasksForProject(String projectId, {
    String? sprintId,
    TaskStatus? status,
    String? assigneeId,
    TaskPriority? priority,
  }) async {
    await initialize();
    
    try {
      final workspace = _workspaceService.currentWorkspace;
      if (workspace != null) {
        final response = await _apiService.getProjectTasks(
          workspace.id, 
          projectId,
          sprintId: sprintId,
          status: status?.value,
        );
        
        if (response.isSuccess && response.data != null) {
          var tasks = response.data!.map(_convertApiTask).toList();

          // Apply additional filters
          if (assigneeId != null) {
            tasks = tasks.where((t) => t.assignedTo == assigneeId).toList();
          }
          if (priority != null) {
            tasks = tasks.where((t) => t.priority == priority).toList();
          }

          // Update cache
          _cachedTasks.removeWhere((t) => t.projectId == projectId);
          _cachedTasks.addAll(tasks);

          return tasks;
        }
      }
    } catch (e) {
      // Fallback to cached data
    }
    
    // Return filtered cached tasks
    var tasks = _cachedTasks.where((task) => task.projectId == projectId).toList();
    
    if (sprintId != null) {
      tasks = tasks.where((t) => t.sprintId == sprintId).toList();
    }
    if (status != null) {
      tasks = tasks.where((t) => t.status == status).toList();
    }
    if (assigneeId != null) {
      tasks = tasks.where((t) => t.assignedTo == assigneeId).toList();
    }
    if (priority != null) {
      tasks = tasks.where((t) => t.priority == priority).toList();
    }
    
    return tasks;
  }

  Future<List<Task>> getAllTasks() async {
    await initialize();
    return List.unmodifiable(_cachedTasks);
  }

  Future<Task?> getTaskById(String id) async {
    await initialize();

    try {
      // Try cache first
      final cached = _cachedTasks.where((t) => t.id == id).firstOrNull;
      if (cached != null) return cached;

      // Try API
      final workspace = _workspaceService.currentWorkspace;
      if (workspace != null) {
        final response = await _apiService.getTask(workspace.id, id);
        if (response.isSuccess && response.data != null) {
          final task = _convertApiTask(response.data!);
          // Update cache
          final existingIndex = _cachedTasks.indexWhere((t) => t.id == id);
          if (existingIndex >= 0) {
            _cachedTasks[existingIndex] = task;
          } else {
            _cachedTasks.add(task);
          }
          return task;
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  Future<Task?> createTask({
    required String projectId,
    required String title,
    String? description,
    TaskType taskType = TaskType.task,
    TaskStatus status = TaskStatus.todo,
    TaskPriority priority = TaskPriority.medium,
    String? sprintId,
    String? parentTaskId,
    String? assignedTo,
    String? assigneeTeamMemberId,
    String? reporterTeamMemberId,
    DateTime? dueDate,
    double? estimatedHours,
    int? storyPoints,
    List<String>? labels,
  }) async {
    await initialize();
    
    try {
      final workspace = _workspaceService.currentWorkspace;
      if (workspace == null) throw Exception('No workspace selected');
      
      final createDto = project_api.CreateTaskDto(
        title: title,
        description: description,
        status: status.value,
        priority: priority.value,
        assigneeId: assignedTo,
        sprintId: sprintId,
        dueDate: dueDate,
        tags: labels,
        metadata: {
          'taskType': taskType.value,
          if (parentTaskId != null) 'parentTaskId': parentTaskId,
          if (assigneeTeamMemberId != null) 'assigneeTeamMemberId': assigneeTeamMemberId,
          if (reporterTeamMemberId != null) 'reporterTeamMemberId': reporterTeamMemberId,
          if (estimatedHours != null) 'estimatedHours': estimatedHours,
          if (storyPoints != null) 'storyPoints': storyPoints,
        },
      );

      final response = await _apiService.createTask(workspace.id, projectId, createDto);

      if (response.isSuccess && response.data != null) {
        final task = _convertApiTask(response.data!);
        _cachedTasks.insert(0, task);

        // Update project task count in cache
        final projectIndex = _cachedProjects.indexWhere((p) => p.id == projectId);
        if (projectIndex >= 0) {
          final project = _cachedProjects[projectIndex];
          _cachedProjects[projectIndex] = project.copyWith(
            taskCount: project.taskCount + 1,
            taskIds: [...project.taskIds, task.id],
            updatedAt: DateTime.now(),
          );
        }

        return task;
      }
      return null;
    } catch (e) {
      // Fallback to local creation
      final task = Task(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        projectId: projectId,
        title: title,
        description: description,
        taskType: taskType,
        status: status,
        priority: priority,
        sprintId: sprintId,
        parentTaskId: parentTaskId,
        assignedTo: assignedTo,
        assigneeTeamMemberId: assigneeTeamMemberId,
        reporterTeamMemberId: reporterTeamMemberId,
        dueDate: dueDate,
        estimatedHours: estimatedHours,
        storyPoints: storyPoints,
        labels: labels,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );
      
      _cachedTasks.insert(0, task);
      
      // Update project task count
      final projectIndex = _cachedProjects.indexWhere((p) => p.id == projectId);
      if (projectIndex >= 0) {
        final project = _cachedProjects[projectIndex];
        _cachedProjects[projectIndex] = project.copyWith(
          taskCount: project.taskCount + 1,
          taskIds: [...project.taskIds, task.id],
          updatedAt: DateTime.now(),
        );
      }
      
      return task;
    }
  }

  Future<Task?> updateTask(String id, {
    String? title,
    String? description,
    TaskType? taskType,
    TaskStatus? status,
    TaskPriority? priority,
    String? sprintId,
    String? parentTaskId,
    String? assignedTo,
    String? assigneeTeamMemberId,
    String? reporterTeamMemberId,
    DateTime? dueDate,
    double? estimatedHours,
    int? storyPoints,
    List<String>? labels,
    Map<String, dynamic>? metadata,
  }) async {
    await initialize();
    
    try {
      final workspace = _workspaceService.currentWorkspace;
      if (workspace == null) throw Exception('No workspace selected');
      
      final updateDto = project_api.UpdateTaskDto(
        title: title,
        description: description,
        status: status?.value,
        priority: priority?.value,
        assigneeId: assignedTo,
        sprintId: sprintId,
        dueDate: dueDate,
        tags: labels,
        metadata: {
          if (taskType != null) 'taskType': taskType.value,
          if (parentTaskId != null) 'parentTaskId': parentTaskId,
          if (assigneeTeamMemberId != null) 'assigneeTeamMemberId': assigneeTeamMemberId,
          if (reporterTeamMemberId != null) 'reporterTeamMemberId': reporterTeamMemberId,
          if (estimatedHours != null) 'estimatedHours': estimatedHours,
          if (storyPoints != null) 'storyPoints': storyPoints,
          if (metadata != null) ...metadata,
        },
      );

      final response = await _apiService.updateTask(workspace.id, id, updateDto);

      if (response.isSuccess && response.data != null) {
        final task = _convertApiTask(response.data!);
        final index = _cachedTasks.indexWhere((t) => t.id == id);
        if (index >= 0) {
          final oldTask = _cachedTasks[index];
          _cachedTasks[index] = task;

          // Update project progress if status changed
          if (status != null && oldTask.status != status) {
            await _updateProjectProgress(oldTask.projectId);
          }
        }
        return task;
      }
      return null;
    } catch (e) {
      // Fallback to local update
      final index = _cachedTasks.indexWhere((t) => t.id == id);
      if (index >= 0) {
        final current = _cachedTasks[index];
        final updated = current.copyWith(
          title: title,
          description: description,
          taskType: taskType,
          status: status,
          priority: priority,
          sprintId: sprintId,
          parentTaskId: parentTaskId,
          assignedTo: assignedTo,
          assigneeTeamMemberId: assigneeTeamMemberId,
          reporterTeamMemberId: reporterTeamMemberId,
          dueDate: dueDate,
          estimatedHours: estimatedHours,
          storyPoints: storyPoints,
          labels: labels,
          metadata: metadata,
          updatedAt: DateTime.now(),
        );
        _cachedTasks[index] = updated;
        
        // Update project progress if status changed
        if (status != null && current.status != status) {
          await _updateProjectProgress(current.projectId);
        }
        
        return updated;
      }
      return null;
    }
  }

  Future<bool> deleteTask(String id) async {
    await initialize();
    
    try {
      final workspace = _workspaceService.currentWorkspace;
      if (workspace != null) {
        final response = await _apiService.deleteTask(workspace.id, id);
        if (response.isSuccess) {
          final taskIndex = _cachedTasks.indexWhere((t) => t.id == id);
          if (taskIndex >= 0) {
            final task = _cachedTasks[taskIndex];
            _cachedTasks.removeAt(taskIndex);
            
            // Update project task count
            final projectIndex = _cachedProjects.indexWhere((p) => p.id == task.projectId);
            if (projectIndex >= 0) {
              final project = _cachedProjects[projectIndex];
              _cachedProjects[projectIndex] = project.copyWith(
                taskCount: project.taskCount - 1,
                taskIds: project.taskIds.where((taskId) => taskId != id).toList(),
                updatedAt: DateTime.now(),
              );
            }
            
            await _updateProjectProgress(task.projectId);
          }
          return true;
        }
      }
      return false;
    } catch (e) {
      // Fallback to local deletion
      final taskIndex = _cachedTasks.indexWhere((t) => t.id == id);
      if (taskIndex >= 0) {
        final task = _cachedTasks[taskIndex];
        _cachedTasks.removeAt(taskIndex);
        
        // Update project task count
        final projectIndex = _cachedProjects.indexWhere((p) => p.id == task.projectId);
        if (projectIndex >= 0) {
          final project = _cachedProjects[projectIndex];
          _cachedProjects[projectIndex] = project.copyWith(
            taskCount: project.taskCount - 1,
            taskIds: project.taskIds.where((taskId) => taskId != id).toList(),
            updatedAt: DateTime.now(),
          );
        }
        
        await _updateProjectProgress(task.projectId);
        return true;
      }
      return false;
    }
  }

  Future<bool> updateTaskStatus(String taskId, TaskStatus newStatus) async {
    return await updateTask(taskId, status: newStatus) != null;
  }

  // Calculate actual project progress based on completed tasks
  Future<double> calculateProjectProgress(String projectId) async {
    final projectTasks = await getTasksForProject(projectId);
    if (projectTasks.isEmpty) return 0.0;
    
    final completedCount = projectTasks.where((task) => 
      task.status == TaskStatus.done || task.status == TaskStatus.completed).length;
    return completedCount / projectTasks.length;
  }
  
  // Internal method to update project progress
  Future<void> _updateProjectProgress(String projectId) async {
    final progress = await calculateProjectProgress(projectId);
    final projectIndex = _cachedProjects.indexWhere((p) => p.id == projectId);
    if (projectIndex >= 0) {
      final project = _cachedProjects[projectIndex];
      _cachedProjects[projectIndex] = project.copyWith(
        progress: progress,
        updatedAt: DateTime.now(),
      );
    }
  }
  
  // Update all projects to use calculated progress
  Future<void> updateProjectsProgress() async {
    for (int i = 0; i < _cachedProjects.length; i++) {
      final project = _cachedProjects[i];
      final calculatedProgress = await calculateProjectProgress(project.id);
      _cachedProjects[i] = project.copyWith(
        progress: calculatedProgress,
        updatedAt: DateTime.now(),
      );
    }
  }

  // Sprint Management
  Future<List<Sprint>> getProjectSprints(String projectId) async {
    await initialize();
    return _cachedSprints.where((s) => s.projectId == projectId).toList();
  }
  
  Future<Sprint?> createSprint({
    required String projectId,
    required String name,
    String? goal,
    required DateTime startDate,
    required DateTime endDate,
    SprintStatus status = SprintStatus.planning,
  }) async {
    await initialize();
    
    final sprint = Sprint(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      projectId: projectId,
      name: name,
      goal: goal,
      startDate: startDate,
      endDate: endDate,
      status: status,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );
    
    _cachedSprints.insert(0, sprint);
    return sprint;
  }
  
  Future<Sprint?> updateSprint(String id, {
    String? name,
    String? goal,
    DateTime? startDate,
    DateTime? endDate,
    SprintStatus? status,
  }) async {
    await initialize();
    
    final index = _cachedSprints.indexWhere((s) => s.id == id);
    if (index >= 0) {
      final current = _cachedSprints[index];
      final updated = Sprint(
        id: current.id,
        projectId: current.projectId,
        name: name ?? current.name,
        goal: goal ?? current.goal,
        startDate: startDate ?? current.startDate,
        endDate: endDate ?? current.endDate,
        status: status ?? current.status,
        createdAt: current.createdAt,
        updatedAt: DateTime.now(),
      );
      _cachedSprints[index] = updated;
      return updated;
    }
    return null;
  }
  
  Future<bool> deleteSprint(String id) async {
    await initialize();
    
    final index = _cachedSprints.indexWhere((s) => s.id == id);
    if (index >= 0) {
      _cachedSprints.removeAt(index);
      // Remove sprint reference from tasks
      for (int i = 0; i < _cachedTasks.length; i++) {
        final task = _cachedTasks[i];
        if (task.sprintId == id) {
          _cachedTasks[i] = task.copyWith(sprintId: null);
        }
      }
      return true;
    }
    return false;
  }
  
  Future<Sprint?> getActiveSprint(String projectId) async {
    final sprints = await getProjectSprints(projectId);
    try {
      return sprints.firstWhere((s) => s.status == SprintStatus.active);
    } catch (e) {
      return null;
    }
  }
  
  // Task Comments
  Future<List<TaskComment>> getTaskComments(String taskId) async {
    await initialize();
    final task = await getTaskById(taskId);
    return task?.comments ?? [];
  }
  
  Future<TaskComment?> addTaskComment(String taskId, String content) async {
    await initialize();
    
    final user = _authService.currentUser;
    if (user == null) return null;
    
    final comment = TaskComment(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      taskId: taskId,
      authorId: user.id ?? 'unknown',
      authorName: user.name ?? 'Unknown',
      content: content,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );
    
    final taskIndex = _cachedTasks.indexWhere((t) => t.id == taskId);
    if (taskIndex >= 0) {
      final task = _cachedTasks[taskIndex];
      final updatedComments = <TaskComment>[...(task.comments ?? []), comment];
      _cachedTasks[taskIndex] = task.copyWith(
        comments: updatedComments,
        updatedAt: DateTime.now(),
      );
    }
    
    return comment;
  }
  
  // Task Attachments
  Future<List<TaskAttachment>> getTaskAttachments(String taskId) async {
    await initialize();
    final task = await getTaskById(taskId);
    return task?.attachments ?? [];
  }
  
  Future<TaskAttachment?> addTaskAttachment({
    required String taskId,
    required String fileName,
    required String originalName,
    required String mimeType,
    required int size,
    required String url,
  }) async {
    await initialize();
    
    final attachment = TaskAttachment(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      taskId: taskId,
      fileName: fileName,
      originalName: originalName,
      mimeType: mimeType,
      size: size,
      url: url,
      createdAt: DateTime.now(),
    );
    
    final taskIndex = _cachedTasks.indexWhere((t) => t.id == taskId);
    if (taskIndex >= 0) {
      final task = _cachedTasks[taskIndex];
      final updatedAttachments = <TaskAttachment>[...(task.attachments ?? []), attachment];
      _cachedTasks[taskIndex] = task.copyWith(
        attachments: updatedAttachments,
        updatedAt: DateTime.now(),
      );
    }

    return attachment;
  }
  
  Future<bool> deleteTaskAttachment(String taskId, String attachmentId) async {
    await initialize();
    
    final taskIndex = _cachedTasks.indexWhere((t) => t.id == taskId);
    if (taskIndex >= 0) {
      final task = _cachedTasks[taskIndex];
      final updatedAttachments = task.attachments?.where((a) => a.id != attachmentId).toList();
      _cachedTasks[taskIndex] = task.copyWith(
        attachments: updatedAttachments,
        updatedAt: DateTime.now(),
      );
      return true;
    }
    return false;
  }
  
  // Project Templates
  Future<List<ProjectTemplate>> getProjectTemplates() async {
    await initialize();
    
    // Return default templates if none cached
    if (_cachedTemplates.isEmpty) {
      _cachedTemplates.addAll(_getDefaultTemplates());
    }
    
    return List.unmodifiable(_cachedTemplates);
  }
  
  List<ProjectTemplate> _getDefaultTemplates() {
    return [
      ProjectTemplate(
        id: 'kanban_template',
        name: 'Kanban Board',
        description: 'Simple Kanban board for task management',
        type: ProjectType.kanban,
        kanbanStages: KanbanStage.getDefaultStages(),
        taskTemplates: [
          const TaskTemplate(
            id: 'example_task',
            name: 'Example Task',
            description: 'This is an example task to get you started',
            taskType: TaskType.task,
            priority: TaskPriority.medium,
          ),
        ],
      ),
      ProjectTemplate(
        id: 'scrum_template',
        name: 'Scrum Project',
        description: 'Agile Scrum project with sprints and user stories',
        type: ProjectType.scrum,
        taskTemplates: [
          const TaskTemplate(
            id: 'user_story',
            name: 'User Story Template',
            description: 'As a [user], I want [goal] so that [benefit]',
            taskType: TaskType.story,
            priority: TaskPriority.medium,
            storyPoints: 3,
          ),
          const TaskTemplate(
            id: 'epic_template',
            name: 'Epic Template',
            description: 'Large body of work that can be broken down into stories',
            taskType: TaskType.epic,
            priority: TaskPriority.high,
            storyPoints: 8,
          ),
        ],
      ),
      ProjectTemplate(
        id: 'development_template',
        name: 'Software Development',
        description: 'Template for software development projects',
        type: ProjectType.development,
        taskTemplates: [
          const TaskTemplate(
            id: 'feature_task',
            name: 'Feature Implementation',
            description: 'Implement a new feature',
            taskType: TaskType.task,
            priority: TaskPriority.medium,
            estimatedHours: 8.0,
          ),
          const TaskTemplate(
            id: 'bug_fix',
            name: 'Bug Fix',
            description: 'Fix a reported bug',
            taskType: TaskType.bug,
            priority: TaskPriority.high,
            estimatedHours: 4.0,
          ),
        ],
      ),
    ];
  }
  
  Future<void> _createTasksFromTemplate(String projectId, List<TaskTemplate> templates) async {
    for (final template in templates) {
      await createTask(
        projectId: projectId,
        title: template.name,
        description: template.description,
        taskType: template.taskType,
        priority: template.priority,
        estimatedHours: template.estimatedHours,
        storyPoints: template.storyPoints,
        labels: template.labels,
      );
    }
  }
  
  // Analytics methods
  Future<int> getActiveProjectCount() async {
    final projects = await getActiveProjects();
    return projects.length;
  }

  Future<int> getProjectsDueThisWeek() async {
    final projects = await getAllProjects();
    final now = DateTime.now();
    final weekFromNow = now.add(const Duration(days: 7));
    
    return projects.where((project) {
      if (project.endDate == null) return false;
      return project.endDate!.isAfter(now) && project.endDate!.isBefore(weekFromNow);
    }).length;
  }

  Future<double> getAverageProjectProgress() async {
    final projects = await getAllProjects();
    if (projects.isEmpty) return 0.0;
    final totalProgress = projects.fold<double>(0.0, (sum, project) => sum + project.progress);
    return totalProgress / projects.length;
  }
  
  // Advanced Analytics
  Future<Map<String, dynamic>> getProjectAnalytics(String projectId) async {
    final project = await getProjectById(projectId);
    final tasks = await getTasksForProject(projectId);
    
    if (project == null) return {};
    
    final tasksByStatus = <TaskStatus, int>{};
    final tasksByPriority = <TaskPriority, int>{};
    final tasksByType = <TaskType, int>{};
    
    for (final task in tasks) {
      tasksByStatus[task.status] = (tasksByStatus[task.status] ?? 0) + 1;
      tasksByPriority[task.priority] = (tasksByPriority[task.priority] ?? 0) + 1;
      tasksByType[task.taskType] = (tasksByType[task.taskType] ?? 0) + 1;
    }
    
    final overdueTasks = tasks.where((t) => 
      t.dueDate != null && 
      t.dueDate!.isBefore(DateTime.now()) && 
      t.status != TaskStatus.done && 
      t.status != TaskStatus.completed
    ).length;
    
    final totalEstimatedHours = tasks
        .where((t) => t.estimatedHours != null)
        .fold<double>(0.0, (sum, task) => sum + task.estimatedHours!);
    
    final totalStoryPoints = tasks
        .where((t) => t.storyPoints != null)
        .fold<int>(0, (sum, task) => sum + task.storyPoints!);
    
    return {
      'project': project.toJson(),
      'totalTasks': tasks.length,
      'tasksByStatus': tasksByStatus.map((k, v) => MapEntry(k.displayName, v)),
      'tasksByPriority': tasksByPriority.map((k, v) => MapEntry(k.displayName, v)),
      'tasksByType': tasksByType.map((k, v) => MapEntry(k.displayName, v)),
      'overdueTasks': overdueTasks,
      'totalEstimatedHours': totalEstimatedHours,
      'totalStoryPoints': totalStoryPoints,
      'progress': project.progress,
      'daysRemaining': project.endDate != null 
          ? project.endDate!.difference(DateTime.now()).inDays 
          : null,
    };
  }
  
  Future<Map<String, dynamic>> getWorkspaceAnalytics() async {
    final projects = await getAllProjects();
    final allTasks = await getAllTasks();
    
    final projectsByStatus = <ProjectStatus, int>{};
    final projectsByType = <ProjectType, int>{};
    
    for (final project in projects) {
      projectsByStatus[project.status] = (projectsByStatus[project.status] ?? 0) + 1;
      projectsByType[project.type] = (projectsByType[project.type] ?? 0) + 1;
    }
    
    final overdueTasks = allTasks.where((t) => 
      t.dueDate != null && 
      t.dueDate!.isBefore(DateTime.now()) && 
      t.status != TaskStatus.done && 
      t.status != TaskStatus.completed
    ).length;
    
    final avgProgress = await getAverageProjectProgress();
    final projectsDueThisWeek = await getProjectsDueThisWeek();
    
    return {
      'totalProjects': projects.length,
      'activeProjects': projects.where((p) => p.status == ProjectStatus.active).length,
      'totalTasks': allTasks.length,
      'overdueTasks': overdueTasks,
      'projectsByStatus': projectsByStatus.map((k, v) => MapEntry(k.displayName, v)),
      'projectsByType': projectsByType.map((k, v) => MapEntry(k.displayName, v)),
      'averageProgress': avgProgress,
      'projectsDueThisWeek': projectsDueThisWeek,
    };
  }
  
  // Task Filtering and Search
  Future<List<Task>> searchTasks({
    String? query,
    String? projectId,
    TaskStatus? status,
    TaskPriority? priority,
    TaskType? taskType,
    String? assigneeId,
    String? sprintId,
    DateTime? dueBefore,
    DateTime? dueAfter,
    List<String>? labels,
  }) async {
    await initialize();
    
    var tasks = _cachedTasks.toList();
    
    // Apply filters
    if (projectId != null) {
      tasks = tasks.where((t) => t.projectId == projectId).toList();
    }
    
    if (query != null && query.isNotEmpty) {
      final lowerQuery = query.toLowerCase();
      tasks = tasks.where((t) => 
        t.title.toLowerCase().contains(lowerQuery) ||
        (t.description?.toLowerCase().contains(lowerQuery) ?? false)
      ).toList();
    }
    
    if (status != null) {
      tasks = tasks.where((t) => t.status == status).toList();
    }
    
    if (priority != null) {
      tasks = tasks.where((t) => t.priority == priority).toList();
    }
    
    if (taskType != null) {
      tasks = tasks.where((t) => t.taskType == taskType).toList();
    }
    
    if (assigneeId != null) {
      tasks = tasks.where((t) => t.assignedTo == assigneeId).toList();
    }
    
    if (sprintId != null) {
      tasks = tasks.where((t) => t.sprintId == sprintId).toList();
    }
    
    if (dueBefore != null) {
      tasks = tasks.where((t) => 
        t.dueDate != null && t.dueDate!.isBefore(dueBefore)
      ).toList();
    }
    
    if (dueAfter != null) {
      tasks = tasks.where((t) => 
        t.dueDate != null && t.dueDate!.isAfter(dueAfter)
      ).toList();
    }
    
    if (labels != null && labels.isNotEmpty) {
      tasks = tasks.where((t) => 
        t.labels != null && 
        labels.any((label) => t.labels!.contains(label))
      ).toList();
    }
    
    return tasks;
  }
  
  // Bulk Operations
  Future<List<Task>> bulkUpdateTaskStatus(
    List<String> taskIds, 
    TaskStatus newStatus
  ) async {
    final updatedTasks = <Task>[];
    
    for (final taskId in taskIds) {
      final task = await updateTask(taskId, status: newStatus);
      if (task != null) {
        updatedTasks.add(task);
      }
    }
    
    return updatedTasks;
  }
  
  Future<List<Task>> bulkAssignTasks(
    List<String> taskIds, 
    String assigneeId
  ) async {
    final updatedTasks = <Task>[];
    
    for (final taskId in taskIds) {
      final task = await updateTask(taskId, assignedTo: assigneeId);
      if (task != null) {
        updatedTasks.add(task);
      }
    }
    
    return updatedTasks;
  }
  
  Future<bool> bulkDeleteTasks(List<String> taskIds) async {
    bool allDeleted = true;
    
    for (final taskId in taskIds) {
      final deleted = await deleteTask(taskId);
      if (!deleted) {
        allDeleted = false;
      }
    }
    
    return allDeleted;
  }

  Future<void> _addSampleTasksForProject(String projectId) async {
    final sampleTasks = [
      Task(
        id: '${projectId}_task_1',
        projectId: projectId,
        title: 'Project Planning',
        description: 'Define project scope and requirements',
        taskType: TaskType.task,
        status: TaskStatus.done,
        priority: TaskPriority.high,
        createdAt: DateTime.now().subtract(const Duration(days: 3)),
        updatedAt: DateTime.now().subtract(const Duration(days: 1)),
        dueDate: DateTime.now().subtract(const Duration(days: 1)),
        assignedTo: 'user1',
      ),
      Task(
        id: '${projectId}_task_2',
        projectId: projectId,
        title: 'Design System Setup',
        description: 'Create design tokens and component library',
        taskType: TaskType.story,
        status: TaskStatus.inProgress,
        priority: TaskPriority.medium,
        createdAt: DateTime.now().subtract(const Duration(days: 2)),
        updatedAt: DateTime.now(),
        dueDate: DateTime.now().add(const Duration(days: 4)),
        assignedTo: 'user2',
      ),
      Task(
        id: '${projectId}_task_3',
        projectId: projectId,
        title: 'Feature Implementation',
        description: 'Implement core functionality',
        taskType: TaskType.task,
        status: TaskStatus.todo,
        priority: TaskPriority.high,
        createdAt: DateTime.now().subtract(const Duration(days: 1)),
        updatedAt: DateTime.now().subtract(const Duration(days: 1)),
        dueDate: DateTime.now().add(const Duration(days: 7)),
        assignedTo: 'user3',
      ),
      Task(
        id: '${projectId}_task_4',
        projectId: projectId,
        title: 'Testing & QA',
        description: 'Write tests and perform quality assurance',
        taskType: TaskType.task,
        status: TaskStatus.todo,
        priority: TaskPriority.medium,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
        dueDate: DateTime.now().add(const Duration(days: 10)),
        assignedTo: 'user4',
      ),
    ];

    _cachedTasks.addAll(sampleTasks);
  }
}