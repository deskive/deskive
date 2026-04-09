import 'package:dio/dio.dart';
import '../base_api_client.dart';

/// DTO classes for Project operations
class CreateProjectDto {
  final String name;
  final String? description;
  final String? type;
  final String? status;
  final DateTime? startDate;
  final DateTime? endDate;
  final Map<String, dynamic>? metadata;
  
  CreateProjectDto({
    required this.name,
    this.description,
    this.type,
    this.status,
    this.startDate,
    this.endDate,
    this.metadata,
  });
  
  Map<String, dynamic> toJson() => {
    'name': name,
    if (description != null) 'description': description,
    if (type != null) 'type': type,
    if (status != null) 'status': status,
    if (startDate != null) 'start_date': startDate!.toIso8601String(),
    if (endDate != null) 'end_date': endDate!.toIso8601String(),
    if (metadata != null) 'metadata': metadata,
  };
}

class UpdateProjectDto {
  final String? name;
  final String? description;
  final String? type;
  final String? status;
  final DateTime? startDate;
  final DateTime? endDate;
  final Map<String, dynamic>? metadata;
  
  UpdateProjectDto({
    this.name,
    this.description,
    this.type,
    this.status,
    this.startDate,
    this.endDate,
    this.metadata,
  });
  
  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    if (name != null) map['name'] = name;
    if (description != null) map['description'] = description;
    if (type != null) map['type'] = type;
    if (status != null) map['status'] = status;
    if (startDate != null) map['start_date'] = startDate!.toIso8601String();
    if (endDate != null) map['end_date'] = endDate!.toIso8601String();
    if (metadata != null) map['metadata'] = metadata;
    return map;
  }
}

class CreateTaskDto {
  final String title;
  final String? description;
  final String? status; // 'todo', 'in_progress', 'done', etc.
  final String? priority; // 'lowest', 'low', 'medium', 'high', 'highest'
  final String? assigneeId;
  final String? sprintId;
  final DateTime? dueDate;
  final List<String>? tags;
  final Map<String, dynamic>? metadata;
  
  CreateTaskDto({
    required this.title,
    this.description,
    this.status,
    this.priority,
    this.assigneeId,
    this.sprintId,
    this.dueDate,
    this.tags,
    this.metadata,
  });
  
  Map<String, dynamic> toJson() => {
    'title': title,
    if (description != null) 'description': description,
    if (status != null) 'status': status,
    if (priority != null) 'priority': priority,
    if (assigneeId != null) 'assigned_to': assigneeId,
    if (sprintId != null) 'sprint_id': sprintId,
    if (dueDate != null) 'due_date': dueDate!.toIso8601String(),
    if (tags != null) 'labels': tags,
    if (metadata != null) 'metadata': metadata,
  };
}

class UpdateTaskDto {
  final String? title;
  final String? description;
  final String? status;
  final String? priority;
  final String? assigneeId;
  final String? sprintId;
  final DateTime? dueDate;
  final List<String>? tags;
  final Map<String, dynamic>? metadata;

  UpdateTaskDto({
    this.title,
    this.description,
    this.status,
    this.priority,
    this.assigneeId,
    this.sprintId,
    this.dueDate,
    this.tags,
    this.metadata,
  });

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    if (title != null) map['title'] = title;
    if (description != null) map['description'] = description;
    if (status != null) map['status'] = status;
    if (priority != null) map['priority'] = priority;
    if (assigneeId != null) map['assigned_to'] = assigneeId;
    if (sprintId != null) map['sprint_id'] = sprintId;
    if (dueDate != null) map['due_date'] = dueDate!.toIso8601String();
    if (tags != null) map['labels'] = tags;
    if (metadata != null) map['metadata'] = metadata;
    return map;
  }
}

class AddDependencyDto {
  final String dependsOnTaskId;
  final String? dependencyType; // 'blocks', 'blocked_by', 'finish_to_start', etc.
  final int? lagDays;
  final bool? isCriticalPath;

  AddDependencyDto({
    required this.dependsOnTaskId,
    this.dependencyType,
    this.lagDays,
    this.isCriticalPath,
  });

