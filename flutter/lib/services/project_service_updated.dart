import 'package:flutter/foundation.dart';
import '../api/api_services.dart' show ProjectApiService, WorkspaceApiService, CreateProjectDto, UpdateProjectDto, CreateTaskDto, UpdateTaskDto, CreateWorkspaceDto;
import '../api/services/project_api_service.dart' as api show Project, Task;
import '../api/services/workspace_api_service.dart' as ws show Workspace;
import '../config/app_config.dart';

// Type aliases for API models to avoid conflicts
typedef ApiProject = api.Project;
typedef ApiTask = api.Task;
typedef ApiWorkspace = ws.Workspace;

/// Updated ProjectService using the new Dio-based API client
/// This demonstrates how to migrate from direct HTTP calls to the new API services
class ProjectServiceUpdated {
  static ProjectServiceUpdated? _instance;
  static ProjectServiceUpdated get instance => _instance ??= ProjectServiceUpdated._internal();
  ProjectServiceUpdated._internal();

  // API service instances
  final ProjectApiService _projectApiService = ProjectApiService();
  final WorkspaceApiService _workspaceApiService = WorkspaceApiService();

  // PROJECT METHODS

  /// Get all projects for a workspace
  Future<List<ApiProject>> getProjects({String? workspaceId}) async {
    try {
      final targetWorkspaceId = workspaceId ??
          await AppConfig.getCurrentWorkspaceId() ??
          AppConfig.defaultWorkspaceId;


      final response = await _projectApiService.getAllProjects(targetWorkspaceId);

      if (response.success && response.data != null) {
        return response.data!;
      } else {
        return [];
      }
    } catch (e) {
      return [];
    }
  }

  /// Get a specific project by ID
  Future<ApiProject?> getProject(String projectId, {String? workspaceId}) async {
    try {
      final targetWorkspaceId = workspaceId ??
          await AppConfig.getCurrentWorkspaceId() ??
          AppConfig.defaultWorkspaceId;


      final response = await _projectApiService.getProject(targetWorkspaceId, projectId);

      if (response.success && response.data != null) {
        return response.data!;
      } else {
        return null;
      }
    } catch (e) {
      return null;
    }
  }

