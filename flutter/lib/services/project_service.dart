import 'package:dio/dio.dart';
import 'dart:convert';
import '../config/app_config.dart';
import '../models/project.dart';
import '../models/task.dart';

class ProjectService {
  static ProjectService? _instance;
  static ProjectService get instance => _instance ??= ProjectService._internal();
  ProjectService._internal();

  final Dio _dio = Dio();

  Future<Map<String, String>> get _headers async {
    final token = await AppConfig.getAccessToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  // PROJECT METHODS

  /// Get all projects for a workspace
  Future<List<Project>> getProjects({String? workspaceId}) async {
    try {
      final targetWorkspaceId = workspaceId ?? await AppConfig.getCurrentWorkspaceId();
      if (targetWorkspaceId == null) {
        return [];
      }

      final headers = await _headers;
      final url = '${AppConfig.backendBaseUrl}/workspaces/$targetWorkspaceId/projects';


      final response = await _dio.get(
        url,
        options: Options(headers: headers),
      ).timeout(
        const Duration(seconds: 15),
        onTimeout: () => throw Exception('Request timeout'),
      );


      if (response.statusCode == 200) {
        final List<dynamic> data = response.data is List ? response.data : [];

        final projects = data
            .map((json) {
              return Project.fromJson(json);
            })
            .toList();

        for (final project in projects) {
        }
        return projects;
      } else {
        throw Exception('Failed to load projects: ${response.statusCode}');
      }
    } catch (e) {
      return [];
    }
  }

  /// Get a specific project by ID
  Future<Project?> getProject(String projectId, {String? workspaceId}) async {
    try {
      final targetWorkspaceId = workspaceId ?? await AppConfig.getCurrentWorkspaceId();

      final headers = await _headers;
      final url = '${AppConfig.backendBaseUrl}/workspaces/$targetWorkspaceId/projects/$projectId';

      final response = await _dio.get(
        url,
        options: Options(headers: headers),
      ).timeout(
        const Duration(seconds: 10),
        onTimeout: () => throw Exception('Request timeout'),
      );

      if (response.statusCode == 200) {
        return Project.fromJson(response.data);
      } else if (response.statusCode == 404) {
        return null;
      } else {
        throw Exception('Failed to load project: ${response.statusCode}');
      }
    } catch (e) {
      return null;
    }
  }

  /// Create a new project
  Future<Project> createProject({
    required String name,
    String? description,
    String? workspaceId,
    String? type,
    String? priority,
    String? ownerId,
    String? leadId,
    String? startDate,
    String? endDate,
    double? estimatedHours,
    double? budget,
    List<Map<String, dynamic>>? kanbanStages,
    Map<String, dynamic>? settings,
    Map<String, dynamic>? collaborativeData,
    Map<String, dynamic>? attachments,
  }) async {
    try {
      final targetWorkspaceId = workspaceId ?? await AppConfig.getCurrentWorkspaceId();

      // Build minimal project data - only include non-null values
      final projectData = <String, dynamic>{
        'name': name,
      };

      if (description != null && description.isNotEmpty) {
        projectData['description'] = description;
      }
      if (type != null) {
        projectData['type'] = type;
      }
      if (priority != null) {
        projectData['priority'] = priority;
      }
      if (leadId != null) {
        projectData['lead_id'] = leadId;
      }
      if (startDate != null) {
        projectData['start_date'] = startDate;
      }
      if (endDate != null) {
        projectData['end_date'] = endDate;
      }
      if (kanbanStages != null && kanbanStages.isNotEmpty) {
        projectData['kanban_stages'] = kanbanStages;
      }
      if (collaborativeData != null && collaborativeData.isNotEmpty) {
        projectData['collaborative_data'] = collaborativeData;
      }
      if (attachments != null && attachments.isNotEmpty) {
        projectData['attachments'] = attachments;
      }


      final headers = await _headers;
      final url = '${AppConfig.backendBaseUrl}/workspaces/$targetWorkspaceId/projects';


      final response = await _dio.post(
        url,
        data: projectData,
        options: Options(headers: headers),
      ).timeout(
        const Duration(seconds: 15),
        onTimeout: () => throw Exception('Request timeout'),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        return Project.fromJson(response.data);
      } else {
        throw Exception('Failed to create project: ${response.statusCode}');
      }
    } on DioException catch (e) {
      rethrow;
    } catch (e) {
      rethrow;
    }
  }

  /// Update an existing project
  Future<Project> updateProject(String projectId, Map<String, dynamic> updates, {String? workspaceId}) async {
    try {
      final targetWorkspaceId = workspaceId ?? await AppConfig.getCurrentWorkspaceId();

      final headers = await _headers;
      final url = '${AppConfig.backendBaseUrl}/workspaces/$targetWorkspaceId/projects/$projectId';

      final response = await _dio.patch(
        url,
        data: updates,
        options: Options(headers: headers),
      ).timeout(
        const Duration(seconds: 15),
        onTimeout: () => throw Exception('Request timeout'),
      );

      if (response.statusCode == 200) {
        // The API might return {data: [...], count: 1} structure or direct project object
        final responseData = response.data;
        if (responseData is Map && responseData.containsKey('data')) {
          final dataList = responseData['data'] as List;
          if (dataList.isNotEmpty) {
            return Project.fromJson(dataList[0] as Map<String, dynamic>);
          } else {
            throw Exception('No project data returned from API');
          }
        } else {
          // Fallback to direct parsing if response is already a project object
          return Project.fromJson(responseData as Map<String, dynamic>);
        }
      } else {
        throw Exception('Failed to update project: ${response.statusCode}');
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Delete a project
  Future<bool> deleteProject(String projectId, {String? workspaceId}) async {
    try {
      final targetWorkspaceId = workspaceId ?? await AppConfig.getCurrentWorkspaceId();

      final headers = await _headers;
      final url = '${AppConfig.backendBaseUrl}/workspaces/$targetWorkspaceId/projects/$projectId';

      final response = await _dio.delete(
        url,
        options: Options(headers: headers),
      ).timeout(
        const Duration(seconds: 10),
        onTimeout: () => throw Exception('Request timeout'),
      );

      return response.statusCode == 200 || response.statusCode == 204;
    } catch (e) {
      return false;
    }
  }

  // TASK METHODS

  /// Get all tasks for a project
  Future<List<Task>> getTasks({String? projectId, String? sprintId, String? workspaceId}) async {
    try {
      final targetWorkspaceId = workspaceId ?? await AppConfig.getCurrentWorkspaceId();


      if (projectId == null) {
        return [];
      }

      final headers = await _headers;
      final url = '${AppConfig.backendBaseUrl}/workspaces/$targetWorkspaceId/projects/$projectId/tasks';

      final queryParams = <String, dynamic>{};
      if (sprintId != null) queryParams['sprintId'] = sprintId;


      final response = await _dio.get(
        url,
        queryParameters: queryParams,
        options: Options(headers: headers),
      ).timeout(
        const Duration(seconds: 15),
        onTimeout: () => throw Exception('Request timeout'),
      );


      if (response.statusCode == 200) {
        final dynamic responseData = response.data;

        if (responseData is String) {
          return [];
        }

        if (responseData is! List) {
          throw Exception('API returned invalid response format: expected array, got ${responseData.runtimeType}');
        }

        final List<dynamic> data = responseData;

        final tasks = data.map((json) {
          if (json is! Map<String, dynamic>) {
            throw Exception('Invalid task data format: expected Map, got ${json.runtimeType}');
          }
          return Task.fromJson(json);
        }).toList();


        // Log each task
        for (var i = 0; i < tasks.length; i++) {
          final task = tasks[i];
        }

        return tasks;
      } else {
        throw Exception('Failed to load tasks: ${response.statusCode}');
      }
    } catch (e, stackTrace) {
      rethrow;
    }
  }

  /// Get a specific task by ID
  Future<Task?> getTask(String taskId, {String? workspaceId}) async {
    try {
      final targetWorkspaceId = workspaceId ?? await AppConfig.getCurrentWorkspaceId();

      final headers = await _headers;
      final url = '${AppConfig.backendBaseUrl}/workspaces/$targetWorkspaceId/projects/tasks/$taskId';

      final response = await _dio.get(
        url,
        options: Options(headers: headers),
      ).timeout(
        const Duration(seconds: 10),
        onTimeout: () => throw Exception('Request timeout'),
      );

      if (response.statusCode == 200) {
        return Task.fromJson(response.data);
      } else if (response.statusCode == 404) {
        return null;
      } else {
        throw Exception('Failed to load task: ${response.statusCode}');
      }
    } catch (e) {
      return null;
    }
  }

  /// Create a new task
  Future<Task> createTask({
    required String projectId,
    required String title,
    String? description,
    String? sprintId,
    String? parentTaskId,
    String? taskType,
    String? status, // API expects kanban stage ID (string) e.g., 'todo', 'in_progress', 'done'
    String? priority,
    String? assigneeId,
    List<String>? assigneeIds, // Multiple assignees support
    String? assigneeTeamMemberId,
    String? reporterId,
    DateTime? dueDate,
    double? estimatedHours,
    double? actualHours,
    int? storyPoints,
    List<String>? labels,
    Map<String, dynamic>? attachments,
    Map<String, dynamic>? collaborativeData,
    String? workspaceId,
  }) async {
    try {
      final targetWorkspaceId = workspaceId ?? await AppConfig.getCurrentWorkspaceId();

      // Build minimal task data - only include non-null values
      final taskData = <String, dynamic>{
        'title': title,
      };

      if (description != null && description.isNotEmpty) {
        taskData['description'] = description;
      }
      if (status != null) {
        taskData['status'] = status;
      }
      if (priority != null) {
        taskData['priority'] = priority;
      }
      // Handle multiple assignees (preferred) or single assignee (backward compatibility)
      if (assigneeIds != null && assigneeIds.isNotEmpty) {
        taskData['assigned_to'] = assigneeIds; // Multiple assignees
      } else if (assigneeId != null) {
        taskData['assigned_to'] = [assigneeId]; // Single assignee (backward compatibility)
      } else if (assigneeTeamMemberId != null) {
        taskData['assigned_to'] = [assigneeTeamMemberId]; // Backend expects array
      }
      if (dueDate != null) {
        taskData['due_date'] = dueDate.toIso8601String();
      }
      if (estimatedHours != null && estimatedHours > 0) {
        taskData['estimated_hours'] = estimatedHours;
      }
      if (actualHours != null && actualHours > 0) {
        taskData['actual_hours'] = actualHours;
      }
      if (storyPoints != null && storyPoints > 0) {
        taskData['story_points'] = storyPoints;
      }
      if (labels != null && labels.isNotEmpty) {
        taskData['labels'] = labels;
      }
      if (attachments != null && attachments.isNotEmpty) {
        taskData['attachments'] = attachments;
      }
      if (collaborativeData != null && collaborativeData.isNotEmpty) {
        taskData['collaborative_data'] = collaborativeData;
      }


      final headers = await _headers;
      final url = '${AppConfig.backendBaseUrl}/workspaces/$targetWorkspaceId/projects/$projectId/tasks';


      final response = await _dio.post(
        url,
        data: taskData,
        options: Options(headers: headers),
      ).timeout(
        const Duration(seconds: 15),
        onTimeout: () => throw Exception('Request timeout'),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        return Task.fromJson(response.data);
      } else {
        throw Exception('Failed to create task: ${response.statusCode}');
      }
    } on DioException catch (e) {
      rethrow;
    } catch (e) {
      rethrow;
    }
  }

  /// Update an existing task
  Future<Task> updateTask(String taskId, Map<String, dynamic> updates, {String? workspaceId}) async {
    try {
      final targetWorkspaceId = workspaceId ?? await AppConfig.getCurrentWorkspaceId();


      final headers = await _headers;
      final url = '${AppConfig.backendBaseUrl}/workspaces/$targetWorkspaceId/projects/tasks/$taskId';

      final response = await _dio.patch(
        url,
        data: updates,
        options: Options(headers: headers),
      ).timeout(
        const Duration(seconds: 15),
        onTimeout: () => throw Exception('Request timeout'),
      );


      if (response.statusCode == 200) {
        // The API returns {data: [...], count: 1} structure
        final responseData = response.data;
        if (responseData is Map && responseData.containsKey('data')) {
          final dataList = responseData['data'] as List;
          if (dataList.isNotEmpty) {
            return Task.fromJson(dataList[0] as Map<String, dynamic>);
          } else {
            throw Exception('No task data returned from API');
          }
        } else {
          // Fallback to direct parsing if response is already a task object
          return Task.fromJson(responseData as Map<String, dynamic>);
        }
      } else {
        throw Exception('Failed to update task: ${response.statusCode} - ${response.data}');
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Delete a task
  Future<bool> deleteTask(String taskId, {String? workspaceId}) async {
    try {
      final targetWorkspaceId = workspaceId ?? await AppConfig.getCurrentWorkspaceId();

      final headers = await _headers;
      final url = '${AppConfig.backendBaseUrl}/workspaces/$targetWorkspaceId/projects/tasks/$taskId';

      final response = await _dio.delete(
        url,
        options: Options(headers: headers),
      ).timeout(
        const Duration(seconds: 10),
        onTimeout: () => throw Exception('Request timeout'),
      );

      return response.statusCode == 200 || response.statusCode == 204;
    } catch (e) {
      return false;
    }
  }

  /// Mark a task as complete
  Future<Task> markTaskAsComplete(String taskId, {String? userId, String? workspaceId}) async {
    try {

      // Use numeric status code: 1 = done
      final updates = {
        'status': 1,
        'completed_at': DateTime.now().toIso8601String(),
      };

      // Add completed_by if userId is provided
      if (userId != null) {
        updates['completed_by'] = userId;
      }


      final result = await updateTask(taskId, updates, workspaceId: workspaceId);


      return result;
    } catch (e, stackTrace) {
      rethrow;
    }
  }

  /// Mark a task as incomplete (reopen)
  Future<Task> markTaskAsIncomplete(String taskId, {String? workspaceId}) async {
    try {

      // Use numeric status code: 2 = in_progress
      final updates = {
        'status': 2,
        'completed_at': null,
        'completed_by': null,
      };


      final result = await updateTask(taskId, updates, workspaceId: workspaceId);


      return result;
    } catch (e, stackTrace) {
      rethrow;
    }
  }

  // HELPER METHODS

  /// Get default kanban stages data
  List<Map<String, dynamic>> _getDefaultKanbanStagesData() {
    return [
      {'id': 'todo', 'name': 'To Do', 'order': 1, 'color': '#3B82F6'},
      {'id': 'in_progress', 'name': 'In Progress', 'order': 2, 'color': '#F59E0B'},
      {'id': 'done', 'name': 'Done', 'order': 3, 'color': '#10B981'},
    ];
  }

  // ANALYTICS METHODS

  /// Get task progress based on status
  /// todo = 25%, in_progress = 50%, review = 75%, done = 100%
  double _getTaskProgressByStatus(String status) {
    switch (status.toLowerCase()) {
      case 'todo':
      case 'to_do':
        return 0.25;
      case 'in_progress':
      case 'inprogress':
        return 0.50;
      case 'review':
      case 'in_review':
        return 0.75;
      case 'done':
      case 'completed':
        return 1.0;
      default:
        return 0.25;
    }
  }

  /// Get project analytics
  Future<Map<String, dynamic>> getProjectAnalytics(String projectId, {String? workspaceId}) async {
    try {
      final tasks = await getTasks(projectId: projectId, workspaceId: workspaceId);

      for (final task in tasks) {
      }

      final totalTasks = tasks.length;
      final completedTasks = tasks.where((task) {
        final isDone = task.status.toLowerCase() == 'done';
        return isDone;
      }).length;
      final inProgressTasks = tasks.where((task) => task.status.toLowerCase() == 'in_progress').length;
      final todoTasks = tasks.where((task) => task.status.toLowerCase() == 'todo').length;
      final reviewTasks = tasks.where((task) => task.status.toLowerCase() == 'review').length;


      final totalEstimatedHours = tasks
          .where((task) => task.estimatedHours != null)
          .fold<double>(0.0, (sum, task) => sum + task.estimatedHours!);

      final totalActualHours = tasks
          .where((task) => task.actualHours != null)
          .fold<double>(0.0, (sum, task) => sum + task.actualHours!);

      // Calculate progress based on average of task progress percentages
      // todo = 25%, in_progress = 50%, review = 75%, done = 100%
      double progress = 0.0;
      if (totalTasks > 0) {
        final totalProgress = tasks.fold<double>(
          0.0,
          (sum, task) => sum + _getTaskProgressByStatus(task.status),
        );
        progress = totalProgress / totalTasks;
      }


      return {
        'project_id': projectId,
        'total_tasks': totalTasks,
        'completed_tasks': completedTasks,
        'in_progress_tasks': inProgressTasks,
        'review_tasks': reviewTasks,
        'todo_tasks': todoTasks,
        'progress': progress,
        'total_estimated_hours': totalEstimatedHours,
        'total_actual_hours': totalActualHours,
      };
    } catch (e) {
      return {};
    }
  }
}