  Map<String, dynamic> toJson() => {
    'depends_on_task_id': dependsOnTaskId,
    if (dependencyType != null) 'dependency_type': dependencyType,
    if (lagDays != null) 'lag_days': lagDays,
    if (isCriticalPath != null) 'is_critical_path': isCriticalPath,
  };
}

class UpdateDependencyDto {
  final String? dependencyType;
  final int? lagDays;
  final bool? isCriticalPath;

  UpdateDependencyDto({
    this.dependencyType,
    this.lagDays,
    this.isCriticalPath,
  });

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    if (dependencyType != null) map['dependency_type'] = dependencyType;
    if (lagDays != null) map['lag_days'] = lagDays;
    if (isCriticalPath != null) map['is_critical_path'] = isCriticalPath;
    return map;
  }
}

class TaskDependencyResponse {
  final String id;
  final String taskId;
  final String dependsOnTaskId;
  final String dependencyType;
  final int lagDays;
  final bool isCriticalPath;
  final String? dependsOnTaskTitle;
  final String? dependsOnTaskStatus;
  final DateTime createdAt;
  final DateTime updatedAt;

  TaskDependencyResponse({
    required this.id,
    required this.taskId,
    required this.dependsOnTaskId,
    required this.dependencyType,
    required this.lagDays,
    required this.isCriticalPath,
    this.dependsOnTaskTitle,
    this.dependsOnTaskStatus,
    required this.createdAt,
    required this.updatedAt,
  });

  factory TaskDependencyResponse.fromJson(Map<String, dynamic> json) {
    return TaskDependencyResponse(
      id: json['id'],
      taskId: json['taskId'] ?? json['task_id'],
      dependsOnTaskId: json['dependsOnTaskId'] ?? json['depends_on_task_id'],
      dependencyType: json['dependencyType'] ?? json['dependency_type'] ?? 'blocks',
      lagDays: json['lagDays'] ?? json['lag_days'] ?? 0,
      isCriticalPath: json['isCriticalPath'] ?? json['is_critical_path'] ?? false,
      dependsOnTaskTitle: json['dependsOnTaskTitle'] ?? json['depends_on_task_title'],
      dependsOnTaskStatus: json['dependsOnTaskStatus'] ?? json['depends_on_task_status'],
      createdAt: DateTime.parse(json['createdAt'] ?? json['created_at']),
      updatedAt: DateTime.parse(json['updatedAt'] ?? json['updated_at']),
    );
  }
}

/// Model classes
class Project {
  final String id;
  final String name;
  final String? description;
  final String workspaceId;
  final String ownerId;
  final String? type;
  final String status;
  final DateTime? startDate;
  final DateTime? endDate;
  final Map<String, dynamic>? metadata;
  final DateTime createdAt;
  final DateTime updatedAt;
  
  Project({
    required this.id,
    required this.name,
    this.description,
    required this.workspaceId,
    required this.ownerId,
    this.type,
    required this.status,
    this.startDate,
    this.endDate,
    this.metadata,
    required this.createdAt,
    required this.updatedAt,
  });
  
  factory Project.fromJson(Map<String, dynamic> json) {
    return Project(
      id: json['id'],
      name: json['name'],
      description: json['description'],
      workspaceId: json['workspaceId'] ?? json['workspace_id'],
      ownerId: json['ownerId'] ?? json['owner_id'],
      type: json['type'],
      status: json['status'] ?? 'active',
      startDate: json['startDate'] != null 
          ? DateTime.parse(json['startDate']) 
          : json['start_date'] != null 
              ? DateTime.parse(json['start_date']) 
              : null,
      endDate: json['endDate'] != null 
          ? DateTime.parse(json['endDate']) 
          : json['end_date'] != null 
              ? DateTime.parse(json['end_date']) 
              : null,
      metadata: json['metadata'],
      createdAt: DateTime.parse(json['createdAt'] ?? json['created_at']),
      updatedAt: DateTime.parse(json['updatedAt'] ?? json['updated_at']),
    );
  }
}