  /// Create a new project
  Future<ApiProject?> createProject({
    required String name,
    String? description,
    String? workspaceId,
    String? type,
    String? priority,
    String? ownerId,
    String? leadId,
    DateTime? startDate,
    DateTime? endDate,
    double? estimatedHours,
    double? budget,
    Map<String, dynamic>? settings,
  }) async {
    try {
      final targetWorkspaceId = workspaceId ??
          await AppConfig.getCurrentWorkspaceId() ??
          AppConfig.defaultWorkspaceId;

      final createDto = CreateProjectDto(
        name: name,
        description: description,
        type: type ?? 'kanban',
        startDate: startDate,
        endDate: endDate,
        metadata: {
          'priority': priority,
          'owner_id': ownerId ?? await AppConfig.getCurrentUserId() ?? AppConfig.defaultUserId,
          'lead_id': leadId,
          'estimated_hours': estimatedHours,
          'budget': budget,
          'settings': settings ?? {},
        },
      );


      final response = await _projectApiService.createProject(targetWorkspaceId, createDto);

      if (response.success && response.data != null) {
        return response.data!;
      } else {
        throw Exception('Failed to create project: ${response.message}');
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Update an existing project
  Future<ApiProject?> updateProject(String projectId, Map<String, dynamic> updates, {String? workspaceId}) async {
    try {
      final targetWorkspaceId = workspaceId ??
          await AppConfig.getCurrentWorkspaceId() ??
          AppConfig.defaultWorkspaceId;

      final updateDto = UpdateProjectDto(
        name: updates['name'],
        description: updates['description'],
        type: updates['type'],
        status: updates['status'],
        startDate: updates['start_date'] != null ? DateTime.parse(updates['start_date']) : null,
        endDate: updates['end_date'] != null ? DateTime.parse(updates['end_date']) : null,
        metadata: updates['metadata'],
      );


      final response = await _projectApiService.updateProject(
        targetWorkspaceId,
        projectId,
        updateDto,
      );

      if (response.success && response.data != null) {
        return response.data!;
      } else {
        throw Exception('Failed to update project: ${response.message}');
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Delete a project
  Future<bool> deleteProject(String projectId, {String? workspaceId}) async {
    try {
      final targetWorkspaceId = workspaceId ??
          await AppConfig.getCurrentWorkspaceId() ??
          AppConfig.defaultWorkspaceId;


      final response = await _projectApiService.deleteProject(targetWorkspaceId, projectId);

      if (response.success) {
        return true;
      } else {
        return false;
      }
    } catch (e) {
      return false;
    }
  }

  // TASK METHODS

  /// Get all tasks for a project
  Future<List<ApiTask>> getTasks({String? projectId, String? sprintId, String? workspaceId}) async {
    try {
      final targetWorkspaceId = workspaceId ??
          await AppConfig.getCurrentWorkspaceId() ??
          AppConfig.defaultWorkspaceId;


      if (projectId != null) {
        final response = await _projectApiService.getProjectTasks(
          targetWorkspaceId,
          projectId,
          sprintId: sprintId,
        );

        if (response.success && response.data != null) {
          return response.data!;
        } else {
          return [];
        }
      } else {
        return [];
      }
    } catch (e) {
      return [];
    }
  }

  /// Get a specific task by ID
  Future<ApiTask?> getTask(String taskId, {String? workspaceId}) async {
    try {
      final targetWorkspaceId = workspaceId ??
          await AppConfig.getCurrentWorkspaceId() ??
          AppConfig.defaultWorkspaceId;


      final response = await _projectApiService.getTask(targetWorkspaceId, taskId);

      if (response.success && response.data != null) {
        return response.data!;
      } else {
        return null;
      }
    } catch (e) {
      return null;
    }
  }

  /// Create a new task
  Future<ApiTask?> createTask({
    required String projectId,
    required String title,
    String? description,
    String? sprintId,
    String? parentTaskId,
    String? taskType,
    String? status,
    String? priority,
    String? assigneeId,
    DateTime? dueDate,
    double? estimatedHours,
    int? storyPoints,
    List<String>? labels,
    String? workspaceId,
  }) async {
    try {
      final targetWorkspaceId = workspaceId ??
          await AppConfig.getCurrentWorkspaceId() ??
          AppConfig.defaultWorkspaceId;

      final createDto = CreateTaskDto(
        title: title,
        description: description,
        status: status ?? 'todo',
        priority: priority ?? 'medium',
        assigneeId: assigneeId,
        sprintId: sprintId,
        dueDate: dueDate,
        tags: labels,
        metadata: {
          'parent_task_id': parentTaskId,
          'task_type': taskType ?? 'task',
          'estimated_hours': estimatedHours,
          'story_points': storyPoints,
        },
      );


      final response = await _projectApiService.createTask(
        targetWorkspaceId,
        projectId,
        createDto,
      );

      if (response.success && response.data != null) {
        return response.data!;
      } else {
        throw Exception('Failed to create task: ${response.message}');
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Update an existing task
  Future<ApiTask?> updateTask(String taskId, Map<String, dynamic> updates, {String? workspaceId}) async {
    try {
      final targetWorkspaceId = workspaceId ??
          await AppConfig.getCurrentWorkspaceId() ??
          AppConfig.defaultWorkspaceId;

      final updateDto = UpdateTaskDto(
        title: updates['title'],
        description: updates['description'],
        status: updates['status'],
        priority: updates['priority'],
        assigneeId: updates['assignee_id'] ?? updates['assigned_to'],
        sprintId: updates['sprint_id'],
        dueDate: updates['due_date'] != null ? DateTime.parse(updates['due_date']) : null,
        tags: updates['labels']?.cast<String>(),
        metadata: {
          'estimated_hours': updates['estimated_hours'],
          'actual_hours': updates['actual_hours'],
          'story_points': updates['story_points'],
          'completed_at': updates['completed_at'],
          'completed_by': updates['completed_by'],
        },
      );


      final response = await _projectApiService.updateTask(
        targetWorkspaceId,
        taskId,
        updateDto,
      );

      if (response.success && response.data != null) {
        return response.data!;
      } else {
        throw Exception('Failed to update task: ${response.message}');
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Delete a task
  Future<bool> deleteTask(String taskId, {String? workspaceId}) async {
    try {
      final targetWorkspaceId = workspaceId ??
          await AppConfig.getCurrentWorkspaceId() ??
          AppConfig.defaultWorkspaceId;


      final response = await _projectApiService.deleteTask(targetWorkspaceId, taskId);

      if (response.success) {
        return true;
      } else {
        return false;
      }
    } catch (e) {
      return false;
    }
  }

  // WORKSPACE METHODS

  /// Get all workspaces for the current user
  Future<List<ApiWorkspace>> getWorkspaces() async {
    try {

      final response = await _workspaceApiService.getAllWorkspaces();

      if (response.success && response.data != null) {
        return response.data!;
      } else {
        return [];
      }
    } catch (e) {
      return [];
    }
  }

  /// Create a new workspace
  Future<ApiWorkspace?> createWorkspace({
    required String name,
    String? description,
  }) async {
    try {
      final createDto = CreateWorkspaceDto(
        name: name,
        description: description,
      );


      final response = await _workspaceApiService.createWorkspace(createDto);

      if (response.success && response.data != null) {
        return response.data!;
      } else {
        throw Exception('Failed to create workspace: ${response.message}');
      }
    } catch (e) {
      rethrow;
    }
  }

  // ANALYTICS METHODS

  /// Get project analytics
  Future<Map<String, dynamic>> getProjectAnalytics(String projectId, {String? workspaceId}) async {
    try {
      final tasks = await getTasks(projectId: projectId, workspaceId: workspaceId);

      final totalTasks = tasks.length;
      final completedTasks = tasks.where((task) => task.status == 'done').length;
      final inProgressTasks = tasks.where((task) => task.status == 'in_progress').length;
      final todoTasks = tasks.where((task) => task.status == 'todo').length;

      final progress = totalTasks > 0 ? completedTasks / totalTasks : 0.0;

      return {
        'project_id': projectId,
        'total_tasks': totalTasks,
        'completed_tasks': completedTasks,
        'in_progress_tasks': inProgressTasks,
        'todo_tasks': todoTasks,
        'progress': progress,
      };
    } catch (e) {
      return {};
    }
  }

  // HELPER METHODS

  /// Check if the new API services are working
  Future<bool> testApiConnection() async {
    try {

      final workspaces = await getWorkspaces();

      return true;
    } catch (e) {
      return false;
    }
  }
}