class Task {
  final String id;
  final String title;
  final String? description;
  final String projectId;
  final String status;
  final String? priority;
  final String? assigneeId;
  final String? assigneeName;
  final String? sprintId;
  final DateTime? dueDate;
  final List<String>? tags;
  final Map<String, dynamic>? metadata;
  final DateTime createdAt;
  final DateTime updatedAt;
  
  Task({
    required this.id,
    required this.title,
    this.description,
    required this.projectId,
    required this.status,
    this.priority,
    this.assigneeId,
    this.assigneeName,
    this.sprintId,
    this.dueDate,
    this.tags,
    this.metadata,
    required this.createdAt,
    required this.updatedAt,
  });
  
  factory Task.fromJson(Map<String, dynamic> json) {
    return Task(
      id: json['id'],
      title: json['title'],
      description: json['description'],
      projectId: json['projectId'] ?? json['project_id'],
      status: json['status'] ?? 'todo',
      priority: json['priority'],
      assigneeId: json['assigneeId'] ?? json['assignee_id'],
      assigneeName: json['assigneeName'] ?? json['assignee_name'],
      sprintId: json['sprintId'] ?? json['sprint_id'],
      dueDate: json['dueDate'] != null 
          ? DateTime.parse(json['dueDate']) 
          : json['due_date'] != null 
              ? DateTime.parse(json['due_date']) 
              : null,
      tags: json['tags'] != null ? List<String>.from(json['tags']) : null,
      metadata: json['metadata'],
      createdAt: DateTime.parse(json['createdAt'] ?? json['created_at']),
      updatedAt: DateTime.parse(json['updatedAt'] ?? json['updated_at']),
    );
  }
}

/// Project member response from API
class ProjectMemberResponse {
  final String id;
  final String projectId;
  final String userId;
  final String role;
  final DateTime joinedAt;
  final ProjectMemberUser? user;

  ProjectMemberResponse({
    required this.id,
    required this.projectId,
    required this.userId,
    required this.role,
    required this.joinedAt,
    this.user,
  });

  factory ProjectMemberResponse.fromJson(Map<String, dynamic> json) {
    return ProjectMemberResponse(
      id: json['id'],
      projectId: json['project_id'] ?? json['projectId'],
      userId: json['user_id'] ?? json['userId'],
      role: json['role'] ?? 'member',
      joinedAt: DateTime.parse(json['joined_at'] ?? json['joinedAt'] ?? json['created_at']),
      user: json['user'] != null ? ProjectMemberUser.fromJson(json['user']) : null,
    );
  }
}

/// User details for project member
class ProjectMemberUser {
  final String id;
  final String? name;
  final String? email;
  final String? avatarUrl;

  ProjectMemberUser({
    required this.id,
    this.name,
    this.email,
    this.avatarUrl,
  });

  factory ProjectMemberUser.fromJson(Map<String, dynamic> json) {
    return ProjectMemberUser(
      id: json['id'],
      name: json['name'],
      email: json['email'],
      avatarUrl: json['avatar_url'] ?? json['avatarUrl'],
    );
  }
}

/// Response from AI agent commands
class AgentResponse {
  final bool success;
  final String? agentUsed; // 'project', 'task', or 'router'
  final String? action; // 'create', 'update', 'delete', 'batch_create', etc.
  final String message;
  final dynamic data;
  final String? error;

  AgentResponse({
    required this.success,
    this.agentUsed,
    this.action,
    required this.message,
    this.data,
    this.error,
  });

  factory AgentResponse.fromJson(Map<String, dynamic> json) {
    return AgentResponse(
      success: json['success'] ?? false,
      agentUsed: json['agentUsed'] ?? json['agent_used'],
      action: json['action'],
      message: json['message'] ?? '',
      data: json['data'],
      error: json['error'],
    );
  }
}

/// API service for project and task operations
class ProjectApiService {
  final BaseApiClient _apiClient;
  
  ProjectApiService({BaseApiClient? apiClient}) 
      : _apiClient = apiClient ?? BaseApiClient.instance;
  
  // ==================== PROJECT OPERATIONS ====================
  
  /// Create a new project
  Future<ApiResponse<Project>> createProject(
    String workspaceId,
    CreateProjectDto dto,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/projects',
        data: dto.toJson(),
      );
      
      return ApiResponse.success(
        Project.fromJson(response.data),
        message: 'Project created successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to create project',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Get all projects in workspace
  Future<ApiResponse<List<Project>>> getAllProjects(
    String workspaceId, {
    String? status,
    String? type,
  }) async {
    try {
      final queryParameters = <String, dynamic>{};
      if (status != null) queryParameters['status'] = status;
      if (type != null) queryParameters['type'] = type;

      final response = await _apiClient.get(
        '/workspaces/$workspaceId/projects',
        queryParameters: queryParameters,
      );
      
      final projects = (response.data as List)
          .map((json) => Project.fromJson(json))
          .toList();
      
      return ApiResponse.success(
        projects,
        message: 'Projects retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get projects',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Get project by ID
  Future<ApiResponse<Project>> getProject(
    String workspaceId,
    String projectId,
  ) async {
    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/projects/$projectId',
      );
      
      return ApiResponse.success(
        Project.fromJson(response.data),
        message: 'Project retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get project',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Update project
  Future<ApiResponse<Project>> updateProject(
    String workspaceId,
    String projectId,
    UpdateProjectDto dto,
  ) async {
    try {
      final response = await _apiClient.patch(
        '/workspaces/$workspaceId/projects/$projectId',
        data: dto.toJson(),
      );
      
      return ApiResponse.success(
        Project.fromJson(response.data),
        message: 'Project updated successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to update project',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Delete project
  Future<ApiResponse<void>> deleteProject(
    String workspaceId,
    String projectId,
  ) async {
    try {
      final response = await _apiClient.delete(
        '/workspaces/$workspaceId/projects/$projectId',
      );

      return ApiResponse.success(
        null,
        message: 'Project deleted successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to delete project',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Get all members of a project
  Future<ApiResponse<List<ProjectMemberResponse>>> getProjectMembers(
    String workspaceId,
    String projectId,
  ) async {
    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/projects/$projectId/members',
      );

      final members = (response.data as List)
          .map((json) => ProjectMemberResponse.fromJson(json))
          .toList();

      return ApiResponse.success(
        members,
        message: 'Project members retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get project members',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  // ==================== TASK OPERATIONS ====================
  
  /// Get all tasks in project
  Future<ApiResponse<List<Task>>> getProjectTasks(
    String workspaceId,
    String projectId, {
    String? sprintId,
    String? status,
  }) async {
    try {
      final queryParameters = <String, dynamic>{};
      if (sprintId != null) queryParameters['sprintId'] = sprintId;
      if (status != null) queryParameters['status'] = status;

      final response = await _apiClient.get(
        '/workspaces/$workspaceId/projects/$projectId/tasks',
        queryParameters: queryParameters,
      );
      
      final tasks = (response.data as List)
          .map((json) => Task.fromJson(json))
          .toList();
      
      return ApiResponse.success(
        tasks,
        message: 'Tasks retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get tasks',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Create a new task
  Future<ApiResponse<Task>> createTask(
    String workspaceId,
    String projectId,
    CreateTaskDto dto,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/projects/$projectId/tasks',
        data: dto.toJson(),
      );
      
      return ApiResponse.success(
        Task.fromJson(response.data),
        message: 'Task created successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to create task',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Get task by ID
  Future<ApiResponse<Task>> getTask(
    String workspaceId,
    String taskId,
  ) async {
    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/projects/tasks/$taskId',
      );
      
      return ApiResponse.success(
        Task.fromJson(response.data),
        message: 'Task retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get task',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Update task
  Future<ApiResponse<Task>> updateTask(
    String workspaceId,
    String taskId,
    UpdateTaskDto dto,
  ) async {
    try {
      final response = await _apiClient.patch(
        '/workspaces/$workspaceId/projects/tasks/$taskId',
        data: dto.toJson(),
      );
      
      return ApiResponse.success(
        Task.fromJson(response.data),
        message: 'Task updated successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to update task',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Delete task
  Future<ApiResponse<void>> deleteTask(
    String workspaceId,
    String taskId,
  ) async {
    try {
      final response = await _apiClient.delete(
        '/workspaces/$workspaceId/projects/tasks/$taskId',
      );

      return ApiResponse.success(
        null,
        message: 'Task deleted successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to delete task',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  // ==================== TASK DEPENDENCY OPERATIONS ====================

  /// Get all dependencies for a task
  Future<ApiResponse<List<TaskDependencyResponse>>> getTaskDependencies(
    String workspaceId,
    String taskId,
  ) async {
    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/projects/tasks/$taskId/dependencies',
      );

      final data = response.data;
      final dependenciesData = data is List ? data : (data['data'] ?? data['dependencies'] ?? []);

      final dependencies = (dependenciesData as List)
          .map((json) => TaskDependencyResponse.fromJson(json))
          .toList();

      return ApiResponse.success(
        dependencies,
        message: 'Dependencies retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get dependencies',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Add a dependency to a task
  Future<ApiResponse<TaskDependencyResponse>> addTaskDependency(
    String workspaceId,
    String taskId,
    AddDependencyDto dto,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/projects/tasks/$taskId/dependencies',
        data: dto.toJson(),
      );

      final data = response.data;
      final dependencyData = data is Map ? (data['data'] ?? data) : data;

      return ApiResponse.success(
        TaskDependencyResponse.fromJson(dependencyData),
        message: 'Dependency added successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to add dependency',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Remove a dependency from a task
  Future<ApiResponse<void>> removeTaskDependency(
    String workspaceId,
    String taskId,
    String dependencyId,
  ) async {
    try {
      final response = await _apiClient.delete(
        '/workspaces/$workspaceId/projects/tasks/$taskId/dependencies/$dependencyId',
      );

      return ApiResponse.success(
        null,
        message: 'Dependency removed successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to remove dependency',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Update a task dependency
  Future<ApiResponse<TaskDependencyResponse>> updateTaskDependency(
    String workspaceId,
    String taskId,
    String dependencyId,
    UpdateDependencyDto dto,
  ) async {
    try {
      final response = await _apiClient.patch(
        '/workspaces/$workspaceId/projects/tasks/$taskId/dependencies/$dependencyId',
        data: dto.toJson(),
      );

      final data = response.data;
      final dependencyData = data is Map ? (data['data'] ?? data) : data;

      return ApiResponse.success(
        TaskDependencyResponse.fromJson(dependencyData),
        message: 'Dependency updated successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to update dependency',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  // ==================== AI AGENT OPERATIONS ====================

  /// Unified AI agent - intelligently routes to project or task agent
  /// Supports natural language commands like:
  /// - "Create a project called Marketing Campaign"
  /// - "Add a task to fix the login bug"
  /// - "Update the task priority to high"
  Future<ApiResponse<AgentResponse>> processAgentCommand(
    String workspaceId,
    String prompt, {
    String? projectId,
  }) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/projects/ai',
        data: {
          'prompt': prompt,
          if (projectId != null) 'projectId': projectId,
        },
      );

      return ApiResponse.success(
        AgentResponse.fromJson(response.data),
        message: 'AI command processed successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to process AI command',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Project-level AI agent
  /// Handles: create, update, delete, batch_create, batch_update, batch_delete
  Future<ApiResponse<AgentResponse>> processProjectAgentCommand(
    String workspaceId,
    String prompt,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/projects/agent',
        data: {'prompt': prompt},
      );

      return ApiResponse.success(
        AgentResponse.fromJson(response.data),
        message: 'Project agent command processed',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to process project agent command',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Task-level AI agent
  /// Handles: create, update, delete, move, batch_create, batch_update, batch_delete, list
  Future<ApiResponse<AgentResponse>> processTaskAgentCommand(
    String workspaceId,
    String projectId,
    String prompt,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/projects/$projectId/agent',
        data: {'prompt': prompt},
      );

      return ApiResponse.success(
        AgentResponse.fromJson(response.data),
        message: 'Task agent command processed',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to process task agent command',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
}